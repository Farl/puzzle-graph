# 部署設定

這個 repo 部署到 GitHub Pages，**同時維護多個 branch 的生效版本**，用不同子路徑區隔：

- `main` → `https://<user>.github.io/puzzle-graph/`
- `investigation` → `https://<user>.github.io/puzzle-graph/investigation/`

Push 任一 branch 都會觸發一次完整部署（兩個 branch 同步 build + 合併成一份 Pages artifact）。

---

## 運作方式

### 1. Vite base path 用 env var 決定

[`vite.config.ts`](../vite.config.ts)：

```ts
base: process.env.VITE_BASE ?? '/puzzle-graph/',
```

- 未設 `VITE_BASE` → 用預設 `/puzzle-graph/`（main）
- CI 裡為 investigation build 時注入 `VITE_BASE=/puzzle-graph/investigation/`

### 2. Workflow 把兩個 branch 合併成一份 artifact

[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) 在任一 branch 被 push 時：

1. Checkout `main` → `npm ci` → `npm run build` → 產物到 `deploy/`
2. Checkout `investigation`（獨立路徑）→ `VITE_BASE=/puzzle-graph/investigation/ npm run build` → 產物到 `deploy/investigation/`
3. `upload-pages-artifact` 上傳整個 `deploy/`
4. `deploy-pages` 發布

---

## ⚠️ Fork 後必做步驟

1. **允許 investigation branch 部署到 github-pages 環境**

   GitHub 預設只允許 `main` 部署到 `github-pages` environment。Push investigation 會 build 成功但最後一步 `deploy-pages` 會跳錯：
   ```
   Branch "investigation" is not allowed to deploy to github-pages due to environment protection rules.
   ```

   **修法**（任選其一）：

   - **UI**：Settings → Environments → github-pages → Deployment branches → Add branch `investigation`
   - **gh CLI**：
     ```bash
     gh api --method POST \
       repos/<owner>/<repo>/environments/github-pages/deployment-branch-policies \
       -f name=investigation -f type=branch
     ```

2. **在 Pages 設定裡選 "GitHub Actions" 作為 source**
   Settings → Pages → Source: **GitHub Actions**（不是 Deploy from branch）

---

## 新增第三個 branch 的步驟

假設要加 `experimental` branch：

1. 改 [`deploy.yml`](../.github/workflows/deploy.yml)：
   - `on.push.branches` 加 `experimental`
   - 在 workflow 加一段 checkout + build + stage：
     ```yaml
     - uses: actions/checkout@v4
       with:
         ref: experimental
         path: experimental-src
     - name: Build experimental
       working-directory: experimental-src
       env:
         VITE_BASE: /puzzle-graph/experimental/
       run: |
         npm ci
         npm run build
     - name: Stage experimental build
       run: |
         mkdir -p deploy/experimental
         cp -R experimental-src/dist/. deploy/experimental/
     ```
2. 把這個 workflow 檔**也放到新 branch 上**（否則 push 該 branch 時跑的是舊 workflow）
3. 到 `github-pages` environment 加 branch policy

---

## 為什麼這樣做（以及為什麼不選其他）

### 本專案選的：單 workflow 合併 artifact

- **優點**：不用額外服務；多個 branch 同時 live；免費；只用一個 repo
- **缺點**：每次 push 任一 branch 都重 build 全部 branch，CI 時間 ×N；任一 branch build 失敗整份不會發
- **適合**：branch 不多、build 時間短、偶爾實驗

### 考慮過但沒選：

| 方案 | 為什麼不選 |
|---|---|
| **分成多個 workflow 檔** | 表面看 CI 省時間，但 GitHub Pages 一次只能部署一份 artifact；後跑的會覆蓋前一個的 sub-path，除非還是走合併策略，等於沒解決 |
| **Cloudflare Pages / Netlify / Vercel** | 原生支援 per-branch preview，build 只跑動到的 branch。但要搬家、多一個服務帳號、改 DNS。對「實驗性偶發用」而言 overkill |
| **Separate repo 部署** | 每個 branch 一個 repo 意味著程式碼要同步，維護成本高 |
| **`gh-pages` branch（舊派）** | 2024 年 GitHub 已經廢棄這條路；`deploy-pages@v4` 是正規作法 |

如果 branch 變多、CI 時間變痛，再遷 Cloudflare Pages。目前規模是夠的。

---

## 本地測試 production build

```bash
# main build
npm run build
npm run preview
# → http://localhost:4173/puzzle-graph/

# investigation build
VITE_BASE=/puzzle-graph/investigation/ npm run build
npm run preview
# → http://localhost:4173/puzzle-graph/investigation/
```
