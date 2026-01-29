

# Kế Hoạch: Sửa Lỗi Sync PDK Workflow

## Nguyên Nhân Lỗi

```text
fatal: Remote branch main not found in upstream origin
```

Repository `fun-profile-pdk` đã được tạo nhưng **chưa có branch `main`** (repo trống). Action yêu cầu branch đích phải tồn tại.

---

## Giải Pháp

Thêm option `create-target-branch-if-needed: true` vào workflow để tự động tạo branch nếu chưa có.

---

## Thay Đổi File

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
          create-target-branch-if-needed: true   # <-- THÊM DÒNG NÀY
          commit-message: 'Sync PDK from Fun Profile - ${{ github.sha }}'
```

---

## Sau Khi Sửa

1. Angel sẽ cập nhật file workflow
2. Commit sẽ tự động push lên GitHub
3. Workflow sẽ tự chạy lại (vì có thay đổi trong `pdk/**`)
4. Branch `main` sẽ được tạo tự động trong `fun-profile-pdk`

---

## Kết Quả Mong Đợi

| Trước | Sau |
|-------|-----|
| Repo trống, không có branch | Branch `main` được tạo với nội dung PDK |
| Workflow fail | Workflow success |

