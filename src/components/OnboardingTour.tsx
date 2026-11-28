import { useEffect, useRef } from 'react'
import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

interface OnboardingTourProps {
  onClose: () => void
}

function isMobileViewport(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(max-width: 640px)').matches
}

export function OnboardingTour({ onClose }: OnboardingTourProps) {
  const tourRef = useRef<any>(null)
  const isClosingRef = useRef(false)

  useEffect(() => {
    const mobile = isMobileViewport()

    const handleClose = () => {
      if (isClosingRef.current) return
      isClosingRef.current = true
      onClose()
    }

    const tour = driver({
      showProgress: true,
      progressText: '{{current}} of {{total}}',
      nextBtnText: 'Next',
      prevBtnText: 'Back',
      doneBtnText: 'Done',
      allowClose: true,
      overlayColor: 'rgba(9, 22, 16, 0.72)',
      stagePadding: 8,
      stageRadius: 12,
      popoverClass: 'badyet-tour-popover',
      onDestroyed: handleClose,
      onCloseClick: handleClose,
      steps: [
        {
          element: mobile ? '#tour-home-mobile' : '#tour-home',
          popover: {
            title: 'Welcome to Badyet',
            description:
              'Your budget lives here. No accounts, no tracking, no cloud sync. Tap the logo anytime to jump back to your dashboard.',
            side: 'bottom',
            align: 'start'
          }
        },
        {
          element: mobile ? '#tour-mobile-dashboard' : '#tour-dashboard',
          popover: {
            title: 'Dashboard',
            description:
              'Your pay-period overview: what is left to spend, how much you have saved, and recent activity.',
            side: mobile ? 'bottom' : 'right',
            align: 'start'
          }
        },
        {
          element: mobile ? '#tour-mobile-budget' : '#tour-budget',
          popover: {
            title: 'Budget',
            description:
              'Set category caps and give every peso a job. Change the budget method whenever you like.',
            side: mobile ? 'bottom' : 'right',
            align: 'start'
          }
        },
        {
          element: mobile ? '#tour-mobile-goals' : '#tour-goals',
          popover: {
            title: 'Savings goals',
            description:
              'Create targets, track progress, and add money toward them over time.',
            side: mobile ? 'bottom' : 'right',
            align: 'start'
          }
        },
        {
          element: mobile ? '#tour-mobile-history' : '#tour-history',
          popover: {
            title: 'History',
            description:
              'Review every expense you have logged and delete mistakes.',
            side: mobile ? 'bottom' : 'right',
            align: 'start'
          }
        },
        {
          element: '#tour-add-expense',
          popover: {
            title: 'Add expense',
            description:
              'Tap the plus button to quickly log a new expense from any screen.',
            side: 'left',
            align: 'start'
          }
        },
        {
          element: '#tour-settings',
          popover: {
            title: 'Setup',
            description:
              'Change your income, pay schedule, currency, and budget method — or replay this tour.',
            side: 'bottom',
            align: 'start'
          }
        }
      ]
    })

    tourRef.current = tour
    
    const timeout = setTimeout(() => {
      tour.drive()
    }, 200)

    return () => {
      clearTimeout(timeout)
      if (tourRef.current) {
        tourRef.current.destroy()
      }
    }
  }, [onClose])

  return null
}

