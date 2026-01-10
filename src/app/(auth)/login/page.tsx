import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

const ProviderIcon = ({ provider }: { provider: 'google' | 'apple' | 'microsoft' }) => {
  if (provider === 'google') {
    return (
      <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5c-24.3-23.6-58.3-38.6-96.7-38.6-83.8 0-152.2 68.6-152.2 153.2s68.4 153.2 152.2 153.2c97.2 0 130.2-74.7 134.7-109.9H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"></path>
      </svg>
    );
  }
  if (provider === 'apple') {
    return (
      <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="apple" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 384 512">
        <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C39.2 141.6 0 184.2 0 241.7c0 63.6 58.2 157.6 118.5 157.6 31.8 0 58.2-21.5 79.4-21.5 21.2 0 47.4 21.5 77.5 21.5 29.3 0 59.5-12.5 82.3-32.6-20.8-16.3-34.4-42.2-34.4-74.3zm-22.5-101.4c18.2-19.7 29.1-44.4 27.7-71.1-28.9 1.1-56.9 15.7-72.8 35.1-16.5 19.8-28.2 44.4-26.6 71.1 28.9-1.1 56.9-15.7 71.7-35.1z"></path>
      </svg>
    );
  }
   if (provider === 'microsoft') {
    return (
     <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="microsoft" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512">
        <path fill="currentColor" d="M0 32h214.6v214.6H0V32zm233.4 0H448v214.6H233.4V32zM0 265.4h214.6V480H0V265.4zm233.4 0H448V480H233.4V265.4z"></path>
      </svg>
    );
  }
  return null;
}

export default function LoginPage() {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mx-auto mb-4" />
        <CardTitle className="font-headline text-2xl">Welcome to KONTROLA</CardTitle>
        <CardDescription>Your AI-powered financial co-pilot. Sign in to continue.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {/* The Link wrapping the Button would be replaced with actual Firebase auth handlers */}
        <Link href="/dashboard" className="w-full">
          <Button variant="outline" className="w-full">
            <ProviderIcon provider="google" />
            Sign in with Google
          </Button>
        </Link>
         <Link href="/dashboard" className="w-full">
          <Button variant="outline" className="w-full">
            <ProviderIcon provider="apple" />
            Sign in with Apple
          </Button>
        </Link>
         <Link href="/dashboard" className="w-full">
          <Button variant="outline" className="w-full">
            <ProviderIcon provider="microsoft" />
            Sign in with Microsoft
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
