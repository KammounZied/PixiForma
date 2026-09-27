import { EButtonType } from '@/Enum/Enum';
import { IAtomButton } from '@/interfaces';
import { Icon, Spinner } from '..';

const AtomButton = ({
    className = '',
    text,
    type = EButtonType.primary,
    disabled = false,
    style = {},
    onClick,
    isLoading = false,
    id,
    spinnerColor = '#FFFFFF',
    spinnerSize = '24px',
    icon,
}: IAtomButton) => {

    const defaultColors: Record<any, string> = {
        [EButtonType.primary]: 'bg-button-primary hover:bg-button-primary-pressed text-white',
        [EButtonType.secondary]: 'bg-button-secondary hover:bg-button-secondary-pressed text-primary border border-primary',
        [EButtonType.tertiary]: 'bg-button-tertiary hover:bg-button-tertiary-pressed text-white',
        [EButtonType.gray]: 'bg-button-gray hover:bg-button-gray-pressed text-black',
    }

    const disabledClasses = disabled ? '!cursor-not-allowed opacity-50' : ''
    const buttonClasses = [
        'relative flex items-center cursor-pointer justify-center rounded px-4 h-12',
        defaultColors[type],
        disabledClasses,
        className,
    ].filter(Boolean).join(' ')

    if (EButtonType.iconButton && icon) {
        return <button
            onClick={onClick}
            className="flex items-center justify-center border-none rounded-full p-0 h-10 w-10 cursor-pointer ml-auto bg-secondary-gris-clair hover:opacity-[70%]"
        >
            <Icon size={icon?.size} name={icon?.name} color={icon?.color} />
        </button>
    }
    return (
        <button
            className={buttonClasses}
            style={style}
            disabled={disabled}
            onClick={onClick}
            id={id}
        >
            {isLoading ? (
                <Spinner size={spinnerColor} color={spinnerSize} />
            )
                :
                <span className={"relative w-full flex items-center justify-center"}>
                    {text}
                </span>
            }

        </button>
    )
}

export default AtomButton
