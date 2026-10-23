import SwiftUI

struct ProfileView: View {
    @Environment(SessionStore.self) private var session
    @State private var profile: Profile?
    @State private var budget: Budget?
    @State private var errorMessage: String?
    @State private var faceIDEnabled = true
    @State private var showingLogout = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 14) {
                    HStack(spacing: 16) {
                        Text(String(profile?.displayName.first ?? session.user?.displayName.first ?? "…").uppercased())
                            .font(.title2.bold())
                            .frame(width: 62, height: 62)
                            .background(AppTheme.lavender)
                            .clipShape(.circle)
                        VStack(alignment: .leading, spacing: 5) {
                            Text(profile?.displayName ?? session.user?.displayName ?? "Đang tải…")
                                .font(.title3.bold())
                            Text("Đã lưu \(profile?.expenseCount ?? 0) khoảnh khắc")
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                        }
                        Spacer()
                    }
                    .padding(18)
                    .billetCard()

                    VStack(alignment: .leading, spacing: 10) {
                        Text("Ngân sách tháng \(Calendar.current.component(.month, from: .now))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        HStack(alignment: .firstTextBaseline, spacing: 4) {
                            Text(MoneyFormatter.string(budget?.spentMinor ?? "0", currency: budget?.currency ?? "VND"))
                                .font(.system(.title, design: .rounded, weight: .bold))
                                .monospacedDigit()
                            Text("/ \(budget?.limitMinor.map { MoneyFormatter.string($0, currency: budget?.currency ?? "VND") } ?? "Chưa đặt")")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        ProgressView(value: budgetProgress).tint(AppTheme.peach)
                        Text(budgetHint).font(.caption).foregroundStyle(.secondary)
                    }
                    .padding(18)
                    .billetCard()

                    VStack(spacing: 0) {
                        settingsRow("Tiền tệ", value: profile?.settings.defaultCurrency ?? "…", icon: "dollarsign.circle")
                        Divider().padding(.leading, 52)
                        settingsRow("Nhắc ghi chép", value: reminderText, icon: "bell")
                        Divider().padding(.leading, 52)
                        settingsRow("Giao diện", value: appearanceText, icon: "circle.lefthalf.filled")
                    }
                    .billetCard()

                    VStack(spacing: 0) {
                        Toggle(isOn: $faceIDEnabled) {
                            Label("Khóa bằng Face ID", systemImage: "faceid")
                        }
                        .tint(AppTheme.peach)
                        .frame(minHeight: 56)
                        .padding(.horizontal, 16)
                        Divider().padding(.leading, 52)
                        Button { showingLogout = true } label: {
                            Label("Đăng xuất", systemImage: "rectangle.portrait.and.arrow.right")
                                .frame(maxWidth: .infinity, minHeight: 56, alignment: .leading)
                                .foregroundStyle(.red)
                                .padding(.horizontal, 16)
                        }
                    }
                    .billetCard()

                    if let errorMessage {
                        Text(errorMessage).font(.footnote).foregroundStyle(.red)
                    }
                }
                .padding()
                .padding(.bottom, 36)
            }
            .background(AppTheme.canvas)
            .navigationTitle("Hồ sơ")
            .task { await load() }
            .refreshable { await load() }
            .alert("Đăng xuất khỏi Billet?", isPresented: $showingLogout) {
                Button("Đăng xuất", role: .destructive) { session.logout() }
                Button("Hủy", role: .cancel) {}
            }
        }
    }

    private var budgetProgress: Double {
        guard let budget, let limit = budget.limitMinor.flatMap(Double.init), limit > 0 else { return 0 }
        return min(1, (Double(budget.spentMinor) ?? 0) / limit)
    }

    private var budgetHint: String {
        guard let remaining = budget?.remainingMinor else { return "Bạn chưa đặt ngân sách tháng này" }
        return "Còn \(MoneyFormatter.string(remaining, currency: budget?.currency ?? "VND")) trong tháng này"
    }

    private var reminderText: String {
        guard let settings = profile?.settings else { return "…" }
        return settings.reminderEnabled ? (settings.reminderTime ?? "Bật") : "Tắt"
    }

    private var appearanceText: String {
        switch profile?.settings.appearance { case "light": "Sáng"; case "dark": "Tối"; default: "Tự động" }
    }

    private func settingsRow(_ title: String, value: String, icon: String) -> some View {
        HStack(spacing: 14) {
            Image(systemName: icon).frame(width: 24).foregroundStyle(AppTheme.accent)
            Text(title)
            Spacer()
            Text(value).foregroundStyle(.secondary)
            Image(systemName: "chevron.right").font(.caption).foregroundStyle(.tertiary)
        }
        .frame(minHeight: 56)
        .padding(.horizontal, 16)
    }

    @MainActor
    private func load() async {
        errorMessage = nil
        do {
            let loadedProfile: Profile = try await session.api.request("/profile")
            let formatter = DateFormatter()
            formatter.dateFormat = "yyyy-MM"
            let month = formatter.string(from: .now)
            let loadedBudget: Budget = try await session.api.request(
                "/budgets?month=\(month)&currency=\(loadedProfile.settings.defaultCurrency)"
            )
            profile = loadedProfile
            budget = loadedBudget
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
