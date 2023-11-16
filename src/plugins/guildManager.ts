import {GuildMessageEvent, Plugin} from "@";

export const guildManager = new Plugin('频道管理',{
    scope: 'guild'
});
guildManager.command('/置顶 [message_id:string]')
    .action<GuildMessageEvent>(async ({message},message_id)=>{
        if(!message_id) message_id=message.message_reference?.message_id
        if(!message_id) return '请输入消息id或引用需要置顶的消息'
        const result=await message.channel.pinMessage(message_id)
        return result?.message_ids?.includes(message_id) ? '已置顶' : '置顶失败'
    })
guildManager.command('/取消置顶 [message_id:string]')
    .action<GuildMessageEvent>(async ({message},message_id)=>{
        if(!message_id) message_id=message.message_reference?.message_id
        if(!message_id) return '请输入消息id或引用需要取消置顶的消息'
        const result=await message.channel.unpinMessage(message_id)
        return result?.message_ids?.includes(message_id) ? '已取消置顶' : '取消置顶失败'
    })
guildManager.command('/设为公告 [message_id:string]')
    .action<GuildMessageEvent>(async ({message},message_id)=>{
        if(!message_id) message_id=message.message_reference?.message_id
        if(!message_id) return '请输入消息id或引用需要设为公告的消息'
        const result=await message.channel.setAnnounce(message_id)
        return result?.message_id===message_id ? '已设为公告' : '设为公告失败'
    })
guildManager.command('/禁言 [user_id:user_id]')
    .option('-t [time:number] 禁言时长,单位秒', 10)
    .action<GuildMessageEvent>(async ({message,options},user_id)=>{
        const result=await message.guild.muteMember(user_id,options.time)
        return result?`已将(${user_id})禁言时长设为${options.time}秒`:'禁言失败'
    })
