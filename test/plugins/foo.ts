import {useCommand} from '52bot';
import { ICQQAdapter } from '@52bot/icqq';
export const name='我不是'
useCommand('foo')
.action<ICQQAdapter>(({bot})=>{
  return 'bar'
})
useCommand('bar')
  .action(()=>{
    return '我不知道该说啥了'
  })
