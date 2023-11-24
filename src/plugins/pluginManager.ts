import {Plugin} from "@/plugin";

const PM = new Plugin('插件管理');
PM
    .command('/插件列表')
    .scope('private', 'group', 'guild', "direct")
    .action((runtime) => {
        return {
            type: "text",
            text: [...PM.zhin.pluginList].map((plugin, index) => {
                return `${index + 1} ${plugin.name}(${plugin.statusText})`
            }).join('\n')
        }
    })
PM
    .command('/启用插件 [name:string]')
    .permission('admin')
    .scope("direct")
    .action((runtime, name) => {
        const plugin = PM.zhin.plugins.get(name)
        if (!plugin) {
            return '该插件不存在'
        }
        plugin.enable()
        return '插件已启用'
    })
PM.command('/禁用插件 [name:string]')
    .permission('admin')
    .scope("direct")
    .action((runtime, name) => {
        const plugin = PM.zhin.plugins.get(name)
        if (!plugin) {
            return '插件不存在'
        }
        plugin.disable()
        return '插件已禁用'
    })
export default PM
