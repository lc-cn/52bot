import { SessionEvents, SessionRecord, WsObjRequestOptions } from '@/types/websocket-types';
import { Ws } from '@/client/websocket/websocket';
import { EventEmitter } from 'ws';
import resty from 'resty-client';
import { addAuthorization } from '@/utils/utils';
import { BotLogger } from '@/utils/logger';
import WebsocketClient from "@/client/client";

export default class Session {
  heartbeatInterval!: number;
  ws!: Ws;
  event!: EventEmitter;
  sessionRecord: SessionRecord | undefined;
  get config(){
    return this.client.config
  }
  get bot(){
    return this.client.bot
  }
  constructor(public client:WebsocketClient, event: EventEmitter, sessionRecord?: SessionRecord) {
    this.event = event;
    // 如果会话记录存在的话，继续透传
    if (sessionRecord) {
      this.sessionRecord = sessionRecord;
    }
    this.createSession();
  }

  // 新建会话
  async createSession() {
    this.ws = new Ws(this.config, this.event, this.sessionRecord || undefined);
    // 拿到 ws地址等信息
    const reqOptions = WsObjRequestOptions(this.config.sandbox as boolean);
    addAuthorization(reqOptions.headers as any, this.config.appID, this.bot.sessionManager.access_token);

    resty
      .create(reqOptions)
      .get(reqOptions.url as string, {})
      .then((r) => {
        const wsData = r.data;
        if (!wsData) throw new Error('获取ws连接信息异常');
        this.ws.createWebsocket(wsData,this.bot.sessionManager.access_token);
      })
      .catch((e) => {
        BotLogger.info('[ERROR] createSession: ', e);
        this.event.emit(SessionEvents.EVENT_WS, {
          eventType: SessionEvents.DISCONNECT,
          eventMsg: this.sessionRecord,
        });
      });
  }

  // 关闭会话
  closeSession() {
    this.ws.closeWs();
  }
}
export namespace Session{
  export interface Token{
    access_token:string
    expires_in:number
    cache:string
  }
}
