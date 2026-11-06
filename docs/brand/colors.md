# Bảng màu Billet

Trạng thái: đề xuất, chưa áp dụng vào app. Cập nhật: 2026-11-07. Picker: [color-picker.html](./color-picker.html). Logo: [logo.md](./logo.md).

## Vấn đề hiện tại

Ba nền tảng đang dùng ba bộ màu khác nhau, và không bộ nào khớp với logo:

| Vai trò       | Logo      | Web (`apps/web/src/index.css`) | iOS (`apps/ios/Billet/Core/AppTheme.swift`) |
| ------------- | --------- | ------------------------------ | ------------------------------------------- |
| Nhấn (san hô) | `#E3705A` | `#EF764F`                      | `#8A4A2E` (accent), `#F4B89C` (peach)       |
| Chữ chính     | `#2A2521` | `#251C17`                      | hệ thống (`.label`)                         |
| Nền trang     | `#FFFCF7` | `#F7F2EA`                      | `#F5F0E8`                                   |

Màu danh mục trên web (`CATEGORY_COLORS`) là tám mã pastel chọn tay, có độ sáng và độ rực lệch nhau. Seed danh mục trên server dùng thêm một bộ màu khác.

## Đề xuất

Một nguồn duy nhất, ba lớp:

1. **Màu thương hiệu (4):** Kem `#FFFCF7`, Cát `#EFE2CF`, San hô `#E3705A`, Mực `#2A2521`. Đây là các màu của logo và được ghim nguyên mã vào thang màu.
2. **Thang màu (11 bậc, 50–950):** sinh trong OKLCH với cùng bậc độ sáng cho mọi thang, nên bậc `700` của san hô, thành công, cảnh báo và lỗi có độ đậm tương đương. Thang trung tính lấy sắc ấm từ Cát và Mực. Ba màu trạng thái lấy độ rực theo san hô để cùng họ với thương hiệu.
3. **Token ngữ nghĩa:** app chỉ dùng token, không dùng mã màu hay bậc thang trực tiếp. Mỗi token có giá trị cho chế độ sáng và tối.

### Token đề xuất

| Token                                      | Sáng        | Tối         | Dùng cho                                      |
| ------------------------------------------ | ----------- | ----------- | --------------------------------------------- |
| `canvas`                                   | neutral-100 | neutral-950 | Nền trang                                     |
| `surface`                                  | neutral-50  | neutral-900 | Thẻ, sheet. Sáng là Kem, tối là Mực           |
| `sunken`                                   | neutral-200 | neutral-800 | Ô nhập, khung ảnh. Sáng là Cát                |
| `line`                                     | neutral-300 | neutral-800 | Đường kẻ, viền                                |
| `text`                                     | neutral-900 | neutral-50  | Chữ chính. Sáng là Mực, tối là Kem            |
| `textSecondary`                            | neutral-600 | neutral-400 | Chữ phụ                                       |
| `textMuted`                                | neutral-500 | neutral-500 | Chú thích, placeholder (chỉ cần ≥ 3:1)        |
| `accent`                                   | coral-500   | coral-400   | Nút chính, điểm nhấn. Sáng là San hô của logo |
| `onAccent`                                 | neutral-900 | neutral-900 | Chữ trên nút chính: Mực, không dùng trắng     |
| `accentText`                               | coral-700   | coral-300   | Link, chữ san hô trên nền thường              |
| `accentSoft`                               | coral-100   | coral-800   | Nền san hô nhạt (chip đang chọn, badge)       |
| `success`, `warning`, `danger`             | \*-700      | \*-300      | Chữ và icon trạng thái                        |
| `successSoft`, `warningSoft`, `dangerSoft` | \*-100      | \*-800      | Nền toast, banner                             |

Hai lựa chọn đáng chú ý:

- **Chữ trên nút san hô là Mực, không phải trắng.** Trắng trên `#E3705A` chỉ đạt khoảng 3:1, không đủ AA cho chữ thường. Mực đạt khoảng 4.9:1, và cũng là cặp màu của logo.
- **Không dùng san hô cho lỗi.** Lỗi dùng sắc đỏ hơn (hue ~20°) để người dùng không nhầm nút chính với cảnh báo xóa.

### Màu danh mục

Tám màu danh mục dùng chung một độ sáng và độ rực trong OKLCH, mỗi màu chỉ khác sắc độ, nên không màu nào lấn át trong biểu đồ. Sắc độ mặc định lấy theo tám màu web hiện có. Chế độ tối có bộ riêng, tối và trầm hơn. Chữ trên màu danh mục luôn dùng `text`.

## Kiểm tra tương phản (giá trị mặc định)

Mọi token chữ đạt AA (≥ 4.5:1) trên `surface` và `canvas` ở cả hai chế độ; `textMuted` đạt ≥ 3:1 cho chú thích. Picker tính lại mỗi khi chỉnh.

## Bước tiếp theo

1. Chốt bảng màu trong picker, rồi ghi lại thông số ở đây.
2. Áp dụng token cho web, iOS và Android bằng mã xuất từ picker (CSS, Swift, Kotlin), thay các mã màu đang viết cứng trong component.
3. Đồng bộ màu danh mục giữa web, mobile và seed của server.
