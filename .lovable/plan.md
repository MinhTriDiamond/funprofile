

## Chỉnh hàng Thích/Bình luận/Chia sẻ giống Facebook

### Vấn đề
Hiện tại nút "Thích" (ReactionButton) nằm trong div `relative` **không có `flex-1`**, nên nó không chiếm đều không gian như các nút Bình luận/Chia sẻ/Tặng quà. Trên Facebook, tất cả các nút chia đều hàng ngang.

### Thay đổi

**File: `src/components/feed/ReactionButton.tsx`**
- Dòng 326: Thêm `flex-1` vào container div để nút Thích chiếm đều không gian:
  ```
  className="relative flex-1 select-none"
  ```

**File: `src/components/feed/PostFooter.tsx`**  
- Dòng 42: Thêm `justify-evenly` để các nút phân bố đều hơn, giữ border trên/dưới giống Facebook:
  ```
  <div className="border-t border-b border-border flex items-center py-0.5 bg-card">
  ```

### Kết quả
- 4 nút (Thích / Bình luận / Chia sẻ / Tặng quà) chia đều hàng ngang giống Facebook
- Có đường kẻ trên và dưới phân tách rõ ràng

