import { ReactNode } from 'react'

interface IMoleculeModal {
    canClose?: boolean
    canCloseOnClickOutisde?: boolean
    className?: string
    bodyClassName?: string
    title?: string | ReactNode
    isDrawer?: boolean
    subTitle?: string | ReactNode
}

export type { IMoleculeModal }
