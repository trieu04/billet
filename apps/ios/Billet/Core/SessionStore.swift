import Foundation
import Observation

@MainActor
@Observable
final class SessionStore {
    enum State: Equatable { case restoring, signedOut, signedIn }

    private(set) var state: State = .restoring
    private(set) var token: String?
    private(set) var user: User?
    private let keychain = KeychainStore()
    private var refreshTask: Task<String?, Never>?
    private var isUITesting: Bool { ProcessInfo.processInfo.environment["BILLET_UI_TESTING"] == "1" }

    var api: APIClient {
        if isUITesting { return APIClient(token: token) }
        return APIClient(token: token, refreshAccessToken: { [weak self] in
            await self?.refreshSession()
        })
    }

    func restore() async {
        guard state == .restoring else { return }
        if isUITesting {
            state = .signedOut
            return
        }
        guard let savedTokens = keychain.loadTokens() else {
            state = .signedOut
            return
        }
        token = savedTokens.accessToken
        do {
            user = try await api.request("/auth/me")
            state = .signedIn
        } catch let error as APIError where error.statusCode == 401 {
            try? keychain.saveTokens(nil)
            token = nil
            state = .signedOut
        } catch {
            // A network failure cannot prove that the saved session is invalid.
            state = .signedIn
        }
    }

    func login(identifier: String, password: String) async throws {
        if isUITesting, identifier == "ntdm", password == "devt" {
            token = "ui-testing-token"
            user = User(
                id: "101",
                username: "ntdm",
                email: "ntdm@example.com",
                displayName: "ntdm"
            )
            state = .signedIn
            return
        }
        struct Body: Encodable { let identifier: String; let password: String }
        let response: AuthResponse = try await APIClient().request(
            "/auth/login",
            method: "POST",
            body: Body(identifier: identifier, password: password)
        )
        guard !response.requiresMfa else {
            throw APIError(message: "Tài khoản cần xác thực hai bước, chưa được hỗ trợ.", statusCode: 409)
        }
        guard let refreshToken = response.refreshToken else {
            throw APIError(message: "Máy chủ không trả về refresh token.", statusCode: 500)
        }
        try keychain.saveTokens(
            SessionTokens(accessToken: response.accessToken, refreshToken: refreshToken)
        )
        token = response.accessToken
        user = response.user
        state = .signedIn
    }

    func logout() {
        if let tokens = keychain.loadTokens() {
            Task {
                try? await APIClient().send(
                    "/auth/logout",
                    method: "POST",
                    body: RefreshTokenBody(refreshToken: tokens.refreshToken)
                )
            }
        }
        try? keychain.saveTokens(nil)
        token = nil
        user = nil
        state = .signedOut
    }

    private func refreshSession() async -> String? {
        if let refreshTask { return await refreshTask.value }
        let task = Task { @MainActor [weak self] in await self?.performRefresh() }
        refreshTask = task
        let result = await task.value
        refreshTask = nil
        return result
    }

    private func performRefresh() async -> String? {
        guard let tokens = keychain.loadTokens() else { return nil }
        do {
            let response: AuthResponse = try await APIClient().request(
                "/auth/refresh",
                method: "POST",
                body: RefreshTokenBody(refreshToken: tokens.refreshToken)
            )
            guard let refreshToken = response.refreshToken else { throw APIError(
                message: "Máy chủ không trả về refresh token.",
                statusCode: 500
            ) }
            try keychain.saveTokens(
                SessionTokens(accessToken: response.accessToken, refreshToken: refreshToken)
            )
            token = response.accessToken
            user = response.user
            state = .signedIn
            return response.accessToken
        } catch {
            try? keychain.saveTokens(nil)
            token = nil
            user = nil
            state = .signedOut
            return nil
        }
    }
}
