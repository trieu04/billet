import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { SiteShell } from '@/features/marketing/site-shell'

type Section = { title: string; content: ReactNode }

const contactEmail = 'trieu.tq@fayedark.com'

const terms: Section[] = [
  {
    title: '1. Chủ thể cung cấp dịch vụ và phạm vi áp dụng',
    content: (
      <p>
        Billet do cá nhân Trương Quốc Triệu cung cấp và vận hành (“Billet”, “chúng tôi”). Điều khoản
        này điều chỉnh việc truy cập và sử dụng ứng dụng di động, ứng dụng web, API và các dịch vụ
        liên quan của Billet (“Dịch vụ”). Chính sách quyền riêng tư là một phần của Điều khoản này.
      </p>
    ),
  },
  {
    title: '2. Chấp nhận Điều khoản',
    content: (
      <p>
        Bằng việc tạo tài khoản, chọn đồng ý hoặc tiếp tục sử dụng Dịch vụ sau khi Điều khoản có
        hiệu lực, bạn xác nhận đã đọc, hiểu và đồng ý bị ràng buộc bởi Điều khoản cùng{' '}
        <Link to="/privacy">Chính sách quyền riêng tư</Link>. Nếu không đồng ý, bạn không được tạo
        tài khoản hoặc sử dụng Dịch vụ.
      </p>
    ),
  },
  {
    title: '3. Điều kiện sử dụng và tài khoản',
    content: (
      <>
        <p>Bạn phải từ đủ 16 tuổi để tự tạo tài khoản. Khi sử dụng Billet, bạn đồng ý:</p>
        <ul>
          <li>Cung cấp thông tin chính xác, cập nhật và không mạo danh người khác.</li>
          <li>Bảo mật mật khẩu, mã xác minh, token và thiết bị đăng nhập.</li>
          <li>Thông báo ngay cho chúng tôi khi nghi ngờ tài khoản bị truy cập trái phép.</li>
          <li>
            Chịu trách nhiệm với hoạt động được thực hiện qua tài khoản của mình trong phạm vi pháp
            luật cho phép.
          </li>
        </ul>
      </>
    ),
  },
  {
    title: '4. Dịch vụ Billet',
    content: (
      <p>
        Billet là nhật ký chi tiêu trực quan, cho phép bạn nhập, lưu, phân loại và xem lại khoản
        chi, ảnh, chú thích, ngân sách và báo cáo. Một số tính năng có thể dùng xử lý tự động để đưa
        ra gợi ý; bạn phải kiểm tra dữ liệu trước khi lưu. Billet không phải ngân hàng, tổ chức tín
        dụng, trung gian thanh toán hay đơn vị tư vấn tài chính, thuế, kế toán hoặc pháp lý.
      </p>
    ),
  },
  {
    title: '5. Nội dung và dữ liệu của bạn',
    content: (
      <>
        <p>
          Bạn giữ quyền sở hữu đối với ảnh, chú thích, thông tin chi tiêu và nội dung khác do bạn
          cung cấp (“Nội dung người dùng”). Bạn cấp cho Billet quyền không độc quyền, miễn phí bản
          quyền và có phạm vi cần thiết để lưu trữ, sao chép, xử lý, truyền tải, tạo bản hiển thị và
          sao lưu Nội dung người dùng nhằm cung cấp, bảo mật, hỗ trợ và cải thiện Dịch vụ theo Chính
          sách quyền riêng tư. Quyền này chấm dứt khi nội dung được xóa khỏi hệ thống hoạt động, trừ
          bản sao cần lưu theo pháp luật hoặc chu kỳ sao lưu kỹ thuật.
        </p>
        <p>
          Bạn cam kết có quyền cung cấp Nội dung người dùng và nội dung đó không vi phạm pháp luật,
          quyền riêng tư, quyền sở hữu trí tuệ hoặc quyền hợp pháp của người khác.
        </p>
      </>
    ),
  },
  {
    title: '6. Quyền sở hữu của Billet',
    content: (
      <p>
        Dịch vụ, mã nguồn, thiết kế, giao diện, nhãn hiệu, tài liệu và nội dung do Billet tạo ra
        được bảo vệ bởi pháp luật sở hữu trí tuệ. Chúng tôi cấp cho bạn quyền có giới hạn, có thể
        thu hồi, không độc quyền và không chuyển nhượng để sử dụng Dịch vụ cho mục đích cá nhân, phi
        thương mại theo Điều khoản này.
      </p>
    ),
  },
  {
    title: '7. Hành vi bị cấm',
    content: (
      <>
        <p>Bạn không được:</p>
        <ul>
          <li>
            Sử dụng Dịch vụ cho mục đích trái pháp luật, gian lận hoặc xâm phạm quyền của người
            khác.
          </li>
          <li>
            Truy cập trái phép tài khoản, hệ thống, API, dữ liệu hoặc khu vực không dành cho bạn.
          </li>
          <li>Phát tán mã độc, phá hoại, làm gián đoạn hoặc tạo tải bất thường lên Dịch vụ.</li>
          <li>
            Thu thập tự động, sao chép, bán lại hoặc khai thác thương mại Dịch vụ khi chưa được cho
            phép bằng văn bản.
          </li>
          <li>Dịch ngược hoặc tìm cách lấy mã nguồn, trừ phạm vi pháp luật bắt buộc cho phép.</li>
        </ul>
      </>
    ),
  },
  {
    title: '8. Dịch vụ bên thứ ba',
    content: (
      <p>
        Billet có thể tích hợp đăng nhập Google hoặc Apple, dịch vụ gửi email, lưu trữ, hạ tầng và
        xử lý ảnh. Việc bạn sử dụng dịch vụ bên thứ ba còn chịu điều khoản của bên đó. Billet không
        kiểm soát và không chịu trách nhiệm cho sự cố phát sinh hoàn toàn từ hệ thống bên thứ ba,
        nhưng vẫn chịu trách nhiệm lựa chọn và quản lý bên xử lý dữ liệu theo pháp luật áp dụng.
      </p>
    ),
  },
  {
    title: '9. Thay đổi, gián đoạn và chấm dứt Dịch vụ',
    content: (
      <p>
        Chúng tôi có thể cập nhật, bảo trì, giới hạn hoặc ngừng một phần Dịch vụ vì lý do kỹ thuật,
        bảo mật, pháp lý hoặc sản phẩm. Khi có thể, chúng tôi sẽ thông báo hợp lý trước thay đổi ảnh
        hưởng đáng kể. Chúng tôi có thể tạm khóa hoặc chấm dứt tài khoản vi phạm Điều khoản, gây rủi
        ro cho người dùng hoặc hệ thống, hoặc theo yêu cầu của cơ quan có thẩm quyền.
      </p>
    ),
  },
  {
    title: '10. Xóa tài khoản',
    content: (
      <p>
        Bạn có thể yêu cầu xóa tài khoản và dữ liệu liên quan bằng cách gửi email từ địa chỉ gắn với
        tài khoản tới <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Chúng tôi có thể yêu
        cầu xác minh danh tính trước khi thực hiện. Việc xóa không thể hoàn tác và không ảnh hưởng
        đến dữ liệu mà pháp luật yêu cầu hoặc cho phép chúng tôi tiếp tục lưu giữ.
      </p>
    ),
  },
  {
    title: '11. Tuyên bố miễn trừ và giới hạn trách nhiệm',
    content: (
      <p>
        Trong phạm vi pháp luật cho phép, Dịch vụ được cung cấp trên cơ sở “như hiện có” và “tùy khả
        năng cung cấp”. Billet không bảo đảm Dịch vụ luôn liên tục, không có lỗi hoặc mọi gợi ý tự
        động đều chính xác. Bạn chịu trách nhiệm kiểm tra dữ liệu, duy trì bản sao cần thiết và đưa
        ra quyết định tài chính của mình. Không nội dung nào trong Điều khoản loại trừ trách nhiệm
        hoặc quyền người tiêu dùng mà pháp luật không cho phép loại trừ.
      </p>
    ),
  },
  {
    title: '12. Luật áp dụng và giải quyết tranh chấp',
    content: (
      <p>
        Điều khoản này được điều chỉnh bởi pháp luật Việt Nam. Hai bên ưu tiên giải quyết tranh chấp
        bằng thương lượng thiện chí. Nếu không giải quyết được, tranh chấp được đưa ra cơ quan hoặc
        tòa án có thẩm quyền theo pháp luật Việt Nam; các quyền khiếu nại và bảo vệ người tiêu dùng
        của bạn vẫn được bảo lưu.
      </p>
    ),
  },
  {
    title: '13. Thay đổi Điều khoản',
    content: (
      <p>
        Chúng tôi có thể cập nhật Điều khoản để phản ánh thay đổi của Dịch vụ hoặc pháp luật. Thay
        đổi quan trọng sẽ được thông báo qua Dịch vụ hoặc email trước khi có hiệu lực trong thời
        gian hợp lý. Nếu thay đổi cần sự đồng ý mới theo pháp luật, chúng tôi sẽ yêu cầu bạn đồng ý
        trước khi tiếp tục hoạt động xử lý liên quan.
      </p>
    ),
  },
  {
    title: '14. Liên hệ',
    content: (
      <p>
        Câu hỏi, khiếu nại hoặc thông báo pháp lý có thể gửi tới Trương Quốc Triệu qua{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
    ),
  },
]

const privacy: Section[] = [
  {
    title: '1. Bên kiểm soát dữ liệu',
    content: (
      <p>
        Trương Quốc Triệu, cá nhân cung cấp và vận hành Billet, là bên kiểm soát dữ liệu cá nhân đối
        với hoạt động được mô tả trong Chính sách này. Mọi yêu cầu về dữ liệu cá nhân có thể gửi tới{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
      </p>
    ),
  },
  {
    title: '2. Phạm vi và nguyên tắc xử lý',
    content: (
      <p>
        Chính sách áp dụng cho ứng dụng di động, web, API và dịch vụ liên quan của Billet. Chúng tôi
        xử lý dữ liệu đúng mục đích đã thông báo, trong phạm vi cần thiết, bảo đảm tính chính xác,
        giới hạn thời gian lưu và áp dụng biện pháp bảo vệ phù hợp. Dữ liệu chi tiêu và ảnh có thể
        phản ánh tình hình tài chính hoặc thông tin riêng tư của bạn và được bảo vệ tương ứng với
        mức độ nhạy cảm của chúng.
      </p>
    ),
  },
  {
    title: '3. Dữ liệu chúng tôi thu thập',
    content: (
      <>
        <ul>
          <li>
            <strong>Tài khoản và danh tính:</strong> tên đăng nhập, email, tên hiển thị, trạng thái
            xác minh và mã định danh từ Google hoặc Apple khi bạn chọn đăng nhập xã hội.
          </li>
          <li>
            <strong>Thông tin xác thực:</strong> mật khẩu đã băm, token phiên, mã xác minh, lịch sử
            đăng nhập và dữ liệu cần để bảo vệ tài khoản. Billet không lưu mật khẩu Google hoặc
            Apple của bạn.
          </li>
          <li>
            <strong>Dữ liệu tài chính do bạn cung cấp:</strong> khoản thu/chi, số tiền, loại tiền,
            thời gian, danh mục, ngân sách, thương hiệu, chú thích, nguồn dữ liệu và các tổng hợp
            liên quan.
          </li>
          <li>
            <strong>Ảnh và ngữ cảnh:</strong> ảnh hóa đơn hoặc ảnh bạn chọn, loại tệp, kích thước,
            metadata kỹ thuật và địa điểm nếu bạn chủ động cung cấp.
          </li>
          <li>
            <strong>Dữ liệu sử dụng và chẩn đoán:</strong> phiên bản ứng dụng, loại thiết bị, hệ
            điều hành, địa chỉ IP, thời điểm truy cập, sự kiện tính năng, hiệu năng, lỗi và nhật ký
            bảo mật.
          </li>
          <li>
            <strong>Trao đổi hỗ trợ:</strong> nội dung email, yêu cầu, phản hồi và tài liệu bạn gửi
            khi liên hệ với chúng tôi.
          </li>
        </ul>
        <p>
          Chúng tôi thu thập dữ liệu trực tiếp từ bạn, từ thiết bị khi bạn sử dụng Dịch vụ và từ nhà
          cung cấp đăng nhập khi bạn chủ động sử dụng tùy chọn đó.
        </p>
      </>
    ),
  },
  {
    title: '4. Mục đích và căn cứ xử lý',
    content: (
      <>
        <ul>
          <li>
            <strong>Cung cấp Dịch vụ:</strong> tạo và quản lý tài khoản; lưu, đồng bộ và hiển thị
            nhật ký; tính tổng, ngân sách và báo cáo; xử lý ảnh và xuất dữ liệu.
          </li>
          <li>
            <strong>Xác thực và bảo mật:</strong> xác minh danh tính, duy trì phiên, ngăn chặn gian
            lận, phát hiện lạm dụng, điều tra lỗi và bảo vệ người dùng.
          </li>
          <li>
            <strong>Hỗ trợ và giao tiếp dịch vụ:</strong> gửi mã xác minh, thông báo vận hành, phản
            hồi yêu cầu và thông báo thay đổi chính sách.
          </li>
          <li>
            <strong>Phân tích và cải thiện Billet:</strong> đo mức sử dụng tính năng, độ ổn định,
            hiệu năng và tỷ lệ lỗi; nghiên cứu cách cải thiện luồng sản phẩm bằng dữ liệu sử dụng,
            chẩn đoán và dữ liệu đã tổng hợp hoặc khử định danh.
          </li>
          <li>
            <strong>Tuân thủ pháp luật:</strong> thực hiện nghĩa vụ, xử lý yêu cầu hợp lệ của cơ
            quan có thẩm quyền và bảo vệ quyền hợp pháp của Billet hoặc người khác.
          </li>
        </ul>
        <p>
          Chúng tôi xử lý dữ liệu để thực hiện thỏa thuận cung cấp Dịch vụ, theo sự đồng ý rõ ràng
          của bạn khi pháp luật yêu cầu, để tuân thủ nghĩa vụ pháp lý hoặc trong các trường hợp khác
          được pháp luật cho phép. Bạn có thể rút lại sự đồng ý đối với hoạt động dựa trên sự đồng
          ý; việc rút lại không ảnh hưởng tính hợp pháp của hoạt động đã thực hiện trước đó.
        </p>
      </>
    ),
  },
  {
    title: '5. Phân tích, cải thiện sản phẩm và mô hình AI',
    content: (
      <>
        <p>
          Billet có thể dùng dữ liệu sử dụng và chẩn đoán để hiểu tính năng nào hữu ích, phát hiện
          lỗi và cải thiện trải nghiệm. Khi có thể, chúng tôi tổng hợp hoặc khử định danh dữ liệu
          trước khi phân tích và giới hạn quyền truy cập theo nhu cầu công việc.
        </p>
        <p>
          Chúng tôi không dùng ảnh, chú thích hoặc dữ liệu tài chính có thể nhận diện bạn để huấn
          luyện mô hình AI dùng chung, quảng cáo hoặc tiếp thị nếu chưa có sự đồng ý riêng, rõ ràng.
          Việc từ chối mục đích tùy chọn này không làm mất các chức năng cốt lõi không phụ thuộc vào
          hoạt động đó.
        </p>
      </>
    ),
  },
  {
    title: '6. Nhận diện ảnh và quyết định tự động',
    content: (
      <p>
        Khi tính năng nhận diện được bật và bạn gửi ảnh để phân tích, Billet có thể chuyển ảnh cần
        thiết tới Google AI Studio để đề xuất số tiền, danh mục hoặc thông tin liên quan. Kết quả
        chỉ là gợi ý, không tự động tạo giao dịch hoặc ghi đè dữ liệu bạn đã xác nhận. Bạn có thể bỏ
        qua, sửa hoặc thay thế gợi ý trước khi lưu. Billet không đưa ra quyết định tự động có hiệu
        lực pháp lý hoặc ảnh hưởng đáng kể tương tự đối với bạn.
      </p>
    ),
  },
  {
    title: '7. Bên nhận dữ liệu và nhà cung cấp dịch vụ',
    content: (
      <>
        <p>Dữ liệu chỉ được chia sẻ trong phạm vi cần thiết với:</p>
        <ul>
          <li>
            Nhà cung cấp hạ tầng máy chủ, cơ sở dữ liệu, lưu trữ riêng tư, sao lưu và bảo mật.
          </li>
          <li>Google hoặc Apple khi bạn chọn đăng nhập bằng tài khoản tương ứng.</li>
          <li>
            Google AI Studio khi bạn chủ động dùng tính năng nhận diện và tính năng này được cấu
            hình hoạt động.
          </li>
          <li>Nhà cung cấp email để gửi mã xác minh và thông báo dịch vụ.</li>
          <li>
            Cố vấn, đơn vị hỗ trợ hoặc cơ quan nhà nước khi cần tuân thủ pháp luật, giải quyết tranh
            chấp hoặc bảo vệ quyền hợp pháp.
          </li>
        </ul>
        <p>
          Chúng tôi yêu cầu bên xử lý chỉ dùng dữ liệu theo chỉ dẫn, bảo mật dữ liệu và xóa hoặc
          hoàn trả dữ liệu khi kết thúc dịch vụ theo hợp đồng và pháp luật. Billet không bán dữ liệu
          cá nhân và không chia sẻ dữ liệu với mạng quảng cáo hành vi.
        </p>
      </>
    ),
  },
  {
    title: '8. Chuyển dữ liệu ra nước ngoài',
    content: (
      <p>
        Một số nhà cung cấp, bao gồm Google và Apple, có thể xử lý dữ liệu tại quốc gia hoặc vùng
        lãnh thổ khác Việt Nam. Khi có chuyển dữ liệu cá nhân ra nước ngoài, chúng tôi áp dụng biện
        pháp hợp đồng, kỹ thuật và hồ sơ đánh giá cần thiết theo pháp luật Việt Nam; giới hạn dữ
        liệu theo mục đích; và yêu cầu mức bảo vệ phù hợp. Bạn có thể liên hệ để hỏi thêm về cơ chế
        chuyển dữ liệu áp dụng cho tài khoản của mình.
      </p>
    ),
  },
  {
    title: '9. Thời gian lưu giữ',
    content: (
      <>
        <ul>
          <li>
            Tài khoản, nhật ký chi tiêu và ảnh được lưu trong thời gian tài khoản hoạt động hoặc đến
            khi bạn xóa nội dung hay yêu cầu xóa tài khoản.
          </li>
          <li>
            Phiên đăng nhập, mã xác minh và dữ liệu bảo mật được lưu trong thời gian cần thiết để
            xác thực, ngăn lạm dụng và điều tra sự cố.
          </li>
          <li>
            Nhật ký kỹ thuật và chẩn đoán được lưu trong thời gian hợp lý để vận hành, bảo mật và
            cải thiện Dịch vụ, sau đó bị xóa hoặc khử định danh.
          </li>
          <li>
            Dữ liệu hỗ trợ và hồ sơ yêu cầu quyền riêng tư được lưu trong thời gian cần thiết để xử
            lý yêu cầu, chứng minh tuân thủ và giải quyết tranh chấp.
          </li>
        </ul>
        <p>
          Sau khi xóa, dữ liệu có thể còn trong bản sao lưu biệt lập cho đến khi bị ghi đè theo chu
          kỳ sao lưu; dữ liệu đó không được dùng cho mục đích thông thường. Chúng tôi có thể tiếp
          tục lưu phần dữ liệu cần thiết nếu pháp luật yêu cầu hoặc để thiết lập, thực hiện hay bảo
          vệ yêu cầu pháp lý.
        </p>
      </>
    ),
  },
  {
    title: '10. Quyền của bạn',
    content: (
      <>
        <p>
          Theo pháp luật áp dụng, bao gồm Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, bạn có quyền:
        </p>
        <ul>
          <li>Được biết về hoạt động xử lý dữ liệu cá nhân.</li>
          <li>Đồng ý, không đồng ý hoặc rút lại sự đồng ý.</li>
          <li>Xem, yêu cầu cung cấp, chỉnh sửa hoặc cập nhật dữ liệu.</li>
          <li>Yêu cầu xóa, hạn chế hoặc phản đối hoạt động xử lý.</li>
          <li>
            Khiếu nại, tố cáo, khởi kiện, yêu cầu bồi thường và yêu cầu áp dụng biện pháp bảo vệ
            theo pháp luật.
          </li>
        </ul>
        <p>
          Gửi yêu cầu từ email gắn với tài khoản tới{' '}
          <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Hãy nêu loại yêu cầu và dữ liệu
          liên quan. Chúng tôi sẽ xác minh danh tính, phản hồi và thực hiện trong thời hạn pháp luật
          quy định. Quyền có thể bị giới hạn trong trường hợp pháp luật cho phép; nếu từ chối toàn
          bộ hoặc một phần, chúng tôi sẽ giải thích căn cứ phù hợp.
        </p>
      </>
    ),
  },
  {
    title: '11. Xóa tài khoản và dữ liệu',
    content: (
      <p>
        Để yêu cầu xóa tài khoản và dữ liệu liên quan, gửi email từ địa chỉ gắn với tài khoản tới{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a> với tiêu đề “Yêu cầu xóa tài khoản
        Billet”. Sau khi xác minh, chúng tôi sẽ khóa truy cập, xóa hoặc khử định danh dữ liệu thuộc
        phạm vi yêu cầu, trừ phần phải giữ theo pháp luật. Xóa tài khoản là không thể hoàn tác.
      </p>
    ),
  },
  {
    title: '12. An toàn dữ liệu',
    content: (
      <p>
        Billet sử dụng kiểm soát truy cập theo tài khoản, token phiên, lưu trữ ảnh riêng tư, mã hóa
        đường truyền, giới hạn quyền truy cập vận hành, nhật ký bảo mật và quy trình ứng phó sự cố.
        Không hệ thống nào an toàn tuyệt đối. Nếu sự cố có khả năng ảnh hưởng đến quyền của bạn,
        chúng tôi sẽ thực hiện nghĩa vụ đánh giá, báo cáo và thông báo theo pháp luật.
      </p>
    ),
  },
  {
    title: '13. Trẻ em',
    content: (
      <p>
        Billet không dành cho người dưới 16 tuổi và không cố ý thu thập dữ liệu của trẻ em. Nếu bạn
        cho rằng trẻ em đã cung cấp dữ liệu cho Billet, hãy liên hệ để chúng tôi xác minh và xử lý.
        Trường hợp pháp luật cho phép sử dụng với sự đồng ý của người đại diện, Billet sẽ yêu cầu cơ
        chế đồng ý phù hợp trước khi xử lý.
      </p>
    ),
  },
  {
    title: '14. Cookie và lưu trữ cục bộ',
    content: (
      <p>
        Ứng dụng web sử dụng lưu trữ cục bộ và công nghệ tương tự để duy trì phiên đăng nhập, bảo
        mật và ghi nhớ trạng thái cần thiết. Billet hiện không dùng cookie quảng cáo hành vi. Việc
        chặn lưu trữ thiết yếu có thể khiến đăng nhập hoặc một số chức năng không hoạt động.
      </p>
    ),
  },
  {
    title: '15. Thay đổi Chính sách',
    content: (
      <p>
        Chúng tôi có thể cập nhật Chính sách khi Dịch vụ, nhà cung cấp hoặc pháp luật thay đổi.
        Phiên bản mới sẽ hiển thị ngày hiệu lực. Thay đổi quan trọng sẽ được thông báo qua Dịch vụ
        hoặc email; hoạt động xử lý mới cần sự đồng ý sẽ chỉ bắt đầu sau khi có sự đồng ý hợp lệ.
      </p>
    ),
  },
  {
    title: '16. Liên hệ và khiếu nại',
    content: (
      <p>
        Liên hệ bên kiểm soát dữ liệu: Trương Quốc Triệu —{' '}
        <a href={`mailto:${contactEmail}`}>{contactEmail}</a>. Bạn cũng có quyền gửi khiếu nại tới
        cơ quan nhà nước có thẩm quyền về bảo vệ dữ liệu cá nhân theo pháp luật Việt Nam.
      </p>
    ),
  },
]

export function TermsPage() {
  return (
    <LegalPage
      eyebrow="Pháp lý"
      title="Điều khoản sử dụng"
      intro="Thỏa thuận giữa bạn và Billet khi truy cập hoặc sử dụng Dịch vụ."
      sections={terms}
    />
  )
}

export function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Quyền riêng tư"
      title="Chính sách quyền riêng tư"
      intro="Thông tin về dữ liệu Billet xử lý, mục đích sử dụng và quyền kiểm soát của bạn."
      sections={privacy}
    />
  )
}

function LegalPage({
  eyebrow,
  title,
  intro,
  sections,
}: {
  eyebrow: string
  title: string
  intro: string
  sections: Section[]
}) {
  return (
    <SiteShell>
      <main className="px-5 py-14 sm:px-8 sm:py-20">
        <article className="mx-auto max-w-3xl">
          <p className="text-sm font-bold uppercase tracking-[.24em] text-[#bd4d2b]">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-6xl">{title}</h1>
          <p className="mt-5 text-lg leading-8 text-[#62554c]">{intro}</p>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm text-[#81736a]">
            <span>Có hiệu lực từ ngày 30 tháng 10 năm 2026</span>
            <span>Đơn vị vận hành: Trương Quốc Triệu</span>
          </div>
          <div className="mt-12 grid gap-10 border-t border-[#251c17]/10 pt-10">
            {sections.map((section) => (
              <section key={section.title} className="legal-copy">
                <h2>{section.title}</h2>
                {section.content}
              </section>
            ))}
          </div>
        </article>
      </main>
    </SiteShell>
  )
}
