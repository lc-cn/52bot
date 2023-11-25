const path = require("path");
const dotEnv=require('dotenv')
let { mode = "", entry } = process.env;
entry = path.resolve(__dirname, entry || "lib");
const {App} = require(entry)
const envConfig=dotEnv.config({
	path: path.join(process.cwd(),`.${mode}.env`)
})
if(envConfig.parsed){
	const config=envConfig.parsed
	config.logLevel=config.logLevel||"info"
	const adapters=config.adapters?.split(',')||[]

	const builtPlugins=config.builtPlugins?.split(',')||[]
	const modulePlugins = config.modulePlugins?.split(',')||[]
	const pluginDir=config.pluginDirs?.split(',')||[]
	const app=new App({
		...config,
		adapters
	})
	app.loadFromBuilt(builtPlugins)
	app.loadFromModule(modulePlugins)
	app.loadFromDir(...pluginDir)
	app.start()
}else{
	throw envConfig.error||new Error(`解析文件: .${mode}.env 失败`)
}
const errorHandler = e => console.error(e);

process.on("unhandledRejection", errorHandler);
process.on("uncaughtException", errorHandler);
