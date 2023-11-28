import * as fs from 'fs'
import * as path from 'path'
import { Dict } from '52bot';
export class JsonDB{
  private data:Dict={}
  constructor(private readonly filePath:string) {
    const dir=path.dirname(this.filePath)
    if(fs.existsSync(dir)) fs.mkdirSync(dir,{recursive:true})
    if(!this.filePath.endsWith('.jsondb')) this.filePath=this.filePath+'.jsondb'
    if(!fs.existsSync(this.filePath)) fs.writeFileSync(
      this.filePath, JSON.stringify(this.data), 'binary'
    )
    this.init()
  }
  private init(){
    this.read()
  }
  private write(){
    fs.writeFileSync(
      this.filePath,
      Buffer.from(JSON.stringify(this.data)),
      'binary'
    )
  }
  private read(){
    this.data=JSON.parse(fs.readFileSync(this.filePath,'binary'))
  }
  findOne<T>(route:string,callback:(item:T)=>boolean):T|undefined{
    const list=this.getData<T[]>(route,[])
    if(!Array.isArray(list)) throw new TypeError(`data with ${route} is not array`)
    return list.find(callback)
  }
  findAll<T>(route:string,callback:(item:T)=>boolean):T[]{
    const list=this.getData<T[]>(route,[])
    if(!Array.isArray(list)) throw new TypeError(`data with ${route} is not array`)
    return list.find(callback)
  }
  getData<T>(route:string,initialValue?:T){
    const parentPath=route.split('.')
    const key=parentPath.pop()
    if(!key) return this.data
    let temp:Dict=this.data
    while (parentPath.length){
      const currentKey=parentPath.shift() as string
      temp=temp[currentKey]||={}
    }
    if(!temp[key]!==undefined) return temp[key]
    temp[key]=initialValue
    this.write()
    return initialValue
  }
  setData<T>(route:string,data:T):T{
    const parentPath=route.split('.')
    const key=parentPath.pop()
    if(!key) throw new Error(`route can't empty`)
    const parentObj=this.getData<Dict>(parentPath.join('.'),{})
    parentObj[key]=data
    this.write()
    return data
  }
}
