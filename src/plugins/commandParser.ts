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
