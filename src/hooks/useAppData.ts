import { useCallback, useEffect, useRef, useState } from 'react'
import type { Category, Expense, Goal, Settings } from '../types'
import { openAppDb, deleteAppDatabase, type AppDb, type StorageMode } from '../db/db'
import { defaultCategories, freshSettings, normalizeSettings } from '../db/seed'
import { newId } from '../lib/id'

export interface AppDataState {
  loading: boolean
  error: string | null
  mode: StorageMode
  settings: Settings
  categories: Category[]
  expenses: Expense[]
  goals: Goal[]
}

export type NewExpense = Omit<Expense, 'id' | 'createdAt'>

const initialState: AppDataState = {
  loading: true,
  error: null,
  mode: 'idb',
  settings: freshSettings(),
  categories: [],
  expenses: [],
  goals: []
}

export function useAppData() {
  const [state, setState] = useState<AppDataState>(initialState)
  const dbRef = useRef<AppDb | null>(null)
  const stateRef = useRef(state)
  stateRef.current = state

  const load = useCallback(async () => {
    try {
      const db = await openAppDb()
      dbRef.current = db
      const storedSettings = (await db.getAll('settings'))[0]
      let categories = await db.getAll('categories')

      const settings = storedSettings ? normalizeSettings(storedSettings) : freshSettings()
      if (!storedSettings || JSON.stringify(storedSettings) !== JSON.stringify(settings)) {
        await db.put('settings', settings)
      }
      if (categories.length === 0) {
        categories = defaultCategories()
        for (const category of categories) {
          await db.put('categories', category)
        }
      }

      const [expenses, goals] = await Promise.all([db.getAll('expenses'), db.getAll('goals')])
      setState({
        loading: false,
        error: null,
        mode: db.mode,
        settings,
        categories,
        expenses,
        goals
      })
    } catch (error) {
      setState((current) => ({
        ...current,
        loading: false,
        error: error instanceof Error ? error.message : 'Could not open local storage.'
      }))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const requireDb = useCallback((): AppDb => {
    const db = dbRef.current
    if (!db) throw new Error('Local storage is not ready yet.')
    return db
  }, [])

  const saveSettings = useCallback(async (patch: Partial<Omit<Settings, 'id'>>) => {
    const next: Settings = { ...stateRef.current.settings, ...patch, id: 'app' }
    await requireDb().put('settings', next)
    setState((current) => ({ ...current, settings: next }))
    return next
  }, [requireDb])

  const addExpense = useCallback(
    async (input: NewExpense) => {
      const expense: Expense = { ...input, id: newId(), createdAt: Date.now() }
      await requireDb().put('expenses', expense)
      setState((current) => ({ ...current, expenses: [...current.expenses, expense] }))
      return expense
    },
    [requireDb]
  )

  const deleteExpense = useCallback(
    async (id: string) => {
      await requireDb().remove('expenses', id)
      setState((current) => ({
        ...current,
        expenses: current.expenses.filter((expense) => expense.id !== id)
      }))
    },
    [requireDb]
  )

  const saveCategory = useCallback(
    async (category: Category) => {
      await requireDb().put('categories', category)
      setState((current) => {
        const exists = current.categories.some((item) => item.id === category.id)
        return {
          ...current,
          categories: exists
            ? current.categories.map((item) => (item.id === category.id ? category : item))
            : [...current.categories, category]
        }
      })
    },
    [requireDb]
  )

  const deleteCategory = useCallback(
    async (id: string) => {
      await requireDb().remove('categories', id)
      setState((current) => ({
        ...current,
        categories: current.categories.filter((category) => category.id !== id)
      }))
    },
    [requireDb]
  )

  const saveGoal = useCallback(
    async (goal: Goal) => {
      await requireDb().put('goals', goal)
      setState((current) => {
        const exists = current.goals.some((item) => item.id === goal.id)
        return {
          ...current,
          goals: exists
            ? current.goals.map((item) => (item.id === goal.id ? goal : item))
            : [...current.goals, goal]
        }
      })
    },
    [requireDb]
  )

  const deleteGoal = useCallback(
    async (id: string) => {
      await requireDb().remove('goals', id)
      setState((current) => ({ ...current, goals: current.goals.filter((goal) => goal.id !== id) }))
    },
    [requireDb]
  )

  const resetAll = useCallback(async () => {
    const db = requireDb()
    const fallback = stateRef.current.mode === 'local'
    await db.clearAll()
    if (fallback) {
      await deleteAppDatabase().catch(() => undefined)
    }
    const settings = freshSettings()
    const categories = defaultCategories()
    await db.put('settings', settings)
    for (const category of categories) {
      await db.put('categories', category)
    }
    setState((current) => ({
      ...current,
      settings,
      categories,
      expenses: [],
      goals: [],
      error: null
    }))
  }, [requireDb])

  return {
    ...state,
    reload: load,
    saveSettings,
    addExpense,
    deleteExpense,
    saveCategory,
    deleteCategory,
    saveGoal,
    deleteGoal,
    resetAll
  }
}
