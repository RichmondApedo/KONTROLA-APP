'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This component now acts as a permanent redirect to the canonical signup page.
export default function AuthSignupPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/signup');
  }, [router]);

  // Render nothing as it will redirect immediately.
  return null;
}
