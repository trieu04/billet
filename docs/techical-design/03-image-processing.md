# Technical Design — Image compression và delivery

| Thông tin  | Giá trị                                                                                         |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Phạm vi    | Expo: chuẩn bị ảnh upload và chọn ảnh hiển thị; server: media processing, storage và đầu vào AI |
| Trạng thái | Đề xuất                                                                                         |

## 1. Tổng quan

### Bối cảnh

Expo hiện đọc ảnh thành blob và upload trong thao tác lưu tại [capture-review-screen.tsx](../../apps/expo/features/expense/screens/capture-review-screen.tsx). [MediaService](../../apps/server/src/modules/media/service.ts) kiểm tra kích thước byte và signature, lưu nguyên bytes rồi đánh dấu ready; chưa decode đầy đủ hoặc tạo thumbnail. [MediaAssetEntity](../../apps/server/src/modules/media/entities/media-asset.entity.ts) đã có `thumbnailKey` nhưng chưa sử dụng. [AuthenticatedImage](../../apps/expo/features/api/authenticated-image.tsx) tải cùng bản ảnh qua endpoint content có bearer authentication.

Hai điểm cần giảm tải mạng: ảnh camera lớn làm upload chậm trước khi server có thể chạy AI; dùng cùng ảnh cho card nhỏ khiến mobile tải và decode nhiều dữ liệu không cần thiết. Nén chỉ trên server không giảm được thời gian upload.

### Mục tiêu và phạm vi

Giảm thời gian từ Use photo tới media ready và thời gian từ mở danh sách tới ảnh đầu tiên hiển thị. Đo cả CPU nén, request overhead, upload/download và decode; giảm bytes nhưng tăng tổng thời gian chờ là không đạt. Preview dùng URI local ngay, AI chạy độc lập với nhập tiền và không chặn lưu theo [mobile capture](./02-mobile-capture.md).

Thiết kế gồm hai use case, contract biến thể ảnh, retry, bảo mật và rollout tương thích client cũ. Không thay đổi logic nhận diện, tự ghi đè amount hay triển khai native iOS/Android trong phạm vi này. Source là bản Expo đã chuẩn bị; server không lưu camera original.

## 2. Thiết kế

### Kiến trúc

| Thành phần             | Trách nhiệm và boundary đề xuất                                                                                |
| ---------------------- | -------------------------------------------------------------------------------------------------------------- |
| Expo image preparation | Module độc lập trong `features/media`, nhận URI local, trả file upload và metadata; không biết expense hoặc AI |
| Expo capture           | Sở hữu lựa chọn ảnh, generation ID, tiến trình và hủy; gọi media API sau Use photo                             |
| Expo media API/display | Upload bytes, chọn variant, xác thực tải ảnh; không nén lại mỗi lần render                                     |
| Server media           | Sở hữu validation, source, variant và readiness; cấp ảnh cho client và recognition qua public service          |
| Server recognition     | Chỉ đọc source chuẩn hóa qua media boundary; không dùng thumbnail và không tự truy cập storage key             |

Dùng `expo-image-manipulator` để resize/encode local và `sharp` để decode/chuẩn hóa/tạo variant trên server. Hai dependency chưa có trong package manifests hiện tại; khi triển khai cần chọn phiên bản tương thích Expo SDK và môi trường Docker. Chưa tạo shared package: profile có cùng ý nghĩa nhưng adapter và validation thuộc từng app, server luôn kiểm chứng input độc lập.

### Profile ảnh

Các số dưới đây là cấu hình khởi điểm cần benchmark, không phải cam kết chất lượng hoặc SLA. Resize giữ tỷ lệ, không upscale, không crop theo card; kích thước tính sau khi áp dụng orientation.

| Bản ảnh              | Nơi tạo                         | Cạnh dài tối đa | Encode                      | Ngân sách byte                                  |
| -------------------- | ------------------------------- | --------------- | --------------------------- | ----------------------------------------------- |
| Upload/source cho AI | Expo, server chuẩn hóa khi nhận | 2048 px         | JPEG quality 0.82 trên Expo | Mục tiêu ≤ 1 MB; giới hạn chấp nhận theo server |
| Thumbnail            | Server từ source                | 384 px          | JPEG quality 75             | Mục tiêu ≤ 60 KB                                |
| Display              | Server từ source                | 1280 px         | JPEG quality 80             | Mục tiêu ≤ 250 KB                               |

JPEG là baseline cho ảnh chụp và tương thích client/provider; WebP/AVIF chỉ xét sau khi có số đo byte, thời gian encode và khả năng decode. PNG có alpha được flatten nền trắng khi chuyển JPEG. Server nhận JPEG/PNG/WebP như contract hiện tại, từ chối animation/multi-page; HEIC từ picker phải được chuyển trên thiết bị hoặc báo định dạng chưa hỗ trợ.

### Luồng xử lý

#### Use case 1 — Chụp → nén → upload → AI

1. Hiển thị preview từ URI local. Chỉ sau Use photo mới prepare và upload; Retake trước đó không gọi server. Sau xác nhận, mở form nhập tiền đồng thời xử lý ảnh.
2. `prepareUploadImage({ uri, generationId })` đọc dimensions, chuẩn hóa hướng, resize cạnh dài về tối đa 2048 và encode JPEG. Trả `{ uri, mimeType, sizeBytes, width, height, policyVersion }`; đo byte từ file kết quả, không ước lượng từ quality. Không đưa base64 qua JS state.
3. Nếu quá 1 MB, thử thêm tối đa một lần ở quality 0.72 từ source local, không encode nối tiếp bản đã nén. Nếu vẫn vượt mục tiêu nhưng trong giới hạn server, dùng bản hợp lệ nhỏ hơn; không giảm tiếp độ phân giải để ép đạt byte. Ảnh nhỏ sẵn vẫn phải đáp ứng orientation/metadata; không giả định thao tác nén luôn giảm kích thước.
4. Reserve bằng MIME và byte thực tế của file cuối, sau đó PUT binary. Tái sử dụng file và reservation khi retry; không nén lại vì người dùng sửa amount/caption. Lỗi prepare giữ preview và dữ liệu form, cho retry hoặc lưu không ảnh theo lựa chọn rõ ràng của người dùng.
5. Server nhận vào file staging có giới hạn byte, decode đầy đủ, kiểm tra pixel/format, auto-orient và loại metadata nhạy cảm. Source hợp lệ từ Expo không bị resize thêm; mọi source được xuất thành JPEG chuẩn hóa, do đó có thêm một lần encode cần đánh giá chất lượng. Client cũ gửi ảnh lớn được resize về cùng giới hạn source.
6. Ghi source thành công rồi chuyển media sang ready và trả response; enqueue tạo thumbnail/display bằng job durable. Recognition có thể đọc source khi ready, không chờ display variants. Upload không chờ provider AI; caller gọi recognition theo contract riêng.

Không thay đổi điều kiện lưu expense: có ảnh thì media phải ready, nhưng không cần AI hoặc variants ready. Upload sớm giúp thời gian nhập tiền che bớt thời gian xử lý; trạng thái xử lý ảnh vẫn hiển thị khi người dùng lưu quá nhanh.

#### Use case 2 — Server trả ảnh nhỏ cho mobile

Worker tạo sẵn hai variant từ source, không tạo lại mỗi GET. Mobile chọn ảnh nhỏ nhất đủ kích thước vùng render theo pixel thực (`layout × devicePixelRatio`, xét cả hai chiều theo tỷ lệ ảnh); thumbnail cho calendar/avatar ảnh nhỏ, display cho card/detail thông thường, source cho zoom hoặc khi display không đủ. Crop `cover` chỉ là trình bày tại client.

Media metadata trả descriptor của các variant đã ready. Client lấy metadata khi cần và cache theo media ID; không thêm một request metadata cho từng card nếu server có thể trả descriptor cùng response expense bằng trường bổ sung. Khi variant đang pending, ảnh mới tiếp tục dùng preview local; ảnh remote hiển thị placeholder và thử lại có giới hạn. Sau timeout có thể tải source một lần để đảm bảo xem được ảnh; ghi metric fallback vì đây là đường tải tốn bytes. Không trả source dưới URL thumbnail mà không báo cho client.

### Quy tắc và trạng thái

Media dùng `pending → processing → ready | failed`; processing chỉ cho nhận/chuẩn hóa source. Variant có trạng thái riêng `pending → processing → ready | failed`, không làm media ready quay lại pending. Unique job theo `(mediaId, variant, policyVersion)`; worker claim bằng lease, retry lỗi tạm thời tối đa ba lần với backoff, thu hồi lease khi crash. Lỗi variant giữ source và khả năng lưu/nhận diện.

PUT phải claim media atomically để ngăn hai request ghi đè. Timeout sau PUT: client GET metadata trước khi retry; ready thì tiếp tục, processing thì poll có backoff, pending mới gửi lại. Retry cùng bytes trên ready trả metadata hiện tại; khác checksum trả 409. Failed do input không hợp lệ cần chọn/prepare lại và reserve mới. Không thay đổi source đã ready.

Mỗi lần Retake tạo generation ID mới; kết quả prepare/upload/AI của generation cũ không được gắn vào form hiện tại. Hủy request không bảo đảm server đã dừng; media bỏ dở được cleanup. File tạm local chỉ xóa khi không còn dùng cho preview/retry; cleanup khi hoàn tất, hủy hoặc khởi động lại.

## 3. Contract và dữ liệu

### API / Event

Giữ prefix `/api/v1`, bearer auth và ownership hiện có; ID bigint biểu diễn bằng string. Contract bên dưới chưa phải runtime.

| Interface                                                               | Hành vi                                                                                                                                             |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `POST /media`                                                           | Giữ `{ mimeType, sizeBytes }` cho bytes upload; trả reservation và uploadUrl như hiện tại                                                           |
| `PUT /media/:id/content`                                                | Binary upload; trả metadata sau source ready, không chờ variants/AI; bổ sung idempotency theo checksum theo [quy tắc retry](#quy-tắc-và-trạng-thái) |
| `GET /media/:id`                                                        | Bổ sung `policyVersion`, `variantsStatus` và `variants` chứa các descriptor đã ready                                                                |
| `GET /media/:id/content`                                                | Giữ hoạt động cho client cũ, trả source chuẩn hóa                                                                                                   |
| `GET /media/:id/content?variant=thumbnail\|display\|source&v=<version>` | Trả đúng variant/version; chỉ nhận enum, không nhận width/quality hoặc storage path tùy ý                                                           |

Descriptor gồm `{ url, mimeType, sizeBytes, width, height, version }`; `sizeBytes` trả string như response hiện tại. URL là đường dẫn tương đối có auth, không chứa token. Metadata cấp cao mô tả source đã lưu, vì vậy byte/MIME có thể khác reservation; lưu riêng metadata upload để đối chiếu PUT retry.

Lỗi: 400 input hỏng/variant không hợp lệ; 401 chưa xác thực; 404 không tồn tại, không thuộc owner hoặc version không còn; 409 source/variant chưa ready hay nội dung retry không khớp; 413 vượt byte/pixel; 415 định dạng không hỗ trợ; 503 hết năng lực xử lý tạm thời. Với pending hoặc quá tải, trả mã lỗi máy đọc được và `Retry-After`. Client không retry tự động lỗi input/quyền; retry mạng/503 có backoff, hủy khi rời flow.

### Dữ liệu

Bổ sung source checksum, upload MIME/size/checksum và policy version vào media; tạo bảng variant với foreign key media, kind, version, storageKey, MIME, byte, dimensions và status. Unique `(mediaId, kind, version)`. Không dùng một `thumbnailKey` cho nhiều biến thể; giữ cột cũ trong giai đoạn migration tương thích rồi loại riêng khi không còn caller.

Storage key sinh phía server, bao gồm media/version/kind. Ghi object tạm trước, publish descriptor sau khi object hoàn chỉnh; DB và storage không có transaction chung nên job phải idempotent và có cleanup object mồ côi. Job tạo variants được ghi cùng transaction đánh dấu source ready hoặc qua outbox, tránh mất job khi process chết giữa hai thao tác.

Đề xuất worker dọn reservation bỏ dở sau 24 giờ; media đang gắn expense không bị xóa chỉ vì TTL của upload. Khi xóa media hết thời gian retention được duyệt, xóa source, mọi variant/version và jobs liên quan; kiểm tra tham chiếu trước khi xóa. Chính sách retention cuối cùng cần chốt trước rollout production.

## 4. Vận hành

Server hiện có `MEDIA_MAX_FILE_SIZE_BYTES` mặc định 15.000.000 bytes. Giữ giới hạn này cho tương thích; đề xuất thêm giới hạn 40 megapixel, cạnh input tối đa 16.384 px, một frame và concurrency chuẩn hóa ban đầu 2/process. Đây là giá trị cần load-test; áp dụng giới hạn byte tại gateway và khi đọc stream, giới hạn pixel trước decode, timeout cho job và queue có capacity hữu hạn. Không gom đồng thời nhiều ảnh lớn vào heap như đường upload hiện tại.

Pixel limit, concurrency, timeout và queue capacity thuộc media config, được validate khi startup; profile encode có version để tái tạo và rollback.

Áp dụng orientation trước khi bỏ EXIF/GPS; xác minh output không còn metadata nhạy cảm trên cả Expo native/web và server. Luôn kiểm tra owner trước trả bytes hoặc 304. Dùng `Cache-Control: private, max-age=300` như hiện tại và ETag theo hash variant; cache mobile theo account/media/variant/version, dọn khi logout. Không dùng public CDN cache cho ảnh riêng tư nếu chưa có cơ chế cấp quyền tương ứng.

Đo `prepare_ms`, bytes trước/sau, `upload_ms`, `normalize_ms`, thời gian chờ variant, download/decode và time-to-first-image; tách p50/p95 theo thiết bị, mạng, cache hit/miss. Không log ảnh, base64, token hoặc URL có credential. Đo AI latency riêng để tránh quy kết mọi thời gian chờ cho mạng.

## 5. Quyết định kỹ thuật

| Quyết định                              | Lý do                                                 | Đánh đổi                                                     |
| --------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------ |
| Nén tại Expo trước upload               | Giảm bytes trên đường mạng người dùng                 | Tốn CPU/pin; cần benchmark thiết bị yếu                      |
| Source 2048 riêng với thumbnail/display | Không đưa thumbnail vào AI, giữ khả năng đọc chi tiết | Hóa đơn dài/chữ nhỏ có thể vẫn cần profile cao hơn           |
| Variants bất đồng bộ và tạo sẵn         | Không tăng đường chờ lưu, GET không phải encode       | Có khoảng thời gian placeholder/fallback; cần durable worker |
| Server decode và encode source          | Kiểm tra ảnh thật, thống nhất hướng/MIME, bỏ metadata | Thêm CPU và mất mát do encode lần hai                        |
| Chỉ lưu source đã chuẩn bị              | Tránh upload camera original và nhân bản storage      | Không thể tái xử lý ở độ phân giải cao hơn source            |

## 6. Kiểm chứng và triển khai

### Kiểm chứng

Thiết kế đã được đối chiếu với source hiện tại; chưa có bằng chứng runtime hoặc benchmark cho pipeline đề xuất. Các kịch bản nghiệm thu cần thực hiện:

- Expo: ảnh ngang/dọc, EXIF rotation, mirrored camera, picker HEIC, alpha, ảnh nhỏ và ảnh lớn; output byte khớp reservation; retry dùng cùng file; Retake/cancel bỏ kết quả muộn; lỗi prepare/upload giữ amount và caption.
- Server: decode ảnh hỏng/truncated hoặc giả MIME; pixel bomb; quá byte; concurrency PUT; crash sau ghi object/trước commit; job lease/retry; variant thiếu; ownership/304; metadata GPS bị loại; cleanup không xóa media đang gắn expense.
- E2E hai use case: Use photo → upload source → AI đọc source, lưu không chờ AI; mở journal → đúng variant và ít byte hơn source; auth refresh/logout, cache, mạng chậm/mất mạng và client cũ vẫn tải được content.
- Benchmark cùng tập ảnh camera, đồ ăn, hóa đơn chữ nhỏ và hóa đơn dài trên thiết bị yếu/trung bình, Expo web/native; ít nhất 30 lượt mỗi cấu hình mạng 1/5/20 Mbps, cố định RTT, tách cache lạnh/ấm. So với baseline nguyên ảnh, mục tiêu thử nghiệm là giảm ít nhất 60% upload bytes và 70% display bytes theo median, giảm ít nhất 30% p95 tổng thời gian tới source ready trên mạng 1 Mbps, không làm p95 mạng nhanh tăng quá 200 ms.
- Chạy nhận diện cùng model/prompt trên ảnh trước và sau nén, so độ chính xác amount/currency/merchant với nhãn chuẩn; mục tiêu thử nghiệm không giảm quá 1 điểm phần trăm accuracy amount. Chốt tập dữ liệu và cỡ mẫu đủ tin cậy trước khi quyết định bật mặc định; nếu thất bại, tăng source resolution/quality thay vì dùng thumbnail hoặc chấp nhận mất chi tiết âm thầm.

### Triển khai

Migration additive → server hỗ trợ contract mới và worker → benchmark/load-test → Expo prepare/upload sớm và chọn variants qua feature flag → backfill ảnh cũ theo batch giới hạn. Cập nhật `.env.example` và API docs khi thêm cấu hình/contract. Ảnh cũ giữ source và fallback trong lúc backfill; không chuyển toàn bộ dữ liệu ngay trong migration. Rollback bằng tắt flag Expo/variant selection, giữ endpoint source và schema bổ sung; không drop dữ liệu đã tạo. Rollback không khôi phục camera original hoặc chi tiết đã mất do nén.

## 7. Vấn đề chưa chốt

| Rủi ro                                            | Điều kiện trước bật production                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------ |
| 2048 px làm mất chữ nhỏ; hai lần JPEG encode      | Benchmark AI và kiểm tra bằng mắt; chọn lại profile nếu không đạt              |
| CPU nén làm thiết bị yếu chậm hoặc server quá tải | Đo end-to-end và peak memory ở concurrency dự kiến; chốt timeout/capacity      |
| API Expo và codec khác nhau giữa native/web       | Kiểm tra orientation, metadata và HEIC trên từng target phát hành              |
| Retention media chưa được chốt                    | Chốt thời gian giữ media không còn tham chiếu trước khi bật cleanup production |

## 8. Tham chiếu

- [DEV-47 — Thiết kế nén ảnh upload và biến thể hiển thị mobile](https://linear.app/devtvn/issue/DEV-47).
- [Backend design](./01-backend.md).
- [Expo ImageManipulator](https://docs.expo.dev/versions/latest/sdk/imagemanipulator/): dùng API contextual `ImageManipulator.manipulate`, render và save; quality không bảo đảm kích thước byte.
- [Sharp orientation](https://sharp.pixelplumbing.com/api-operation/), [resize](https://sharp.pixelplumbing.com/api-resize/), [input limits](https://sharp.pixelplumbing.com/api-constructor/): cơ sở chọn adapter server; cần kiểm chứng với phiên bản sẽ cài.
