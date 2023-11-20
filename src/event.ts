import {DirectMessageEvent, GroupMessageEvent, GuildMessageEvent, PrivateMessageEvent} from "@/message";
import {Plugin} from '@/plugin'
import {Bot} from "@/bot";
export enum QQEvent {
    DIRECT_MESSAGE_CREATE='message.direct',
    AT_MESSAGE_CREATE='message.guild',
    MESSAGE_CREATE='message.guild',
    GUILD_CREATE='notice.guild.increase',
    GUILD_UPDATE='notice.guild.update',
    GUILD_DELETE='notice.guild.decrease',
    CHANNEL_CREATE='notice.channel.increase',
    CHANNEL_UPDATE='notice.channel.update',
    CHANNEL_DELETE='notice.channel.decrease',
    GUILD_MEMBER_ADD='notice.guild.member.increase',
    GUILD_MEMBER_UPDATE='notice.guild.member.update',
    GUILD_MEMBER_REMOVE='notice.guild.member.decrease',
    GROUP_ADD_ROBOT='notice.group.increase',
    GROUP_DEL_ROBOT='notice.group.decrease',
    FRIEND_ADD='notice.friend.add',
    FRIEND_DEL='notice.friend.del',
    C2C_MESSAGE_CREATE='message.private',
    GROUP_AT_MESSAGE_CREATE='message.group',
}
export interface EventMap{
    'plugin-beforeMount'(plugin:Plugin):void
    'plugin-mounted'(plugin:Plugin):void
    'plugin-beforeUnmount'(plugin:Plugin):void
    'plugin-unmounted'(plugin:Plugin):void
    'service-beforeRegister':<T extends keyof Bot.Services>(name:T,service:Bot.Services[T])=>void
    'service-registered':<T extends keyof Bot.Services>(name:T,service:Bot.Services[T])=>void
    'service-beforeDestroy':<T extends keyof Bot.Services>(name:T,service:Bot.Services[T])=>void
    'service-destroyed':<T extends keyof Bot.Services>(name:T,service:Bot.Services[T])=>void
    'message'(e:PrivateMessageEvent|GroupMessageEvent|GuildMessageEvent|DirectMessageEvent):void
    'message.direct'(e:DirectMessageEvent):void
    'message.group'(e:GroupMessageEvent):void
    'message.private'(e:PrivateMessageEvent):void
    'message.guild'(e:GuildMessageEvent):void
}
