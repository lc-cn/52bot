import {Plugin} from '52bot';
import { createServer, Server } from 'http';
import Koa from 'koa'
import KoaBodyParser from "koa-bodyparser";
import {Router} from '@/router';
import * as process from 'process';
export * from './router'
declare module '52bot'{
  namespace App{
    interface Services{
      koa:Koa
      router:Router
      server:Server
    }
  }
}
const koa = new Koa();
const server = createServer(koa.callback());
const router = new Router(server, { prefix: process.env.routerPrefix||'' });
const httpServer=new Plugin('http-server')
httpServer.service("server", server)
  .service("koa", koa)
  .service("router", router)
koa.use(KoaBodyParser()).use(router.routes()).use(router.allowedMethods());
server.listen((Number(process.env.port ||= '8086')),()=>{
  const address=server.address()
  if(!address) return
  httpServer.app?.logger.mark('server start at',address)
});
httpServer.on('plugin-beforeUnmount',()=>{
  server.close()
})
export default httpServer
