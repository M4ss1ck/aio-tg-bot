import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Message } from 'grammy/types'
import { colorId, displayName, isCacheable, toCachedMessage } from './message'

const user = { id: 42, is_bot: false, first_name: 'Ada', last_name: 'Lovelace', username: 'ada' }

const base = (over: Partial<Message>): Message =>
    ({ message_id: 1, date: 100, chat: { id: -1, type: 'group', title: 'g' }, from: user, ...over }) as Message

test('displayName joins first and last name', () => {
    assert.equal(displayName(user as never), 'Ada Lovelace')
    assert.equal(displayName({ id: 1, is_bot: false, first_name: 'Bob' } as never), 'Bob')
    assert.equal(displayName(undefined), 'Unknown')
})

test('colorId is stable and within range', () => {
    assert.equal(colorId(42), 42 % 7)
    assert.ok(colorId(-99) >= 0 && colorId(-99) < 7)
})

test('toCachedMessage extracts text, author and color', () => {
    const cached = toCachedMessage(base({ text: 'hello' }))
    assert.equal(cached.message_id, 1)
    assert.equal(cached.text, 'hello')
    assert.equal(cached.from.name, 'Ada Lovelace')
    assert.equal(cached.colorId, 42 % 7)
    assert.equal(cached.media, undefined)
    assert.equal(cached.reply, undefined)
})

test('toCachedMessage captures a nested reply', () => {
    const replied = base({
        message_id: 2,
        text: 'quoted thing',
        from: { id: 7, is_bot: false, first_name: 'Ben' },
    })
    const cached = toCachedMessage(base({ message_id: 3, text: 'response', reply_to_message: replied as never }))
    assert.ok(cached.reply)
    assert.equal(cached.reply?.name, 'Ben')
    assert.equal(cached.reply?.text, 'quoted thing')
    assert.equal(cached.reply?.colorId, 7 % 7)
})

test('toCachedMessage extracts a photo as media with caption as text', () => {
    const cached = toCachedMessage(base({
        caption: 'nice pic',
        photo: [
            { file_id: 'small', file_unique_id: 's', width: 90, height: 90 },
            { file_id: 'big', file_unique_id: 'b', width: 800, height: 600 },
        ],
    }))
    assert.equal(cached.text, 'nice pic')
    assert.deepEqual(cached.media, { type: 'photo', fileId: 'big', width: 800, height: 600 })
})

test('isCacheable rejects commands and empty service messages', () => {
    assert.equal(isCacheable(base({ text: '/q 3' })), false)
    assert.equal(isCacheable(base({ text: 'real message' })), true)
    assert.equal(isCacheable(base({})), false)
})
