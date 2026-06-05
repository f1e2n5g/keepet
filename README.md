# 🐾 KeePet — 兒童寵物養成 App

小朋友完成家長指派的任務 → 家長審核 → 獲得積分 → 用積分餵養／升級寵物、在虛擬商店買道具、
兌換現實獎勵。支援 **Web** 與 **Android**（同一套程式碼）。

- **前端**：Expo (React Native + react-native-web)，TypeScript
- **後端**：Cloudflare Workers (Hono) + D1 (SQLite) + R2
- **部署**：GitHub Actions → Cloudflare（Worker + Pages）

> 設計原則：積分／寵物狀態以**伺服器為唯一權威來源**（防止小朋友離線刷分）；寵物屬性採
> **讀取時懶算衰減**（不跑客戶端計時器）。隱私上不蒐集兒童個資，小孩只是家長帳號下的名字+頭像。

## 專案結構

```
keepet/
├── app/      # Expo 前端（web + android）
├── api/      # Cloudflare Worker API
├── shared/   # 前後端共用 TypeScript 型別（契約）
└── .github/  # CI/CD
```

## 本機開發

需求：Node 20+、pnpm 10+。

```bash
pnpm install

# 1) 後端：建本機 D1、跑 migration、塞內建商品、啟動
cd api
pnpm migrate:local      # 建立資料表
pnpm seed:local         # 內建商店商品
pnpm dev                # http://localhost:8787

# 2) 前端（另開一個終端機）
cd app
pnpm web                # 瀏覽器開啟；按 a 可開 Android 模擬器
```

前端預設打 `http://localhost:8787`。要改 API 位址設環境變數 `EXPO_PUBLIC_API_URL`。

### 核心迴圈快速體驗
1. 開網頁 → 「註冊新家庭」建立家長帳號
2. 「孩子」頁新增小朋友（設 4 碼 PIN）
3. 「任務」頁建立任務（給分）
4. 「孩子」頁點該小孩的「登入」→ 輸入 PIN 進入小孩模式
5. 小孩「任務」頁按「我完成了」
6. 登出回家長 →「待審核」核可 → 積分入帳
7. 小孩「商店」買食物 →「寵物」頁看牠長大

## 部署到 Cloudflare（首次設定）

```bash
cd api
pnpm exec wrangler d1 create keepet     # 把回傳的 database_id 填進 api/wrangler.toml
pnpm migrate:remote && pnpm seed:remote
pnpm exec wrangler secret put JWT_SECRET # 設定正式 JWT 密鑰
pnpm deploy                              # 部署 Worker
```

GitHub Actions（`.github/workflows/deploy.yml`）會在 push 到 `main` 時自動部署。
需在 repo Secrets 設定：`CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`、`JWT_SECRET`、
`PUBLIC_API_URL`（已部署的 Worker 網址）。

## Android 上架（Phase 2）

```bash
cd app
pnpm exec eas build -p android --profile production   # 產生 .aab
```

再到 Google Play Console 上傳（首次需建開發者帳號、設定簽章與「Designed for Families」政策）。

## 路線圖

- **Phase 1（已完成）**：核心迴圈 — 任務→審核→積分→餵寵物→商店。
- **Phase 2**：造型換裝、現實獎勵兌現、圖鑑/成就、每日任務重置（Cron）、Lottie 動畫、
  Android 上架、推播。
