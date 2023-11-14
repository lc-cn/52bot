import axios from "axios";
import { OpCode, QQBot } from "./bot";
import { WebSocket } from "ws";
import { toObject } from "./utils";
import { EventEmitter } from "events";

export const MAX_RETRY = 10;

export class SessionManager extends EventEmitter {
    public access_token: string;
    public wsUrl: string;
    retry: number = 0;
    alive?: boolean;
    heartbeatInterval: number;
    isReconnect: boolean;
    sessionRecord = {
        sessionID: "",
        seq: 0
    };
    heartbeatParam = {
        op: OpCode.HEARTBEAT,
        d: null // 心跳唯一值
    };

    get token() {
        return this.bot.config.token;
    }

    constructor(private bot: QQBot) {
        super();
        this.bot.on(SessionEvents.EVENT_WS, (data) => {
            switch (data.eventType) {
                case SessionEvents.RECONNECT:
                    this.bot.logger.debug("[CLIENT] 等待断线重连中...");
                    break;
                case SessionEvents.DISCONNECT:
                    if (this.retry < (this.bot.config.maxRetry || MAX_RETRY)) {
                        this.bot.logger.info("[CLIENT] 重新连接中，尝试次数：", this.retry + 1);
                        if (WebsocketCloseReason.find((v) => v.code === data.code)?.resume) {
                            this.sessionRecord = data.eventMsg;
                        }
                        this.start();
                        this.retry += 1;
                    } else {
                        this.bot.logger.info("[CLIENT] 超过重试次数，连接终止");
                        this.emit(SessionEvents.DEAD, {
                            eventType: SessionEvents.ERROR,
                            msg: "连接已死亡，请检查网络或重启"
                        });
                    }
                    break;
                case SessionEvents.READY:
                    this.bot.logger.info("[CLIENT] 连接成功");
                    this.retry = 0;
                    break;
                default:
            }
        });
    }

    async getAccessToken(): Promise<QQBot.Token> {
        const { appId } = this.bot;
        let { secret } = this.bot.config;
        const getToken = () => {
            return new Promise<QQBot.Token>((resolve, reject) => {
                axios.post("https://bots.qq.com/app/getAppAccessToken", {
                    appId,
                    clientSecret: secret
                }).then(res => {
                    if (res.status === 200 && res.data && typeof res.data === "object") {
                        resolve(res.data as QQBot.Token);
                    } else {
                        reject(res);
                    }
                });
            });
        };
        const getNext = async (next_time: number) => {
            return new Promise<QQBot.Token>(resolve => {
                setTimeout(async () => {
                    const token = await getToken();
                    this.bot.logger.debug("getAccessToken", token);
                    this.access_token = token.access_token;
                    getNext(token.expires_in - 1).catch(() => getNext(0));
                    resolve(token);
                }, next_time * 1000);
            });
        };
        return getNext(0);
    }

    async getWsUrl() {
        return new Promise<void>((resolve) => {
            this.bot.request.get("/gateway/bot", {
                headers: {
                    Accept: "*/*",
                    "Accept-Encoding": "utf-8",
                    "Accept-Language": "zh-CN,zh;q=0.8",
                    Connection: "keep-alive",
                    "User-Agent": "v1",
                    Authorization: ""
                }
            }).then(res => {
                if (!res.data) throw new Error("获取ws连接信息异常");
                this.wsUrl = res.data.url;
                resolve();
            });
        });
    }

    getValidIntends() {
        return (this.bot.config.intents || []).reduce((result, item) => {
            const value = Intends[item];
            if (value === undefined) {
                this.bot.logger.warn(`Invalid intends(${item}),continue...`);
                return result;
            }
            return Intends[item as keyof Intends] | result;
        }, 0);
    }

    async start() {
        await this.getAccessToken();
        await this.getWsUrl();
        this.connect();
        this.startListen();
    }

    connect() {
        this.bot.ws = new WebSocket(this.wsUrl, {
            headers: {
                "Authorization": "QQBot " + this.access_token,
                "X-Union-Appid": this.bot.appId
            }
        });
    }

    reconnectWs() {
        const reconnectParam = {
            op: OpCode.RESUME,
            d: {
                // token: `Bot ${this.bot.appId}${this.token}`,
                token: `QQBot ${this.access_token}`,
                session_id: this.sessionRecord.sessionID,
                seq: this.sessionRecord.seq
            }
        };
        this.sendWs(reconnectParam);
    }

    // 发送websocket
    sendWs(msg: unknown) {
        try {
            // 先将消息转为字符串
            this.bot.ws.send(typeof msg === "string" ? msg : JSON.stringify(msg));
        } catch (e) {
            this.bot.logger.error(e);
        }
    }

    authWs() {

        // 鉴权参数
        const authOp = {
            op: OpCode.IDENTIFY, // 鉴权参数
            d: {
                // token: `Bot ${this.bot.appId}${this.token}`,
                token: `QQBot ${this.access_token}`, // 根据配置转换token
                intents: this.getValidIntends(), // todo 接受的类型
                shard: [0, 1] // 分片信息,给一个默认值
            }
        };
        // 发送鉴权请求
        this.sendWs(authOp);
    }

    startListen() {
        this.bot.ws.on("open", () => {
            this.bot.logger.debug("ws连接成功");
        });
        this.bot.ws.on("message", (data) => {
            this.bot.logger.debug(`[CLIENT] 收到消息: ${data}`);
            // 先将消息解析
            const wsRes = toObject(data);
            // 先判断websocket连接是否成功
            if (wsRes?.op === OpCode.HELLO && wsRes?.d?.heartbeat_interval) {
                // websocket连接成功，拿到心跳周期
                this.heartbeatInterval = wsRes?.d?.heartbeat_interval;
                // 非断线重连时，需要鉴权
                this.isReconnect ? this.reconnectWs() : this.authWs();
                return;
            }

            // 鉴权通过
            if (wsRes.t === SessionEvents.READY) {
                this.bot.logger.debug(`[CLIENT] 鉴权通过`);
                const { d, s } = wsRes;
                const { session_id, user = {} } = d;
                this.bot.self_id = user.id;
                this.bot.nickname = user.username;
                this.bot.status = user.status;
                // 获取当前会话参数
                if (session_id && s) {
                    this.sessionRecord.sessionID = session_id;
                    this.sessionRecord.seq = s;
                    this.heartbeatParam.d = s;
                }
                this.bot.logger.info(`connect to ${user.username}(${user.id})`)
                this.emit(SessionEvents.READY, { eventType: SessionEvents.READY, msg: d || "" });
                // 第一次发送心跳
                this.bot.logger.debug(`[CLIENT] 发送第一次心跳`, this.heartbeatParam);
                this.sendWs(this.heartbeatParam);
                return;
            }
            // 心跳测试
            if (wsRes.op === OpCode.HEARTBEAT_ACK || wsRes.t === SessionEvents.RESUMED) {
                if (!this.alive) {
                    this.alive = true;
                    this.emit(SessionEvents.EVENT_WS, { eventType: SessionEvents.READY });
                }
                this.bot.logger.debug("[CLIENT] 心跳校验", this.heartbeatParam);
                setTimeout(() => {
                    this.sendWs(this.heartbeatParam);
                }, this.heartbeatInterval);
            }

            // 收到服务端重连的通知
            if (wsRes.op === OpCode.RECONNECT) {
                // 通知会话，当前已断线
                this.emit(SessionEvents.EVENT_WS, { eventType: SessionEvents.RECONNECT });
            }

            // 服务端主动推送的消息
            if (wsRes.op === OpCode.DISPATCH) {
                // 更新心跳唯一值
                const { s } = wsRes;
                if (s) this.sessionRecord.seq = this.heartbeatParam.d = s;
                // OpenAPI事件分发
                this.bot.dispatchEvent(wsRes.t, wsRes);
            }
        });
    }
}

export const SessionEvents = {
    CLOSED: "CLOSED",
    READY: "READY", // 已经可以通信
    ERROR: "ERROR", // 会话错误
    INVALID_SESSION: "INVALID_SESSION",
    RECONNECT: "RECONNECT", // 服务端通知重新连接
    DISCONNECT: "DISCONNECT", // 断线
    EVENT_WS: "EVENT_WS", // 内部通信
    RESUMED: "RESUMED", // 重连
    DEAD: "DEAD" // 连接已死亡，请检查网络或重启
};
// websocket错误原因
export const WebsocketCloseReason = [
    {
        code: 4001,
        reason: "无效的opcode"
    },
    {
        code: 4002,
        reason: "无效的payload"
    },
    {
        code: 4007,
        reason: "seq错误"
    },
    {
        code: 4008,
        reason: "发送 payload 过快，请重新连接，并遵守连接后返回的频控信息",
        resume: true
    },
    {
        code: 4009,
        reason: "连接过期，请重连",
        resume: true
    },
    {
        code: 4010,
        reason: "无效的shard"
    },
    {
        code: 4011,
        reason: "连接需要处理的guild过多，请进行合理分片"
    },
    {
        code: 4012,
        reason: "无效的version"
    },
    {
        code: 4013,
        reason: "无效的intent"
    },
    {
        code: 4014,
        reason: "intent无权限"
    },
    {
        code: 4900,
        reason: "内部错误，请重连"
    },
    {
        code: 4914,
        reason: "机器人已下架,只允许连接沙箱环境,请断开连接,检验当前连接环境"
    },
    {
        code: 4915,
        reason: "机器人已封禁,不允许连接,请断开连接,申请解封后再连接"
    }
];

export enum Intends {
    GUILDS = 1 << 0,
    GUILD_MEMBERS = 1 << 1,
    GUILD_MESSAGES = 1 << 9,
    GUILD_MESSAGE_REACTIONS = 1 << 10,
    DIRECT_MESSAGE = 1 << 12,
    OPEN_FORUMS_EVENTS = 1 << 18,
    AUDIO_OR_LIVE_CHANNEL_MEMBERS = 1 << 19,
    GROUP_MESSAGE_CREATE = 1 << 24,
    C2C_MESSAGE_CREATE = 1 << 25,
    GROUP_AT_MESSAGE_CREATE = 1 << 25,
    INTERACTION_CREATE = 1 << 26,
    MESSAGE_AUDITION_CREATE = 1 << 27,
    FORUMS_EVENTS = 1 << 28,
    AUDIO_ACTIONS = 1 << 29,
    PUBLIC_GUILD_MESSAGES = 1 << 30,
}
