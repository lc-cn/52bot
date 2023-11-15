import {GroupMessageEvent, GuildMessageEvent, PrivateMessageEvent} from "@/message";
export enum QQEvent {
    AT_MESSAGE_CREATE='message.guild',
    MESSAGE_CREATE='message.guild',
    GROUP_ADD_ROBOT='notice.group.increase',
    GROUP_DEL_ROBOT='notice.group.decrease',
    FRIEND_ADD='notice.friend.add',
    FRIEND_DEL='notice.friend.del',
    C2C_MESSAGE_CREATE='message.private',
    GROUP_AT_MESSAGE_CREATE='message.group',
}
export interface EventMap{
    'message.group'(e:GroupMessageEvent):void
    'message.private'(e:PrivateMessageEvent):void
    'message.guild'(e:GuildMessageEvent):void
}
