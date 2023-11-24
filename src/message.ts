import {Command} from "@/command";

export interface MessageBase{
    user_id?:string
    group_id?:string
    guild_id?:string
    channel_id?:string
    reply?(...args:any[]):Promise<any>
    sender?:MessageSender
    raw_message:string
    message_type:Command.Scope
}
type MessageSender={
    user_id?:string
    user_name?:string
    permissions?:string[]
}
