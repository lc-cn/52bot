import { QQBot } from "@/qqBot";
import { GroupMessageEvent, GuildMessageEvent, PrivateMessageEvent } from "@/message";
import { Sendable } from "@/elements";
import { Dict } from "@/types";

type MessageEvent = GuildMessageEvent | PrivateMessageEvent | GroupMessageEvent
export class Prompt {
    private readonly fullTargetId: string;

    constructor(
        private bot: QQBot,
        private message: MessageEvent,
        public timeout: number,
    ) {
        this.fullTargetId = QQBot.getFullTargetId(message);
    }

    /**
     * 发起一个询问会话，等待用户回复
     * @param options {Prompt.Option} 询问配置
     */
    async prompts<O extends Prompt.Options>(options: O): Promise<Prompt.ResultS<O>> {
        let result: Prompt.ResultS<O> = {} as Prompt.ResultS<O>;
        const names = Object.keys(options);
        for (const name of names) {
            result[name as keyof O] = await this[options[name].type as any](
                options[name].message,
                options[name],
            );
        }
        return result;
    }

    private async $prompt<
        T extends keyof Prompt.Types,
        CT extends keyof Prompt.BaseTypes,
        M extends boolean = false,
    >(options: Prompt.Option<T, CT, M>) {
        await this.message.reply(options.message);
        return new Promise<Prompt.Result<T, CT, M>>(resolve => {
            try {
                const dispose = this.message.middleware(async (event) => {
                    resolve(options.format(event));
                    dispose();
                    clearTimeout(timer);
                });
                const timer = setTimeout(() => {
                    this.message.reply(options.timeout_message || "输入超时");
                    resolve(options.initial);
                }, options.timeout || this.timeout);
            } catch (e) {
                this.message.reply(e.message);
                resolve(options.initial);
            }
        });
    }

    /**
     * 任意输入
     * @param message {Sendable} 提示信息
     * @param timeout_message {Sendable} 超时提示信息
     * @param timeout {number} 超时时间
     * @return {Promise<Sendable>}
     */
    async any(
        message: Sendable = "请输入",
        timeout_message: Sendable = "输入超时",
        timeout = this.timeout,
    ) {
        return new Promise<Sendable>(resolve => {
            try {
                this.message.reply(message);
                const dispose = this.message.middleware(async message => {
                    resolve(message.raw_message);
                    dispose();
                    clearTimeout(timer);
                });
                const timer = setTimeout(() => {
                    this.message.reply(timeout_message);
                    resolve('');
                }, timeout);
            } catch (e) {
                this.message.reply(e.message);
                resolve('');
            }
        });
    }

    /**
     * 文本输入
     * @param message {Sendable} 提示信息
     * @param initial {string} 默认值
     * @param options {Omit<Prompt.TextOptions,'type'|'message'|'initial'>} 其他配置信息
     * @return {Promise<string|void>}
     */
    text(
        message: Sendable = "请输入文本",
        initial = "",
        options: Omit<Prompt.TextOptions, "type" | "message" | "initial"> = {},
    ) {
        return this.$prompt({
            type: "text",
            message,
            initial,
            format: Prompt.transforms["text"],
            ...options,
        });
    }

    /**
     * 数值输入
     * @param message {Sendable} 提示信息
     * @param initial {number} 默认值
     * @param options {Omit<Prompt.NumberOptions,'type'|'message'|'initial'>} 其他配置信息
     * @return {Promise<number|void>}
     */
    number(
        message: Sendable = "请输入数值",
        initial = 0,
        options: Omit<Prompt.NumberOptions, "type" | "message" | "initial"> = {},
    ) {
        return this.$prompt({
            type: "number",
            message,
            initial,
            format: Prompt.transforms["number"],
            ...options,
        });
    }

    /**
     * 日期输入
     * @param message {Sendable} 提示信息
     * @param initial {Date} 默认值
     * @param options {Omit<Prompt.DateOptions,'type'|'message'|'initial'>} 其他配置信息
     * @return {Promise<Date|void>}
     */
    date(
        message: Sendable = "请输入日期",
        initial = new Date(),
        options: Omit<Prompt.DateOptions, "type" | "message" | "initial"> = {},
    ) {
        return this.$prompt({
            type: "date",
            message,
            initial,
            format: Prompt.transforms["date"],
            ...options,
        });
    }

    /**
     * 正则输入
     * @param message {Sendable} 提示信息
     * @param initial {RegExp} 默认值
     * @param options {Omit<Prompt.RegexpOptions,'type'|'message'|'initial'>} 其他配置信息
     * @return {Promise<RegExp|void>}
     */
    regexp(
        message: Sendable = "请输入正则",
        initial = /.+/,
        options: Omit<Prompt.RegexpOptions, "type" | "message" | "initial"> = {},
    ) {
        return this.$prompt({
            type: "regexp",
            message,
            initial,
            format: Prompt.transforms["regexp"],
            ...options,
        });
    }

    /**
     * 操作确认
     * @param message {Sendable} 提示信息
     * @param initial {boolean} 默认值
     * @param options {Omit<Prompt.ConfirmOptions,'type'|'message'|'initial'>} 其他配置信息
     * @return {Promise<boolean|void>}
     */
    confirm(
        message: Sendable = "确认么？",
        initial: boolean = false,
        options: Omit<Prompt.ConfirmOptions, "type" | "message" | "initial"> = {},
    ) {
        return this.$prompt({
            type: "confirm",
            message: options.confirm_message
                ? [
                    ...(Array.isArray(message) ? message : [message]),
                    ...(Array.isArray(options.confirm_message)
                        ? options.confirm_message
                        : [options.confirm_message]),
                ] as any
                : `${message}\n输入${[
                    "yes",
                    "y",
                    "Yes",
                    "YES",
                    "Y",
                    ".",
                    "。",
                    "确认",
                ].join()}为确认`,
            initial,
            format: Prompt.transforms["confirm"],
            ...options,
        });
    }

    /**
     * 列表输入
     * @param message {Sendable} 提示信息
     * @param option {Omit<Prompt.ListOptions,'type'|'message'>} 其他配置信息
     * @return {Promise<any[]|void>} 输入的值列表
     */
    list<T extends keyof Prompt.BaseTypes>(
        message: Sendable = "请输入",
        option: Prompt.Option<"list", T>,
    ) {
        return this.$prompt({
            type: "list",
            message: `${message}\n值之间使用'${option.separator || ","}'分隔`,
            initial: option.initial || [],
            child_type: option.child_type,
            format(event) {
                return Prompt.transforms["list"][option.child_type](event, option.separator || ",");
            },
            ...option,
        });
    }

    toJSON() {
        return {
            fullTargetId: this.fullTargetId,
            timeout: this.timeout,
        };
    }

    /**
     * 选择输入
     * @param message {Sendable} 提示信息
     * @param option {Omit<Prompt.SelectOptions,'type'|'message'>} 其他配置信息
     * @return {Promise<any|any[]|void>} 选择的值，多选时为值列表
     */
    select<T extends keyof Prompt.BaseTypes, M extends boolean>(
        message: Sendable = "请选择",
        option: Prompt.Option<"select", T, M>,
    ) {
        const options: Prompt.Option<"select", T, M> = {
            type: "select",
            ...option,
            message: `${message}\n${option.options
                .map((option, index) => {
                    return `${index + 1}:${option.label}`;
                })
                .join("\n")}${option.multiple ? `\n选项之间使用'${option.separator || ","}'分隔` : ""
                }`,
            format: event => {
                const choiceArr = event.raw_message.split(",").map(Number);
                return Prompt.transforms["select"][option.child_type][
                    option.multiple ? "true" : "false"
                ](event, option.options, choiceArr) as Prompt.Select<T, M>;
            },
        };
        return this.$prompt(options);
    }
}

export namespace Prompt {
    export interface BaseTypes {
        text: string;
        number: number;
        confirm: boolean;
        regexp: RegExp;
        date: Date;
    }

    export interface QuoteTypes<
        T extends keyof BaseTypes = keyof BaseTypes,
        M extends boolean = false,
    > {
        list: List<T>;
        select: Select<T, M>;
    }

    export interface Types<CT extends keyof BaseTypes = keyof BaseTypes, M extends boolean = false>
        extends BaseTypes,
        QuoteTypes<CT, M> { }

    export type Result<
        T extends keyof Types,
        CT extends keyof BaseTypes,
        M extends boolean,
    > = T extends "select" ? Select<CT, M> : T extends "list" ? Array<BaseTypes[CT]> : Types[T];
    export type List<T extends keyof BaseTypes = keyof BaseTypes> = Array<BaseTypes[T]>;
    export type Select<
        T extends keyof BaseTypes = keyof BaseTypes,
        M extends boolean = false,
    > = M extends true ? Array<BaseTypes[T]> : BaseTypes[T];
    export type Option<
        T extends keyof Types = keyof Types,
        CT extends keyof BaseTypes = keyof BaseTypes,
        M extends boolean = false,
    > = {
        // 提示信息
        message?: Sendable;
        // 需要输入的类型
        type?: T;
        // 子类型，仅在type为list或select时有效
        child_type?: CT;
        // 是否多选，仅在type为select时有效
        multiple?: T extends "select" ? M : boolean;
        // 默认值
        initial?: Result<T, CT, M>;
        // 超时时间
        timeout?: number;
        // 超时提示信息
        timeout_message?: Sendable;
        // 确认提示信息
        confirm_message?: Sendable;
        // 格式化输入的值，不设置时使用默认的格式化方法
        format?: (message: MessageEvent) => Result<T, CT, M>;
        // 验证输入的值，不设置时使用默认的验证方法
        validate?: (value: Types[T], ...args: any[]) => boolean;
        // 选项分隔符，仅在type为list或select时有效
        separator?: string;
        // 选项列表，仅在type为select时有效
        options?: T extends "select" ? Prompt.SelectOption<CT>[] : never;
    };
    export type ConfirmOptions = Option<"confirm", never>;
    export type TextOptions = Option<"text", never>;
    export type NumberOptions = Option<"number", never>;
    export type DateOptions = Option<"date", never>;
    export type RegexpOptions = Option<"regexp", never>;
    export type ListOptions<T extends keyof BaseTypes> = Option<"list", T>;
    export type SelectOptions<T extends keyof BaseTypes, M extends boolean> = Option<
        "select",
        T,
        M
    >;

    export interface Options {
        [key: string]: Option;
    }

    export type ResultS<S extends Dict> = {
        [T in keyof S]: ResultItem<S[T]>;
    };
    export type ResultItem<O> = O extends Option<infer T, infer CT, infer M>
        ? Result<T, CT, M>
        : unknown;

    export interface SelectOption<T extends keyof BaseTypes> {
        label: Sendable;
        value: BaseTypes[T];
    }

    export type Transforms<
        CT extends keyof BaseTypes = keyof BaseTypes,
        M extends boolean = false,
    > = {
            [P in keyof Types]?: Transform<P>;
        };
    export type Transform<T extends keyof Types> = T extends keyof QuoteTypes
        ? QuoteTransform<T>
        : (message: MessageEvent) => Types[T];
    export type QuoteTransform<T extends keyof Types> = T extends "select"
        ? SelectTransform
        : T extends "list"
        ? ListTransform
        : unknown;
    export type SelectTransform = {
        [P in keyof BaseTypes]?: {
            true?: (
                message: MessageEvent,
                options: Array<SelectOption<P>>,
                chooseArr: number[],
            ) => Array<BaseTypes[P]>;
            false?: (
                message: MessageEvent,
                options: Array<SelectOption<P>>,
                chooseArr: number[],
            ) => BaseTypes[P];
        };
    };
    export type ListTransform = {
        [P in keyof BaseTypes]?: (
            message: MessageEvent,
            separator: string,
        ) => Array<BaseTypes[P]>;
    };
    export const transforms: Transforms = {};

    export function defineTransform<
        T extends keyof Types,
        CT extends keyof BaseTypes = keyof BaseTypes,
        M extends boolean = false,
    >(type: T, transform: Transforms[T]) {
        transforms[type] = transform;
    }

    defineTransform("number", message => {
        const matchedArr = /^[0-9]*$/.exec(message.raw_message);
        if (!matchedArr) throw new Error("type Error");
        return Number(matchedArr[0]);
    });
    defineTransform("text", message => {
        return message.raw_message;
    });
    defineTransform("confirm", message => {
        const matchedArr = /^[^<]*$/.exec(message.raw_message);
        if (!matchedArr) throw new Error("type Error");
        return ["yes", "y", "Yes", "YES", "Y", ".", "。", "确认"].includes(matchedArr[0]);
    });
    defineTransform("regexp", message => {
        const matchedArr = /^[^<]*$/.exec(message.raw_message);
        if (!matchedArr) throw new Error("type Error");
        return new RegExp(matchedArr[0]);
    });
    defineTransform("date", message => {
        const matchedArr = /^[^<]*$/.exec(message.raw_message);
        if (!matchedArr) throw new Error("type Error");
        return new Date(matchedArr[0]);
    });
    defineTransform("list", {
        date(message, separator) {
            const matchedArr = /^[^<]*$/.exec(message.raw_message);
            if (!matchedArr) throw new Error("type Error");
            return matchedArr[0].split(separator).map(str => {
                if (/^[0-9]$/g.test(str)) return new Date(+str);
                return new Date(str);
            });
        },
        number(message, separator) {
            const matchedArr = /^[^<]*$/.exec(message.raw_message);
            if (!matchedArr) throw new Error("type Error");
            return matchedArr[0].split(separator).map(str => {
                if (!/^[0-9]$/g.test(str)) throw new Error("type Error");
                return +str;
            });
        },
        text(message, separator) {
            const matchedArr = /^[^<]*$/.exec(message.raw_message);
            if (!matchedArr) throw new Error("type Error");
            return matchedArr[0].split(separator);
        },
        regexp(message, separator) {
            const matchedArr = /^[^<]*$/.exec(message.raw_message);
            if (!matchedArr) throw new Error("type Error");
            return matchedArr[0].split(separator).map(str => {
                return new RegExp(str);
            });
        },
    });
    defineTransform("select", {
        date: {
            true(event, options, choose) {
                return options
                    .filter((_, index) => choose.includes(index + 1))
                    .map(option => option.value);
            },
            false(event, options, choose) {
                return options[choose?.[0] - 1]?.value;
            },
        },
        number: {
            true(event, options, choose) {
                return options
                    .filter((_, index) => choose.includes(index + 1))
                    .map(option => option.value);
            },
            false(event, options, choose) {
                return options[choose?.[0] - 1]?.value;
            },
        },
        text: {
            true(event, options, choose) {
                return options
                    .filter((_, index) => choose.includes(index + 1))
                    .map(option => option.value);
            },
            false(event, options, choose) {
                return options[choose?.[0] - 1]?.value;
            },
        },
        regexp: {
            true(event, options, choose) {
                return options
                    .filter((_, index) => choose.includes(index + 1))
                    .map(option => option.value);
            },
            false(event, options, choose) {
                return options[choose?.[0] - 1]?.value;
            },
        },
    });
}
