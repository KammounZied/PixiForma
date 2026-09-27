import { IconComponentsEnum } from "@/Enum/Enum"
import { CSSProperties } from "react"

interface IAtomIcon {
    name: keyof typeof IconComponentsEnum
    size?: string
    color?: string
    className?: string
    handleClick?: () => void
    style?: CSSProperties
}

export type { IAtomIcon } 