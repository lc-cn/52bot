import {MessageElem, Quotable, Sendable} from "@/elements";
import {QQBot} from "@/bot";
import {Dict} from "@/types";
import {remove, trimQuote} from "@/utils";
import {Middleware} from "@/middleware";
import {Prompt} from "@/prompt";

export class Message {
    sub_type:Message.SubType
    get self_id() {
        return this.bot.self_id
    }

    message_id: string
    sender: Message.Sender
    user_id: string
    private _prompt:Prompt
    constructor(public bot: QQBot, attrs: Partial<Message>) {
        Object.assign(this, attrs)
        this._prompt=new Prompt(this.bot,this as any,this.bot.config?.delay?.prompt || 5000)
    }
    raw_message:string
    message: Sendable
    get prompt(){
        return this._prompt.prompts
    }
    get promptText(){
        return this._prompt.text
    }
    get promptNumber(){
        return this._prompt.number
    }
    get promptConfirm(){
        return this._prompt.confirm
    }
    get [Symbol.unscopables]() {
        return {
            bot: true
        }
    }
    /**
     * 注册一个中间件
     * @param middleware
     */
    middleware(middleware: Middleware) {
        const fullId = QQBot.getFullTargetId(this as any);
        const newMiddleware=async (event, next) => {
            if (fullId && QQBot.getFullTargetId(event) !== fullId) return next();
            return middleware(event, next);
        }
        this.bot.middleware(newMiddleware, true);
        return ()=>{
            remove(this.bot.middlewares,newMiddleware)
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


export interface MessageEvent {
    reply(message: Sendable, quote?: boolean): Promise<any>
}

export class PrivateMessageEvent extends Message implements MessageEvent {
    constructor(bot:QQBot,payload:Partial<Message>) {
        super(bot,payload);
        this.sub_type='private'
    }
    async reply(message: Sendable): Promise<any> {
        return this.bot.sendPrivateMessage(this.user_id, message,this)
    }
}

export class GroupMessageEvent extends Message implements MessageEvent {
    group_id: string
    group_name: string

    constructor(bot:QQBot,payload:Partial<Message>) {
        super(bot,payload);
        this.sub_type='group'
    }
    async reply(message: Sendable) {
        return this.bot.sendGroupMessage(this.group_id, message,this)
    }
}

export class GuildMessageEvent extends Message implements MessageEvent {
    guild_id: string
    guild_name: string
    channel_id: string
    channel_name: string
    constructor(bot:QQBot,payload:Partial<Message>) {
        super(bot,payload);
        this.sub_type='guild'
    }
    async reply(message: Sendable) {
        return this.bot.sendGuildMessage(this.guild_id, this.channel_id, message, this)
    }
}
export namespace Message {
    export interface Sender {
        user_id: string
        user_name: string
    }
    export type SubType='private'|'group'|'guild'
    export function parse(this:QQBot,payload: Dict) {
        let template=payload.content||''
        let result:MessageElem[]=[]
        let brief:string=''
        // 1. 处理文字表情混排
        const regex = /("[^"]*?"|'[^']*?'|`[^`]*?`|“[^”]*?”|‘[^’]*?’|<[^>]+?>)/;
        while (template.length){
            const [match] = template.match(regex) || [];
            if (!match) break;
            const index = template.indexOf(match);
            const prevText = template.slice(0, index);
            if (prevText) {
                result.push({
                    type:'text',
                    text:prevText
                })
                brief+=prevText
            }
            template = template.slice(index + match.length);
            if(match.startsWith('<')){
                let [type,...attrs]=match.slice(1,-1).split(',');
                if(type.startsWith('faceType')) {
                    type='face'
                    attrs=attrs.map((attr:string)=>attr.replace('faceId','id'))
                }else if(type.startsWith('@')){
                    if(type.startsWith('@!')){
                        const id=type.slice(2,)
                        type='at'
                        attrs=Object.entries(payload.mentions.find((u:Dict)=>u.id===id)||{})
                            .map(([key,value])=>`${key}=${value}`)
                    }else if(type==='@everyone'){
                        type='at'
                        attrs=[['all',true]]
                    }
                }else if(/^[a-z]+:[0-9]+$/.test(type)){
                    attrs=[['id',type.split(':')[1]]]
                    type='face'
                }
                result.push({
                    type,
                    ...Object.fromEntries(attrs.map((attr:string)=>{
                        const [key,...values]=attr.split('=')
                        return [key.toLowerCase(),trimQuote(values.join('='))]
                    }))
                })
                brief+=`<${type}:${attrs.join(',')}>`
            }
        }
        if(template){
            result.push({
                type:'text',
                text:template
            })
            brief+=template
        }
        // 2. 将附件添加到消息中
        if(payload.attachments){
            for(const attachment of payload.attachments){
                let {content_type,...data}=attachment
                const [type]=content_type.split('/')
                result.push({
                    type,
                    ...data,
                    src:data.src||data.url,
                    url:data.url||data.src
                })
                brief+=`<$${type},${Object.entries(data).map(([key,value])=>`${key}=${value}`).join(',')}>`
            }
        }
        delete payload.attachments
        delete payload.mentions
        return [result,brief]
    }
    export function format(this:QQBot, message: Sendable,source:Quotable={}) {
        const getType = (type: string) => {
            return ['image','video', 'audio'].indexOf(type) + 1
        }
        let brief:string=''
        const messages:Dict={
            msg_type:0,
            msg_id:source?.message_id,
            msg_seq:Math.round (Math.random ()*10**10),
            timestamp:Number((Date.now()/1000).toFixed(0))
        }
        const files:Dict={
            msg_id:source?.message_id,
            msg_seq:Math.round (Math.random ()*10**10),
            timestamp:Number((Date.now()/1000).toFixed(0))
        }
        let hasMessages=false,hasFiles=false,buttons=[];
        if(!Array.isArray(message)) message=[message as any]
        for (let elem of message) {
            if (typeof elem === 'string') {
                elem = {type: 'text', text: elem}
            }
            switch (elem.type) {
                case 'reply':
                    messages.msg_id=elem.message_id
                    files.msg_id=elem.message_id
                    brief+=`<$reply,message_id=${elem.message_id}>`
                    break;
                case "at":
                    if(messages.content){
                        messages.content+=`<@${elem.id||'everyone'}>`
                    }else{
                        messages.content=`<@${elem.id||'everyone'}>`
                    }
                    brief+=`<$at,user=${elem.id||'everyone'}>`
                    break;
                case 'link':
                    if(messages.content){
                        messages.content+=`<#${elem.channel_id}>`
                    }else{
                        messages.content=`<#${elem.channel_id}>`
                    }
                    brief+=`<$link,channel=${elem.channel_id}>`
                    break;
                case 'text':
                    if(messages.content){
                        messages.content+=elem.text
                    }else{
                        messages.content=elem.text
                    }
                    hasMessages=true
                    brief+=elem.text
                    break;
                case 'face':
                    if(messages.content){
                        messages.content+=`<emoji:${elem.id}>`
                    }else{
                        messages.content=`<emoji:${elem.id}>`
                    }
                    brief+=`<$face,id=${elem.id}>`
                    hasMessages=true
                    break;
                case 'image':
                case 'audio':
                case 'video':
                    files.file_type = getType(elem.type)
                    files.content='file'
                    files.url = elem.file;
                    files.event_id=source!.event_id
                    files.msg_id=source?.message_id
                    files.srv_send_msg = true
                    hasFiles=true
                    brief+=`<${elem.type},file=${elem.file}>`
                    break;
                case 'markdown':
                    messages.markdown = {
                        content: elem.content
                    }
                    messages.msg_type = 2
                    hasMessages=true
                    brief+=`<#markdown,content=${elem.content}>`
                    break;
                case 'button':
                    buttons.push(elem.data)
                    brief+=`<$button,data=${JSON.stringify(elem.data)}>`
                    break;
            }
        }
        if(buttons.length) {
            const rows=[]
            for(let i=0;i<buttons.length;i+=4){
                rows.push(buttons.slice(i,i+4))
            }
            messages.keyboard={
                content:{
                    rows:rows.map(row=>{
                        return {
                            buttons:row
                        }
                    })
                }
            }
        }
        return {
            messages:messages,
            hasFiles,
            hasMessages,
            brief,
            files
        }
    }
}

