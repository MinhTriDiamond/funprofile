
Mục tiêu (iPhone Chrome)
- Trên màn hình điện thoại: vẫn thấy video nền chạy và quan trọng là nhìn rõ được khu vực “lồng đèn” phía trên + “hoa mai/hoa đào” ở hai bên (không bị che hết bởi thanh menu / nội dung).
- Giữ trải nghiệm desktop không đổi.

Những gì Cha đã kiểm tra từ code hiện tại
- `TetBackground` đang đặt `zIndex: -100` và video đang dùng `object-cover` + “kéo giữa” (`left-1/2` + translateX) bằng inline style.
- Trên mobile, `.tet-video` được ép `top: 0` và vẫn là “cover” => với iPhone màn hình rất cao/dọc, “cover” thường sẽ crop mạnh 2 bên hoặc crop phần có hoa/lồng đèn ra ngoài khung nhìn.
- Trên Feed, ta đã đổi `main top` sang `top-[1.5cm]` (trong diff gần nhất). Điều này làm gần như không còn “khoảng trống trang trí” phía trên nội dung; lồng đèn nếu nằm vùng trên sẽ bị navbar và nội dung che mất.
- Navbar (`.fb-header`) đang khá đậm (`bg-card/85`) nên nếu lồng đèn nằm phía sau navbar thì sẽ rất khó thấy.

Kết luận nguyên nhân “thấy video chạy nhưng không thấy hoa/lồng đèn”
- Video vẫn phát, nhưng vùng khung hình đang hiển thị trên iPhone không chứa (hoặc chỉ chứa rất ít) hoa/lồng đèn do cơ chế crop của `object-fit: cover` trên màn hình dọc, cộng thêm việc navbar + nội dung che phần phía trên.

Giải pháp “hoàn chỉnh” (ưu tiên chắc chắn thấy hoa/lồng đèn trên iPhone)
A. Làm nền Tết có “Mobile Portrait mode” để iPhone luôn thấy đầy đủ hoa/lồng đèn
1) Refactor `TetBackground.tsx` để KHÔNG dùng inline `transform` nữa (vì inline style không override được bằng CSS trên mobile)
   - Chuyển `transform: translateX(-50%)` từ inline style sang class Tailwind (`-translate-x-1/2`) để CSS media query có thể override khi cần.
   - Đồng thời chuẩn hóa sizing video theo viewport (`inset-0 w-full h-full`) để dễ điều khiển object-fit trên mobile.

2) Thêm 2 chế độ hiển thị bằng CSS media query trong `src/index.css`:
   - Desktop / tablet ngang: giữ `object-fit: cover` như hiện tại (đẹp, full-screen).
   - iPhone màn hình dọc (portrait, aspect ratio nhỏ): chuyển sang “full-frame” ưu tiên thấy đủ trang trí:
     - `object-fit: contain` (để không bị cắt 2 bên và không mất lồng đèn/hoa)
     - `object-position: top center`
     - Thêm nền phụ phía sau để không bị “trống” khi contain (chọn 1 trong 2 cách, Cha sẽ implement cách nhẹ và ổn định):
       a) Nền gradient/ivory phía sau video (nhẹ nhất, không tốn hiệu năng).
       b) (Tuỳ chọn nâng cao) 1 lớp “fill” phía sau: dùng cùng video nhưng blur + opacity thấp để lấp khoảng trống. Lưu ý iOS đôi khi nặng khi decode 2 video, nên chỉ bật nếu cần.

Tiêu chí thành công cho A:
- Trên iPhone Chrome: nhìn thấy lồng đèn ở phần trên và thấy hoa ở hai bên (không bị crop mất).

B. Khôi phục “khoảng trống trang trí” phía trên nội dung Feed (để lồng đèn có chỗ hiện)
3) Sửa `src/pages/Feed.tsx`
   - Đưa `main` top về lại chuẩn Fixed Scroll Shell như các trang khác: `top-[3cm]` (hoặc tốt hơn: dùng safe-area aware như bên dưới).
   - Khuyến nghị làm đúng cho iPhone: đổi sang giá trị có tính safe-area:
     - `top-[calc(3cm+env(safe-area-inset-top,0px))]`
   - Lý do: iPhone có “tai thỏ” làm navbar + safe-area cao hơn, nếu không cộng safe-area thì khoảng trống trang trí bị teo lại.

4) (Khuyến nghị) Chuẩn hóa lại tất cả trang đang dùng fixed scroll shell
   - Hiện nhiều trang dùng `top-[3cm]` trực tiếp. Để iPhone luôn đúng, Cha sẽ tạo 1 utility class CSS (ví dụ `.app-shell-top`) hoặc thay toàn bộ sang `top-[calc(3cm+env(safe-area-inset-top,0px))]` cho các `<main data-app-scroll ...>`.
   - Làm vậy sẽ tránh tình trạng “Feed khác, trang khác khác” và đỡ phát sinh lỗi lại.

Tiêu chí thành công cho B:
- Ngay khi mở Feed trên iPhone: phía dưới navbar có một dải không gian đủ để thấy lồng đèn (không bị nội dung dính sát lên).

C. Tăng khả năng nhìn thấy lồng đèn phía sau navbar (nếu vẫn bị che)
5) Sửa `src/index.css` (mobile-only)
   - Giảm độ đậm của `.fb-header` trên mobile, ví dụ từ `bg-card/85` xuống `bg-card/60~70`, hoặc dùng gradient (trên đậm – dưới trong) để vẫn đọc chữ rõ nhưng “thấy” được nền Tết.
   - Chỉ áp dụng trong `@media (max-width: 768px)` để desktop không đổi.

D. Dọn “double background” để tránh xung đột (khuyến nghị mạnh)
6) `src/pages/Auth.tsx` đang render `<TetBackground />` trong khi `App.tsx` đã render global `<TetBackground />`
   - Trên /auth có thể bị 2 video chồng nhau (đôi khi làm iPhone render kỳ lạ hoặc tốn tài nguyên).
   - Cha sẽ bỏ 1 trong 2 theo hướng chuẩn:
     - Giữ background global ở `App.tsx` và bỏ trong `Auth.tsx`, hoặc
     - Nếu Auth cần bố cục riêng, thì bỏ global và chỉ render theo layout (nhưng sẽ phải rà nhiều trang).
   - Ưu tiên: giữ global, bỏ trong Auth.

Các file sẽ chỉnh
- `src/components/ui/TetBackground.tsx` (refactor để CSS override được + hỗ trợ mobile portrait mode)
- `src/index.css` (media query iPhone portrait: contain mode + mobile navbar transparency)
- `src/pages/Feed.tsx` (khôi phục top offset và/hoặc safe-area aware top)
- (Khuyến nghị) các trang khác có `top-[3cm]` để đồng nhất safe-area
- `src/pages/Auth.tsx` (bỏ background trùng)

Checklist test (con test giúp Cha sau khi làm)
- iPhone Chrome:
  1) Vào trang Feed: thấy rõ lồng đèn phía trên (không bị navbar che hết).
  2) Thấy hoa mai/hoa đào ở hai bên (ít nhất ở 2 góc/viền).
  3) Cuộn xuống: nền vẫn giữ ổn, không giật, không mất video.
- Desktop:
  4) Feed vẫn đẹp như cũ (cover full, màu sắc đúng).
- Auth:
  5) Không còn hiện “2 lớp nền” (không bị nặng/giật).

Ghi chú kỹ thuật (để lần này không tái phát)
- Tránh inline style cho các thuộc tính cần responsive override (`transform`, `object-fit`, `left/top`) vì CSS media query không override được inline.
- iPhone có `safe-area-inset-top`, nếu dùng “Fixed Scroll Shell” bằng giá trị cố định (cm/px) dễ bị thiếu khoảng trống trang trí => nên cộng safe-area.

Sau khi con bấm Approve, Cha sẽ implement theo thứ tự: D (dọn double background) → B (safe-area top) → A (portrait mode contain) → C (navbar transparency) và test lại trên viewport iPhone trong preview.
