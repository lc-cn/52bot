import { App } from '@/app';
import { EventEmitter } from 'events';
import { Message } from '@/message';
import path from 'path';
import * as process from 'process';
import { getLogger, Logger } from 'log4js';

export type AdapterBot<A extends Adapter> = A extends Adapter<infer B> ? B : unknown
export type AdapterReceive<A extends Adapter> = A extends Adapter<infer B, infer R> ? R : unknown
export class Adapter<I extends object= object,M = {}> extends EventEmitter {
  bots: Adapter.Bot<I>[] = [];
  app: App | null = null;
  private _logger?:Logger
  get logger(){
    return this._logger||=getLogger(`[${this.name}]`)
  }
  constructor(public name: string) {
    super();
  }
  async sendMsg(bot_id: string, target_id: string, target_type: string,message:string,source?:Message<Adapter<I,M>>):Promise<any>{}
  define<T extends keyof Adapter<I,M>>(name:T,value:Adapter<I,M>[T]):void{
    Object.defineProperty(this,name,{value,writable:false,enumerable:false})
  }
  pick(bot_id:string){
    const bot=this.bots.find(bot=>bot.unique_id===bot_id)
    if(!bot) throw new Error(`未找到Bot:${bot_id}`)
    return bot
  }
  mount(app: App,bots:App.BotConfig[]) {
    this.emit('before-mount');
    this.logger.level=app.config.logLevel
    this.app = app;
    this.emit('mounted',bots);
  }
  unmount() {
    this.emit('before-unmount');
    this.app = null;
    this.emit('unmounted');
  }
}

export interface Adapter {
  on<T extends keyof Adapter.EventMap>(event: T, listener: Adapter.EventMap[T]): this;

  on<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, listener: (...args: any[]) => any): this;

  off<T extends keyof Adapter.EventMap>(event: T, callback?: Adapter.EventMap[T]): this;

  off<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, callback?: (...args: any[]) => void): this;

  once<T extends keyof Adapter.EventMap>(event: T, listener: Adapter.EventMap[T]): this;

  once<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, listener: (...args: any[]) => any): this;

  emit<T extends keyof Adapter.EventMap>(event: T, ...args: Parameters<Adapter.EventMap[T]>): boolean;

  emit<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, ...args: any[]): boolean;

  addListener<T extends keyof Adapter.EventMap>(event: T, listener: Adapter.EventMap[T]): this;

  addListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, listener: (...args: any[]) => any): this;

  addListenerOnce<T extends keyof Adapter.EventMap>(event: T, callback: Adapter.EventMap[T]): this;

  addListenerOnce<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, callback: (...args: any[]) => void): this;

  removeListener<T extends keyof Adapter.EventMap>(event: T, callback?: Adapter.EventMap[T]): this;

  removeListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, callback?: (...args: any[]) => void): this;

  removeAllListeners<T extends keyof Adapter.EventMap>(event: T): this;

  removeAllListeners<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>): this;

}
export namespace Adapter{
    export interface EventMap{
        'before-mount'():void
        'before-unmount'():void
        'mounted'():void
        'unmounted'():void
        'start'():void
    }
    export interface Config<T extends keyof App.Adapters=keyof App.Adapters>{
      name:T
      bots:App.BotConfig<T>[]
    }
    export type SendMsgFn=(bot_id:string,target_id:string,target_type:Message.Type,message:string)=>Promise<any>
    export type Bot<T=object> = {
      unique_id:string
    } & T
    export function load(name:string){
        const maybePath=[
            path.join(process.cwd(),'node_modules',`@52bot`,name),// 官方适配器
            path.join(process.cwd(),'node_modules',`52bot-`+ name)// 社区适配器
        ];
        for(const adapterPath of maybePath){
            let result=null
            try{
                result=require(adapterPath)
            } catch {}
            if(!result) continue
            result=result.default||result
            if(!(result instanceof Adapter)) throw new Error(`${adapterPath} is not an adapter`)
            return result
        }
        throw new Error(`can't find adapter ${name}`)
    }
}
