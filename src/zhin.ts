import {EventEmitter} from "events";
import {Logger, getLogger} from "log4js";
import {Middleware} from "@/middleware";
import {Plugin, PluginMap} from "@/plugin";
import {Dict, LogLevel} from "@/types";
import {loadPlugin} from "@/utils";
import {ZhinKey} from "@/constans";
import path from "path";
import fs from "fs";
import {Adapter, AdapterBot, AdapterReceive} from "@/adapter";

export class Zhin extends EventEmitter {
    middlewares: Middleware[] = []
    logger: Logger = getLogger(`[Zhin]`)
    adapters: Map<string, Adapter> = new Map<string, Adapter>()
    plugins: PluginMap = new PluginMap()

    constructor(public config: Zhin.Config) {
        super();
        this.logger.level = config.logLevel
        this.initAdapter(config.adapters)
        this.handleMessage = this.handleMessage.bind(this)
        this.on('message', this.handleMessage)
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
                this.logger.error(e.message)
            }
        }
    }

    get pluginList() {
        return [...this.plugins.values()].filter(p => p.status === 'enabled')
    }

    get commandList() {
        return this.pluginList.flatMap(plugin => plugin.commandList)
    }

    get services() {
        let result: Dict<any, string | symbol> = {}
        this.pluginList.forEach(plugin => {
            plugin.services.forEach((service, name) => {
                if (Reflect.ownKeys(result).includes(name)) return
                result[name] = service
            })
        })
        return result
    }

    middleware(middleware: Middleware, before?: boolean) {
        if (before) this.middlewares.unshift(middleware)
        else this.middlewares.push(middleware)
        return this
    }

    findCommand(name: string) {
        return this.commandList.find(command => command.name === name)
    }

    getSupportMiddlewares<A extends Adapter>(adapter: A, bot: AdapterBot<A>, event: AdapterReceive<A>) {
        return this.pluginList.filter(plugin => plugin.scope.includes(event.message_type as any))
            .reduce((result, plugin) => {
                result.push(...plugin.middlewares)
                return result
            }, [] as Middleware[])
    }

    getSupportCommands<A extends Adapter>(adapter: A, bot: AdapterBot<A>, event: AdapterReceive<A>) {
        return this.pluginList.filter(plugin => plugin.scope.includes(event.message_type as any))
            .flatMap(plugin => plugin.commandList).filter(command => {
                return !command.scopes?.length || command.scopes.includes(event.message_type as any)
            })
    }

    handleMessage<A extends Adapter>(adapter: A, bot: AdapterBot<A>, event: AdapterReceive<A>) {
        const middleware = Middleware.compose([
            ...this.middlewares,
            ...this.getSupportMiddlewares(adapter, bot, event)
        ]);
        middleware(adapter, bot, event);
    }

    enable(name: string): this
    enable(plugin: Plugin): this
    enable(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = this.plugins.get(plugin)
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
            plugin = this.plugins.get(plugin)
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

    mount(name: string)
    mount(plugin: Plugin)
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
        plugin[ZhinKey] = this
        for (const [name, service] of plugin.services) {
            if (!this.services[name]) {
                this.emit('service-beforeRegister', name, service)
                this.services[name] = service
                this.emit('service-registered', name, service)
                continue;
            }
            this.logger.warn(`${plugin.name} 有重复的服务，将忽略其挂载。`)
        }
        this.emit('plugin-mounted', plugin)
        this.logger.info(`插件：${plugin.name} 已加载。`)
        return this
    }

    unmount(name: string): this
    unmount(plugin: Plugin): this
    unmount(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = this.plugins.get(plugin)
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
        plugin[ZhinKey] = null
        for (const [name, service] of plugin.services) {
            if (this.services[name] && this.services[name] === service) {
                this.emit('service-beforeDestroy', name, service)
                delete this.services[name]
                this.emit('service-destroyed', name, service)
            }
        }
        this.logger.info(`插件：${plugin.name} 已卸载。`)
        this.emit('plugin-unmounted', plugin)
        return this
    }

    async start() {
        for(const [name,adapter] of this.adapters){
            adapter.emit('start')
            this.logger.info(`适配器： ${name} 已启动`)
        }
        this.emit('start')
    }

    loadFromBuilt(plugins: Plugin.BuiltPlugins[]) {
        return this.loadPlugins(plugins.map(p => {
            return path.resolve(__dirname, 'plugins', p)
        }))
    }

    private loadPlugins(dirs: string[]) {
        for (const plugin of dirs) {
            this.mount(plugin)
        }
        return this
    }

    loadFromDir(...dirs: string[]) {
        return this.loadPlugins(dirs
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

export interface Zhin {
    on<T extends keyof Zhin.EventMap>(event: T, listener: Zhin.EventMap[T]): this

    on<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Zhin.EventMap>, listener: (...args: any[]) => any): this

    off<T extends keyof Zhin.EventMap>(event: T, callback?: Zhin.EventMap[T]): this

    off<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Zhin.EventMap>, callback?: (...args: any[]) => void): this

    once<T extends keyof Zhin.EventMap>(event: T, listener: Zhin.EventMap[T]): this

    once<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Zhin.EventMap>, listener: (...args: any[]) => any): this

    emit<T extends keyof Zhin.EventMap>(event: T, ...args: Parameters<Zhin.EventMap[T]>): boolean

    emit<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Zhin.EventMap>, ...args: any[]): boolean

    addListener<T extends keyof Zhin.EventMap>(event: T, listener: Zhin.EventMap[T]): this

    addListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Zhin.EventMap>, listener: (...args: any[]) => any): this

    addListenerOnce<T extends keyof Zhin.EventMap>(event: T, callback: Zhin.EventMap[T]): this

    addListenerOnce<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Zhin.EventMap>, callback: (...args: any[]) => void): this

    removeListener<T extends keyof Zhin.EventMap>(event: T, callback?: Zhin.EventMap[T]): this

    removeListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Zhin.EventMap>, callback?: (...args: any[]) => void): this

    removeAllListeners<T extends keyof Zhin.EventMap>(event: T): this

    removeAllListeners<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Zhin.EventMap>): this

}

export namespace Zhin {
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
        'message':<AD extends Adapter>(adapter:AD,bot:AdapterBot<AD>,message:AdapterReceive<AD>)=>void
        'service-beforeRegister': <T extends keyof Zhin.Services>(name: T, service: Zhin.Services[T]) => void
        'service-registered': <T extends keyof Zhin.Services>(name: T, service: Zhin.Services[T]) => void
        'service-beforeDestroy': <T extends keyof Zhin.Services>(name: T, service: Zhin.Services[T]) => void
        'service-destroyed': <T extends keyof Zhin.Services>(name: T, service: Zhin.Services[T]) => void
    }

    export interface Services {

    }
}
