import { InputHTMLAttributes } from 'react'
import { IconComponentsEnum } from '@/Enum/Enum'

export type IAtomInput = {
    leftIcon?: keyof typeof IconComponentsEnum
    rightIcon?: keyof typeof IconComponentsEnum
    error?: boolean
    disabled?: boolean
    readOnly?: boolean
    className?: string
    isTextArea?: boolean
    rows?: number
    id: string
} & InputHTMLAttributes<HTMLInputElement>
