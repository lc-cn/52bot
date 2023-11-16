import * as path from "path";
import { Plugin } from "./plugin";
import { QQBot } from "./qqBot";
import {GroupMessageEvent, GuildMessageEvent, Message, PrivateMessageEvent} from "@/message";
import { Middleware } from "@/middleware";
import {loadPlugin, loadPlugins, saveToLocal} from "@/utils";
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
import {AudioElem, ImageElem, Quotable, Sendable, VideoElem} from "./elements";
import {Group} from "@/entries/group";
import {Friend} from "@/entries/friend";
import {GroupMember} from "@/entries/groupMember";
import * as fs from "fs";
import * as crypto from "crypto";

type GuildMemberMap = Map<string, GuildMember.Info>
type GroupMemberMap = Map<string,GroupMember.Info>
export class Bot extends QQBot {
    middlewares: Middleware[] = []
    private data_dir:string
    plugins: Map<string, Plugin> = new Map<string, Plugin>()
    guilds: Map<string, Guild.Info> = new Map<string, Guild.Info>()
    guildMembers: Map<string, GuildMemberMap> = new Map<string, GuildMemberMap>()
    channels: Map<string, Channel.Info> = new Map<string, Channel.Info>()
    groups:Map<string,Group.Info> = new Map<string,Group.Info>()
    groupMembers:Map<string,GroupMemberMap> = new Map<string,GroupMemberMap>()
    friends:Map<string,Friend.Info> = new Map<string,Friend.Info>()
    constructor(config: Bot.Config) {
        super(config)
        const dataDir = config.data_dir||path.resolve(process.cwd(), 'data')
        if(!fs.existsSync(dataDir)) fs.mkdirSync(dataDir)
        this.data_dir = dataDir
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
    middleware(middleware: Middleware, before?: boolean) {
        if (before) this.middlewares.unshift(middleware)
        else this.middlewares.push(middleware)
        return this
    }
    findCommand(name: string) {
        return this.commandList.find(command => command.name === name)
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

    async sendGuildMessage(channel_id: string, message: Sendable, source?: Quotable) {
        try{
            return this.pickChannel(channel_id).sendMessage(message, source)
        }catch {
            const { hasMessages, messages, brief, hasFiles, files } =await Message.format.call(this, message, source)
            let message_id = ''
            if (hasMessages) {
                let { data: { id } } = await this.request.post(`/channels/${channel_id}/messages`, messages)
                message_id = id
            }
            if (hasFiles) {
                console.log(files)
                let { data: { id } } = await this.request.post(`/channels/${channel_id}/files`, files)
                if (message_id) message_id = `${message_id}|`
                message_id = message_id + id
            }
            this.logger.info(`send to Channel(${channel_id}): ${brief}`)
            return {
                message_id,
                timestamp: new Date().getTime() / 1000
            }
        }
    }
    async createDmsSession(guild_id:string,user_id:string){
        const {data:result}=await this.request.post(`/users/@me/dms`,{
            recipient_id:user_id,
            source_guild_id:guild_id
        })
        return result
    }
    async sendDmsMessage(guild_id:string,message:Sendable,source?:Quotable){
        const { hasMessages, messages, brief, hasFiles, files } =await Message.format.call(this, message, source)
        let message_id = ''
        if (hasMessages) {
            let { data: { id } } = await this.request.post(`/dms/${guild_id}/messages`, messages)
            message_id = id
        }
        if (hasFiles) {
            let { data: { id } } = await this.request.post(`/dms/${guild_id}/files`, files)
            if (message_id) message_id = `${message_id}|`
            message_id = message_id + id
        }
        this.logger.info(`send to Direct(${guild_id}): ${brief}`)
        return {
            message_id,
            timestamp: new Date().getTime() / 1000
        }
    }
    async getChannelList(guild_id: string) {
        return [...this.channels.values()]
    }

    async getChannelInfo(channel_id: string) {
        return this.channels.get(channel_id)
    }

    use(name: string)
    use(plugin: Plugin)
    use(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            plugin = loadPlugin(plugin)
        }
        this.plugins.set(plugin.name, plugin)
        return this
    }
    unUse(plugin: Plugin | string) {
        if (typeof plugin === 'string') {
            this.plugins.delete(plugin)
        } else {
            this.plugins.delete(plugin.name)
        }
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
    loadFromDir(dir: string) {
        const plugins=loadPlugins(dir)
        for(const plugin of plugins){
            this.use(plugin)
        }
        return this
    }

    stop() {

    }
}
export namespace Bot{
    export interface Config extends QQBot.Config{
        data_dir?: string
    }
}
