import { ECheckBoxStatus, ESizeCheckBox } from "@/Enum/Enum"
import { MouseEventHandler } from "react"

interface IAtomCheckbox {
    id: string
    status: ECheckBoxStatus
    size?: keyof typeof ESizeCheckBox
    onClick?: MouseEventHandler<HTMLDivElement>
    disabled?: boolean
}

export type { IAtomCheckbox }