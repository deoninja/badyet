import { useEffect, useState } from 'react'

export function useOnline(): boolean {
  const [online, setOnline] = useState(() =>
    typeof navigator === 'undefined' ? true : navigator.onLine
  )

  useEffect(() => {
    const goOnline = () => setOnline(true)
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return online
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let promptEvent: BeforeInstallPromptEvent | null = null
let installed = false
const installListeners = new Set<() => void>()

function emitInstallChange() {
  for (const listener of installListeners) listener()
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    promptEvent = event as BeforeInstallPromptEvent
    emitInstallChange()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    promptEvent = null
    emitInstallChange()
  })
}

export function useInstallPrompt() {
  const [, forceRender] = useState(0)

  useEffect(() => {
    const listener = () => forceRender((value) => value + 1)
    installListeners.add(listener)
    return () => {
      installListeners.delete(listener)
    }
  }, [])

  const install = async () => {
    const event = promptEvent
    if (!event) return
    await event.prompt()
    await event.userChoice
    promptEvent = null
    emitInstallChange()
  }

  return { canInstall: promptEvent !== null, installed, install }
}
