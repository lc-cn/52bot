import { Adapter, Dict, loadYamlConfigOrCreate } from '52bot';
import '@52bot/plugin-http-server'
import { OneBotV11 } from '@/onebot';
import { GroupMessageEventV11, PrivateMessageEventV11 } from '@/message';
type MessageEvent=PrivateMessageEventV11|GroupMessageEventV11
export type OneBotV11Adapter=typeof oneBotV11
const oneBotV11=new Adapter<OneBotV11,MessageEvent>('OneBotV11')
export namespace OneBotV11Adapter{
  export type Config=OneBotV11.Config[]
}
const initBot=()=>{
  if(!oneBotV11.zhin?.server) throw new Error("“oneBot V11 miss require service “http”, maybe you need install “ @52bot/plugin-http-server ”")
  const [configs,isCreate]=loadYamlConfigOrCreate<OneBotV11Adapter.Config>('onebot-11.yaml',[
    {
      type:'ws',
      access_token:'',
      ...OneBotV11.defaultConfig['ws']
    },
    {
      type:'ws_reverse',
      access_token:'',
      ...OneBotV11.defaultConfig['ws_reverse']
    }
  ])
  if(isCreate){
    oneBotV11.zhin!.logger.info('请先完善onebot-11.yaml中的配置后继续')
    return process.exit()
  }
  for(const config of configs){
    oneBotV11.bots.push(new OneBotV11(oneBotV11,config,oneBotV11.zhin!.router))
  }
  oneBotV11.on('start',startBots)
  oneBotV11.on('stop',stopBots);
}
const messageHandler=(bot:OneBotV11,message:Dict)=>{
  switch (message.message_type){
    case 'private':
      message=new PrivateMessageEventV11(bot,message)
      break;
    case 'group':
      message=new GroupMessageEventV11(bot,message)
      break;
    default:
      return
  }
  oneBotV11.zhin!.emit('message',oneBotV11,bot,message)
}
const startBots=()=>{
  for(const bot of oneBotV11.bots){
    bot.on('message',messageHandler.bind(global,bot))
    bot.start()
  }
}
const stopBots=()=>{
  for(const bot of oneBotV11.bots){
    bot.stop()
  }
}
oneBotV11.on('mounted',initBot)

export default oneBotV11
