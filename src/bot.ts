import { Plugin } from "./plugin";
import { QQBot } from "./qqBot";
import { commandParser } from "@/plugins/commandParser";
import { pluginManager } from "@/plugins/pluginManager";
import { GroupMessageEvent, GuildMessageEvent, Message, PrivateMessageEvent } from "@/message";
import { Middleware } from "@/middleware";
import { loadPlugin } from "@/utils";
import { Channel } from './entries/channel'
import { Guild } from "./entries/guild";
import { GuildMember } from "./entries/guildMember";
import { reloadGuilds, reloadChannels, relaodGuildMembers } from "./internal/onlinelistener";
import { Quotable, Sendable } from "./elements";
type ChannelMap = Map<string, Channel.Info>
type GuildMemberMap = Map<string, GuildMember.Info>
export class Bot extends QQBot {
    middlewares: Middleware[] = []
    plugins: Map<string, Plugin> = new Map<string, Plugin>()
    guilds: Map<string, Guild.Info> = new Map<string, Guild.Info>()
    guildMembers: Map<string, GuildMemberMap> = new Map<string, GuildMemberMap>()
    channels: Map<string, Channel.Info> = new Map<string, Channel.Info>()
    constructor(config: QQBot.Config) {
        super(config)
        this.handleMessage = this.handleMessage.bind(this)
        this.on('message', this.handleMessage)
        this.use(commandParser)
        this.use(pluginManager)
    }
    pickGuild = Guild.from.bind(this)
    pickChannel = Channel.from.bind(this)
    pickGuildMember = GuildMember.from.bind(this)
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
        const _getGuildMemberList = async (after: string = undefined) => {
            const res = await this.request.get(`/guilds/${guild_id}/members`, {
                params: {
                    after,
                    limit: 100
                }
            })
            if (!res.data?.length) return []
            const result = (res.data || []).map(m => {
                const { id: member_id, role, join_time, ...member } = m
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

    async sendGuildMessage(channel_id: string, message: Sendable, source?: Quotable) {
        return this.pickChannel(channel_id).sendMessage(message, source)
    }
    async getGuildMemberInfo(guild_id: string, member_id: string) {
        const result = await this.request.get(`/guilds/${guild_id}/members/${member_id}`)
        const { user: { id: _, ...member }, nick: nickname, joined_at, roles } = result.data || {}
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
            await relaodGuildMembers.call(this, guild_id)
        }
        this.logger.mark(`加载了${this.guilds.size}个频道`)
    }

    stop() {

    }

}