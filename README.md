# ts-qqbot
## 安装依赖
```shell
npm i ts-qqbot # or yarn add ts-qqbot
```
## 使用
```js
const { Bot,Plugin } = require('ts-qqbot')
// 创建机器人
const bot=new Bot({
	appid: '', // qq机器人的appID (必填)
	token: '', // qq机器人的appToken (必填)
	secret: '', // qq机器人的secret (必填)
	sandbox: true, // 是否是沙箱环境 默认 false
	removeAt:true, // 移除第一个at 默认 false
	logLevel:'info', // 日志等级 默认 info
	maxRetry: 10, // 最大重连次数 默认 10
	intents: [
		'GROUP_AT_MESSAGE_CREATE', // 群聊@消息事件 没有群权限请注释
        'C2C_MESSAGE_CREATE', // 私聊事件 没有私聊权限请注释
        'GUILD_MESSAGES', // 私域机器人频道消息事件 公域机器人请注释
        'PUBLIC_GUILD_MESSAGES', // 公域机器人频道消息事件 私域机器人请注释
        'DIRECT_MESSAGE', // 频道私信事件
        'GUILD_MESSAGE_REACTIONS', // 频道消息表态事件
        'GUILDS', // 频道变更事件
        'GUILD_MEMBERS', // 频道成员变更事件
        'DIRECT_MESSAGE', // 频道私信事件
    ], // (必填)
})
// 创建插件
const testPlugin=new Plugin('test')
// 定义指令
testPlugin
	.command('/test')
	.action(()=>'hello world')
// 定义指令
testPlugin
    .command('/一言')
	.action(async()=>{
		const {data}=await axios.get('https://v1.hitokoto.cn/?encode=text')
		return data
	})
// 定义指令
testPlugin
    .command('/日记')
	.action(async()=>{
		const {data}=await axios.get('https://v2.api-m.com/api/dog')
		return data
	})
// 定义指令
testPlugin
    .command('/百科 <keyword:string>')
	.action(async(_,keyword)=>{
		const {data}=await axios.get(`https://baike.deno.dev/item/${encodeURIComponent(keyword)}?encoding=text`)
		return data
	})
// 挂载插件
bot.mount(testPlugin)
// 启动机器人
bot.start()
```
## 发送消息
```javascript
const {Bot} = require('ts-qqbot')
const bot=new Bot({
    // ...
})
// 只有启动后，才能发送
bot.start().then(()=>{
    // 频道被动回复
    bot.on('message.guild',(e)=>{
        e.reply('hello world')
    })
    // 频道私信被动回复
    bot.on('message.direct',(e)=>{
        e.reply('hello world')
    })
    // 群聊被动回复
    bot.on('message.group',(e)=>{
        e.reply('hello world')
    })
    // 私聊被动回复
    bot.on('message.private',(e)=>{
        e.reply('hello world')
    })
    // 主动发送频道消息
    bot.sendGuildMessage(channel_id,'hello')
    // 主动发送群消息
    bot.sendGroupMessage(group_id,'hello')
    // 主动发送私聊消息
    bot.sendPrivateMessage(user_id,'hello')
    // 主动发送频道消息，注：需要先调用bot.createDirectSession(guild_id,user_id)创建私信会话，此处传入的guild_id为创建的session会话中返回的guild_id
    bot.sendDirectMessage(guild_id,'hello')
})
```
##  插件开发
- 新建文件`testPlugin.js`

```javascript
const {Plugin} = require('ts-qqbot')

const testPlugin=new Plugin('test')

// ... 在这儿实现你的逻辑

module.exports=testPlugin
```

### 1.定义指令
```javascript

// 在省略号出调用 testPlugin.command 可以定义一个指令
testPlugin
	.command('/百科 <keyword:string>')
	.action(async(_,keyword)=>{
		const {data}=await axios.get(`https://baike.deno.dev/item/${encodeURIComponent(keyword)}?encoding=text`)
		return data
	})
```
### 2. 定义中间件
```javascript

// 在省略号出调用 testPlugin.middleware 可以往bot中注册一个中间件
testPlugin.middleware((message,next)=>{
	if(!message.raw_message.startsWith('hello')) return next()
    return message.reply('world')
})
```
### 3. 定义服务
- 服务是一个虚拟概念，由插件开发者在插件中声明的特有属性，该属性可暴露给其他插件访问
```javascript

// 在省略号出调用 testPlugin.service 可以定义一个服务
testPlugin.service('foo','bar')

console.log(testPlugin.foo) // 输出 bar
```
- 注意：如果已有之前已加载同名的服务，将不可覆盖已有服务

- 当插件被加载后，后续加载的插件即可访问到该服务
```javascript
const {Plugin} = require('ts-qqbot')

const helloPlugin=new Plugin('hello')
console.log(helloPlugin.foo) // 输出bar

module.exports=testPlugin
```
- 可选：定义服务类型
- 开发者为服务添加类型声明后，其他人在使用服务时，将获得类型提示
```typescript
declare module 'ts-qqbot'{
    namespace Bot{
        interface Services{
            foo:string
        }
    }
}
```
## 使用插件
```javascript
const {Bot}=require('ts-qqbot')
const bot=new Bot({
    // ...
})
bot.mount('[模块名]') // 按模块名称加载插件，将一次查找(./plugins>内置插件>官方插件库>社区插件库>node_modules)目录下对应名称的插件
bot.mount(plugin) // 直接加载对应插件实例
bot.loadFromDir('./plugins','./services') // 加载指定目录下的所有插件，可传入多个目录，将多次加载
bot.start()
```
## 卸载插件
```javascript

bot.unmount('[插件名]') // 按插件名卸载对应的插件
bot.unmount(plugin) // 直接卸载对应插件实例
bot.start()

```
