import {watch,FSWatcher} from 'chokidar'
import { Plugin } from '@';
import * as path from "path";
import * as fs from "fs";
import * as process from 'process';

const HMR = new Plugin('HMR')
let watcher:FSWatcher
HMR.unmounted(()=>{
    watcher?.close()
})
HMR.mounted(()=>{
    const app=HMR.app!
    const watchDirs = [ // 只监听本地插件和内置插件的变更，模块的管不了
        ...(app.config.pluginDirs||[]).map(dir=>{
            return path.join(process.cwd(),dir)
        }),// 本地目录插件
        __dirname, // 内置插件
        app.config.configFile?app.config.configFile:'', // 配置文件
        path.join(process.cwd(), `.${process.env.mode}.env`), // 环境变量
    ].filter(Boolean)
    watcher = watch(watchDirs.filter(p => {
        return fs.existsSync(p)
    }))
    const reloadProject = (filename:string) => {
        app.logger.info(`\`${filename}\` changed restarting ...`)
        return process.exit(51)
    }
    const reloadAdapter = (filePath: string) => {
        const adapterName = filePath
          .replace(path.dirname(filePath) + '/', '')
          .replace(/\.(t|j|cj)s/, '')
        let adapter = app.adapters.get(adapterName)
        if (!adapter) return
        const oldCache = require.cache[filePath]
        adapter.unmount()
        app.adapters.delete(adapterName)
        delete require.cache[filePath]
        try {
            app.initAdapter([adapterName])
        } catch (e) {
            require.cache[filePath] = oldCache
            app.initAdapter([adapterName])
        }
        adapter = app.adapters.get(adapterName)
        if (!adapter) return
        adapter.emit('start')
    }
    const reloadPlugin=(filePath:string,plugin:Plugin)=>{
        app.logger.debug(`插件：${plugin.name} 产生变更，即将更新`)
        const oldCache = require.cache[filePath]
        if(plugin===HMR) watcher.close()
        app.unmount(plugin)
        delete require.cache[filePath]
        try {
            app.mount(filePath)
        } catch (e) {
            require.cache[filePath] = oldCache
            app.mount(filePath)
        }
    }
    const reloadPlugins = (filePath: string) => {
        const plugins = app.pluginList.filter(p => p.filePath === filePath)
        if(!plugins.length) return
        for(const plugin of plugins) {
            reloadPlugin(filePath,plugin)
        }
    }
    const changeListener = (filePath: string) => {
        if (filePath.endsWith('.env') || filePath===app.config.configFile) {
            return reloadProject(filePath.replace(path.dirname(filePath)+'/',''))
        }
        const pluginFiles = app.pluginList.map(p => p.filePath)
        if (watchDirs.some(dir => filePath.startsWith(dir)) && pluginFiles.includes(filePath)) {
            return reloadPlugins(filePath)
        }
        if (filePath.startsWith(path.resolve(__dirname, '../adapters'))) {
            return reloadAdapter(filePath)
        }
    }
    watcher.on('change', changeListener)
})
export default HMR
