import { Adapter, loadYamlConfigOrCreate, Message, yaml } from '52bot';
import { Bot,GuildMessageEvent,DirectMessageEvent,Sendable } from 'ts-disc-bot';
import { formatSendable, sendableToString } from '@/utils';
const discordAdapter=new Adapter<Adapter.Bot<Bot>>('discord')
discordAdapter.define('sendMsg',async (bot_id,target_id,target_type,message,source)=>{
  const bot=discordAdapter.pick(bot_id)
  let msg:Sendable=await discordAdapter.app!.renderMessage(message as string,source)
  msg = formatSendable(msg);
  switch (target_type){
    case 'guild':
      return bot.sendGuildMessage(target_id,msg)
    case 'direct':
      return bot.sendDirectMessage(target_id,msg)
    default:
      throw new Error(`Discord适配器暂不支持发送${target_type}类型的消息`)
  }
})
type DingTalkMessageEvent=GuildMessageEvent|DirectMessageEvent

const initBot = () => {
  const [configs, isCreate] = loadYamlConfigOrCreate<Bot.Options[]>('discord.yaml',
    yaml.stringify([
      {
        clientId:'',
        clientSecret:'',
        reconnect_interval:3000,
        max_reconnect_count:10,
        heartbeat_interval:3000,
        request_timeout:5000,
        sandbox:true,
      }
    ])
  );
  if (isCreate) {
    discordAdapter.app!.logger.info('请先完善discord.yaml中的配置后继续');
    process.exit();
  }
  for (const config of configs) {
    const bot=new Bot(config)
    Object.defineProperty(bot,'unique_id',{
      get(){
        return bot.self_id
      }
    })
    discordAdapter.bots.push(bot as Adapter.Bot<Bot>);
  }
  discordAdapter.on('start', startBots);
  discordAdapter.on('stop', stopBots);
};
const messageHandler = (bot: Adapter.Bot<Bot>, event: DingTalkMessageEvent) => {
  const message=Message.fromEvent(discordAdapter,bot,event)
  message.raw_message = sendableToString(event.message).trim();
  message.from_id=event instanceof DirectMessageEvent?event.user_id:event.channel_id
  message.sender=event.sender as any
  const commands = discordAdapter.app!.getSupportCommands(discordAdapter, bot, message);
  const matchReg = new RegExp(`^/(${commands.map(c => c.name).join('|')})`);
  if (message.raw_message.match(matchReg)) message.raw_message = message.raw_message.slice(1);
  discordAdapter.app!.emit('message', discordAdapter, bot, message);
};
const startBots = () => {
  for (const bot of discordAdapter.bots) {
    bot.on('message', messageHandler.bind(global, bot));
    bot.start();
  }
};
const stopBots = () => {
  for (const bot of discordAdapter.bots) {
    bot.stop();
  }
};
discordAdapter.on('mounted', initBot);
export default discordAdapter
