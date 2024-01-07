const path = require("path");
const fs = require('fs')
const dotEnv=require('dotenv')
const Yaml = require('yaml')
const wrapExport=(filePath)=>{
	const result=require(filePath)
	if(result.default) {
		const {default:main,...other}=result
		return Object.assign(main,other)
	}
	return result
}
let { mode = "",config:configFile,...other } = process.env;
const entry = path.resolve(__dirname, "lib");
const {App} = require(entry)
const envConfig=dotEnv.config({
	path: path.join(process.cwd(),`.${mode}.env`)
})
if(envConfig.parsed){
	const options=envConfig.parsed
	options.logLevel=options.logLevel||"info"

	const adapters=options.adapters?.split(',')||[]

	options.pluginDirs=(options.pluginDirs||'').split(',').filter(Boolean)
	let config,existConfigFile=false;
	if(fs.existsSync(configFile)){
		existConfigFile=true
		if(/\.[tj]s$/.test(configFile)) config=wrapExport(configFile)
		else if(/\.y(a)?ml$/.test(configFile)) config=Yaml.parse(fs.readFileSync(configFile,'utf8'))
		else throw new Error('unSupport config file type. (support: .js .ts .yaml .yml )')
	}
	if(typeof config==='function') config=config({mode,...other})
	const app=new App({
		...options,
		...(existConfigFile?{configFile}:{}),
		adapters
	})
	const configPlugins=[]
	if(config){
		let {plugins=[]}=config
		if(!Array.isArray(plugins)) plugins=Object.entries(plugins.map(([name,enable])=>{
			return {name,enable:enable!==false}
		}))
		for(let pluginInfo of plugins){
			if(typeof pluginInfo==='string') pluginInfo={name:pluginInfo,enable:true}
			configPlugins.push(pluginInfo)
		}
	}
	app.start().then(()=>{
		const builtPlugins=options.builtPlugins?.split(',')||[]
		const modulePlugins = options.modulePlugins?.split(',')||[]
		for(const plugin of [...builtPlugins,...modulePlugins]){
			app.loadPlugin(plugin)
		}
		for(const pluginInfo of configPlugins){
			app.loadPlugin(pluginInfo.name)
			if(!pluginInfo.enable) app.disable(pluginInfo.name)
		}
		app.logger.info(`load ${app.pluginList.length} plugins. (${app.pluginList.map(p=>p.name)})`)
	})
}else{
	throw envConfig.error||new Error(`解析文件: .${mode}.env 失败`)
}
const errorHandler = e => console.error(e);

process.on("unhandledRejection", errorHandler);
process.on("uncaughtException", errorHandler);
