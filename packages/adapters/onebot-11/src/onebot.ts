import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket, MessageEvent, VerifyClientCallbackAsync } from 'ws';
import { MessageV11 } from '@/message';
import { OneBotMethodsV11 } from '@/types';
import { Router } from '@52bot/plugin-http-server';
import { OneBotV11Adapter } from '@/index';
import { Dict } from '52bot';

export class OneBotV11 extends EventEmitter {
  constructor(
    private adapter: OneBotV11Adapter,
    public config: OneBotV11.Config,
    private router: Router,
  ) {
    super();
    this.dispatch = this.dispatch.bind(this);
  }
  get app(){
    return this.adapter.app
  }
  reTryCount = 0;
  ws?: WebSocket;
  wss: Map<string, WebSocketServer> = new Map<string, WebSocketServer>();

  async start() {
    switch (this.config.type) {
      case 'ws':
        return this.connectWs(this.config as OneBotV11.Config<'ws'>);
      case 'ws_reverse':
        return this.startWsServer(this.config as OneBotV11.Config<'ws_reverse'>);
    }
  }

  private dispatch(message: MessageEvent) {
    const result: OneBotV11.EventPayload | OneBotV11.ApiResult = JSON.parse(message?.toString() || 'null');
    if (!result) return;
    if (result.retcode !== undefined && result.echo) return this.emit('echo', result.echo, result.data);
    const event: OneBotV11.EventPayload = result as OneBotV11.EventPayload;
    this.adapter.logger.debug('receive event', event);
    if(event.post_type==='message'){
      this.adapter.logger.info(`recv [${event.message_type} ${event.group_id||event.user_id}]: ${event.raw_message}`)
    }
    this.emit(event.post_type, event);
  }

  private startWsServer(cfg: OneBotV11.Config<'ws_reverse'>) {
    const config: Dict<string> = {
      path: `${cfg.prefix || '/onebot/v11'}`,
      api_path: `${cfg.prefix || '/onebot/v11'}/api`,
      event_path: `${cfg.prefix || '/onebot/v11'}/event`,
    };
    Object.entries(config).map(([key, path]) => {
      const server = this.router.ws(path, {
        verifyClient: (...args: Parameters<VerifyClientCallbackAsync>) => {
          const {
            req: { headers },
          } = args[0];
          const authorization = headers['authorization'] || '';
          if (this.config.access_token && authorization !== `Bearer ${this.config.access_token}`) {
            this.adapter.logger.error('鉴权失败');
            return false;
          }
          return true;
        },
      });
      if (['path', 'event_path'].includes(path))
        server.on('connection', (ws, req) => {
          this.adapter.logger.mark('new connect from: ', req.socket.remoteAddress);
          ws.on('message', this.dispatch);
        });
      this.adapter.logger.mark(`ws server is start at route path: ${path}`);
      this.wss.set(key, server);
    });
  }

  private connectWs(cfg: OneBotV11.Config<'ws'>) {
    const config: Required<OneBotV11.ConfigMap['ws']> = {
      url: cfg.url || 'ws://127.0.0.1:6700',
      max_reconnect_count: (cfg.max_reconnect_count ||= 10),
      reconnect_interval: (cfg.reconnect_interval ||= 3000),
    };
    this.ws = new WebSocket(config.url, {
      headers: {
        Authorization: `Bearer ${cfg.access_token}`,
      },
    });
    this.ws.on('open', () => {
      this.adapter.logger.mark(`connected to ${config.url}`);
      this.reTryCount = 0;
    });
    this.ws.on('message', this.dispatch);
    this.ws.on('error', e => {
      this.adapter.logger.error(e?.message);
    });
    this.ws.on('close', () => {
      if (this.reTryCount < config.max_reconnect_count) {
        this.adapter.logger.mark(`reconnect after ${config.reconnect_interval} ms`);
        setTimeout(() => {
          this.reTryCount++;
          this.connectWs(cfg);
        }, config.reconnect_interval);
      } else {
        this.adapter.logger.mark(`retry times is exceeded of ${config.max_reconnect_count}`);
      }
    });
  }

  async stop() {
    this.ws?.close();
    for (const [_, server] of this.wss) {
      server.close();
    }
  }

  sendPayload<T extends keyof OneBotMethodsV11>(payload: {
    action: T;
    params: Parameters<OneBotMethodsV11[T]>[0];
    echo?: number | string;
  }): Promise<ReturnType<OneBotMethodsV11[T]>> {
    return new Promise<ReturnType<OneBotMethodsV11[T]>>((resolve, reject) => {
      payload.echo = payload.echo || Date.now();
      const timer = setTimeout(
        () => {
          this.off('echo', receiveHandler);
          reject('timeout');
        },
        this.config.timeout || 1000 * 30,
      );
      const receiveHandler = (resultEcho: string | number, result: Dict) => {
        if (resultEcho === payload.echo) {
          clearTimeout(timer);
          this.off('echo', receiveHandler);
          resolve(result as any);
        }
      };
      this.on('echo', receiveHandler);
      this.adapter.logger.debug('send payload', payload);
      if (this.config.type === 'ws') return this.ws!.send(JSON.stringify(payload));
      for (const [name, server] of this.wss) {
        if (name === 'event_path') continue;
        for (const ws of server.clients) {
          ws.send(JSON.stringify(payload));
        }
      }
    });
  }

  async sendPrivateMsg(user_id: number, message: MessageV11.Sendable,message_id?:string) {
    this.adapter.logger.info(`send [Private ${user_id}]: ${this.getBrief(message)}`)
    const result=await this.sendPayload({
      action: 'send_private_msg',
      params: { user_id, message,message_id },
    });
    if(!result.message_id) return this.adapter.logger.error(`send failed:`,result)
    return result.message_id
  }
  getGroupList() {
    return this.sendPayload({
      action: 'get_group_list',
      params: {},
    });
  }
  getGroupInfo(group_id: number) {
    return this.sendPayload({
      action: 'get_group_info',
      params: { group_id },
    });
  }
  getFriendList() {
    return this.sendPayload({
      action: 'get_friend_list',
      params: {},
    });
  }
  getStrangerInfo(user_id: number) {
    return this.sendPayload({
      action: 'get_stranger_info',
      params: { user_id },
    });
  }
  getGroupMemberList(group_id: number) {
    return this.sendPayload({
      action: 'get_group_member_list',
      params: { group_id },
    });
  }
  getGroupMemberInfo(group_id: number, user_id: number) {
    return this.sendPayload({
      action: 'get_group_member_info',
      params: {
        group_id,
        user_id,
      },
    });
  }
  setGroupKick(group_id: number, user_id: number, reject_add_request?: boolean) {
    return this.sendPayload({
      action: 'set_group_kick',
      params: {
        group_id,
        user_id,
        reject_add_request,
      },
    });
  }
  async sendGroupMsg(group_id: number, message: MessageV11.Sendable,message_id?:string) {
    this.adapter.logger.info(`send [Group ${group_id}]: ${this.getBrief(message)}`)
    const result=await this.sendPayload({
      action: 'send_group_msg',
      params: { group_id, message,message_id },
    });
    if(!result.message_id) return this.adapter.logger.error(`send failed:`,result)
    return result.message_id
  }
  getBrief(message:MessageV11.Sendable):string{
    if(typeof message ==='string'){
      return message
    }
    if(Array.isArray(message)){
      return message.map(m=>this.getBrief(m)).join('')
    }
    if(message.type==='text'){
      return message.data.text
    }
    return `{${message.type},${Object.keys(message.data).join(',')}}`
  }
}

export namespace OneBotV11 {
  type WsConfig = {
    url?: string;
    max_reconnect_count?: number;
    reconnect_interval?: number;
  };
  export type ApiResult = {
    status: 'ok' | 'failed';
    retcode: 1400 | 1401 | 1403 | 1404;
    data: any;
    echo?: string | number;
  };
  export type EventPayload = {
    time: number;
    self_id: number;
    post_type: 'message' | 'notice' | 'request' | 'meta_event';
  } & Dict;
  type WsReverseConfig = {
    prefix?: string;
  };

  export interface ConfigMap {
    ws?: WsConfig;
    ws_reverse?: WsReverseConfig;
  }

  export type Config<T extends keyof ConfigMap = keyof ConfigMap> = {
    type: T;
    access_token?: string;
    timeout?: number;
  } & ConfigMap[T];
  export const defaultConfig = {
    ws: {
      host: '0.0.0.0',
      port: 6700,
      max_reconnect_count: 10,
      reconnect_interval: 3000,
    },
    ws_reverse: {
      prefix: '/onebot/v11',
    },
  };
}
