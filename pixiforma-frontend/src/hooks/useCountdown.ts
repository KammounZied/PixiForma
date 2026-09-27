import { useState, useEffect } from 'react';

export default function useCountdown(initialTime: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
}) {
    const [timeLeft, setTimeLeft] = useState(initialTime);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                const { days, hours, minutes, seconds } = prev;

                if (seconds > 0) {
                    return { ...prev, seconds: seconds - 1 };
                } else if (minutes > 0) {
                    return { ...prev, minutes: minutes - 1, seconds: 59 };
                } else if (hours > 0) {
                    return { ...prev, hours: hours - 1, minutes: 59, seconds: 59 };
                } else if (days > 0) {
                    return { ...prev, days: days - 1, hours: 23, minutes: 59, seconds: 59 };
                } else {
                    clearInterval(timer);
                    return prev;
                }
            });
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return timeLeft;
}
