import {Plugin} from "52bot";
import {QQAdapter} from "@52bot/qq";

const guildManager = new Plugin('频道管理', {
  adapters: ['qq']
});
guildManager.command('置顶 [message_id:string]')
  .permission('admin')
  .scope('guild')
  .action<QQAdapter>(async ({message}, message_id) => {
    if (!message_id) message_id = message.message_reference?.message_id as string
    if (!message_id) return '请输入消息id或引用需要置顶的消息'
    const result = await message.bot.pinChannelMessage(message.channel_id as string, message_id)
    return result?.message_ids?.includes(message_id) ? '已置顶' : '置顶失败'
  })
guildManager.command('取消置顶 [message_id:string]')
  .permission('admin')
  .scope('guild')
  .action<QQAdapter>(async ({message}, message_id) => {
    if (!message_id) message_id = message.message_reference?.message_id as string
    if (!message_id) return '请输入消息id或引用需要取消置顶的消息'
    const result = await message.bot.unPinChannelMessage(message.channel_id as string, message_id)
    return result?.message_ids?.includes(message_id) ? '已取消置顶' : '取消置顶失败'
  })
guildManager.command('设为公告 [message_id:string]')
  .permission('admin')
  .scope('guild')
  .action<QQAdapter>(async ({message}, message_id) => {
    if (!message_id) message_id = message.message_reference?.message_id as string
    if (!message_id) return '请输入消息id或引用需要设为公告的消息'
    const result = await message.bot.setChannelAnnounce(message.guild_id as string, message.channel_id as string, message_id)
    return result?.message_id === message_id ? '已设为公告' : '设为公告失败'
  })
guildManager.command('禁言 [user_id:user_id]')
  .permission('admin')
  .scope('guild')
  .option('-t [time:number] 禁言时长,单位秒', 10)
  .action<QQAdapter>(async ({message, options}, user_id) => {
    const result = await message.bot.muteGuildMember(message.guild_id as string, user_id, options.time as number)
    return result ? `已将(${user_id})禁言时长设为${options.time}秒` : '禁言失败'
  })
export default guildManager
