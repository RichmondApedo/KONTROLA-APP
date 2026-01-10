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
import { getRedirectResult, GoogleAuthProvider, signInWithRedirect, signInWithEmailAndPassword } from 'firebase/auth';

const ProviderIcon = ({ provider }: { provider: 'google' }) => {
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
      await signUpWithEmail(auth, values.email, values.password);
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
      await signInWithEmailAndPassword(auth, values.email, values.password);
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
          Your AI-powered financial co-pilot. Sign in to continue.
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
        <div className="grid grid-cols-2 gap-2">
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
