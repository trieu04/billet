import SwiftUI

struct LoadStateView: View {
    let message: String
    let retry: (() -> Void)?

    var body: some View {
        ContentUnavailableView {
            Label("Chưa thể tải dữ liệu", systemImage: "wifi.exclamationmark")
        } description: {
            Text(message)
        } actions: {
            if let retry { Button("Thử lại", action: retry) }
        }
    }
}
struct AuthenticatedImage: View {
    let mediaID: String
    let api: APIClient
    var contentMode: ContentMode = .fill

    @State private var image: Image?
    @State private var failed = false

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [AppTheme.peachSoft, AppTheme.lavender],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            if let image {
                image
                    .resizable()
                    .aspectRatio(contentMode: contentMode)
            } else if failed {
                Image(systemName: "receipt")
                    .font(.system(size: 36, weight: .light))
                    .foregroundStyle(.secondary)
            } else {
                ProgressView()
            }
        }
        .task(id: mediaID) {
            do {
                let data = try await api.mediaData(id: mediaID)
                guard let uiImage = UIImage(data: data) else { throw URLError(.cannotDecodeContentData) }
                image = Image(uiImage: uiImage)
            } catch {
                failed = true
            }
        }
        .clipped()
        .accessibilityLabel("Ảnh khoản chi")
    }
}
struct ExpenseCard: View {
    let expense: Expense
    let api: APIClient

    var body: some View {
        VStack(spacing: 0) {
            Group {
                if let mediaID = expense.mediaAssetId {
                    AuthenticatedImage(mediaID: mediaID, api: api)
                } else {
                    LinearGradient(
                        colors: [AppTheme.sage, AppTheme.butter],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                    .overlay {
                        Image(systemName: "receipt")
                            .font(.system(size: 42, weight: .light))
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .frame(height: 145)

            VStack(alignment: .leading, spacing: 5) {
                Text(expense.merchant ?? expense.caption ?? "Khoảnh khắc chi tiêu")
                    .font(.headline)
                    .lineLimit(1)
                HStack {
                    Text(DateParser.time(expense.occurredAt))
                        .foregroundStyle(AppTheme.secondaryText)
                    Spacer()
                    Text(MoneyFormatter.string(expense.amountMinor, currency: expense.currency))
                        .font(.headline.monospacedDigit())
                }
                .font(.caption)
            }
            .padding(14)
        }
        .frame(width: 220)
        .background(AppTheme.card)
        .clipShape(.rect(cornerRadius: 24, style: .continuous))
        .shadow(color: .black.opacity(0.07), radius: 16, y: 6)
    }
}
enum DateParser {
    static func date(_ value: String) -> Date? {
        if let date = ISO8601DateFormatter.billet.date(from: value) { return date }
        return ISO8601DateFormatter().date(from: value)
    }

    static func time(_ value: String) -> String {
        guard let date = date(value) else { return "" }
        return date.formatted(.dateTime.hour().minute().locale(Locale(identifier: "vi_VN")))
    }
}
extension View {
    func billetCard() -> some View {
        background(AppTheme.card)
            .clipShape(.rect(cornerRadius: 22, style: .continuous))
            .shadow(color: .black.opacity(0.06), radius: 16, y: 5)
    }
}
