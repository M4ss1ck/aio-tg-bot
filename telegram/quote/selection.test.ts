import assert from 'node:assert/strict'
import { test } from 'node:test'
import { clampCount, selectMessages, MAX_QUOTE_MESSAGES } from './selection'
import type { CachedMessage } from './types'

const msg = (id: number): CachedMessage => ({
    message_id: id,
    date: id,
    from: { id: 1, name: 'A' },
    colorId: 0,
    text: `m${id}`,
})

test('clampCount enforces [1, MAX]', () => {
    assert.equal(clampCount(0), 1)
    assert.equal(clampCount(-3), 1)
    assert.equal(clampCount(NaN), 1)
    assert.equal(clampCount(3), 3)
    assert.equal(clampCount(99), MAX_QUOTE_MESSAGES)
    assert.equal(clampCount(2.9), 2)
})

test('selectMessages returns the replied message and the ones before it', () => {
    const cache = [msg(13), msg(10), msg(12), msg(11)] // unsorted, as stored newest-first
    const picked = selectMessages(cache, 11, 2)
    assert.deepEqual(picked.map(m => m.message_id), [10, 11])
})

test('selectMessages includes the n-1 messages before the replied one', () => {
    const cache = [msg(1), msg(2), msg(3), msg(4), msg(5)]
    // Replying to the most recent message quotes it plus the two before it.
    assert.deepEqual(selectMessages(cache, 5, 3).map(m => m.message_id), [3, 4, 5])
    // Replying to a middle message never reaches past it into newer messages.
    assert.deepEqual(selectMessages(cache, 4, 3).map(m => m.message_id), [2, 3, 4])
})

test('selectMessages returns fewer when not enough earlier messages exist', () => {
    const cache = [msg(1), msg(2), msg(3), msg(4), msg(5)]
    assert.deepEqual(selectMessages(cache, 2, 3).map(m => m.message_id), [1, 2])
    assert.deepEqual(selectMessages(cache, 1, 3).map(m => m.message_id), [1])
})

test('selectMessages caps at the available cache', () => {
    const cache = [msg(10), msg(11)]
    assert.deepEqual(selectMessages(cache, 11, 5).map(m => m.message_id), [10, 11])
})

test('selectMessages returns empty when replied message is not cached', () => {
    const cache = [msg(10), msg(11)]
    assert.deepEqual(selectMessages(cache, 99, 3), [])
})
