const path = require("path");
const fs = require('fs')
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
const {createApp} = require(entry)
let config=wrapExport(configFile)
if(typeof config==='function') config=config(process.env)
createApp(config)
	.start()
const errorHandler = e => console.error(e);

process.on("unhandledRejection", errorHandler);
process.on("uncaughtException", errorHandler);
