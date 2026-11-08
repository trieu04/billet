# Tài liệu Billet

Billet là nhật ký chi tiêu bằng hình ảnh: ghi nhanh, giữ ngữ cảnh bằng ảnh/caption và tổng hợp từ dữ liệu người dùng đã xác nhận. Thư mục này giữ yêu cầu nghiệp vụ, quyết định thiết kế và [hướng dẫn phát triển](./development-guide.md). [README repository](../README.md) giới thiệu tổng quan dự án.

## Danh mục

| Tài liệu                                                                                             | Nội dung                                                                                             | Trạng thái                                       |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| [Business Requirements](./business-requirements.md)                                                  | Mục tiêu, ưu tiên P0/P1, mã FR/BR/NFR và nghiệm thu nghiệp vụ                                        | Bản nháp nghiệp vụ; chưa duyệt phạm vi phát hành |
| [Technical Design — Backend](./technical-design/01-backend.md)                                       | Module, luồng lưu khoản chi, dữ liệu và giới hạn hiện tại                                            | Hiện hành                                        |
| [Technical Design — Gợi ý chi tiêu từ ảnh](./technical-design/03-photo-expense-suggestion.md)        | OCR on-device, Decision API với choice set, nén ảnh, rule cá nhân hóa và benchmark                   | Đề xuất; chưa triển khai                         |
| [Implementation Plan — Gợi ý chi tiêu từ ảnh](./implementation-plans/03-photo-expense-suggestion.md) | Các giai đoạn triển khai, file bị ảnh hưởng, kiểm tra và issue đề xuất cho thiết kế 03               | Kế hoạch; chưa triển khai                        |
| [Technical Design — Nhận ảnh chia sẻ từ app khác](./technical-design/05-share-intake.md)             | Share target trên Expo, share inbox cục bộ, luồng vào màn hình review và quyền riêng tư của biên lai | Đã triển khai local; chờ kiểm chứng thiết bị     |
| [Implementation Plan — Nhận ảnh chia sẻ từ app khác](./implementation-plans/05-share-intake.md)      | Spike thiết bị, các giai đoạn triển khai, file bị ảnh hưởng và issue đề xuất cho thiết kế 05         | Đã triển khai local; chờ kiểm chứng thiết bị     |
| [Logo Billet](./brand/logo.md)                                                                       | Wordmark đã chốt, logo vuông đang chọn, bảng màu và picker HTML                                      | Đã chốt                                          |
| [Bảng màu Billet](./brand/colors.md)                                                                 | Thang màu OKLCH, token sáng/tối, màu danh mục và color picker                                        | Đề xuất; chưa áp dụng vào app                    |
| [Mẫu Technical Design](./technical-design/00-template.md)                                            | Khung tài liệu cho thiết kế mới                                                                      | Template                                         |

Hướng dẫn thiết lập, chạy, Docker, cấu hình và phát hành nằm trong [Development guide](./development-guide.md).

Đọc BRD trước để hiểu phạm vi, rồi backend và tài liệu theo feature. Các ngưỡng chất lượng/latency trong thiết kế gợi ý từ ảnh là mục tiêu cần benchmark.

## Quy ước

- Tên file dùng tiếng Anh, chữ thường và kebab-case. Tài liệu Technical Design nằm trong `technical-design/`, có tên `NN-<topic>.md` với số thứ tự hai chữ số; tiêu đề bắt đầu bằng `Technical Design —`.
- Tài liệu nghiệp vụ dùng tên mô tả mục đích, như `business-requirements.md`. Template là `technical-design/00-template.md`; thiết kế bắt đầu từ `01-` theo thứ tự đọc.
- Nội dung dùng tiếng Việt; giữ nguyên tên API, field, module và thuật ngữ kỹ thuật khi dịch làm mất nghĩa. Không hard-wrap đoạn văn hoặc list item.
- Mỗi thiết kế ghi phạm vi, trạng thái, ngày cập nhật và Linear issue nếu có. `In Review` hoặc `Approved` mô tả review thiết kế, không chứng minh đã deploy hoặc pass UAT.
- Hiện trạng phải có source/contract tham chiếu; đề xuất, giả định và mục tiêu chưa đo phải ghi rõ. Giữ chi tiết API đang chạy ở OpenAPI; tránh sao chép schema/config dễ lỗi thời.
- Khi đổi contract hoặc tên file, cập nhật tài liệu sở hữu và mọi liên kết đang dùng. Giữ mã FR/BR/NFR để backlog và test tiếp tục truy vết.

## Hướng dẫn theo app

- [Server](../apps/server/README.md): chạy API, cấu hình, module và OpenAPI; [realtime contract](../apps/server/src/modules/realtime/README.md).
- [Development guide](./development-guide.md): workspace, web, Docker, cổng dịch vụ, cấu hình và versioning. Expo được giữ làm client legacy.
