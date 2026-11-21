import { useEffect, useState } from 'react'
import type { BudgetMethod, Route, Settings } from './types'
import { useAppData, type NewExpense } from './hooks/useAppData'
import { useOnline } from './hooks/usePwa'
import { METHODS } from './lib/budget'
import { currentMonth } from './lib/date'
import { Layout } from './components/Layout'
import { InstallPrompt } from './components/InstallPrompt'
import { Dashboard } from './screens/Dashboard'
import { Budget } from './screens/Budget'
import { AddExpense } from './screens/AddExpense'
import { Goals } from './screens/Goals'
import { History } from './screens/History'
import { Setup } from './screens/Setup'
import { Analytics } from '@vercel/analytics/react'

interface Toast {
  message: string
  tone: 'default' | 'error'
}

function readError(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}

export default function App() {
  const data = useAppData()
  const online = useOnline()
  const [route, setRoute] = useState<Route>('dashboard')
  const [month, setMonth] = useState(currentMonth())
  const [toast, setToast] = useState<Toast | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3400)
    return () => window.clearTimeout(timer)
  }, [toast])

  const notify = (message: string, tone: 'default' | 'error' = 'default') => {
    setToast({ message, tone })
  }

  const changeMethod = async (method: BudgetMethod) => {
    try {
      await data.saveSettings({ budgetMethod: method })
      notify(`Method set to ${METHODS[method].name}`)
    } catch (error) {
      notify(readError(error), 'error')
    }
  }

  const addExpense = async (input: NewExpense) => {
    await data.addExpense(input)
    setMonth(input.date.slice(0, 7))
    notify('Expense added')
    setRoute('dashboard')
  }

  const deleteExpense = async (id: string) => {
    try {
      await data.deleteExpense(id)
      notify('Expense deleted')
    } catch (error) {
      notify(readError(error), 'error')
    }
  }

  const saveGoal = async (goal: Parameters<typeof data.saveGoal>[0]) => {
    await data.saveGoal(goal)
    notify('Goal saved')
  }

  const deleteGoal = async (id: string) => {
    try {
      await data.deleteGoal(id)
      notify('Goal deleted')
    } catch (error) {
      notify(readError(error), 'error')
    }
  }

  const saveSetup = async (patch: Partial<Omit<Settings, 'id'>>) => {
    await data.saveSettings({ ...patch, setupComplete: true })
    notify('Setup saved')
  }

  const resetAll = async () => {
    await data.resetAll()
    setMonth(currentMonth())
    notify('All data reset to the starting point')
  }

  if (data.loading) {
    return (
      <div className="boot">
        <div className="boot-mark">
          Badyet<span>.</span>
        </div>
        <p>Opening your local ledger…</p>
      </div>
    )
  }

  if (data.error) {
    return (
      <div className="boot">
        <div className="boot-card card card-pad">
          <span className="eyebrow">Storage problem</span>
          <h1>Can't open local data</h1>
          <p className="muted small">{data.error}</p>
          <button type="button" className="btn btn-primary" onClick={() => void data.reload()}>
            Try again
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <Layout
        route={route}
        onNavigate={setRoute}
        online={online}
        onAdd={() => setRoute('add')}
      >
        {route === 'dashboard' ? (
          <Dashboard
            settings={data.settings}
            categories={data.categories}
            expenses={data.expenses}
            goals={data.goals}
            month={month}
            onMonthChange={setMonth}
            onNavigate={setRoute}
            onMethodChange={(method) => void changeMethod(method)}
          />
        ) : null}

        {route === 'budget' ? (
          <Budget
            settings={data.settings}
            categories={data.categories}
            expenses={data.expenses}
            month={month}
            onMonthChange={setMonth}
            onSaveCategory={data.saveCategory}
            onDeleteCategory={data.deleteCategory}
            notify={notify}
          />
        ) : null}

        {route === 'add' ? (
          <AddExpense
            categories={data.categories}
            currency={data.settings.currency}
            onAdd={addExpense}
            onManageCategories={() => setRoute('budget')}
          />
        ) : null}

        {route === 'goals' ? (
          <Goals
            goals={data.goals}
            currency={data.settings.currency}
            onSave={saveGoal}
            onDelete={deleteGoal}
          />
        ) : null}

        {route === 'history' ? (
          <History
            expenses={data.expenses}
            categories={data.categories}
            currency={data.settings.currency}
            onDelete={deleteExpense}
          />
        ) : null}

        {route === 'setup' ? (
          <Setup settings={data.settings} onSave={saveSetup} onReset={resetAll} />
        ) : null}
      </Layout>

      <InstallPrompt />
      <Analytics />
        
      {toast ? (
        <div
          className={`toast${toast.tone === 'error' ? ' is-error' : ''}`}
          role="status"
          aria-live="polite"
        >
          {toast.message}
        </div>
      ) : null}
    </>
  )
}
