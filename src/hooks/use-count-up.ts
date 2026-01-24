'use client';

import { useState, useEffect } from 'react';

/**
 * A custom hook to animate a number from a start value to an end value.
 * @param end The final number.
 * @param duration The duration of the animation in milliseconds.
 * @returns The current value of the animated number.
 */
export function useCountUp(end: number, duration: number = 1500) {
  const [count, setCount] = useState(0);
  
  // Easing function for a more natural animation
  const easeOutExpo = (t: number) => {
    return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
  };

  useEffect(() => {
    let startTime: number;
    let animationFrameId: number;

    const animate = (timestamp: number) => {
      if (!startTime) {
        startTime = timestamp;
      }

      const progress = timestamp - startTime;
      const progressFraction = Math.min(progress / duration, 1);
      const easedProgress = easeOutExpo(progressFraction);
      
      const currentValue = Math.round(easedProgress * end);

      setCount(currentValue);

      if (progress < duration) {
        animationFrameId = requestAnimationFrame(animate);
      } else {
        setCount(end); // Ensure it ends on the exact value
      }
    };

    // Start the animation
    animationFrameId = requestAnimationFrame(animate);

    // Cleanup function to cancel the animation on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [end, duration]);

  return count;
}
