import { Adapter, AdapterBot, AdapterReceive } from '@/adapter';
import { Middleware } from '@/middleware';

export class Prompt<T extends Adapter>{
  constructor(private adapter:T,private bot:AdapterBot<T>,private event:AdapterReceive<T>) {
  }
  private getChannelAddress<AD extends Adapter>(adapter:AD,bot:AdapterBot<AD>,event:AdapterReceive<AD>){
    return `${adapter.name}-${bot.toString()}-${event.message_type}:${event.sender!.user_id}`
  }
  private prompt<T = unknown>(config:Prompt.Config){
    return new Promise<T>((resolve) => {
      this.event.reply(config.tips)
      this.middleware((input)=>{
        if(input instanceof Error){
          this.event.reply(input.message)
          resolve(config.defaultValue)
          return
        }
        resolve(config.format(input))
      },config.timeout)
    })
  }
  middleware(callback:(input:string|Error)=>any,timeout:number=3*60*1000){
    const middleware:Middleware=(adapter,bot,event,next)=>{
      if(this.getChannelAddress(adapter,bot,event)!==this.getChannelAddress(this.adapter,this.bot,this.event)) return next()
      callback(event.raw_message)
      dispose()
      clearTimeout(timer)
    }
    const dispose=this.adapter.app!.middleware(middleware)
    const timer=setTimeout(()=>{
      dispose()
      callback(new Error('输入超时'))
    },timeout)
  }
  async text(tips:string,timeout?:number,defaultValue=''):Promise<string>{
    return this.prompt<string>({
      tips,
      defaultValue,
      timeout,
      format:(input:string)=>input
    })
  }
  async number(tips:string,timeout?:number,defaultValue=0):Promise<number>{
    return this.prompt<number>({
      tips,
      defaultValue,
      timeout,
      format:(input:string)=>+input
    })
  }
  async confirm(tips:string,condition:string='yes',timeout?:number,defaultValue=false):Promise<boolean>{
    return this.prompt<boolean>({
      tips:`${tips}\n输入“${condition}”以确认`,
      defaultValue,
      timeout,
      format:(input:string)=>input===condition
    })
  }
  async list<T extends Prompt.SingleType='text'>(tips:string,config:Prompt.ListConfig<T>={type:'text' as T}):Promise<Prompt.Result<T>[]>{
    const separator=config.separator||','
    return this.prompt<Prompt.Result<T>[]>({
      tips:`${tips}\n值之间使用“${separator}”分隔`,
      defaultValue:config.defaultValue||[],
      timeout:config.timeout,
      format:(input:string)=>input.split(separator).map(v=>{
        switch (config.type){
          case 'boolean':
            return Boolean(v)
          case 'number':
            return +v
          case 'text':
            return v
        }
      })
    })
  }
  async pick<T extends Prompt.SingleType,M extends boolean=false>(tips:string,config:Prompt.PickConfig<T,M>):Promise<Prompt.PickResult<T,M>>{
    const moreTextArr=config.options.map((o,idx)=>{
      return `${idx+1}.${o.label}`
    })
    const separator=config.separator||','
    if(config.multiple) moreTextArr.push(`多选请用“${separator}”分隔`)
    return this.prompt<Prompt.PickResult<T,M>>({
      tips:`${tips}\n${moreTextArr.join('\n')}`,
      defaultValue:config.defaultValue,
      timeout:config.timeout,
      format:(input:string)=>{
        if(!config.multiple) return config.options.find((o,idx)=>{
          return idx===(+input)
        })?.value
        const pickIdx=input.split(separator).map(Number)
        return config.options.filter((o,idx)=>{
          return pickIdx.includes(idx+1)
        }).map(o=>o.value)
      }
    })
  }
}
export namespace Prompt{

  interface SingleMap{
    text:string
    number:number
    boolean:boolean
  }
  export interface ListConfig<T extends SingleType>{
    type:T
    defaultValue?:SingleMap[T][]
    separator?:string
    timeout?:number
  }
  export interface PickConfig<T extends SingleType=SingleType,M extends boolean=false>{
    type:T
    defaultValue?:M extends true?SingleMap[T]:SingleMap[T][]
    separator?:string
    timeout?:number
    options:PickOption<T>[]
    multiple?:M
  }
  export type PickOption<T extends SingleType='text'>={
    label:string
    value:SingleMap[T]
  }
  export type PickResult<T extends SingleType,M extends boolean>=M extends true?Result<T>[]:Result<T>
  export type SingleType=keyof SingleMap
  export type Result<T extends SingleType>=SingleMap[T]
  export type Config ={
    tips:string
    defaultValue:any
    timeout?:number
    format:(input:string)=>any
  }
}
