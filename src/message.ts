import {Sendable} from "@/elements";
import {QQBot} from "@/bot";

export class Message {
    get self_id() {
        return this.bot.self_id
    }

    message_id: string
    sender: Message.Sender
    user_id: string

    constructor(public bot: QQBot, attrs: Partial<Message>) {
        Object.assign(this, attrs)
    }

    message: Sendable

    get [Symbol.unscopables]() {
        return {
            bot: true
        }
    }

    toJSON() {
        return Object.fromEntries(Object.keys(this)
            .filter(key => {
                return typeof this[key] !== "function" && !(this[key] instanceof QQBot)
            })
            .map(key => [key, this[key]])
        )
    }
}

export namespace Message {
    export interface Sender {
        user_id: string
        user_name: string
    }
}

export interface MessageEvent {
    reply(message: Sendable, quote?: boolean): Promise<any>
}

export class PrivateMessageEvent extends Message implements MessageEvent {
    async reply(message: Sendable, quote?: boolean): Promise<any> {
        return this.bot.sendPrivateMessage(this.user_id, message, quote ? this : undefined)
    }
}

export class GroupMessageEvent extends Message implements MessageEvent {
    group_id: string
    group_name: string

    async reply(message: Sendable, quote?: boolean) {
        return this.bot.sendGroupMessage(this.group_id, message, quote ? this : undefined)
    }
}

export class GuildMessageEvent extends Message implements MessageEvent {
    guild_id: string
    guild_name: string
    channel_id: string
    channel_name: string

    async reply(message: Sendable, quote?: boolean) {
        return this.bot.sendGuildMessage(this.guild_id, this.channel_id, message, quote ? this : undefined)
    }
}
