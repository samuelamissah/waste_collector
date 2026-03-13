'use client'

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'

type ToastVariant = 'success' | 'error' | 'warning' | 'info'

type ToastItem = {
  id: string
  variant: ToastVariant
  title?: string
  message: string
  createdAt: number
  durationMs: number
}

type ToastInput = {
  variant: ToastVariant
  title?: string
  message: string
  durationMs?: number
}

type ToastApi = {
  push: (input: ToastInput) => void
  dismiss: (id: string) => void
  success: (message: string, title?: string) => void
  error: (message: string, title?: string) => void
  warning: (message: string, title?: string) => void
  info: (message: string, title?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

function createToastId() {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`
  return random
}

function classesForVariant(variant: ToastVariant) {
  if (variant === 'success') return 'border-green-200 bg-green-50 text-green-900'
  if (variant === 'error') return 'border-red-200 bg-red-50 text-red-900'
  if (variant === 'warning') return 'border-amber-200 bg-amber-50 text-amber-900'
  return 'border-blue-200 bg-blue-50 text-blue-900'
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const push = useCallback(
    ({ variant, title, message, durationMs }: ToastInput) => {
      const id = createToastId()
      const normalizedDuration = typeof durationMs === 'number' && durationMs > 0 ? durationMs : 3500
      const item: ToastItem = {
        id,
        variant,
        title,
        message,
        createdAt: Date.now(),
        durationMs: normalizedDuration,
      }
      setToasts((prev) => [item, ...prev].slice(0, 5))

      const timer = window.setTimeout(() => dismiss(id), normalizedDuration)
      timers.current.set(id, timer)
    },
    [dismiss]
  )

  const api = useMemo<ToastApi>(
    () => ({
      push,
      dismiss,
      success: (message, title) => push({ variant: 'success', title, message }),
      error: (message, title) => push({ variant: 'error', title, message, durationMs: 6000 }),
      warning: (message, title) => push({ variant: 'warning', title, message, durationMs: 5000 }),
      info: (message, title) => push({ variant: 'info', title, message }),
    }),
    [dismiss, push]
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-sm backdrop-blur ${classesForVariant(t.variant)} dark:border-white/[.145] dark:bg-black dark:text-zinc-50`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {t.title ? <div className="text-sm font-semibold">{t.title}</div> : null}
                <div className="mt-0.5 text-sm text-zinc-700 dark:text-zinc-200">{t.message}</div>
              </div>
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="rounded-lg border border-black/[.08] bg-white/40 px-2 py-1 text-xs text-zinc-900 transition-colors hover:bg-white/70 dark:border-white/[.145] dark:bg-white/[.06] dark:text-zinc-50 dark:hover:bg-white/[.1]"
                aria-label="Dismiss"
              >
                Close
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const api = useContext(ToastContext)
  if (!api) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return api
}

