import {Command} from "@/command";
import { Dict } from '@/types';

export interface MessageBase{
    reply(message:string):Promise<any>
    sender?:MessageSender
    raw_message:string
    message_type:Command.Scope
}
const wrapKV=Object.entries({
    ',':'_🤤_🤖_',
    '&':'$amp;',
    '<':'&lt;',
    '>':'&gt;'
}).map(([key,value])=>({key,value}))
export function wrap(message:string){
    for(const {key,value} of wrapKV){
        message=message.replace(new RegExp(key,'g'),value)
    }
    return message
}
export function unwrap(message:string){
    for(const {key,value} of wrapKV){
        message=message.replace(new RegExp(value,'g'),key)
    }
    return message
}
export type Render<T extends MessageBase=MessageBase>=(template:string,message:T)=>Promise<string>|string
export type Segment=`<${string},${string}>`|string
export function segment(type:string,data:Dict):Segment{
    if(type==='text') return data.text
    return `<${type},${Object.entries(data).map(([key,value])=>{
        return `${key}=${wrap(JSON.stringify(value))}`
    }).join()}>`
}
type MessageSender={
    user_id?:string|number
    user_name?:string
    permissions?:string[]
}
