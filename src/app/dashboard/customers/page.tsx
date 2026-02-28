'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

export default function CustomersRedirectPage() {
  useEffect(() => {
    redirect('/dashboard/business');
  }, []);

  return null;
}
