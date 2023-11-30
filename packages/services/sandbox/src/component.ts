import { Dict } from '52bot';
export const CapWithChild=Symbol('CapWithChild')
export const CapWithClose=Symbol('CapWithClose')
export class Component<T = {}, D = {}, P = Component.Props<T>> {
  [CapWithClose]: RegExp
  [CapWithChild]: RegExp
  $props: Component.PropConfig[] = [];

  constructor(private $options: Component.Options<T, D, P>) {
    this.formatProps();
    this[CapWithChild] = new RegExp(`<${$options.name}([^/>]*)?>([^<])*?</${$options.name}>`);
    this[CapWithClose] = new RegExp(`<${$options.name}([^/>])*?/>`);
  }
  isClosing(template:string){
    return this[CapWithClose].test(template)
  }
  match(template:string){
    let [match]=this[CapWithChild].exec(template)||[]
    if(match) return match;
    [match]=this[CapWithClose].exec(template)||[]
    return match
  }
  private formatProps() {
    for (const [key, value] of Object.entries(this.$options.props || {})) {
      this.formatProp(key, value as any);
    }
  }

  private formatProp(name: string, value: Exclude<Component.PropConfig, 'name'> | Component.TypeConstruct) {
    if (typeof value === 'function') {
      return this.$props.push({
        name,
        type: value,
        default: undefined,
      });
    }
    return this.$props.push({
      name,
      type:value.type,
      default:value.default
    })
  }

  parseProps(template:string){
    const result=Object.fromEntries(this.$props.map((prop)=>{
      const generateDefault=typeof prop.default==='function'?prop.default:()=>prop.default
      return [prop.name,generateDefault()]
    })) as P
    const matchedArr=[...template.matchAll(/([\w$:]+)\s*=\s*(['"])(.*?)\2/g)].filter(Boolean)
    if(!matchedArr.length) return result
    for(const [_,key,__,value] of matchedArr){
      Object.defineProperty(result,key,{
        value
      })
    }
    return result
  }
  parseChildren(template:string){
    if(this.isClosing(template)) return ''
    const matched = template.match(/<[^>]+>([^<]*?)<\/[^?]+>/);
    if(!matched) return ''
    return matched[1]
  }
  async render(template:string,context:Component.Context):Promise<string> {
    const props=this.parseProps(template)
    const data=this.$options.data?this.$options.data.apply(props):{} as D
    context.children=this.parseChildren(template)||context.children
    const result=await this.$options.render(props,{
      $slots:context.$slots||{},
      ...props,
      ...data,
      render:context.render,
      parent:context,
      children:context.children
    } as Component.Context<D & P>)
    context.$root=context.$root.replace(template,result)
    return context.render(context.$root,context)
  }
}

export namespace Component {
  export type TypeConstruct<T = any> = {
    new(): T
    readonly prototype: T;
  }
  export type PropConfig<T extends TypeConstruct = TypeConstruct> = {
    name: string
    type: T
    default: Prop<T>
  }

  export interface Options<T, D, P = Props<T>> {
    name: string;
    props?: T;
    data?: (this: P) => D;
    render: Render<P, D>;
  }

  export type Context<T = {}> = {
    $slots: Dict<Render<any, any>>
    $root:string
    parent:Context
    render(template:string,context:Context):Promise<string>
    children?:string
  } & T
  export type Render<P = {}, D = {}> = (props: P, context: Context<P & D>) => Promise<string> | string
  export type Props<T> = {
    [P in keyof T]: Prop<T[P]>
  }
  export type PropWithDefault<T> = {
    type: T
    default?: DefaultValue<T>
  }
  type DefaultValue<T> = T extends ObjectConstructor | ArrayConstructor ? () => Prop<T> : Prop<T>
  export type Prop<T> = T extends BooleanConstructor ? boolean :
    T extends StringConstructor ? string :
      T extends NumberConstructor ? number :
        T extends ArrayConstructor ? any[] :
          T extends ObjectConstructor ? Dict :
            T extends PropWithDefault<infer R> ? Prop<R> : unknown
  export const components: Map<string, Component> = new Map<string, Component>();

  export function define<P>(render: Render<P, {}>, name?: string): Component<{}, {}, P>
  export function define<T, D = {}, P = Props<T>>(options: Options<T, D>): Component<T, D, P>
  export function define<T = {}, D = {}, P = Props<T>>(options: Options<T, D, P> | Render<P, D>, name = options.name) {
    if (typeof options === 'function') options = {
      name,
      render: options,
    };
    const component=new Component(options)
    components.set(options.name,component as unknown as Component)
    return component;
  }
}
