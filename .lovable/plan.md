
# Kế hoạch: Tách 3 nút khỏi ô viết bài + Thêm Feeling/Activity Dialog như Facebook

## Tổng quan vấn đề

Hiện tại 3 nút (Video, Ảnh/video, Cảm xúc) đang nằm **bên trong** ô input viết bài. Cần tách ra thành dải nút riêng bên dưới như Facebook, và nút Cảm xúc cần mở dialog "Bạn đang cảm thấy thế nào?" với danh sách cảm xúc như hình mẫu.

---

## Phân tích hình mẫu Facebook

Từ hình con gửi:
1. **Create Post Card** có 2 phần riêng biệt:
   - **Phần trên**: Avatar + Input box (chỉ có text, không có icon bên trong)
   - **Phần dưới**: Dải 3 nút ngang với border-top ngăn cách

2. **Nút Cảm xúc/Hoạt động** khi bấm mở ra Dialog với:
   - Header "Bạn đang cảm thấy thế nào?"
   - 2 tabs: "Cảm xúc" và "Hoạt động"
   - Ô tìm kiếm
   - Grid 2 cột với emoji + tên cảm xúc (hạnh phúc, có phúc, được yêu, buồn, v.v.)

---

## Files cần chỉnh sửa

### 1. `src/components/feed/FacebookCreatePost.tsx`
Tách layout Create Post Card:

**Thay đổi chính:**
- Tách input box ra riêng (không có icon bên trong)
- Thêm border-top + dải 3 nút bên dưới: "Video trực tiếp", "Ảnh/video", "Cảm xúc/hoạt động"
- Nút Cảm xúc mở dialog mới (FeelingActivityDialog) thay vì chỉ mở post dialog
- Thêm state để lưu feeling/activity đã chọn

### 2. `src/components/feed/FeelingActivityDialog.tsx` (TẠO MỚI)
Component dialog để chọn cảm xúc/hoạt động:

**Tính năng:**
- Header với nút back + tiêu đề "Bạn đang cảm thấy thế nào?"
- 2 tabs: "Cảm xúc" và "Hoạt động"
- Input tìm kiếm
- Grid 2 cột hiển thị danh sách emoji + label
- Khi chọn sẽ trả về feeling object {emoji, label}

---

## Chi tiết kỹ thuật

### FacebookCreatePost.tsx - Layout mới (dòng 501-555)

```text
Cấu trúc hiện tại:
+------------------------------------------+
| Avatar | [Input với 3 icon bên trong]    |
+------------------------------------------+

Cấu trúc mới (giống Facebook):
+------------------------------------------+
| Avatar | [Input box thuần text]          |
+------------------------------------------+
|  🔴 Video  |  📷 Ảnh/video  |  😊 Cảm xúc |
+------------------------------------------+
```

```tsx
// Phần return mới
<div className="fb-card p-3 mb-4">
  {/* Row 1: Avatar + Input */}
  <div className="flex items-center gap-3">
    <Avatar ...>...</Avatar>
    <button
      onClick={() => setIsDialogOpen(true)}
      className="flex-1 text-left px-4 py-2.5 bg-secondary hover:bg-muted rounded-full text-muted-foreground text-sm transition-colors"
    >
      {profile.full_name || profile.username} ơi, bạn đang nghĩ gì thế?
    </button>
  </div>

  {/* Row 2: Action buttons with border-top */}
  <div className="border-t border-border mt-3 pt-3">
    <div className="flex items-center justify-around">
      {/* Video trực tiếp */}
      <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-secondary rounded-lg transition-colors">
        <Video className="w-6 h-6 text-red-500" />
        <span className="font-semibold text-muted-foreground text-sm hidden sm:inline">Video trực tiếp</span>
      </button>
      
      {/* Ảnh/video */}
      <button className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-secondary rounded-lg transition-colors">
        <ImagePlus className="w-6 h-6 text-primary" />
        <span className="font-semibold text-muted-foreground text-sm hidden sm:inline">Ảnh/video</span>
      </button>
      
      {/* Cảm xúc/hoạt động */}
      <button 
        onClick={() => setShowFeelingDialog(true)}
        className="flex-1 flex items-center justify-center gap-2 py-2 hover:bg-secondary rounded-lg transition-colors"
      >
        <span className="text-2xl">😊</span>
        <span className="font-semibold text-muted-foreground text-sm hidden sm:inline">Cảm xúc/hoạt động</span>
      </button>
    </div>
  </div>
</div>
```

### FeelingActivityDialog.tsx - Component mới

```tsx
// Danh sách cảm xúc theo Facebook
const FEELINGS = [
  { emoji: '😊', label: 'hạnh phúc' },
  { emoji: '🥰', label: 'có phúc' },
  { emoji: '🥰', label: 'được yêu' },
  { emoji: '😢', label: 'buồn' },
  { emoji: '😍', label: 'đáng yêu' },
  { emoji: '🙂', label: 'biết ơn' },
  { emoji: '🤩', label: 'hào hứng' },
  { emoji: '🥰', label: 'đang yêu' },
  { emoji: '🤪', label: 'điên' },
  { emoji: '😲', label: 'cảm kích' },
  { emoji: '😊', label: 'sung sướng' },
  { emoji: '🤩', label: 'tuyệt vời' },
  // ... thêm nhiều cảm xúc khác
];

const ACTIVITIES = [
  { emoji: '🎉', label: 'Đang ăn mừng' },
  { emoji: '👀', label: 'Đang xem' },
  { emoji: '🎮', label: 'Đang chơi' },
  { emoji: '🎧', label: 'Đang nghe' },
  { emoji: '🍽️', label: 'Đang ăn' },
  { emoji: '☕', label: 'Đang uống' },
  { emoji: '✈️', label: 'Đang đi đến' },
  { emoji: '📚', label: 'Đang đọc' },
  // ... thêm hoạt động khác
];

interface FeelingActivityDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (feeling: { emoji: string; label: string; type: 'feeling' | 'activity' }) => void;
}

export const FeelingActivityDialog = ({ isOpen, onClose, onSelect }: FeelingActivityDialogProps) => {
  const [activeTab, setActiveTab] = useState<'feeling' | 'activity'>('feeling');
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredItems = activeTab === 'feeling' 
    ? FEELINGS.filter(f => f.label.includes(searchQuery.toLowerCase()))
    : ACTIVITIES.filter(a => a.label.includes(searchQuery.toLowerCase()));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px] p-0">
        <DialogHeader className="p-4 border-b">
          <div className="flex items-center gap-3">
            <button onClick={onClose} className="p-2 hover:bg-secondary rounded-full">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <DialogTitle className="flex-1 text-center font-bold">
              Bạn đang cảm thấy thế nào?
            </DialogTitle>
          </div>
        </DialogHeader>
        
        {/* Tabs */}
        <div className="flex border-b">
          <button 
            className={`flex-1 py-3 font-semibold ${activeTab === 'feeling' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('feeling')}
          >
            Cảm xúc
          </button>
          <button 
            className={`flex-1 py-3 font-semibold ${activeTab === 'activity' ? 'text-blue-500 border-b-2 border-blue-500' : 'text-muted-foreground'}`}
            onClick={() => setActiveTab('activity')}
          >
            Hoạt động
          </button>
        </div>
        
        {/* Search */}
        <div className="p-3 border-b">
          <div className="flex items-center gap-2 px-3 py-2 bg-secondary rounded-full">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input 
              placeholder="Tìm kiếm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none flex-1 text-sm"
            />
          </div>
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-2 gap-1 p-3 max-h-[400px] overflow-y-auto">
          {filteredItems.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                onSelect({ ...item, type: activeTab });
                onClose();
              }}
              className="flex items-center gap-3 p-3 hover:bg-secondary rounded-lg transition-colors"
            >
              <span className="text-2xl">{item.emoji}</span>
              <span className="text-sm">{item.label}</span>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### State và logic mới trong FacebookCreatePost.tsx

```tsx
// Thêm state mới
const [showFeelingDialog, setShowFeelingDialog] = useState(false);
const [feeling, setFeeling] = useState<{ emoji: string; label: string; type: 'feeling' | 'activity' } | null>(null);

// Handler
const handleFeelingSelect = (selectedFeeling: { emoji: string; label: string; type: 'feeling' | 'activity' }) => {
  setFeeling(selectedFeeling);
  setIsDialogOpen(true); // Mở post dialog sau khi chọn cảm xúc
};

// Hiển thị feeling trong header user info của dialog
{feeling && (
  <span className="text-muted-foreground text-sm">
    {' '}đang cảm thấy {feeling.emoji} {feeling.label}
  </span>
)}

// Render dialog
<FeelingActivityDialog
  isOpen={showFeelingDialog}
  onClose={() => setShowFeelingDialog(false)}
  onSelect={handleFeelingSelect}
/>
```

---

## Thứ tự thực hiện

1. **Tạo FeelingActivityDialog.tsx** - Component mới với đầy đủ UI như Facebook
2. **Cập nhật FacebookCreatePost.tsx** - Tách layout + thêm state + integrate dialog

---

## Kết quả mong đợi

Sau khi hoàn thành:
- ✅ Input box thuần text, không có icon bên trong
- ✅ 3 nút (Video, Ảnh/video, Cảm xúc) nằm riêng bên dưới với border-top
- ✅ Nút Cảm xúc mở dialog "Bạn đang cảm thấy thế nào?" như Facebook
- ✅ Dialog có 2 tabs: Cảm xúc và Hoạt động
- ✅ Có ô tìm kiếm để filter
- ✅ Grid 2 cột với emoji + label
- ✅ Sau khi chọn feeling, tự động mở post dialog và hiển thị feeling đã chọn
- ✅ Các nút Video, Ảnh/video hoạt động mượt mà như trước
