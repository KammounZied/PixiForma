import useDisableNumberInputScroll from '@/hooks/useDisableNumberInputScroll';
import { IAtomInput } from '@/interfaces';
import { forwardRef } from 'react';
import { twMerge } from 'tailwind-merge';

const AtomInput = forwardRef<HTMLInputElement | HTMLTextAreaElement, IAtomInput>(
    (
        {
            error,
            className,
            disabled,
            readOnly,
            id,
            isTextArea,
            rows,
            type = 'text',
            value,
            ...rest
        },
        ref
    ) => {
        const defaultClassName = ['checkbox', 'radio', 'file'].includes(type)
            ? []
            : [
                'w-full h-12 bg-secondary-gris-clair rounded-md px-4',
                'placeholder:text-secondary-gris-fonce placeholder:text-sm',
                'border border-transparent',
                'focus:outline-none focus:ring-[0.1px] focus:ring-black focus:border-black',
                'disabled:bg-secondary-gris-clair disabled:cursor-not-allowed disabled:opacity-50'
            ];

        if (className) defaultClassName.push(className);

        if (error) {
            defaultClassName.push(
                'border-error',
                'focus:ring-error',
                'focus:border-error'
            );
        }

        useDisableNumberInputScroll()
        const mergedClassName = twMerge(defaultClassName.join(' '))

        return (
            <>
                {isTextArea ? (
                    <textarea
                        ref={ref as any}
                        className={mergedClassName}
                        disabled={disabled}
                        id={`${id}-textarea`}
                        readOnly={readOnly}
                        rows={rows}
                        value={value}
                        {...rest as any}
                    />
                ) : (
                    <input
                        ref={ref as any}
                        type={type}
                        className={mergedClassName}
                        disabled={disabled}
                        id={id}
                        readOnly={readOnly}
                        value={value}
                         {...rest}
                    />)
                }
            </>
        )
    }
)

AtomInput.displayName = 'AtomInput'

export default AtomInput