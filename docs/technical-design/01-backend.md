# Technical Design — Backend

| Thông tin  | Giá trị                                          |
| ---------- | ------------------------------------------------ |
| Phạm vi    | NestJS API, PostgreSQL và private storage        |
| Trạng thái | Hiện hành                                        |
| Cập nhật   | 2026-10-31                                       |
| Issue      | [DEV-19](https://linear.app/devtvn/issue/DEV-19) |

## 1. Tổng quan

Billet tổ chức dữ liệu quanh **expense**: khoản chi có tiền, loại tiền, thời điểm và ngữ cảnh tùy chọn (ảnh, caption, danh mục). Nhật ký, lịch, báo cáo và ngân sách đọc các khoản còn hiệu lực. Backend là NestJS modular monolith + PostgreSQL + private storage (development dùng local storage; chưa có adapter S3). Tài liệu mô tả source hiện hành; route/DTO chi tiết nằm trong OpenAPI và [server README](../../apps/server/README.md).

## 2. Thiết kế

### Module

| Module                         | Trách nhiệm                                                                                                                   |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `user`, `auth`                 | Hồ sơ và tùy chọn (`/profile`); đăng ký, đăng nhập, social, refresh/logout, MFA, khôi phục mật khẩu                           |
| `expense`                      | Create idempotent, sửa theo `version`, xóa mềm, danh sách cursor kèm tổng, lịch tháng/lịch sử                                 |
| `category`                     | Danh mục hệ thống và cá nhân; chỉ chủ sở hữu sửa; từ chối xóa danh mục đang dùng                                              |
| `media`                        | Reserve/upload/read ảnh riêng tư qua API; kiểm byte length và signature JPEG/PNG/WebP                                         |
| `report`                       | Tổng, chuỗi thời gian theo timezone, phân bổ danh mục, so kỳ trước                                                            |
| `budget`                       | Hạn mức theo tháng/loại tiền; đã chi tính từ expense                                                                          |
| `reminder`                     | Lịch nhắc từ user settings, kiểm mỗi phút, notification có deduplication key theo ngày địa phương                             |
| `export`                       | Job CSV nền (5 giây), file riêng tư hết hạn tải sau 24 giờ                                                                    |
| `recognition`                  | Gợi ý từ ảnh: Decision API, `suggestion-config`, choice cá nhân, rule, learner ([thiết kế](./03-photo-expense-suggestion.md)) |
| `notification`, `email`, `sms` | Hộp thư, push FCM và adapter gửi theo cấu hình                                                                                |
| `realtime`                     | WebSocket xác thực, publish theo user trong một process ([contract](../../apps/server/src/modules/realtime/README.md))        |

Phụ thuộc đi từ composition → feature → shared primitive; feature dùng public service của nhau, không đưa entity ra client. `report`, `budget`, `export` và learner của `recognition` truy vấn trực tiếp bảng `expenses`; đổi schema expense phải xét các consumer này. `expense` chỉ gọi `ExpenseSuggestionLinkService` và `LearnerService` của `recognition`; `recognition` đọc danh mục qua `CategoryService`.

### Luồng lưu khoản chi

1. Client (Expo) giữ ảnh local và form; upload diễn ra trong thao tác lưu.
2. Nếu có ảnh: `POST /media` reserve → `PUT /media/:id/content` raw bytes. Server kiểm owner, byte length, signature, ghi storage và đánh dấu `ready`.
3. `POST /expenses` với `idempotencyKey`. Server kiểm tiền, thời gian, danh mục, media `ready`. Client giữ cùng key khi retry với nội dung không đổi.
   Khi có gợi ý từ ảnh, request kèm `inferenceId`, `imageType`, `personalChoiceId`, `placeKey`, `merchantKey`, `fieldProvenance`: server kiểm `inferenceId`/`personalChoiceId` thuộc user, chuẩn hóa lại `merchantKey`, validate `placeKey` và provenance, suy ra `fieldSources`, đặt `source = recognition` khi có `inferenceId`.
4. Sau commit (create, update, delete), `ExpenseService` gọi learner với dữ liệu đã chuẩn hóa; lỗi learner chỉ được log, không ảnh hưởng kết quả lưu.
5. Chỉ báo đã lưu sau response thành công; upload thành công chưa phải đã lưu. Sau đó client cập nhật nhật ký và tổng liên quan.

Một media có thể được dùng ở nhiều expense của cùng chủ sở hữu.

### Quy tắc

- Cùng `idempotencyKey` + cùng nội dung trả lại expense đã có (kể cả đã xóa mềm, không hồi sinh); khác nội dung → `409`.
- Update theo optimistic `version`; bản cũ nhận `409`. Xóa mềm loại khoản chi khỏi mọi tổng.
- Tiền là chuỗi số nguyên minor units ở API (58.000 VND → `"58000"`); mỗi loại tiền tổng riêng, không dùng số thực.
- Tổng ngày/tháng tính đủ dữ liệu, độc lập phân trang. Report so `[from,to)` với khoảng cùng độ dài ngay trước; tỷ lệ là `null` khi kỳ trước bằng không.
- Realtime chỉ gửi tín hiệu để client tải lại; client đọc lại trạng thái sau reconnect.

## 3. Dữ liệu

| Bảng                                                      | Nội dung chính                                                                                                                                                                                                                                                   |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`, `user_settings`                                  | Hồ sơ, timezone, currency, tùy chọn nhắc, giao diện và gợi ý từ ảnh (`suggestionsEnabled`, `ruleLearningEnabled`, `suggestionLocationEnabled`)                                                                                                                   |
| `expenses`                                                | Owner, amount/currency, `occurredAt`/timezone, category, media tùy chọn, caption/merchant/location, `fieldSources`, idempotency, version, `deletedAt`; khóa gợi ý (`inferenceId`, `imageType`, `personalChoiceId`, `placeKey`, `merchantKey`, `fieldProvenance`) |
| `decision_choices`, `expense_rules`, `expense_inferences` | Loại ảnh hệ thống, choice cá nhân, rule mặc định/learned/user, bản ghi Decision (không lưu ảnh, giữ 90 ngày)                                                                                                                                                     |
| `categories`                                              | Hệ thống (owner null) và cá nhân                                                                                                                                                                                                                                 |
| `media_assets`                                            | Storage key, MIME, bytes, trạng thái; `thumbnailKey` chưa dùng                                                                                                                                                                                                   |
| `monthly_budgets`                                         | Hạn mức theo user/tháng/currency                                                                                                                                                                                                                                 |
| `reminder_schedules`                                      | Lần chạy tiếp theo và ngày địa phương đã nhắc                                                                                                                                                                                                                    |
| `notifications`, push devices                             | Notification và thiết bị theo owner                                                                                                                                                                                                                              |
| `export_jobs`                                             | Phạm vi, status, `snapshotAt`, file key, hạn tải                                                                                                                                                                                                                 |

ID bigint là chuỗi ở API. Schema thay đổi qua migration, không bật synchronize. FK không thay cho kiểm owner, soft delete và trạng thái tài nguyên.

## 4. Vận hành và giới hạn hiện tại

- **Riêng tư:** kiểm owner ở mọi boundary; media chỉ đọc qua API có xác thực; không log ảnh, token hoặc URL có quyền truy cập. Credential provider đọc từ môi trường và validate lúc startup.
- **Job và realtime:** export claim job bằng lease trong một process; chưa có row locking nên chưa an toàn khi chạy nhiều instance. Realtime cũng chỉ hoạt động trong một process.
- **Budget:** lọc tháng theo biên ngày SQL, chưa theo timezone tài khoản như report/calendar.
- **Export:** `snapshotAt` là mốc worker chọn để lọc theo `updated_at`, không phải snapshot point-in-time. CSV không kèm ảnh.
- **Media:** chỉ kiểm signature; chưa decode, chưa giới hạn pixel, chưa tạo thumbnail; chưa có cleanup file theo `expiresAt`.
- **Storage:** chỉ có local storage; chưa có adapter S3-compatible và quy trình restore.

## 5. Quyết định kỹ thuật

| Quyết định                             | Lý do và giới hạn                                                  |
| -------------------------------------- | ------------------------------------------------------------------ |
| Modular monolith + PostgreSQL          | Ít vận hành; scale nhiều instance cần claim job và broker realtime |
| Nhập tay không phụ thuộc AI            | Lưu khoản chi không chờ provider; gợi ý không tự sửa khoản đã lưu  |
| Private storage sau API                | Kiểm quyền tập trung ở API; mọi lượt đọc ảnh đi qua server         |
| Tổng hợp trực tiếp từ `expenses`       | Sửa/xóa phản ánh ngay vào tổng; chi phí truy vấn tăng theo dữ liệu |
| Media tái sử dụng trong cùng tài khoản | Không upload lại ảnh đã có; cleanup phải kiểm mọi tham chiếu       |

## 6. Tham chiếu

- [Yêu cầu nghiệp vụ](../business-requirements.md), [gợi ý chi tiêu từ ảnh](./03-photo-expense-suggestion.md).
- Source: [expense](../../apps/server/src/modules/expense/service.ts), [media](../../apps/server/src/modules/media/service.ts), [report](../../apps/server/src/modules/report/service.ts), [budget](../../apps/server/src/modules/budget/service.ts), [export](../../apps/server/src/modules/export/service.ts), [Expo capture review](../../apps/expo/features/expense/screens/capture-review-screen.tsx).
