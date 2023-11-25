import {Adapter,loadYamlConfigOrCreate} from "52bot";
import {
  Client,
  PrivateMessageEvent,
  GroupMessageEvent,
  GuildMessageEvent,
  DiscussMessageEvent,
  Sendable,
  Config
} from "icqq";
import * as process from 'process';
type QQMessageEvent=PrivateMessageEvent|GroupMessageEvent|GuildMessageEvent|DiscussMessageEvent
type ICQQAdapterConfig=QQConfig[]
export type ICQQAdapter=typeof icqq
const icqq=new Adapter<Client,QQMessageEvent,Sendable>('icqq')
type QQConfig={
  uin:number
  password?:string
} & Config
let adapterConfig:ICQQAdapterConfig
const initBot=()=>{
  const [configs,isCreate]=loadYamlConfigOrCreate<ICQQAdapterConfig>('icqq.yaml',[
    {
      uin: 0,
      password:'',
      platform:2,
      data_dir:'data',
      sign_api_addr:''
    }
  ])
  if(isCreate){
    icqq.zhin!.logger.info('请先完善icqq.yaml中的配置后继续')
    process.exit()
  }
  adapterConfig=configs
  for(const {uin,password,...config} of configs){
    icqq.bots.push(new Client(uin,config))
  }
  icqq.on('start',startBots)
  icqq.on('stop',stopBots);
}
const messageHandler=(bot:Client,message:QQMessageEvent)=>{
  icqq.zhin!.emit('message',icqq,bot,message)
}
const botLogin=async (bot:Client)=>{
  return new Promise<void>(resolve => {
    bot.on('system.online',()=>{
      bot.on('message',messageHandler.bind(global,bot))
      resolve()
    })
    bot.on('system.login.device',(e)=>{
      icqq.zhin!.logger.mark('请选择设备验证方式：\n1.扫码验证\t其他.短信验证')
      process.stdin.once('data',(buf)=>{
        const input=buf.toString().trim()
        if(input==='1'){
          icqq.zhin!.logger.mark('请点击上方链接完成验证后回车继续')
          process.stdin.once('data',()=>{
            bot.login()
          })
        }else{
          bot.sendSmsCode()
          icqq.zhin!.logger.mark(`请输入手机号(${e.phone})收到的短信验证码：`)
          process.stdin.once('data',(buf)=>{
            bot.submitSmsCode(buf.toString().trim())
          })
        }
      })
    })
    bot.on('system.login.qrcode',()=>{
      icqq.zhin!.logger.mark('请扫描二维码后回车继续')
      process.stdin.once('data',()=>{
        bot.login()
      })
    })
    bot.on('system.login.slider',()=>{
      icqq.zhin!.logger.mark('请点击上方链接，完成滑块验证后，输入获取到的ticket后继续')
      process.stdin.once('data',(buf)=>{
        bot.login(buf.toString().trim())
      })
    })
    bot.on('system.login.error',(e)=>{
      resolve()
    })
    const password=adapterConfig.find(c=>c.uin===bot.uin)?.password
    bot.login(password)
  })
}
const startBots=async ()=>{
  for(const bot of icqq.bots){
    await botLogin(bot)
  }
}
const stopBots=()=>{
  for(const bot of icqq.bots){
    bot.terminate()
  }
}
icqq.on('mounted',initBot)

export default icqq
