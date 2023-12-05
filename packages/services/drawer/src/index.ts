import {Plugin} from '52bot';
import { Drawer } from '@/drawer';
import { ResvgRenderOptions } from '@resvg/resvg-js';
declare module '52bot'{
  namespace App{
    interface Services{
      createDrawer:(options?:ResvgRenderOptions)=>Drawer
    }
  }
}
const plugin=new Plugin('绘图工具')
plugin.service('createDrawer',(options)=>{
  return new Drawer(options)
})
export default plugin

