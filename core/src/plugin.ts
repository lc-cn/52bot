import { ArgsType, Command, defineCommand } from "@/command";
import { EventEmitter } from "events";
import { Middleware } from "@/middleware";
import {getCallerStack, remove} from "@/utils";
import {App} from "@/app";
import {AppKey} from "@/constans";
import {Dict} from "@/types";
export class Plugin extends EventEmitter {
    disposes: Function[] = []
    readonly filePath:string
    private lifecycle:Dict<Function[]>={}
    public adapters?: string[]
    status: Plugin.Status = 'enabled'
    services:Map<string|symbol,any>=new Map<string|symbol,any>()
    commands: Map<string, Command> = new Map<string, Command>()
    middlewares: Middleware[] = [];
    [AppKey]: App|null=null
    get app(){
        return this[AppKey]
    }
    get statusText(){
        return Plugin.StatusText[this.status]
    }
    get commandList() {
        return [...this.commands.values()]
    }
    constructor(public name: string, config: Plugin.Config={}){
        super()
        this.adapters=config.adapters
        const stack=getCallerStack()
        stack.shift() // 排除当前文件调用
        this.filePath=stack[0]?.getFileName()!;
        return new Proxy(this,{
            get(target:Plugin,key){
                if(!target.app||Reflect.has(target,key)) return Reflect.get(target,key)
                return Reflect.get(target.app.services,key)
            }
        })
    }
    service<T extends keyof App.Services>(name:T): App.Services[T]
    service<T extends keyof App.Services>(name:T, service:App.Services[T]): this
    service<T extends keyof App.Services>(name:T, service?:App.Services[T]){
        if(!service) return this.app!.services[name]
        this.services.set(name,service)
        return this
    }
    enable() {
        if (this.status === 'enabled') return
        this.status = 'enabled'
    }
    disable() {
        if (this.status === 'disabled') return
        this.status = 'disabled'
    }
    middleware(middleware: Middleware, before?: boolean) {
        const method: 'push' | 'unshift' = before ? 'unshift' : 'push'
        this.middlewares[method](middleware)
        this.disposes.push(() => remove(this.middlewares, middleware))
        return this
    }
    using(...args:[...(keyof App.Services)[],(plugin:this)=>void]) {
        const callback=args.pop()
        const services=[...args] as (keyof App.Services)[]
        if(typeof callback!=='function') throw new Error('callback 必须是函数')
        if(!services.length){
            callback(this)
            return this
        }
        const installFn=()=>{
            const servicesHasReady=services.every(name=>{
                return !!this[name]
            })
            if(servicesHasReady){
                callback(this)
                this.app!.off('service-register',installFn)
            }
        }
        this.app!.on('service-register',installFn)
        return this
    }
    // @ts-ignore
    command<S extends Command.Declare>(
        decl: S,
        initialValue?: ArgsType<Command.RemoveFirst<S>>,
    ): Command<ArgsType<Command.RemoveFirst<S>>>;
    command<S extends Command.Declare>(
        decl: S,
        config?: Command.Config,
    ): Command<ArgsType<Command.RemoveFirst<S>>>;
    command<S extends Command.Declare>(
        decl: S,
        initialValue?: ArgsType<Command.RemoveFirst<S>>,
        config?: Command.Config,
    ): Command<ArgsType<Command.RemoveFirst<S>>>;
    command<S extends Command.Declare>(
        decl: S,
        ...args: (ArgsType<Command.RemoveFirst<S>> | Command.Config)[]
    ){
        const [nameDecl, ...argsDecl] = decl.split(/\s+/);
        if (!nameDecl) throw new Error("nameDecl不能为空");
        const nameArr = nameDecl.split(".").filter(Boolean);
        let name = nameArr.pop();
        let parent: Command|undefined;
        while (nameArr.length) {
            parent = this.findCommand(nameArr.shift()!);
            if (!parent) throw new Error(`找不到父指令:${nameArr.join(".")}`);
        }
        const command = defineCommand(argsDecl.join(" "), ...(args as any));
        if (parent) {
            command.parent = parent;
            parent.children.push(command as unknown as Command);
        }
        command.name = name;
        this.commands.set(name!, command);
        this.emit("command-add", command);
        this.disposes.push(() => {
            this.commands.delete(name!);
            this.emit("command-remove", command);
        });
        return command as unknown as Command<ArgsType<Command.RemoveFirst<S>>>;
    }

    /**
     * 查找指定名称的指令
     * @param name 指令名
     */
    findCommand(name: string) {
        return this.commandList.find(command => command.name === name);
    }
    mounted(callback:Function){
        const lifeCycles=this.lifecycle["mounted"]||=[]
        lifeCycles.push(callback)
    }
    beforeMount(callback:Function){
        const lifeCycles=this.lifecycle["beforeMount"]||[]
        lifeCycles.push(callback)
    }
    unmounted(callback:Function){
        const lifeCycles=this.lifecycle["unmounted"]||[]
        lifeCycles.push(callback)
    }
    beforeUnmount(callback:Function){
        const lifeCycles=this.lifecycle["beforeUnmount"]||[]
        lifeCycles.push(callback)
    }
}
export interface Plugin extends App.Services{
    on<T extends keyof App.EventMap>(event: T, callback: App.EventMap[T]): this

    on<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback: (...args: any[]) => void): this

    once<T extends keyof App.EventMap>(event: T, callback: App.EventMap[T]): this

    once<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback: (...args: any[]) => void): this

    off<T extends keyof App.EventMap>(event: T, callback?: App.EventMap[T]): this

    off<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback?: (...args: any[]) => void): this

    emit<T extends keyof App.EventMap>(event: T, ...args: Parameters<App.EventMap[T]>): boolean

    emit<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, ...args: any[]): boolean

    addListener<T extends keyof App.EventMap>(event: T, callback: App.EventMap[T]): this

    addListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback: (...args: any[]) => void): this

    addListenerOnce<T extends keyof App.EventMap>(event: T, callback: App.EventMap[T]): this

    addListenerOnce<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback: (...args: any[]) => void): this

    removeListener<T extends keyof App.EventMap>(event: T, callback?: App.EventMap[T]): this

    removeListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback?: (...args: any[]) => void): this

    removeAllListeners<T extends keyof App.EventMap>(event: T): this

    removeAllListeners<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>): this
}
export namespace Plugin {
    export interface Config {
        /**
         * 支持的适配器
         */
        adapters?:string[]
        /**
         * 描述
         */
        desc?: string
        /**
         * 匹配优先级
         */
        priority?: number
    }
    export type Scope = 'private' | 'group' | 'guild'|'direct'
    export type Status = 'enabled' | 'disabled'
    export enum StatusText{
        enabled='✅',
        disabled='❌'
    }
    export type InstallObject={
        name?:string
        install: InstallFn
    }
    export type InstallFn=(plugin:Plugin)=>void
    export type BuiltPlugins='commandParser'|'guildManager'|'hmr'|'pluginManager'
}
export class PluginMap extends Map<string,Plugin>{
    private get anonymousCount(){
        return [...this.keys()].filter(name => name.startsWith(`anonymous_`)).length
    }
    get generateId(){
        for(let i=0;i<this.anonymousCount;i++){
            if(!this.has(`anonymous_${i}`)) return `anonymous_${i}`
        }
        return `anonymous_${this.anonymousCount}`
    }
}
