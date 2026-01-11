'use client';
import { Fingerprint, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Logo } from '@/components/logo';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  signUpWithEmail,
  signInWithPasskey,
  createPasskey,
} from '@/firebase/auth';
import { useAuth, useUser } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { getRedirectResult, GoogleAuthProvider, OAuthProvider, signInWithRedirect, signInWithEmailAndPassword } from 'firebase/auth';
import { initiateEmailSignIn, initiateEmailSignUp } from '@/firebase/non-blocking-login';

const ProviderIcon = ({ provider }: { provider: 'google' | 'apple' }) => {
  if (provider === 'google') {
    return (
      <svg
        className="mr-2 h-5 w-5"
        aria-hidden="true"
        focusable="false"
        data-prefix="fab"
        data-icon="google"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 488 512"
      >
        <path
          fill="currentColor"
          d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 126 23.4 172.9 61.9l-76.2 64.5c-24.3-23.6-58.3-38.6-96.7-38.6-83.8 0-152.2 68.6-152.2 153.2s68.4 153.2 152.2 153.2c97.2 0 130.2-74.7 134.7-109.9H248v-85.3h236.1c2.3 12.7 3.9 26.9 3.9 41.4z"
        ></path>
      </svg>
    );
  }
   if (provider === 'apple') {
    return (
      <svg
        className="mr-2 h-5 w-5"
        aria-hidden="true"
        focusable="false"
        data-prefix="fab"
        data-icon="apple"
        role="img"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 384 512"
      >
        <path fill="currentColor" d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C39.2 141.1 0 183.2 0 241.2c0 61.6 31.6 116.3 63.8 150.3 32.6 34.2 67 49 105 49 27.3 0 55.5-12.2 78.5-12.2 23 0 49.4 12.2 78.5 12.2 42 0 83.5-22.1 111.5-62.8-17.5-14.8-31.5-36.3-31.5-61.2zM238.1 94.9c14.7-16.4 24.5-37.8 24.5-59.5 0-1.5-.2-2.9-.5-4.4-18.8-1.7-41.7 8.1-55.9 24.1-12.7 14.5-23 35.8-23 57 0 1.5.2 2.9.5 4.4 19.3 2 40.8-7.2 53.9-21.6z"></path>
      </svg>
    );
  }
  return null;
};

const formSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export default function LoginPage() {
  const auth = useAuth();
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const { toast } = useToast();
  const [isPasskeySupported, setIsPasskeySupported] = useState(false);
  const [isProcessingRedirect, setIsProcessingRedirect] = useState(true);

  useEffect(() => {
    setIsPasskeySupported(
      window.PublicKeyCredential &&
        PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable &&
        PublicKeyCredential.isConditionalMediationAvailable
    );
  }, []);

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isUserLoading, router]);

  useEffect(() => {
    const processRedirect = async () => {
      if (!auth) return;
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          // User signed in via redirect.
          // The onAuthStateChanged listener will handle the routing.
          toast({
            title: 'Signed In',
            description: 'Welcome back!',
          });
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Sign-in failed',
          description: error.message,
        });
      } finally {
        setIsProcessingRedirect(false);
      }
    };
    processRedirect();
  }, [auth, toast]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleEmailSignUp(values: z.infer<typeof formSchema>) {
    try {
      initiateEmailSignUp(auth, values.email, values.password);
      // Let the useEffect handle the redirect
      toast({
        title: 'Account Created',
        description: "You've been successfully signed up.",
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign-up failed',
        description: error.message,
      });
    }
  }

  async function handleEmailSignIn(values: z.infer<typeof formSchema>) {
    try {
      initiateEmailSignIn(auth, values.email, values.password);
      // Let the useEffect handle the redirect
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Sign-in failed',
        description: error.message,
      });
    }
  }

  async function handleGoogleSignIn() {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
      // The redirect is initiated, no further action needed here.
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Google Sign-in failed',
        description: error.message,
      });
    }
  }
  
  async function handleAppleSignIn() {
    if (!auth) return;
    const provider = new OAuthProvider('apple.com');
    try {
      await signInWithRedirect(auth, provider);
      // The redirect is initiated, no further action needed here.
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Apple Sign-in failed',
        description: error.message,
      });
    }
  }

  async function handlePasskeySignIn() {
    try {
      await signInWithPasskey(auth);
      // Let the useEffect handle the redirect
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Passkey Sign-in failed',
        description: error.message,
      });
    }
  }

  async function handleCreatePasskey() {
    try {
      await createPasskey(auth);
      toast({
        title: 'Passkey Created',
        description: 'You can now sign in with your fingerprint or face ID.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Passkey Creation Failed',
        description: error.message,
      });
    }
  }
  
  if (isUserLoading || isProcessingRedirect) {
    return (
        <div className="flex min-h-screen w-full items-center justify-center bg-background p-4">
            <p>Loading...</p>
        </div>
    );
  }


  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="text-center">
        <Logo className="mx-auto mb-4" />
        <CardTitle className="font-headline text-2xl">
          Welcome to KONTROLA
        </CardTitle>
        <CardDescription>
          Your Financial Freedom is here 🔥
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleEmailSignIn)}
                className="space-y-4 pt-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="m@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Sign In
                </Button>
              </form>
            </Form>
          </TabsContent>
          <TabsContent value="signup">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleEmailSignUp)}
                className="space-y-4 pt-4"
              >
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="m@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">
                  Sign Up
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
          >
            <ProviderIcon provider="google" />
            Google
          </Button>
           <Button
            variant="outline"
            className="w-full"
            onClick={handleAppleSignIn}
          >
            <ProviderIcon provider="apple" />
            Apple
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={handlePasskeySignIn}
            disabled={!isPasskeySupported}
          >
            <Fingerprint className="mr-2 h-4 w-4" />
            Passkey
          </Button>
        </div>
        {isPasskeySupported && auth.currentUser && (
          <Alert>
            <KeyRound className="h-4 w-4" />
            <AlertTitle>Enable one-touch sign-in!</AlertTitle>
            <AlertDescription>
              <Button variant="link" className="p-0 h-auto" onClick={handleCreatePasskey}>Create a passkey</Button> to sign in with your face or fingerprint.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
