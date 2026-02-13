'use client';

import { useState, useEffect } from 'react';

/**
 * A custom hook that tracks the state of a CSS media query.
 * @param query The media query string to watch.
 * @returns `true` if the media query matches, otherwise `false`.
 */
export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(false);

  useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = window.matchMedia(query);
    result.addEventListener('change', onChange);
    setValue(result.matches);

    return () => result.removeEventListener('change', onChange);
  }, [query]);

  return value;
}
