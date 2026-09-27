import { useState, useEffect } from 'react'

export default function useDebounce<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState<T>(value)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebounced(value)
    }, delay)

    return () => {
      clearTimeout(timeout)
    }
  }, [value, delay])

  return debounced
}
