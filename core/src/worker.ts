
import {fork, ForkOptions} from "child_process";
import path from "path";
interface Message {
  type: "start" | "queue";
  body: any;
}

let buffer:any = null,timeStart: number;
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
    if(!code) return
    if (code!==51) {
      process.exit(code);
    }
    timeStart = new Date().getTime();
    startBotWorker(entry,mode)
  });
}
