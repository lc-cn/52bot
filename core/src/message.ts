import {Command} from "@/command";
import { Dict } from '@/types';

export interface MessageBase{
    reply(...args:any[]):Promise<any>
    sender?:MessageSender
    raw_message:string
    message_type:Command.Scope
}
export type Segment=`<${string},${string}>`|string
export function segment(type:string,data:Dict):Segment{
    if(type==='text') return data.text
    return `<${type},${Object.entries(data).map(([key,value])=>{
        return `${key}=${JSON.stringify(value).replace('=','🤤🤖')}`
    }).join()}>`
}
type MessageSender={
    user_id?:string
    user_name?:string
    permissions?:string[]
}
