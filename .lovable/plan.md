

# Fix: Sticker hinh anh bi loi - khong hien thi duoc

## Nguyen nhan goc

Du lieu sticker trong database co URL la duong dan tuong doi nhu `/stickers/hello.svg`, `/stickers/love.svg`... nhung **khong co thu muc `public/stickers/` nao trong du an**. Cac file SVG nay chua bao gio duoc tao. Vi vay ca StickerPicker lan MessageBubble deu hien thi hinh bi vo (broken image).

Tuong tu, `sticker_packs.preview_url` cung la `/stickers/preview.svg` - khong ton tai.

## Ke hoach sua

### Buoc 1: Tao file sticker SVG trong `public/stickers/`

Tao 7 file SVG don gian nhung dep mat:

- `public/stickers/preview.svg` - Icon preview cho pack
- `public/stickers/hello.svg` - Mat cuoi vay tay
- `public/stickers/love.svg` - Trai tim
- `public/stickers/lol.svg` - Mat cuoi ha ha
- `public/stickers/wow.svg` - Mat ngac nhien
- `public/stickers/sad.svg` - Mat buon
- `public/stickers/angry.svg` - Mat gian

Moi file la mot SVG emoji don gian, mau sac tuoi sang, kich thuoc 120x120px.

### Buoc 2: Kiem tra lai MessageBubble

Code hien tai da dung: doc `stickerMeta?.sticker?.url` va hien thi `<img>`. Khi file SVG ton tai, hinh se hien thi dung. Khong can sua code.

### Buoc 3: Kiem tra StickerPicker

Code hien tai da dung: doc `sticker.url` va hien thi `<img>`. Khi file SVG ton tai, hinh se hien thi dung. Khong can sua code.

## Tong ket

- Tao 7 file SVG moi trong `public/stickers/`
- Khong can sua code - chi can file hinh ton tai dung duong dan
- Sticker picker va tin nhan sticker se tu dong hien thi dung

