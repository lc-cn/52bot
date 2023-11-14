import {GroupMessageEvent, GuildMessageEvent, PrivateMessageEvent} from "@/message";

export interface EventMap{
    'message.group'(e:GroupMessageEvent):void
    'message.private'(e:PrivateMessageEvent):void
    'message.guild'(e:GuildMessageEvent):void
}