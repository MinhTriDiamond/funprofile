

## 🌟 Kế Hoạch Tích Hợp ANGEL AI vào FUN Profile

Bé Trí ơi, Angel đã phân tích xong hệ thống! Dưới đây là kế hoạch triển khai đầy đủ để tích hợp **ANGEL AI** (REST API + Streaming) vào FUN Profile.

---

### 📋 Tổng Quan

| Thành phần | Mô tả |
|------------|-------|
| **Kiểu 1** | Floating Bubble + Navbar Button → Mở trang `angel.fun.rich` |
| **Kiểu 2** | Embedded Chat Widget → Nhúng streaming chat ngay trong FUN Profile |
| **API** | REST API với Server-Sent Events (SSE) Streaming |
| **Bảo mật** | API KEY lưu trong Supabase Secrets |

---

### 🏗️ Kiến Trúc Hệ Thống

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    ANGEL AI INTEGRATION                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────────┐     ┌───────────────────┐                     │
│  │  FUN Profile UI  │     │   AngelWidget     │                     │
│  │                  │     │   (Embedded Chat) │                     │
│  │  ┌────────────┐  │     │                   │                     │
│  │  │  Floating  │  │     │  ┌─────────────┐  │                     │
│  │  │  Bubble    │──┼─────┼─▶│ angel.fun.  │  │                     │
│  │  └────────────┘  │     │  │   rich      │  │                     │
│  │                  │     │  └─────────────┘  │                     │
│  │  ┌────────────┐  │     │        OR         │                     │
│  │  │  Navbar    │  │     │  ┌─────────────┐  │                     │
│  │  │  Button    │──┼─────┼─▶│ Embedded    │  │                     │
│  │  └────────────┘  │     │  │ Chat (SSE)  │◀─┼───┐                 │
│  └──────────────────┘     │  └─────────────┘  │   │                 │
│                           └───────────────────┘   │                 │
│                                                    │                 │
│  ┌─────────────────────────────────────────────────┼───────────────┐│
│  │                 EDGE FUNCTION                   │               ││
│  │   supabase/functions/angel-chat/index.ts        │               ││
│  │   ┌─────────────────────────────────────────────┴─────────────┐ ││
│  │   │  1. Nhận messages từ client                               │ ││
│  │   │  2. Gọi ANGEL AI API (angel.fun.rich)                     │ ││
│  │   │  3. Stream response về client (SSE)                       │ ││
│  │   │  4. Xử lý errors (429, 402, 500)                          │ ││
│  │   └───────────────────────────────────────────────────────────┘ ││
│  │                              │                                  ││
│  │                              ▼                                  ││
│  │                    ANGEL_AI_API_KEY                             ││
│  │                    (Supabase Secrets)                           ││
│  └─────────────────────────────────────────────────────────────────┘│
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

### 📁 Các File Cần Tạo/Sửa

| File | Hành động | Mô tả |
|------|-----------|-------|
| `src/components/angel-ai/AngelFloatingButton.tsx` | **Tạo mới** | Floating bubble với avatar thiên thần (mở `angel.fun.rich`) |
| `src/components/angel-ai/AngelChatWidget.tsx` | **Tạo mới** | Embedded chat widget với streaming SSE |
| `src/components/angel-ai/AngelMessage.tsx` | **Tạo mới** | Component hiển thị tin nhắn (hỗ trợ Markdown) |
| `src/hooks/useAngelChat.ts` | **Tạo mới** | Hook xử lý streaming chat với ANGEL AI |
| `supabase/functions/angel-chat/index.ts` | **Tạo mới** | Edge function proxy gọi ANGEL AI API |
| `src/components/layout/FacebookNavbar.tsx` | **Sửa** | Thêm ANGEL AI icon vào center nav |
| `src/components/layout/MobileBottomNav.tsx` | **Sửa** | Thêm AngelFloatingButton |
| `supabase/config.toml` | **Sửa** | Thêm config cho angel-chat function |

---

### 🔐 Bước 0: Thêm API KEY vào Secrets

Trước khi bắt đầu code, bé Trí cần thêm **ANGEL_AI_API_KEY** vào Supabase Secrets. Angel sẽ yêu cầu bé nhập key khi bắt đầu triển khai.

---

### 🎨 Bước 1: AngelFloatingButton (Truy cập trực tiếp)

**Vị trí:** Góc phải màn hình, phía trên Bottom Nav (mobile only)

**Tính năng:**
- Avatar thiên thần từ `src/assets/angel-avatar.jpg`
- Glow ring effect với gradient gold
- Pulse animation thu hút sự chú ý
- Click → Mở `angel.fun.rich` trong tab mới

**Code mẫu:**
```typescript
// AngelFloatingButton.tsx
import angelAvatar from '@/assets/angel-avatar.jpg';
import { Sparkles } from 'lucide-react';

export const AngelFloatingButton = () => {
  return (
    <button 
      onClick={() => window.open('https://angel.fun.rich', '_blank')}
      className="fixed bottom-24 right-4 z-50 lg:hidden"
    >
      {/* Glow ring */}
      <div className="absolute inset-0 w-14 h-14 rounded-full 
        bg-gradient-to-br from-amber-400/50 to-yellow-500/50 
        blur-md animate-pulse" />
      {/* Avatar */}
      <div className="relative w-14 h-14 rounded-full overflow-hidden 
        border-2 border-amber-400 shadow-lg shadow-amber-500/50">
        <img src={angelAvatar} alt="ANGEL AI" className="w-full h-full object-cover" />
      </div>
      {/* Sparkle */}
      <Sparkles className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 animate-ping" />
    </button>
  );
};
```

---

### 💬 Bước 2: AngelChatWidget (Embedded Chat với Streaming)

**Tính năng:**
- Toggle button để mở/đóng chat panel
- Chat interface với message history
- Real-time streaming response (SSE)
- Markdown rendering cho AI responses
- Typing indicator khi AI đang phản hồi

**Giao diện:**
```text
┌──────────────────────────────────────┐
│  ✨ ANGEL AI                    [X]  │
├──────────────────────────────────────┤
│                                      │
│  👤 User: Xin chào ANGEL AI!         │
│                                      │
│  👼 ANGEL: Xin chào bé yêu! Angel    │
│     rất vui được gặp bé. Hôm nay     │
│     bé cần Angel giúp gì ạ? ✨       │
│                                      │
│  👤 User: Hướng dẫn mình về Web3     │
│                                      │
│  👼 ANGEL: [Typing...]               │
│                                      │
├──────────────────────────────────────┤
│  [                        ] [Send]   │
└──────────────────────────────────────┘
```

---

### ⚡ Bước 3: Edge Function - angel-chat

**Endpoint:** `POST /functions/v1/angel-chat`

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "Xin chào ANGEL AI!" }
  ]
}
```

**Response:** SSE Stream
```text
data: {"content": "Xin "}
data: {"content": "chào "}
data: {"content": "bé "}
data: {"content": "yêu! "}
data: [DONE]
```

**Code mẫu Edge Function:**
```typescript
// supabase/functions/angel-chat/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const ANGEL_AI_API_KEY = Deno.env.get("ANGEL_AI_API_KEY");
    
    if (!ANGEL_AI_API_KEY) {
      throw new Error("ANGEL_AI_API_KEY is not configured");
    }

    // Gọi ANGEL AI API
    const response = await fetch("https://angel.fun.rich/api/chat", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${ANGEL_AI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages, stream: true }),
    });

    if (!response.ok) {
      // Handle rate limits & errors
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`ANGEL AI error: ${response.status}`);
    }

    // Stream response về client
    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (error) {
    console.error("angel-chat error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
```

---

### 🔗 Bước 4: useAngelChat Hook

**Tính năng:**
- Quản lý conversation history
- Xử lý SSE streaming
- Token-by-token rendering
- Error handling

**Code mẫu:**
```typescript
// hooks/useAngelChat.ts
export const useAngelChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = async (content: string) => {
    const userMsg = { role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    let assistantContent = '';
    
    await streamChat({
      messages: [...messages, userMsg],
      onDelta: (chunk) => {
        assistantContent += chunk;
        setMessages(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => 
              i === prev.length - 1 ? { ...m, content: assistantContent } : m
            );
          }
          return [...prev, { role: 'assistant', content: assistantContent }];
        });
      },
      onDone: () => setIsLoading(false),
    });
  };

  return { messages, sendMessage, isLoading };
};
```

---

### 🧭 Bước 5: Tích Hợp vào Navbar & Mobile

**Desktop (FacebookNavbar.tsx):**
- Thêm icon Sparkles vào center nav
- Click → Toggle mở/đóng AngelChatWidget
- Style đặc biệt với gradient gold

**Mobile (MobileBottomNav.tsx):**
- Render AngelFloatingButton phía trên bottom nav
- Thêm tùy chọn mở embedded chat hoặc trang riêng

---

### 📝 Tổng Kết Thay Đổi

| Component | Desktop | Mobile |
|-----------|---------|--------|
| **Navbar Button** | Icon Sparkles trong center nav → Mở embedded chat | Không có |
| **Floating Bubble** | Không có | Góc phải, mở `angel.fun.rich` |
| **Embedded Chat** | Slide-in panel từ phải | Bottom sheet hoặc full page |

---

### ⏱️ Thời Gian Triển Khai

| Bước | Thời gian |
|------|-----------|
| Thêm ANGEL_AI_API_KEY secret | 1 phút |
| Tạo AngelFloatingButton | 5 phút |
| Tạo angel-chat edge function | 10 phút |
| Tạo useAngelChat hook | 10 phút |
| Tạo AngelChatWidget + Messages | 15 phút |
| Tích hợp vào Navbar & Mobile | 10 phút |
| Testing & polish | 10 phút |
| **Tổng** | **~60 phút** |

---

### 🎯 Kết Quả Sau Triển Khai

| Tính năng | Mô tả |
|-----------|-------|
| ✅ Floating Bubble | Avatar thiên thần với glow effect, mở `angel.fun.rich` |
| ✅ Navbar Icon | Sparkles icon trên desktop, mở embedded chat |
| ✅ Embedded Chat | Chat trực tiếp trong FUN Profile với streaming |
| ✅ SSE Streaming | Response hiển thị từng token real-time |
| ✅ Markdown | Render formatting cho AI responses |
| ✅ Error Handling | Xử lý rate limits và errors gracefully |

---

### 🔮 Cần Xác Nhận Từ Bé Trí

Trước khi Angel bắt đầu code, bé Trí vui lòng xác nhận:

1. **ANGEL AI API endpoint:** `https://angel.fun.rich/api/chat` - đúng không ạ?
2. **API request format:** Có phải gửi `{ messages: [...], stream: true }` không?
3. **Response format:** SSE với `data: {"content": "..."}` - đúng chưa ạ?

Sau khi bé xác nhận, Angel sẽ yêu cầu bé nhập **ANGEL_AI_API_KEY** và bắt đầu triển khai! ✨🌟💫

