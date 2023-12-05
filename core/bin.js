#!/usr/bin/env node

"use strict";
const path = require("path");
const fs = require("fs");
const jiti = require('jiti')(__dirname)
const defaultArgv = {
	mode: 'prod',
	entry: 'lib',
	init: false
}
const getValue = (list, key, defaultValue) => {
	const value = list[list.indexOf(key) + 1];
	if (!value || value.startsWith('-')) return defaultValue;
	list.splice(list.indexOf(key) + 1, 1)
	return value;
}
const args = process.argv?.slice(2) || []
for (const key of args) {
	switch (key) {
		case '--mode':
		case '-m':
			defaultArgv.mode = getValue(args, key, defaultArgv.mode)
			break
		case '--entry':
		case '-e':
			defaultArgv.entry = getValue(args, key, defaultArgv.entry)
			break;
		case 'init':
			defaultArgv.init = true
	}
}
if (defaultArgv.init) {
	fs.writeFileSync(path.resolve(process.cwd(), `.${defaultArgv.mode}.env`), "adapters = qq\n" +
		"builtPlugins = commandParser,hmr,echo\n" +
		"logLevel = info\n" +
		"modulePlugins = \n" +
		"pluginDirs = plugins")
	console.log(`请在.${defaultArgv.mode}.env中配置相应参数后再次调用\`npx 52bot -m ${defaultArgv.mode}\` 启动`)
	process.exit(0)
}
jiti(path.resolve(__dirname, defaultArgv.entry)).startBotWorker(defaultArgv.entry, defaultArgv.mode)
