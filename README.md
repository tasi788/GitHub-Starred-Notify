# GitHub Starred Notify

![header](https://p176.p0.n0.cdn.getcloudapp.com/items/mXuyKWlb/CleanShot%202020-08-22%20at%2017.23.25@2x.png)

專給那些喜歡看 repo 星星的捧友。

GitHub 星星通知器是一個使用 TypeScript 編寫的實用工具，旨在監控您的 GitHub 倉庫的點星行為。它運行在多元化的 Cloudflare Worker 平台上，並通過 Telegram 通知您誰點了星星，以及誰把星星拿走了。

## 功能

- ⚡️ 實時監控您的 GitHub 倉庫的點星行為
- 🚀 通知直接發送到您的 Telegram
- 😎 使用 TypeScript 編寫
- ✅ 運行在 Cloudflare Worker 不需要額外伺服器
- 👷‍♂️ 不需額外維護
- 🎳 多個群組、對話通知

## 預備條件

- Cloudflare 帳戶
- Telegram 機器人 token
- GitHub 個人訪問權限 token

## 設定

### 複製倉庫:
`git clone https://github.com/tasi788/GitHub-Starred-Notify.git`

將username和reponame替換為你的 GitHub 用戶名和倉庫名稱。

### 安裝依賴:
bash
yarn install
# 或者
npm install

### 設定環境變數:
在專案的根目錄中創建一個新的.env文件，並添加以下環境變數:


TELEGRAM_BOT_TOKEN=您的telegram機器人token
TELEGRAM_CHAT_ID=你的telegram聊天id
GH_PERSONAL_ACCESS_TOKEN=您的github個人訪問權限token

將「你的telegram機器人token」、「你的telegram聊天id」和「您的github個人訪問權限token」替換為您實際的資料。  
## 部署
將程式碼部署到 Cloudflare Worker，可以參考 Cloudflare 的官方文件。

## 警告
本工具功能用於監控個人或者組織的開源項目，請合理合法使用，尊重他人的隱私。

此文件由 ChatGPT 自動產生