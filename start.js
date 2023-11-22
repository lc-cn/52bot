const path = require("path");
const dotEnv=require('dotenv')
let { mode = "", entry } = process.env;
entry = path.resolve(__dirname, entry || "lib");
const {Bot} = require(entry)
const envConfig=dotEnv.config({
	path: path.join(process.cwd(),`.${mode}.env`)
})
if(envConfig.parsed){
	const config=envConfig.parsed
	if(!config.appid) throw new Error("环境变量中没有appid")
	if(!config.token) throw new Error("环境变量中没有token")
	if(!config.secret) throw new Error("环境变量中没有secret")
	config.logLevel=config.logLevel||"info"
	config.removeAt=config.removeAt||true
	if(!config.intents) config.intents=[
		config.group==='true' && 'GROUP_AT_MESSAGE_CREATE',
		config.private==='true' && 'C2C_MESSAGE_CREATE',
		'DIRECT_MESSAGE',
		!(config.public==='true') && 'GUILD_MESSAGES',
		'GUILDS',
		'GUILD_MEMBERS',
		'GUILD_MESSAGE_REACTIONS',
		'DIRECT_MESSAGE',
		'INTERACTION',
		config.public ==='true' && 'PUBLIC_GUILD_MESSAGES'
	].filter(Boolean)
	else config.intents=config.intents.split(',')
	const builtPlugins=config.builtPlugins?.split(',')||[]
	const loadPluginDirs=config.pluginDirs?.split(',')||[]
	const bot=new Bot(config)
	bot.loadFromBuilt(builtPlugins)
	bot.loadFromDir(...loadPluginDirs)
	bot.start()
}else{
	throw envConfig.error||new Error(`解析文件: .${mode}.env 失败`)
}
const errorHandler = e => console.error(e);

process.on("unhandledRejection", errorHandler);
process.on("uncaughtException", errorHandler);
