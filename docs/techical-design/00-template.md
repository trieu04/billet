# Technical Design — [Tên chủ đề]

| Thông tin | Giá trị |
| --------- | ------- |
| Phạm vi | [App/module] |
| Trạng thái | [Đề xuất / Đang triển khai / Hiện hành / Đã thay thế] |

> **Quy ước:** Lưu tại `docs/technical-design/NN-<topic>.md`, đánh số từ `01`; `00-template.md` dành cho mẫu.
>
> Chỉ ghi thông tin cần thiết để hiểu, triển khai, kiểm chứng hoặc bảo trì thiết kế. Ưu tiên quyết định, contract và ràng buộc quan trọng; dẫn link thay vì lặp source hoặc tài liệu khác. Xóa mục không áp dụng, tránh mô tả điều hiển nhiên và không viết cho đủ mẫu.
>
> Khi triển khai hoàn tất, cập nhật tài liệu theo thiết kế thực tế; xóa kế hoạch và câu hỏi đã hết hiệu lực. Chỉ giữ thông tin rollout hoặc migration còn cần cho vận hành. Nếu tài liệu đã được thay thế, dẫn link tới tài liệu hiện hành.

## 1. Tổng quan

### Bối cảnh

[Vấn đề cần giải quyết, hành vi hiện tại và source/contract liên quan.]

### Mục tiêu và phạm vi

[Kết quả cần đạt, module và boundary chịu ảnh hưởng.]

## 2. Thiết kế

### Kiến trúc

[Thành phần, trách nhiệm, dependency và cách tích hợp. Thêm sơ đồ nếu cần.]

### Luồng xử lý

[Trigger → xử lý → kết quả; các nhánh lỗi hoặc retry quan trọng.]

### Quy tắc và trạng thái

[Invariant, state transition và các quy tắc về concurrency, idempotency mà hệ thống phải bảo đảm.]

## 3. Contract và dữ liệu

### API / Event

[Cam kết tại boundary của interface mới hoặc thay đổi: input/output, lỗi, authorization và compatibility. Dẫn link tới contract sở hữu.]

### Dữ liệu

[Ownership, schema/constraint quan trọng và lifecycle. Nếu cần migration, nêu thay đổi dữ liệu tại đây; trình tự thực hiện nằm ở phần Triển khai.]

## 4. Vận hành

[Chỉ nêu yêu cầu vận hành làm thay đổi thiết kế: performance, security, timeout, recovery, observability hoặc retention. Dẫn link tới quy tắc hoặc contract đã nêu khi cần.]

## 5. Quyết định kỹ thuật

[Chỉ ghi quyết định có đánh đổi đáng kể và lý do khó suy ra từ source. Nêu lựa chọn, lý do và giới hạn được chấp nhận; bổ sung phương án khác khi cần để hiểu lựa chọn. Dẫn link ADR nếu đã có. Có thể dùng đoạn văn hoặc bảng tùy nội dung.]

## 6. Kiểm chứng và triển khai

### Kiểm chứng

[Cách xác nhận thiết kế đáp ứng mục tiêu, invariant và contract: kịch bản nghiệm thu, test/benchmark cần thiết và bằng chứng đã có. Phân biệt dự kiến với đã kiểm chứng.]

### Triển khai

[Thứ tự rollout/migration, cách duy trì compatibility và rollback nếu cần. Dẫn link tới contract và thay đổi dữ liệu liên quan.]

## 7. Vấn đề chưa chốt

[Chỉ ghi những vấn đề ảnh hưởng đến quyết định hoặc chặn triển khai, kèm điều kiện giải quyết.]

## 8. Tham chiếu

[Link tương đối tới requirement, source, contract, thiết kế liên quan hoặc issue chưa được dẫn tại các mục trên.]