import { ECheckBoxStatus, ESizeCheckBox, IconComponentsEnum } from '@/Enum/Enum';
import { twMerge } from 'tailwind-merge';
import { Icon } from '..';
import { IAtomCheckbox } from '@/interfaces';

const AtomCheckbox = ({ status = ECheckBoxStatus.unchecked, size = 'md', onClick, id, disabled = false }: IAtomCheckbox) => {

    const baseClasses = [
        'p-0.5',
        'border',
        'rounded',
        'justify-center',
        'items-center',
        'inline-flex',
        'bg-white',
        'border-primary',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ESizeCheckBox[size],
    ];

    const handelClick = (e: any) => {
        if (disabled) return
        onClick?.(e)
    }

    return (
        <div
            id={id}
            className={twMerge(baseClasses)}
            onClick={handelClick}
            role="none"
        >
            {status !== ECheckBoxStatus.unchecked &&
                <Icon
                    name={IconComponentsEnum.checkbox}
                    color={'text-primary'}
                />}
        </div>
    )
}

export default AtomCheckbox
