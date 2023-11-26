import {App} from "@/app";
import {EventEmitter} from "events";
import {MessageBase} from "@/message";
import path from "path";
export type AdapterBot<A extends Adapter>=A extends Adapter<infer B>?B:unknown
export type AdapterReceive<A extends Adapter>=A extends Adapter<infer B,infer R>?R:unknown
export class Adapter<T=object,R=MessageBase> extends EventEmitter{
    bots:T[]=[]
    zhin:App|null=null
    constructor(public name:string) {
        super()
    }
    mount(zhin:App){
        this.emit('before-mount')
        this.zhin=zhin
        this.emit('mounted')
    }
    unmount(){
        this.emit('before-unmount')
        this.zhin=null
        this.emit('unmounted')
    }
}
export interface Adapter{
    on<T extends keyof Adapter.EventMap>(event: T, listener: Adapter.EventMap[T]): this

    on<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, listener: (...args: any[]) => any): this

    off<T extends keyof Adapter.EventMap>(event: T, callback?: Adapter.EventMap[T]): this

    off<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, callback?: (...args: any[]) => void): this

    once<T extends keyof Adapter.EventMap>(event: T, listener: Adapter.EventMap[T]): this

    once<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, listener: (...args: any[]) => any): this

    emit<T extends keyof Adapter.EventMap>(event: T, ...args: Parameters<Adapter.EventMap[T]>): boolean

    emit<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, ...args: any[]): boolean

    addListener<T extends keyof Adapter.EventMap>(event: T, listener: Adapter.EventMap[T]): this

    addListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, listener: (...args: any[]) => any): this

    addListenerOnce<T extends keyof Adapter.EventMap>(event: T, callback: Adapter.EventMap[T]): this

    addListenerOnce<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, callback: (...args: any[]) => void): this

    removeListener<T extends keyof Adapter.EventMap>(event: T, callback?: Adapter.EventMap[T]): this

    removeListener<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>, callback?: (...args: any[]) => void): this

    removeAllListeners<T extends keyof Adapter.EventMap>(event: T): this

    removeAllListeners<S extends string | symbol>(event: S & Exclude<string | symbol, keyof Adapter.EventMap>): this

}
export namespace Adapter{
    export interface EventMap{
        'before-mount'():void
        'before-unmount'():void
        'mounted'():void
        'unmounted'():void
        'start'():void
    }
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
            if(!(result instanceof Adapter)) throw new Error(`${adapterPath} is not a adapter`)
            return result
        }
        throw new Error(`can't find adapter ${name}`)
    }
}
