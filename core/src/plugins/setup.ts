import { Adapter, App, ArgsType, Command, getCallerStack, Message, Middleware } from '@';
import {Plugin} from '@/plugin'
import * as path from 'path';
const setupPlugin=new Plugin('setup');
const resolveCallerPlugin=():[boolean,Plugin]=>{
  const callerStack=getCallerStack().map(caller=>caller.getFileName())
  callerStack.shift()
  callerStack.shift()
  callerStack.shift()
  const filePath=callerStack.shift()!;
  const fileName=path.basename(filePath)
  let plugin=setupPlugin.app!.plugins.getWithPath(filePath)
  if(plugin) return [false,plugin]
  plugin=new Plugin(fileName)
  plugin.setup=true
  plugin.filePath=filePath
  return [true,plugin]
}
const getOrCreatePlugin=(options?:Plugin.Options)=>{
  const [isNew,plugin]=resolveCallerPlugin()
  if(options){
    for(const key in options){
      Reflect.set(plugin,key,options[key as keyof Plugin.Options])
    }
  }
  if(!isNew){
    return plugin
  }else{
    setupPlugin.app!.plugins.set(plugin.name,plugin)
    setupPlugin.app!.plugin(plugin)
    setupPlugin.beforeUnmount(()=>{
      setupPlugin.app!.plugins.delete(plugin.name)
    })
    return plugin
  }
}
const methods={
  command<S extends Command.Declare>(
    decl: S,
    initialValue?: ArgsType<Command.RemoveFirst<S>>,
  ){
    const plugin=getOrCreatePlugin()
    return plugin.command(decl,initialValue);
  },
  middleware<AD extends Adapter=Adapter>(middleware:Middleware<AD>){
    const plugin=getOrCreatePlugin()
    plugin.middleware(middleware);
    return this
  },
  adapter(platform:string){
    return setupPlugin.app?.adapters.get(platform)
  },
  bot(platform:string,bot_id:string){
    return this.adapter(platform)?.pick(bot_id)
  },
  sendGroupMessage(platform:string,bot_id:string,group_id:string, message:string,source?:Message){
    return this.adapter(platform)?.sendMsg(bot_id,group_id,'group',message,source)
  },
  sendPrivateMessage(platform:string,bot_id:string,user_id:string, message:string,source?:Message){
    return this.adapter(platform)?.sendMsg(bot_id,user_id,'private',message,source)
  },
  sendGuildMessage(platform:string,bot_id:string,channel_id:string,message:string,source?:Message){
    return this.adapter(platform)?.sendMsg(bot_id,channel_id,'guild',message,source)
  },
  sendDirectMessage(platform:string,bot_id:string,guild_id:string,message:string,source?:Message){
    return this.adapter(platform)?.sendMsg(bot_id,guild_id,'direct',message,source)
  },
  onMount(callback:Plugin.CallBack){
    setupPlugin.mounted(callback)
    if(setupPlugin.isMounted) callback(setupPlugin.app!);
    return this
  },
  onUnmount(callback:Plugin.CallBack){
    const plugin=getOrCreatePlugin()
    plugin.unmounted(callback)
    if(!plugin.isMounted) callback(setupPlugin.app!);
    return this
  },

  option<K extends keyof Plugin.Options>(prop:K,value:Plugin.Options[K]){
    const plugin=getOrCreatePlugin({[prop]:value})
    return this
  },
  options(options:Plugin.Options){
    const plugin=getOrCreatePlugin(options)
    return this
  },
  listen<E extends keyof App.EventMap>(event:E,callback:App.EventMap[E]){
    const plugin=getOrCreatePlugin()
    plugin.on(event,callback)
    return this
  }
}
export const adapter=methods.adapter.bind(methods)
export const bot=methods.bot.bind(methods)
export const middleware=methods.middleware.bind(methods)
export const command=methods.command.bind(methods)
export const sendGroupMessage=methods.sendGroupMessage.bind(methods)
export const sendPrivateMessage=methods.sendPrivateMessage.bind(methods)
export const sendGuildMessage=methods.sendGuildMessage.bind(methods)
export const sendDirectMessage=methods.sendDirectMessage.bind(methods)
export const onMount=methods.onMount.bind(methods)
export const onUnmount=methods.onUnmount.bind(methods)
export const listen=methods.listen.bind(methods)
export const options=methods.options.bind(methods)
export default setupPlugin
