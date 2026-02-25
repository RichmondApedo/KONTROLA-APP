'use client';
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
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, setDoc, getFirestore } from 'firebase/firestore';


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
            <path
              fill="currentColor"
              d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C39.2 141.1 0 183.2 0 241.2c0 61.6 31.6 116.3 63.8 150.3 32.6 34.2 67 49 105 49 27.3 0 55.5-12.2 78.5-12.2 23 0 49.4 12.2 78.5 12.2 42 0 83.5-22.1 111.5-62.8-17.5-14.8-31.5-36.3-31.5-61.2zM238.1 94.9c14.7-16.4 24.5-37.8 24.5-59.5 0-1.5-.2-2.9-.5-4.4-18.8-1.7-41.7 8.1-55.9 24.1-12.7 14.5-23 35.8-23 57 0 1.5.2 2.9.5 4.4 19.3 2 40.8-7.2 53.9-21.6z"
            ></path>
          </svg>
        );
      }
      return null;
}

const formSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters."}),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' })
    .max(50, { message: 'Password cannot be more than 50 characters.' }),
});

export function SignUpForm() {
  const auth = useAuth();
  const firestore = getFirestore();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (auth) {
      setIsAuthReady(true);
    }
  }, [auth]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  });

  async function handleEmailSignUp(values: z.infer<typeof formSchema>) {
    if (!auth || !firestore) return;
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      );

      const user = userCredential.user;
      
      // Also update the user's display name in Firebase Auth
      await updateProfile(user, { displayName: values.name });

      const [firstName, ...lastName] = values.name.split(' ');

      // Create user profile document in Firestore with the correct path
      await setDoc(doc(firestore, "users", user.uid, "profile", user.uid), {
        id: user.uid,
        email: user.email,
        firstName: firstName || '',
        lastName: lastName.join(' ') || '',
        preferredLanguage: 'en',
        preferredCurrency: 'usd',
        points: 0,
        plan: 'free',
      }, { merge: true });

      toast({
        title: 'Account Created',
        description: 'Welcome to KONTROLA!',
      });

    } catch (error: any) {
      console.error('Sign up error:', error.code, error.message);
      toast({
        variant: 'destructive',
        title: 'Sign-up failed',
        description: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Account Created',
        description: 'Welcome to KONTROLA!',
      });
    } catch (error: any) {
      console.error('Google sign-up error:', error.code, error.message);
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Google Sign-Up Failed',
          description: error.message,
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAppleSignUp() {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new OAuthProvider('apple.com');
    provider.addScope('email');
    provider.addScope('name');
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Account Created',
        description: 'Welcome to KONTROLA!',
      });
    } catch (error: any) {
      console.error('Apple sign-up error:', error.code, error.message);
      if (error.code === 'auth/operation-not-allowed') {
        toast({
          variant: 'destructive',
          title: 'Apple Sign-Up Not Configured',
          description: "Please enable Apple Sign-In in your Firebase project's settings.",
        });
      } else if (error.code !== 'auth/popup-closed-by-user') {
        toast({
          variant: 'destructive',
          title: 'Apple Sign-Up Failed',
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
            onSubmit={form.handleSubmit(handleEmailSignUp)}
            className="space-y-4"
        >
            <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
                <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                    <Input
                    placeholder="e.g., Jane Doe"
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
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      {...field}
                      disabled={isSubmitDisabled}
                    />
                     <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute inset-y-0 right-0 h-full w-10 text-muted-foreground"
                      onClick={() => setShowPassword((prev) => !prev)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff /> : <Eye />}
                    </Button>
                  </div>
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
            {isSubmitting ? <><Loader2 className="animate-spin" /> Creating Account...</> : 'Create account'}
            </Button>
        </form>
        </Form>
        <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
                Or continue with
            </span>
            </div>
        </div>
        <div className="grid grid-cols-1 gap-2 mt-4">
            <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
            disabled={isSubmitDisabled}
            >
            <ProviderIcon provider="google" />
            Google
            </Button>
            <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleAppleSignUp}
            disabled={isSubmitDisabled}
            >
            <ProviderIcon provider="apple" />
            Apple
            </Button>
        </div>
    </>
  );
}
