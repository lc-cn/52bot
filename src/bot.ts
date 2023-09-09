import {OpenAPI, v1Setup} from '@/openapi/v1/openapi';
import {Config, MessageEvent, Sendable} from '@/types';
import {SessionEvents} from '@/types';
import WebsocketClient from './client/client';
import {SessionManager} from "@/client/session/session-manager";
import {EventEmitter} from "ws";
import Message from "@/openapi/v1/message";
export class Bot extends EventEmitter {
    private api?: OpenAPI;
    private ws?: WebsocketClient;
    sessionManager?: SessionManager;

    constructor(public config: Config) {
        super()
        // 注册v1接口
        v1Setup();
    }
    private createMessage=MessageEvent.from.bind(this)
    async start() {
        this.sessionManager = new SessionManager(this);
        await this.sessionManager.init()
        this.api = new OpenAPI(this);
        this.ws = new WebsocketClient(this);
        this.ws.on("GROUP_AT_MESSAGE_CREATE", (eventData) => {
            console.log(eventData)
            this.emit('message.group', this.createMessage(eventData))
        })
        this.ws.on('C2C_MESSAGE_CREATE', (eventData) => {
            console.log(eventData)
            this.emit('message.private', this.createMessage(eventData))
        })
        return new Promise<void>(resolve => {
            this.ws.on(SessionEvents.READY, () => {
                resolve()
            })
        })
    }

    async sendGroupMessage(group_id: string, message: Sendable,source?:MessageEvent) {
        return this.api!.messageApi.postGroupMessage(group_id,Message.format(message,source))
    }

    async sendPrivateMsg(user_id: string, message: Sendable,source?:MessageEvent) {
        return this.api!.messageApi.postMessage(user_id,Message.format(message,source))
    }
}
