import Charts
import SwiftUI

struct StatisticsView: View {
    @Environment(SessionStore.self) private var session
    @State private var period: StatisticsPeriod = .today
    @State private var report: SpendingReport?
    @State private var loading = true
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Picker("Kỳ thống kê", selection: $period) {
                        ForEach(StatisticsPeriod.allCases) { Text($0.title).tag($0) }
                    }
                    .pickerStyle(.segmented)

                    VStack(alignment: .leading, spacing: 6) {
                        Text(period.summaryTitle)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(loading ? "…" : MoneyFormatter.string(report?.totalMinor ?? "0", currency: report?.currency ?? "VND"))
                            .font(.system(.largeTitle, design: .rounded, weight: .bold))
                            .monospacedDigit()
                            .textSelection(.enabled)
                        Text(deltaText)
                            .font(.caption.bold())
                            .foregroundStyle(AppTheme.accent)
                    }

                    if let report {
                        Chart(report.series) { point in
                            BarMark(
                                x: .value("Ngày", point.bucket),
                                y: .value("Chi tiêu", Int64(point.totalMinor) ?? 0)
                            )
                            .foregroundStyle(AppTheme.peach.gradient)
                            .cornerRadius(6)
                        }
                        .chartYAxis(.hidden)
                        .frame(height: 190)
                        .padding()
                        .billetCard()

                        VStack(alignment: .leading, spacing: 14) {
                            Text("Theo danh mục").font(.headline)
                            ForEach(report.categories.prefix(5)) { category in
                                VStack(spacing: 6) {
                                    HStack {
                                        Text(category.name)
                                        Spacer()
                                        Text("\(Int((category.sharePercent ?? 0).rounded()))%")
                                            .monospacedDigit()
                                    }
                                    ProgressView(value: category.sharePercent ?? 0, total: 100)
                                        .tint(AppTheme.peach)
                                }
                            }
                        }
                        .padding()
                        .billetCard()

                        VStack(alignment: .leading, spacing: 8) {
                            Label("INSIGHT", systemImage: "lightbulb")
                                .font(.caption.bold())
                                .foregroundStyle(AppTheme.accent)
                            Text(insightText(report))
                            if report.count > 0, let total = Int64(report.totalMinor) {
                                Divider()
                                Text("Trung bình mỗi khoản là \(MoneyFormatter.string(String(total / Int64(report.count)), currency: report.currency)).")
                            }
                        }
                        .padding()
                        .background(AppTheme.lavender)
                        .clipShape(.rect(cornerRadius: 22, style: .continuous))
                    } else if let errorMessage {
                        LoadStateView(message: errorMessage) { Task { await load() } }
                            .frame(minHeight: 260)
                    }
                }
                .padding()
                .padding(.bottom, 40)
            }
            .background(AppTheme.canvas)
            .navigationTitle("Thống kê")
            .task(id: period) { await load() }
            .refreshable { await load() }
        }
    }

    private var deltaText: String {
        guard let value = report?.comparison.changePercent else { return "— so với kỳ trước" }
        return "\(value <= 0 ? "↓" : "↑") \(Int(abs(value).rounded()))% so với kỳ trước"
    }

    private func insightText(_ report: SpendingReport) -> String {
        guard let insight = report.insights.first else { return "Chưa đủ dữ liệu để tạo insight cho kỳ này." }
        return "Ngày chi nhiều nhất là \(insight.date), với \(MoneyFormatter.string(insight.amountMinor, currency: report.currency))."
    }

    @MainActor
    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let range = period.range()
            let from = range.from.ISO8601Format().addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let to = range.to.ISO8601Format().addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            let timezone = TimeZone.current.identifier.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "Asia/Ho_Chi_Minh"
            report = try await session.api.request(
                "/reports/spending?from=\(from)&to=\(to)&currency=VND&timezone=\(timezone)&granularity=\(range.granularity)"
            )
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

enum StatisticsPeriod: String, CaseIterable, Identifiable {
    case today, week, month, year
    var id: String { rawValue }
    var title: String {
        switch self { case .today: "Hôm nay"; case .week: "Tuần"; case .month: "Tháng"; case .year: "Năm" }
    }
    var summaryTitle: String {
        switch self { case .today: "Đã chi hôm nay"; case .week: "Tuần này"; case .month: "Tháng này"; case .year: "Năm nay" }
    }
    func range(anchor: Date = .now) -> (from: Date, to: Date, granularity: String) {
        let calendar = Calendar.current
        let startToday = calendar.startOfDay(for: anchor)
        let to = calendar.date(byAdding: DateComponents(day: 1, second: -1), to: startToday) ?? anchor
        let from: Date
        switch self {
        case .today: from = startToday
        case .week: from = calendar.date(byAdding: .day, value: -6, to: startToday) ?? startToday
        case .month: from = calendar.date(from: calendar.dateComponents([.year, .month], from: anchor)) ?? startToday
        case .year: from = calendar.date(from: calendar.dateComponents([.year], from: anchor)) ?? startToday
        }
        return (from, to, self == .year ? "month" : "day")
    }
}
