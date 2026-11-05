# Trang admin quản lý dữ liệu nhận diện chi tiêu

Issue: DEV-57. Trạng thái: đã triển khai, đang review. Xây trên phần gợi ý từ ảnh đã commit vào `main` (DEV-51 đến DEV-55, `docs/technical-design/03-photo-expense-suggestion.md`).

## Mục tiêu

Người vận hành có một trang web riêng để:

1. Theo dõi chất lượng, lỗi, độ trễ và chi phí của decision provider.
2. Tra nhật ký inference đã khử định danh.
3. Chỉnh catalog hệ thống: loại ảnh và default rule.
4. Thử trực tiếp provider đang cấu hình bằng một ảnh, không ảnh hưởng dữ liệu người dùng.

## Tiêu chí chấp nhận

### Quyền truy cập

- AC-1: Mọi route `/api/v1/admin/**` trả `401` khi không có token, `403` với user đã đăng nhập nhưng không nằm trong `ADMIN_USER_IDS`, và `403` với id nằm trong allowlist nhưng user đã bị soft delete hoặc không tồn tại.
- AC-2: `ADMIN_USER_IDS` để trống hoặc không đặt thì không ai là admin. Giá trị không phải danh sách bigint dương làm server từ chối khởi động (`validateEnvironment`).
- AC-3: Thu hồi quyền bằng cách bỏ id khỏi env rồi restart. Token cũ của user đó nhận `403` ngay sau restart vì quyền không nằm trong JWT. Thay đổi quyền qua soft delete có hiệu lực ngay ở request kế tiếp.
- AC-4: `/admin` trên web: chưa đăng nhập thì sang `/login` và quay lại `/admin` sau khi đăng nhập; không phải admin thì thấy trang "Không có quyền" và không có request dữ liệu admin nào ngoài `GET /admin/me`.

### Khử định danh

- AC-5: Response JSON của admin không bao giờ chứa: email, username, tên hiển thị, `clientRequestId`, số tiền, merchant, `merchantKey`, `placeKey`, ghi chú, media id, id expense, nhãn hoặc id của personal choice, tên hoặc id của danh mục do người dùng tạo, `ruleId`/`choiceId` trong provenance.
- AC-6: Danh tính duy nhất được trả là `userId` dạng bigint string. Danh mục hệ thống hiện `code` và tên; danh mục người dùng chỉ hiện `kind: "user"`. Personal choice chỉ hiện `selected: true` và `confidence`.
- AC-7: Test e2e gieo các chuỗi sentinel vào merchant, ghi chú, nhãn choice, tên danh mục, email, `clientRequestId` rồi khẳng định chúng không xuất hiện trong body JSON của summary, list và detail.

### Thống kê

- AC-8: `GET /admin/recognition/summary?from&to&timezone&provider&model` trả theo khoảng thời gian: tổng số inference theo `status`, số theo `reason`, số lần gọi provider, p50/p95 latency, tổng token và `costMicroUsd`, phân bố `imageType`, chuỗi theo ngày trong `timezone`, phân rã theo `provider/model`, và outcome theo trường (`accepted`/`edited`/`entered`/`cleared`/`suggested`) của các expense còn hiệu lực liên kết với inference trong khoảng.
- AC-9: Mặc định 7 ngày gần nhất; `from` không sau `to`; khoảng vượt `INFERENCE_RETENTION_DAYS` (90 ngày) hoặc `timezone` lạ trả `400`. Chỉ inference có `provider_called = true` mới tính vào số lần gọi provider và percentile; `latency_ms` có thể bằng 0 kể cả khi provider đã được gọi nên không dùng để suy ra việc này. Khoảng rỗng trả số 0 và percentile `null`, không phải lỗi.

### Nhật ký

- AC-10: `GET /admin/recognition/inferences` phân trang keyset theo `id` giảm dần (`cursor`, `limit` 1–100, mặc định 20; `nextCursor`, `hasMore`), lọc được theo `status`, `reason`, `provider`, `model`, `imageType`, `userId`, `from`, `to`. Cursor sai trả `400`.
- AC-11: `GET /admin/recognition/inferences/:id` trả cùng trường với list, cộng `usage`, `imageBytes`, `choiceSetVersion` và outcome theo trường cùng `hasPhoto` của từng expense liên kết (không có id expense). Không tìm thấy thì `404`.
- AC-11b: `GET /admin/recognition/inferences/:id/linked-expenses/:index/photo` trả ảnh đã lưu của expense còn hiệu lực ở vị trí `index` trong `linkedExpenses`, với `Cache-Control: no-store`. Không có expense, không có ảnh hoặc mất file trả `404`; tham số sai trả `400`. Ảnh gửi cho provider vẫn không được lưu, nên inference chưa có khoản chi thì không có ảnh. Web chỉ tải ảnh khi admin bấm "Xem ảnh" trong chi tiết inference. Quyết định của người dùng ngày 2026-11-03: chỉ dùng ảnh của khoản chi và không ghi log lượt xem. Ảnh có thể lộ cửa hàng, số tiền hoặc khuôn mặt, nên route này là ngoại lệ có chủ đích của phần khử định danh.

### Catalog

- AC-12: `GET /admin/recognition/catalog` trả mọi loại ảnh (cả disabled), mọi default rule kèm tên danh mục, danh mục hệ thống active để chọn, ngưỡng và tham số nén ảnh.
- AC-13: `PATCH /admin/recognition/image-types/:key` đổi `label` (1–80), `description` (null hoặc ≤240), `status`, kèm `version` bắt buộc. Sai `version` trả `409`. Không có `key` trả `404`. Tắt `other` trả `400` vì mô hình luôn cần một lựa chọn dự phòng. Không thêm hay xóa được loại ảnh, vì key là hằng số dùng chung với client.
- AC-14: `PATCH /admin/recognition/default-rules/:id` đổi `categoryId` và/hoặc `status`, kèm `version`. `categoryId` phải là danh mục hệ thống active, nếu không thì `400`. Rule không phải `origin = 'default'` trả `404`.
- AC-14a: Với cả hai route PATCH, hai request đồng thời cùng `version` thì đúng một request thành công và request còn lại nhận `409`, không có lần ghi nào bị mất. Có test e2e chạy song song.
- AC-15: Sau khi sửa, `GET /suggestion-config` trên cùng instance phản ánh thay đổi ngay và ETag đổi. Loại ảnh đang tắt không còn được gửi cho provider. Instance khác hội tụ trong `CHOICE_SET_CACHE_TTL_MS` (60 giây).
- AC-16: Mỗi thay đổi catalog ghi một dòng log có cấu trúc gồm `adminUserId`, đối tượng, trường đã đổi, version mới. Không có bảng audit.

### Playground

- AC-17: `POST /admin/recognition/playground` nhận multipart `image` (JPEG, cùng giới hạn với `POST /expense-inferences`: `400`/`413`/`415`) và `locale`. Server gọi provider đang cấu hình với deadline `EXPENSE_DECISION_TIMEOUT_MS` và choice set gồm loại ảnh enabled cùng danh mục hệ thống, không có dữ liệu cá nhân.
- AC-18: Response gồm `status`, `reason?`, `provider`, `model`, `latencyMs`, `usage`, `imageBytes`, danh sách choice đã gửi, lựa chọn đã ánh xạ về nhãn kèm `confidence`, `categoryMeetsThreshold` (so với `SUGGESTION_THRESHOLDS.decisionCategory`), và default rule khớp với loại ảnh (nếu có). Lỗi provider trả `200` với `status: unavailable`; provider tắt trả `status: disabled`.
- AC-19: Playground không ghi `expense_inferences`, không lưu ảnh, không chạy learner và không đọc user settings. Dòng log metric có `origin: "playground"`; token và chi phí vẫn cộng vào tổng in-process vì đó là chi phí thật.
- AC-20: Tối đa `PLAYGROUND_MAX_PER_MINUTE = 20` request mỗi admin trên mỗi instance; vượt quá trả `429`. Client ngắt kết nối thì provider call bị hủy.

### Giao diện

- AC-21: `/admin` có bốn tab là route thật: Tổng quan (`/admin/recognition`), Nhật ký (`/admin/recognition/logs`), Catalog (`/admin/recognition/catalog`), Playground (`/admin/recognition/playground`). Chữ giao diện là tiếng Việt; giữ nguyên các thuật ngữ kỹ thuật mà người vận hành dùng hằng ngày: Catalog, Playground, provider, model, default rule, inference, token, OCR, choice set. Có trạng thái đang tải, lỗi, rỗng; dùng control ngữ nghĩa, nhãn, điều hướng bàn phím; dùng được ở chiều rộng 375 px.
- AC-22: Playground nén ảnh trong trình duyệt theo `decisionImage` từ catalog (cạnh dài, quality, thử lại ở `retryQuality`) để giống client di động, hiện kích thước gốc và sau nén, và ghi rõ OCR cùng rule cá nhân chạy trên thiết bị nên không có trong kết quả.
- AC-23: Sửa catalog gặp `409` thì báo dữ liệu đã đổi và tải lại, không ghi đè. Tắt loại ảnh hoặc rule phải qua bước xác nhận.

## Cách tiếp cận

### Server

Tạo module mới `src/modules/admin`, phụ thuộc một chiều vào `auth`, `user`, `recognition`, `expense`, `category`. Không module nào phụ thuộc ngược lại `admin`.

| Thành phần                                              | Vị trí                                                                     | Việc                                                                                                               |
| ------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Cấu hình                                                | `configs/environment.ts`, `authConfig.adminUserIds`                        | Parse và validate `ADMIN_USER_IDS`                                                                                 |
| `AdminGuard`                                            | `admin/guards/admin.guard.ts`                                              | Dùng sau `JwtAuthGuard`; kiểm tra allowlist rồi `UsersService.findById`; lỗi hay không có user đều trả `403`       |
| Controller                                              | `admin/controllers/*.controller.ts`                                        | `me`, `recognition-stats`, `recognition-catalog`, `recognition-playground`; route `admin/...`, tag OpenAPI `admin` |
| `InferenceAdminService`                                 | `recognition/services/inference-admin.service.ts`                          | Summary và list trên `expense_inferences`; chỉ trả dữ liệu đã chiếu sang DTO khử định danh                         |
| `CatalogAdminService`                                   | `recognition/services/catalog-admin.service.ts`                            | Đọc và sửa loại ảnh, default rule; gọi `ChoiceSetService.invalidateImageTypes()`                                   |
| `InferenceService.tryDecision()`                        | Dùng lại `callProvider` và `validate`                                      | Luồng playground, không `store`                                                                                    |
| `ExpenseService` (hoặc service con export từ `expense`) | Thêm `fieldOutcomes(from, to, filters)` và `fieldOutcomesForInference(id)` | Đọc `field_provenance` tại module sở hữu bảng `expenses`; chỉ trả `field`, `source`, `outcome`, `confidence`       |
| `CategoryService`                                       | Thêm `listSystemChoices()`, `resolveSystemCategory(id)`                    | Không truy vấn trực tiếp bảng danh mục từ module khác                                                              |

`RecognitionModule` export thêm `InferenceService`, `InferenceAdminService`, `CatalogAdminService`. `AdminModule` đăng ký `MulterModule` riêng với cùng giới hạn như `RecognitionModule`, vì tùy chọn Multer gắn theo module; thiếu bước này là upload không giới hạn.

Migration: thêm index một phần `idx_expenses_inference` trên `expenses(inference_id) WHERE inference_id IS NOT NULL` để join outcome và để `ON DELETE SET NULL` khi dọn retention không quét cả bảng. Đặt trong migration mới `1793392000000-add-inference-admin-fields.ts`, vì `1793305600000-add-expense-suggestions.ts` đã được commit và không sửa lại. DB đã chạy migration trước chỉ cần chạy tiếp migration mới.

Cũng trong migration mới, thêm cột `expense_inferences.provider_called boolean NOT NULL DEFAULT false`. Bản ghi cũ giữ giá trị `false` nên không được tính là lần gọi provider; điều này chấp nhận được vì tính năng chưa phát hành và dữ liệu hết hạn sau 90 ngày và trường tương ứng trên entity. `InferenceService.store` ghi giá trị từ `Outcome.called` đã có sẵn. Trường này không xuất hiện trong response của `POST /expense-inferences`.

Cập nhật catalog dùng một câu `UPDATE ... SET ..., version = version + 1 WHERE id = :id AND version = :version` kèm ràng buộc `kind`/`origin` phù hợp, theo mẫu `ExpenseRuleService.update`; `affected = 0` thì đọc lại để phân biệt `404` và `409`. Không dùng đọc-kiểm-tra rồi `repository.save()`.

Không đổi contract của API hiện có. Client di động không cần sửa.

### Web

Tạo `src/features/admin`: `api.ts` (fetch kèm bearer từ `useWebSession`, `401` báo cần đăng nhập lại), `require-admin.tsx`, `admin-layout.tsx`, các trang, `compress-image.ts` (phần tính kích thước là hàm thuần có test). Dùng React Query sẵn có. Không thêm thư viện biểu đồ: tile số liệu và bảng là đủ, xu hướng theo ngày hiện bằng bảng.

`AuthPage`: `finish` và redirect khi đã có token dùng `location.state.from` nếu là path nội bộ bắt đầu bằng `/admin`, còn lại vẫn về `/journal`.

## Quyết định và đánh đổi

- **Allowlist bằng `ADMIN_USER_IDS`, không phải username.** Người dùng chọn allowlist qua env. Dùng id thay vì username vì username có thể đăng ký tự do: một username trong allowlist mà chưa có người dùng hoặc đã xóa sẽ thành đường chiếm quyền. Đổi lại phải tra id trước khi cấu hình. Thay đổi cần restart.
- **Quyền kiểm tra ở server cho từng request**, không thêm claim vào JWT và không thêm trường vào DTO user. Web hỏi `GET /admin/me`.
- **Khử định danh ở mức chiếu DTO**, có test sentinel. `userId` được giữ để lọc ca lỗi lặp lại theo người dùng; đây là bút danh, không phải ẩn danh tuyệt đối.
- **Playground không dùng dữ liệu cá nhân và không ghi inference**, để không làm sai số liệu và không cần xử lý ảnh người dùng. Đổi lại không phản ánh được phần personal choice và rule cá nhân.
- **Giới hạn request playground chạy in-process** vì đây là chi phí thật nhưng không phải biên bảo mật chính; nhiều instance thì giới hạn nhân theo số instance.
- **Sửa catalog dùng optimistic locking nguyên tử** qua `version` có sẵn trên entity, kiểm tra ngay trong câu `UPDATE`.
- **Lưu `provider_called` thay vì suy từ latency hay reason.** `reason = cancelled` có thể xảy ra cả trước và trong lúc gọi provider, nên không suy ra được từ dữ liệu hiện có.

## Ngoài phạm vi

Lưu ảnh gửi cho provider; ghi log lượt admin xem ảnh; xem số tiền hoặc danh tính người dùng dạng dữ liệu; dataset gán nhãn; thêm hoặc xóa loại ảnh và default rule; chỉnh ngưỡng hay prompt; chọn provider hoặc model từ UI; bảng audit và UI quản lý admin; bắt buộc MFA cho admin; giới hạn request toàn cụm; export CSV; sửa `/journal`; giao diện di động cho admin.

## Giả định đã xác nhận

- Không có role hoặc admin trong code: `apps/server/src/modules/auth/strategies/jwt.strategy.ts`, `apps/server/src/modules/user/entities/user.entity.ts`.
- Inference không lưu ảnh, OCR hay raw output và được giữ 90 ngày: `apps/server/src/modules/recognition/entities/expense-inference.entity.ts`, `constants.ts`.
- Bộ nhớ đệm loại ảnh có TTL 60 giây và chưa có hàm invalidate: `services/choice-set.service.ts`.
- `expense` đã phụ thuộc `recognition`, nên `recognition` không được import `expense`: `apps/server/src/modules/expense/module.ts`. Vì vậy phần join nằm ở tầng `admin`.
- Chính sách riêng tư cam kết tổng hợp hoặc khử định danh khi có thể và giới hạn quyền truy cập: `apps/web/src/features/legal/legal-page.tsx` mục 5.
- Quyết định của người dùng ngày 2026-11-03: phạm vi là theo dõi, catalog và playground; allowlist qua env; khử định danh.

## Rủi ro còn lại

- DEV-51→55 đang ở trạng thái review và commit chưa chắc đã lên origin. Nếu các commit đó đổi schema trước khi merge, phần truy vấn và migration mới phải sửa theo.
- Mục 6 chính sách riêng tư chỉ nêu Google AI Studio; đây là khoảng trống có sẵn, không thuộc thay đổi này.
- `fieldOutcomes` đọc JSONB trên khoảng tới 90 ngày; chấp nhận được ở quy mô hiện tại, có index ở trên.
- Thống kê gom theo `created_at` của inference: expense lưu sau khoảng lọc vẫn được tính vào inference gốc.

## Kiểm chứng

Chạy từ gốc repo. Test e2e chạy trên PostgreSQL dùng một lần theo `apps/server/README.md`.

```sh
pnpm exec oxfmt --check <changed-files>
pnpm --filter @billet/server lint
pnpm --filter @billet/server typecheck
pnpm --filter @billet/server test
pnpm --filter @billet/server build
E2E_DATABASE=true DATABASE_PORT=6719 DATABASE_PASSWORD=billet OPENAPI_PATH=docs pnpm --filter @billet/server test:e2e
pnpm --filter @billet/web lint
pnpm --filter @billet/web typecheck
pnpm --filter @billet/web test
pnpm --filter @billet/web build
```

Kết quả mong đợi: tất cả exit 0. File e2e mới `apps/server/test/admin-recognition.e2e-spec.ts` phải chạy thật, không bị skip, và phủ AC-1, AC-5 đến AC-15 (gồm AC-14a), AC-17 đến AC-20, và một inference có `latency_ms = 0` với `provider_called = true` vẫn được đếm là một lần gọi. Vì `describe` bị skip khi thiếu `E2E_DATABASE`, phải đọc output để xác nhận số test đã chạy.

Migration: trên DB dùng một lần, chạy `migration:run`, kiểm tra `idx_expenses_inference` và cột `expense_inferences.provider_called` tồn tại, `migration:revert`, chạy lại.

Chứng minh trên dữ liệu thật do chương trình sinh ra, không phải dữ liệu viết tay:

1. Chạy API với `fake` provider và `ADMIN_USER_IDS` trỏ tới id của một tài khoản dev.
2. Bằng API công khai, với một user khác: gửi `POST /expense-inferences` thành công, rồi tạo expense kèm `inferenceId` và `fieldProvenance`.
3. Gọi summary, list, detail: số đếm và outcome khớp bản ghi vừa tạo; `grep` body không thấy merchant hay số tiền vừa gửi.
4. Trong trình duyệt ở `/admin`: đi qua bốn tab, sửa nhãn một loại ảnh và xác nhận `GET /suggestion-config` đổi, chạy playground với một ảnh mẫu trong `data/sample`, kiểm tra ở chiều rộng 375 px và điều hướng bàn phím. Đăng nhập bằng tài khoản không phải admin để xem trang "Không có quyền". Chụp màn hình làm bằng chứng.
5. Cài lại giá trị catalog đã sửa trên DB local sau khi kiểm tra.

Không thay thế code cũ, nên không cần so sánh cũ và mới; riêng test hiện có của `POST /expense-inferences` phải vẫn pass sau khi tách `tryDecision`, và test `api-contracts` chứng minh contract cũ không đổi.

Tài liệu cần cập nhật: `apps/server/.env.example`, `apps/server/README.md`, `docs/technical-design/03-photo-expense-suggestion.md` (mục admin ngắn).
