'use client';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useEffect, useState } from 'react';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

const ProviderIcon = ({ provider }: { provider: 'google' | 'apple' }) => {
  // ... (SVG code remains the same)
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
        <path
          fill="currentColor"
          d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C39.2 141.1 0 183.2 0 241.2c0 61.6 31.6 116.3 63.8 150.3 32.6 34.2 67 49 105 49 27.3 0 55.5-12.2 78.5-12.2 23 0 49.4 12.2 78.5 12.2 42 0 83.5-22.1 111.5-62.8-17.5-14.8-31.5-36.3-31.5-61.2zM238.1 94.9c14.7-16.4 24.5-37.8 24.5-59.5 0-1.5-.2-2.9-.5-4.4-18.8-1.7-41.7 8.1-55.9 24.1-12.7 14.5-23 35.8-23 57 0 1.5.2 2.9.5 4.4 19.3 2 40.8-7.2 53.9-21.6z"
        ></path>
      </svg>
    );
  }
  return null;
};

const formSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(1, { message: 'Please enter your password.' })
    .max(50, { message: 'Password cannot be more than 50 characters.' }),
});

export function SignInForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);

  useEffect(() => {
    if (auth) {
      setIsAuthReady(true);
    }
  }, [auth]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function handleEmailSignIn(values: z.infer<typeof formSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({
        title: 'Signed In',
        description: 'Welcome back!',
      });
    } catch (error: any) {
      console.error('Sign in error:', error.code, error.message);
      toast({
        variant: 'destructive',
        title: 'Sign-in failed',
        description: 'Invalid credentials. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (!auth) return;
    const email = form.getValues('email');
    
    // Manually trigger validation for the email field
    const isValid = await form.trigger('email');
    if (!isValid) {
      // The validation error will be displayed by the FormMessage component
      return;
    }

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Password Reset Email Sent',
        description: 'Please check your inbox (and spam folder) for a link to reset your password.',
      });
    } catch (error: any) {
      console.error('Password reset error:', error.code, error.message);
      toast({
        variant: 'destructive',
        title: 'Password Reset Failed',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Signed In',
        description: 'Welcome back!',
      });
    } catch (error: any) {
      console.error('Google sign-in error:', error.code, error.message);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Google Sign-In Failed',
          description: error.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAppleSignIn() {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Signed In',
        description: 'Welcome back!',
      });
    } catch (error: any) {
      console.error('Apple sign-in error:', error.code, error.message);
      if (error.code === 'auth/operation-not-allowed') {
        toast({
          variant: 'destructive',
          title: 'Apple Sign-In Not Configured',
          description: "Please enable Apple Sign-In in your Firebase project's settings.",
        });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Apple Sign-In Failed',
          description: error.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSubmitDisabled = isSubmitting || !isAuthReady;

  return (
    <>
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
                  <Input
                    placeholder="m@example.com"
                    {...field}
                    disabled={isSubmitDisabled}
                  />
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
                <div className="flex items-center">
                  <FormLabel>Password</FormLabel>
                  <Button
                    type="button"
                    variant="link"
                    className="ml-auto h-auto p-0 text-xs"
                    onClick={handlePasswordReset}
                    disabled={isSubmitDisabled}
                  >
                    Forgot Password?
                  </Button>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    {...field}
                    disabled={isSubmitDisabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitDisabled}
          >
            {isSubmitting ? (
              <><Loader2 className="animate-spin" /> Signing In...</>
            ) : (
              'Sign In with Email'
            )}
          </Button>
        </form>
      </Form>
      <div className="relative mt-4">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 mt-4">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleGoogleSignIn}
          disabled={isSubmitDisabled}
        >
          <ProviderIcon provider="google" />
          Google
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={handleAppleSignIn}
          disabled={isSubmitDisabled}
        >
          <ProviderIcon provider="apple" />
          Apple
        </Button>
      </div>
    </>
  );
}
