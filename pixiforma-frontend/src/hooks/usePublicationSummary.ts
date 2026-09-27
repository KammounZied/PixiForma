'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CommonFunction } from '@/common';

export type SummaryStatus = 'idle' | 'generating' | 'draft' | 'error';

interface UsePublicationSummaryReturn {
    summaryText: string | null;
    setSummaryText: (text: string | null) => void;
    summaryStatus: SummaryStatus;
    generationError: string | null;
    isGenerating: boolean;
    generateSummary: (publicationId: number) => Promise<void>;
    fetchStatus: (publicationId: number) => Promise<void>;
}

export function usePublicationSummary(): UsePublicationSummaryReturn {
    const [summaryText, setSummaryText] = useState<string | null>(null);
    const [summaryStatus, setSummaryStatus] = useState<SummaryStatus>('idle');
    const [generationError, setGenerationError] = useState<string | null>(null);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isPollingRef = useRef(false);

    const stopPolling = useCallback(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        isPollingRef.current = false;
    }, []);

    useEffect(() => {
        return () => {
            stopPolling();
        };
    }, [stopPolling]);

    const fetchStatus = useCallback(async (publicationId: number) => {
        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/publications/${publicationId}/summary-status`, {
                headers,
                cache: 'no-store',
            });
            if (res.ok) {
                const data = await res.json();
                const status: SummaryStatus = data.status || 'idle';
                setSummaryStatus(status);
                if (status === 'draft' && data.summary) {
                    setSummaryText(data.summary);
                } else if (status === 'error') {
                    setGenerationError(data.error || 'Erreur lors de la génération.');
                }
            }
        } catch {
            // silencieux
        }
    }, []);

    const startPolling = useCallback((publicationId: number) => {
        stopPolling();

        pollRef.current = setInterval(async () => {
            if (isPollingRef.current) return;
            isPollingRef.current = true;

            try {
                const headers = await CommonFunction.createHeaders({ withToken: true });
                const res = await fetch(`/api/publications/${publicationId}/summary-status`, {
                    headers,
                    cache: 'no-store',
                });
                if (!res.ok) {
                    isPollingRef.current = false;
                    return;
                }
                const data = await res.json();

                if (data.status === 'draft') {
                    stopPolling();
                    setSummaryStatus('draft');
                    setSummaryText(data.summary || null);
                } else if (data.status === 'error') {
                    stopPolling();
                    setSummaryStatus('error');
                    setGenerationError(data.error || 'Erreur lors de la génération.');
                } else {
                    isPollingRef.current = false;
                }
            } catch {
                isPollingRef.current = false;
            }
        }, 3000);
    }, [stopPolling]);

    const generateSummary = useCallback(async (publicationId: number) => {
        setSummaryStatus('generating');
        setGenerationError(null);
        setSummaryText(null);

        try {
            const headers = await CommonFunction.createHeaders({ withToken: true });
            const res = await fetch(`/api/publications/${publicationId}/generate-summary`, {
                method: 'POST',
                headers,
            });
            const data = await res.json();

            if (res.ok) {
                if (data.status === 'draft' && data.summary) {
                    setSummaryStatus('draft');
                    setSummaryText(data.summary);
                } else {
                    startPolling(publicationId);
                }
            } else {
                setSummaryStatus('error');
                setGenerationError(data.message || 'Erreur lors du lancement de la génération.');
            }
        } catch {
            setSummaryStatus('error');
            setGenerationError('Une erreur inattendue est survenue.');
        }
    }, [startPolling]);

    return {
        summaryText,
        setSummaryText,
        summaryStatus,
        generationError,
        isGenerating: summaryStatus === 'generating',
        generateSummary,
        fetchStatus,
    };
}
