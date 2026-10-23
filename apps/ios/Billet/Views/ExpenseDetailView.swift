import SwiftUI

struct ExpenseDetailView: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(SessionStore.self) private var session
    let expenseID: String
    let onDeleted: () -> Void

    @State private var expense: Expense?
    @State private var categories: [Category] = []
    @State private var errorMessage: String?
    @State private var showingEditor = false
    @State private var showingDelete = false

    var body: some View {
        ScrollView {
            if let expense {
                VStack(spacing: 16) {
                    Group {
                        if let mediaID = expense.mediaAssetId {
                            AuthenticatedImage(mediaID: mediaID, api: session.api)
                        } else {
                            LinearGradient(
                                colors: [AppTheme.peachSoft, AppTheme.lavender],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                            .overlay {
                                Image(systemName: "receipt")
                                    .font(.system(size: 64, weight: .ultraLight))
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                    .frame(height: 390)
                    .clipShape(.rect(cornerRadius: 28, style: .continuous))

                    VStack(alignment: .leading, spacing: 8) {
                        Text("Số tiền")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(MoneyFormatter.string(expense.amountMinor, currency: expense.currency))
                            .font(.system(.largeTitle, design: .rounded, weight: .bold))
                            .monospacedDigit()
                            .textSelection(.enabled)
                        Text(timestamp(expense.occurredAt))
                            .font(.subheadline)
                            .foregroundStyle(AppTheme.secondaryText)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(18)
                    .billetCard()

                    VStack(spacing: 0) {
                        detailRow("Danh mục", value: categoryName(expense.categoryId), icon: "tag")
                        Divider().padding(.leading, 52)
                        detailRow("Cửa hàng", value: expense.merchant ?? "Chưa thêm", icon: "storefront")
                        Divider().padding(.leading, 52)
                        detailRow("Địa điểm", value: expense.location ?? "Chưa thêm", icon: "mappin.and.ellipse")
                    }
                    .billetCard()

                    if let caption = expense.caption, !caption.isEmpty {
                        Text(caption)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(18)
                            .billetCard()
                            .textSelection(.enabled)
                    }
                }
                .padding()
            } else if let errorMessage {
                LoadStateView(message: errorMessage) { Task { await load() } }
                    .frame(minHeight: 420)
            } else {
                ProgressView("Đang mở khoảnh khắc…")
                    .frame(maxWidth: .infinity, minHeight: 420)
            }
        }
        .background(AppTheme.canvas)
        .navigationTitle("Chi tiết")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            if expense != nil {
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        Button("Chỉnh sửa", systemImage: "pencil") { showingEditor = true }
                        Button("Xóa khoản chi", systemImage: "trash", role: .destructive) { showingDelete = true }
                    } label: {
                        Label("Tùy chọn", systemImage: "ellipsis.circle")
                    }
                }
            }
        }
        .task { await load() }
        .sheet(isPresented: $showingEditor) {
            if let expense {
                ExpenseEditor(expense: expense, categories: categories) { updated in
                    self.expense = updated
                    showingEditor = false
                }
                .presentationDetents([.medium, .large])
            }
        }
        .alert("Xóa khoản chi?", isPresented: $showingDelete) {
            Button("Xóa", role: .destructive) { remove() }
            Button("Hủy", role: .cancel) {}
        } message: {
            Text("Khoản chi này sẽ bị xóa khỏi Journal.")
        }
    }

    private func detailRow(_ title: String, value: String, icon: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon).frame(width: 24).foregroundStyle(AppTheme.accent)
            Text(title)
            Spacer()
            Text(value).foregroundStyle(AppTheme.secondaryText).lineLimit(1)
        }
        .frame(minHeight: 54)
        .padding(.horizontal, 16)
    }

    private func categoryName(_ id: String) -> String {
        categories.first(where: { $0.id == id })?.name ?? "Khác"
    }

    private func timestamp(_ value: String) -> String {
        guard let date = DateParser.date(value) else { return value }
        return date.formatted(.dateTime.weekday(.wide).day().month().year().hour().minute().locale(Locale(identifier: "vi_VN")))
    }

    @MainActor
    private func load() async {
        errorMessage = nil
        do {
            async let loadedExpense: Expense = session.api.request("/expenses/\(expenseID)")
            async let loadedCategories: [Category] = session.api.request("/categories")
            let values = try await (loadedExpense, loadedCategories)
            expense = values.0
            categories = values.1
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func remove() {
        Task {
            do {
                try await session.api.send("/expenses/\(expenseID)", method: "DELETE")
                onDeleted()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}

private struct ExpenseEditor: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss
    let expense: Expense
    let categories: [Category]
    let onSaved: (Expense) -> Void

    @State private var categoryID: String
    @State private var caption: String
    @State private var saving = false
    @State private var errorMessage: String?

    init(expense: Expense, categories: [Category], onSaved: @escaping (Expense) -> Void) {
        self.expense = expense
        self.categories = categories
        self.onSaved = onSaved
        _categoryID = State(initialValue: expense.categoryId)
        _caption = State(initialValue: expense.caption ?? "")
    }

    var body: some View {
        NavigationStack {
            Form {
                Picker("Danh mục", selection: $categoryID) {
                    ForEach(categories) { Text($0.name).tag($0.id) }
                }
                TextField("Ghi chú", text: $caption, axis: .vertical)
                    .lineLimit(2...5)
                if let errorMessage { Text(errorMessage).foregroundStyle(.red) }
            }
            .navigationTitle("Chỉnh sửa")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) { Button("Hủy") { dismiss() } }
                ToolbarItem(placement: .confirmationAction) {
                    Button(saving ? "Đang lưu…" : "Lưu", action: save).disabled(saving)
                }
            }
            .interactiveDismissDisabled(saving)
        }
    }

    private func save() {
        struct Body: Encodable { let version: Int; let caption: String?; let categoryId: String }
        saving = true
        Task {
            do {
                let updated: Expense = try await session.api.request(
                    "/expenses/\(expense.id)",
                    method: "PATCH",
                    body: Body(
                        version: expense.version,
                        caption: caption.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : caption,
                        categoryId: categoryID
                    )
                )
                onSaved(updated)
            } catch {
                saving = false
                errorMessage = error.localizedDescription
            }
        }
    }
}
