'use client';

import { useState, useEffect, type ReactNode } from 'react';

interface ClientOnlyProps {
  children: ReactNode;
}

/**
 * A wrapper component that ensures its children are only rendered on the client-side.
 * This is useful for preventing React hydration errors when using components that
 * rely on browser-specific APIs or generate unique IDs on each render.
 */
export function ClientOnly({ children }: ClientOnlyProps) {
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return null;
  }

  return <>{children}</>;
}
