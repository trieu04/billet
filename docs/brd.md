# Billet — Business Requirements Document

Phiên bản 0.1 · Ngày 14/10/2026 · **Bản nháp để review, chưa phê duyệt phạm vi phát hành** · [DEV-21](https://linear.app/devtvn/issue/DEV-21).

BRD xác định giá trị sản phẩm, phạm vi và kết quả nghiệp vụ cần đạt. Nguồn tham chiếu: [product context](../README.md), [thiết kế iOS](https://www.figma.com/design/80rXESXakYSS23nyN8NcT7/Billet?node-id=8-102) và [thiết kế backend](./backend-design.md). Tài liệu không mô tả schema, API hoặc cách triển khai.

Định hướng “visual expense journal — Locket meets Money Tracker” đã có trong dự án. Phân nhóm người dùng, thứ tự phát hành, quy tắc còn mở và các chỉ tiêu dưới đây là đề xuất cần review, không phải kết quả nghiên cứu thị trường hay cam kết đã được xác nhận.

## 1. Bối cảnh và cơ hội

Ghi chép chi tiêu thường đòi hỏi người dùng dừng việc đang làm để nhập thông tin. Nếu trì hoãn, họ dễ quên khoản nhỏ và mất ngữ cảnh của khoản chi. Một danh sách con số cũng khó gợi nhớ vì sao đã chi hoặc trải nghiệm đó có ý nghĩa gì.

Billet đặt ảnh và câu chuyện ngắn bên cạnh số tiền: chụp hóa đơn, lưu một bữa ăn hoặc ghi lại một lần mua sắm; dữ liệu chi tiêu được tổng hợp để người dùng xem lại và hiểu thói quen của mình.

Giả thuyết sản phẩm là trải nghiệm ghi nhận ít thao tác, có tính cá nhân sẽ giúp duy trì thói quen tốt hơn. Giả thuyết này cần được kiểm chứng bằng thử nghiệm người dùng; chưa có số liệu xác nhận trong dự án.

### Giá trị cốt lõi

- **Ghi ngay:** tạo khoản chi lúc trải nghiệm còn mới, không cần hoàn thiện mọi thông tin.
- **Nhớ lại được:** ảnh và caption giúp hiểu bối cảnh, không chỉ nhìn số tiền.
- **Hiểu chi tiêu:** nhật ký, lịch, thống kê và ngân sách phản ánh cùng dữ liệu đáng tin cậy.
- **Giữ quyền kiểm soát:** người dùng quyết định nội dung đã lưu; gợi ý tự động có thể sửa hoặc bỏ qua.

## 2. Mục tiêu và cách đo thành công

| Mục tiêu                         | Kết quả mong muốn                                                  | Chỉ số theo dõi                                                         |
| -------------------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| G1 — Giảm công sức ghi nhận      | Người dùng lưu được khoản chi mà không bị buộc nhập nhiều metadata | Thời gian hoàn thành; tỷ lệ hoàn thành luồng ghi nhận                   |
| G2 — Hình thành thói quen        | Người dùng quay lại ghi chép qua nhiều ngày                        | Tỷ lệ kích hoạt; số ngày ghi chép mỗi tuần; duy trì D7/D30              |
| G3 — Tăng khả năng hiểu chi tiêu | Người dùng xem lại lịch sử và nhận biết khoản chi, nhóm chi tiêu   | Tỷ lệ xem lịch/thống kê; phản hồi về khả năng tìm và hiểu khoản chi     |
| G4 — Tạo niềm tin vào dữ liệu    | Tổng tiền đúng, chỉnh sửa được phản ánh đầy đủ, dữ liệu riêng tư   | Sai lệch đối soát; khoản chi trùng; lỗi lưu và sự cố truy cập trái phép |

Định nghĩa đo lường đề xuất:

- **Kích hoạt:** tài khoản mới có khoản chi đầu tiên được lưu thành công trong 24 giờ từ khi tạo tài khoản.
- **Hoàn thành ghi nhận:** số phiên bắt đầu tạo khoản chi và lưu thành công trong 30 phút, chia cho tổng phiên bắt đầu. Một lần thử lại trong cùng phiên không được đếm thành nhiều khoản thành công.
- **Thời gian ghi nhận:** từ mở luồng tạo đến xác nhận đã lưu; báo cáo trung vị và nhóm 10% chậm nhất, tách nhập tay với ảnh, tách trạng thái mạng và nhận diện lỗi.
- **D7/D30:** tỷ lệ người đã kích hoạt có hoạt động có ý nghĩa vào ngày 7/30 sau kích hoạt; hoạt động gồm lưu khoản chi hoặc xem nhật ký/thống kê, không chỉ mở app hay nhận thông báo. Báo cáo thêm tỷ lệ thực sự ghi khoản chi để tránh nhầm xem với ghi.
- **Số ngày ghi chép:** số ngày địa phương có ít nhất một khoản chi được tạo thành công trong tuần; không dùng ngày chi tiền được nhập lùi để đo hành vi quay lại.

Chưa đặt ngưỡng tăng trưởng vì chưa có baseline. Product phụ trách đề xuất mục tiêu sau pilot và chốt trước đánh giá phát hành. Các chỉ số hành vi chỉ thu thập metadata cần thiết; không gửi ảnh, caption, nội dung hóa đơn hoặc thông tin tài chính chi tiết vào công cụ analytics.

## 3. Người dùng và các bên liên quan

### Người dùng mục tiêu — giả thuyết ban đầu

| Nhóm                                       | Nhu cầu chính                                              | Giá trị Billet cần chứng minh           |
| ------------------------------------------ | ---------------------------------------------------------- | --------------------------------------- |
| Người hay bỏ quên khoản chi nhỏ            | Ghi nhanh ngay sau mua hàng, ăn uống, đi lại               | Ít thao tác, nhập tay luôn dùng được    |
| Người muốn gắn chi tiêu với trải nghiệm    | Xem lại đã mua gì, ở đâu, vì sao đáng nhớ                  | Nhật ký có ảnh và caption dễ nhận biết  |
| Người theo dõi chi tiêu cá nhân theo tháng | Biết đã chi bao nhiêu, nhóm nào nhiều, còn ngân sách không | Tổng hợp nhất quán, dễ hiểu và sửa được |

Chưa mặc định phân khúc theo tuổi, nghề nghiệp hoặc mức thu nhập. Cần phỏng vấn/pilot để kiểm chứng ai có nhu cầu thường xuyên và điều gì khiến họ tiếp tục dùng.

### Vai trò trong dự án

| Vai trò                               | Trách nhiệm review                                                           |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| Product owner / người phụ trách dự án | Chốt mục tiêu, phạm vi, ưu tiên và quyết định còn mở                         |
| Thiết kế sản phẩm                     | Kiểm chứng luồng, nội dung, khả năng sử dụng và các trạng thái lỗi           |
| Đội phát triển                        | Đánh giá tính khả thi, chi phí tích hợp và ràng buộc nền tảng                |
| QA                                    | Chuyển tiêu chí nghiệp vụ thành kịch bản nghiệm thu, kiểm tra tính nhất quán |
| Vận hành / hỗ trợ                     | Quy trình xử lý lỗi dữ liệu, quyền riêng tư và yêu cầu tài khoản             |

Đây là vai trò, chưa phải phân công nhân sự. Không suy ra nhu cầu xây trang quản trị chỉ từ việc có người hỗ trợ vận hành.

## 4. Phạm vi và ưu tiên

### Phạm vi nền tảng

Repository có mobile, web và server. Đề xuất xác thực trải nghiệm ghi nhận trên mobile trước, dùng iOS làm tham chiếu thiết kế. Chưa mặc định web hoặc Android phải phát hành đồng thời hay có đầy đủ tính năng như iOS; phạm vi từng nền tảng cần được chốt trước lập kế hoạch phát hành.

Các yêu cầu nghiệp vụ về tiền, thời gian, quyền sở hữu và tổng hợp áp dụng nhất quán trên mọi nền tảng được đưa vào phạm vi.

### Phạm vi chức năng đề xuất

**P0:** cần cho bản thử nghiệm đầu tiên hoàn chỉnh về giá trị cốt lõi. **P1:** thuộc hướng sản phẩm nhưng có thể triển khai sau khi luồng cốt lõi ổn định. Thứ tự này chưa phải quyết định loại bỏ tính năng khỏi sản phẩm.

| Nhóm              | Phạm vi                                                         | Ưu tiên |
| ----------------- | --------------------------------------------------------------- | ------- |
| Tài khoản         | Truy cập tài khoản cá nhân, đăng xuất, khôi phục truy cập       | P0      |
| Ghi nhận          | Nhập tay, chụp/chọn ảnh, số tiền, thời gian, caption tùy chọn   | P0      |
| Nhận diện         | Gợi ý từ hóa đơn, cho phép sửa/bỏ qua, xử lý khi không đọc được | P0      |
| Nhật ký           | Xem khoản chi theo ngày, tổng ngày, chi tiết và ảnh             | P0      |
| Quản lý khoản chi | Sửa thông tin, xóa có xác nhận, không tạo trùng khi thử lại     | P0      |
| Lịch và thống kê  | Xem lịch tháng, tổng kỳ, biểu đồ và phân bổ danh mục            | P0      |
| Tùy chọn cơ bản   | Hồ sơ, múi giờ, tiền tệ mặc định theo loại được hỗ trợ          | P0      |
| Ngân sách         | Hạn mức tháng, đã chi, còn lại và vượt hạn mức                  | P1      |
| Nhắc ghi chép     | Bật/tắt và chọn giờ nhắc                                        | P1      |
| Cá nhân hóa       | Giao diện và khóa ứng dụng bằng sinh trắc trên thiết bị hỗ trợ  | P1      |
| Insight           | Nhận xét có bằng chứng về thói quen chi tiêu                    | P1      |
| Xuất dữ liệu      | Xuất thông tin chi tiêu thành CSV                               | P1      |

Quy trình xử lý yêu cầu xóa tài khoản/dữ liệu và thông báo quyền riêng tư cần được chốt trước thử nghiệm với người dùng bên ngoài; chưa mặc định phải có màn hình tự phục vụ trong P0.

### Ngoài phạm vi ban đầu

Chia sẻ xã hội, bạn bè, like/comment; ví và số dư tài khoản; đồng bộ ngân hàng; thu nhập, chuyển khoản nội bộ, hoàn tiền; chia bill; giao dịch định kỳ; danh mục tùy biến; quản lý từng món trong hóa đơn; quy đổi tỷ giá; kế toán doanh nghiệp hoặc tư vấn tài chính; đồng bộ chỉnh sửa offline hai chiều.

Mô hình thu phí, gói premium, quảng cáo và mục tiêu doanh thu chưa được xác định. BRD này không đặt yêu cầu thanh toán hoặc đăng ký thuê bao.

## 5. Hành trình nghiệp vụ chính

| Hành trình                 | Luồng chính                                                                                 | Ngoại lệ phải xử lý                                                           |
| -------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| J1 — Bắt đầu               | Truy cập tài khoản → hiểu cách ghi nhận → lưu khoản chi đầu tiên → thấy trong nhật ký       | Chưa có dữ liệu cần lời hướng dẫn; lỗi tài khoản có cách xử lý                |
| J2 — Ghi nhanh             | Chụp/chọn ảnh hoặc nhập tay → kiểm tra tiền và thời gian → thêm caption nếu muốn → lưu      | Từ chối quyền camera, không có hóa đơn, nhận diện chậm/lỗi vẫn nhập tay được  |
| J3 — Xem lại và sửa        | Mở nhật ký/lịch → chọn khoản chi → sửa hoặc xóa → thấy kết quả cập nhật                     | Thay đổi từ thiết bị khác không bị ghi đè âm thầm; hủy xóa giữ nguyên dữ liệu |
| J4 — Hiểu chi tiêu         | Chọn kỳ → xem tổng và danh mục → so với kỳ trước → xem khoản chi liên quan qua nhật ký/lịch | Kỳ rỗng hoặc chưa có cơ sở so sánh phải thể hiện rõ                           |
| J5 — Duy trì thói quen     | Đặt ngân sách/giờ nhắc → ghi thêm khoản chi → xem mức sử dụng                               | Tắt quyền thông báo hoặc vượt ngân sách không chặn ghi nhận                   |
| J6 — Mang dữ liệu ra ngoài | Chọn phạm vi xuất → chờ hoàn tất → tải file                                                 | Tác vụ lỗi hoặc liên kết hết hạn có hướng thử lại                             |

Luồng ghi nhận thành công kết thúc khi khoản chi được xác nhận đã lưu và có thể xem lại. Chụp ảnh, tải ảnh hoặc nhận diện xong chưa được coi là đã ghi chi tiêu.

## 6. Yêu cầu chức năng và tiêu chí nghiệm thu

Mã yêu cầu dùng để liên kết với thiết kế, backlog và kiểm thử. Ưu tiên theo mục 4; tiêu chí dưới đây mô tả kết quả người dùng nhận được, không quy định giải pháp kỹ thuật.

### Tài khoản và ghi nhận

| Mã    | Yêu cầu                                                            | Tiêu chí nghiệm thu                                                                                                                                           |
| ----- | ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-01 | Người dùng truy cập tài khoản cá nhân và có thể khôi phục truy cập | Có thể đăng nhập, đăng xuất và đi qua quy trình khôi phục; người chưa xác thực không xem được nhật ký cá nhân                                                 |
| FR-02 | Tạo khoản chi bằng nhập tay                                        | Không bắt buộc ảnh, caption, cửa hàng hoặc GPS; tiền và thời gian hợp lệ thì lưu được; khoản mới xuất hiện trong ngày tương ứng                               |
| FR-03 | Chụp hoặc chọn ảnh để ghi nhận                                     | Có preview và chụp/chọn lại; hủy trước lưu không tạo khoản chi; từ chối camera vẫn có lựa chọn nhập tay                                                       |
| FR-04 | Nhận gợi ý từ hóa đơn                                              | Có trạng thái đang xử lý/thất bại; mọi gợi ý có thể sửa hoặc bỏ qua; nhận diện lỗi không chặn nhập tay; kết quả muộn không đổi nội dung người dùng đã sửa/lưu |
| FR-05 | Lưu ảnh và caption cùng khoản chi                                  | Sau lưu, mở chi tiết thấy đúng ảnh và caption; caption trống vẫn hợp lệ; ghi nhận một ảnh mỗi khoản ở MVP                                                     |
| FR-06 | Biết rõ trạng thái lưu và thử lại an toàn                          | Phân biệt chưa lưu, đang lưu, đã lưu và lỗi; mất mạng không báo thành công; thử lại cùng thao tác không tạo thêm khoản chi                                    |

### Nhật ký và tổng hợp

| Mã    | Yêu cầu                        | Tiêu chí nghiệm thu                                                                                                                                           |
| ----- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-07 | Xem nhật ký theo thời gian     | Hiển thị khoản chi, thời gian, tiền và ảnh nếu có; tổng ngày/số khoản tính đủ dữ liệu, không phụ thuộc phần danh sách đang hiển thị                           |
| FR-08 | Xem và sửa chi tiết            | Sửa được tiền, caption, danh mục, cửa hàng, thời gian và địa điểm tùy chọn; thông tin không sửa được giữ nguyên; dữ liệu đổi đồng thời phải có thông báo      |
| FR-09 | Xóa khoản chi                  | Có xác nhận và khả năng hủy trước khi xóa; sau xác nhận khoản chi không còn trong nhật ký hoặc tổng; thử lại yêu cầu lưu cũ không làm khoản chi xuất hiện lại |
| FR-10 | Xem lịch chi tiêu theo tháng   | Có tổng tháng, số khoản/tổng theo ngày và ảnh đại diện khi có; chọn ngày xem đúng các khoản thuộc ngày đó; ngày trống không bị coi là lỗi                     |
| FR-11 | Xem thống kê tuần/tháng/năm    | Tổng, biểu đồ theo thời gian và phân bổ danh mục khớp nhật ký cùng phạm vi; kỳ không có chi tiêu hiển thị phù hợp                                             |
| FR-12 | So sánh với kỳ trước           | Thể hiện khoảng so sánh; kỳ trước bằng không báo chưa có cơ sở tính phần trăm; không đưa số phần trăm vô nghĩa                                                |
| FR-13 | Nhận insight về thói quen — P1 | Nhận xét có khoảng thời gian và dữ liệu hỗ trợ; dữ liệu ít thì không khẳng định thói quen; suy đoán như “bữa trưa” phải thể hiện là ước tính                  |

### Quản lý cá nhân

| Mã    | Yêu cầu                               | Tiêu chí nghiệm thu                                                                                                                                            |
| ----- | ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-14 | Đặt và xem ngân sách tháng — P1       | Nhập hạn mức dương; thấy đã chi/còn lại đúng; chưa đặt ngân sách có trạng thái riêng; vượt hạn mức vẫn lưu khoản chi được                                      |
| FR-15 | Quản lý tùy chọn cá nhân              | Xem hồ sơ, số khoản đã ghi, múi giờ và tiền tệ mặc định được hỗ trợ; đổi tiền tệ mặc định không biến đổi khoản chi cũ                                          |
| FR-16 | Nhắc ghi chép theo giờ lựa chọn — P1  | Bật/tắt hoặc đổi giờ có hiệu lực với lịch tiếp theo; không tạo hai thông báo nhắc trong hộp thư cho cùng ngày; không hứa nhận push nếu thiết bị chặn thông báo |
| FR-17 | Cá nhân hóa hiển thị và khóa app — P1 | Giao diện theo lựa chọn; chỉ đề nghị khóa sinh trắc khi thiết bị hỗ trợ; không bật được sinh trắc vẫn có cách truy cập tài khoản hợp lệ                        |
| FR-18 | Xuất dữ liệu — P1                     | Chọn phạm vi, biết trạng thái, tải CSV khi hoàn tất; dữ liệu khớp thời điểm xuất được công bố; file lỗi/hết hạn không hiển thị là sẵn sàng                     |

## 7. Quy tắc nghiệp vụ

| Mã    | Quy tắc                                                                                                                                                           |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| BR-01 | Khoản chi thuộc một người dùng; mọi dữ liệu kèm theo cũng phải thuộc quyền sử dụng của người đó. Nhật ký mặc định riêng tư.                                       |
| BR-02 | Đề xuất chỉ ghi nhận khoản chi có tiền lớn hơn không và thời gian hợp lệ. Không dùng số không thay cho chưa biết tiền. Số âm/hoàn tiền nằm ngoài phạm vi ban đầu. |
| BR-03 | Một khoản chi có một loại tiền. Tổng hợp và ngân sách không cộng trực tiếp khác loại tiền; thay mặc định chỉ ảnh hưởng khoản mới.                                 |
| BR-04 | Thời điểm chi tiền quyết định ngày/tháng của báo cáo, có thể khác ngày ghi nhận. Các phần tổng hợp dùng cùng múi giờ tài khoản.                                   |
| BR-05 | Danh mục ban đầu phẳng, có “Khác” cho khoản chưa phân loại. Một khoản không được cộng vào hai danh mục; danh sách cụ thể cần chốt.                                |
| BR-06 | Người dùng quyết định dữ liệu đã lưu. Gợi ý nhận diện không phải sự thật chắc chắn và không tự ghi đè chỉnh sửa.                                                  |
| BR-07 | Mỗi lần ghi nhận chỉ tạo một khoản chi dù có thử lại. Chụp lại/nhận diện lại không tự tăng tổng chi.                                                              |
| BR-08 | Sửa hoặc xóa phải cập nhật nhật ký, lịch, thống kê, ngân sách và số khoản trong hồ sơ. Đổi ngày phải cập nhật cả ngày cũ và mới.                                  |
| BR-09 | Tuần bắt đầu thứ Hai. Đề xuất so kỳ đang diễn ra với cùng phần đã trôi qua của kỳ trước; kỳ đã đóng so toàn kỳ. Tháng ngắn hơn được giới hạn ở ngày cuối tháng.   |
| BR-10 | Ngân sách là hạn mức tham khảo theo tháng/loại tiền; số còn lại có thể âm. Không tự lặp hạn mức hoặc chuyển số dư giữa các tháng khi chưa có yêu cầu.             |
| BR-11 | “Số khoảnh khắc đã lưu” đề xuất là số khoản chi còn hiệu lực, gồm nhập tay; không phải số ảnh hoặc số lần nhận diện.                                              |
| BR-12 | Bản nháp/chưa đồng bộ được phân biệt với khoản đã lưu. Tổng chính thức chỉ tính dữ liệu đã được xác nhận lưu.                                                     |
| BR-13 | Quyền camera, ảnh, vị trí, thông báo và sinh trắc được xin theo ngữ cảnh. Từ chối quyền không làm mất khả năng ghi nhận bằng nhập tay.                            |
| BR-14 | File xuất gồm dữ liệu chi tiêu trong phạm vi người dùng chọn; MVP chưa kèm ảnh, bí mật tài khoản hoặc dữ liệu nhận diện thô.                                      |

Quy tắc đề xuất trong BRD và thiết kế backend cần được cập nhật cùng nhau khi có quyết định khác. Một bản thiết kế đã có không tự biến giả định thành yêu cầu đã được duyệt.

## 8. Yêu cầu chất lượng

| Mã     | Yêu cầu                     | Cách nghiệm thu                                                                                                                                                                        |
| ------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-01 | Đúng và nhất quán           | Đối soát cùng dữ liệu trên nhật ký/lịch/thống kê/ngân sách, trước và sau sửa/xóa; không chấp nhận sai tiền hoặc khoản trùng trong kịch bản nghiệm thu                                  |
| NFR-02 | Phản hồi rõ ràng            | Mọi tác vụ chờ có trạng thái; nhận diện không khóa thao tác nhập; lỗi giữ thông tin đang nhập trong phiên để thử lại                                                                   |
| NFR-03 | Hiệu năng phù hợp ghi nhanh | Đo riêng thời gian phản hồi, upload, nhận diện và lưu trên thiết bị/mạng đại diện; ngưỡng và bộ điều kiện đo cần chốt trước pilot, không lấy thời gian OCR làm điều kiện chặn nhập tay |
| NFR-04 | Riêng tư và quyền truy cập  | Kiểm tra chéo hai tài khoản: không xem/sửa/xóa/tải dữ liệu của nhau; ảnh/file không công khai; không lộ thông tin cá nhân qua log hoặc analytics                                       |
| NFR-05 | Khả năng phục hồi           | Mất mạng/thử lại/đóng mở app không báo lưu thành công giả; khoản đã xác nhận lưu có thể xem lại; đề xuất giữ draft qua lần mở app, cần kiểm chứng trên nền tảng phát hành              |
| NFR-06 | Dễ tiếp cận và bản địa hóa  | Nhãn điều khiển rõ, đọc được tiền/ngày, không chỉ dùng màu để truyền đạt; luồng chính dùng được với trình đọc màn hình; web có bàn phím nếu thuộc scope phát hành                      |
| NFR-07 | Minh bạch dữ liệu           | Có chính sách về xử lý ảnh, nhà cung cấp nhận diện, thời hạn lưu/xóa và file xuất; quy trình yêu cầu xóa tài khoản/dữ liệu được xác định trước thử nghiệm bên ngoài                    |

Độ sẵn sàng dịch vụ, thời gian khôi phục và mức mất dữ liệu tối đa cần được Product và vận hành thống nhất theo quy mô thử nghiệm. Không tự coi các ngưỡng chưa xác định là đã đạt hoặc dùng BRD này như cam kết SLA.

## 9. Dữ liệu nghiệp vụ

| Đối tượng             | Ý nghĩa với người dùng                                                 |
| --------------------- | ---------------------------------------------------------------------- |
| Tài khoản và tùy chọn | Danh tính cá nhân, cách hiển thị và nhận nhắc                          |
| Khoản chi             | Một lần chi tiêu có số tiền, thời gian, danh mục và ngữ cảnh tùy chọn  |
| Ảnh/caption           | Thông tin gợi nhớ trải nghiệm, không thay thế giá trị tiền đã xác nhận |
| Gợi ý nhận diện       | Thông tin hệ thống đề xuất để giảm nhập liệu                           |
| Ngân sách             | Hạn mức người dùng đặt để đối chiếu trong một tháng                    |
| Thông báo             | Lời nhắc theo lựa chọn của người dùng                                  |
| File xuất             | Bản dữ liệu chi tiêu trong phạm vi và thời điểm xác định               |

Không yêu cầu thu thập vị trí chính xác để ghi chi tiêu. Không lưu dữ liệu sinh trắc của thiết bị. Chính sách giữ ảnh bỏ dở, khoản đã xóa và file xuất phải được duyệt; các thời hạn trong tài liệu backend hiện là đề xuất kỹ thuật.

## 10. Nghiệm thu nghiệp vụ

Product và QA dùng các kịch bản sau để đánh giá; đây là tiêu chí cho sản phẩm tương lai, chưa phải các kiểm thử sản phẩm đã chạy trong lần viết BRD.

| Kịch bản                                                   | Kết quả mong đợi                                                        | Yêu cầu liên quan                 |
| ---------------------------------------------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| Tài khoản mới chưa có khoản chi                            | Có hướng dẫn ghi khoản đầu tiên, không tạo sẵn số chi giả               | FR-01, FR-02, FR-07               |
| Tạo ba khoản 58.000, 95.000 và 95.000 VND cùng ngày        | Tổng 248.000 VND, số khoản 3 trên các nơi liên quan                     | FR-07, FR-10, FR-11; BR-03, BR-08 |
| Sửa khoản 58.000 thành 60.000, sau đó xóa một khoản 95.000 | Tổng lần lượt 250.000 rồi 155.000; số khoản cuối là 2                   | FR-08, FR-09; BR-08               |
| OCR lỗi hoặc trả kết quả sau khi người dùng sửa            | Vẫn lưu bằng nhập tay; giá trị đã sửa không bị thay đổi                 | FR-02, FR-04; BR-06               |
| Mạng lỗi ngay sau khi bấm lưu, người dùng thử lại          | Chỉ có một khoản chi; trạng thái cuối phản ánh đúng kết quả             | FR-06; BR-07                      |
| Chuyển khoản chi sang ngày thuộc tháng khác                | Ngày/tháng cũ giảm đúng, ngày/tháng mới tăng đúng                       | FR-08, FR-10, FR-11; BR-04, BR-08 |
| Chưa có chi tiêu kỳ trước hoặc ngân sách bị vượt           | Không chia cho không; phần ngân sách còn lại âm và vẫn ghi thêm được    | FR-12, FR-14                      |
| Người dùng B mở khoản chi/ảnh/file của A                   | B không truy cập được dữ liệu                                           | BR-01; NFR-04                     |
| Tắt nhắc hoặc đổi giờ — P1                                 | Lịch sau thay đổi đúng, không tạo nhắc lặp cùng ngày                    | FR-16                             |
| Xuất trong lúc lịch sử đang được sửa — P1                  | File nhất quán với thời điểm xuất được công bố; chỉ chủ sở hữu tải được | FR-18; BR-14                      |

### Điều kiện chuyển sang thử nghiệm người dùng

- Các yêu cầu P0 trong phạm vi nền tảng đã chọn có bằng chứng nghiệm thu; không còn lỗi gây sai tiền, mất khoản đã lưu, tạo trùng hoặc truy cập chéo tài khoản.
- Luồng ghi nhận, nhận diện lỗi, mất mạng, sửa/xóa và dữ liệu rỗng đã được kiểm chứng trên thiết bị đại diện.
- Các quyết định chặn phát hành ở mục 12 được chốt hoặc có giới hạn phạm vi được Product chấp nhận rõ ràng.
- Có người phụ trách hỗ trợ, cách tiếp nhận lỗi và cơ chế đo các chỉ số đã thống nhất.
- Tính năng P1 chưa hoàn thành được ghi rõ, không trình bày như khả năng đã có. Việc duyệt BRD, duyệt UAT và quyết định phát hành là ba bước riêng.

## 11. Phụ thuộc và rủi ro

| Phụ thuộc / rủi ro                               | Ảnh hưởng                                   | Hướng xử lý nghiệp vụ                                                                                     |
| ------------------------------------------------ | ------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Chất lượng hóa đơn/nhận diện không ổn định       | Gợi ý sai hoặc người dùng mất thời gian sửa | Luôn cho nhập tay; đo tỷ lệ chấp nhận/sửa gợi ý; thử trên hóa đơn thực tế được phép sử dụng               |
| Người dùng quên ghi hoặc thấy quá nhiều thao tác | Dữ liệu thiếu, khó hình thành thói quen     | Giảm thông tin bắt buộc; pilot luồng ghi nhận trước mở rộng tính năng                                     |
| Mạng, quyền camera hoặc thông báo bị chặn        | Luồng chụp/nhắc không hoàn tất              | Có phương án nhập tay, trạng thái rõ và thử lại; không hứa nhắc offline                                   |
| Phân loại chưa thống nhất                        | Biểu đồ gây hiểu nhầm                       | Chốt bộ danh mục và cách diễn giải insight trước nghiệm thu                                               |
| Chi phí lưu ảnh và nhận diện                     | Khó duy trì dịch vụ khi tăng sử dụng        | Đánh giá chi phí trên mỗi người dùng/ảnh trong pilot; quota nếu có phải được Product duyệt và thể hiện rõ |
| Ảnh chứa dữ liệu nhạy cảm                        | Rủi ro riêng tư và mất niềm tin             | Giới hạn thu thập, chọn nhà cung cấp phù hợp, minh bạch xử lý/xóa dữ liệu                                 |
| Phạm vi mobile/web chưa chốt                     | Kế hoạch và tiêu chí nghiệm thu bị mở rộng  | Chốt nền tảng phát hành và mức tương đương chức năng trước ước lượng                                      |

Các chức năng xác thực, thông báo và realtime đã có nền tảng kỹ thuật; điều đó chưa chứng minh hành trình sản phẩm tương ứng đã hoàn chỉnh. Cần kiểm chứng tích hợp thực tế, không nghiệm thu chỉ bằng sự hiện diện của module.

## 12. Giả định và quyết định cần chốt

| Mã  | Quyết định                                         | Đề xuất hiện tại                                      | Thời điểm cần chốt                      |
| --- | -------------------------------------------------- | ----------------------------------------------------- | --------------------------------------- |
| D1  | Người dùng và nền tảng thử nghiệm đầu tiên         | Cá nhân ghi chi tiêu trên mobile, iOS làm tham chiếu  | Trước lập kế hoạch pilot                |
| D2  | Điều kiện lưu khi chưa có số tiền                  | Chưa ghi thành khoản chính thức; giữ nháp             | Trước chốt luồng ghi nhận               |
| D3  | Loại tiền được hỗ trợ                              | VND cho MVP; không quy đổi                            | Trước chốt phạm vi P0                   |
| D4  | Danh mục và nhận xét về bữa ăn                     | Danh mục phẳng; insight suy ra phải ghi là ước tính   | Trước hoàn thiện thống kê               |
| D5  | Múi giờ và kỳ so sánh                              | Theo tài khoản; so cùng phần kỳ trước                 | Trước nghiệm thu tổng hợp               |
| D6  | Độ bền draft offline và nhiều thiết bị             | Giữ nháp; chưa hỗ trợ sửa offline hai chiều           | Trước nghiệm thu mất mạng               |
| D7  | Cách lặp ngân sách và nhắc                         | Ngân sách đặt từng tháng, một lịch nhắc/ngày          | Trước triển khai P1 tương ứng           |
| D8  | Xóa tài khoản, retention và nhà cung cấp nhận diện | Cần chính sách và quy trình rõ; chưa chốt thời hạn    | Trước thử nghiệm bên ngoài              |
| D9  | KPI, hiệu năng và điều kiện đo                     | Thu baseline pilot; chốt ngưỡng hiệu năng trước pilot | Trước pilot và trước đánh giá phát hành |
| D10 | Mức đầu tư, lịch phát hành, người phê duyệt        | Chưa xác định; không suy ra từ roadmap kỹ thuật       | Trước cam kết kế hoạch                  |

Product owner chốt các quyết định cùng thiết kế, phát triển và vận hành tùy nội dung. Chưa có người được chỉ định hoặc ngày cam kết trong BRD này.

## 13. Sử dụng và cập nhật BRD

Sau review, mỗi nhóm yêu cầu được chuyển thành công việc triển khai và liên kết bằng mã FR/BR/NFR. Những thay đổi ảnh hưởng mục tiêu, phạm vi, quy tắc hoặc quyền riêng tư cần ghi lại quyết định và cập nhật tiêu chí nghiệm thu liên quan.

BRD mô tả sản phẩm cần đạt điều gì; Figma mô tả trải nghiệm; [thiết kế backend](./backend-design.md) mô tả cách tổ chức kỹ thuật. Khi các tài liệu không khớp, chốt quyết định nghiệp vụ rồi đồng bộ tài liệu, không tự coi tài liệu nào mới hơn là đã được phê duyệt.
