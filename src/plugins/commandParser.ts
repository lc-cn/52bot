import {Plugin} from "@/plugin";

const commandParser=new Plugin('指令解析器');
commandParser.middleware(async (event, next)=>{
    const commands = event.bot.getSupportCommands(event);
    for (const command of commands) {
        const result = await command.execute(event, event.raw_message);
        if(result) return event.reply(result)
    }
    return next()
})
commandParser.command('/帮助 [name:string]')
    .desc("显示指令帮助")
    .sugar(/^(\S+)帮助$/,{args:['$1']})
    .option("-H [showHidden:boolean] 显示隐藏指令")
    .action(({ options,bot, message }, target) => {
        const supportCommands = bot.getSupportCommands(message as any);
        if (!target) {
            const commands = supportCommands.filter(cmd => {
                if (options.showHidden) return cmd.parent === null;
                return !cmd.config.hidden && cmd.parent === null;
            });
            const output = commands
                .map(command =>
                    command.help(
                        {
                            ...options,
                            simple: true,
                            dep: 0,
                        },
                        supportCommands,
                    ),
                )
                .flat();
            output.push("输入 “/帮助 [command name]” 展示指定指令帮助");
            return '\n'+output.filter(Boolean).join("\n");
        }

        return '\n'+bot
            .findCommand(target)
            ?.help({ ...options, dep: 1 }, supportCommands)
            .concat("输入 “/帮助 [command name]” 展示指定指令帮助")
            .join("\n");
    });
export default commandParser
