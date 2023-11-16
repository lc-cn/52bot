import * as path from "path";
import * as fs from "fs";
import {Plugin} from "@/plugin";

export const toObject = <T = any>(data: any) => {
    if (Buffer.isBuffer(data)) return JSON.parse(data.toString()) as T;
    if (typeof data === 'object') return data as T;
    if (typeof data === 'string') return JSON.parse(data) as T;
    // return String(data);
};

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
        `qq-bot-plugin-${name}`,
        name
    ]
    for (const path of maybePath) {
        if (fs.existsSync(path)) {
            const result=require(path)
            if(result.default) return result.default
            return result
        }
    }
    throw new Error('找不到插件：' + name);
}

export function loadPlugins(dir: string):Plugin[] {
    dir=path.resolve(__dirname,dir)
    return fs.readdirSync(dir).map(name => {
        try {
            return loadPlugin(name)
        } catch {
            return null
        }
    })
        .filter(Boolean);
}
