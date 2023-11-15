qq group bot
# 安装依赖
```shell
npm i qq-group-bot # or yarn add qq-gorup-bot
```
# 使用
```js
const { QQBot,Plugin } = require('qq-group-bot')
const config={
	appID: '', // qq群机器人的appID
	token: '', // qq群机器人的appSecret
    sandbox: true, // 是否是沙箱环境
	intents: ['GROUP_AT_MESSAGE_CREATE','C2C_MESSAGE_CREATE']
}
const bot=new QQBot(config.appID, config)

const testPlugin=new Plugin('test')
testPlugin
	.command('/test')
	.action(()=>'hello world')
testPlugin.command('/一言')
	.action(async()=>{
		const {data}=await axios.get('https://v1.hitokoto.cn/?encode=text')
		return data
	})
testPlugin.command('/日记')
	.action(async()=>{
		const {data}=await axios.get('https://v2.api-m.com/api/dog')
		return data
	})
testPlugin.command('/百科 <keyword:string>')
	.action(async(_,keyword)=>{
		const {data}=await axios.get(`https://baike.deno.dev/item/${encodeURIComponent(keyword)}?encoding=text`)
		return data
	})
bot.use(testPlugin)
bot.start()
```
