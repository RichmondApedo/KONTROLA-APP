'use client';

import React, { useState, useEffect } from 'react';
import { Share, PlusSquare, Monitor, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Logo } from '@/components/logo';

export function triggerPWAInstall() {
  window.dispatchEvent(new CustomEvent('kontrola:trigger-pwa-install'));
}

export function PWAInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // 1. Check if already installed (standalone mode)
    const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
                               || (window.navigator as any).standalone 
                               || document.referrer.includes('android-app://');
    
    setIsStandalone(isInStandaloneMode);

    if (isInStandaloneMode) {
      localStorage.setItem('pwa_installed', 'true');
    }

    const isKnownInstalled = localStorage.getItem('pwa_installed') === 'true';

    // 2. Check if user dismissed it recently
    const isDismissed = localStorage.getItem('pwa_prompt_dismissed');
    
    // 3. Detect iOS
    const isIosDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIos(isIosDevice);

    // 4. Handle Chrome/Android "beforeinstallprompt"
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Only show if not installed and not dismissed
      if (!isInStandaloneMode && !isKnownInstalled && !isDismissed) {
        // Small delay to let the dashboard load first
        setTimeout(() => setShowPrompt(true), 3000);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 5. Handle actual installation success
    const handleAppInstalled = () => {
      localStorage.setItem('pwa_installed', 'true');
      setShowPrompt(false);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // 6. Handle manual trigger
    const handleManualTrigger = () => {
      setShowPrompt(true);
    };
    window.addEventListener('kontrola:trigger-pwa-install', handleManualTrigger);

    // 7. Special logic for iOS (since there is no event)
    if (isIosDevice && !isInStandaloneMode && !isKnownInstalled && !isDismissed) {
       setTimeout(() => setShowPrompt(true), 4000);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('kontrola:trigger-pwa-install', handleManualTrigger);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setShowPrompt(false);
      localStorage.setItem('pwa_installed', 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    // Remember dismissal for 7 days (simplified)
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (isStandalone || !showPrompt) return null;

  return (
    <Dialog open={showPrompt} onOpenChange={setShowPrompt}>
      <DialogContent className="sm:max-w-[425px] overflow-hidden rounded-3xl border-primary/20 bg-background/95 backdrop-blur-xl">
        <DialogHeader className="items-center text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-inner">
                <Logo className="h-10 w-10" />
            </div>
          <DialogTitle className="text-2xl font-bold tracking-tight">Install Kontrola</DialogTitle>
          <DialogDescription className="text-balance text-muted-foreground">
            Get the full app experience on your phone for faster access and real-time insights.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="py-6">
            {isIos ? (
              <div className="space-y-6 rounded-2xl bg-muted/50 p-6 border border-border/50">
                <p className="text-center text-sm font-medium">To install on your iPhone:</p>
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                      <Share className="h-5 w-5 text-blue-500" />
                    </div>
                    <p className="text-sm">1. Tap the <span className="font-bold">Share</span> button in Safari</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-background shadow-sm">
                      <PlusSquare className="h-5 w-5" />
                    </div>
                    <p className="text-sm">2. Select <span className="font-bold">Add to Home Screen</span></p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <Button 
                  onClick={handleInstallClick} 
                  className="h-12 w-full rounded-xl text-base font-bold shadow-[0_0_20px_rgba(var(--primary),0.3)] transition-all hover:scale-[1.02]"
                >
                  <Smartphone className="mr-2 h-5 w-5" />
                  Install App Now
                </Button>
                <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-semibold opacity-70">
                  <Monitor className="h-3 w-3" />
                  Works on Android, Chrome, & Edge
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="flex flex-col gap-2 border-t pt-4">
            <Button variant="ghost" onClick={handleDismiss} className="text-muted-foreground">
                Maybe Later
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
