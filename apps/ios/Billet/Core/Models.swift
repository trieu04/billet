import Foundation

struct User: Codable, Equatable, Sendable {
    let id: String
    let username: String
    let email: String
    let displayName: String
}
struct AuthResponse: Decodable, Sendable {
    let accessToken: String
    let refreshToken: String?
    let expiresIn: Int
    let user: User
    let requiresMfa: Bool
}
struct RefreshTokenBody: Codable, Sendable { let refreshToken: String }
struct SessionTokens: Codable, Sendable { let accessToken: String; let refreshToken: String }
struct Category: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let code: String
    let name: String
    let color: String
    let icon: String
    let sortOrder: Int
}
struct Expense: Codable, Identifiable, Hashable, Sendable {
    let id: String
    let amountMinor: String
    let currency: String
    let occurredAt: String
    let occurredTimezone: String
    let categoryId: String
    let mediaAssetId: String?
    let recognitionJobId: String?
    let caption: String?
    let merchant: String?
    let location: String?
    let version: Int
    let createdAt: String
    let updatedAt: String
}
struct ExpenseList: Decodable, Sendable {
    let data: [Expense]
    let nextCursor: String?
    let totals: [ExpenseTotal]
}

struct ExpenseTotal: Decodable, Sendable {
    let currency: String
    let totalMinor: String
    let count: Int
}

struct CalendarHistory: Decodable, Sendable { let months: [ExpenseCalendar] }

struct ExpenseCalendar: Decodable, Identifiable, Sendable {
    var id: String { month }
    let month: String
    let currency: String
    let totalMinor: String
    let count: Int
    let days: [ExpenseCalendarDay]
}

struct ExpenseCalendarDay: Decodable, Identifiable, Sendable {
    var id: String { date }
    let date: String
    let totalMinor: String
    let count: Int
    let representativeMediaId: String?
    let mediaAssetIds: [String]
}

struct SpendingReport: Decodable, Sendable {
    let currency: String
    let totalMinor: String
    let count: Int
    let comparison: SpendingComparison
    let series: [SpendingPoint]
    let categories: [SpendingCategory]
    let insights: [SpendingInsight]
}

struct SpendingComparison: Decodable, Sendable { let changePercent: Double? }
struct SpendingPoint: Decodable, Identifiable, Sendable {
    var id: String { bucket }
    let bucket: String
    let totalMinor: String
    let count: Int
}
struct SpendingCategory: Decodable, Identifiable, Sendable {
    var id: String { categoryId }
    let categoryId: String
    let code: String
    let name: String
    let totalMinor: String
    let count: Int
    let sharePercent: Double?
}
struct SpendingInsight: Decodable, Sendable {
    let type: String
    let date: String
    let amountMinor: String
}

struct Settings: Decodable, Sendable {
    let id: String
    let defaultCurrency: String
    let timezone: String
    let locale: String
    let appearance: String
    let reminderEnabled: Bool
    let reminderTime: String?
}

struct Profile: Decodable, Sendable {
    let id: String
    let username: String
    let email: String
    let displayName: String
    let expenseCount: Int
    let settings: Settings
}

struct Budget: Decodable, Sendable {
    let month: String
    let currency: String
    let isSet: Bool
    let limitMinor: String?
    let spentMinor: String
    let remainingMinor: String?
}

struct MediaReservation: Decodable, Sendable {
    let id: String
    let mimeType: String
    let sizeBytes: String
    let status: String
    let uploadUrl: String
}

enum MoneyFormatter {
    static func string(_ amountMinor: String, currency: String = "VND") -> String {
        guard let amount = Int64(amountMinor) else { return "\(amountMinor) \(currency)" }
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = currency
        formatter.locale = Locale(identifier: "vi_VN")
        formatter.maximumFractionDigits = currency == "VND" ? 0 : 2
        return formatter.string(from: NSNumber(value: amount))?.replacingOccurrences(of: " ₫", with: "₫")
            ?? "\(amountMinor) \(currency)"
    }
}

extension ISO8601DateFormatter {
    static let billet: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
}
