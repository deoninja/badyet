import type { Category, Expense, Goal, Settings } from '../types'

export type StoreName = 'settings' | 'categories' | 'expenses' | 'goals'
export type StorageMode = 'idb' | 'local'

interface StoreMap {
  settings: Settings
  categories: Category
  expenses: Expense
  goals: Goal
}

export type StoreRecord<K extends StoreName> = StoreMap[K]

export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

export interface AppDb {
  mode: StorageMode
  getAll<K extends StoreName>(store: K): Promise<StoreRecord<K>[]>
  get<K extends StoreName>(store: K, id: string): Promise<StoreRecord<K> | undefined>
  put<K extends StoreName>(store: K, value: StoreRecord<K>): Promise<void>
  remove(store: StoreName, id: string): Promise<void>
  clearAll(): Promise<void>
  close(): void
}

export interface OpenDbOptions {
  dbName?: string
  forceLocal?: boolean
  indexedDB?: IDBFactory
  storage?: StorageLike
}

const DB_NAME = 'badyet-db'
const DB_VERSION = 1
const STORES: StoreName[] = ['settings', 'categories', 'expenses', 'goals']
const INDEXES: Partial<Record<StoreName, string[]>> = {
  expenses: ['date', 'categoryId']
}
const LS_PREFIX = 'badyet:'

function defaultStorage(): StorageLike | null {
  try {
    const storage = globalThis.localStorage
    if (!storage) return null
    const probe = '__badyet_probe__'
    storage.setItem(probe, '1')
    storage.removeItem(probe)
    return storage
  } catch {
    return null
  }
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

function openIdb(name: string, factory: IDBFactory): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let settled = false
    const request = factory.open(name, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      for (const store of STORES) {
        if (db.objectStoreNames.contains(store)) continue
        const objectStore = db.createObjectStore(store, { keyPath: 'id' })
        for (const index of INDEXES[store] ?? []) {
          objectStore.createIndex(index, index, { unique: false })
        }
      }
    }

    request.onsuccess = () => {
      if (settled) return
      settled = true
      resolve(request.result)
    }
    request.onerror = () => {
      if (settled) return
      settled = true
      reject(request.error ?? new Error('IndexedDB could not be opened'))
    }
    request.onblocked = () => {
      if (settled) return
      settled = true
      reject(new Error('IndexedDB is blocked by another tab'))
    }
  })
}

function idbAdapter(db: IDBDatabase): AppDb {
  return {
    mode: 'idb',
    async getAll(store) {
      const tx = db.transaction(store, 'readonly')
      const done = transactionDone(tx)
      const rows = await requestToPromise(tx.objectStore(store).getAll())
      await done
      return rows as StoreRecord<typeof store>[]
    },
    async get(store, id) {
      const tx = db.transaction(store, 'readonly')
      const done = transactionDone(tx)
      const row = await requestToPromise(tx.objectStore(store).get(id))
      await done
      return row as StoreRecord<typeof store> | undefined
    },
    async put(store, value) {
      const tx = db.transaction(store, 'readwrite')
      const done = transactionDone(tx)
      tx.objectStore(store).put(value)
      await done
    },
    async remove(store, id) {
      const tx = db.transaction(store, 'readwrite')
      const done = transactionDone(tx)
      tx.objectStore(store).delete(id)
      await done
    },
    async clearAll() {
      const tx = db.transaction(STORES, 'readwrite')
      const done = transactionDone(tx)
      for (const store of STORES) tx.objectStore(store).clear()
      await done
    },
    close() {
      db.close()
    }
  }
}

function localAdapter(storage: StorageLike): AppDb {
  const read = <K extends StoreName>(store: K): StoreRecord<K>[] => {
    try {
      const raw = storage.getItem(LS_PREFIX + store)
      if (!raw) return []
      const parsed: unknown = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as StoreRecord<K>[]) : []
    } catch {
      return []
    }
  }

  const write = <K extends StoreName>(store: K, rows: StoreRecord<K>[]): void => {
    storage.setItem(LS_PREFIX + store, JSON.stringify(rows))
  }

  return {
    mode: 'local',
    async getAll(store) {
      return read(store)
    },
    async get(store, id) {
      return read(store).find((row) => row.id === id)
    },
    async put(store, value) {
      const rows = read(store)
      const index = rows.findIndex((row) => row.id === value.id)
      if (index >= 0) rows[index] = value
      else rows.push(value)
      write(store, rows)
    },
    async remove(store, id) {
      write(
        store,
        read(store).filter((row) => row.id !== id)
      )
    },
    async clearAll() {
      for (const store of STORES) storage.removeItem(LS_PREFIX + store)
    },
    close() {}
  }
}

export async function openAppDb(options: OpenDbOptions = {}): Promise<AppDb> {
  const factory =
    options.indexedDB ?? (typeof globalThis.indexedDB !== 'undefined' ? globalThis.indexedDB : undefined)

  if (!options.forceLocal && factory) {
    try {
      const db = await openIdb(options.dbName ?? DB_NAME, factory)
      return idbAdapter(db)
    } catch {
      // fall through to localStorage
    }
  }

  const storage = options.storage ?? defaultStorage()
  if (!storage) throw new Error('This browser has no usable local storage.')
  return localAdapter(storage)
}

export function deleteAppDatabase(dbName = DB_NAME): Promise<void> {
  return new Promise((resolve) => {
    if (typeof globalThis.indexedDB === 'undefined') {
      resolve()
      return
    }
    const request = globalThis.indexedDB.deleteDatabase(dbName)
    const finish = () => resolve()
    request.onsuccess = finish
    request.onerror = finish
    request.onblocked = finish
  })
}
