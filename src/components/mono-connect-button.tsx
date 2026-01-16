'use client';

import { Button } from '@/components/ui/button';
import { Link as LinkIcon, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { useUser } from '@/firebase';
import { exchangeTokenForAccount } from '@/ai/flows/link-account-flow';

// Define the interface for the Mono Connect options
declare global {
    interface Window {
        MonoConnect: any;
    }
}

export function MonoConnectButton() {
  const { toast } = useToast();
  const { user } = useUser();
  const [isLoading, setIsLoading] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [monoPublicKey, setMonoPublicKey] = useState<string | null>(null);

  // Fetch public key from API route to avoid build-time env issues
  useEffect(() => {
    async function fetchKey() {
      try {
        const response = await fetch('/api/mono-key');
        const data = await response.json(); // Read body regardless of status
        if (!response.ok) {
          // Use the error message from the API if available
          throw new Error(data.error || 'Failed to fetch configuration');
        }
        setMonoPublicKey(data.publicKey);
      } catch (error: any) {
        console.error("Failed to fetch mono public key", error);
        toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: error.message || 'Could not load account linking configuration. Please try again.',
        });
      }
    }
    fetchKey();
  }, [toast]);


  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://connect.withmono.com/connect.js';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    script.onerror = () => {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: 'Could not load the account connection script. Please check your internet connection and try again.'
        });
    };
    document.body.appendChild(script);

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, [toast]);


  const handleSuccess = async (response: { code: string }) => {
    if (!user) {
        toast({ variant: 'destructive', title: 'You must be signed in.' });
        return;
    }
    setIsLoading(true);
    try {
        const result = await exchangeTokenForAccount({ code: response.code, userId: user.uid });
        if (result.success) {
            toast({ title: 'Success!', description: result.message });
        } else {
            throw new Error(result.message);
        }
    } catch (error: any) {
        toast({
            variant: 'destructive',
            title: 'Account Linking Failed',
            description: error.message || 'An unexpected error occurred.',
        });
    } finally {
        setIsLoading(false);
    }
  };

  const handleClick = () => {
    if (!monoPublicKey) {
        toast({
            variant: 'destructive',
            title: 'Configuration Error',
            description: 'The account linking feature is not configured correctly. Please contact support.',
        });
        return;
    }

    const monoConnect = new window.MonoConnect({
      key: monoPublicKey,
      onSuccess: handleSuccess,
      onClose: () => console.log('Mono widget closed.'),
    });

    monoConnect.open();
  };

  const isDisabled = isLoading || !isScriptLoaded || !monoPublicKey;

  return (
    <Button onClick={handleClick} disabled={isDisabled}>
      {isLoading || !isScriptLoaded || !monoPublicKey ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LinkIcon className="mr-2 h-4 w-4" />
      )}
      {isLoading ? 'Linking...' : 'Connect New Account'}
    </Button>
  );
}
