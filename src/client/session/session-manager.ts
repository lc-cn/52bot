// 暂时用不到session manager
import {Bot} from "@";
import axios from "axios";
import type {AxiosResponse} from "axios";
import {Session} from "@/client/session/session";

export class SessionManager{
    private timer?:NodeJS.Timeout
    constructor(private bot:Bot) {
    }
    private token:Session.Token={
        access_token:'',
        expires_in:0,
        cache:'false'
    }
    get access_token(){
        return this.token.access_token
    }
    async init(){
        if(!this.bot.config.appID) throw new Error('appID is required')
        await this.getToken()
    }
    async getToken(){
        let {appID,token,request_token_url}=this.bot.config
        let withSecret=!!token
        if(!request_token_url && !token) throw new Error('request_token_url or token is required')
        if(!request_token_url && token) request_token_url='https://bots.qq.com/app/getAppAccessToken'
        const getToken=()=>{
            return new Promise<Session.Token>(async (resolve,reject)=>{
                const res= await axios.post<any,AxiosResponse<Record<string, any>>>(request_token_url,{
                    appId:appID,
                    clientSecret:withSecret?token:undefined
                })
                if(res.status===200 && res.data && typeof res.data==='object'){
                    resolve(res.data as Session.Token)
                }else{
                    reject(res)
                }
            })
        }
        const next=(next_time:number)=>{
            this.timer= setTimeout(async ()=>{
                this.token=await getToken()
                next(this.token.expires_in)
            },next_time*1000)
        }
        this.token=await getToken()
        next(0)
    }
}
