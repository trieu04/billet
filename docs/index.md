# Tài liệu Billet

Billet là nhật ký chi tiêu bằng hình ảnh: ghi nhanh, giữ ngữ cảnh bằng ảnh/caption và tổng hợp từ dữ liệu người dùng đã xác nhận. Thư mục này giữ yêu cầu nghiệp vụ, quyết định thiết kế và [hướng dẫn phát triển](./development-guide.md). [README repository](../README.md) giới thiệu tổng quan dự án.

## Danh mục

| Tài liệu                                                                                          | Nội dung                                                          | Trạng thái                                            |
| ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- | ----------------------------------------------------- |
| [Business Requirements](./business-requirements.md)                                               | Mục tiêu, ưu tiên P0/P1, mã FR/BR/NFR và nghiệm thu nghiệp vụ     | Bản nháp nghiệp vụ; chưa duyệt phạm vi phát hành      |
| [Technical Design — Backend](./techical-design/01-backend.md)                                     | Module, dữ liệu, luồng API/job và giới hạn implementation         | Tổng quan source hiện tại và ràng buộc cần hoàn thiện |
| [Technical Design — Capture và hiển thị ảnh](./techical-design/02-mobile-capture.md)              | Use photo, nhập tiền, khung ảnh và bảo vệ draft                   | Định hướng trải nghiệm; kiểm chứng riêng theo client  |
| [Technical Design — Xử lý ảnh đa mục đích](./techical-design/03-image-processing.md)              | Chuẩn bị ảnh AI, display variants, storage/cache và rollout       | Đề xuất In Review; chưa triển khai                    |
| [Technical Design — Nhận diện chi tiêu từ ảnh](./techical-design/04-expense-image-recognition.md) | OCR on-device, Decision API, rule engine, provenance và benchmark | Đề xuất In Review; chưa triển khai                    |
| [Mẫu Technical Design](./techical-design/00-template.md)                                          | Khung tài liệu cho thiết kế mới                                   | Template                                              |

Hướng dẫn thiết lập, chạy, Docker, cấu hình và phát hành nằm trong [Development guide](./development-guide.md).

Đọc BRD trước để hiểu phạm vi, rồi backend và tài liệu theo feature. Hai thiết kế nhận diện/xử lý ảnh phải dùng chung định nghĩa source, profile AI và deadline; các ngưỡng chất lượng/latency là mục tiêu cần benchmark.

## Quy ước

- Tên file dùng tiếng Anh, chữ thường và kebab-case. Tài liệu Technical Design nằm trong `techical-design/`, có tên `NN-<topic>.md` với số thứ tự hai chữ số; tiêu đề bắt đầu bằng `Technical Design —`.
- Tài liệu nghiệp vụ dùng tên mô tả mục đích, như `business-requirements.md`. Template là `techical-design/00-template.md`; thiết kế bắt đầu từ `01-` theo thứ tự đọc.
- Nội dung dùng tiếng Việt; giữ nguyên tên API, field, module và thuật ngữ kỹ thuật khi dịch làm mất nghĩa. Không hard-wrap đoạn văn hoặc list item.
- Mỗi thiết kế ghi phạm vi, trạng thái, ngày cập nhật và Linear issue nếu có. `In Review` hoặc `Approved` mô tả review thiết kế, không chứng minh đã deploy hoặc pass UAT.
- Hiện trạng phải có source/contract tham chiếu; đề xuất, giả định và mục tiêu chưa đo phải ghi rõ. Giữ chi tiết API đang chạy ở OpenAPI; tránh sao chép schema/config dễ lỗi thời.
- Khi đổi contract hoặc tên file, cập nhật tài liệu sở hữu và mọi liên kết đang dùng. Giữ mã FR/BR/NFR để backlog và test tiếp tục truy vết.

## Hướng dẫn theo app

- [Server](../apps/server/README.md): chạy API, cấu hình, module và OpenAPI; [realtime contract](../apps/server/src/modules/realtime/README.md).
- [iOS](../apps/ios/README.md): generate/build/test native app.
- [Android](../apps/android/README.md): build/test native app.
- [Development guide](./development-guide.md): workspace, web, Docker, cổng dịch vụ, cấu hình và versioning. Expo được giữ làm client legacy.
