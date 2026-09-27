import { ESize } from "@/Enum/Enum";
import { IMoleculeTabProps } from "@/interfaces/Molecules/IMoleculeTab/IMoleculeTab";

const MoleculeTab = ({ options, value, onChange, size = ESize.lg, buttonClassName = '' }: IMoleculeTabProps) => {

    const getSizeClasses = () => {
        switch (size) {
            case ESize.sm:
                return {
                    container: 'gap-2 p-1',
                    button: 'px-3.5 py-1 text-sm'
                };
            case ESize.md:
                return {
                    container: 'gap-3 p-1',
                    button: 'px-6 py-2 text-sm'
                };
            case ESize.lg:
                return {
                    container: 'gap-4 p-1',
                    button: 'px-10.5 py-3 text-sm'
                };
            default:
                return {
                    container: 'gap-4 p-1',
                    button: 'px-10.5 py-3 text-sm'
                };
        }
    };

    const sizeClasses = getSizeClasses();
    const showBackground = size === ESize.lg;

    const containerClassName = `w-fit inline-flex rounded-xl overflow-hidden ${showBackground ? 'bg-secondary-gris-clair' : 'bg-transparent'} ${sizeClasses.container}`;

    return (
        <div className={containerClassName}>
            {options.map((option) => {
                const isActive = value === option.value;

                const buttonBaseClassName = `
                    font-medium transition-all duration-200 rounded-[50px] border-none cursor-pointer
                    ${isActive ? 'bg-primary-400 text-white hover:opacity-[90%]' : 'text-black hover:bg-primary/20'}
                    ${sizeClasses.button}
                    ${buttonClassName}
                `;

                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={buttonBaseClassName}
                    >
                        {option.label}
                    </button>
                );
            })}
        </div>
    );
};

export default MoleculeTab;