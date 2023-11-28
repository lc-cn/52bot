import {Plugin} from '52bot';
import { JsonDB } from '@/db';
import * as path from 'path';
import * as process from 'process';
declare module '52bot'{
  namespace App{
    interface Services{
      jsondb:JsonDB
    }
  }
}
const db=new Plugin('JsonDB')
const configPath=path.resolve(process.cwd(),'data',process.env.jsondb||='52bot.jsondb')
db.service('jsondb',new JsonDB(configPath))
export default db
