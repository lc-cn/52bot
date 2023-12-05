import '@52bot/plugin-drawer'
import { Plugin } from '52bot';
import * as fs from 'fs';
import * as path from 'path';
import * as process from 'process';
const plugin=new Plugin('游戏库')
plugin.mounted(()=>{
  const drawer=plugin.createDrawer()
  drawer.rect(100,100).move(50,50)
  drawer.line(10,10,80,80)
  fs.writeFileSync(path.resolve(process.cwd(),'data','test.png'),drawer.render())
})
export default plugin

