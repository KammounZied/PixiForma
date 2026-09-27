import { useState, useEffect } from 'react'

export const useScreen = () => {
    const [screenSize, setScreenSize] = useState({
        width: typeof window !== 'undefined' ? window.innerWidth : 0,
        height: typeof window !== 'undefined' ? window.innerHeight : 0,
    });

    useEffect(() => {
        const updateScreenSize = () => {
            setScreenSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        };
        
        updateScreenSize();
        
        window.addEventListener('resize', updateScreenSize);
        
        return () => window.removeEventListener('resize', updateScreenSize);
    }, []);

    const isMobile = screenSize.width < 768;
    const isTablet = screenSize.width >= 768 && screenSize.width < 1024;
    const isDesktop = screenSize.width >= 1024;
    const isSmallMobile = screenSize.width < 480; 
    const isLargeDesktop = screenSize.width >= 1280; 

    return {
        width: screenSize.width,
        height: screenSize.height,
        isMobile,
        isTablet,
        isDesktop,
        isSmallMobile,
        isLargeDesktop,
        isBreakpoint: (breakpoint: number) => screenSize.width < breakpoint,
        screenSize: screenSize.width < 480 ? 'small-mobile' :
                   screenSize.width < 768 ? 'mobile' :
                   screenSize.width < 1024 ? 'tablet' :
                   screenSize.width < 1280 ? 'desktop' : 'large-desktop'
    };
}