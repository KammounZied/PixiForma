import { EFontFamily } from '@/Enum/Enum'
import typography from '@/theme/typography'
import WithChildren from '@/types/WithChildren'
import { DM_Sans, DM_Mono } from 'next/font/google'

const dmSans = DM_Sans({
    weight: ['400', '500', '600', '700'],
    subsets: ['latin'],
    display: 'swap',
})

const dmMono = DM_Mono({
    weight: ['400', '500'],
    subsets: ['latin'],
    display: 'swap',
})

type LabelProps = WithChildren<{
    weight?: number
    className?: string
    htmlFor?: string
    onClick?: () => void
    fontFamily?: EFontFamily
    typeStyle?: keyof typeof typography.fontSize
}>

const AtomLabel: React.FC<LabelProps> = ({
    weight = 600,
    children,
    className = '',
    fontFamily = EFontFamily.DMSans,
    typeStyle,
    ...rest
}) => {
    const style: React.CSSProperties = typeStyle
        ? {
            fontSize: typography.fontSize[typeStyle].fontSize,
            lineHeight: typography.fontSize[typeStyle].lineHeight,
            fontWeight: typography.fontSize[typeStyle].weight,
        }
        : {}

    const renderWeightClass = () => {
        switch (weight) {
            case 100: return 'font-thin'
            case 200: return 'font-extralight'
            case 300: return 'font-light'
            case 400: return 'font-normal'
            case 500: return 'font-medium'
            case 600: return 'font-semibold'
            case 700: return 'font-bold'
            case 800: return 'font-extrabold'
            case 900: return 'font-black'
            default: return 'font-semibold'
        }
    }

    const renderFontFamilyClass = () => {
        switch (fontFamily) {
            case EFontFamily.DMMono:
                return dmMono.className
            case EFontFamily.DMSans:
            default:
                return dmSans.className
        }
    }

    return (
        <label
            className={`${renderWeightClass()} ${renderFontFamilyClass()} ${className}`}
            {...rest}
            style={style}
        >
            {children}
        </label>
    )
}

export default AtomLabel
