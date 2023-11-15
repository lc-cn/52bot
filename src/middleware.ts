import {Sendable} from "@/elements";
import {GroupMessageEvent,PrivateMessageEvent,GuildMessageEvent} from "@/message";
type MessageEvent=GuildMessageEvent|PrivateMessageEvent|GroupMessageEvent
type Next = () => Promise<Sendable | null>;
export type Middleware = Compose.Middleware<MessageEvent>;
export namespace Middleware {
    export function compose<S>(middlewares: Middleware[]): Compose.ComposedMiddleware<S> {
        if (!Array.isArray(middlewares)) throw new TypeError("Middleware stack must be an array!");
        for (const fn of middlewares) {
            if (typeof fn !== "function")
                throw new TypeError("Middleware must be composed of functions!");
        }
        return (message: MessageEvent & S, next?: Next) => {
            let index = -1;
            const dispatch = (i, ctx = message) => {
                if (i <= index) return Promise.reject(new Error("next() called multiple times"));
                index = i;
                let fn = middlewares[i];
                if (i === middlewares.length) fn = next;
                if (!fn) return Promise.resolve();
                try {
                    return Promise.resolve(fn(ctx, dispatch.bind(null, i + 1)));
                } catch (err) {
                    return Promise.reject(err);
                }
            };
            return dispatch(0);
        };
    }
}
export namespace Compose {
    export type Middleware<S> = (session: S, next: Next) => any;
    export type ComposedMiddleware<S> = (session: S, next?: Next) => Promise<void>;
}
