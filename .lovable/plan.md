
Mình đã kiểm tra rất kỹ theo cả 3 lớp: dữ liệu backend, đường dẫn render ở feed, và log runtime phía client. Kết luận hiện tại:

## Kết luận điều tra

1. Đây không phải lỗi dữ liệu của riêng 3 user.
- Bản ghi live của `@leminhtri`, `@angeldieungoc`, `@AngelGiau` đều có trạng thái kết thúc bình thường.
- Các post live đều trỏ đúng tới `manifest.json`.
- Bảng chunk ghi nhận đủ dải `seq` (0..max), không thiếu chunk, request chunk trả `200`.

2. Fix trước đó ở feed đã có hiệu lực trong code.
- `MediaGrid.tsx` đã dùng `FeedVideo` và đã route manifest URL sang `ChunkedVideoPlayer` ở tất cả layout.

3. Lỗi thực tế đang xảy ra ở tầng phát MSE (player runtime).
- Console có lỗi lặp lại: `[ChunkedVideoPlayer] SourceBuffer error` (trong `ChunkedVideoPlayer.tsx`).
- Tức là đã đi đúng vào player chunked, nhưng pipeline append vào `SourceBuffer` bị hỏng trong lúc phát.

## Nguyên nhân gốc có khả năng cao (đã xác nhận từ code)

### A) Append chunk không đảm bảo đúng thứ tự `seq`
Trong `ChunkedVideoPlayer`, nhiều chunk được fetch song song, sau đó `queue.push(data)` theo thứ tự hoàn thành network, không theo `seq`.
- Với WebM chunked stream, append sai thứ tự rất dễ gây `SourceBuffer error`.
- Đây phù hợp với hiện tượng: dữ liệu có, request 200, nhưng không phát được.

### B) Chuỗi MIME có thể bị ghép sai
Manifest hiện có:
- `mime_type: "video/webm;codecs=vp8,opus"`
- `codec: "vp8,opus"`

Nhưng player lại ghép:
- `${mime_type}; codecs="${codec}"`  
=> có thể thành chuỗi MIME không chuẩn (trùng codecs), làm nhánh MSE kém ổn định trên một số trình duyệt.

## Kế hoạch sửa (đề xuất triển khai)

### 1) Sửa `src/modules/live/components/ChunkedVideoPlayer.tsx` (trọng tâm)
- Chuẩn hoá MIME:
  - Nếu `mime_type` đã chứa `codecs`, dùng nguyên bản.
  - Chỉ nối `; codecs="..."` khi `mime_type` chưa có codecs.
- Đảm bảo append theo thứ tự `seq` tuyệt đối:
  - Lưu dữ liệu chunk theo map `seq -> ArrayBuffer`.
  - Dùng `nextAppendSeq` để chỉ append chunk kế tiếp; chunk đến sớm thì giữ chờ.
  - Không append theo thứ tự trả về của network.
- Giảm rủi ro race:
  - Tách rõ `fetching` và `appending`.
  - Chặn append khi `mediaSource/sourceBuffer` không còn open.
- Cải thiện fallback:
  - Khi gặp `SourceBuffer error` lặp lại, fallback an toàn sang blob path cho session đó (để user vẫn xem được).

### 2) Giữ nguyên `MediaGrid.tsx`
- Không cần đổi thêm ở feed route nữa (đã đúng).

## Cách xác nhận sau khi sửa

Kiểm tra end-to-end đúng luồng bạn yêu cầu:
1. Vào bài viết live replay của 3 user trên.
2. Bấm phát trực tiếp trong feed:
   - Không còn `SourceBuffer error`.
   - Video bắt đầu chạy, seek hoạt động.
3. Mở viewer (popup) để đảm bảo cũng phát bình thường.
4. So sánh 1 video thường (không manifest) để chắc không bị ảnh hưởng ngược.

## Kết quả kỳ vọng sau fix

- Replay live phát ổn định cho cả user cũ và mới.
- Không còn tình trạng “có file/chunk nhưng không xem được”.
- Không cần migrate dữ liệu hay xử lý lại recording đã lưu.
