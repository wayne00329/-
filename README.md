# 每日行程管理

使用原生 HTML、CSS、JavaScript 與 Supabase Auth/Postgres 的響應式行程管理網站。帳號可在多台裝置登入，行程儲存在雲端資料庫並即時同步。

## 功能

- 以電子郵件與密碼註冊／登入，註冊時設定暱稱
- 在不同手機、平板或電腦登入同一帳號，讀取相同行程
- 新增行程，設定日期、時間、分類、優先度與備註
- 完成狀態、刪除、日期瀏覽與篩選
- Supabase Row Level Security 確保登入者只能存取自己的行程

> 暱稱是帳號顯示名稱；登入使用電子郵件與密碼。這樣可使用 Supabase 提供的安全驗證與電子郵件驗證／帳號復原能力。網站不會直接存取或儲存明文密碼。

## 一次性設定

此專案目前是靜態網站，跨裝置同步需要雲端後端。需要建立一個免費 Supabase 專案並完成以下設定；僅把網站檔案推上 GitHub 不會自動建立資料庫或同步服務。

1. 到 [supabase.com](https://supabase.com/) 建立專案。
2. 在 Supabase 專案的 **SQL Editor** 執行 `supabase/schema.sql` 全部內容，建立資料表及每位使用者的資料隔離政策。
3. 在專案設定的 **API** 頁面複製 **Project URL** 與 **anon / publishable key**。
4. 編輯 `config.js`，以複製的值替換 `YOUR_SUPABASE_PROJECT_URL` 與 `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`。
   - 只使用 anon/publishable key；**絕不可**放入 `service_role` 或其他秘密金鑰。
5. 在 Supabase **Authentication → URL Configuration** 將網站網址加入 Site URL / Redirect URLs。若尚未部署，可先加本機測試網址。
6. 在 **Authentication → Providers → Email** 確認 Email 登入已啟用。測試時可保留郵件驗證；註冊後依提示到信箱驗證。
7. 部署整個專案到 HTTPS 靜態網站主機。GitHub Pages 對私人儲存庫是否可用取決於 GitHub 方案；也可使用 Netlify 或 Vercel。

## 本機測試

可用 VS Code Live Server，或在專案目錄執行 `python -m http.server 8000`，再開啟 `http://localhost:8000`。`file://` 直接開啟不建議用於驗證登入回呼。

## 安全提醒

- `config.js` 中的 anon/publishable key 可公開，但資料庫安全必須依賴 `supabase/schema.sql` 的 RLS 政策。
- 不要在前端放置 Supabase `service_role` key。
- 請使用強密碼；電子郵件用於登入與帳號驗證／復原。
- 網站目前不提供離線編輯；跨裝置同步需連線至 Supabase。
