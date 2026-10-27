import Foundation

struct APIError: LocalizedError, Equatable {
    let message: String
    let statusCode: Int
    var errorDescription: String? { message }
}
struct APIClient: Sendable {
    let baseURL: URL
    var token: String?
    var session: URLSession = .shared
    var refreshAccessToken: (@Sendable () async -> String?)?

    init(
        baseURL: URL = AppConfiguration.apiBaseURL,
        token: String? = nil,
        session: URLSession = .shared,
        refreshAccessToken: (@Sendable () async -> String?)? = nil
    ) {
        self.baseURL = baseURL
        self.token = token
        self.session = session
        self.refreshAccessToken = refreshAccessToken
    }

    func request<Response: Decodable>(
        _ path: String,
        method: String = "GET",
        body: Data? = nil
    ) async throws -> Response {
        try decode(try await data(path, method: method, body: body))
    }

    func request<Response: Decodable, Body: Encodable>(
        _ path: String,
        method: String,
        body: Body
    ) async throws -> Response {
        let encodedBody = try JSONEncoder().encode(body)
        return try decode(try await data(path, method: method, body: encodedBody))
    }

    private func decode<Response: Decodable>(_ data: Data) throws -> Response {
        do {
            return try JSONDecoder().decode(Response.self, from: data)
        } catch {
            throw APIError(message: "Phản hồi từ máy chủ không hợp lệ.", statusCode: -1)
        }
    }

    func send<Body: Encodable>(_ path: String, method: String, body: Body) async throws {
        _ = try await data(path, method: method, body: try JSONEncoder().encode(body))
    }

    func send(_ path: String, method: String) async throws {
        _ = try await data(path, method: method, body: nil)
    }

    func upload(to urlString: String, data: Data, mimeType: String) async throws {
        guard let url = URL(string: urlString) else {
            throw APIError(message: "Địa chỉ tải ảnh không hợp lệ.", statusCode: -1)
        }
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.httpBody = data
        request.setValue(mimeType, forHTTPHeaderField: "Content-Type")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let (_, response) = try await session.data(for: request)
        try validate(response, data: Data())
    }

    func mediaData(id: String) async throws -> Data {
        try await data("/media/\(id)/content", method: "GET", body: nil)
    }

    private func data(_ path: String, method: String, body: Data?) async throws -> Data {
        do {
            return try await performData(path, method: method, body: body, token: token)
        } catch let error as APIError where error.statusCode == 401 && refreshAccessToken != nil {
            guard let refreshedToken = await refreshAccessToken?() else { throw error }
            return try await performData(path, method: method, body: body, token: refreshedToken)
        }
    }

    private func performData(
        _ path: String,
        method: String,
        body: Data?,
        token requestToken: String?
    ) async throws -> Data {
        let url: URL
        if let absolute = URL(string: path), absolute.scheme != nil {
            url = absolute
        } else {
            let normalized = path.hasPrefix("/") ? String(path.dropFirst()) : path
            let root = baseURL.absoluteString.hasSuffix("/") ? baseURL.absoluteString : baseURL.absoluteString + "/"
            guard let resolved = URL(string: normalized, relativeTo: URL(string: root))?.absoluteURL else {
                throw APIError(message: "Địa chỉ API không hợp lệ.", statusCode: -1)
            }
            url = resolved
        }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.timeoutInterval = 30
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        if body != nil { request.setValue("application/json", forHTTPHeaderField: "Content-Type") }
        if let requestToken {
            request.setValue("Bearer \(requestToken)", forHTTPHeaderField: "Authorization")
        }
        let (data, response) = try await session.data(for: request)
        try validate(response, data: data)
        return data
    }

    private func validate(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else {
            throw APIError(message: "Không nhận được phản hồi từ máy chủ.", statusCode: -1)
        }
        guard (200..<300).contains(http.statusCode) else {
            throw APIError(message: Self.errorMessage(from: data) ?? "Yêu cầu thất bại (\(http.statusCode)).", statusCode: http.statusCode)
        }
    }

    private static func errorMessage(from data: Data) -> String? {
        guard
            let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
            let message = object["message"]
        else { return nil }
        if let message = message as? String { return message }
        if let messages = message as? [String] { return messages.joined(separator: "\n") }
        return nil
    }
}
enum AppConfiguration {
    static var apiBaseURL: URL {
        guard
            let rawValue = Bundle.main.object(forInfoDictionaryKey: "API_BASE_URL") as? String,
            !rawValue.isEmpty,
            !rawValue.contains("$("),
            let url = URL(string: rawValue)
        else { preconditionFailure("API_BASE_URL must be configured in the active xcconfig") }
        return url
    }
}
