import {Plugin} from '52bot'
import { UpYun } from '@/upYun';
import * as process from 'process';
declare module '52bot'{
  namespace App{
    interface Services{
      upyun:UpYun
    }
  }
}
const plugin=new Plugin('又拍云数据存储服务')
plugin.service('upyun',new UpYun({
  bucket:process.env.UPBUCKET!,
  operator:process.env.UPOPERATOR!,
  password:process.env.UPPASSWORD!,
  domain:process.env.UPDOMAIN
}))
export default plugin
