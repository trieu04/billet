import PhotosUI
import SwiftUI
import UIKit

struct CaptureFlowView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var photo: CapturedPhoto?
    @State private var pickerItem: PhotosPickerItem?
    @State private var showingCamera = false
    @State private var showingDiscardConfirmation = false
    let onSaved: () -> Void

    var body: some View {
        NavigationStack {
            Group {
                if let photo {
                    CaptureReviewView(photo: photo) {
                        onSaved()
                        dismiss()
                    } onRetake: {
                        self.photo = nil
                        showingCamera = true
                    } onCancel: {
                        showingDiscardConfirmation = true
                    }
                } else {
                    captureLanding
                }
            }
        }
        .background(Color.black)
        .fullScreenCover(isPresented: $showingCamera) {
            CameraPicker { image in
                if let data = image.jpegData(compressionQuality: 0.85) {
                    photo = CapturedPhoto(data: data, capturedAt: .now)
                }
            }
            .ignoresSafeArea()
        }
        .confirmationDialog(
            "Bỏ khoản chi này?",
            isPresented: $showingDiscardConfirmation,
            titleVisibility: .visible
        ) {
            Button("Bỏ khoản chi", role: .destructive) { dismiss() }
            Button("Tiếp tục sửa", role: .cancel) {}
        } message: {
            Text("Ảnh và nội dung chưa lưu sẽ bị bỏ.")
        }
    }

    private var captureLanding: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 24) {
                Spacer()
                Image(systemName: "camera.viewfinder")
                    .font(.system(size: 76, weight: .ultraLight))
                    .foregroundStyle(AppTheme.peach)
                    .accessibilityHidden(true)
                Text("Thêm chi tiêu")
                    .font(.largeTitle.bold())
                    .foregroundStyle(.white)
                Text("Chụp hóa đơn hoặc khoảnh khắc chi tiêu")
                    .foregroundStyle(.white.opacity(0.72))
                Spacer()
                HStack(spacing: 32) {
                    PhotosPicker(selection: $pickerItem, matching: .images) {
                        captureAction("Thư viện", systemImage: "photo.on.rectangle")
                    }
                    .onChange(of: pickerItem) { _, item in
                        Task {
                            guard let data = try? await item?.loadTransferable(type: Data.self) else { return }
                            photo = CapturedPhoto(data: data, capturedAt: .now)
                        }
                    }

                    Button { showingCamera = true } label: {
                        ZStack {
                            Circle().fill(.white).frame(width: 78, height: 78)
                            Circle().stroke(.white.opacity(0.45), lineWidth: 4).frame(width: 90, height: 90)
                        }
                    }
                    .accessibilityLabel("Chụp ảnh")

                    Button { photo = CapturedPhoto(data: nil, capturedAt: .now) } label: {
                        captureAction("Nhập tay", systemImage: "square.and.pencil")
                    }
                }
                .padding(.bottom, 28)
            }
            .padding()
        }
        .toolbar {
            ToolbarItem(placement: .topBarLeading) {
                Button("Đóng", systemImage: "xmark") { dismiss() }
                    .foregroundStyle(.white)
            }
        }
        .toolbarBackground(.hidden, for: .navigationBar)
        .preferredColorScheme(.dark)
    }

    private func captureAction(_ title: String, systemImage: String) -> some View {
        VStack(spacing: 8) {
            Image(systemName: systemImage)
                .font(.title2)
                .frame(width: 50, height: 50)
                .background(.white.opacity(0.14))
                .clipShape(.circle)
            Text(title).font(.caption)
        }
        .foregroundStyle(.white)
        .frame(minWidth: 70, minHeight: 70)
    }
}

private struct CapturedPhoto: Identifiable {
    let id = UUID()
    let data: Data?
    let capturedAt: Date
}

private struct CaptureReviewView: View {
    @Environment(SessionStore.self) private var session
    let photo: CapturedPhoto
    let onSaved: () -> Void
    let onRetake: () -> Void
    let onCancel: () -> Void

    @State private var amount = ""
    @State private var caption = ""
    @State private var categories: [Category] = []
    @State private var categoryID: String?
    @State private var saving = false
    @State private var stage = "Đang lưu…"
    @State private var errorMessage: String?
    @FocusState private var amountFocused: Bool

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                if let data = photo.data, let image = UIImage(data: data) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(height: 280)
                        .frame(maxWidth: .infinity)
                        .clipped()
                        .clipShape(.rect(cornerRadius: 24, style: .continuous))
                        .overlay(alignment: .bottomLeading) {
                            Text(photo.capturedAt.formatted(.dateTime.hour().minute().locale(Locale(identifier: "vi_VN"))))
                                .font(.caption.bold())
                                .foregroundStyle(.white)
                                .padding(10)
                                .background(.black.opacity(0.5), in: .capsule)
                                .padding(12)
                        }
                }

                VStack(alignment: .leading, spacing: 8) {
                    Text("Số tiền").font(.caption).foregroundStyle(.secondary)
                    HStack(alignment: .firstTextBaseline) {
                        TextField("0", text: $amount)
                            .keyboardType(.numberPad)
                            .font(.system(.largeTitle, design: .rounded, weight: .bold))
                            .focused($amountFocused)
                            .accessibilityLabel("Số tiền bằng đồng Việt Nam")
                        Text("₫").font(.title2).foregroundStyle(.secondary)
                    }
                }
                .padding()
                .billetCard()

                VStack(alignment: .leading, spacing: 10) {
                    Text("Danh mục").font(.caption).foregroundStyle(.secondary)
                    if categories.isEmpty {
                        ProgressView().frame(maxWidth: .infinity)
                    } else {
                        ScrollView(.horizontal) {
                            HStack {
                                ForEach(categories) { category in
                                    Button(category.name) { categoryID = category.id }
                                        .buttonStyle(.bordered)
                                        .tint(categoryID == category.id ? AppTheme.accent : AppTheme.secondaryText)
                                }
                            }
                        }
                        .scrollIndicators(.hidden)
                    }
                }
                .padding()
                .billetCard()

                VStack(alignment: .leading, spacing: 8) {
                    Text("Ghi chú").font(.caption).foregroundStyle(.secondary)
                    TextField("Hôm nay có gì đáng nhớ?", text: $caption, axis: .vertical)
                        .lineLimit(2...4)
                }
                .padding()
                .billetCard()

                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }

                Button(action: save) {
                    HStack {
                        if saving { ProgressView() }
                        Text(saving ? stage : "Lưu vào Journal")
                    }
                    .font(.headline)
                    .frame(maxWidth: .infinity, minHeight: 54)
                }
                .buttonStyle(.plain)
                .background(AppTheme.peach)
                .foregroundStyle(Color(uiColor: .label))
                .clipShape(.capsule)
                .disabled(saving)
            }
            .padding()
            .padding(.bottom, 24)
        }
        .scrollDismissesKeyboard(.interactively)
        .background(AppTheme.canvas)
        .navigationTitle("Chỉnh sửa chi tiêu")
        .navigationBarTitleDisplayMode(.inline)
        .interactiveDismissDisabled(saving)
        .toolbar {
            ToolbarItem(placement: .cancellationAction) {
                Button("Hủy", action: onCancel).disabled(saving)
            }
            ToolbarItem(placement: .topBarTrailing) {
                Button(photo.data == nil ? "Chụp ảnh" : "Chụp lại", action: onRetake).disabled(saving)
            }
        }
        .task {
            do {
                categories = try await session.api.request("/categories")
                categoryID = categories.first?.id
            } catch {
                errorMessage = error.localizedDescription
            }
        }
        .onAppear { amountFocused = true }
    }

    private func save() {
        let normalized = amount.trimmingCharacters(in: .whitespaces).drop { $0 == "0" }
        guard !normalized.isEmpty, normalized.allSatisfy(\.isNumber), let categoryID else {
            errorMessage = "Nhập số tiền lớn hơn 0 và chọn danh mục."
            return
        }
        saving = true
        errorMessage = nil
        Task {
            do {
                var mediaID: String?
                if let data = photo.data {
                    stage = "Đang tải ảnh…"
                    struct MediaBody: Encodable { let mimeType: String; let sizeBytes: Int }
                    let reservation: MediaReservation = try await session.api.request(
                        "/media",
                        method: "POST",
                        body: MediaBody(mimeType: "image/jpeg", sizeBytes: data.count)
                    )
                    try await session.api.upload(to: reservation.uploadUrl, data: data, mimeType: "image/jpeg")
                    mediaID = reservation.id
                }

                stage = "Đang lưu chi tiêu…"
                struct ExpenseBody: Encodable {
                    let amountMinor: String
                    let currency: String
                    let occurredAt: String
                    let occurredTimezone: String
                    let categoryId: String
                    let mediaAssetId: String?
                    let caption: String?
                    let idempotencyKey: String
                }
                let body = ExpenseBody(
                    amountMinor: String(normalized),
                    currency: "VND",
                    occurredAt: ISO8601DateFormatter.billet.string(from: photo.capturedAt),
                    occurredTimezone: TimeZone.current.identifier,
                    categoryId: categoryID,
                    mediaAssetId: mediaID,
                    caption: caption.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : caption,
                    idempotencyKey: "ios-\(UUID().uuidString.lowercased())"
                )
                let _: Expense = try await session.api.request("/expenses", method: "POST", body: body)
                UINotificationFeedbackGenerator().notificationOccurred(.success)
                onSaved()
            } catch {
                saving = false
                errorMessage = error.localizedDescription
                UINotificationFeedbackGenerator().notificationOccurred(.error)
            }
        }
    }
}

private struct CameraPicker: UIViewControllerRepresentable {
    @Environment(\.dismiss) private var dismiss
    let onImage: (UIImage) -> Void

    func makeCoordinator() -> Coordinator { Coordinator(parent: self) }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.delegate = context.coordinator
        picker.sourceType = UIImagePickerController.isSourceTypeAvailable(.camera) ? .camera : .photoLibrary
        picker.cameraCaptureMode = .photo
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UIImagePickerControllerDelegate, UINavigationControllerDelegate {
        let parent: CameraPicker
        init(parent: CameraPicker) { self.parent = parent }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            if let image = info[.originalImage] as? UIImage { parent.onImage(image) }
            parent.dismiss()
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) { parent.dismiss() }
    }
}
