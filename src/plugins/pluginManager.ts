import {Plugin} from "@/plugin";

export const pluginManager = new Plugin('pluginManager');
pluginManager
    .command('/插件列表')
    .action((runtime) => {
        return [...runtime.bot.pluginList].map((plugin, index) => {
            return `${index + 1} ${plugin.name}(${plugin.status})`
        }).join('\n')
    })
pluginManager
    .command('/启用插件 [name:string]')
.action((runtime,name)=>{
    const plugin=runtime.bot.plugins.get(name)
    if(!plugin){
        return '该插件不存在'
    }
    plugin.enable()
    return '插件已启用'
})
pluginManager.command('/禁用插件 [name:string]')
.action((runtime,name)=>{
    const plugin=runtime.bot.plugins.get(name)
    if(!plugin){
        return '插件不存在'
    }
    plugin.disable()
    return '插件已禁用'
})
