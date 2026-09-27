import { AnimatePresence, motion } from 'framer-motion'
import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
  MouseEvent,
} from 'react'
import { Portal } from 'react-portal'
import WithChildren from '@/types/WithChildren'
import { useModals } from './ModalsContext'
import { IModalContextProps } from '@/interfaces/Contexts/Modal/IModalContextProps'
import { IUseModalProps } from '@/interfaces/Contexts/Modal/IUseModalProps'
import { Div } from '@/components/Atoms'

const Overlay = () => (
  <motion.div
    className="fixed inset-0 z-modal bg-black"
    initial={{ opacity: 0 }}
    animate={{ opacity: 0.5 }}
    exit={{ opacity: 0.5 }}
    transition={{ ease: 'easeInOut', duration: 0.2 }}
  />
)

const ModalPortal = ({ children }: WithChildren) => {
  const { registerModal, unregisterModal } = useModals()
  const { closeModal, canCloseOnClickOutside, isDrawer, isLeftDrawer } = useCurrentModal()

  useEffect(() => {
    registerModal()
    return () => {
      unregisterModal()
    }
  }, [])

  const onClick = (e: MouseEvent<HTMLDivElement, MouseEvent>) => {
    e.stopPropagation()
    canCloseOnClickOutside && closeModal()
  }

  return (
    <Portal node={document.getElementById('modal-portal')}>
      <Overlay />
      <Div
        className={`fixed z-modal ${isDrawer ? `flex items-center ${isLeftDrawer ? 'justify-start' : 'justify-end'} top-0 right-0 w-full` : 'flex items-center justify-center inset-0'}`}
        onClickSelf={onClick}
        style={{
          left: isLeftDrawer ? document?.getElementById('siderbar')?.offsetWidth : 0
        }}
      >
        {children}
      </Div>
    </Portal>
  )
}

const ModalContext = createContext<IModalContextProps>({
  closeModal: () => undefined,
  canClose: false,
  canCloseOnClickOutside: false,
  isDrawer: false,
  isLeftDrawer: false,
})

export const useModal = ({ closeCallBack = () => { } }: IUseModalProps = {}) => {
  const [open, setOpen] = useState(false)
  const [canClose, setCanClose] = useState(false)
  const [canCloseOnClickOutside, setCanCloseOnClickOutside] = useState(false)
  const [isDrawer, setIsDrawer] = useState(false)
  const [isLeftDrawer, setIsLeftDrawer] = useState(false)

  const modalPortal = (children: ReactNode) => (
    <ModalContext.Provider
      value={{
        closeModal: () => {
          setOpen(false)
          closeCallBack()
        },
        canClose,
        canCloseOnClickOutside,
        isDrawer,
        isLeftDrawer,
        setCanClose,
        setCanCloseOnClickOutside,
        setIsDrawer,
        setIsLeftDrawer,
      }}
    >
      <AnimatePresence>
        {open && <ModalPortal>{children}</ModalPortal>}
      </AnimatePresence>
    </ModalContext.Provider>
  )

  return {
    openModal: () => setOpen(true),
    closeModal: () => {
      setOpen(false)
      closeCallBack()
    },
    modalPortal,
  }
}

export const useCurrentModal = () => {
  return useContext(ModalContext)
}
