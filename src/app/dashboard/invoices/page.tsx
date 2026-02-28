'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function InvoicesRedirectPage() {
  useEffect(() => {
    redirect('/dashboard/business');
  }, []);

  return null;
}
