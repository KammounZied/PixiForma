'use client';

import WithChildren from '@/types/WithChildren'
import { createContext, useContext, useRef, useState } from 'react'

const GlobalStyle = ({ isModalOpen }: { isModalOpen: boolean }) => {
  return (
    <style>
      {`
        body {
          ${isModalOpen && 'overflow: hidden;'}
        }
      `}
    </style>
  )
}

const ModalsContext = createContext<{
  countModal?: number,
  registerModal: () => void
  unregisterModal: () => void
}>({
  countModal: 0,
  registerModal: () => undefined,
  unregisterModal: () => undefined,
})

export const ModalsProvider = ({ children }: WithChildren) => {
  const modalContainerRef = useRef<HTMLDivElement | null>(null)

  const [countModal, setCountModal] = useState(0)

  const registerModal = () => {
    setCountModal((previousCountModal) => previousCountModal + 1)
  }

  const unregisterModal = () => {
    setCountModal((previousCountModal) => previousCountModal - 1)
  }

  return (
    <ModalsContext.Provider
      value={{
        countModal,
        registerModal,
        unregisterModal,
      }}
    >
      {children}
      <GlobalStyle isModalOpen={countModal > 0} />
      <div id="modal-portal" ref={modalContainerRef} />
    </ModalsContext.Provider>
  )
}

export const useModals = () => useContext(ModalsContext)
