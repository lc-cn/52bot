qq group bot
# 安装依赖
```shell
npm i qq-gorup-bot # or yarn add qq-gorup-bot
```
# 使用
```js
const { QQBot } = require('qq-gorup-bot')
const config={
	appID: '', // qq群机器人的appID
	token: '', // qq群机器人的appSecret
    sandbox: true, // 是否是沙箱环境
	intents: ['GROUP_AT_MESSAGE_CREATE','C2C_MESSAGE_CREATE']
}
const bot=new QQBot(config)

bot.start()
bot.on('message.group',(e:MessageEvent)=>{
    e.reply({
        type:'image',
	    file:'https://bot.91m.top/123.png'
    })
})
bot.on('message.private',(e)=>{
    e.reply({
	    type:'image',
	    file:'https://bot.91m.top/123.png'
    })
})
```
