import { GetWsParam, SessionEvents, SessionRecord, WebsocketCloseReason } from '@/types/websocket-types';
import Session from '@/client/session/session';
import { EventEmitter } from 'ws';
import { BotLogger } from '@/utils/logger';
import {Bot} from "@";

const MAX_RETRY = 10;

export default class WebsocketClient extends EventEmitter {
  session!: Session;
  retry = 0;
  get config(){
    return this.bot.config as GetWsParam
  }
  constructor(public bot:Bot) {
    super();
    this.connect();

    this.on(SessionEvents.EVENT_WS, (data) => {
      switch (data.eventType) {
        case SessionEvents.RECONNECT:
          BotLogger.info('[CLIENT] 等待断线重连中...');
          break;
        case SessionEvents.DISCONNECT:
          if (this.retry < (this.config.maxRetry || MAX_RETRY)) {
            BotLogger.info('[CLIENT] 重新连接中，尝试次数：', this.retry + 1);
            this.connect( WebsocketCloseReason.find((v) => v.code === data.code)?.resume ? data.eventMsg : null);
            this.retry += 1;
          } else {
            BotLogger.info('[CLIENT] 超过重试次数，连接终止');
            this.emit(SessionEvents.DEAD, { eventType: SessionEvents.ERROR, msg: '连接已死亡，请检查网络或重启' });
          }
          break;
        case SessionEvents.READY:
          BotLogger.info('[CLIENT] 连接成功');
          this.retry = 0;
          break;
        default:
      }
    });
  }

  // 连接
  connect( sessionRecord?: SessionRecord) {
    const event = this;
    // 新建一个会话
    this.session = new Session(this, event, sessionRecord);
    return this.session;
  }

  // 断开连接
  disconnect() {
    // 关闭会话
    this.session.closeSession();
  }
}
