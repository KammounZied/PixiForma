import { twMerge } from 'tailwind-merge'
import { Icon } from '..'
import { IAtomSpinner } from '@/interfaces'

const AtomSpinner = (props: IAtomSpinner) => {

    return (
        <div className={twMerge(props.className, `animate-[spin_2s_linear_infinite] w-fit`)}>
            <Icon
                name='loader'
                className={props.className}
                color={props.color}
                size={props.size}
            />
        </div>
    )
}

export default AtomSpinner
