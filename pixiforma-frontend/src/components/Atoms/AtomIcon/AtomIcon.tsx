import { IAtomIcon } from '@/interfaces';
import { iconComponents } from './IconTypes';

const AtomIcon = ({
    name,
    size = 'text-large',
    color,
    className,
    handleClick,
    style,
}: IAtomIcon) => {
    
    const IconComponent = iconComponents[name]
    if (!IconComponent) return null

    return (
        <IconComponent
            className={`${className} ${size} ${color}`}
            onClick={handleClick}
            style={style}
        />
    )
}

export default AtomIcon
