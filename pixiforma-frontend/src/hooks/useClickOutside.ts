import { useEffect, useRef, RefObject } from 'react';

const useClickOutside = <T extends HTMLElement = HTMLElement>(
    handler: (event: Event) => void,
    excludeRef?: RefObject<T | null>
): RefObject<T | null> => {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        const handleClickOutside = (event: Event) => {
            const target = event.target as Node;
            if (
                ref.current &&
                !ref.current.contains(target) &&
                (!excludeRef?.current || !excludeRef.current.contains(target))
            ) {
                handler(event);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [handler, excludeRef]);

    return ref;
};

export default useClickOutside;
