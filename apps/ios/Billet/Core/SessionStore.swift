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
    private var isUITesting: Bool { ProcessInfo.processInfo.environment["BILLET_UI_TESTING"] == "1" }

    var api: APIClient { APIClient(token: token) }

    func restore() async {
        guard state == .restoring else { return }
        if isUITesting {
            state = .signedOut
            return
        }
        guard let savedToken = keychain.loadToken() else {
            state = .signedOut
            return
        }
        token = savedToken
        do {
            user = try await APIClient(token: savedToken).request("/auth/me")
            state = .signedIn
        } catch let error as APIError where error.statusCode == 401 {
            try? keychain.saveToken(nil)
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
        try keychain.saveToken(response.accessToken)
        token = response.accessToken
        user = response.user
        state = .signedIn
    }

    func logout() {
        try? keychain.saveToken(nil)
        token = nil
        user = nil
        state = .signedOut
    }
}
