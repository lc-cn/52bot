---
layout: doc
---
# 快速开始
由于 `52bot` 是基于 `NodeJS` 编写，要使用 "52bot"，你可以按照以下步骤进行操作：
## 1. 安装 Node.js
首先，确保你的计算机上已经安装了 Node.js。你可以在 Node.js 的官方网站上下载并安装适合你操作系统的版本。
## 2. 创建新项目
在你的项目文件夹中，打开终端或命令行界面，并运行以下命令来初始化一个新的 Node.js 项目：
```shell
npm init # 这将会引导你创建一个新的 `package.json` 文件，用于管理你的项目依赖和配置。
```
## 3. 安装 `52bot`以及适配器模块包
运行以下命令来安装 `52bot` 包:
```shell
npm install 52bot
```
- 安装适配器(此处以 `qq官方机器人`举例，更多适配器请前往[适配器章节](/guild/adapter))
```shell
npm install @52bot/qq
```
## 4. 初始化项目
通过 `52bot` 通过的命令，可快速初始化当前项目的配置文件
```shell
npx 52bot init
```
- 通过该命令，将在项目文件夹下生成 `bot.config.ts` 文件，该文件管理着整个框架的 `适配器`、`机器人` 以及 `插件`，后续我们的插件添加和删除均在这儿配置，其大致内容如下:
```typescript
import { defineConfig } from '52bot';
import qqAdapter from '@52bot/qq'
// 更多适配器请访问官方文档
import * as path from 'path';

export default defineConfig(({ mode,zhinSecret,zhinDingTalkSecret,zhinDiscordSecret }) => {
  return {
    logLevel:'info',
    adapters:[
      qqAdapter
    ],
    bots:[
      {
        adapter:'qq', // 使用qq适配器
        appid:'123456789', // qq机器人appId
        secret:'asdflkjasiodf', // qq机器人secret
        group:true, // 是否支持群聊
        private: true, // 是否支持私聊
        public:true // 是否公域机器人
      },
    ],
    pluginDirs:[
      path.resolve(__dirname,'plugins') // 本地插件文件夹路径
    ],
    plugins: [
      'commandParser', // 指令解析插件
      mode === 'dev' && 'hmr', // 开发环境热更插件
      "setup", // setup语法支持插件
      // ... 你自己的的插件
    ].filter(Boolean),
  };
})
```
## 5. 启动项目
再试使用cli指令`52bot` 即可启动框架
```shell
52bot # 启动框架
```
## 6. 编写第一个插件
### 1. 在项目根目录创建一个文件夹，作为本地插件的存储目录
- 此处默认演示插件目录为 `plugins` ，如果你的目录名不是 `plugins` ，请调整 `bot.config.ts` 中 `pluginDirs` 为对应的值，否则插件可能无法正常加载
```shell
mkdir plugins
```
### 2. 在插件文件夹下新建一个 `hello.ts` 文件，作为我们的第一个插件
- 你也可以使用 `js` 开发插件，不过可能无法获取完整的代码提示
```shell
cd plugins
touch hello.ts
```
### 3. 打开 `hello.ts`文件，并输入下代码后保存
```typescript
import {Plugin} from '52bot'

const helloPlugin = new Plugin('helloPlugin') // 创建Plugin实例
hellePlugin.command('hello') // 定义hello指定
.action(({message})=>{
  return `hello ${message.sender.user_name}` // 定义指令返回值
})
export default helloPlugin
```
## 7. 启用插件
回到 `bot.config.ts` 文件，并在 `plugins` 数组中添加 `hello`，如果你启用了 `hmr` 插件，框架将会自动重启。


