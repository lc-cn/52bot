import {watch} from 'chokidar'
import { Plugin, App } from '@';
import * as path from "path";
import * as fs from "fs";

const HMR = new Plugin('HMR')
const localPluginDirs = process.env.pluginDirs?.split(',') || []
const watchDirs = [ // 只监听本地插件和内置插件的变更，模块的管不了
    ...localPluginDirs.filter(Boolean).map(dir => {
        return path.resolve(process.cwd(), dir)
    }),// 本地插件
    __dirname, // 内置插件
    path.resolve(__dirname, '../adapters'),
    path.join(process.cwd(), `.${process.env.mode}.env`), // 环境变量
]
const watcher = watch(watchDirs.filter(p => {
    return fs.existsSync(p)
}))
const reloadProject = () => {
    HMR.app!.logger.info(`\`.${process.env.mode}.env\` changed restarting ...`)
    return process.exit(51)
}
const reloadAdapter = (filePath: string) => {
    const adapterName = filePath
        .replace(path.dirname(filePath) + '/', '')
        .replace(/\.(t|j|cj)s/, '')
    let adapter = HMR.app!.adapters.get(adapterName)
    if (!adapter) return
    const oldCache = require.cache[filePath]
    adapter.unmount()
    HMR.app!.adapters.delete(adapterName)
    delete require.cache[filePath]
    try {
        HMR.app!.initAdapter([adapterName])
    } catch (e) {
        require.cache[filePath] = oldCache
        HMR.app!.initAdapter([adapterName])
    }
    adapter = HMR.app!.adapters.get(adapterName)
    if (!adapter) return
    adapter.emit('start')
}
const reloadPlugin = (filePath: string) => {
    const app:App = HMR.app!
    const plugin = HMR.app!.pluginList.find(p => p.filePath === filePath)
    if(!plugin) return
    app.logger.debug(`插件：${plugin.name} 产生变更，即将更新`)
    if (plugin === HMR) watcher.close()
    const oldCache = require.cache[filePath]
    app.unmount(plugin)
    delete require.cache[filePath]
    try {
        app.mount(filePath)
    } catch (e) {
        require.cache[filePath] = oldCache
        app.mount(filePath)
    }
}
const changeListener = (filePath: string) => {
    if (filePath.endsWith('.env')) {
        reloadProject()
    }
    const pluginFiles = HMR.app!.pluginList.map(p => p.filePath)
    if (watchDirs.some(dir => filePath.startsWith(dir)) && pluginFiles.includes(filePath)) {
        reloadPlugin(filePath)
    }
    if (filePath.startsWith(path.resolve(__dirname, '../adapters'))) {
        reloadAdapter(filePath)
    }
}
watcher.on('change', changeListener)
export default HMR
