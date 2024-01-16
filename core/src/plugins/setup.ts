import { App, ArgsType, Command, getCallerStack, Middleware } from '@';
import {Plugin} from '@/plugin'
import * as path from 'path';
const setupPlugin=new Plugin('setup');
const resolveCallerPlugin=()=>{
  const callerStack=getCallerStack().map(caller=>caller.getFileName())
  callerStack.shift()
  callerStack.shift()
  callerStack.shift()
  const filePath=callerStack.shift()!;
  const fileName=path.basename(filePath)
  const pluginName=require(filePath)?.name||fileName.split('.')[0]
  return [pluginName,filePath]
}
const getOrCreatePlugin=()=>{
  const [pluginName,filePath]=resolveCallerPlugin()
  const plugin=setupPlugin.app!.plugins.getWithPath(filePath)
  if(plugin){
    return plugin
  }else{
    const plugin=new Plugin(pluginName)
    plugin.setup=true
    plugin.filePath=filePath
    setupPlugin.app!.plugins.set(plugin.name,plugin)
    setupPlugin.app!.plugin(plugin)
    setupPlugin.beforeUnmount(()=>{
      setupPlugin.app!.plugins.delete(pluginName)
    })
    return plugin
  }
}
const methods={
  useCommand<S extends Command.Declare>(
    decl: S,
    initialValue?: ArgsType<Command.RemoveFirst<S>>,
  ){
    const plugin=getOrCreatePlugin()
    return plugin.command(decl,initialValue);
  },
  useMiddleware(middleware:Middleware){
    const plugin=getOrCreatePlugin()
    plugin.middleware(middleware);
    return this
  },
  onMount(callback:Function){
    setupPlugin.mounted(callback)
    if(setupPlugin.isMounted) callback();
    return this
  },
  onUnmount(callback:Function){
    const plugin=getOrCreatePlugin()
    plugin.unmounted(callback)
    if(!plugin.isMounted) callback();
    return this
  },
  listen<E extends keyof App.EventMap>(event:E,callback:App.EventMap[E]){
    const plugin=getOrCreatePlugin()
    plugin.on(event,callback)
    return this
  }
}
export const useMiddleware=methods.useMiddleware
export const useCommand=methods.useCommand
export const onMount=methods.onMount
export const onUnmount=methods.onUnmount
export const listen=methods.listen
export default setupPlugin
