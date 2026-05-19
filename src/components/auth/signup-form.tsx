
'use client';
import { Button } from '@/components/ui/button';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useAuth, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';
import { ensureUserProfile } from '@/lib/auth-init';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  sendEmailVerification,
} from 'firebase/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';


const ProviderIcon = ({ provider }: { provider: 'google' | 'apple' }) => {
    if (provider === 'apple') {
      return (
        <svg
          className="mr-2 h-5 w-5"
          aria-hidden="true"
          focusable="false"
          viewBox="0 0 384 512"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fill="currentColor"
            d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"
          ></path>
        </svg>
      );
    }
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
};

const emailFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters."}),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' })
    .max(50, { message: 'Password cannot be more than 50 characters.' }),
});

const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({ prompt: 'select_account' });

const appleProvider = new OAuthProvider('apple.com');

export function SignUpForm() {
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const rawCallbackUrl = searchParams.get('callbackUrl');
  let callbackUrl = '/dashboard';
  if (rawCallbackUrl && rawCallbackUrl.startsWith('/') && !rawCallbackUrl.startsWith('//')) {
      callbackUrl = rawCallbackUrl;
  }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  });



  async function handleEmailSignUp(values: z.infer<typeof emailFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      
      // 1. Update Auth Profile
      await updateProfile(user, { displayName: values.name });
      
      // 2. Initialize Firestore Profile (CRITICAL FIX)
      if (firestore) {
        await ensureUserProfile(user, firestore);
      }

      try {
        await sendEmailVerification(user);
      } catch (e) {
        console.warn("Could not dispatch verification email", e);
      }
      toast({ title: 'Account Created', description: 'Welcome to KONTROLA! A verification link has been sent to your email.' });
      router.push(callbackUrl);
    } catch (error: any) {
      
      toast({ variant: 'destructive', title: 'Sign-up failed', description: 'Could not create your account. Please ensure your information is correct or try again later.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  /**
   * RECONCILIATION LOGIC: Shared handler for completed registration
   * (Used by both Popup and Redirect flows)
   */
  async function handleRegistrationSuccess(user: any) {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      // The FirebaseProvider's global profile listener handles the safety-initialization
      // of new profiles. We just provide immediate feedback and redirect.
      toast({ title: 'Welcome to KONTROLA!', description: 'Setting up your intelligence terminal...' });
      router.push(callbackUrl);
    } catch (err: any) {
      console.error('SignUpForm: Registration feedback failed:', err);
      toast({ variant: 'destructive', title: 'Sign-in success, but UI sync pending', description: 'Your account is ready. Redirecting to dashboard...' });
      router.push(callbackUrl);
    } finally {
      setIsSubmitting(false);
    }
  }


  // RECONCILIATION EFFECT: Handled globally in FirebaseProvider
  useEffect(() => {
    // No-op: Redirect results are handled by FirebaseProvider
  }, []);

  async function handleAppleSignUp() {
    if (!auth) return;
    setIsSubmitting(true);
    
    try {
      console.log('SignUpForm: Attempting Apple Sign-up via popup...');
      const result = await signInWithPopup(auth, appleProvider);
      if (result) {
        await handleRegistrationSuccess(result.user);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        console.log('SignUpForm: Falling back to redirect method for Apple...');
        try {
          sessionStorage.setItem('kontrola_auth_callback', callbackUrl);
          await signInWithRedirect(auth, appleProvider);
          return;
        } catch (redirectError: any) {
          console.error('SignUpForm: Apple Redirect failed:', redirectError);
        }
      }
      
      console.error('SignUpForm: Apple Sign-Up Failed:', error);
      toast({
        variant: 'destructive',
        title: 'Apple Sign-Up Failed',
        description: `We could not complete your Apple Sign-Up. Error: ${error.code || 'unknown'}`,
      });
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!auth) return;
    setIsSubmitting(true);
    
    const isStandalone = typeof window !== 'undefined' && 
      (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true);

    if (isStandalone) {
      console.log('SignUpForm: PWA detected. Using Redirect for Google Sign-up.');
      try {
        sessionStorage.setItem('kontrola_auth_callback', callbackUrl);
        await signInWithRedirect(auth, googleProvider);
        return;
      } catch (err: any) {
        console.error('SignUpForm: Google Redirect failed:', err);
        toast({ variant: 'destructive', title: 'Registration Failed', description: `Redirect error: ${err.code}` });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      console.log('SignUpForm: Attempting Google Sign-up via popup...');
      const result = await signInWithPopup(auth, googleProvider);
      if (result) {
        await handleRegistrationSuccess(result.user);
      }
    } catch (error: any) {
      console.error('SignUpForm: Google Sign-Up Popup failed:', error);
      
      // Fallback for mobile/blocked popups
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        console.log('SignUpForm: Falling back to redirect method...');
        try {
          // Save callback URL for after the redirect
          sessionStorage.setItem('kontrola_auth_callback', callbackUrl);
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          console.error('SignUpForm: Google Redirect failed:', redirectError);
        }
      }

      const description = error.code === 'auth/network-request-failed'
        ? 'Could not connect to the authentication service. Please check your network connection.'
        : `Account creation failed. (Code: ${error.code || 'unknown'})`;

      toast({
        variant: 'destructive',
        title: 'Google Sign-Up Failed',
        description: description,
        duration: 8000,
      });
      setIsSubmitting(false);
    }
  }
  
  const isSubmitDisabled = isSubmitting || !auth;

  return (
    <>
      <Form {...emailForm}>
        <form
            onSubmit={emailForm.handleSubmit(handleEmailSignUp)}
            className="space-y-4 pt-4"
        >
            <FormField
              control={emailForm.control}
              name="name"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                      <Input
                      placeholder="e.g., Jane Doe"
                      autoComplete="name"
                      {...field}
                      disabled={isSubmitDisabled}
                      />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={emailForm.control}
              name="email"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                      <Input
                      placeholder="m@example.com"
                      autoComplete="username"
                      {...field}
                      disabled={isSubmitDisabled}
                      />
                  </FormControl>
                  <FormMessage />
                  </FormItem>
              )}
            />
            <FormField
              control={emailForm.control}
              name="password"
              render={({ field }) => (
                  <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
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
            <div>
                <Button
                type="submit"
                className="w-full h-12 rounded-xl text-base font-bold shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all duration-200"
                disabled={isSubmitDisabled}
                >
                {isSubmitting ? <><Loader2 className="animate-spin mr-2" /> Creating Account...</> : 'Create account'}
                </Button>
            </div>
        </form>
      </Form>

      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="px-3 text-xs tracking-widest" style={{ background: 'transparent', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>
            Or continue with
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={handleAppleSignUp}
          disabled={isSubmitDisabled}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 text-sm font-bold transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.85)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <ProviderIcon provider="apple" />}
          Apple
        </button>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isSubmitDisabled}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 text-sm font-bold transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.85)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <ProviderIcon provider="google" />}
          Google
        </button>
      </div>
    </>
  );
}
