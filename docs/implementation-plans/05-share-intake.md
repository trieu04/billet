# Implementation Plan — Nhận ảnh chia sẻ từ app khác

| Thông tin  | Giá trị                                                                                                                    |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Thiết kế   | [Technical Design — Nhận ảnh chia sẻ](../technical-design/05-share-intake.md)                                              |
| Phạm vi    | `apps/expo`; không đổi server, native iOS/Android, web                                                                     |
| Trạng thái | Đã triển khai local; chờ kiểm chứng thiết bị và cấu hình Apple Developer                                                   |
| Cập nhật   | 2026-11-04                                                                                                                 |
| Issue      | [DEV-58](https://linear.app/devtvn/issue/DEV-58) (thiết kế); [DEV-59](https://linear.app/devtvn/issue/DEV-59) (triển khai) |

## 1. Nguyên tắc

- Kiểm chứng rủi ro nền tảng trước: giai đoạn 0 chạy trên máy thật với app ngân hàng thật, trước khi viết logic.
- Logic thuần (lọc payload, TTL, quyết định xung đột) tách khỏi native để test bằng Vitest.
- Expo Go, web và Docker Compose phải tiếp tục chạy ở mọi giai đoạn.
- Sau mỗi thay đổi `app.json`, chạy lại `pnpm prebuild`. `apps/expo/ios` và `apps/expo/android` là output sinh ra, không commit và không sửa tay.

## 2. Hiện trạng cần thay đổi

| Khu vực                                              | Hiện trạng                                                                                                                   |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `app.json`, `package.json`                           | Chưa có share target hay `expo-share-intent`; đã có scheme `billet`, `expo-dev-client`, `expo-image-manipulator`             |
| `app/_layout.tsx`                                    | Thứ tự provider: `SessionProvider` → `SuggestionProvider` → `SessionGuard` → `BiometricLockProvider` → `CaptureFlowProvider` |
| `features/auth/session.tsx`                          | `SessionGuard` trả `null` khi chưa có token, nên mọi thứ bên trong bị unmount lúc chưa đăng nhập                             |
| `features/settings/biometric-lock.tsx`               | Con vẫn render dưới lớp khóa; context chưa expose `locked`                                                                   |
| `features/expense/screens/capture-review-screen.tsx` | Thoát qua `router.dismissTo('/capture')`, giả định `capture` nằm dưới trong stack; `dirty` và `locked` là state cục bộ       |
| `features/suggestion/receipt-parser.ts`              | Đã loại dòng `stk`; `receipt-fixtures.ts` chưa có biên lai ngân hàng                                                         |

## 3. Các giai đoạn

### Giai đoạn 0 — Spike trên thiết bị

Mục tiêu: chốt adapter và hành vi iOS. Làm trên nhánh thử, bỏ code sau khi có kết quả.

1. Cài `expo-share-intent@9`, cấu hình chỉ nhận một ảnh, `pnpm prebuild --clean`, build lên iPhone và máy Android thật.
2. Xác nhận trên iOS 26/27: extension có mở được app không, bằng API nào, và có warning gì. Đọc source plugin để biết có dùng responder chain không.
3. Xác nhận Android: `singleTask`, giao lại intent từ Recents, và `resetShareIntent` có chặn được không.
4. Xác nhận plugin chạy cùng `modules/billet-ocr`, `expo-router` (có cần `app/+native-intent.tsx` để link của adapter không rơi vào route không khớp) và Expo Go.
5. Thử chia sẻ từ các app ngân hàng người dùng hay dùng; ghi lại dạng dữ liệu (ảnh, PDF, link, văn bản) và MIME.

Tiêu chí ra: chốt ba vấn đề đầu ở mục 7 của thiết kế. Nếu thư viện không đạt thì đổi sang local module và cập nhật thiết kế trước khi sang giai đoạn 1. Nếu đa số app ngân hàng không chia sẻ ảnh thì dừng lại để xem lại phạm vi.

### Giai đoạn 1 — Share inbox (`features/share`)

1. `share-model.ts`: hàm thuần `classifyPayload`, `isExpired` (24 giờ), `parseManifest`, và `decideArrival(state)` trả `open`, `replace`, `ask` hoặc `defer`. Có test kèm theo.
2. `normalize.ts`: giải mã, `longEdgeResize` từ `@/features/suggestion`, JPEG 0,9, 3000 px.
3. `inbox-storage.ts`: ghi file trước, ghi manifest sau bằng rename để không có manifest trỏ tới file dở; dọn file mồ côi khi khởi động.
4. `share-inbox-provider.tsx`: nạp adapter có điều kiện, gọi `resetShareIntent` sau khi ghi slot, expose `useShareInbox` và `completeSharedImage`. Xóa slot khi token chuyển từ có sang không; provider phải nằm ngoài `SessionGuard` để phát hiện được chuyển đổi này và nhận được ảnh khi chưa đăng nhập.
5. `index.ts`: chỉ export public API.
6. `app.json`: thêm plugin, App Group, `launchMode`. Gắn provider trong `app/_layout.tsx`, ngay dưới `SessionProvider`.

Kiểm tra: Vitest cho `features/share`; build dev; chia sẻ ảnh và xem slot được tạo; `start:go` vẫn chạy.

### Giai đoạn 2 — Đưa ảnh vào review

1. `features/settings/biometric-lock.tsx`: expose `locked`, kể cả trạng thái khóa ngay lúc khởi động để không có khoảng hở ảnh hiện dưới lớp khóa.
2. `features/expense/shared-capture.tsx`: coordinator gắn trong `CaptureFlowProvider`; khi có `pending`, có token và không khóa thì gọi `prepareSuggestion` và mở `/review`. Ghi `openedId` để không mở lặp.
3. `capture-flow.tsx`: expose trạng thái bản nháp (`idle`, `clean`, `dirty`, `saving`) do review báo lên, làm đầu vào cho `decideArrival`.
4. `capture-review-screen.tsx`:
   - Nhận `source` và `sharedImageId`; gọi `completeSharedImage` khi lưu xong hoặc xác nhận bỏ.
   - Sửa đích thoát: `router.replace('/capture')` khi đổi ảnh và `router.dismissTo('/')` khi rời đi, cả trong nhánh `usePreventRemove`.
   - Đổi nhãn `Chụp lại` thành `Đổi ảnh`.
   - Hộp thoại `Thay bằng ảnh vừa chia sẻ?`; khi `dirty`, không để `usePreventRemove` hiện thêm hộp thoại thứ hai.
   - Kiểm tra người dùng có sửa được thời gian trước khi lưu không. Grep hiện chưa thấy control sửa thời gian trên màn hình này; nếu đúng là thiếu thì thêm, vì biên lai cũ phụ thuộc vào nó.
5. Đối chiếu lại `dismissTo` khi màn hình đích không có trong stack, trên cả hai nền tảng.

Kiểm tra: toàn bộ kịch bản ở mục 6 của thiết kế trên iOS và Android, sáng và tối. Kiểm tra VoiceOver/TalkBack cho hộp thoại và trạng thái lỗi.

### Giai đoạn 3 — Gợi ý từ biên lai ngân hàng

Có thể làm song song với giai đoạn 2 vì không phụ thuộc phần native.

1. Thêm vào `receipt-fixtures.ts` biên lai ngân hàng đã khử định danh: đủ bố cục phổ biến, có số tài khoản, số dư, mã giao dịch và phí.
2. Sửa `receipt-parser.ts` nếu fixture cho thấy nhận nhầm số dư, số tài khoản hoặc mã giao dịch thành số tiền. Ưu tiên không gợi ý hơn gợi ý sai.
3. Chạy benchmark thiết kế 03 với nhóm ảnh này nếu có thay đổi đáng kể.
4. Thực hiện quyết định về Decision provider ở mục 7 của thiết kế, sau khi chủ sản phẩm chốt.

Kiểm tra: `pnpm --dir apps/expo test`; không đưa ảnh hay số liệu thật của người dùng vào repository.

### Giai đoạn 4 — Hoàn thiện và phát hành

1. Cập nhật `docs/development-guide.md`: App Group, cách thử chia sẻ trên simulator và máy thật, Expo Go không hỗ trợ.
2. Bật App Group trên Apple Developer; kiểm tra build release và tên Billet trong share sheet.
3. Cập nhật thiết kế 05 theo thực tế, đổi trạng thái trong `docs/index.md`.
4. Đo thời gian từ lúc chọn Billet tới khi thấy ảnh trên máy tầm trung.

Kiểm tra: `pnpm exec oxfmt --check <changed-files>`, `pnpm --dir apps/expo lint`, `typecheck`, `test`, `build`; test tay trên build release cả hai nền tảng.

## 4. Issue đề xuất

Tất cả dùng label `mobile`.

| Issue                              | Nội dung    | Phụ thuộc   |
| ---------------------------------- | ----------- | ----------- |
| Spike share intent trên Expo       | Giai đoạn 0 | —           |
| Share inbox và cấu hình native     | Giai đoạn 1 | Spike       |
| Mở review từ ảnh được chia sẻ      | Giai đoạn 2 | Share inbox |
| Gợi ý từ biên lai ngân hàng        | Giai đoạn 3 | —           |
| Tài liệu và phát hành share intake | Giai đoạn 4 | Mở review   |

## 5. Rủi ro

| Rủi ro                                                                    | Giảm thiểu                                                                  |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| iOS không cho extension mở app theo cách chính thức                       | Slot độc lập với việc mở app; có phương án `Mở Billet`; quyết ở giai đoạn 0 |
| Bản iOS mới làm hỏng thư viện                                             | Lớp adapter mỏng, phương án dự phòng là local module                        |
| App ngân hàng không chia sẻ dưới dạng ảnh                                 | Thử ngay ở giai đoạn 0, trước khi đầu tư                                    |
| Parser nhận nhầm số dư thành số tiền                                      | Fixture riêng ở giai đoạn 3; người dùng luôn xác nhận trước khi lưu         |
| Biên lai nhạy cảm còn nằm lại trên máy                                    | Slot có TTL, xóa khi đăng xuất, và không log                                |
| `android` native và Expo cùng `app.billet.mobile` nên không cài song song | Gỡ bản native khi test trên cùng thiết bị                                   |
