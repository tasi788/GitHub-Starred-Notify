# GitHub Starred Notify

![header](https://p176.p0.n0.cdn.getcloudapp.com/items/mXuyKWlb/CleanShot%202020-08-22%20at%2017.23.25@2x.png)

專給那些喜歡看 repo 星星的捧友。
他可以做到什麼？

✅ 不需要額外伺服器

🚀 即時發送通知到 Telegam

👷‍♂️ 不需額外維護

🎳 多個群組、對話通知

## 使用方式

打開 Google Drive 內新增資料夾，新增一個 `Google 試算表` 以及一個 `Google Apps Script` ，在「更多」就能找到 `Google Apps Script`。

![img](https://p176.p0.n0.cdn.getcloudapp.com/items/8LuP5Ney/CleanShot%202020-08-22%20at%2016.44.38@2x.png)

接著將 `main.gs` 內容貼上到剛剛新建的檔案內，然後回到 `Google 試算表` 將網址複製取其中的 `id`。

例如

`https://docs.google.com/spreadsheets/d/1Fvhu4wNf_XXXXXXX_vWWWWWWWEbK4lncLZOexxxxxxx/edit#gid=0`

而其中的 `1Fvhu4wNf_XXXXXXX_vWWWWWWWEbK4lncLZOexxxxxxx` 就是 `id` 將其複製貼上到 `Google Apps Script` 內的第二行。

第三行則是 Telegram Bot ，需要先透過 [Botfather](https://t.me/botfather) 申請。



回到 `Google 試算表` 內，將現有的 `活頁簿` 重新命名為 `data` ，並將第一行命名為喜歡的名稱。

![img](https://p176.p0.n0.cdn.getcloudapp.com/items/GGuRpBgK/CleanShot%202020-08-22%20at%2017.13.24@2x.png)

而下面則是輸入 repo 的完整路徑，可以參考上圖。 `chat_id` 則是 telegram 內的 `chat_id` ，不會查看 `id` 可以參考 [my_id_bot](https://t.me/my_id_bot)。

🚨 另外支援多頻群、對話通知，請使用 `,` 作為間隔。

接著回到 `Google Apps Script` 點擊函示設定為 `main` 並執行，會先進行確認授權行為，請全部允許。

![img](https://p176.p0.n0.cdn.getcloudapp.com/items/DOuxBE0r/CleanShot%202020-08-22%20at%2017.18.28@2x.png)

最後點擊旁邊的時鐘圖示讓他定期確認，這邊建議十分鐘即可，過短可能會有 API Limit 問題。

![img](https://p176.p0.n0.cdn.getcloudapp.com/items/o0u8PLw5/CleanShot%202020-08-22%20at%2017.21.03@2x.png)



## TODO

```
- [ ] 自動產生 Sheet
```

