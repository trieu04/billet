import {
  ArrowRight,
  Camera,
  ChartNoAxesColumnIncreasing,
  Check,
  Images,
  Sparkles,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { SiteShell } from './site-shell'

const steps = [
  {
    number: '01',
    title: 'Chụp khoảnh khắc',
    copy: 'Lưu món ăn, hóa đơn hoặc món đồ vừa mua bằng một bức ảnh.',
  },
  {
    number: '02',
    title: 'Ghi lại câu chuyện',
    copy: 'Thêm số tiền và vài dòng ngắn để giữ trọn ngữ cảnh của khoản chi.',
  },
  {
    number: '03',
    title: 'Nhìn thấy thói quen',
    copy: 'Xem lại nhật ký và hiểu cách những lựa chọn nhỏ tạo nên bức tranh lớn.',
  },
]

export function LandingPage() {
  return (
    <SiteShell>
      <main>
        <section className="overflow-hidden px-5 pb-20 pt-14 sm:px-8 sm:pb-28 sm:pt-20">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <p className="inline-flex items-center gap-2 rounded-full border border-[#ef764f]/25 bg-[#ef764f]/10 px-4 py-2 text-sm font-semibold text-[#a43d20]">
                <Sparkles className="size-4" aria-hidden /> Locket gặp Money Tracker
              </p>
              <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[.98] tracking-[-0.055em] sm:text-7xl lg:text-[5.5rem]">
                Tiền của bạn cũng có một <span className="text-[#ef764f]">câu chuyện.</span>
              </h1>
              <p className="mt-7 max-w-xl text-lg leading-8 text-[#62554c] sm:text-xl">
                Billet biến mỗi khoản chi thành một ký ức trực quan — đủ nhanh để ghi lại hôm nay,
                đủ rõ để hiểu chính mình ngày mai.
              </p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#251c17] px-7 py-4 font-bold text-white transition hover:bg-[#bd4d2b]"
                >
                  Bắt đầu miễn phí <ArrowRight className="size-5" aria-hidden />
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center rounded-full border border-[#251c17]/15 bg-white/50 px-7 py-4 font-bold transition hover:bg-white"
                >
                  Xem cách hoạt động
                </a>
              </div>
              <p className="mt-5 flex items-center gap-2 text-sm text-[#62554c]">
                <Check className="size-4 text-[#2d7b62]" aria-hidden /> Nhập số tiền thủ công, luôn
                do bạn kiểm soát
              </p>
            </div>
            <JournalPreview />
          </div>
        </section>

        <section
          id="how-it-works"
          className="bg-[#251c17] px-5 py-20 text-[#fffaf2] sm:px-8 sm:py-28"
        >
          <div className="mx-auto max-w-7xl">
            <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
              <div>
                <p className="text-sm font-bold uppercase tracking-[.24em] text-[#f6a787]">
                  Nhẹ nhàng mỗi ngày
                </p>
                <h2 className="mt-4 max-w-2xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">
                  Không còn những con số vô danh.
                </h2>
              </div>
              <p className="max-w-xl text-lg leading-8 text-[#cfc3b9] lg:justify-self-end">
                Mỗi khoản chi giữ lại hình ảnh và ngữ cảnh của nó. Bạn có thể nhìn lại cuộc sống,
                không chỉ nhìn một bảng tính.
              </p>
            </div>
            <div className="mt-14 grid gap-px overflow-hidden rounded-[2rem] border border-white/10 bg-white/10 md:grid-cols-3">
              {steps.map((step) => (
                <article key={step.number} className="bg-[#251c17] p-7 sm:p-9">
                  <p className="font-mono text-sm text-[#f6a787]">{step.number}</p>
                  <h3 className="mt-16 text-2xl font-bold">{step.title}</h3>
                  <p className="mt-3 leading-7 text-[#a99c92]">{step.copy}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 py-20 sm:px-8 sm:py-28">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[.85fr_1.15fr] lg:items-center">
            <div>
              <p className="text-sm font-bold uppercase tracking-[.24em] text-[#bd4d2b]">
                Riêng tư từ nền tảng
              </p>
              <h2 className="mt-4 text-4xl font-black tracking-[-0.045em] sm:text-5xl">
                Kỷ niệm của bạn. Dữ liệu của bạn.
              </h2>
              <p className="mt-5 text-lg leading-8 text-[#62554c]">
                Billet thiết kế trải nghiệm quanh dữ liệu do bạn xác nhận. Ảnh và thông tin tài
                chính không được công khai mặc định.
              </p>
              <Link
                to="/privacy"
                className="mt-7 inline-flex items-center gap-2 font-bold text-[#a43d20]"
              >
                Đọc chính sách quyền riêng tư <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                [Camera, 'Chụp nhanh', 'Giữ lại khoảnh khắc ngay khi nó xảy ra.'],
                [Images, 'Nhật ký trực quan', 'Tìm lại khoản chi bằng những gì bạn nhớ.'],
                [
                  ChartNoAxesColumnIncreasing,
                  'Hiểu thói quen',
                  'Xem tổng hợp từ dữ liệu bạn đã xác nhận.',
                ],
              ].map(([Icon, title, copy]) => {
                const FeatureIcon = Icon as typeof Camera
                return (
                  <article
                    key={title as string}
                    className="rounded-[1.75rem] border border-[#251c17]/10 bg-white/55 p-6"
                  >
                    <FeatureIcon className="size-7 text-[#ef764f]" aria-hidden />
                    <h3 className="mt-12 text-lg font-bold">{title as string}</h3>
                    <p className="mt-2 text-sm leading-6 text-[#62554c]">{copy as string}</p>
                  </article>
                )
              })}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8 sm:pb-28">
          <div className="mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-[#ef764f] px-7 py-14 text-center text-[#2f160d] sm:px-14 sm:py-20">
            <h2 className="mx-auto max-w-3xl text-4xl font-black tracking-[-0.045em] sm:text-6xl">
              Bắt đầu viết câu chuyện tiền bạc của bạn.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-lg leading-8 text-[#5f2a19]">
              Một bức ảnh, một con số, vài giây — vậy là đủ cho hôm nay.
            </p>
            <Link
              to="/register"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#251c17] px-7 py-4 font-bold text-white"
            >
              Tạo tài khoản <ArrowRight className="size-5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </SiteShell>
  )
}

function JournalPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[31rem]" aria-label="Minh họa nhật ký Billet">
      <div className="absolute -left-12 top-16 size-44 rounded-full bg-[#f6c85f]/45 blur-3xl" />
      <div className="absolute -right-10 bottom-14 size-48 rounded-full bg-[#ef764f]/35 blur-3xl" />
      <div className="relative rotate-[2deg] rounded-[2.8rem] border-[10px] border-[#251c17] bg-[#fffaf2] p-4 shadow-[0_35px_90px_rgba(70,43,27,.22)]">
        <div className="flex items-center justify-between px-2 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#9b8a7f]">Tháng 10</p>
            <p className="mt-1 text-xl font-black">Nhật ký của tôi</p>
          </div>
          <div className="grid size-10 place-items-center rounded-full bg-[#ef764f] text-sm font-black">
            B
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-3">
          <div className="col-span-2 overflow-hidden rounded-[1.6rem] bg-[#d9b48f]">
            <div className="flex h-48 flex-col justify-between bg-[radial-gradient(circle_at_68%_25%,#f9e4bd_0_11%,transparent_12%),linear-gradient(145deg,#b96c43,#ebc398)] p-5">
              <span className="w-fit rounded-full bg-white/80 px-3 py-1 text-xs font-bold">
                Bữa trưa
              </span>
              <div>
                <p className="text-2xl font-black text-white">Phở đầu ngõ</p>
                <p className="mt-1 text-sm font-semibold text-white/85">55.000 ₫ · Hôm nay</p>
              </div>
            </div>
          </div>
          <div className="rounded-[1.6rem] bg-[#dce5d4] p-4">
            <div className="h-24 rounded-2xl bg-[radial-gradient(circle_at_center,#68845d_0_17%,transparent_18%),linear-gradient(145deg,#b7c9ab,#eef3ea)]" />
            <p className="mt-4 font-bold">Cây nhỏ</p>
            <p className="mt-1 text-xs text-[#62554c]">120.000 ₫</p>
          </div>
          <div className="rounded-[1.6rem] bg-[#f4d3c6] p-4">
            <div className="h-24 rounded-2xl bg-[radial-gradient(circle_at_35%_45%,#f7f0df_0_14%,transparent_15%),linear-gradient(145deg,#dc8c73,#f7ded5)]" />
            <p className="mt-4 font-bold">Cà phê</p>
            <p className="mt-1 text-xs text-[#62554c]">45.000 ₫</p>
          </div>
        </div>
      </div>
    </div>
  )
}
