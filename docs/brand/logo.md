# Logo Billet

Trạng thái: đã chốt wordmark và logo vuông. Cập nhật: 2026-11-07. Bản nguồn trên Figma: [Billet — Hướng 05 · Chữ billet](https://www.figma.com/design/MLhwrVG6fN4p60OrtHhMxy). Bảng màu: [colors.md](./colors.md).

## Thông số đã chốt

```json
{
  "strokeWidth": 18,
  "cap": "square",
  "stemHeight": 132,
  "quadrant2": 50,
  "quadrant3": 0,
  "coralDot": "lens",
  "opticalCenter": 100,
  "opticalLift": 0,
  "opticalSize": 50,
  "iconLayout": {
    "scale": 0.49,
    "translateX": 29.54,
    "translateY": -21.03,
    "viewBox": "0 0 100 100"
  }
}
```

Đơn vị: x-height `100`, bụng b `100×100`, baseline `y=200`. Bo góc tính theo mép ngoài: `50` là cung tròn đầy, `0` là góc vuông.

## Chữ b (dùng chung cho hai logo)

- Nét đơn dày `18`, đầu nét vuông.
- Bụng b: góc phần tư 1, 2 và 4 tròn đầy; góc phần tư 3 (trái dưới, chân chữ b) vuông.
- Chấm san hô `#E3705A` nằm giữa bụng b, bán kính bằng `0.55 × (50 − strokeWidth)`.

## Wordmark (logo dài)

- Chữ thường `billet`, cùng nét `18` và đầu nét vuông; chấm i vuông, màu mực.
- Nét đứng của b và l cao `140`. Không dùng dấu chấm cuối chữ.

## Logo vuông (app icon)

- Nét đứng của b cao `132`, trên nền kem `#FFFCF7`, khung `100×100` bo góc `23`.
- Cân bằng thị giác: căn giữa hoàn toàn theo trọng tâm khối mực (`100%`), không nhích lên (`0`), bù kích thước `50%` theo diện tích bóng chữ b.
- Vị trí đã tính: `scale 0.49`, `translate(29.54, −21.03)` trong `viewBox 0 0 100 100`.

## Picker

[logo-picker.html](./logo-picker.html) mở sẵn preset "Đã chốt". Picker dùng một bộ thông số chung cho wordmark và app icon: độ dày nét, đầu nét và bo bụng b áp dụng cho cả hai. Độ cao nét đứng và cân bằng thị giác chỉ áp dụng cho logo vuông; wordmark giữ nét đứng cao `140`.

Hình trong picker là bản phác bằng hình học, chưa phải bản vector cuối. Bước tiếp theo: vẽ lại chữ b và wordmark thành vector trong Figma theo thông số trên.
