# ts-qqbot
## 1. 快速上手
- 安装 & 初始化
```shell
# 1. 安装依赖
npm i ts-qqbot # or yarn add ts-qqbot
# 2. 初始化配置文件
npx ts-qqbot init -m dev
```
- 填写配置
打开生成在根目录的 `.dev.env` 文件，填入相关环境变量
```text
appid = ""                                # 填入你的机器人appid
token = ""                                # 填入你的机器人token
secret = ""                               # 填入你的机器人secret
logLevel = ""                             # 日志输出等级 默认为info，不填请注释本行
group = true                              # 如果没有私聊权限 请注释本行
group = true                              # 如果没有群聊权限 请注释本行
public = true                             # 如果是私域机器人 请注释本行
builtPlugins = commandParser,hmr          # 启用的内置插件列表
pluginDirs = plugins                      # 需要加载哪个本地文件夹下的插件，多个文件夹可用 “,” 分隔
```
- 启动
```text
npx ts-qqbot -m dev
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
const {Bot} = require('ts-qqbot')
const bot = new Bot({
	// ...
})
bot.mount('[模块名]') // 按模块名称加载插件，将一次查找(./plugins>内置插件>官方插件库>社区插件库>node_modules)目录下对应名称的插件
bot.mount(plugin) // 直接加载对应插件实例
bot.loadFromDir('./plugins', './services') // 加载指定目录下的所有插件，可传入多个目录，将多次加载
bot.start()
```
## 卸载插件
```javascript

bot.unmount('[插件名]') // 按插件名卸载对应的插件
bot.unmount(plugin) // 直接卸载对应插件实例
bot.start()

```
