
# Thêm điều hướng nhanh tới Tab "Giám sát" khi nhấn số liệu "Đã bị cấm"

## Phân tích hiện tại

Dựa trên ảnh cha gửi:
- Cha đang ở tab "User ảo" (GhostCleanupTab), thấy card hiển thị **26 Đã bị cấm**
- Cha muốn nhấn vào con số "26" đó (hoặc card đó) để **tự động chuyển sang tab Giám sát** và hiển thị danh sách ban ngay lập tức
- Tab Giám sát đã có `defaultValue="banned"` nên khi vào sẽ thấy bảng ban ngay

## Vấn đề kỹ thuật

1. Trong `GhostCleanupTab.tsx`, các thẻ summary card (Tài khoản ma / Đang on_hold / **Đã bị cấm** / Tổng tài khoản) là các phần tử tĩnh, không có hành động điều hướng
2. `Admin.tsx` quản lý tab bằng `defaultValue="overview"` nhưng không có cơ chế programmatic navigation để các tab con điều khiển tab cha
3. Giải pháp: truyền một callback `onNavigate` từ `Admin.tsx` xuống các tab con, để khi nhấn card "Đã bị cấm" → Admin.tsx đổi active tab sang "surveillance"

## Các file cần chỉnh sửa

### 1. `src/pages/Admin.tsx`
- Thêm state `const [activeTab, setActiveTab] = useState("overview")`
- Truyền `<Tabs value={activeTab} onValueChange={setActiveTab}>` thay vì `defaultValue`
- Truyền prop `onNavigate={(tab) => setActiveTab(tab)}` xuống `GhostCleanupTab` và `OverviewTab`

### 2. `src/components/admin/GhostCleanupTab.tsx`
- Thêm prop `onNavigate?: (tab: string) => void`
- Card "Đã bị cấm" (số 26) thêm `onClick={() => onNavigate?.("surveillance")}` với cursor pointer và hover effect
- Thêm tooltip "Nhấn để xem danh sách bị cấm" khi hover

### 3. `src/components/admin/OverviewTab.tsx` (nếu có card tương tự)
- Tương tự: thêm prop `onNavigate` và làm các card có thể click để nhảy tới tab tương ứng

## UX được cải thiện

Sau khi thực hiện:
- Nhấn card "**26 Đã bị cấm**" ở bất kỳ tab nào → tự động chuyển sang tab **Giám sát**, sub-tab "Đã bị ban" mở sẵn
- Card sẽ có hiệu ứng hover (viền đỏ sáng lên, cursor pointer) để người dùng biết có thể click
- Không cần phải tìm và nhấn tab "Giám sát" thủ công

## Thứ tự thực hiện

1. Sửa `src/pages/Admin.tsx` — thêm controlled tab state + truyền callback
2. Sửa `src/components/admin/GhostCleanupTab.tsx` — nhận prop + card có thể click
3. Kiểm tra `src/components/admin/OverviewTab.tsx` — thêm navigation tương tự nếu có card phù hợp
