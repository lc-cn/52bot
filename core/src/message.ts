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
export type DefineSegment={
    (type:string,data:Dict):string
    text(text:string):string
    face(id:number):string
    image(url:string):string
    at(user_id:string|number):string
}
export const segment:DefineSegment=function(type, data){if(type==='text') return data.text
    return `<${type},${Object.entries(data).map(([key,value])=>{
        return `${key}=${wrap(JSON.stringify(value))}`
    }).join()}>`
} as DefineSegment
segment.text=(text)=>text
segment.face=(id:number)=>`<face,id=${id}>`
segment.image=(file:string)=>`<image,file=${file}>`
segment.at=(user_id)=>`<at,user_id=${user_id}>`
type MessageSender={
    user_id?:string|number
    user_name?:string
    permissions?:string[]
}
