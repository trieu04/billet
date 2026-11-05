# Implementation Plan — Gợi ý chi tiêu từ ảnh

| Thông tin  | Giá trị                                                                                        |
| ---------- | ---------------------------------------------------------------------------------------------- |
| Thiết kế   | [Technical Design — Gợi ý chi tiêu từ ảnh](../technical-design/03-photo-expense-suggestion.md) |
| Phạm vi    | `apps/server` (module `recognition`, `expense`, `user`, `export`), `apps/expo`; model native   |
| Trạng thái | Kế hoạch; chưa triển khai                                                                      |
| Cập nhật   | 2026-11-03                                                                                     |
| Issue      | [DEV-48](https://linear.app/devtvn/issue/DEV-48) (thiết kế); issue triển khai đề xuất ở mục 4  |

## 1. Nguyên tắc

Tính năng có hai mức: `features.suggestions` bật/tắt cả lượt gợi ý (OCR, rule, Decision); `features.decision` chỉ bật/tắt gửi ảnh và gọi provider. `EXPENSE_DECISION_PROVIDER=disabled` chỉ đặt `features.decision = false`, OCR và rule vẫn chạy.

- Server đi trước client: contract (OpenAPI) ổn định trước khi Expo tiêu thụ. Expo có thể bắt đầu các phần thuần TS (parser, merge, rule evaluator) song song với giai đoạn server vì không phụ thuộc API.
- Migration theo quy tắc của `apps/server/AGENTS.md`: mỗi thay đổi schema đã chia sẻ là một migration mới; gộp migration local chưa commit khi schema còn thay đổi.
- Ngưỡng, tham số nén và latency trong thiết kế là mục tiêu; chỉ chốt sau benchmark (giai đoạn 2) và đo thiết bị (giai đoạn 6).

## 2. Hiện trạng cần thay đổi

| Khu vực                 | Hiện trạng                                                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modules/recognition`   | Controller/service job nền poll 5 s, entity `RecognitionJobEntity`, `RecognitionQuotaGuard`, provider `google-ai-studio` và `disabled`                                                      |
| `modules/expense`       | `recognitionJobId` trong DTO, entity, response; `ExpenseService` gọi `RecognitionService.assertAccepted`; `source = recognition` khi có job; `fieldSources: Record<string, string>`         |
| `modules/export`        | `JobStatus` import từ `recognition/entities/recognition-job.entity`                                                                                                                         |
| `configs`               | `environment.ts`, `app.config.ts` (`recognitionConfig`) đọc `EXPENSE_RECOGNITION_*`; `environment.spec.ts`                                                                                  |
| Khác (server)           | `app.module.ts`, `database/data-source.ts`, `test/api-contracts.e2e-spec.ts`, `README.md`, `.env.example`                                                                                   |
| Client                  | `recognitionJobId` trong `apps/expo/features/api/types.ts` và test, `apps/ios/Billet/Core/Models.swift` + test, `apps/android/.../core/model/Models.kt`                                     |
| Dữ liệu mẫu và tài liệu | `data/sample/seed.sql` (`DELETE FROM recognition_jobs`), `data/sample/README.md`, `docs/technical-design/01-backend.md`                                                                     |
| Expo                    | Expo SDK 58, chạy Expo Go/web; chưa có `expo-dev-client`, `expo-image-manipulator`, `expo-location`; luồng chụp ở `features/expense/screens/quick-capture-screen.tsx` và `capture-flow.tsx` |

## 3. Các giai đoạn

### Giai đoạn 1 — Gỡ `recognition-jobs` (server + model client)

Mục tiêu: xóa đường job cũ, không thay đổi hành vi nhập tay.

1. Chuyển enum `JobStatus` sang `modules/export/entities` (hoặc `export/constants.ts`); cập nhật import trong `export/service.ts`, `export-job.entity.ts`.
2. Xóa `RecognitionController`, `RecognitionService` (worker), `RecognitionJobEntity`, `RecognitionQuotaGuard`, `RecognitionRateLimitError`, DTO và spec liên quan. Tạm giữ `RecognitionModule` rỗng nếu cần để giai đoạn 3 thêm vào; nếu không, gỡ khỏi `app.module.ts` và `data-source.ts`.
3. `expense`: bỏ `recognitionJobId` khỏi DTO, entity, response, `ExpenseService` (cả create và update) và phụ thuộc `RecognitionService`. Giữ enum `ExpenseSource.Recognition`.
4. Migration `remove-recognition-jobs`: drop FK + cột `expenses.recognition_job_id`, drop bảng `recognition_jobs`; giữ type `job_status_enum`. `down` tạo lại bảng/cột (không khôi phục dữ liệu).
5. Config: xóa `EXPENSE_RECOGNITION_*` khỏi `environment.ts`, `app.config.ts`, spec, `.env.example`, README.
6. Client: bỏ `recognitionJobId` khỏi Expo types/test, Swift `Models.swift` + `BilletTests.swift`, Kotlin `Models.kt`. Server không trả trường này nữa; các model đang optional nên client cũ không lỗi.
7. Dữ liệu mẫu: bỏ dòng `recognition_jobs` trong `seed.sql`, cập nhật `data/sample/README.md`; tài khoản `devt` giữ nguyên.

Kiểm tra: chạy migration trên PostgreSQL tạm có dữ liệu cũ (expense có `recognition_job_id`, export job đang chạy) rồi chạy export; `pnpm --filter @billet/server lint typecheck test test:e2e build`; build/test iOS và Android cho thay đổi model; `pnpm --dir apps/expo test typecheck`.

### Giai đoạn 2 — Provider interface, adapter, benchmark (server)

Mục tiêu: chọn được provider mặc định bằng số liệu trước khi xây API.

1. `modules/recognition/interface.ts`: `DecisionProvider`, `DecisionInput`, `DecisionOutput`, `DecisionChoice`, token `DECISION_PROVIDER`; lỗi chuẩn hóa (`timeout`, `provider_rate_limited`, `provider_error`, `invalid_output`).
2. `providers/`: `disabled`, `fake` (cấu hình được độ trễ/output cho test), `google-ai-studio` viết lại thành Decision adapter (giữ key pool, bỏ quota guard), `openai-compatible` (dùng `EXPENSE_DECISION_BASE_URL`). Các adapter span-02, d1-ultra, jev, decider, gpt-luna-decision thêm dần theo thứ tự benchmark ưu tiên; mỗi adapter có spec mock HTTP, kiểm tra hủy qua `AbortSignal` và ánh xạ 429.
3. Prompt/schema dùng chung: dựng danh sách `ref` → nhãn, yêu cầu JSON output có `confidence`, cho phép `null` với `category` và `personal`.
4. Config mới trong `environment.ts`/`app.config.ts`: `EXPENSE_DECISION_PROVIDER` (mặc định `disabled`), `EXPENSE_DECISION_MODEL`, `EXPENSE_DECISION_BASE_URL`, `EXPENSE_DECISION_API_KEY`, `EXPENSE_DECISION_GOOGLE_API_KEYS`, `EXPENSE_DECISION_TIMEOUT_MS` (5000), `EXPENSE_DECISION_MAX_IMAGE_BYTES` (1 MB); validate khi khởi động, cập nhật `.env.example`.
5. Benchmark CLI `pnpm --dir apps/server bench:decision --provider <id> --dataset <dir>`: đọc tập ảnh có nhãn ngoài repo, nén bằng cùng tham số client (sharp hoặc tương đương chỉ là devDependency), xuất accuracy/macro-F1, độ chính xác choice cá nhân, calibration, latency P50/P95, chi phí/ảnh. Không commit dataset hay kết quả có dữ liệu cá nhân.

Kết quả: báo cáo benchmark gắn vào issue, chốt provider mặc định và ngưỡng khởi đầu cho Decision category. Chỉ chọn provider có điều khoản không lưu/không huấn luyện (NFR-07).

### Giai đoạn 3 — Dữ liệu, Decision API, cấu hình gợi ý (server)

1. Entity + migration `add-expense-suggestions`: `decision_choices` (seed 8 loại ảnh với `label`/`description`), `expense_rules` (unique `(userId, conditionsHash)`), `expense_inferences` (unique `(userId, clientRequestId)`), cột mới trên `expenses` (`inferenceId`, `imageType`, `personalChoiceId`, `placeKey`, `merchantKey`, `fieldProvenance`) và index theo ba khóa học. Thêm `suggestionsEnabled`, `ruleLearningEnabled`, `suggestionLocationEnabled` vào `user_settings`.
2. Choice set builder: đọc danh mục qua public service của `category`, choice cá nhân tối đa 20 (ưu tiên cùng `placeKey`, rồi `lastSelectedAt`), ánh xạ ID ↔ `ref`, tính `choiceSetVersion`; cache theo user, invalid khi danh mục/choice đổi.
3. `POST /expense-inferences` (multipart): validate JPEG (magic bytes) và kích thước (`413`/`415`/`400`), kiểm tra `suggestionsEnabled` (→ `disabled`), idempotency theo `clientRequestId` (mỗi cặp `(userId, clientRequestId)` chỉ lưu và trả một kết quả; request trùng đồng thời có thể gọi provider nhiều lần, không cần giữ chỗ trước vì client chỉ tạo một ID cho mỗi lượt và không retry), deadline `min(X-Billet-Deadline-Ms, EXPENSE_DECISION_TIMEOUT_MS)`, bỏ qua provider khi còn < 1 s, hủy provider khi client ngắt kết nối (`req.on('close')` → `AbortController`), validate output trong set, ghi inference ngoài transaction chờ provider. Lỗi provider luôn `200` với `status: unavailable` + `reason`.
4. `GET /suggestion-config`: loại ảnh, choice cá nhân và rule đang bật, rule mặc định, ngưỡng, `decisionImage`, `features`; ETag theo hash nội dung, trả `304`.
5. CRUD `/decision-choices`, `/expense-rules`: `POST`, `PATCH /:id` với `version`, `DELETE /:id`; mục hệ thống chỉ đọc; truy cập chéo trả `404`. Sửa mục `learned` chuyển `origin = user`; xóa mục `learned` đặt `suppressedUntil` +90 ngày.
6. `PATCH /profile/settings`: ba trường mới trong `UpdateSettingsDto` và response.
7. `expense` create/update: nhận `inferenceId` (thuộc user), `imageType`, `personalChoiceId`, `placeKey` (geohash 7 ký tự), `merchantKey`, `fieldProvenance`; suy ra `fieldSources`; `source = recognition` khi có `inferenceId`.
8. Learner (`recognition/services/learner.service.ts`, public qua module): `expense` gọi sau commit với dữ liệu đã chuẩn hóa, best-effort, lỗi chỉ log. Cài khóa học, decay 60 ngày, ngưỡng ≥ 3 expense và ≥ 60%, tạo choice `learned`, hạ/tắt rule, giới hạn 100 choice/500 rule, tôn trọng `ruleLearningEnabled`, `suppressedUntil` và mục `user`. Gọi cả khi update/xóa expense.
9. Vận hành: job dọn `expense_inferences` > 90 ngày; xóa tài khoản xóa choice/rule/inference; metric latency, `unavailable` theo `reason`, kích thước ảnh, usage request/token theo provider theo phút/ngày (đếm mọi lần gọi provider thực tế, kể cả request thua khi ghi trùng `clientRequestId`); không log ảnh, số tiền, `placeKey`, nhãn choice.
10. Tài liệu: OpenAPI cho mọi endpoint mới, server README, `01-backend.md` (module và luồng lưu), `.env.example`.

Kiểm tra: unit cho choice set builder, ánh xạ `ref`, learner (ngưỡng, decay, mục `user`, chặn học lại), idempotency (gồm metric khi hai request trùng cùng gọi provider); e2e với fake provider chậm 10 s (trả `unavailable: timeout` trong deadline), client ngắt kết nối hủy provider, output ngoài set, ảnh quá lớn/sai định dạng, truy cập chéo hai tài khoản, ETag `304`, create expense với `fieldProvenance` kích hoạt learner.

### Giai đoạn 4 — Logic thuần TS trên Expo (song song với giai đoạn 2–3)

Đặt trong `apps/expo/features/suggestion/` (feature mới; `expense` chỉ dùng public `index.ts`). Không phụ thuộc native nên test bằng Vitest ngay.

1. `receipt-parser.ts`: tìm tổng tiền VND (`58.000`, `58,000đ`, `TỔNG CỘNG`, `THANH TOÁN`), ngày (`dd/MM/yyyy`, `dd-MM-yy`), tên cửa hàng (dòng đầu đủ điều kiện); trả candidate kèm `confidence`. Fixture hóa đơn tiếng Việt dạng văn bản OCR.
2. `merge.ts`: `merge(draft, candidates)` thuần, thứ tự ưu tiên theo trường, ngưỡng prefill/gợi ý, khóa `locked` khi người dùng sửa, nâng cấp nguồn khi chưa khóa, ràng buộc ngày OCR (không tương lai, ≤ 30 ngày), idempotent theo `(generation, candidateId)`, sinh `fieldProvenance`.
3. `rule-evaluator.ts`: khớp rule theo `choiceId`/`imageType`/`placeKey`/`merchantKey`, tie-break (số điều kiện, `user` > `learned`, `confidence`, mới hơn).
4. `keys.ts`: geohash 7 ký tự và chuẩn hóa `merchantKey` (bỏ dấu, viết thường) — giống hệt quy tắc server; thêm test vector dùng chung cho cả hai phía.
5. Kiểu contract trong `features/api/types.ts` sinh/viết theo OpenAPI của giai đoạn 3.

### Giai đoạn 5 — Expo development build, native và tích hợp UI

1. Thêm `expo-dev-client`, `expo-image-manipulator`, `expo-location` (chỉ đọc khi đã có quyền); chuyển sang prebuild, thêm `ios/` và `android/` vào `.gitignore`; cập nhật script và `development-guide.md` (cách build dev client, Expo Go/web không có OCR).
2. Local module `modules/billet-ocr`: Swift bọc Apple Vision (`VNRecognizeTextRequest`, ngôn ngữ `vi-VN`, `en-US`), Kotlin bọc ML Kit Text Recognition v2 (Latin); API `recognize(uri): Promise<{ lines: { text, box }[] }>`; JS wrapper trả `null` khi module không có (Expo Go/web).
3. `compress.ts`: resize 1024 px, JPEG 0,6, bỏ EXIF; > 400 KB thử 0,45; vẫn vượt thì bỏ Decision. Tham số đọc từ snapshot.
4. `decision-client.ts`: multipart `POST /expense-inferences` với `AbortController`, `clientRequestId`, `X-Billet-Deadline-Ms` = ngân sách còn lại trong 8 s.
5. `snapshot-store.ts`: tải `GET /suggestion-config` lúc mở app với ETag, cache theo user (SecureStore/FileSystem), xóa khi logout.
6. `use-photo-suggestion.ts`: điều phối một lượt — tạo `generation` khi có ảnh, chạy song song OCR/nén → Decision/`placeKey` sau khi ảnh đã hiển thị, hủy khi Retake/hủy/logout, kết thúc ở save/hủy/8 s, chạy lại rule khi choice/`imageType`/`merchantKey`/`placeKey` đổi.
7. Tích hợp `quick-capture-screen.tsx` và `capture-review-screen.tsx`: tạo lượt khi camera/picker trả file, hiển thị ảnh rồi mới bắt đầu trích xuất, focus amount khi Use photo, hiển thị nguồn (“Từ hóa đơn”, “Như lần trước: …”, “Gợi ý mặc định”), gợi ý chạm để áp dụng khi đã khóa; gửi `inferenceId`, khóa học và `fieldProvenance` khi lưu. Giữ accessibility label/role cho chip nguồn và gợi ý.
8. Settings “Gợi ý tự động” trong `features/settings`: ba toggle, màn quản lý choice cá nhân và rule (sửa/tắt/xóa/tạo) gọi CRUD giai đoạn 3.

Kiểm tra: Vitest cho hook điều phối (generation cũ bị bỏ, timeout 8 s, lỗi từng nhánh), encoder; `pnpm --dir apps/expo lint typecheck test build`; chạy dev build trên iPhone và Android tầm trung.

Ghi chú triển khai (DEV-55):

- Điều phối nằm trong `features/suggestion/session.ts` (controller thuần, test bằng fake); `use-photo-suggestion.ts` chỉ nối controller vào React. Lượt được tạo ở màn chụp và chuyển sang màn review qua tham số `suggestionGeneration`.
- `suggestionsEnabled = false` (cờ `features.suggestions`) tắt cả lượt: không OCR, không rule, không gửi ảnh. `features.decision = false` chỉ bỏ Decision. Chưa có snapshot (chưa từng tải) thì không gợi ý.
- Ứng dụng không xin quyền vị trí ở đâu cả; `placeKey` chỉ có khi quyền đã được cấp sẵn và `suggestionLocationEnabled` bật.
- Expo vẫn chạy được bằng Expo Go (`start:go`); dịch vụ Expo trong Docker Compose khởi động ở chế độ Expo Go (`--go`).

### Giai đoạn 6 — Pilot nội bộ

1. Bật provider đã chọn và `features` cho tài khoản nội bộ.
2. Đo trên 4G: P50 < 5 s, P95 ≤ 8 s từ lúc có ảnh tới kết quả Decision; tỷ lệ chấp nhận/sửa theo trường và nguồn từ `fieldProvenance.outcome`; tỷ lệ `unavailable` theo `reason`.
3. Xác nhận: kết quả đến sau khi sửa không thay giá trị; provider lỗi vẫn lưu nhập tay; tắt `suggestionsEnabled` thì không có request ảnh.
4. Điều chỉnh ngưỡng và `decisionImage` qua snapshot; ghi kết quả vào issue và cập nhật trạng thái thiết kế.

Rollback: `EXPENSE_DECISION_PROVIDER=disabled` (còn OCR và rule) → tắt `features` (nhập tay như hiện tại). Không drop bảng mới.

## 4. Issue Linear đề xuất

Chưa tạo; tạo khi bắt đầu triển khai, thuộc project Billet, liên kết với DEV-48.

| Issue                                                      | Label              | Phụ thuộc      |
| ---------------------------------------------------------- | ------------------ | -------------- |
| Gỡ `recognition-jobs` và `recognitionJobId`                | `server`, `mobile` | —              |
| Decision provider interface, adapter và benchmark CLI      | `server`           | Giai đoạn 1    |
| Decision API, suggestion-config, CRUD rule/choice, learner | `server`           | Giai đoạn 2    |
| Parser, merge, rule evaluator trên Expo                    | `mobile`           | —              |
| Expo dev build, OCR module, tích hợp gợi ý và Settings     | `mobile`           | Giai đoạn 3, 4 |
| Pilot nội bộ và tinh chỉnh ngưỡng                          | `server`, `mobile` | Giai đoạn 5    |

## 5. Rủi ro và câu hỏi mở

- **Provider:** chưa có số liệu benchmark; nếu không provider nào đạt P95 với timeout 5 s, giữ OCR + rule và tắt Decision.
- **Dev build:** chuyển khỏi Expo Go ảnh hưởng mọi người phát triển Expo; cần hướng dẫn và cân nhắc EAS Build hay build local.
- **OCR tiếng Việt:** ML Kit Latin và Vision có thể đọc sai dấu và ký hiệu `đ`; parser phải dựa vào chữ số và từ khóa không dấu.
- **Đồng nhất khóa:** geohash và chuẩn hóa `merchantKey` phải giống nhau giữa client và server; dùng test vector chung, cân nhắc `packages/*` nếu native iOS/Android cũng triển khai (theo quy tắc chỉ thêm package khi ≥ 2 app cần).
- **Native iOS/Android:** ngoài phạm vi kế hoạch này ngoài việc bỏ `recognitionJobId`; tái sử dụng contract khi được ưu tiên.
