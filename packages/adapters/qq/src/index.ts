import { Adapter, loadYamlConfigOrCreate, Message } from '52bot';
import { sendableToString, formatSendable } from './utils';
import {
  Bot,
  PrivateMessageEvent,
  GroupMessageEvent,
  GuildMessageEvent,
  DirectMessageEvent,
  Sendable, Quotable,
} from 'qq-group-bot';
import * as fs from 'fs';
import * as path from 'path';
type QQMessageEvent = PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent | DirectMessageEvent;
type QQAdapterConfig = QQConfig[];
export type QQAdapter = typeof qq;
const qq = new Adapter<Adapter.Bot<Bot>, QQMessageEvent>('qq');
qq.define('sendMsg',async (bot_id,target_id,target_type,message,source)=>{
  const bot=qq.pick(bot_id)
  let msg:Sendable=await qq.app!.renderMessage(message as string,source)
  msg = formatSendable(msg);
  const quote:Quotable|undefined=source?source.original:undefined
  switch (target_type){
    case 'group':
      return bot.sendGroupMessage(target_id,msg,quote)
    case 'private':
      return bot.sendPrivateMessage(target_id,msg,quote)
    case 'direct':
      return bot.sendDirectMessage(target_id,msg,quote)
    case 'guild':
      return bot.sendGuildMessage(target_id,msg,quote)
    default:
      throw new Error(`QQ适配器暂不支持发送${target_type}类型的消息`)
  }
})
type QQConfig = {
  appid: string;
  token: string;
  secret: string;
  private?: boolean;
  group?: boolean;
  removeAt?: boolean;
  sandbox?: boolean;
  timeout?: number;
  public?: boolean;
};
const initBot = () => {
  const [configs, isCreate] = loadYamlConfigOrCreate<QQAdapterConfig>('qq.yaml',
    fs.readFileSync(path.join(__dirname,'qq-default.yaml'),'utf8')
  );
  if (isCreate) {
    qq.app!.logger.info('请先完善qq.yaml中的配置后继续');
    process.exit();
  }
  for (const { private: isPrivate, group, public: isPublic, ...config } of configs) {
    const botConfig: Bot.Config = {
      logLevel: qq.app!.config.logLevel,
      ...config,
      intents: [
        group && 'GROUP_AT_MESSAGE_CREATE',
        isPrivate && 'C2C_MESSAGE_CREATE',
        'DIRECT_MESSAGE',
        !isPublic && 'GUILD_MESSAGES',
        'GUILDS',
        'GUILD_MEMBERS',
        'GUILD_MESSAGE_REACTIONS',
        'DIRECT_MESSAGE',
        'INTERACTION',
        isPublic && 'PUBLIC_GUILD_MESSAGES',
      ].filter(Boolean) as string[],
    };
    const bot=new Bot(botConfig)
    Object.defineProperty(bot,'unique_id',{
      value: config.appid,
      writable: false,
    })
    qq.bots.push(bot as Adapter.Bot<Bot>);
  }
  qq.on('start', startBots);
  qq.on('stop', stopBots);
};
const messageHandler = (bot: Adapter.Bot<Bot>, event: QQMessageEvent) => {
  const message=Message.fromEvent(qq,bot,event)
  message.raw_message = sendableToString(event.message).trim();
  message.message_type=event.message_type
  message.sender=event.sender as any
  switch (event.message_type){
    case 'direct':
      Object.defineProperty(message,'from_id',{
        value:event.guild_id,
        writable: false,
      })
      break;
      case 'private':
        Object.defineProperty(message,'from_id',{
          value:event.user_id,
          writable: false,
        })
        break;
    case 'group':
      Object.defineProperty(message,'from_id',{
        value:event.group_id,
        writable: false,
      })
      break;
    case 'guild':
      Object.defineProperty(message,'from_id',{
        value:event.channel_id,
        writable: false,
      })
      break;
  }
  const commands = qq.app!.getSupportCommands(qq, bot, message);
  const matchReg = new RegExp(`^/(${commands.map(c => c.name).join('|')})`);
  if (message.raw_message.match(matchReg)) message.raw_message = message.raw_message.slice(1);
  qq.app!.emit('message', qq, bot, message);
};
const startBots = () => {
  for (const bot of qq.bots) {
    bot.on('message', messageHandler.bind(global, bot));
    bot.start();
  }
};
const stopBots = () => {
  for (const bot of qq.bots) {
    bot.stop();
  }
};
qq.on('mounted', initBot);

export default qq;
