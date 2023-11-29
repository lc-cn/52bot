import { Dict } from '52bot';

export class Component<T={},D={},P=Component.Props<T>>{
  constructor(options:Component.Options<T,D>) {
  }
  render(){

  }
}
export namespace Component{
  export interface Options<T,D>{
    name:string
    props?:T
    data?:(this:Props<T>)=>D
    render:Render<Props<T>,D>
  }
  export type Render<P={},T={}>=(this:P & T &{children:string,name:string},children:string)=>Promise<string>|string
  export type Props<T>={
    [P in keyof T]:Prop<T[P]>
  }
  export type Prop<T>=T extends BooleanConstructor?boolean:
    T extends StringConstructor?string:
      T extends NumberConstructor?number:
        T extends ArrayConstructor?any[]:
          T extends ObjectConstructor?Dict:unknown
  export const components:Map<string,Component>=new Map<string, Component>()
  export function define<P,D>(render:Render<P, D>):Component<{},D,P>
  export function define<T,D>(options:Options<T,D>):Component<T,D>
  export function define(options:any){
    if(typeof options==='function') options={
      name:options.name,
      render:options
    }
    return new Component(options)
  }
}
