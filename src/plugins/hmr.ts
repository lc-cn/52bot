import {watch} from 'chokidar'
import {Plugin} from "@";
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
    HMR.zhin.logger.info(`\`.${process.env.mode}.env\` changed restarting ...`)
    return process.exit(51)
}
const reloadAdapter = (filePath: string) => {
    const adapterName = filePath
        .replace(path.dirname(filePath) + '/', '')
        .replace(/\.(t|j|cj)s/, '')
    let adapter = HMR.zhin.adapters.get(adapterName)
    if (!adapter) return
    const oldCache = require.cache[filePath]
    adapter.unmount()
    HMR.zhin.adapters.delete(adapterName)
    delete require.cache[filePath]
    try {
        HMR.zhin.initAdapter([adapterName])
    } catch (e) {
        require.cache[filePath] = oldCache
        HMR.zhin.logger.warn(`热更失败，已还原到上次的缓存，失败原因：${e.message}\n${e.stack}`)
        HMR.zhin.initAdapter([adapterName])
    }
    adapter = HMR.zhin.adapters.get(adapterName)
    if (!adapter) return
    adapter.emit('start')
}
const reloadPlugin = (filePath: string) => {
    const zhin = HMR.zhin
    const plugin = HMR.zhin.pluginList.find(p => p.filePath === filePath)
    zhin.logger.debug(`插件：${plugin.name} 产生变更，即将更新`)
    if (plugin === HMR) watcher.close()
    const oldCache = require.cache[filePath]
    zhin.unmount(plugin)
    delete require.cache[filePath]
    try {
        zhin.mount(filePath)
    } catch (e) {
        require.cache[filePath] = oldCache
        zhin.logger.warn(`热更失败，已还原到上次的缓存，失败原因：${e.message}\n${e.stack}`)
        zhin.mount(filePath)
    }
}
const changeListener = (filePath: string) => {
    if (filePath.endsWith('.env')) {
        reloadProject()
    }
    const pluginFiles = HMR.zhin.pluginList.map(p => p.filePath)
    if (watchDirs.some(dir => filePath.startsWith(dir)) && pluginFiles.includes(filePath)) {
        reloadPlugin(filePath)
    }
    if (filePath.startsWith(path.resolve(__dirname, '../adapters'))) {
        reloadAdapter(filePath)
    }
}
watcher.on('change', changeListener)
export default HMR
