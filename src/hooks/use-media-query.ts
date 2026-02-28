'use client';

import { useState, useEffect } from 'react';

/**
 * A custom hook that tracks the state of a CSS media query in a hydration-safe manner.
 * @param query The media query string to watch.
 * @returns `true` if the media query matches, otherwise `false`. Returns `false` on the server.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    // This effect only runs on the client, after hydration.
    const mediaQueryList = window.matchMedia(query);
    
    // Set the initial state based on the client's screen size.
    setMatches(mediaQueryList.matches);

    // Set up a listener for changes.
    const listener = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQueryList.addEventListener('change', listener);

    // Clean up the listener on unmount.
    return () => {
      mediaQueryList.removeEventListener('change', listener);
    };
  }, [query]);

  return matches;
}
