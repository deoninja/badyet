import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import type { Category, Expense, Goal } from '../types'
import { openAppDb, type StorageLike } from './db'
import { freshSettings } from './seed'

function uniqueDbName(): string {
  return `badyet-test-${crypto.randomUUID()}`
}

function memoryStorage(): StorageLike {
  const map = new Map<string, string>()
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    }
  }
}

const expense: Expense = {
  id: 'expense-1',
  categoryId: 'cat-food',
  amount: 249.5,
  date: '2026-11-20',
  note: 'Groceries',
  createdAt: 1
}

const goal: Goal = {
  id: 'goal-1',
  name: 'Emergency fund',
  targetAmount: 50000,
  deadline: '2027-06-30',
  savedAmount: 2500
}

const category: Category = { id: 'cat-coffee', name: 'Coffee', type: 'want', cap: 800 }

describe('IndexedDB adapter', () => {
  it('stores and reads every store', async () => {
    const db = await openAppDb({ dbName: uniqueDbName() })
    expect(db.mode).toBe('idb')

    const settings = freshSettings()
    await db.put('settings', settings)
    await db.put('categories', category)
    await db.put('expenses', expense)
    await db.put('goals', goal)

    expect(await db.get('settings', 'app')).toEqual(settings)
    expect(await db.get('categories', 'cat-coffee')).toEqual(category)
    expect(await db.getAll('categories')).toEqual([category])
    expect(await db.getAll('expenses')).toEqual([expense])
    expect(await db.getAll('goals')).toEqual([goal])
    expect((await db.getAll('settings'))[0]).toEqual(settings)
    db.close()
  })

  it('updates and removes records', async () => {
    const db = await openAppDb({ dbName: uniqueDbName() })
    await db.put('categories', category)
    await db.put('categories', { ...category, cap: 1200 })
    expect((await db.get('categories', category.id))?.cap).toBe(1200)
    expect(await db.getAll('categories')).toHaveLength(1)

    await db.put('expenses', expense)
    await db.remove('expenses', expense.id)
    expect(await db.getAll('expenses')).toHaveLength(0)
    db.close()
  })

  it('clears all stores at once', async () => {
    const db = await openAppDb({ dbName: uniqueDbName() })
    await db.put('settings', freshSettings())
    await db.put('categories', category)
    await db.put('expenses', expense)
    await db.put('goals', goal)

    await db.clearAll()

    expect(await db.getAll('settings')).toHaveLength(0)
    expect(await db.getAll('categories')).toHaveLength(0)
    expect(await db.getAll('expenses')).toHaveLength(0)
    expect(await db.getAll('goals')).toHaveLength(0)
    db.close()
  })
})

describe('localStorage fallback', () => {
  it('persists records across connections when IndexedDB is forced off', async () => {
    const storage = memoryStorage()
    const db = await openAppDb({ forceLocal: true, storage })
    expect(db.mode).toBe('local')

    await db.put('settings', freshSettings())
    await db.put('expenses', expense)
    await db.put('goals', goal)

    expect(await db.get('settings', 'app')).toEqual(freshSettings())

    const reopened = await openAppDb({ forceLocal: true, storage })
    expect(await reopened.getAll('expenses')).toEqual([expense])
    expect(await reopened.getAll('goals')).toEqual([goal])

    await reopened.clearAll()
    expect(await reopened.getAll('expenses')).toHaveLength(0)
    expect(await reopened.getAll('settings')).toHaveLength(0)
  })

  it('replaces an existing record by id instead of duplicating it', async () => {
    const storage = memoryStorage()
    const db = await openAppDb({ forceLocal: true, storage })
    await db.put('categories', category)
    await db.put('categories', { ...category, cap: 999 })
    const rows = await db.getAll('categories')
    expect(rows).toHaveLength(1)
    expect(rows[0].cap).toBe(999)
  })
})
