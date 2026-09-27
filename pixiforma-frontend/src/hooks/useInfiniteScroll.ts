import { useEffect, RefObject } from 'react';

const useInfiniteScroll = (callback: Function, loaderRef: RefObject<HTMLElement>) => {
    useEffect(() => {
        const observer = new IntersectionObserver((entries) => {
            const target = entries[0];
            if (target.isIntersecting) {
                callback();
            }
        });

        if (loaderRef.current) {
            observer.observe(loaderRef.current);
        }

        return () => {
            if (loaderRef.current) {
                observer.unobserve(loaderRef.current);
            }
        };
    }, [callback]);
};

export default useInfiniteScroll;
