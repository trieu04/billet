# Technical Design — Capture và hiển thị ảnh trên mobile

| Thông tin  | Giá trị                                                                      |
| ---------- | ---------------------------------------------------------------------------- |
| Phạm vi    | Luồng capture và quy tắc hiển thị ảnh trên native iOS/Android và Expo legacy |
| Trạng thái | Đề xuất                                                                      |

## 1. Tổng quan

### Bối cảnh

Ảnh lưu khoảnh khắc; thông tin khoản chi bổ sung ngữ cảnh. MVP ưu tiên nhập tiền thủ công, preview ngay và hành động **Use photo** rõ ràng. Nhận diện ảnh là phần mở rộng, không tạo bước chờ bắt buộc trước nhập hoặc lưu.

Tài liệu là contract trải nghiệm cho native iOS/Android và Expo legacy, không khẳng định các client đã có đầy đủ hành vi. [Yêu cầu nghiệp vụ](../business-requirements.md) giữ ưu tiên sản phẩm; [backend](./01-backend.md) mô tả boundary lưu dữ liệu.

### Mục tiêu và phạm vi

Capture phải cho phản hồi ngay bằng preview local, giữ quyền kiểm soát ảnh cho người dùng và cho phép hoàn tất nhập tay khi upload hoặc AI lỗi. Thiết kế xác định luồng draft, khung hiển thị, crop và bảo vệ dữ liệu người dùng; không thiết kế camera engine, image processing server hoặc thuật toán nhận diện.

## 2. Thiết kế

### Kiến trúc

| Thành phần         | Trách nhiệm                                                                                 |
| ------------------ | ------------------------------------------------------------------------------------------- |
| Camera/picker      | Trả file local và trạng thái quyền; chưa upload hoặc tạo expense                            |
| Capture review     | Hiển thị preview, Retake và Use photo; chỉ xác nhận ảnh thuộc draft hiện tại                |
| Expense draft      | Sở hữu amount, thời gian, caption/category, media generation và trạng thái manual edit      |
| Media client       | Prepare/reserve/upload ảnh sau Use photo, giữ retry và loại callback của generation cũ      |
| Expense client     | Chỉ báo đã lưu sau khi API xác nhận; tải lại dữ liệu tổng hợp liên quan                     |
| Recognition client | Chạy tùy chọn sau Use photo, trả candidate; không có quyền ghi đè draft hoặc expense đã lưu |

Ảnh preview dùng URI local để không phụ thuộc mạng. Media upload và recognition giao tiếp qua public API của backend; UI không truy cập storage key hoặc provider trực tiếp.

### Luồng xử lý

1. Chụp hoặc chọn ảnh và mở preview bằng file cục bộ.
2. Cho Retake và Use photo. Hủy/chụp lại trước Use photo không upload, gọi model hoặc tạo expense.
3. Sau Use photo, mở form, focus amount và bàn phím số. Có thể prepare/upload song song với nhập nếu client hỗ trợ; Expo hiện upload trong thao tác lưu.
4. Lưu khi amount/thời gian hợp lệ và media đã ready nếu có ảnh. AI không phải điều kiện lưu. Chưa có contract lưu expense tham chiếu media pending.
5. Chỉ báo đã lưu khi API xác nhận. Upload lỗi giữ draft để retry; bỏ ảnh và lưu nhập tay phải là lựa chọn rõ ràng.

### Quy tắc và trạng thái

- Amount, thời gian hợp lệ và ảnh đã chấp nhận là dữ liệu có thẩm quyền của draft. Kết quả máy đến muộn không ghi đè dữ liệu người dùng hoặc PATCH expense đã lưu.
- Mỗi Retake tạo generation mới; callback upload/AI của generation cũ bị bỏ. Save, logout hoặc rời form kết thúc lượt nhận diện hiện tại.
- Bắt đầu sửa, xóa hoặc chọn giá trị sẽ khóa autofill toàn draft; chỉ focus không khóa. Kết quả sau đó chỉ là gợi ý người dùng phải chọn.
- Gợi ý phải giải thích nguồn và độ tin cậy; không suy đoán amount không giới hạn từ ảnh. Chỉ giá trị người dùng xác nhận mới được dùng để học, và lịch sử cũ phải giảm trọng số khi giá thay đổi.
- Upload thành công chưa có nghĩa expense đã lưu. Nếu upload lỗi, UI không được âm thầm bỏ ảnh đã được Use photo.
- Crop chỉ diễn ra trong viewport bằng `cover`; source upload không bị cắt để vừa card. Nếu client nén trước upload, bản server giữ là bản đã nén, không phải camera original; xem [xử lý ảnh](./03-image-processing.md).

#### Khung ảnh

| Bề mặt         | Khung     | Trình bày                                                          |
| -------------- | --------- | ------------------------------------------------------------------ |
| Camera         | Dọc 3:4   | Sensor 4:3 trình bày theo chiều dọc                                |
| Capture review | Dọc 3:4   | Hero toàn chiều rộng; caption và timestamp trên ảnh                |
| Journal        | Dọc 3:4   | Card 220 pt trong một shelf ngang/ngày; lộ một phần card tiếp theo |
| Expense detail | Dọc 3:4   | Hero cùng crop với review/journal                                  |
| Calendar       | Vuông 1:1 | Thumbnail; mở ảnh dọc từ tổng hợp ngày                             |

| Source     | Khung đích | Diện tích còn thấy | Phần bỏ ở mỗi cạnh  |
| ---------- | ---------- | ------------------ | ------------------- |
| Dọc 3:4    | Dọc 3:4    | 100%               | Không               |
| Vuông 1:1  | Dọc 3:4    | 75%                | Trái/phải 12,5%     |
| Ngang 4:3  | Dọc 3:4    | 56,25%             | Trái/phải 21,875%   |
| Ngang 16:9 | Dọc 3:4    | 42,1875%           | Trái/phải 28,90625% |
| Dọc 3:4    | Vuông 1:1  | 75%                | Trên/dưới 12,5%     |

Dùng crop giữa cho tới khi có contract focal point. Mở rộng drag-to-position cần lưu tọa độ chuẩn hóa theo media, không sửa file gốc; preview phải cho thấy đúng khung sẽ lưu/hiển thị.

#### Tương tác

- Mỗi ngày là một section dọc có shelf ảnh ngang. Tổng ngày đứng cố định trên shelf, không thay theo vị trí carousel.
- Amount/category là form control dưới ảnh. Caption nằm trên ảnh và chuyển thành editor khi chạm.
- Caption badge có touch target tối thiểu 44 pt, thu gọn hai dòng và giới hạn biên tập 120 ký tự trong luồng này. Đây là giới hạn UI, không thay contract API caption hiện tại.
- Khoản không ảnh dùng receipt illustration cùng hình học 3:4 để tránh nhảy layout khi tải ảnh hoặc lỗi.
- Lỗi upload/nhận diện có trạng thái rõ, giữ dữ liệu đang nhập và đường nhập tay. Không dùng loading toàn màn hình cho AI.

## 3. Contract và dữ liệu

### API / Event

Capture dùng media và expense contract do [backend](./01-backend.md) sở hữu. Client reserve/upload media sau Use photo; expense chỉ tham chiếu media cùng chủ sở hữu ở trạng thái `ready`. Recognition là request riêng và không nằm trong điều kiện thành công của create expense.

Client phải xử lý rõ các boundary: permission denied, prepare/upload failure, media chưa ready, create expense failure, retry idempotent và response đến sau khi generation thay đổi. Contract hiện không hỗ trợ lưu expense với media pending hoặc tự gỡ media khi create lỗi.

### Dữ liệu

Draft giữ local URI, media generation, trạng thái prepare/upload, dữ liệu form và cờ khóa autofill. Đây là state tạm thời của client, không phải bản ghi expense. Khi create thành công, server response là nguồn xác nhận; draft có thể được xóa sau khi dữ liệu cần thiết đã cập nhật hoặc tải lại.

Nếu bổ sung focal point, lưu tọa độ chuẩn hóa gắn với media/expense và version contract để mọi bề mặt dùng cùng crop. Không ghi crop trực tiếp vào source.

## 4. Vận hành

- Preview local và nhập tiền không chờ upload hoặc provider. Theo dõi riêng thời gian Use photo → form usable, media ready và save confirmed.
- File tạm phải được dọn sau save/hủy và không rò sang tài khoản khác; cache ảnh xác thực phải được cô lập theo user và xóa khi logout.
- Không log ảnh, caption, amount, token hoặc URL có quyền truy cập. Permission camera/photos chỉ yêu cầu khi người dùng kích hoạt hành động liên quan.
- UI phải có label/role phù hợp, touch target tối thiểu 44 pt, readable contrast và không dựa duy nhất vào màu để biểu thị lỗi/trạng thái.

## 5. Quyết định kỹ thuật

| Quyết định                            | Lý do và giới hạn                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------- |
| Preview local trước Use photo         | Phản hồi tức thì và hủy không tạo side effect; file local cần lifecycle rõ ràng               |
| Nhập tay không phụ thuộc AI           | Giữ capture hoàn tất khi provider chậm/lỗi; gợi ý đến muộn không tự ghi đè                    |
| Source không bị crop theo card        | Một ảnh phục vụ nhiều viewport; center crop có thể mất nội dung cho ảnh ngang                 |
| Media phải ready trước create expense | Giữ contract backend đơn giản và tránh expense trỏ media pending; save có thể phải chờ upload |
| Bỏ ảnh là lựa chọn rõ ràng            | Không làm mất ngữ cảnh người dùng đã xác nhận; thêm một nhánh xử lý lỗi trong UI              |

## 6. Kiểm chứng và triển khai

### Kiểm chứng

Kiểm trên từng client phát hành: camera/picker và từ chối quyền; preview/Retake/Use photo; focus nhập tiền; upload chậm/lỗi và retry; save khi AI lỗi; kết quả đến sau manual edit/retake/save; ảnh ngang/dọc/vuông; calendar crop; khoản không ảnh; caption dài và accessibility. Đây là kế hoạch nghiệm thu, không phải kết quả test đã chạy trong thay đổi tài liệu.

### Triển khai

Triển khai theo từng client sau feature flag hoặc release boundary riêng: preview/Retake/Use photo → draft và upload recovery → journal/detail/calendar crop → recognition suggestion. Mỗi client chỉ được đánh dấu hoàn tất sau khi chạy kịch bản kiểm chứng trên thiết bị hoặc simulator phù hợp. Rollback recognition không được làm mất luồng nhập tay; rollback image processing vẫn phải đọc được media source do phiên bản trước tạo.

## 7. Vấn đề chưa chốt

| Vấn đề                                             | Điều kiện giải quyết                                                                                                   |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Mức hoàn thiện khác nhau giữa iOS, Android và Expo | Đối chiếu implementation và chạy nghiệm thu riêng cho từng client trước khi đổi trạng thái tài liệu                    |
| Center crop có thể mất nội dung ảnh ngang          | Chỉ thêm focal point/drag-to-position sau khi có contract dữ liệu và kiểm chứng preview nhất quán                      |
| Upload có thể chặn save                            | Đo thời gian prepare/upload trên thiết bị thật; chỉ đổi sang media pending khi có contract backend và recovery rõ ràng |
| Giới hạn caption UI khác API                       | Chốt giới hạn sản phẩm hoặc giữ validation client có thông báo rõ, không trình bày 120 ký tự như giới hạn server       |

## 8. Tham chiếu

- [Yêu cầu nghiệp vụ](../business-requirements.md), [backend](./01-backend.md).
- [Xử lý ảnh đa mục đích](./03-image-processing.md), [nhận diện chi tiêu từ ảnh](./04-expense-image-recognition.md).
- [Expo capture review](../../apps/expo/features/expense/screens/capture-review-screen.tsx), [Expo authenticated image](../../apps/expo/features/api/authenticated-image.tsx).
