
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


const ProviderIcon = ({ provider }: { provider: 'google' }) => {
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


export function SignUpForm() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const googleProvider = new GoogleAuthProvider();

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
      const firestore = (auth as any).app.container.getProvider('firestore').getImmediate();
      await ensureUserProfile(user, firestore);

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
      // 1. Initialize Firestore Profile (Critical for new accounts)
      const firestore = (auth as any).app.container.getProvider('firestore').getImmediate();
      await ensureUserProfile(user, firestore);

      toast({ title: 'Account Created', description: 'Welcome to KONTROLA!' });
      router.push(callbackUrl);
    } catch (err: any) {
      console.error('SignUpForm: Registration sync failed:', err);
      toast({ variant: 'destructive', title: 'Sync Failed', description: 'Account authenticated, but profile setup failed. Please try signing in again.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  // RECONCILIATION EFFECT: Capture redirect results on mount
  useEffect(() => {
    if (!auth) return;
    
    import('firebase/auth').then(mod => {
      mod.getRedirectResult(auth)
        .then((result) => {
          if (result) {
            console.log('SignUpForm: Redirect registration result captured for:', result.user.email);
            handleRegistrationSuccess(result.user);
          }
        })
        .catch((error) => {
          console.error('SignUpForm: Redirect result error:', error);
          if (error.code !== 'auth/popup-closed-by-user') {
            toast({ variant: 'destructive', title: 'Registration Failed', description: 'Could not complete the Google registration. Please try again.' });
          }
        });
    });
  }, [auth]);

  async function handleGoogleSignUp() {
    if (!auth) return;
    setIsSubmitting(true);
    
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
          await signInWithRedirect(auth, googleProvider);
          return;
        } catch (redirectError: any) {
          console.error('SignUpForm: Google Redirect also failed:', redirectError);
        }
      }

      const description = error.code === 'auth/network-request-failed'
        ? 'Could not connect to the authentication service. Please check your network connection.'
        : 'An error occurred during account creation. Please try again or contact support.';

      toast({
        variant: 'destructive',
        title: 'Google Sign-Up Failed',
        description: description,
        duration: 5000,
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
      <div className="grid grid-cols-1 gap-2 mt-4">
        <button
          type="button"
          onClick={handleGoogleSignUp}
          disabled={isSubmitDisabled}
          className="btn-google w-full flex items-center justify-center gap-3 rounded-xl py-2.5 px-4 text-sm font-medium transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            color: 'rgba(255,255,255,0.85)',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
        >
          {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <ProviderIcon provider="google" />}
          Continue with Google
        </button>
      </div>
    </>
  );
}
