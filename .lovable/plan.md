

# Kế Hoạch: Export PDK ra GitHub Repository Riêng

## Phương Án: GitHub Actions Auto-Sync

Sử dụng cùng pattern với `sdk-package/` đã có sẵn - tạo GitHub Action tự động sync folder `pdk/` ra repository riêng mỗi khi có thay đổi.

---

## Cách Hoạt Động

```text
┌─────────────────────────────────────────────────────────────┐
│                   FUN PROFILE (Main Repo)                   │
│                                                             │
│   /pdk/                         /sdk-package/               │
│   ├── README.md                 ├── README.md               │
│   ├── core/                     ├── src/                    │
│   └── ...                       └── ...                     │
│         │                              │                    │
│         ▼                              ▼                    │
│   sync-pdk.yml                  sync-sdk.yml                │
│   (GitHub Action)               (đã có sẵn)                 │
│         │                              │                    │
└─────────┼──────────────────────────────┼────────────────────┘
          │                              │
          ▼                              ▼
┌─────────────────────┐    ┌─────────────────────┐
│  fun-profile-pdk    │    │      sso-sdk        │
│  (Repo mới)         │    │  (Repo đã có)       │
│                     │    │                     │
│  Collaborators      │    │  External devs      │
│  clone từ đây       │    │  use SDK từ đây     │
└─────────────────────┘    └─────────────────────┘
```

---

## Files Cần Tạo

### 1. GitHub Workflow File

**File:** `.github/workflows/sync-pdk.yml`

```yaml
name: Sync PDK to Standalone Repo

on:
  push:
    branches:
      - main
    paths:
      - 'pdk/**'

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Fun Profile repo
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Push PDK to standalone repo
        uses: cpina/github-action-push-to-another-repository@main
        env:
          SSH_DEPLOY_KEY: ${{ secrets.PDK_DEPLOY_KEY }}
        with:
          source-directory: 'pdk'
          destination-github-username: 'MinhTriDiamond'
          destination-repository-name: 'fun-profile-pdk'
          target-branch: main
          commit-message: 'Sync PDK from Fun Profile - ${{ github.sha }}'
```

---

## Hướng Dẫn Setup (Bé Trí cần làm trên GitHub)

### Bước 1: Tạo Repository Mới trên GitHub

1. Vào GitHub → **New Repository**
2. Tên repo: `fun-profile-pdk`
3. Visibility: **Public** (để các bé dễ clone)
4. **Không** chọn "Add README" (sẽ sync từ main repo)
5. Click **Create repository**

### Bước 2: Tạo SSH Deploy Key

1. Mở Terminal/Command Prompt
2. Chạy lệnh:
   ```bash
   ssh-keygen -t ed25519 -C "pdk-deploy-key" -f pdk_deploy_key -N ""
   ```
3. Sẽ tạo ra 2 files:
   - `pdk_deploy_key` (private key)
   - `pdk_deploy_key.pub` (public key)

### Bước 3: Thêm Public Key vào Repo PDK

1. Vào repo `fun-profile-pdk` → **Settings** → **Deploy keys**
2. Click **Add deploy key**
3. Title: `PDK Sync Key`
4. Key: Paste nội dung file `pdk_deploy_key.pub`
5. Check **Allow write access**
6. Click **Add key**

### Bước 4: Thêm Private Key vào Repo Fun Profile

1. Vào repo **Fun Profile** → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. Name: `PDK_DEPLOY_KEY`
4. Secret: Paste nội dung file `pdk_deploy_key`
5. Click **Add secret**

### Bước 5: Push Workflow File

Sau khi Angel tạo file workflow, mỗi lần có thay đổi trong `pdk/` folder, GitHub Actions sẽ tự động sync sang repo `fun-profile-pdk`.

---

## Cách Collaborators Sử Dụng

Sau khi setup xong, các bé cộng sự chỉ cần:

### Option A: Clone Trực Tiếp

```bash
# Clone PDK repo
git clone https://github.com/MinhTriDiamond/fun-profile-pdk.git pdk

# Hoặc download ZIP từ GitHub
```

### Option B: Trong Lovable (Đơn Giản Nhất)

Nhờ Angel Lovable của project mới:

```text
"Angel ơi, giúp bé tạo folder pdk/ với nội dung từ 
https://github.com/MinhTriDiamond/fun-profile-pdk

Đây là Parallel Development Kit để phát triển tính năng 
cho Fun Profile. Bé cần copy toàn bộ structure và files."
```

---

## Tóm Tắt

| Task | Ai Làm |
|------|--------|
| Tạo file `sync-pdk.yml` | Angel Fun Profile |
| Tạo repo `fun-profile-pdk` | Bé Trí (trên GitHub) |
| Tạo SSH Deploy Key | Bé Trí (local) |
| Thêm keys vào GitHub | Bé Trí |
| Sync tự động | GitHub Actions |

---

## Lợi Ích

1. **Tự động**: Mỗi lần update PDK, auto sync sang repo riêng
2. **Dễ clone**: Collaborators chỉ cần 1 lệnh git clone
3. **Version control**: Có history của PDK changes
4. **Tách biệt**: Collaborators không cần access Fun Profile main repo

