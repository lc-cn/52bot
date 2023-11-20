import {Plugin, PluginMap} from "./plugin";
import { QQBot } from "./qqBot";
import {DirectMessageEvent, GroupMessageEvent, GuildMessageEvent, PrivateMessageEvent} from "@/message";
import { Middleware } from "@/middleware";
import {loadPlugin, loadPlugins} from "@/utils";
import { Channel } from './entries/channel'
import { Guild } from "./entries/guild";
import { GuildMember } from "./entries/guildMember";
import {
    reloadGuilds,
    reloadChannels,
    reloadGroupList,
    reloadGroupMemberList,
    reloadGuildMembers, reloadFriendList
} from "./internal/onlinelistener";
import {Group} from "@/entries/group";
import {Friend} from "@/entries/friend";
import {GroupMember} from "@/entries/groupMember";
import {BotKey} from "@/constans";
import {Dict} from "@/types";

type GuildMemberMap = Map<string, GuildMember.Info>
type GroupMemberMap = Map<string,GroupMember.Info>
export class Bot extends QQBot {
    middlewares: Middleware[] = []
    plugins: PluginMap = new PluginMap()
    guilds: Map<string, Guild.Info> = new Map<string, Guild.Info>()
    guildMembers: Map<string, GuildMemberMap> = new Map<string, GuildMemberMap>()
    channels: Map<string, Channel.Info> = new Map<string, Channel.Info>()
    groups:Map<string,Group.Info> = new Map<string,Group.Info>()
    groupMembers:Map<string,GroupMemberMap> = new Map<string,GroupMemberMap>()
    friends:Map<string,Friend.Info> = new Map<string,Friend.Info>()
    constructor(config: Bot.Config) {
        super(config)
        this.handleMessage = this.handleMessage.bind(this)
        this.on('message', this.handleMessage)
    }
    pickGuild = Guild.from.bind(this)
    pickGuildMember = GuildMember.from.bind(this)
    pickGroup = Group.from.bind(this)
    pickGroupMember = GroupMember.from.bind(this)
    pickFriend = Friend.from.bind(this)
    pickChannel = Channel.from.bind(this)
    get pluginList() {
        return [...this.plugins.values()].filter(p => p.status === 'enabled')
    }
    get commandList() {
        return this.pluginList.flatMap(plugin => plugin.commandList)
    }
    get services(){
        let result:Dict<any,string|symbol>={}
        this.pluginList.forEach(plugin=>{
            plugin.services.forEach((service,name)=>{
                if(Reflect.ownKeys(result).includes(name)) return
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
    getSupportMiddlewares(event: PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent | DirectMessageEvent) {
        return this.pluginList.filter(plugin => plugin.scope.includes(event.message_type))
            .reduce((result, plugin) => {
                result.push(...plugin.middlewares)
                return result
            }, [] as Middleware[])
    }
    getSupportCommands(event: PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent | DirectMessageEvent) {
        return this.pluginList.filter(plugin => plugin.scope.includes(event.message_type))
            .flatMap(plugin => plugin.commandList).filter(command=>{
                return !command.scopes?.length || command.scopes.includes(event.message_type)
            })
    }

    handleMessage(event: PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent) {
        const middleware = Middleware.compose([
            ...this.middlewares,
            ...this.getSupportMiddlewares(event)
        ]);
        middleware(event);
    }
    async getSelfInfo() {
        const { data: result } = await this.request.get('/users/@me')
        return result
    }
    async createChannel(guild_id: string, channelInfo: Omit<Channel.Info, 'id'>): Promise<Channel.Info> {
        return this.pickGuild(guild_id).createChannel(channelInfo)
    }
    async updateChannel({ channel_id, ...updateInfo }: { channel_id: string } & Partial<Pick<Channel.Info, 'name' | 'position' | 'parent_id' | 'private_type' | 'speak_permission'>>) {
        return this.pickChannel(channel_id).update(updateInfo)
    }
    async deleteChannel(channel_id: string) {
        return this.pickChannel(channel_id).delete()
    }

    async getGuildInfo(guild_id: string) {
        return this.guilds.get(guild_id)
    }

    async getGuildRoles(guild_id: string) {
        return this.pickGuild(guild_id).roles
    }

    async getGuildList() {
        return [...this.guilds.values()]
    }

    async getGuildMemberList(guild_id: string) {
        return [...this.guildMembers.get(guild_id).values()]
    }
    async getGuildMemberInfo(guild_id: string, member_id: string) {
        return this.guildMembers.get(guild_id)?.get(member_id)
    }
    async getGroupMemberList(group_id: string) {
        return [...this.groupMembers.get(group_id).values()]
    }
    async getGroupMemberInfo(group_id: string, member_id: string) {
        return this.groupMembers.get(group_id)?.get(member_id)
    }
    async getFriendList() {
        return [...this.friends.values()]
    }
    async getFriendInfo(friend_id: string) {
        return this.friends.get(friend_id)
    }

    async getChannelList(guild_id: string) {
        return [...this.channels.values()]
    }

    async getChannelInfo(channel_id: string) {
        return this.channels.get(channel_id)
    }
    enable(name: string):this
    enable(plugin: Plugin):this
    enable(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = this.plugins.get(plugin)
            if(!plugin) throw new Error('尚未加载插件：' + plugin)
        }
        if(!(plugin instanceof Plugin)) throw new Error(`${plugin} 不是一个有效的插件`)
        plugin.status = 'enabled'
        return this
    }
    disable(name: string):this
    disable(plugin: Plugin):this
    disable(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = this.plugins.get(plugin)
            if(!plugin) throw new Error('尚未加载插件：' + plugin)
        }
        if(!(plugin instanceof Plugin)) throw new Error(`${plugin} 不是一个有效的插件`)
        plugin.status = 'disabled'
        return this
    }
    use(init:Plugin.InstallObject,config?:Plugin.Config):this
    use(init:Plugin.InstallFn,config?:Plugin.Config):this
    use(init:Plugin.InstallObject|Plugin.InstallFn,config?:Plugin.Config):this{
        let name=typeof init==='function'?this.plugins.generateId:init.name||this.plugins.generateId
        const plugin=new Plugin(name,config)
        const initFn=typeof init==='function'?init:init.install
        this.mount(plugin)
        try{
            initFn(plugin)
            return this
        }catch {
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
        if(!(plugin instanceof Plugin)){
            this.logger.warn(`${plugin} 不是一个有效的插件，将忽略其挂载。`)
            return this
        }
        this.plugins.set(plugin.name, plugin)
        plugin[BotKey]=this
        for(const [name,service] of plugin.services){
            if(!this.services[name]) {
                this.services[name]=service
                continue;
            }
            this.logger.warn(`${plugin.name} 有重复的服务，将忽略其挂载。`)
        }
        this.logger.info(`插件：${plugin.name} 已加载。`)
        return this
    }
    unmount(name: string):this
    unmount(plugin: Plugin):this
    unmount(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin=this.plugins.get(plugin)
        }
        if(!(plugin instanceof Plugin)){
            this.logger.warn(`${plugin} 不是一个有效的插件，将忽略其卸载。`)
            return this
        }
        if(!this.plugins.has(plugin.name)){
            this.logger.warn(`${plugin} 尚未加载，将忽略其卸载。`)
            return this
        }
        this.plugins.delete(plugin.name)
        plugin[BotKey]=null
        for(const [name,service] of plugin.services){
            if(this.services[name] && this.services[name]===service) {
                delete this.services[name]
            }
        }
        this.logger.info(`插件：${plugin.name} 已卸载。`)
        return this
    }
    async start() {
        await this.sessionManager.start()
        await reloadGuilds.call(this)
        for (const [guild_id] of this.guilds) {
            await reloadChannels.call(this, guild_id)
            await reloadGuildMembers.call(this, guild_id)
        }
        await reloadGroupList.call(this)
        for (const [group_id] of this.groups) {
            await reloadGroupMemberList.call(this, group_id)
        }
        await reloadFriendList.call(this)
        this.logger.mark(`加载了${this.friends.size}个好友，${this.groups.size}个群，${this.guilds.size}个频道`)
    }
    loadFromDir(...dirs: string[]) {
        for(const dir of dirs){
            const plugins=loadPlugins(dir)
            for(const plugin of plugins){
                this.mount(plugin)
            }
        }
        return this
    }

    stop() {

    }
}
export namespace Bot{
    export interface Config extends QQBot.Config{
    }
    export interface Services{}
}
