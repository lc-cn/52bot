import axios, {AxiosInstance} from "axios";
import {WebSocket} from "ws";
import * as log4js from 'log4js'
import {EventEmitter} from "events";
import {SessionManager} from "./sessionManager";
import {Quotable, Sendable} from "@/elements";
import {Plugin} from "@/plugin";
import {Dict, LogLevel} from "@/types";
import {GroupMessageEvent, GuildMessageEvent, Message, PrivateMessageEvent} from "@/message";
import {EventMap, QQEvent} from "@/event";
import {GUilD_APIS} from "@/constans";
import {Middleware} from "@/middleware";
import {commandParser} from "@/plugins/commandParser";
import {loadPlugin} from "@/utils";

export class QQBot extends EventEmitter {
    request: AxiosInstance
    self_id: string
    nickname: string
    status: number
    logger: log4js.Logger
    ws: WebSocket
    sessionManager: SessionManager
    middlewares:Middleware[]=[]
    plugins: Map<string, Plugin> = new Map<string, Plugin>()
    middleware(middleware:Middleware,before?:boolean){
        if(before) this.middlewares.unshift(middleware)
        else this.middlewares.push(middleware)
        return this
    }
    get pluginList() {
        return [...this.plugins.values()]
    }
    get commandList(){
        return [...this.plugins.values()].flatMap(plugin=>plugin.commandList)
    }

    constructor(public config: QQBot.Config) {
        super()
        this.sessionManager = new SessionManager(this)
        this.request = axios.create({
            baseURL: this.config.sandbox ? 'https://sandbox.api.sgroup.qq.com' : `https://api.sgroup.qq.com`,
            timeout: 5000,
            headers: {
                'User-Agent': `BotNodeSDK/0.0.1`
            }
        })
        this.request.interceptors.request.use((config) => {
            if (GUilD_APIS.some(c => {
                if (typeof c === 'string') return c === config.url
                return c.test(config.url)
            })) {
                config.headers['Authorization'] = `Bot ${this.config.appid}.${this.sessionManager.token}`
            } else {
                config.headers['Authorization'] = `QQBot ${this.sessionManager.access_token}`
                config.headers['X-Union-Appid'] = this.config.appid
            }
            if (config['rest']) {
                const restObj = config['rest']
                delete config['rest']
                for (const key in restObj) {
                    config.url = config.url.replace(':' + key, restObj[key])
                }
            }
            return config
        })
        this.logger = log4js.getLogger(`[QQBot:${this.config.appid}]`)
        this.logger.level = this.config.logLevel ||= 'info'
        this.handleMessage = this.handleMessage.bind(this)
        this.on('message', this.handleMessage)
        this.use(commandParser)
    }

    getSupportMiddlewares(event: PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent) {
        return this.pluginList.filter(plugin => plugin.scope.includes(event.sub_type))
            .reduce((result, plugin) => {
                result.push(...plugin.middlewares)
                return result
            }, [] as Middleware[])
    }
    getSupportCommands(event: PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent) {
        return this.pluginList.filter(plugin => plugin.scope.includes(event.sub_type))
            .flatMap(plugin => plugin.commandList)
    }

    handleMessage(event: PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent) {
        const middleware = Middleware.compose([
            ...this.middlewares,
            ...this.getSupportMiddlewares(event)
        ]);
        middleware(event);
    }

    removeAt(payload: Dict) {
        const reg = new RegExp(`<@!${this.self_id}>`)
        const isAtMe = reg.test(payload.content) && payload.mentions.some(mention => mention.id === this.self_id)
        if (!isAtMe) return
        payload.content = payload.content.replace(reg, '').trimStart()
    }

    processPayload(event_id: string, event: string, payload: Dict) {
        let [post_type, ...sub_type] = event.split('.')
        const result: Dict = {
            event_id,
            post_type,
            [`${post_type}_type`]: sub_type.join('.'),
            ...payload
        }
        if (['message.group', 'message.private', 'message.guild'].includes(event)) {
            this.removeAt(payload)
            const [message, brief] = Message.parse.call(this, payload)
            result.message = message as Sendable
            Object.assign(result, {
                user_id: payload.author?.id,
                message_id: payload.event_id || payload.id,
                raw_message: brief,
                sender: {
                    user_id: payload.author?.id,
                    user_openid: payload.author?.user_openid || payload.author?.member_openid
                },
                timestamp: new Date(payload.timestamp).getTime() / 1000,
            })
            let messageEvent: PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent
            switch (event) {
                case 'message.private':
                    messageEvent = new PrivateMessageEvent(this, result)
                    this.logger.info(`recv from User(${result.user_id}): ${result.raw_message}`)
                    break;
                case 'message.group':
                    messageEvent = new GroupMessageEvent(this, result)
                    this.logger.info(`recv from Group(${result.group_id}): ${result.raw_message}`)
                    break;
                case 'message.guild':
                    messageEvent = new GuildMessageEvent(this, result)
                    this.logger.info(`recv from Guild(${result.guild_id})Channel(${result.channel_id}): ${result.raw_message}`)
                    break;
            }
            return messageEvent
        }
        return result
    }

    async sendPrivateMessage(user_id: string, message: Sendable, source?: Quotable) {
        const {hasMessages, messages, brief, hasFiles, files} = Message.format.call(this, message, source)
        let message_id = ''
        if (hasMessages) {
            let {data: {id}} = await this.request.post(`/v2/users/${user_id}/messages`, messages)
            message_id = id
        }
        if (hasFiles) {
            let {data: {id}} = await this.request.post(`/v2/users/${user_id}/files`, files)
            if (message_id) message_id = `${message_id}|`
            message_id = message_id + id
        }
        this.logger.info(`send to User(${user_id}): ${brief}`)
        return {
            message_id,
            timestamp: new Date().getTime() / 1000
        }
    }

    async sendGroupMessage(group_id: string, message: Sendable, source?: Quotable) {
        const {hasMessages, messages, brief, hasFiles, files} = Message.format.call(this, message, source)
        let message_id: string = ''
        if (hasMessages) {
            let {data: {id}} = await this.request.post(`/v2/groups/${group_id}/messages`, messages)
            message_id = id
        }
        if (hasFiles) {
            let {data: {id}} = await this.request.post(`/v2/groups/${group_id}/files`, files)
            if (message_id) message_id = `${message_id}|`
            message_id = message_id + id
        }
        this.logger.info(`send to Group(${group_id}): ${brief}`)
        return {
            message_id,
            timestamp: new Date().getTime() / 1000
        }
    }

    async sendGuildMessage(guild_id: string, channel_id: string, message: Sendable, source?: Quotable) {
        const {hasMessages, messages, brief, hasFiles, files} = Message.format.call(this, message, source)
        let message_id = ''
        if (hasMessages) {
            let {data: {id}} = await this.request.post(`/channels/${channel_id}/messages`, messages)
            message_id = id
        }
        if (hasFiles) {
            console.log(files)
            let {data: {id}} = await this.request.post(`/channels/${channel_id}/files`, files)
            if (message_id) message_id = `${message_id}|`
            message_id = message_id + id
        }
        this.logger.info(`send to Guild(${guild_id})Channel(${channel_id}): ${brief}`)
        return {
            message_id,
            timestamp: new Date().getTime() / 1000
        }
    }

    async getGuildInfo(guild_id: string) {
        const result = await this.request.get(`/guilds/${guild_id}`)
        const {id: _, name: guild_name, joined_at, ...guild} = result.data || {}
        return {
            guild_id,
            guild_name,
            join_time: new Date(joined_at).getTime() / 1000,
            ...guild
        }
    }

    async getGuildRoles(guild_id: string) {
        const result = await this.request.get(`/guilds/${guild_id}/roles`)
        return (result.data?.roles || []).map(role => {
            return {
                guild_id,
                ...role
            }
        })
    }

    async getGuildList() {
        const _getGuildList = async (after: string = undefined) => {
            const res = await this.request.get('/users/@me/guilds', {
                params: {
                    after
                }
            })
            if (!res.data?.length) return []
            const result = (res.data || []).map(g => {
                const {id: guild_id, name: guild_name, joined_at, ...guild} = g
                return {
                    guild_id,
                    guild_name,
                    join_time: new Date(joined_at).getTime() / 1000,
                    ...guild
                }
            })
            const last = result[result.length - 1]
            return [...result, ...await _getGuildList(last.guild_id)]
        }
        return _getGuildList()
    }

    async getGuildMemberList(guild_id: string) {
        const _getGuildMemberList = async (after: string = undefined) => {
            const res = await this.request.get(`/guilds/${guild_id}/members`, {
                params: {
                    after,
                    limit: 100
                }
            })
            if (!res.data?.length) return []
            const result = (res.data || []).map(m => {
                const {id: member_id, role, join_time, ...member} = m
                return {
                    member_id,
                    role,
                    join_time: new Date(join_time).getTime() / 1000,
                    ...member
                }
            })
            const last = result[result.length - 1]
            return [...result, ...await _getGuildMemberList(last.member_id)]
        }
        return _getGuildMemberList()
    }

    async getGuildMemberInfo(guild_id: string, member_id: string) {
        const result = await this.request.get(`/guilds/${guild_id}/members/${member_id}`)
        const {user: {id: _, ...member}, nick: nickname, joined_at, roles} = result.data || {}
        return {
            guild_id,
            user_id: member_id,
            roles,
            join_time: new Date(joined_at).getTime() / 1000,
            nickname,
            ...member
        }
    }

    async getChannelList(guild_id: string) {
        const result = await this.request.get(`/guilds/${guild_id}/channels`)
        return (result.data || []).map(c => {
            const {id: channel_id, name: channel_name, ...channel} = c
            return {
                channel_id,
                channel_name,
                ...channel
            }
        })
    }

    async getChannelInfo(channel_id: string) {
        const result = await this.request.get(`/channels/${channel_id}`)
        const {id: _, name: channel_name, ...channel} = result.data || {}
        return {
            channel_id,
            channel_name,
            ...channel
        }
    }

    dispatchEvent(event: string, wsRes: any) {
        this.logger.debug(event, wsRes)
        const payload = wsRes.d;
        const event_id = wsRes.id || '';
        if (!payload || !event) return;
        const transformEvent = QQEvent[event] || 'system'
        this.em(transformEvent, this.processPayload(event_id, transformEvent, payload));
    }

    em(event: string, payload: Dict) {
        const eventNames = event.split('.')
        let prefix = ''
        while (eventNames.length) {
            let fullEventName = `${prefix}.${eventNames.shift()}`
            if (fullEventName.startsWith('.')) fullEventName = fullEventName.slice(1)
            this.emit(fullEventName, payload)
            prefix = fullEventName
        }
    }

    async start() {
        await this.sessionManager.start()
    }
    use(name:string)
    use(plugin: Plugin)
    use(plugin: Plugin|string) {
        if(typeof plugin==='string') {
            plugin=loadPlugin(plugin)
        }
        this.plugins.set(plugin.name, plugin)
        return this
    }
    unUse(plugin: Plugin|string) {
        if(typeof plugin==='string') {
            this.plugins.delete(plugin)
        }else{
            this.plugins.delete(plugin.name)
        }
        return this

    }

    stop() {

    }
}

export interface QQBot {
    on<T extends keyof EventMap>(event: T, callback: EventMap[T]): this

    on<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback: (...args: any[]) => void): this

    once<T extends keyof EventMap>(event: T, callback: EventMap[T]): this

    once<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback: (...args: any[]) => void): this

    off<T extends keyof EventMap>(event: T, callback?: EventMap[T]): this

    off<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback?: (...args: any[]) => void): this

    emit<T extends keyof EventMap>(event: T, ...args: Parameters<EventMap[T]>): boolean

    emit<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, ...args: any[]): boolean

    addListener<T extends keyof EventMap>(event: T, callback: EventMap[T]): this

    addListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback: (...args: any[]) => void): this

    addListenerOnce<T extends keyof EventMap>(event: T, callback: EventMap[T]): this

    addListenerOnce<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback: (...args: any[]) => void): this

    removeListener<T extends keyof EventMap>(event: T, callback?: EventMap[T]): this

    removeListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>, callback?: (...args: any[]) => void): this

    removeAllListeners<T extends keyof EventMap>(event: T): this

    removeAllListeners<S extends string | symbol>(event: S & Exclude<string | symbol, keyof EventMap>): this

}

export namespace QQBot {

    export interface Token {
        access_token: string
        expires_in: number
        cache: string
    }

    export interface Config {
        appid: string
        secret: string
        token?: string
        sandbox?: boolean
        maxRetry?: number
        /**
         * 是否移除第一个@
         */
        removeAt?: boolean
        delay?:Dict<number>
        intents?: string[]
        logLevel?: LogLevel
    }
    export function getFullTargetId(message:GuildMessageEvent|GroupMessageEvent|PrivateMessageEvent){
        switch (message.sub_type){
            case "private":
                return message.user_id
            case "group":
                return `${(message as GroupMessageEvent).group_id}:${message.user_id}`
            case "guild":
                return `${(message as GuildMessageEvent).guild_id}:${(message as GuildMessageEvent).channel_id}:${message.user_id}`
        }
    }
}
