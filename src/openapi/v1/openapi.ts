import { register } from '@/openapi/openapi';
import resty, { RequestOptions, RestyResponse } from 'resty-client';
import Message from './message';
import { addUserAgent, addAuthorization, buildUrl } from '@/utils/utils';
import {
  IOpenAPI,
} from '@/types';
import {Bot} from "@";
export const apiVersion = 'v1';
export class OpenAPI implements IOpenAPI {
  static newClient(bot:Bot) {
    return new OpenAPI(bot);
  }

  public messageApi!: Message;
  get config(){
    return this.bot.config
  }
  constructor(private bot:Bot) {
    this.register(this);
  }

  public register(client: IOpenAPI) {
    // 注册聚合client
    client.messageApi = new Message(this.request.bind(this));
  }
  // 基础rest请求
  public async request<T extends Record<any, any> = any>(options: RequestOptions): Promise<RestyResponse<T>> {
    const { appID } = this.config;
    options.headers = { ...options.headers };

    // 添加 UA
    addUserAgent(options.headers as any);
    // 添加鉴权信息
    addAuthorization(options.headers as any, appID, this.bot.sessionManager.access_token);
    // 组装完整Url
    const botUrl = buildUrl(options.url, this.config.sandbox);

    // 简化错误信息，后续可考虑通过中间件形式暴露给用户自行处理
    resty.useRes(
      (result) => result,
      (error) => {
        let traceid = error?.response?.headers?.['x-tps-trace-id'];
        if (error?.response?.data) {
          return Promise.reject({
            ...error.response.data,
            traceid,
          });
        }
        if (error?.response) {
          return Promise.reject({
            ...error.response,
            traceid,
          });
        }
        return Promise.reject(error);
      },
    );

    const client = resty.create(options);
    return client.request<T>(botUrl!, options);
  }
}

export function v1Setup() {
  register(apiVersion, OpenAPI);
}
