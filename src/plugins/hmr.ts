import { watch } from 'chokidar'
import {Plugin} from "@";

const HMR=new Plugin('开发热更插件')
const watcher=watch(process.cwd())
const changeListener=(filePath:string)=>{
    const bot=HMR.bot
    const pluginFiles=bot.pluginList.map(p=>p.filePath)
    if(pluginFiles.includes(filePath)){
        const plugin=bot.pluginList.find(p=>p.filePath===filePath)
        bot.logger.debug(`插件：${plugin.name} 产生变更，即将更新`)
        if(plugin===HMR) watcher.off('change',changeListener)
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
