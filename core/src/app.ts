import {EventEmitter} from "events";
import {Logger, getLogger} from "log4js";
import {Middleware} from "@/middleware";
import {Plugin, PluginMap} from "@/plugin";
import {Dict, LogLevel} from "@/types";
import { loadPlugin, remove } from '@/utils';
import {AppKey} from "@/constans";
import path from "path";
import fs from "fs";
import {Adapter, AdapterBot, AdapterReceive} from "@/adapter";

export class App extends EventEmitter {
    logger: Logger = getLogger(`[52bot]`)
    adapters: Map<string, Adapter> = new Map<string, Adapter>()
    middlewares:Middleware[]=[]
    plugins: PluginMap = new PluginMap()

    constructor(public config: App.Config) {
        super();
        this.logger.level = config.logLevel
        this.handleMessage = this.handleMessage.bind(this)
        this.on('message', this.handleMessage)
        return new Proxy(this,{
            get(target:App,key){
                if(Reflect.has(target.services,key)) return Reflect.get(target.services,key)
                return Reflect.get(target,key)
            }
        })
    }

    initAdapter(adapter_names: string[]) {
        for (const name of adapter_names) {
            if (!name) continue
            try {
                const adapter = Adapter.load(name)
                this.adapters.set(name, adapter)
                adapter.mount(this)
                this.logger.mark(`适配器： ${name} 已加载`)
            } catch (e) {
                this.logger.error(e)
            }
        }
    }
    middleware<T extends Adapter>(middleware:Middleware<T>){
        this.middlewares.push(middleware as Middleware)
        return ()=>{
            remove(this.middlewares,middleware)
        }
    }
    get pluginList() {
        return [...this.plugins.values()].filter(p => p.status === 'enabled')
    }

    get commandList() {
        return this.pluginList.flatMap(plugin => plugin.commandList)
    }

    get services() {
        let result:App.Services={}
        this.pluginList.forEach(plugin => {
            plugin.services.forEach((service, name) => {
                if (Reflect.ownKeys(result).includes(name)) return
                Reflect.set(result,name,service)
            })
        })
        return result
    }

    findCommand(name: string) {
        return this.commandList.find(command => command.name === name)
    }

    getSupportMiddlewares<A extends Adapter>(adapter: A, bot: AdapterBot<A>, event: AdapterReceive<A>): Middleware[] {
        return this.pluginList.filter(plugin => !plugin.adapters || plugin.adapters.includes(adapter.name))
            .reduce((result, plugin) => {
                result.push(...plugin.middlewares)
                return result
            }, [...this.middlewares])
    }

    getSupportCommands<A extends Adapter>(adapter: A, bot: AdapterBot<A>, event: AdapterReceive<A>) {
        return this.pluginList.filter(plugin => !plugin.adapters || plugin.adapters.includes(adapter.name))
            .flatMap(plugin => plugin.commandList)
    }

    handleMessage<A extends Adapter>(adapter: A, bot: AdapterBot<A>, event: AdapterReceive<A>) {
        const middleware = Middleware.compose(this.getSupportMiddlewares(adapter, bot, event));
        middleware(adapter, bot, event);
    }

    enable(name: string): this
    enable(plugin: Plugin): this
    enable(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = this.plugins.get(plugin)!
            if (!plugin) throw new Error('尚未加载插件：' + plugin)
        }
        if (!(plugin instanceof Plugin)) throw new Error(`${plugin} 不是一个有效的插件`)
        plugin.status = 'enabled'
        return this
    }

    disable(name: string): this
    disable(plugin: Plugin): this
    disable(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = this.plugins.get(plugin)!
            if (!plugin) throw new Error('尚未加载插件：' + plugin)
        }
        if (!(plugin instanceof Plugin)) throw new Error(`${plugin} 不是一个有效的插件`)
        plugin.status = 'disabled'
        return this
    }

    emit(event: string, ...args: any[]) {
        if (['plugin-beforeMount', 'plugin-mounted', 'plugin-beforeUnmount', 'plugin-unmounted'].includes(event)) {
            const plugin: Plugin = args[0]
            const method = event.split('-')[1]
            if (plugin && plugin['lifecycle'][method]?.length) {
                for (const lifecycle of plugin['lifecycle'][method]) {
                    lifecycle()
                }
            }
        }
        const result = super.emit(event, ...args)
        for (const plugin of this.pluginList) {
            plugin.emit(event, ...args)
        }
        return result
    }

    use(init: Plugin.InstallObject, config?: Plugin.Config): this
    use(init: Plugin.InstallFn, config?: Plugin.Config): this
    use(init: Plugin.InstallObject | Plugin.InstallFn, config?: Plugin.Config): this {
        let name = typeof init === 'function' ? this.plugins.generateId : init.name || this.plugins.generateId
        const plugin = new Plugin(name, config)
        const initFn = typeof init === 'function' ? init : init.install
        this.mount(plugin)
        try {
            initFn(plugin)
            return this
        } catch {
            this.logger.error(`插件：${name} 初始化失败`)
            return this.unmount(plugin)
        }
    }

    mount(name: string):this
    mount(plugin: Plugin):this
    mount(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = loadPlugin(plugin)
        }
        if (!(plugin instanceof Plugin)) {
            this.logger.warn(`${plugin} 不是一个有效的插件，将忽略其挂载。`)
            return this
        }
        this.emit('plugin-beforeMount', plugin)
        this.plugins.set(plugin.name, plugin)
        plugin[AppKey] = this
        for (const [name, service] of plugin.services) {
            this.emit('service-register', name, service)
        }
        this.emit('plugin-mounted', plugin)
        this.logger.info(`插件：${plugin.name} 已加载。`)
        return this
    }

    unmount(name: string): this
    unmount(plugin: Plugin): this
    unmount(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = this.plugins.get(plugin)!
        }
        if (!(plugin instanceof Plugin)) {
            this.logger.warn(`${plugin} 不是一个有效的插件，将忽略其卸载。`)
            return this
        }
        if (!this.plugins.has(plugin.name)) {
            this.logger.warn(`${plugin} 尚未加载，将忽略其卸载。`)
            return this
        }
        this.emit('plugin-beforeUnmount', plugin)
        this.plugins.delete(plugin.name)
        plugin[AppKey] = null
        for (const [name, service] of plugin.services) {
            this.emit('service-destroy', name, service)
        }
        this.logger.info(`插件：${plugin.name} 已卸载。`)
        this.emit('plugin-unmounted', plugin)
        return this
    }

    async start() {
        this.initAdapter(this.config.adapters)
        for (const [name, adapter] of this.adapters) {
            adapter.emit('start')
            this.logger.info(`适配器： ${name} 已启动`)
        }
        this.emit('start')
    }

    private loadPlugins(dirs: string[]) {
        for (const plugin of dirs) {
            this.mount(plugin)
        }
        return this
    }

    loadFromBuilt(plugins: Plugin.BuiltPlugins[]) {
        return this.loadPlugins(plugins
            .filter(Boolean).map(p => {
            return path.resolve(__dirname, 'plugins', p)
        }))
    }

    loadFromModule(plugins: string[]) {
        return this.loadPlugins(plugins
            .filter(Boolean).map(p => {
            return path.resolve(process.cwd(), 'node_modules', p)
        }))
    }

    loadFromDir(...dirs: string[]) {
        return this.loadPlugins(dirs
            .filter(Boolean)
            .map(dir => path.resolve(process.cwd(), dir))
            .reduce((result: string[], dir) => {
                if (!fs.existsSync(dir)) return result
                const files = fs.readdirSync(dir)
                result.push(...files.map(file => path.join(dir, file)))
                return result
            }, []))
    }

    stop() {

    }
}

export interface App extends App.Services{
    on<T extends keyof App.EventMap>(event: T, listener: App.EventMap[T]): this

    on<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, listener: (...args: any[]) => any): this

    off<T extends keyof App.EventMap>(event: T, callback?: App.EventMap[T]): this

    off<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback?: (...args: any[]) => void): this

    once<T extends keyof App.EventMap>(event: T, listener: App.EventMap[T]): this

    once<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, listener: (...args: any[]) => any): this

    emit<T extends keyof App.EventMap>(event: T, ...args: Parameters<App.EventMap[T]>): boolean

    emit<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, ...args: any[]): boolean

    addListener<T extends keyof App.EventMap>(event: T, listener: App.EventMap[T]): this

    addListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, listener: (...args: any[]) => any): this

    addListenerOnce<T extends keyof App.EventMap>(event: T, callback: App.EventMap[T]): this

    addListenerOnce<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback: (...args: any[]) => void): this

    removeListener<T extends keyof App.EventMap>(event: T, callback?: App.EventMap[T]): this

    removeListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>, callback?: (...args: any[]) => void): this

    removeAllListeners<T extends keyof App.EventMap>(event: T): this

    removeAllListeners<S extends string | symbol>(event: S & Exclude<string | symbol, keyof App.EventMap>): this

}

export namespace App {
    export interface Config {
        adapters: string[]
        logLevel: LogLevel
    }

    export const adapters: Map<string, Adapter> = new Map<string, Adapter>()

    export interface EventMap {
        'start'(): void

        'plugin-beforeMount'(plugin: Plugin): void

        'plugin-mounted'(plugin: Plugin): void

        'plugin-beforeUnmount'(plugin: Plugin): void

        'plugin-unmounted'(plugin: Plugin): void

        'message': <AD extends Adapter>(adapter: AD, bot: AdapterBot<AD>, message: AdapterReceive<AD>) => void
        'service-register': <T extends keyof App.Services>(name: T, service: App.Services[T]) => void
        'service-destroy': <T extends keyof App.Services>(name: T, service: App.Services[T]) => void
    }

    export interface Services {

    }
}
