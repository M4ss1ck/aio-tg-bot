import { Composer } from 'telegraf'
import type { MyContext } from '../interfaces'

const ban = new Composer<MyContext>()

ban.command(['b', 'ban'], Composer.admin(async (ctx) => {
  if (ctx.message.reply_to_message?.from) {
    const bannedId = ctx.message.reply_to_message.from.id
    await ctx
      .banChatMember(bannedId)
      .then(() => ctx.reply(ctx.t('Usuario baneado')!))
      .catch(() => ctx.reply(ctx.t('Error kicking user')!))
  }
}))

ban.command(['k', 'kick'], Composer.admin(async (ctx) => {
  if (ctx.message.reply_to_message?.from) {
    const bannedId = ctx.message.reply_to_message.from.id
    await ctx
      .banChatMember(bannedId)
      .then(() => ctx.unbanChatMember(bannedId))
      .catch(() => ctx.reply(ctx.t('Error kicking user')!))
  }
}))

ban.command('promote', Composer.admin(async (ctx) => {
  if (ctx.message.reply_to_message?.from) {
    const promotedId = ctx.message.reply_to_message.from.id
    await ctx
      .promoteChatMember(promotedId, {
        can_manage_chat: true,
        can_manage_topics: true,
        can_manage_video_chats: true,
        can_change_info: true,
        can_delete_messages: true,
        can_invite_users: true,
        can_restrict_members: true,
        can_pin_messages: true,
        can_promote_members: true,
      })
      .then(() => ctx.reply(ctx.t('Usuario promovido')!))
      .catch(() => ctx.reply(ctx.t('Error promoting user')!))
  }
}))

ban.command('demote', Composer.admin(async (ctx) => {
  if (ctx.message.reply_to_message?.from) {
    const demotedId = ctx.message.reply_to_message.from.id
    await ctx
      .promoteChatMember(demotedId, {
        can_manage_chat: false,
        can_manage_topics: false,
        can_manage_video_chats: false,
        can_change_info: false,
        can_delete_messages: false,
        can_invite_users: false,
        can_restrict_members: false,
        can_pin_messages: false,
        can_promote_members: false,
      })
      .then(() => ctx.reply(ctx.t('Usuario degradado')!))
      .catch(() => ctx.reply(ctx.t('Error demoting user')!))
  }
}))

export default ban
