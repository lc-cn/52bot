import {Adapter,loadYamlConfigOrCreate} from "52bot";
import {
  Bot,
  PrivateMessageEvent,
  GroupMessageEvent,
  GuildMessageEvent,
  DirectMessageEvent,
} from "qq-group-bot";
type QQMessageEvent=PrivateMessageEvent|GroupMessageEvent|GuildMessageEvent|DirectMessageEvent
type QQAdapterConfig=QQConfig[]
export type QQAdapter=typeof qq
const qq=new Adapter<Bot,QQMessageEvent>('qq')
type QQConfig={
  appid:string
  token:string
  secret:string
  private?:boolean
  group?:boolean
  removeAt?:boolean
  sandbox?:boolean
  timeout?:number
  public?:boolean
}
const initBot=()=>{
  const [configs,isCreate]=loadYamlConfigOrCreate<QQAdapterConfig>('qq.yaml',[
    {
      appid:'',
      token:'',
      secret:'',
      private:false,
      group:false,
      public:false
    }
  ])
  if(isCreate){
    qq.zhin!.logger.info('请先完善qq.yaml中的配置后继续')
    process.exit()
  }
  for(const {private:isPrivate,group,public:isPublic,...config} of configs){
    const botConfig:Bot.Config={
      logLevel:qq.zhin!.config.logLevel,
      ...config,
      intents:[
        group && 'GROUP_AT_MESSAGE_CREATE',
        isPrivate && 'C2C_MESSAGE_CREATE',
        'DIRECT_MESSAGE',
        !isPublic && 'GUILD_MESSAGES',
        'GUILDS',
        'GUILD_MEMBERS',
        'GUILD_MESSAGE_REACTIONS',
        'DIRECT_MESSAGE',
        'INTERACTION',
        isPublic && 'PUBLIC_GUILD_MESSAGES'
      ].filter(Boolean) as string[]
    }
    qq.bots.push(new Bot(botConfig))
  }
  qq.on('start',startBots)
  qq.on('stop',stopBots);
}
const messageHandler=(bot:Bot,message:QQMessageEvent)=>{
  message.raw_message=message.raw_message.trim()
  const commands=qq.zhin!.getSupportCommands(qq,bot,message)
  const matchReg=new RegExp(`^/(${commands.map(c=>c.name).join('|')})`)
  if(message.raw_message.match(matchReg)) message.raw_message=message.raw_message.slice(1)
  qq.zhin!.emit('message',qq,bot,message)
}
const startBots=()=>{
  for(const bot of qq.bots){
    bot.on('message',messageHandler.bind(global,bot))
    bot.start()
  }
}
const stopBots=()=>{
  for(const bot of qq.bots){
    bot.stop()
  }
}
qq.on('mounted',initBot)

export default qq
