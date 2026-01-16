'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

declare global {
    interface Window {
        MonoConnect: any;
    }
}

export function useMonoConnect(publicKey: string) {
    const [isReady, setIsReady] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!publicKey) return;

        const scriptId = 'mono-connect-script';
        if (document.getElementById(scriptId)) {
            if (window.MonoConnect) {
                setIsReady(true);
            }
            return;
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://connect.withmono.com/connect.js';
        script.async = true;

        script.onload = () => {
            if (window.MonoConnect) {
                setIsReady(true);
            }
        };

        script.onerror = () => {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Could not load the connection script. Please check your internet connection.',
            });
        };

        document.body.appendChild(script);

        return () => {
            const existingScript = document.getElementById(scriptId);
            if (existingScript) {
                document.body.removeChild(existingScript);
            }
        };
    }, [publicKey, toast]);

    const open = (onSuccess: (response: { code: string }) => void) => {
        if (!isReady || !window.MonoConnect) {
            toast({
                variant: 'destructive',
                title: 'Not Ready',
                description: 'The connection service is not yet available. Please wait a moment and try again.',
            });
            return;
        }

        const monoInstance = new window.MonoConnect({
            key: publicKey,
            onSuccess,
            onClose: () => {
                console.log('Mono widget closed');
            },
        });
        monoInstance.open();
    };

    return { isReady, open };
}
