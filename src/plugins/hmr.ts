import { watch } from 'chokidar'
import {Plugin} from "@";
import * as path from "path";
import * as fs from "fs";

const HMR=new Plugin('HMR')
const watchDirs=[ // 只监听本地插件和内置插件的变更，模块的管不了
    path.join(process.cwd(),'plugins'), // 本地插件
    __dirname, // 内置插件
]
const watcher=watch(watchDirs.filter(p=>{
    return fs.existsSync(p)
}))

const changeListener=(filePath:string)=>{
    const bot=HMR.bot
    const pluginFiles=bot.pluginList.map(p=>p.filePath)
    if(watchDirs.some(dir=>filePath.startsWith(dir)) && pluginFiles.includes(filePath)){
        const plugin=bot.pluginList.find(p=>p.filePath===filePath)
        bot.logger.debug(`插件：${plugin.name} 产生变更，即将更新`)
        if(plugin===HMR) watcher.close()
        const oldCache=require.cache[filePath]
        bot.unmount(plugin)
        delete require.cache[filePath]
        try{
            bot.mount(filePath)
        }catch (e){
            require.cache[filePath]=oldCache
            bot.logger.warn(`热更失败，已还原到上次的缓存，失败原因：${e.message}\n${e.stack}`)
            bot.mount(filePath)
        }
    }
}
watcher.on('change',changeListener)
export default HMR
