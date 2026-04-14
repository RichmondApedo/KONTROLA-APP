'use client';

import { useState, useEffect } from 'react';

export function useStandalone() {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = () => {
      const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches 
                                 || (window.navigator as any).standalone 
                                 || document.referrer.includes('android-app://');
      
      setIsStandalone(isInStandaloneMode);
    };

    checkStandalone();

    // Listen for changes (though display-mode doesn't usually change after load)
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const listener = (e: MediaQueryListEvent) => setIsStandalone(e.matches);
    
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  return isStandalone;
}
