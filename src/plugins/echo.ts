import {Plugin} from "@";

const echo = new Plugin('echo');
echo.command('/发送 <msg:any>')
    .alias('发送', 'echo')
    .action((_, msg) => msg)
module.exports = echo
