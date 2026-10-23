import SwiftUI

struct LoginView: View {
    @Environment(SessionStore.self) private var session
    @State private var identifier = ""
    @State private var password = ""
    @State private var errorMessage: String?
    @State private var submitting = false
    @FocusState private var focusedField: Field?

    private enum Field { case identifier, password }

    var body: some View {
        @Bindable var session = session
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    Text("BILLET")
                        .font(.caption.bold())
                        .tracking(2)
                        .foregroundStyle(AppTheme.accent)
                    Text("Chào mừng trở lại")
                        .font(.largeTitle.bold())
                    Text("Đăng nhập để tiếp tục nhật ký chi tiêu của bạn.")
                        .foregroundStyle(AppTheme.secondaryText)

                    TextField("Username, email hoặc số điện thoại", text: $identifier)
                        .accessibilityLabel("Tên đăng nhập, email hoặc số điện thoại")
                        .textContentType(.username)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()
                        .focused($focusedField, equals: .identifier)
                        .submitLabel(.next)
                        .onSubmit { focusedField = .password }
                        .billetInput()

                    SecureField("Mật khẩu", text: $password)
                        .accessibilityLabel("Mật khẩu")
                        .textContentType(.password)
                        .focused($focusedField, equals: .password)
                        .submitLabel(.go)
                        .onSubmit { submit() }
                        .billetInput()

                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }

                    Button(action: submit) {
                        Group {
                            if submitting { ProgressView() } else { Text("Đăng nhập") }
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity, minHeight: 54)
                    }
                    .buttonStyle(.plain)
                    .foregroundStyle(Color(uiColor: .label))
                    .background(AppTheme.peach)
                    .clipShape(.capsule)
                    .disabled(submitting || identifier.trimmingCharacters(in: .whitespaces).isEmpty || password.isEmpty)
                    .opacity(submitting || identifier.isEmpty || password.isEmpty ? 0.55 : 1)
                }
                .frame(maxWidth: 440)
                .padding(24)
                .frame(maxWidth: .infinity)
            }
            .scrollDismissesKeyboard(.interactively)
            .background(AppTheme.canvas)
        }
    }

    private func submit() {
        guard !submitting else { return }
        submitting = true
        errorMessage = nil
        Task {
            defer { submitting = false }
            do {
                try await session.login(identifier: identifier.trimmingCharacters(in: .whitespaces), password: password)
            } catch {
                errorMessage = error.localizedDescription
            }
        }
    }
}
private extension View {
    func billetInput() -> some View {
        padding(.horizontal, 16)
            .frame(minHeight: 54)
            .background(AppTheme.card)
            .clipShape(.rect(cornerRadius: 16, style: .continuous))
            .overlay {
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(AppTheme.line, lineWidth: 1)
            }
    }
}
