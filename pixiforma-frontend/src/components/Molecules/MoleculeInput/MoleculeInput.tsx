import { AtomInput, Icon, Label } from '@/components/Atoms'
import { EInputType, ETypographyType, IconComponentsEnum } from '@/Enum/Enum'
import { IMoleculeInput } from '@/interfaces'
import { forwardRef, useState, useRef } from 'react'

const MoleculeInput = forwardRef<HTMLInputElement, IMoleculeInput>(
    (
        {
            error,
            leftIcon,
            rightIcon,
            className = '',
            disabled,
            readOnly,
            isPassword,
            type,
            label,
            hintText,
            required,
            id,
            containerClassName = '',
            onChange,
            onClick,
            isTextArea = false,
            rows,
            placeholder,
            value,
            accept,
        },
        ref
    ) => {
        const [inputType, setInputType] = useState(type || (isPassword ? 'password' : undefined))
        const fileInputRef = useRef<HTMLInputElement>(null)
        const hintClassName = ["mt-1 text-secondary-gris-fonce"]
        const defaultIconClassName = ['absolute right-4 cursor-pointer select-none']
        const defaultLeftIconClassName = ['absolute left-4 select-none']
        if (error) hintClassName.push('!text-error')

        const handleInputClick = (e: React.MouseEvent<HTMLInputElement>) => onClick?.(e);
        const handleOnChangeInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(e);
        };
        const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            onChange?.(e)
        }
        const handleFileInputClick = () => fileInputRef.current?.click()

        const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
            const allowedKeys = new Set(['Backspace', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown']);
            const keyNumber = Number(e.key);

            if (inputType === EInputType.number) {
                const isNumber = !Number.isNaN(keyNumber);
                const isDecimalSeparator = e.key === '.' || e.key === ',';
                const hasDecimalAlready = e.currentTarget.value.includes('.') || e.currentTarget.value.includes(',');

                if (!isNumber && !isDecimalSeparator && !allowedKeys.has(e.key)) {
                    e.preventDefault();
                }

                if (isDecimalSeparator && hasDecimalAlready) {
                    e.preventDefault();
                }
            }

            if (inputType === EInputType.intNumber) {
                const isNumber = !Number.isNaN(keyNumber);
                if (!isNumber && !allowedKeys.has(e.key)) {
                    e.preventDefault();
                }
            }
        };

        const renderHintText = () => {
            return <div className='flex items-center mt-1 gap-1'>
                <Icon
                    color={error ? 'text-error' : 'text-secondary-gris-fonce'}
                    className={''}
                    name={IconComponentsEnum.info}
                    size="text-large"
                />

                <Label
                    className={hintClassName.join(' ')}
                    typeStyle={ETypographyType.BodySmallRegular}
                >
                    {hintText}
                </Label>
            </div>
        }

        if (type === 'file') {
            return (
                <div className={`w-full flex flex-col ${containerClassName}`}>
                    {label && (
                        <Label
                            className={'mb-1'}
                            typeStyle={ETypographyType.BodySmallRegular}
                        >
                            {label}
                            {required && (
                                <Label className="ml-1 text-primary align-middle">*</Label>
                            )}
                        </Label>
                    )}
                    <div className="relative">
                        <input
                            ref={fileInputRef}
                            type="file"
                            id={id}
                            className="hidden"
                            onChange={handleFileChange}
                            disabled={disabled}
                            accept={accept}
                        />
                        <button
                            type="button"
                            onClick={handleFileInputClick}
                            disabled={disabled}
                            className={`flex items-center justify-between w-full h-12 bg-secondary-gris-clair border border-secondary-gris-fonce rounded-md px-4 py-4 text-left cursor-pointer
    hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500
    disabled:bg-secondary-gris-clair disabled:cursor-not-allowed
    ${error ? 'border-error focus:ring-error focus:border-error' : ''}
    ${className || ''}`
                            }
                        >
                            <div className="w-full flex items-center justify-between">
                                <span className={value ? 'text-black' : 'text-secondary-gris-fonce opacity-70'}>
                                    {value || placeholder || 'Choose a file...'}
                                </span>
                                {rightIcon && (
                                    <Icon
                                        color={error ? 'text-error' : 'text-primary'}
                                        name={rightIcon}
                                        size="text-large"
                                    />
                                )}
                            </div>
                        </button>
                    </div>
                    {hintText && renderHintText()}
                </div>
            )
        }

        return (
            <div className={`w-full flex flex-col ${containerClassName}`}>
                {label && (
                    <Label
                        className={'mb-1'}
                        typeStyle={ETypographyType.BodySmallRegular}
                    >
                        {label}
                        {required && (
                            <Label className="ml-1 text-primary align-middle">*</Label>
                        )}
                    </Label>
                )}
                <div className="relative flex items-center">
                    <AtomInput
                        className={`${className} ${leftIcon ? 'pl-11' : ''}`}
                        ref={ref}
                        disabled={disabled}
                        readOnly={readOnly}
                        error={error}
                        type={inputType}
                        id={id}
                        onClick={handleInputClick}
                        onChange={handleOnChangeInput}
                        isTextArea={isTextArea}
                        rows={rows}
                        onKeyDown={(e: any) => handleKeyDown(e)}
                        placeholder={placeholder}
                        value={value}
                    />
                    {isPassword && !rightIcon && (
                        <Icon
                            color={error ? 'text-error' : 'text-secondary-gris-fonce'}
                            className={defaultIconClassName.join(' ')}
                            handleClick={() =>
                                setInputType(inputType === 'password' ? 'text' : 'password')
                            }
                            name={inputType === 'password' ? 'eye' : 'eyeClose'}
                            size="text-large"
                        />
                    )}
                    {leftIcon && (
                        <Icon
                            color={error ? 'text-error' : 'text-secondary-gris-fonce'}
                            className={defaultLeftIconClassName.join(' ')}
                            name={leftIcon}
                            size="text-large"
                        />
                    )}
                    {rightIcon && (
                        <Icon
                            color={error ? 'text-error' : 'text-secondary-gris-fonce'}
                            className={defaultIconClassName.join(' ')}
                            name={rightIcon}
                            size="text-large"
                        />
                    )}
                </div>
                {hintText && renderHintText()}
            </div >
        )
    }
)

MoleculeInput.displayName = 'MoleculeInput'

export default MoleculeInput
