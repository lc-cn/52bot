import {Plugin} from '52bot';
import { Component } from '@/component';
declare module '52bot'{
  namespace App{
    interface Services {
      defineComponent:typeof Component.define
      components:typeof Component.components
    }
  }
}
const sandbox=new Plugin('沙箱环境')
sandbox.service('components',Component.components)
sandbox.service('defineComponent',Component.define)
const disposeArr:Function[]=[]
sandbox.mounted(()=>{
  const dispose=sandbox.app!.registerRender(async (template,message,)=>{
    console.log('msg',message)
    return template
  })
  disposeArr.push(dispose)
})
sandbox.defineComponent({
  name:'test',
  props:{
    age:Number,
    name:String
  },
  render(){
    console.log(this.name,this.age)
    return ''
  }
})
sandbox.beforeMount(()=>{
  while (disposeArr.length){
    disposeArr.shift()?.()
  }
})
export default sandbox
