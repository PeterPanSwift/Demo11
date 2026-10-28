# 寄往 B612 — 課後問卷

小王子水彩風格的課後問卷，可填寫 **評價（1–5 顆星）**、**問題**、**心得**，資料寫入 Google 試算表，網站部署在 Cloudflare Pages。

```
瀏覽器 ──POST /api/submit──▶ Cloudflare Pages Function ──▶ Google Apps Script ──▶ Google 試算表
```

| 路徑 | 說明 |
|---|---|
| `public/index.html` | 問卷頁面（純 HTML/CSS/JS，無需建置） |
| `functions/api/submit.js` | Pages Function：驗證資料、轉送到 Apps Script |
| `apps-script/Code.gs` | 貼到試算表的 Apps Script，負責寫入列 |
| `wrangler.toml` | Cloudflare Pages 設定 |

試算表欄位：`提交時間｜姓名｜課程｜評分｜問題｜心得`

## 設定步驟

### 1. Google 試算表 + Apps Script

1. 打開回覆用的試算表 →「擴充功能 → Apps Script」。
2. 把 `apps-script/Code.gs` 的內容整個貼上並儲存。
3. 上方函式選 `setup` → 執行，依提示授權（會設定標題列與欄位格式）。
4. 「專案設定 → 指令碼屬性」新增 `SHARED_SECRET`，值自訂一串亂碼（建議，防止別人繞過網站直接寫入）。
5. 「部署 → 新增部署作業 → 類型：網頁應用程式」
   - 執行身分：**我**
   - 誰可以存取：**所有人**
6. 複製部署後的網址（`https://script.google.com/macros/s/…/exec`）。

> 之後修改 Code.gs，要用「管理部署作業 → 編輯 → 版本：新版本」重新部署，網址才會維持不變。

### 2. Cloudflare Pages

**方法 A：連接 GitHub（推薦，之後 push 會自動部署）**

1. Cloudflare 後台 → Workers & Pages → 建立 → Pages → 連接到 Git → 選這個 repo。
2. 建置設定：框架「無」、建置命令留空、建置輸出目錄 `public`。
3. 設定 → 變數和密碼，新增：
   - `GAS_URL`：步驟 1-6 的網址
   - `SHARED_SECRET`：與步驟 1-4 相同的值（類型選「密碼」）
4. 重新部署一次讓變數生效。

**方法 B：用 Wrangler 從本機部署**

```bash
npx wrangler login
npx wrangler pages project create b612-survey --production-branch=main
npx wrangler pages secret put GAS_URL --project-name=b612-survey
npx wrangler pages secret put SHARED_SECRET --project-name=b612-survey
npx wrangler pages deploy
```

## 使用小技巧

- 網址帶 `?course=課程名稱` 可預先填好課程欄位，例如 `https://b612-survey.pages.dev/?course=AI%20種子班%20第3堂`，每堂課發不同連結即可分辨。
- 頁面會依系統設定自動切換白天（水彩天空）與夜晚（星空）配色。

## 本機測試

```bash
printf 'GAS_URL=https://script.google.com/macros/s/xxx/exec\nSHARED_SECRET=xxx\n' > .dev.vars
npx wrangler pages dev
```
