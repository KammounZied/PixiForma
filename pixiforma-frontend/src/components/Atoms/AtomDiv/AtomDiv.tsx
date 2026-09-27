import { HTMLAttributes, ReactNode, useEffect, useRef, MouseEvent } from 'react'

type Props = HTMLAttributes<HTMLDivElement> & {
    children?: ReactNode
    onClickSelf?: (e: MouseEvent<HTMLDivElement, MouseEvent>) => void
}

const AtomDiv = ({ onClickSelf, ...rest }: Props) => {
    const myRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const handleClick = (event: any) => {
            if (myRef.current && event.target === myRef.current) {
                onClickSelf?.(event)
            }
        }

        document.addEventListener('click', handleClick, true)
        return () => {
            document.removeEventListener('click', handleClick, true)
        }
    }, [myRef, onClickSelf])

    return <div {...rest} ref={myRef} />
}

export default AtomDiv
