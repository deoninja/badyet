import type { ReactNode } from 'react'
import type { Route } from '../types'
import {
  BudgetIcon,
  ClockIcon,
  HomeIcon,
  PlusIcon,
  SettingsIcon,
  TargetIcon
} from './icons'

interface NavItem {
  route: Route
  label: string
  icon: ReactNode
}

const NAV: NavItem[] = [
  { route: 'dashboard', label: 'Dashboard', icon: <HomeIcon /> },
  { route: 'budget', label: 'Budget', icon: <BudgetIcon /> },
  { route: 'goals', label: 'Savings goals', icon: <TargetIcon /> },
  { route: 'history', label: 'History', icon: <ClockIcon /> },
  { route: 'setup', label: 'Setup', icon: <SettingsIcon /> }
]

const MOBILE_NAV: NavItem[] = [
  { route: 'dashboard', label: 'Home', icon: <HomeIcon /> },
  { route: 'budget', label: 'Budget', icon: <BudgetIcon /> },
  { route: 'goals', label: 'Goals', icon: <TargetIcon /> },
  { route: 'history', label: 'History', icon: <ClockIcon /> }
]

export function Layout({
  route,
  onNavigate,
  online,
  onAdd,
  children
}: {
  route: Route
  onNavigate: (route: Route) => void
  online: boolean
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <button
          type="button"
          className="wordmark"
          onClick={() => onNavigate('dashboard')}
          aria-label="Badyet home"
        >
          <span className="wordmark-line">
            Badyet<span className="wordmark-period">.</span>
          </span>
          <span className="wordmark-sub">budget + expense tracking</span>
        </button>

        <nav className="nav-desktop" aria-label="Main navigation">
          {NAV.map((item) => (
            <button
              key={item.route}
              type="button"
              className={`nav-item${route === item.route ? ' is-active' : ''}`}
              onClick={() => onNavigate(item.route)}
              aria-current={route === item.route ? 'page' : undefined}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <span className={`net-line ${online ? '' : 'is-offline'}`}>
            <span className="net-dot" aria-hidden="true" />
            {online ? 'Online · still local-first' : 'Offline · fully usable'}
          </span>
          <p className="muted xsmall">
            No accounts. No sync. Your data stays in this browser.
          </p>
          <p className="credit xsmall">
            Developed by <strong>Deo Trinidad</strong>
          </p>
        </div>
      </aside>

      <div className="main-wrap">
        <header className="topbar">
          <button
            type="button"
            className="wordmark wordmark-sm"
            onClick={() => onNavigate('dashboard')}
            aria-label="Badyet home"
          >
            <span className="wordmark-line">
              Badyet<span className="wordmark-period">.</span>
            </span>
          </button>
          <div className="topbar-right">
            {!online ? <span className="offline-chip">Offline</span> : null}
            <button
              type="button"
              className={`icon-btn${route === 'setup' ? ' is-active' : ''}`}
              onClick={() => onNavigate('setup')}
              aria-label="Setup and data"
            >
              <SettingsIcon />
            </button>
          </div>
        </header>
        <main className="main">
          {children}
        </main>
      </div>

      {route !== 'add' ? (
        <button type="button" className="fab" onClick={onAdd} aria-label="Add expense">
          <PlusIcon width={24} height={24} />
        </button>
      ) : null}

      <nav className="nav-mobile" aria-label="Main navigation">
        {MOBILE_NAV.map((item) => (
          <button
            key={item.route}
            type="button"
            className={`nav-mobile-item${route === item.route ? ' is-active' : ''}`}
            onClick={() => onNavigate(item.route)}
            aria-current={route === item.route ? 'page' : undefined}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
