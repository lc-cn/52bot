import {Bot} from "@/bot";
import Message from "@/openapi/v1/message";


// 官方事件返回的消息结构
export interface IMessageRes {
    eventType:string
    eventId:string
    msg:{
        author:{id:string}
        content?:string
        group_id:string
        id:string
        timestamp:string
    }
}

export enum MessageType {
    Text = 'text',
    Image = 'image',
    Face = 'face',
    Video = 'video',
    Audio = 'audio',
    File = 'file',
    MD = 'markdown',
}

export interface TextSegment {
    type: MessageType.Text;
    data: {
        text: string;
    }
}
export interface FaceSegment {
    type: MessageType.Face;
    data: {
        id: string;
    }
}
export interface ImageSegment {
    type: MessageType.Image;
    data: {
        src: string;
    }
}

export interface VideoSegment {
    type: MessageType.Video;
    data: {
        src: string;
    }
}

export interface AudioSegment {
    type: MessageType.Audio;
    data: {
        src: string;
    }
}

export interface FileSegment {
    type: MessageType.File;
    data: {
        src: string;
    }
}

export interface MDTextSegment {
    type: MessageType.MD;
    data: {
        content: string;
    }
}

export type Sendable = string | TextSegment | ImageSegment | VideoSegment | AudioSegment | FileSegment | MDTextSegment |
    (string | TextSegment|FaceSegment)[] | [
    ImageSegment |
    VideoSegment |
    AudioSegment |
    FileSegment|
    MDTextSegment
]
export type MessageChain=(TextSegment|FaceSegment)[]|[
        ImageSegment |
        VideoSegment |
        AudioSegment |
        FileSegment|
        MDTextSegment
]
export interface MessageEvent {
    event_id:string
    event_name:string
    message_id: string
    message:MessageChain
    group_id:string
    user_id:string
}

export enum FromType {
    Group = 'group',
    Private = 'private'
}

export class MessageEvent {
    get message_type(){
        return this.group_id==='0'?FromType.Private:FromType.Group
    }
    constructor(public bot: Bot, data: IMessageRes) {
        this.event_id=data.eventId
        this.event_name=data.eventType
        this.message_id = data.msg.id
        this.group_id = data.msg.group_id
        this.user_id= data.msg.author.id
        this.message=Message.toChain(data)
    }
    reply(message: Sendable) {
        if(this.message_type===FromType.Private){
            return this.bot.sendPrivateMsg(this.user_id, message,this)
        }
        return this.bot.sendGroupMessage(this.group_id, message,this)
    }
    static from(this: Bot, obj: IMessageRes) {
        return new MessageEvent(this, obj)
    }

}
