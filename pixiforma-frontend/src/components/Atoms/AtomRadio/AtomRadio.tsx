import { ERadioStatus, ESizeRadio } from '@/Enum/Enum';
import { IAtomRadio } from '@/interfaces/Atoms/IAtomRadio/IAtomRadio';
import { twMerge } from 'tailwind-merge';

const AtomRadio = ({ status = ERadioStatus.unchecked, size = 'md', onClick, id, disabled = false }: IAtomRadio) => {
    const baseClasses = [
        'p-0.5',
        'border',
        'rounded-full',
        'justify-center',
        'items-center',
        'inline-flex',
        'border-primary',
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
        ESizeRadio[size],
        'bg-white'
    ];

    const handleClick = (e: any) => {
        if (disabled) return;
        onClick?.(e);
    };

    const roundCheckedSize = () => {
        switch (size) {
            case 'sm':
                return 'w-2 h-2';
            case 'lg':
                return 'w-3 h-3';
            case 'md':
            default:
                return 'w-2.5 h-2.5';
        }
    }

    return (
        <div
            id={id}
            className={twMerge(baseClasses)}
            onClick={handleClick}
            role="none"
        >
            {status === ERadioStatus.checked && (
                <div className={twMerge(
                    'rounded-full',
                    roundCheckedSize(),
                    'mx-auto my-auto',
                    'bg-primary'
                )} />
            )}
        </div>
    );
};

export default AtomRadio; 