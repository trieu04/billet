import SwiftUI

struct JournalView: View {
    @Environment(SessionStore.self) private var session
    @State private var expenses: [Expense] = []
    @State private var loading = true
    @State private var errorMessage: String?
    @State private var showingCapture = false

    var body: some View {
        NavigationStack {
            ScrollView {
                LazyVStack(alignment: .leading, spacing: 24) {
                    if loading && expenses.isEmpty {
                        ProgressView("Đang mở nhật ký…")
                            .frame(maxWidth: .infinity, minHeight: 220)
                    } else if let errorMessage, expenses.isEmpty {
                        LoadStateView(message: errorMessage) { Task { await load() } }
                            .frame(minHeight: 280)
                    } else if expenses.isEmpty {
                        ContentUnavailableView(
                            "Chưa có khoản chi",
                            systemImage: "camera",
                            description: Text("Chụp khoảnh khắc đầu tiên để bắt đầu nhật ký.")
                        )
                        .frame(minHeight: 300)
                    }

                    ForEach(groups) { group in
                        VStack(alignment: .leading, spacing: 12) {
                            HStack(alignment: .firstTextBaseline) {
                                VStack(alignment: .leading, spacing: 3) {
                                    Text(group.title).font(.title3.bold())
                                    Text("\(group.expenses.count) khoảnh khắc")
                                        .font(.caption)
                                        .foregroundStyle(AppTheme.secondaryText)
                                }
                                Spacer()
                                Text(MoneyFormatter.string(group.totalMinor))
                                    .font(.headline.monospacedDigit())
                            }
                            .padding(.horizontal, 20)

                            ScrollView(.horizontal) {
                                LazyHStack(spacing: 12) {
                                    ForEach(group.expenses) { expense in
                                        NavigationLink(value: expense) {
                                            ExpenseCard(expense: expense, api: session.api)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                                .padding(.horizontal, 20)
                                .padding(.bottom, 8)
                            }
                            .scrollTargetBehavior(.viewAligned)
                            .scrollIndicators(.hidden)
                        }
                    }
                }
                .padding(.bottom, 88)
            }
            .background(AppTheme.canvas)
            .navigationTitle("Nhật ký")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    NavigationLink(destination: CalendarView()) {
                        Label("Xem lịch", systemImage: "calendar")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button { showingCapture = true } label: {
                        Label("Thêm chi tiêu", systemImage: "camera.fill")
                    }
                    .accessibilityHint("Mở camera hoặc nhập khoản chi thủ công")
                }
            }
            .navigationDestination(for: Expense.self) { expense in
                ExpenseDetailView(expenseID: expense.id) {
                    expenses.removeAll { $0.id == expense.id }
                }
            }
            .refreshable { await load() }
            .task { await load() }
            .fullScreenCover(isPresented: $showingCapture) {
                CaptureFlowView {
                    showingCapture = false
                    Task { await load() }
                }
            }
        }
    }

    private var groups: [JournalGroup] { JournalGroup.make(from: expenses) }

    @MainActor
    private func load() async {
        loading = true
        errorMessage = nil
        defer { loading = false }
        do {
            let calendar = Calendar.current
            let from = calendar.date(byAdding: .day, value: -13, to: calendar.startOfDay(for: .now)) ?? .now
            let encoded = from.ISO8601Format().addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""
            var page: ExpenseList = try await session.api.request("/expenses?from=\(encoded)&limit=100")
            var all = page.data
            while let cursor = page.nextCursor {
                let safeCursor = cursor.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? cursor
                page = try await session.api.request("/expenses?from=\(encoded)&limit=100&cursor=\(safeCursor)")
                all.append(contentsOf: page.data)
            }
            expenses = all
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
struct JournalGroup: Identifiable {
    let id: Date
    let date: Date
    let expenses: [Expense]
    let totalMinor: String

    var title: String {
        if Calendar.current.isDateInToday(date) { return "Hôm nay" }
        if Calendar.current.isDateInYesterday(date) { return "Hôm qua" }
        return date.formatted(.dateTime.weekday(.wide).day().month().locale(Locale(identifier: "vi_VN"))).capitalized
    }

    static func make(from expenses: [Expense]) -> [JournalGroup] {
        let calendar = Calendar.current
        let grouped = Dictionary(grouping: expenses) { expense in
            calendar.startOfDay(for: DateParser.date(expense.occurredAt) ?? .distantPast)
        }
        return grouped.map { date, values in
            let total = values.reduce(Int64(0)) { $0 + (Int64($1.amountMinor) ?? 0) }
            return JournalGroup(
                id: date,
                date: date,
                expenses: values.sorted { $0.occurredAt > $1.occurredAt },
                totalMinor: String(total)
            )
        }
        .sorted { $0.date > $1.date }
    }
}
