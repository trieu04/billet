# Technical Design — Nhận diện chi tiêu từ ảnh

| Thông tin  | Giá trị                                                            |
| ---------- | ------------------------------------------------------------------ |
| Phạm vi    | Server Decision API, Expo OCR on-device và rule engine cá nhân hóa |
| Trạng thái | Đề xuất                                                            |

## 1. Tổng quan

### Bối cảnh

Expo hiện nhập amount thủ công và upload ảnh trong thao tác lưu tại [capture-review-screen.tsx](../../apps/expo/features/expense/screens/capture-review-screen.tsx). Server có [recognition-jobs](../../apps/server/src/modules/recognition/controller.ts) và [worker polling mỗi 5 giây](../../apps/server/src/modules/recognition/service.ts), với provider trả cả amount và category. Đường này không phù hợp mục tiêu gợi ý trong 2 giây; thiết kế bổ sung API đồng bộ riêng, không thay ngầm contract job cũ.

[Expense DTO](../../apps/server/src/modules/expense/dto.ts) đã nhận `fieldSources: Record<string, string>` và `recognitionJobId`, nhưng chưa có provenance có cấu trúc cho quyết định hợp nhất. [Expo manifest](../../apps/expo/package.json) chưa có adapter OCR native. Thiết kế chưa được triển khai; các ngưỡng cần benchmark trước khi bật prefill.

### Mục tiêu và phạm vi

Giảm thời gian từ **Use photo** đến lưu khoản chi bằng gợi ý hoặc prefill amount; đo thời gian nhập, số ký tự nhập, tỷ lệ chấp nhận và tỷ lệ sửa gợi ý sau lưu. OCR đọc amount, currency, ngày, merchant và text; Decision Model phân loại ảnh và danh mục. Expo hợp nhất theo OCR → rule cá nhân → rule mặc định; không lấy giá do model tự đoán làm amount.

Mục tiêu latency: p50 kết quả hữu ích dưới 2 giây, p95 không quá 5 giây tính từ Use photo, gồm OCR, prepare/upload, server, network và merge. Đây là mục tiêu cần benchmark theo thiết bị/mạng, không phải SLA đã đạt. Luồng nhập/lưu không đợi AI; quá deadline vẫn dùng dữ liệu hợp lệ đã có hoặc nhập tay.

Phạm vi gồm Expo native, fallback Expo web/Go, Server API/provider, rule cá nhân và metadata khi lưu. Không triển khai UI native riêng của `apps/ios`, `apps/android`, không thay đổi khoản đã lưu tự động, không thêm hàng đợi AI vào đường tương tác nhanh.

## 2. Thiết kế

### Kiến trúc

| Thành phần               | Trách nhiệm và boundary                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Expo capture coordinator | Sở hữu draft, generation, deadline và khóa autofill; khởi chạy OCR và prepare/upload song song sau Use photo                                       |
| Expo OCR adapter         | Nhận URI local đã áp dụng orientation, trả text/boxes và candidates có evidence; không gọi server                                                  |
| Expo fusion engine       | Hàm thuần nhận OCR, Decision, rule snapshot và draft state; trả candidates, provenance và hành động prefill/suggest/abstain                        |
| Server media             | Kiểm tra ownership/readiness, cung cấp source qua public service theo [image processing](./03-image-processing.md); không dùng thumbnail cho model |
| Server decision          | Validation, auth, idempotency, deadline, quota, adapter provider và chuẩn hóa output; không ghi expense                                            |
| Server personal rules    | Sở hữu rule/version và học từ expense được xác nhận; trả snapshot cho Expo, không đưa lịch sử tài chính vào model                                  |
| Server expense           | Validate dữ liệu cuối, lưu expense/provenance cùng transaction và phát sự kiện học qua outbox                                                      |

Version schema/engine cùng fixture contract để kiểm chứng tương thích giữa hai app.

### OCR và phân loại ảnh

Baseline OCR là adapter native ML Kit Text Recognition v2 cho chữ Latin; chọn bundled model trên Android để tránh download model trong lần chụp đầu. [ML Kit](https://developers.google.com/ml-kit/tips/installation-paths) hỗ trợ các cách phân phối model khác nhau; cần benchmark riêng chữ tiếng Việt, số tiền và ảnh mờ. Expo dùng development build chứa native module; [Expo Go không nạp tùy ý native code](https://docs.expo.dev/develop/development-builds/introduction/). Chọn wrapper/config plugin sau thử nghiệm tương thích SDK đang dùng; không coi package bất kỳ là đã tương thích.

OCR chạy trên ảnh local còn đủ chi tiết, độc lập với bản resize upload; lưu kích thước/orientation để boxes luôn thuộc đúng ảnh. Parser phân biệt tổng thanh toán với subtotal, thuế, tiền khách đưa, tiền thừa và mã vé. Chỉ tạo amount hợp lệ khi xác định được đơn vị, dấu phân cách và ngữ nghĩa; không chuyển số bất kỳ thành giá. `5.000 ₫` là `amountMinor="5000", currency="VND"`; chuỗi mơ hồ như `5,000` thiếu ngữ cảnh không được autofill. Không dùng floating point cho tiền.

Date chỉ có ngày không được bịa giờ: giữ `dateOnly` và timezone/evidence, hiển thị gợi ý; không tự thay `occurredAt` của capture. Raw text/boxes chỉ nằm trong bộ nhớ phiên, không lưu vào expense hoặc gửi model mặc định. OCR confidence không tồn tại ở mọi adapter thì để null; parser quality và calibration quyết định khả năng sử dụng, không tự gán 1.0.

Decision Model chỉ trả `imageType` trong `receipt | parking_ticket | food_drink | product | transfer_screenshot | other | unknown`, cùng category code, confidence từng trường và reason code có giới hạn. Model không trả amount, không tự tạo category hoặc place ID. Output không phù hợp schema bị từ chối; ảnh/text là dữ liệu không tin cậy, không được thực thi chỉ dẫn trong ảnh hoặc gọi tool theo nội dung ảnh.

### Luồng xử lý

1. Chụp/chọn ảnh mở preview local. Theo [capture contract](./02-mobile-capture.md), Use photo là điểm bắt đầu lượt nhận diện; trước đó không upload hoặc gọi model.
2. Tạo `{ draftId, generationId, startedAt, deadline }`, chụp rule snapshot có version từ cache theo account; mở form ngay. Khởi chạy OCR và prepare/upload source song song. Rules được tải trước khi capture khi có mạng; refresh trong lượt chỉ áp dụng cho lượt sau để tránh kết quả thay đổi không xác định.
3. Khi media ready, gọi Decision API với ngân sách còn lại; không chờ OCR. Nếu không đủ ngân sách gọi model, bỏ nhánh server. OCR và model hoàn thành độc lập; nhánh lỗi không hủy nhánh thành công.
4. Merge lại khi mỗi nhánh trả kết quả. OCR hợp lệ có thể prefill sớm. Rule amount phải chờ OCR kết thúc hoặc hết ngân sách OCR; không prefill rule trong lúc OCR còn có khả năng trả amount ưu tiên cao hơn. Rule phụ thuộc image type chỉ match sau classification hợp lệ.
5. Prefill chỉ vào field trống/chưa có giá trị có thẩm quyền, khi toàn draft chưa được người dùng chỉnh sửa; không đổi capture timestamp. Mỗi field được máy prefill tối đa một lần mỗi generation; candidate tốt hơn đến sau hiển thị gợi ý thay thế. Giữ candidate của từng nguồn để merge không phụ thuộc thứ tự completion.
6. Lần sửa/xóa/chọn giá trị đầu tiên ở bất kỳ field nào đặt `manualStarted=true` cho toàn draft, không reset khi xóa về rỗng; chỉ focus không khóa. Chọn gợi ý là thao tác xác nhận, áp dụng đúng candidate đang hiển thị và khóa autofill. Reducer kiểm tra generation và lock tại lúc apply, không dùng closure state cũ.
7. Save đóng nhận diện và snapshot giá trị/provenance trước request expense; save lỗi vẫn giữ draft và khóa autofill. Retake/đổi ảnh tăng generation, hủy lượt cũ; logout/rời form đóng lượt. Abort là best effort; mọi callback vẫn phải kiểm tra account, generation và trạng thái trước apply. Không PATCH expense vì kết quả AI đến sau.

### Quy tắc và trạng thái

OCR có trạng thái `running | succeeded | failed | unsupported | timed_out`; Decision thêm `skipped` khi không đủ ngân sách. Deadline 5 giây kết thúc nhận kết quả của lượt; gợi ý đã có vẫn có thể được chọn. Kết quả tới sau manual edit nhưng trước deadline là suggestion; sau deadline hoặc save/retake bị bỏ. Retry rõ ràng do người dùng khởi tạo lượt mới, giữ manual lock và không xóa form.

Ưu tiên áp dụng trên candidate hợp lệ của từng field, sau validation và threshold; OCR đọc được text không đồng nghĩa đã đọc được amount. Giá trị người dùng/capture đã xác nhận luôn có thẩm quyền cao hơn mọi nguồn máy.

| Field           | Thứ tự và xử lý                                                                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Amount/currency | OCR amount-currency pair → rule cá nhân → rule mặc định → trống; không trộn tiền tệ từ candidate khác, không đoán giá bằng Decision                     |
| Merchant        | OCR → rule cá nhân có merchant được cấu hình → rule mặc định có ngữ cảnh chính xác; không suy merchant từ loại ảnh chung                                |
| OccurredAt      | Giữ timestamp capture; ngày/giờ OCR chỉ là suggestion cần chọn rõ ràng                                                                                  |
| Category        | OCR chỉ cung cấp evidence cho mapping, không sinh category ID trực tiếp; rule cá nhân → rule mặc định ánh xạ Decision categoryCode vào category hiện có |
| Image type/text | Giữ output gốc làm evidence trong lượt; image type là đầu vào rule, không phải dữ liệu người dùng buộc phải xác nhận                                    |

Ngưỡng khởi điểm cần calibration: OCR amount prefill khi confidence đã hiệu chỉnh ≥ 0.95 và không có totals cạnh tranh; suggestion từ 0.70. Classification dùng để kích hoạt rule khi ≥ 0.85; category suggestion từ 0.70. Confidence không được calibration hoặc null chỉ cho suggestion nếu có evidence hợp lệ; không prefill. Không so trực tiếp điểm tự báo của hai model hoặc nhân các điểm để tạo độ tin cậy giả.

OCR đáng ngờ thấp hơn ngưỡng không được chặn rule hợp lệ, nhưng nếu có amount OCR cạnh tranh chưa giải quyết thì hạ rule xuống suggestion. Rule cá nhân cấu hình thủ công phải match đầy đủ predicate và được bật prefill; rule học cần đủ bằng chứng ở phần [Cá nhân hóa và học từ hành vi](#cá-nhân-hóa-và-học-từ-hành-vi). Rule mặc định không chứa giá cố định cho toàn bộ `food_drink` hay `parking_ticket`; chỉ có amount khi có ngữ cảnh cụ thể đã kiểm chứng, nếu không chỉ đề xuất category. Hai rule ngang hạng nhưng khác giá dẫn đến abstain/present choices, không chọn ngẫu nhiên.

Ví dụ: Decision trả `parking_ticket` đủ ngưỡng, OCR chỉ đọc số vé, không có giá; place do người dùng chọn là `place_A`. Rule cá nhân `{ imageType: parking_ticket, placeId: place_A, currency: VND } → 5000` tạo gợi ý “5.000 ₫ · rule tại địa điểm A”; có thể prefill nếu rule cho phép và draft chưa sửa. Không có place đáng tin thì rule không match. Nếu OCR đọc tổng 10.000 ₫ đủ ngưỡng, OCR thắng; nếu người dùng đã nhập 7.000 ₫ thì giữ 7.000 ₫ và chỉ hiển thị gợi ý.

### Cá nhân hóa và học từ hành vi

Rule có ID/version, origin `user_configured | learned | default`, enabled, allowPrefill, predicate theo image type/merchant chuẩn hóa/place/currency, field actions, priority, updatedAt và expiresAt tùy chọn. Không cho executable expression; predicates là DSL đóng được validate. Place lấy từ lựa chọn người dùng hoặc location mapping được xác nhận và cho phép; thiếu quyền/độ chính xác thì không áp dụng rule yêu cầu location, không suy ra GPS từ model hoặc tên cửa hàng trùng nhau.

Trong lớp cá nhân: rule người dùng cấu hình ưu tiên hơn learned; sau đó specificity (place + merchant + type trước type đơn lẻ), priority do người dùng đặt. Không dùng updatedAt để âm thầm phá hòa khác giá. Rule cấu hình có thể bật/tắt, sửa/xóa, chọn chỉ gợi ý/prefill; người dùng có thể tắt học và xóa lịch sử học. Rule default có version do server phát hành.

Chỉ học sau expense lưu thành công và giá trị đã được xác nhận. Prefill được giữ nguyên lúc Save là dữ liệu xác nhận cho expense nhưng không phải bằng chứng độc lập để nâng confidence rule đã sinh ra nó. Dùng nhập tay/sửa hoặc xác nhận chủ động làm evidence; một expense chỉ đóng góp một observation mỗi version. Không học từ output model, draft bỏ dở, retry trùng hoặc thao tác chỉ hiển thị suggestion.

Baseline learned amount: cùng context và currency có ít nhất 5 expense độc lập trong ít nhất 3 ngày của cửa sổ 60 ngày; cùng giá chiếm ≥ 90% trọng số, trọng số giảm một nửa mỗi 30 ngày. Đây là điều kiện đề xuất trước calibration; rule chỉ suggestion mặc định, prefill cần người dùng bật. Giá mới khác giá rule làm tạm ngừng prefill learned rule cho context đó cho tới khi đủ bằng chứng lại; sửa/xóa expense thay thế/rút observation cũ và tính lại. Rule do người dùng đặt không tự bị ghi đè; chỉ nhắc kiểm tra khi lệch giá.

## 3. Contract và dữ liệu

### API / Event

Các endpoint dưới đây dùng prefix API hiện hữu, JWT và ownership theo account; client không chọn provider tùy ý. ID thuộc user khác trả 404. Schema có `schemaVersion=1`; thay đổi enum/semantics cần version mới hoặc capability negotiation, client không hiểu schema phải bỏ suggestion an toàn.

| Interface                                                                                  | Contract                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /recognition-decisions`                                                              | Body `{ mediaAssetId, generationId, budgetMs, schemaVersion }`, header `Idempotency-Key`; media phải ready. Trả 200 `{ decisionId, generationId, status, imageType, categoryCode, confidence, reasonCodes, provider, modelVersion, promptVersion, schemaVersion, durationMs }`; `status` là `ok` hoặc `abstained`, trường không biết là null |
| `GET /recognition-rules`                                                                   | Trả snapshot theo user `{ version, engineVersion, defaultVersion, expiresAt, rules }`, hỗ trợ ETag; cache account riêng, snapshot hết hạn không dùng prefill                                                                                                                                                                                 |
| `POST /recognition-rules`, `PATCH /recognition-rules/:id`, `DELETE /recognition-rules/:id` | CRUD rule; PATCH/DELETE yêu cầu version để tránh lost update, stale version trả 409; xóa learned rule tạo suppression cho context để không tự sinh lại ngay                                                                                                                                                                                  |
| `PATCH /recognition-preferences`                                                           | Bật/tắt recognition, learning, prefill; versioned theo user                                                                                                                                                                                                                                                                                  |
| `DELETE /recognition-learning`                                                             | Xóa observations/learned rules, tăng snapshot version; không xóa expense hoặc rule cấu hình thủ công                                                                                                                                                                                                                                         |
| `POST /expenses`, `PATCH /expenses/:id`                                                    | Bổ sung optional `recognitionDecisionId` và `recognitionMetadata`; giữ `fieldSources` cũ cho tương thích, metadata mới là nguồn chi tiết khi có                                                                                                                                                                                              |

Decision lỗi: 400 input/schema, 409 media chưa ready hoặc idempotency payload mismatch, 429 quota/capacity kèm Retry-After, 502 upstream/output không hợp lệ, 503 disabled/circuit open, 504 deadline. Không trả output nửa JSON; `abstained` là kết quả hợp lệ không đủ bằng chứng, không phải lỗi transport. Tất cả lỗi đều giữ đường OCR/rule/nhập tay.

Không gán `decisionId` vào `recognitionJobId`. Khi expense có decision reference, server kiểm tra owner/media khớp và decision tồn tại; đây là tham chiếu provenance, không phải điều kiện bắt buộc lưu expense. Nếu reference hết hạn hoặc metadata bị từ chối, client được retry lưu giá trị người dùng với provenance suy giảm có ghi nhận, không giả mạo thành output đã được server chứng thực. Không có reference vẫn lưu được OCR/manual.

### Provider interface

Interface đề xuất `DecisionProvider.classify(input, context): Promise<DecisionOutput>`; `input` gồm ảnh nguồn bytes/MIME qua media boundary, taxonomy version và locale; `context` gồm request ID, absolute deadline và AbortSignal. Adapter khai báo provider ID, model ID/version, khả năng image input/structured output, giới hạn ảnh và cách tính usage. Output chuẩn hóa chỉ chứa image type/category/confidence/reason codes và usage; server validation vẫn bắt buộc dù provider hỗ trợ JSON schema.

Registry cho phép thêm Span-02, d1-ultra, Jev, Decider, GPT-Luna Decision hoặc model tương thích bằng adapter/config, không đổi fusion engine. Các tên này là ứng viên theo yêu cầu, chưa xác minh vendor, model ID, endpoint, giá hoặc khả năng thực tế; không mặc định chúng tương thích OpenAI API. Adapter chỉ được bật sau capability test, deadline/abort test và benchmark cùng corpus. Chưa chọn provider mặc định khi chưa có bằng chứng.

Pin provider/model/prompt/taxonomy theo deployment và mỗi lượt idempotency. Không tự chuyển provider giữa request tương tác để tránh vượt deadline và thay đổi semantics; đổi provider bằng config/canary sau benchmark. Chỉ shadow benchmark trên ảnh được cho phép, ngoài đường critical, không gửi mặc định ảnh tới nhiều nhà cung cấp.

### Dữ liệu

`recognition_decisions` lưu owner, media ID/content hash, idempotency key/request hash, generation, provider/model/prompt/schema versions, status, deadline, normalized result và timestamps. Unique `(userId, idempotencyKey)`; không lưu lại ảnh hoặc raw OCR. `personal_rules` và `recognition_preferences` có owner/version; `rule_observations` unique `(userId, expenseId, field)` lưu expense version để bỏ event cũ. Index rule theo owner/enabled và observation theo owner/context/time; không dùng tên merchant làm định danh toàn cục.

Expense thêm JSONB `recognitionMetadata` có version và reference decision optional, không đổi kiểu `fieldSources` đang có. Mỗi field đã chọn lưu `{ source, candidateId, confidence, confidenceKind, appliedAs, confirmedByUser, ruleId, ruleVersion, decisionId, ocrEngineVersion, parserVersion }` với trường không áp dụng được bỏ; `source` là `manual | capture | ocr | personal_rule | default_rule`, `appliedAs` là `manual | prefill | accepted_suggestion`. Lưu engine/rule snapshot version cấp metadata và chỉ evidence tối thiểu như reason code; không lưu toàn văn hóa đơn. Khi người dùng sửa, nguồn thành manual, giữ reference candidate trước đó để đo correction nếu có.

Server validate field allowlist, enum, độ dài, giới hạn metadata 16 KiB và quan hệ decision/media/user; client OCR/provenance vẫn là dữ liệu do client khai báo, không phải bằng chứng đáng tin cho phân quyền hay thanh toán. Expense, metadata và outbox event ghi cùng transaction; học xử lý idempotent theo expense version. Job học ngoài request không kéo dài Decision API.

Đề xuất giữ decision/idempotency 24 giờ; expired record không xóa provenance đã snapshot trong expense. Giữ observations tối đa 60 ngày; metadata theo vòng đời expense. Xóa account/media áp dụng policy xóa dữ liệu liên quan; xóa lịch sử học không để outbox cũ tái tạo observations (learning epoch/version). Các retention này cần duyệt trước production; không giữ raw ảnh OCR trong logs để phục vụ debug.

## 4. Vận hành

### Deadline và suy giảm

Deadline end-to-end dùng monotonic clock trên client từ Use photo, tối đa 5.000 ms. Ngân sách OCR tối đa 1.200 ms; prepare/upload tối đa 1.500 ms cho mục tiêu fast path; server/provider tối đa 2.500 ms gồm auth/media read/validation/persistence; chừa 500 ms cho response và merge. Các nhánh chạy song song, không cộng OCR vào nhánh upload → server. Nếu upload vượt ngân sách fast path, dừng nhánh Decision của lượt nhưng có thể tiếp tục upload để lưu ảnh; không hủy media cần cho Save.

Client gửi `budgetMs = min(2500, deadline - now - 500)` sau upload; server clamp ngân sách và tạo deadline riêng lúc nhận, trừ thời gian validation/read khỏi ngân sách provider. Không gọi provider nếu còn dưới 300 ms. Deadline client vẫn có thẩm quyền khi network transit ăn mất ngân sách. Timeout/abort phải đóng upstream request khi adapter hỗ trợ, nhưng không giả định nhà cung cấp dừng tính phí ngay.

Offline/OCR unsupported/model timeout: dùng các candidate hợp lệ còn lại; không có thì nhập tay. Expo web/Go không có adapter native phải trả `unsupported` rõ ràng, không âm thầm chuyển OCR lên cloud. Web OCR riêng cần benchmark mới trước khi công bố cùng SLO. Rule cần image type không chạy khi classification thất bại; rule có predicate độc lập vẫn có thể match đầy đủ.

### Retry, idempotency và tải

Request hash gồm media/content version, generation và schema; budget không tham gia hash nhưng request lặp không kéo dài deadline đã ghi. Atomic insert/unique constraint claim lượt trước gọi provider. Request trùng đang chạy chờ cùng kết quả trong deadline gốc, không gọi upstream lần hai; hết chờ trả 504. Completed replay cùng normalized result sau kiểm tra quyền, payload khác cùng key trả 409. Terminal timeout/failed cũng được replay trong TTL, client không tự đổi key để lách quota.

Fast path chỉ một automatic retry upstream cho connection reset/502/503 xảy ra sớm, jitter 50–100 ms, khi còn đủ ngân sách attempt hữu ích và response reserve. Không retry output schema lỗi, auth/4xx hoặc 429 có Retry-After vượt deadline; không retry timeout đã hết budget. Retry transport client dùng cùng key trong deadline, không retry lồng không giới hạn. Lượt thủ công mới có key mới và chịu quota; không xếp hàng chờ tới nhiều giây.

Process crash sau upstream call có thể đã phát sinh phí: lease ghi deadline, instance khác chỉ đánh dấu failed khi hết lease, không chạy lại lượt cũ. Không tuyên bố exactly-once với provider không hỗ trợ idempotency; truyền provider idempotency key khi có. Concurrency/quota giới hạn theo user và process, tổng tải phối hợp qua store dùng chung; capacity hết trả 429 ngay. Circuit breaker theo provider giảm gọi khi lỗi liên tục; health probe không dùng ảnh người dùng.

Config server đề xuất cho enabled/provider/model, timeout/concurrency/quota, retry và schema/prompt versions được validate tại startup; secrets chỉ ở server. Threshold và rule version phát qua snapshot có kiểm soát, không nhận tùy ý từ client. Khi triển khai mới bổ sung tên biến thực tế vào `.env.example` và API docs; tài liệu này không tạo config runtime.

### Đo lường và bảo mật

Đo OCR/parse/prepare/upload/server/provider/merge riêng, cùng time-to-first-useful-suggestion, time-to-final-result, time-to-save, prefill-before-typing, acceptance/correction, abstention, timeout và chi phí mỗi lượt. Báo p50/p95 của kết quả thành công cùng tỷ lệ coverage trên toàn bộ lượt đủ điều kiện; timeout/unsupported không được tính là “kết quả nhanh” để làm đẹp p95. Báo thêm p95 time-to-terminal-state, phân tách network/device/cache/provider và cold start.

Không log text hóa đơn, ảnh, GPS, token, merchant hoặc số tiền; metrics dùng reason code và dimensions ít cardinality. Cache OCR/rules theo account, xóa local cache khi logout; không cache decision giữa người dùng. Provider chỉ nhận ảnh cần phân loại và taxonomy, không nhận lịch sử expense hoặc tọa độ. Trước production phải chốt chính sách lưu/training của provider và quyền gửi ảnh; không đưa credentials hoặc URL media nội bộ có bearer vào prompt.

## 5. Quyết định kỹ thuật

| Quyết định                          | Lý do                                                         | Đánh đổi                                                                   |
| ----------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------- |
| OCR local song song server Decision | OCR có thể trả amount trước upload; model tập trung phân loại | Hai pipeline và native build, hiệu năng khác nhau theo thiết bị            |
| Hợp nhất tại Expo                   | Bảo vệ trạng thái đang nhập chính xác, dùng cache/offline     | Cần version engine và fixtures; server không tin metadata client tuyệt đối |
| API đồng bộ có deadline riêng       | Loại polling 5 giây khỏi đường gợi ý                          | Tải upstream trực tiếp, cần admission control và bỏ lượt khi quá hạn       |

## 6. Kiểm chứng và triển khai

### Kiểm chứng

Các kiểm thử và benchmark dưới đây chưa chạy; hiện mới đối chiếu source và kiểm tra tài liệu.

- Unit fusion/parser: mọi hoán vị OCR/model completion cho cùng tập candidates; nguồn/threshold; nhiều totals; currency mismatch; date-only; rule tie; số vé không thành amount; thiếu place; stale snapshot; OCR confidence null; không có category code tương ứng.
- Unit state: manual edit/delete/select khóa cả draft; focus không khóa; candidate chỉ prefill một lần; retake/logout/deadline/save loại callback cũ; save lỗi vẫn giữ dữ liệu và lock; retry không mở lại autofill.
- Integration server: ownership, media pending, output sai enum/JSON, quota, deadline/abort, same-key concurrency trên nhiều instance, payload mismatch, crash sau gọi upstream, replay result/error, retention, CRUD version conflict và provider contract chung.
- Integration learning: expense/outbox atomicity, retry không tăng sample, event đảo thứ tự, edit/delete rút sample, prefill không tự củng cố rule, disable/delete learning không tái sinh từ outbox cũ, suppression khi xóa rule.
- E2E Expo development builds: vé xe không có giá → rule place 5.000 ₫; OCR 10.000 ₫ thắng rule; nhập tay trước response; offline/model lỗi vẫn lưu; ảnh đổi và save trong lúc nhận diện; fallback web/Go; rule settings và logout cache isolation.

Benchmark cùng corpus gán nhãn gồm hóa đơn, vé xe, đồ ăn, screenshot chuyển khoản, ảnh không liên quan, chữ nhỏ/mờ và các trường hợp không có amount; tách train/calibration/test theo user/merchant để tránh leakage. Mỗi adapter dùng cùng image profile, taxonomy và output schema; pin model/prompt, randomize thứ tự, đo cold/warm và chi phí theo usage thực. Báo classification accuracy/macro-F1, amount exact match, precision/coverage của prefill, abstention, latency và correction; không xếp model chỉ theo speed.

Gate thử nghiệm đề xuất: ít nhất 500 ảnh holdout và 200 lượt có prefill amount, exact-match precision prefill ≥ 99% kèm khoảng tin cậy; p50 < 2 giây, p95 ≤ 5 giây trong profile thiết bị/mạng được công bố, coverage kết quả hữu ích ≥ 90% trên tập đủ điều kiện. Đo thêm mạng yếu/offline và mọi timeout ngoài tập đó. So A/B với nhập tay: median time-to-save giảm ít nhất 20%, không tăng tỷ lệ sửa sau lưu; các ngưỡng và cỡ mẫu phải được chốt lại nếu interval còn rộng, chưa được coi là bằng chứng production.

### Triển khai

Rollout: migration additive/metadata/rules → server Decision sau flag và adapter contract tests → Expo OCR/early upload/state guard → suggestion-only canary → calibration/benchmark → opt-in prefill. Giữ recognition-jobs cho client cũ; không chuyển job cũ sang sync hoặc chạy cả hai nhánh cloud cho cùng ảnh. Client mới không phụ thuộc việc hoàn tất job cũ. Rollback tắt Decision/prefill flags, giữ nhập tay và dữ liệu đã xác nhận; không drop schema hoặc provenance. Nâng engine không tương thích phải bỏ snapshot cũ và lấy lại; nếu không lấy được thì nhập tay/OCR suggestion.

## 7. Vấn đề chưa chốt

| Vấn đề                           | Điều kiện trước triển khai                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Chưa xác minh các model ứng viên | Xác định vendor/model ID/API, data policy, giá, image limits và benchmark qua adapter; chưa cam kết chọn model     |
| P95 phụ thuộc upload và cold OCR | Kiểm chứng trên thiết bị thật và cùng profile [xử lý ảnh](./03-image-processing.md); không chỉ đo provider latency |
| Expo OCR bridge chưa chọn        | Build/test iOS và Android với SDK hiện tại, đo memory/cold start, ghi rõ phạm vi web/Go unsupported                |

## 8. Tham chiếu

- [BRD](../business-requirements.md), [Backend](./01-backend.md).
- [Recognition provider hiện tại](../../apps/server/src/modules/recognition/interface.ts), [job schema](../../apps/server/src/modules/recognition/entities/recognition-job.entity.ts).
- [DEV-48 — Thiết kế nhận diện chi tiêu từ ảnh](https://linear.app/devtvn/issue/DEV-48).
