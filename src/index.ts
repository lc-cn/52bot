import {fork, ForkOptions} from "child_process";
import path from "path";

export * from './qqBot'
export * from './bot'
export * from './elements'
export * from './types'
export * from './utils'
export * from './command'
export * from './message'
export * from './middleware'
export * from './prompt'
export * from './plugin'

interface Message {
    type: "start" | "queue";
    body: any;
}

let buffer = null,timeStart: number;
export function startBotWorker(entry: string, mode: string) {
    const forkOptions: ForkOptions = {
        env: {
            ...process.env,
            entry,
            mode,
        },
        execArgv: ["-r", "jiti/register", "-r", "tsconfig-paths/register"],
        stdio: "inherit",
    };
    const cp = fork(path.resolve(__dirname,"../start.js"), [], forkOptions)
    cp.stdout?.on("data", data => process.stdout.push(data));
    cp.stderr?.on("data", data => process.stderr.push(data));
    process.stdin?.on("data", data => cp.stdin?.write(data));
    cp.on("message", (message: Message) => {
        if (message.type === "start") {
            if (buffer) {
                cp.send({type: "send", body: buffer, times: timeStart});
                buffer = null;
            }
        } else if (message.type === "queue") {
            buffer = message.body;
        }
    });
    const closingCode = [0, 130, 137];
    cp.on("exit", code => {
        if (code!==51) {
            process.exit(code);
        }
        timeStart = new Date().getTime();
        startBotWorker(entry,mode)
    });
}
