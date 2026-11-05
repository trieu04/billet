/* oxlint-disable react/only-export-components */
import { CircleCheck, CircleX } from 'lucide-react'
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'

type Toast = { id: number; message: string; tone: 'success' | 'error' }
type ToastValue = { show(message: string, tone?: Toast['tone']): void }

const ToastContext = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: PropsWithChildren) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const show = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = (nextId.current += 1)
    setToasts((current) => [...current, { id, message, tone }])
    window.setTimeout(() => setToasts((current) => current.filter((item) => item.id !== id)), 4000)
  }, [])
  const value = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-[110] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="pointer-events-auto flex items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-float"
          >
            {toast.tone === 'success' ? (
              <CircleCheck className="size-4 text-[#7fd3b3]" aria-hidden />
            ) : (
              <CircleX className="size-4 text-[#f6a787]" aria-hidden />
            )}
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext)
  if (!value) throw new Error('useToast must be used inside ToastProvider')
  return value
}
