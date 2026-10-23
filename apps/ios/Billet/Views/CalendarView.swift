import SwiftUI

struct CalendarView: View {
    @Environment(SessionStore.self) private var session
    @State private var months: [ExpenseCalendar] = []
    @State private var errorMessage: String?
    @State private var selectedDay: ExpenseCalendarDay?

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 6), count: 7)
    private let weekdays = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

    var body: some View {
        ScrollView {
            LazyVStack(spacing: 28) {
                if let selectedDay {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(selectedDay.date).font(.caption).foregroundStyle(.secondary)
                            Text("\(selectedDay.count) khoản").font(.headline)
                        }
                        Spacer()
                        Text(MoneyFormatter.string(selectedDay.totalMinor))
                            .font(.title3.bold().monospacedDigit())
                    }
                    .padding()
                    .billetCard()
                }

                ForEach(months) { month in
                    VStack(alignment: .leading, spacing: 12) {
                        HStack {
                            Text(monthTitle(month.month)).font(.title3.bold())
                            Spacer()
                            Text(MoneyFormatter.string(month.totalMinor, currency: month.currency))
                                .font(.subheadline.monospacedDigit())
                        }
                        LazyVGrid(columns: columns, spacing: 8) {
                            ForEach(weekdays, id: \.self) { Text($0).font(.caption2).foregroundStyle(.secondary) }
                            ForEach(Array(cells(for: month).enumerated()), id: \.offset) { _, cell in
                                if let cell {
                                    Button { selectedDay = cell.entry } label: {
                                        VStack(spacing: 4) {
                                            Text("\(cell.day)").font(.callout)
                                            Circle()
                                                .fill(heatColor(count: cell.entry?.count ?? 0))
                                                .frame(width: 7, height: 7)
                                        }
                                        .frame(maxWidth: .infinity, minHeight: 44)
                                        .background(selectedDay?.date == cell.entry?.date ? AppTheme.peachSoft : .clear)
                                        .clipShape(.rect(cornerRadius: 12, style: .continuous))
                                    }
                                    .buttonStyle(.plain)
                                    .disabled(cell.entry == nil)
                                } else {
                                    Color.clear.frame(height: 44)
                                }
                            }
                        }
                    }
                    .padding()
                    .billetCard()
                }
            }
            .padding()
        }
        .background(AppTheme.canvas)
        .navigationTitle("Lịch chi tiêu")
        .overlay {
            if let errorMessage, months.isEmpty {
                LoadStateView(message: errorMessage) { Task { await load() } }
            }
        }
        .task { await load() }
        .refreshable { await load() }
    }

    private func cells(for month: ExpenseCalendar) -> [CalendarCell?] {
        let parts = month.month.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 2,
              let first = Calendar.current.date(from: DateComponents(year: parts[0], month: parts[1], day: 1)),
              let range = Calendar.current.range(of: .day, in: .month, for: first)
        else { return [] }
        let weekday = Calendar.current.component(.weekday, from: first)
        let leading = (weekday + 5) % 7
        let entries = Dictionary(uniqueKeysWithValues: month.days.compactMap { day -> (Int, ExpenseCalendarDay)? in
            guard let value = Int(day.date.suffix(2)) else { return nil }
            return (value, day)
        })
        return Array(repeating: nil, count: leading) + range.map { CalendarCell(day: $0, entry: entries[$0]) }
    }

    private func heatColor(count: Int) -> Color {
        switch count {
        case 0: AppTheme.line
        case 1: AppTheme.peachSoft
        case 2: AppTheme.peach
        case 3: Color.orange
        default: Color.red
        }
    }

    private func monthTitle(_ month: String) -> String {
        let parts = month.split(separator: "-")
        guard parts.count == 2 else { return month }
        return "Tháng \(parts[1])/\(parts[0])"
    }

    @MainActor
    private func load() async {
        errorMessage = nil
        do {
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM"
            let month = formatter.string(from: .now)
            let timezone = TimeZone.current.identifier.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? "Asia/Ho_Chi_Minh"
            let history: CalendarHistory = try await session.api.request(
                "/expenses/calendar/history?throughMonth=\(month)&currency=VND&timezone=\(timezone)"
            )
            months = history.months
            selectedDay = history.months.last?.days.first(where: { $0.count > 0 })
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}

private struct CalendarCell { let day: Int; let entry: ExpenseCalendarDay? }
