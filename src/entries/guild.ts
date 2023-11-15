import { Bot, Message, Quotable, Sendable } from "..";
import { Channel } from "./channel";
import { Contactable } from "./contactable";
import { GuildMember } from "./guildMember";
const guildCache: WeakMap<Guild.Info, Guild> = new WeakMap<Guild.Info, Guild>()
export class Guild extends Contactable {
    constructor(bot: Bot, public info: Guild.Info) {
        super(bot)
        this.guild_id=info.id
        this.getRoles()
    }
    roles:Guild.Role[]=[]
    pickChannel=Channel.from.bind(this.bot)
    pickMember=GuildMember.from.bind(this.bot,this.guild_id)
    static from(this: Bot, guild_id: string) {
        const guildInfo = this.guilds.get(guild_id)
        if (!guildInfo) throw new Error(`guild(${guild_id}) is not exist`)
        if (guildCache.has(guildInfo)) return guildCache.get(guildInfo)
        const guild = new Guild(this, guildInfo)
        guildCache.set(guildInfo, guild)
        return guild
    }
    async createChannel(channelInfo:Omit<Channel.Info,'id'>):Promise<Channel.Info>{
        const { data: result } = await this.bot.request.post(`/guilds/${this.guild_id}/channels`, channelInfo)
        return result
    }
    async updateChannel({ channel_id, ...updateInfo }: { channel_id: string } & Partial<Pick<Channel.Info, 'name' | 'position' | 'parent_id' | 'private_type' | 'speak_permission'>>): Promise<Channel.Info> {
        const { data: result } = await this.bot.request.patch(`/channels/${channel_id}`, updateInfo)
        return result
    }
    async deleteChannel(channel_id: string) {
        const result = await this.bot.request.delete(`/channels/${channel_id}`)
        return result.status === 200
    }
    async getRoles(){
        const {data:{roles=[]}={}} = await this.bot.request.get(`/guilds/${this.guild_id}/roles`)
        this.roles=roles
        return roles
    }
    async creatRole(role:Pick<Guild.Role,'name'|'color'|'hoist'>):Promise<Guild.Role>{
        const {data:result}=await this.bot.request.post(`/guilds/${this.guild_id}/roles`,role)
        return result.role
    }
    async updateRole({id,...role}:Pick<Guild.Role,'id'|'name'|'color'|'hoist'>){
        const {data:result}=await this.bot.request.patch(`/guilds/${this.guild_id}/roles/${id}`,role)
        return result.role
    }
    async deleteRole(role_id:string){
        const result = await this.bot.request.delete(`/guilds/{guild_id}/roles/${role_id}`)
        return result.status===204
    }
    sendMessage(channel_id:string,message:Sendable,source?:Quotable){
        return this.pickChannel(channel_id).sendMessage(message,source)
    }
}
export namespace Guild {
    export interface Info {
        id:string
        name:string
        icon:string
        owner_id:string
        owner:boolean
        join_time:number
        member_count:number
        max_members:number
        description:string
    }
    export interface Role{
        id:string
        name:string
        color:string
        hoist:boolean
        number:number
        member_limit:number
    }
}