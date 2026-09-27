import { IAtomInput } from '@/interfaces/Atoms'
import { InputHTMLAttributes } from 'react'

export type IMoleculeInput = {
    isPassword?: boolean
    label?: string
    hintText?: string
    containerClassName?: string
    id: string,
    isTextArea?: boolean
    rows?: number
} & InputHTMLAttributes<HTMLInputElement> & IAtomInput