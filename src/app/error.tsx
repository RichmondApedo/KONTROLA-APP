'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/sentinel';
import { AlertCircle, RefreshCcw } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Automatically report the crash to Sentinel
    reportError(error, undefined, { 
      type: 'GLOBAL_RENDER_CRASH',
      digest: error.digest 
    });
    
    console.error('[Global Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full space-y-8 p-10 bg-card rounded-2xl border border-border shadow-xl text-center">
        <div className="flex justify-center">
          <div className="p-4 bg-destructive/10 rounded-full">
            <AlertCircle className="w-12 h-12 text-destructive" />
          </div>
        </div>
        
        <div className="space-y-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Something went wrong
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            A runtime error occurred. We've logged the incident for our engineers, but you can try refreshing the page to recover.
          </p>
        </div>

        <div className="flex flex-col space-y-3">
          <Button 
            onClick={() => reset()} 
            className="w-full flex items-center justify-center gap-2"
          >
            <RefreshCcw className="w-4 h-4" />
            Try again
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/dashboard'}
            className="w-full"
          >
            Return to Dashboard
          </Button>
        </div>

        {error.digest && (
          <p className="text-[10px] text-muted-foreground pt-4 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
    </div>
  );
}
