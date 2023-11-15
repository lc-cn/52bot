import {Plugin} from "@/plugin";

export const commandParser=new Plugin('commandParser');
commandParser.middleware(async (event, next)=>{
    const commands = event.bot.getSupportCommands(event);
    for (const command of commands) {
        const result = await command.execute(this, event.raw_message);
        if(result) return event.reply(result)
    }
    return next()
})
commandParser.command('/帮助 [name:string]')
    .desc("show help")
    .option("-H [showHidden:boolean] show hidden options help")
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
            output.push("typed “help [command name]” show help");
            return output.filter(Boolean).join("\n");
        }

        return bot
            .findCommand(target)
            ?.help({ ...options, dep: 1 }, supportCommands)
            .concat("typed “help [command name]” show help")
            .join("\n");
    });
