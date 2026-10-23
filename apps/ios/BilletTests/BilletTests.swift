import XCTest
@testable import Billet

final class BilletTests: XCTestCase {
    override func tearDown() {
        StubURLProtocol.requestHandler = nil
        super.tearDown()
    }

    func testEncodedRequestReachesTransportExactlyOnce() async throws {
        struct LoginBody: Encodable { let identifier: String; let password: String }

        let requestCounter = RequestCounter()
        StubURLProtocol.requestHandler = { request in
            requestCounter.increment()
            guard request.httpMethod == "POST" else { throw URLError(.badServerResponse) }
            guard request.value(forHTTPHeaderField: "Content-Type") == "application/json" else {
                throw URLError(.cannotParseResponse)
            }

            let response = HTTPURLResponse(
                url: try XCTUnwrap(request.url),
                statusCode: 200,
                httpVersion: nil,
                headerFields: ["Content-Type": "application/json"]
            )!
            let data = Data(
                """
                {
                  "accessToken": "token",
                  "expiresIn": 900,
                  "requiresMfa": false,
                  "user": {
                    "id": "101",
                    "username": "ntdm",
                    "email": "ntdm@example.com",
                    "displayName": "ntdm"
                  }
                }
                """.utf8
            )
            return (response, data)
        }

        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [StubURLProtocol.self]
        let client = APIClient(
            baseURL: URL(string: "https://example.test/api/v1")!,
            session: URLSession(configuration: configuration)
        )

        let response: AuthResponse = try await client.request(
            "/auth/login",
            method: "POST",
            body: LoginBody(identifier: "ntdm", password: "devt")
        )

        XCTAssertEqual(response.accessToken, "token")
        XCTAssertEqual(requestCounter.value, 1)
    }

    func testMoneyFormatterKeepsUnsafeValueReadable() {
        XCTAssertEqual(MoneyFormatter.string("999999999999999999999", currency: "VND"), "999999999999999999999 VND")
    }

    func testJournalGroupsExpensesByLocalDayAndSumsAmounts() {
        let first = makeExpense(id: "1", amount: "20000", occurredAt: "2026-10-22T02:00:00.000Z")
        let second = makeExpense(id: "2", amount: "35000", occurredAt: "2026-10-22T05:00:00.000Z")
        let groups = JournalGroup.make(from: [first, second])
        XCTAssertEqual(groups.count, 1)
        XCTAssertEqual(groups[0].totalMinor, "55000")
    }

    func testStatisticsWeekStartsSixDaysBeforeAnchor() {
        let anchor = ISO8601DateFormatter.billet.date(from: "2026-10-22T12:00:00.000Z")!
        let range = StatisticsPeriod.week.range(anchor: anchor)
        XCTAssertEqual(Calendar.current.dateComponents([.day], from: range.from, to: Calendar.current.startOfDay(for: anchor)).day, 6)
        XCTAssertEqual(range.granularity, "day")
    }

    private func makeExpense(id: String, amount: String, occurredAt: String) -> Expense {
        Expense(
            id: id,
            amountMinor: amount,
            currency: "VND",
            occurredAt: occurredAt,
            occurredTimezone: "Asia/Ho_Chi_Minh",
            categoryId: "1",
            mediaAssetId: nil,
            recognitionJobId: nil,
            caption: nil,
            merchant: nil,
            location: nil,
            version: 1,
            createdAt: occurredAt,
            updatedAt: occurredAt
        )
    }
}

private final class RequestCounter: @unchecked Sendable {
    private let lock = NSLock()
    private var count = 0

    var value: Int { lock.withLock { count } }

    func increment() {
        lock.withLock { count += 1 }
    }
}

private final class StubURLProtocol: URLProtocol, @unchecked Sendable {
    nonisolated(unsafe) static var requestHandler: ((URLRequest) throws -> (HTTPURLResponse, Data))?

    override class func canInit(with request: URLRequest) -> Bool { true }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }

    override func startLoading() {
        guard let handler = Self.requestHandler else {
            client?.urlProtocol(self, didFailWithError: URLError(.unknown))
            return
        }
        do {
            let (response, data) = try handler(request)
            client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: data)
            client?.urlProtocolDidFinishLoading(self)
        } catch {
            client?.urlProtocol(self, didFailWithError: error)
        }
    }

    override func stopLoading() {}
}
