import { Dispatch, SetStateAction } from 'react'

interface IModalContextProps {
  closeModal: () => void
  canClose: boolean
  canCloseOnClickOutside: boolean
  isDrawer?: boolean
  isLeftDrawer?: boolean
  setCanClose?: Dispatch<SetStateAction<boolean>>
  setCanCloseOnClickOutside?: Dispatch<SetStateAction<boolean>>
  setIsDrawer?: Dispatch<SetStateAction<boolean>>
  setIsLeftDrawer?: Dispatch<SetStateAction<boolean>>
}

export type { IModalContextProps }
