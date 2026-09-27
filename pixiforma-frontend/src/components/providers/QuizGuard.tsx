'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function readActiveQuiz(): any | null {
    try {
        const saved = localStorage.getItem('pixiforma_active_quiz');
        if (!saved) return null;
        const parsed = JSON.parse(saved);
        if (parsed.quizStarted && parsed.formationId && parsed.publicationId && parsed.groupId) {
            return parsed;
        }
        return null;
    } catch {
        localStorage.removeItem('pixiforma_active_quiz');
        return null;
    }
}

function getQuizRedirectUrl(parsed: any): string {
    return `/dashboard/groups/${parsed.groupId}?tab=formations&formation_id=${parsed.formationId}&quiz_pub_id=${parsed.publicationId}`;
}

export default function QuizGuard() {
    const router = useRouter();
    const redirectingRef = useRef(false);

    useEffect(() => {
        const checkQuiz = () => {
            const parsed = readActiveQuiz();
            if (!parsed) return;

            const currentPath = window.location.pathname;
            const onCorrectPath = currentPath.includes(`/dashboard/groups/${parsed.groupId}`);

            if (!onCorrectPath) {
                if (!redirectingRef.current) {
                    redirectingRef.current = true;
                    router.replace(getQuizRedirectUrl(parsed));
                    setTimeout(() => { redirectingRef.current = false; }, 1000);
                }
            } else {
                const params = new URLSearchParams(window.location.search);
                if (
                    params.get('tab') !== 'formations' ||
                    params.get('formation_id') !== String(parsed.formationId) ||
                    params.get('quiz_pub_id') !== String(parsed.publicationId)
                ) {
                    window.history.replaceState(window.history.state, '', getQuizRedirectUrl(parsed));
                }
            }
        };

        checkQuiz();
        const interval = setInterval(checkQuiz, 300);
        return () => clearInterval(interval);
    }, [router]);

    useEffect(() => {
        const handlePopState = () => {
            const parsed = readActiveQuiz();
            if (!parsed) return;
            const currentPath = window.location.pathname;
            if (!currentPath.includes(`/dashboard/groups/${parsed.groupId}`)) {
                router.replace(getQuizRedirectUrl(parsed));
            }
        };

        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, [router]);

    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            const parsed = readActiveQuiz();
            if (parsed) {
                e.preventDefault();
                e.returnValue = '';
                return '';
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, []);

    return null;
}
