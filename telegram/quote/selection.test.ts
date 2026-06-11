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

test('selectMessages returns consecutive messages from the replied id forward', () => {
    const cache = [msg(13), msg(10), msg(12), msg(11)] // unsorted, as stored newest-first
    const picked = selectMessages(cache, 11, 2)
    assert.deepEqual(picked.map(m => m.message_id), [11, 12])
})

test('selectMessages stops at the end of available cache', () => {
    const cache = [msg(10), msg(11)]
    const picked = selectMessages(cache, 11, 5)
    assert.deepEqual(picked.map(m => m.message_id), [11])
})

test('selectMessages returns empty when replied message is not cached', () => {
    const cache = [msg(10), msg(11)]
    assert.deepEqual(selectMessages(cache, 99, 3), [])
})
