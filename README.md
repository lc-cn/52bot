qq group bot
# 安装依赖
```shell
npm i qq-gorup-bot # or yarn add qq-gorup-bot
```
# 使用
```js
const { Bot,AvailableIntentsEventsEnum } = require('qq-gorup-bot')
const config={
	appID: '', // qq群机器人的appID
	token: '', // qq群机器人的appSecret
    sandbox: true, // 是否是沙箱环境
	intents: [
		AvailableIntentsEventsEnum.GROUP_AT_MESSAGE_CREATE,
		AvailableIntentsEventsEnum.C2C_MESSAGE_CREATE
    ]
}
const bot=new Bot(config)

bot.start()
bot.on('message.group',(e:MessageEvent)=>{
    e.reply({
        type:MessageType.Image,
        data:{
            src:'https://bot.91m.top/123.png'
        }
    })
})
bot.on('message.private',(e)=>{
    e.reply({
        type:MessageType.Image,
        data:{
            src:'https://bot.91m.top/123.png'
        }
    })
})
```
