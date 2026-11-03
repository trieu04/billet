// Realistic Vietnamese receipt text as OCR would return it (one string per recognized line).
// Test-only: not exported from index.ts.

import type { OcrLine } from './receipt-parser'

export type ReceiptFixture = {
  name: string
  lines: OcrLine[]
  /** Expected best candidates; omitted fields must have no confident candidate. */
  expected: { amount?: string; date?: string; merchant?: string }
}

function lines(...texts: string[]): OcrLine[] {
  return texts.map((text) => ({ text }))
}

export const CAPTURE_TIME = '2026-10-31T03:00:00.000Z'

export const receiptFixtures: ReceiptFixture[] = [
  {
    name: 'coffee shop with diacritics, cash and change lines',
    lines: lines(
      'HIGHLANDS COFFEE',
      'CÔNG TY CP DỊCH VỤ CÀ PHÊ CAO NGUYÊN',
      'Địa chỉ: 12 Nguyễn Huệ, Q.1, TP.HCM',
      'ĐT: 028 3822 1234',
      'PHIẾU THANH TOÁN',
      'Ngày: 28/10/2026 08:42',
      'Thu ngân: Lan   Bàn: 12',
      'Tên hàng      SL   Thành tiền',
      'Cà phê sữa đá  1   29.000',
      'Bạc xỉu        1   29.000',
      'Tổng tiền hàng     58.000',
      'VAT 8%              4.296',
      'TỔNG CỘNG         58.000đ',
      'TIỀN MẶT         100.000đ',
      'TIỀN THỪA         42.000đ',
      'Cảm ơn quý khách!',
    ),
    expected: {
      amount: '58000',
      date: '2026-10-28T01:42:00.000Z',
      merchant: 'HIGHLANDS COFFEE',
    },
  },
  {
    name: 'same coffee receipt with diacritics dropped and comma separators',
    lines: lines(
      'HIGHLANDS COFFEE',
      'CONG TY CP DICH VU CA PHE CAO NGUYEN',
      'Dia chi: 12 Nguyen Hue, Q.1, TP.HCM',
      'Ngay: 28-10-2026 08:42',
      'Ca phe sua da   1   29,000',
      'Bac xiu         1   29,000',
      'TONG CONG        58,000d',
      'TIEN MAT        100,000d',
      'TIEN THUA        42,000d',
    ),
    expected: { amount: '58000', date: '2026-10-28T01:42:00.000Z', merchant: 'HIGHLANDS COFFEE' },
  },
  {
    name: 'convenience store with discount and THANH TOAN VND',
    lines: lines(
      'Circle K',
      'Số 5 Lê Lợi, Quận 1',
      'MST: 0312345678',
      'HÓA ĐƠN BÁN HÀNG',
      '30/10/26 19:05',
      'Mì Hảo Hảo x2       12.000',
      'Nước suối Aquafina  8.000',
      'Sữa tươi TH 1L      38.000',
      'Bánh mì sandwich    157.000',
      'Tổng tiền hàng      215.000',
      'Giảm giá            15.000',
      'THANH TOÁN        200.000 VND',
      'Tiền khách đưa    500.000',
      'Tiền thừa         300.000',
    ),
    expected: { amount: '200000', date: '2026-10-30T12:05:00.000Z', merchant: 'Circle K' },
  },
  {
    name: 'restaurant total includes VAT note in parentheses',
    lines: lines(
      'Nhà hàng Cơm Niêu Sài Gòn',
      '45 Trần Hưng Đạo, P. Phạm Ngũ Lão',
      'Tel: 0903 123 456',
      'Ngày 27 tháng 10 năm 2026',
      'Gà nướng             1   420.000',
      'Cá kho tộ            1   380.000',
      'Canh chua            1   250.000',
      'Nước ngọt            4   200.000',
      'Tổng tiền (đã gồm VAT 8%)   1.250.000đ',
      'Thanh toán thẻ VISA',
    ),
    expected: {
      amount: '1250000',
      date: '2026-10-27T05:00:00.000Z',
      merchant: 'Nhà hàng Cơm Niêu Sài Gòn',
    },
  },
  {
    name: 'label and amount recognized as separate lines with boxes',
    lines: [
      { text: 'PHỞ 24', box: { x: 0.3, y: 0.05, width: 0.4, height: 0.04 } },
      { text: 'Ngày: 29/10/2026', box: { x: 0.1, y: 0.12, width: 0.5, height: 0.03 } },
      { text: 'Phở bò tái', box: { x: 0.1, y: 0.3, width: 0.4, height: 0.03 } },
      { text: '65.000', box: { x: 0.75, y: 0.3, width: 0.15, height: 0.03 } },
      { text: 'Tạm tính', box: { x: 0.1, y: 0.4, width: 0.3, height: 0.03 } },
      { text: '65.000', box: { x: 0.75, y: 0.4, width: 0.15, height: 0.03 } },
      { text: 'TỔNG CỘNG', box: { x: 0.1, y: 0.46, width: 0.35, height: 0.035 } },
      { text: '65.000', box: { x: 0.74, y: 0.462, width: 0.16, height: 0.035 } },
      { text: 'Tiền mặt', box: { x: 0.1, y: 0.52, width: 0.3, height: 0.03 } },
      { text: '100.000', box: { x: 0.72, y: 0.52, width: 0.18, height: 0.03 } },
    ],
    expected: { amount: '65000', date: '2026-10-29T05:00:00.000Z', merchant: 'PHỞ 24' },
  },
  {
    name: 'amount on the next line without boxes',
    lines: lines(
      'Bách Hóa XANH',
      'Ngày: 30/10/2026 10:15',
      'Tổng cộng',
      '152.500',
      'Tiền mặt',
      '200.000',
    ),
    expected: { amount: '152500', date: '2026-10-30T03:15:00.000Z', merchant: 'Bách Hóa XANH' },
  },
  {
    name: 'parking ticket without a printed amount',
    lines: lines(
      'BÃI GIỮ XE TÒA A',
      'VÉ XE MÁY',
      'Biển số: 59X1-123.45',
      'Giờ vào: 07:45 31-10-26',
      'Vui lòng giữ vé cẩn thận',
    ),
    expected: { date: '2026-10-31T00:45:00.000Z', merchant: 'BÃI GIỮ XE TÒA A' },
  },
  {
    name: 'OCR noise: lowercase d suffix, no separators, stray punctuation',
    lines: lines('*** QUÁN CƠM TẤM 68 ***', 'Tong tien: 1.250.000 VND', 'TIEN KHACH DUA 1500000'),
    expected: { amount: '1250000', merchant: 'QUÁN CƠM TẤM 68' },
  },
]
