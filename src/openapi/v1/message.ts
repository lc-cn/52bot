import {
    IMessageRes,
    MessageChain, MessageEvent,
    MessageType,
    OpenAPIRequest,
    Sendable
} from '@/types';
import {getURL} from './resource';
export interface MessageToCreate {
    content?: string
    file_type?: number
    url?: string
    event_id?:string
    msg_id?:string
    srv_send_msg?:boolean
    markdown?: {
        content: string
    }
    msg_type?: 0|2
    timestamp?:number
}
export default class Message{
    public request: OpenAPIRequest;

    constructor(request: OpenAPIRequest) {
        this.request = request;
    }
    static toChain(message:IMessageRes):MessageChain{
        const result:MessageChain=[]
        if(message.msg.content){
            const face=message.msg.content.match(/(<emoji:\d+>)/g)
            if(face){
                for(let elem of face){
                    if(!message.msg.content.startsWith(elem)){
                        result.push({
                            type:MessageType.Text,
                            data:{
                                text:message.msg.content.slice(0,message.msg.content.indexOf(elem))
                            }
                        })
                    }
                    result.push({
                        type:MessageType.Face,
                        data:{
                            id:elem.match(/\d+/)![0]
                        }
                    })
                }
            }
            if(message.msg.content){
                result.push({
                    type:MessageType.Text,
                    data:{
                        text:message.msg.content
                    }
                })
            }
        }
        return result
    }
    static format(message: Sendable,source?:MessageEvent) {
        const getType = (type: MessageType) => {
            return [MessageType.Image, MessageType.File, MessageType.Audio].indexOf(type) + 1
        }
        if (typeof message === 'string') message = {type: MessageType.Text, data: {text: message}}
        if (!Array.isArray(message)) message = [message] as MessageChain
        let result: Partial<MessageToCreate> = {
            timestamp:Number((Date.now()/1000).toFixed(0))
        }
        for (let elem of message) {
            if (typeof elem === 'string') {
                elem = {type: MessageType.Text, data: {text: elem}}
            }
            switch (elem.type) {
                case MessageType.Text:
                    result.content ? result.content += elem.data.text : result.content = elem.data.text
                    break;
                case MessageType.Face:
                    result.content ? result.content += `<emoji:${elem.data.id}` : result.content = `<emoji:${elem.data.id}`
                    break;
                case MessageType.Image:
                case MessageType.Video:
                case MessageType.Audio:
                case MessageType.File:
                    result.file_type = getType(elem.type)
                    result.content='file'
                    result.url = elem.data.src;
                    result.event_id=source!.event_id
                    result.msg_id=source?.message_id
                    result.srv_send_msg = true
                    break;
                case MessageType.MD:
                    result.markdown = {
                        content: elem.data.content
                    }
                    result.msg_type = 2
                    break;
            }
        }
        return result as MessageToCreate
    }

    // 发送私聊消息
    public postMessage(user_id: string, message: MessageToCreate) {
        const options = {
            method: 'POST' as const,
            url: !message.file_type ? getURL('c2cMessagesURI') : getURL('c2cRichMediaURI'),
            rest: {
                user_id,
            },
            data: message,
        };
        return this.request(options);
    }

    public postGroupMessage(group_id: string, message: MessageToCreate) {
        const options = {
            method: 'POST' as const,
            url: !message.file_type ? getURL('groupMessagesURI') : getURL('groupRichMediaURI'),
            rest: {
                group_id,
            },
            data: message,
        };
        return this.request(options);
    }

}
