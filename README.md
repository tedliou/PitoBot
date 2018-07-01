# PitoBot
PitoBot 是我第一個使用 Node.js 開發的應用程式，語法應用尚不純熟，如有建議歡迎提出討論！
* * *
## Deployment
以下是部屬這個 Bot 需要的軟體環境：

* Node.js - https://nodejs.org

將這個專案的所有檔案打包下來後，打開終端機並切換到當前資料夾中輸入指令：
```
  npm install
```
所需套件將會自動安裝完成。

接著請編輯 config.json
```
{
	"Version": "1.0.0",
	"Api": {
		"DiscordToken": "你的Bot Token"
	},
	"Setting": {
		"CommandPrefix": ".",
		"AccountStatus": {
			"type": "watching",
			"name": "tedliou.com"
		},
		"MessageDelete": {
			"enable": false,
			"delay": 10
		}
	}
}
```
最後輸入指令 `node pitobot.js` 即可啟動音樂機器人。
