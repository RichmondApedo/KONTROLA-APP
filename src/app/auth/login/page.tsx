'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// This component now acts as a permanent redirect to the canonical login page.
export default function AuthLoginPageRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login');
  }, [router]);

  // Render nothing as it will redirect immediately.
  return null;
}
