import { RequestOptions, RestyResponse } from 'resty-client';
import {AvailableIntentsEventsEnum, MessageAPI} from '@/types';

export type OpenAPIRequest = <T extends Record<any, any> = any>(options: RequestOptions) => Promise<RestyResponse<T>>;

export interface Config {
  appID: string;
  token?: string;
  request_token_url?:string
  intents?:AvailableIntentsEventsEnum[]
  sandbox?: boolean;
}

export interface IOpenAPI {
  config: Config;
  request: OpenAPIRequest;
  messageApi: MessageAPI;
}

export type APIVersion = `v${number}`;

export interface Token {
  appID: number;
  accessToken: string;
  type: string;
}

// WebsocketAPI websocket 接入地址
export interface WebsocketAPI {
  ws: () => any;
}

export * from './v1/message';
