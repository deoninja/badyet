import { useEffect, useState } from 'react'
import { useInstallPrompt } from '../hooks/usePwa'
import { XIcon } from './icons'

const SEEN_KEY = 'badyet:install-prompt-seen'

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = navigator as Navigator & { standalone?: boolean }
  return window.matchMedia('(display-mode: standalone)').matches || nav.standalone === true
}

function isIos(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

function rememberPrompt(): void {
  try {
    window.localStorage.setItem(SEEN_KEY, '1')
  } catch {
    // Storage may be unavailable; the prompt will simply show again next time.
  }
}

function wasPromptSeen(): boolean {
  try {
    return window.localStorage.getItem(SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function InstallPrompt() {
  const { canInstall, installed, install } = useInstallPrompt()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (isStandalone() || wasPromptSeen()) return
    const timer = window.setTimeout(() => setVisible(true), 1400)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!installed) return
    rememberPrompt()
    setVisible(false)
  }, [installed])

  useEffect(() => {
    if (!visible) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        rememberPrompt()
        setVisible(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [visible])

  if (!visible) return null

  const dismiss = () => {
    rememberPrompt()
    setVisible(false)
  }

  const startInstall = async () => {
    rememberPrompt()
    setVisible(false)
    await install()
  }

  return (
    <div className="install-prompt" role="dialog" aria-labelledby="install-prompt-title">
      <div className="install-prompt-head">
        <div>
          <span className="eyebrow">Install Badyet</span>
          <h2 id="install-prompt-title">Keep your budget one tap away</h2>
        </div>
        <button
          type="button"
          className="icon-btn icon-btn-sm"
          onClick={dismiss}
          aria-label="Dismiss install message"
        >
          <XIcon width={15} height={15} />
        </button>
      </div>
      <p className="xsmall muted install-prompt-copy">
        Add Badyet to your home screen for one-tap access and full offline use. It stays on this
        device and never asks for an account.
      </p>
      <div className="install-prompt-actions">
        {canInstall ? (
          <button type="button" className="btn btn-primary btn-sm" onClick={() => void startInstall()}>
            Install app
          </button>
        ) : (
          <span className="xsmall muted install-prompt-hint">
            {isIos()
              ? 'Tap Share, then choose “Add to Home Screen”.'
              : 'Open your browser menu and choose “Install app” or “Add to Home Screen”.'}
          </span>
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={dismiss}>
          Not now
        </button>
      </div>
    </div>
  )
}
