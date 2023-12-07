import { Adapter, loadYamlConfigOrCreate } from '52bot';
import { sendableToString, formatSendable } from './utils';
import {
  Bot,
  PrivateMessageEvent,
  GroupMessageEvent,
  GuildMessageEvent,
  DirectMessageEvent,
  Sendable,
} from 'qq-group-bot';
import * as fs from 'fs';
import * as path from 'path';
type QQMessageEvent = PrivateMessageEvent | GroupMessageEvent | GuildMessageEvent | DirectMessageEvent;
type QQAdapterConfig = QQConfig[];
export type QQAdapter = typeof qq;
const qq = new Adapter<Bot, QQMessageEvent>('qq');
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
    qq.bots.push(new Bot(botConfig));
  }
  qq.on('start', startBots);
  qq.on('stop', stopBots);
};
const messageHandler = (bot: Bot, message: QQMessageEvent) => {
  message.raw_message = sendableToString(message.message).trim();
  const commands = qq.app!.getSupportCommands(qq, bot, message);
  const matchReg = new RegExp(`^/(${commands.map(c => c.name).join('|')})`);
  if (message.raw_message.match(matchReg)) message.raw_message = message.raw_message.slice(1);
  const oldReply = message.reply;
  message.reply = async function (message: Sendable) {
    message=await qq.app!.renderMessage(message as string,this as any)
    message = formatSendable(message);
    return oldReply.call(this, message);
  };
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
