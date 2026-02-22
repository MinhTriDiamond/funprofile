
# Sua loi khong mo/tai duoc file dinh kem trong chat

## Nguyen nhan goc

Ham `rewriteChatAttachmentUrl` trong `src/lib/urlFix.ts` dang viet lai URL tu `media.fun.rich` sang `pub-fe745f8832684f4198a9b0e88e8d451a.r2.dev` -- day la **sai bucket R2**. File thuc te nam o bucket co URL la `pub-e83e74b0726742fbb6a60bc08f95624b.r2.dev` (hoac truy cap qua custom domain `media.fun.rich`).

Ket qua: URL luu trong database tro den bucket khong ton tai file -> tra ve loi 404.

Da kiem chung:
- `media.fun.rich/comment-media/...rar` -> **hoat dong** (tra ve file)
- `pub-e83e74b0726742fbb6a60bc08f95624b.r2.dev/comment-media/...rar` -> **hoat dong**
- `pub-fe745f8832684f4198a9b0e88e8d451a.r2.dev/comment-media/...rar` -> **LOI 404**

## Giai phap

### 1. Bo rewrite URL trong ChatInput

File `src/modules/chat/components/ChatInput.tsx`: Bo goi `rewriteChatAttachmentUrl`. Giu nguyen URL `media.fun.rich` tu `uploadMedia` tra ve -- day la custom domain chinh thuc va hoat dong tot.

### 2. Sua URL da luu sai trong database

Chay 1 lenh SQL de sua tat ca URL dang tro den bucket sai (`pub-fe745f8832684f4198a9b0e88e8d451a.r2.dev`) ve lai `media.fun.rich`:

```sql
UPDATE messages
SET media_urls = (
  SELECT jsonb_agg(
    CASE
      WHEN elem::text LIKE '%pub-fe745f8832684f4198a9b0e88e8d451a.r2.dev%'
      THEN replace(elem::text, 'https://pub-fe745f8832684f4198a9b0e88e8d451a.r2.dev', 'https://media.fun.rich')::jsonb
      ELSE elem
    END
  )
  FROM jsonb_array_elements(media_urls::jsonb) AS elem
)
WHERE media_urls::text LIKE '%pub-fe745f8832684f4198a9b0e88e8d451a.r2.dev%';
```

### 3. (Tuy chon) Don dep `urlFix.ts`

Xoa hoac danh dau deprecated ham `rewriteChatAttachmentUrl` va hang so `R2_NEW_PUBLIC_URL` vi khong con su dung nua.

## Cac file can thay doi

| File | Thay doi |
|------|---------|
| `src/modules/chat/components/ChatInput.tsx` | Bo import va goi `rewriteChatAttachmentUrl`, giu nguyen URL tu upload |
| `src/lib/urlFix.ts` | Xoa ham `rewriteChatAttachmentUrl` (khong con dung) |
| Database | Chay SQL de sua URL da luu sai |
