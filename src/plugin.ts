import { ArgsType, Command, defineCommand } from "@/command";
import { EventEmitter } from "events";
import { Middleware } from "@/middleware";
import { remove } from "@/utils";
import {Bot} from "@/bot";
import {BotKey} from "@/constans";
export interface Plugin extends Bot.Services{}
export class Plugin extends EventEmitter {
    disposes: Function[] = []
    public scope: Plugin.Scope[]
    status: Plugin.Status = 'enabled'
    services:Map<string|symbol,any>=new Map<string|symbol,any>()
    commands: Map<string, Command> = new Map<string, Command>()
    middlewares: Middleware[] = [];
    [BotKey]: Bot=null
    get bot(){
        if(!this[BotKey]) throw new Error('插件尚未挂载到 Bot，无法访问Bot实例')
        return this[BotKey]
    }
    get statusText(){
        return Plugin.StatusText[this.status]
    }
    get commandList() {
        return [...this.commands.values()]
    }
    constructor(public name: string, config: Plugin.Config={}){
        super()
        this.scope = [].concat(config.scope||['guild', 'group', 'private','direct'])
        return new Proxy(this,{
            get(target,key){
                if(Reflect.ownKeys(target).includes(key) || target[key]) return Reflect.get(target,key)
                return Reflect.get(target.bot.services,key)
            }
        })
    }
    service<T extends keyof Bot.Services>(name:T): Bot.Services[T]
    service<T extends keyof Bot.Services>(name:T,service:Bot.Services[T]): this
    service<T extends keyof Bot.Services>(name:T,service?:Bot.Services[T]){
        if(!service) return this.bot.services[name]
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
    ): Command<ArgsType<Command.RemoveFirst<S>>> {
        const [nameDecl, ...argsDecl] = decl.split(/\s+/);
        if (!nameDecl) throw new Error("nameDecl不能为空");
        const nameArr = nameDecl.split(".").filter(Boolean);
        let name = nameArr.pop();
        let parent: Command;
        while (nameArr.length) {
            parent = this.findCommand(nameArr.shift());
            if (!parent) throw new Error(`找不到父指令:${nameArr.join(".")}`);
        }
        const command = defineCommand(argsDecl.join(" "), ...(args as any));
        if (parent) {
            command.parent = parent;
            parent.children.push(command as unknown as Command);
        }
        command.name = name;
        this.commands.set(name, command);
        this.emit("command-add", command);
        this.disposes.push(() => {
            this.commands.delete(name);
            this.emit("command-remove", command);
        });
        return command as Command<ArgsType<Command.RemoveFirst<S>>>;
    }

    /**
     * 查找指定名称的指令
     * @param name 指令名
     */
    findCommand(name: string) {
        return this.commandList.find(command => command.name === name);
    }
}
export namespace Plugin {
    export interface Config {
        /**
         * 使用范围
         */
        scope?: Scope | Scope[]
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
