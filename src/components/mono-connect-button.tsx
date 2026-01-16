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

interface MonoConnectButtonProps {
    publicKey: string;
}


export function MonoConnectButton({ publicKey }: MonoConnectButtonProps) {
  const { toast } = useToast();
  const { user } = useUser();
  const [isLinking, setIsLinking] = useState(false);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  useEffect(() => {
    const existingScript = document.querySelector('script[src="https://connect.withmono.com/connect.js"]');
    if (existingScript) {
        setIsScriptLoaded(true);
        return;
    }

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
    setIsLinking(true);
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
        setIsLinking(false);
    }
  };

  const handleClick = () => {
    if (!isScriptLoaded || !window.MonoConnect) {
         toast({
            variant: 'destructive',
            title: 'Error',
            description: 'The connection script is not yet loaded. Please wait a moment and try again.'
        });
        return;
    }
    const monoConnect = new window.MonoConnect({
      key: publicKey,
      onSuccess: handleSuccess,
      onClose: () => console.log('Mono widget closed.'),
    });

    monoConnect.open();
  };

  const isDisabled = isLinking || !isScriptLoaded;

  return (
    <Button onClick={handleClick} disabled={isDisabled}>
      {isDisabled ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <LinkIcon className="mr-2 h-4 w-4" />
      )}
      {isLinking ? 'Linking...' : 'Connect New Account'}
    </Button>
  );
}
