import * as path from "path";
import * as fs from "fs";
import {Plugin} from "@/plugin";
import YAML from "yaml";


export function isEmpty<T>(data: T) {
    if (!data) return true;
    if (typeof data !== "object") return false
    return Reflect.ownKeys(data).length === 0;
}

export function remove<T>(list: T[], item: T) {
    const index = list.indexOf(item);
    if (index !== -1) list.splice(index, 1);
}

export function deepClone<T extends object>(obj: T) {
    if (typeof obj !== "object") return obj
    if (Array.isArray(obj)) return obj.map(deepClone)
    const Constructor = obj.constructor;

    let newObj: T = Constructor()
    for (let key in obj) {
        newObj[key] = deepClone(obj[key as any])
    }
    return newObj;

}

/**
 * 寻找数组中最后一个符合条件的元素下标
 * @param list 数组
 * @param predicate 条件
 * @returns {number} 元素下标，未找到返回-1
 */
export function findLastIndex<T>(list: T[], predicate: (item: T, index: number) => boolean) {
    for (let i = list.length - 1; i >= 0; i--) {
        if (predicate(list[i], i)) return i;
    }
    return -1;
}

export function trimQuote(str: string) {
    const quotes: string[][] = [
        [
            '"',
            '"',
        ],
        [
            "'",
            "'",
        ],
        [
            '`',
            '`',
        ],
        [
            '“',
            '”',
        ],
        [
            '‘',
            '’',
        ]
    ]
    for (let i = 0; i < quotes.length; i++) {
        const [start, end] = quotes[i];
        if (str.startsWith(start) && str.endsWith(end)) {
            return str.slice(1, -1);
        }
    }
    return str;
}

export function loadPlugin(name: string):Plugin {
    const maybePath = [
        path.resolve(__dirname, 'plugins', name),
        path.resolve(process.cwd(), 'plugins', name),
        `@qqbot/plugin-${name}`,
        `qqbot-plugin-${name}`,
        name
    ]
    for (const path of maybePath) {
        try{
            const result=require('jiti')(__filename)(path)
            if(result.default) {
                const {default:plugin,...other}=result
                Object.assign(plugin,other)
                return plugin
            }
            return result
        }catch (e){
            console.log(e.message)
        }
    }
    throw new Error(`加载插件(${name}) 失败`);
}

export function getCallerStack(){
    const origPrepareStackTrace = Error.prepareStackTrace
    Error.prepareStackTrace = function (_, stack) {
        return stack
    }
    const err = new Error()
    const stack: NodeJS.CallSite[] = err.stack as unknown as NodeJS.CallSite[]
    Error.prepareStackTrace = origPrepareStackTrace
    stack.shift() // 排除当前文件的调用
    return stack
}

/**
 * 格式化秒数为时间类型
 * @param seconds 秒数
 */
export function formatTime(seconds:number){
    let result = ''
    const units = [
        {name: '年', value: 60 * 60 * 24 * 365},
        {name: '月', value: 60 * 60 * 24 * 30},
        {name: '周', value: 60 * 60 * 24 * 7},
        {name: '天', value: 60 * 60 * 24},
        {name: '小时', value: 60 * 60},
        {name: '分钟', value: 60},
        {name: '秒', value: 1}
    ]
    for (const unit of units) {
        const value = Math.floor(seconds / unit.value)
        if (value > 0) {
            result += `${value} ${unit.name} `
        }
        seconds %= unit.value
    }
    return result.trimEnd()
}
export function loadYamlConfigOrCreate<T>(name:string,defaultValue:T):[T,boolean]{
    const filePath=path.resolve(process.cwd(),name)
    let needCreate=!fs.existsSync(filePath)
    if(needCreate){
        fs.writeFileSync(filePath,YAML.stringify(defaultValue),'utf8')
    }
    const fileData=fs.readFileSync(filePath,'utf8')
    return [YAML.parse(fileData),needCreate]
}
