
'use client';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
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
import { useAuth, useUserProfile, useFirestore } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { ensureUserProfile } from '@/lib/auth-init';
import { MfaVerificationView } from './mfa-verification-view';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import {
  GoogleAuthProvider,
  OAuthProvider,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithRedirect,
  signInWithPopup,
  getRedirectResult,
  sendEmailVerification,
} from 'firebase/auth';
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
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(1, { message: 'Please enter your password.' })
    .max(50, { message: 'Password cannot be more than 50 characters.' }),
});


export function SignInForm() {
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showMfa, setShowMfa] = useState(false);
  const [mfaUser, setMfaUser] = useState<any>(null);
  
  const googleProvider = new GoogleAuthProvider();

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '', password: '' },
  });


  async function handleEmailSignIn(values: z.infer<typeof emailFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      
      // 1. Check for MFA Requirement
      // Since we can't easily access useFirestore() inside the async fn if not provided,
      // we'll fetch the profile directly to be sure.
      const firestore = (auth as any).app.container.getProvider('firestore').getImmediate();
      const profileRef = doc(firestore, 'users', userCredential.user.uid, 'profile', userCredential.user.uid);
      const profileSnap = await getDoc(profileRef);
      const profileData = profileSnap.data();

      if (profileData?.mfaEnabled) {
          // Trigger MFA Send
          const idToken = await userCredential.user.getIdToken();
          await fetch('/api/auth/send-mfa', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${idToken}` }
          });
          setMfaUser(userCredential.user);
          setShowMfa(true);
          setIsSubmitting(false);
          return;
      }

      // 2. Normal Verification Check
      if (!userCredential.user.emailVerified) {
        toast({ title: 'Important Notice', description: 'Your email address is unverified. For your security, please verify your email soon.' });
      } else {
        toast({ title: 'Signed In', description: 'Welcome back!' });
      }
      router.push(callbackUrl);
    } catch (error: any) {
      // ... (existing error handling remains)
      // Telemetry: Quietly log authentication failure
      fetch('/api/security-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ event: 'AUTH_FAILED', email: values.email, reason: error.code })
      }).catch(() => {});

      let description = `An unexpected error occurred. (Code: ${error.code})`;
      if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
        description = 'The email or password you entered is incorrect. Please double-check your credentials or click "Forgot Password?" to reset it.';
      } else if (error.code === 'auth/too-many-requests') {
        description = 'Access to this account has been temporarily disabled due to many failed login attempts. You can immediately restore it by resetting your password or you can try again later.';
      } else if (error.code === 'auth/network-request-failed') {
        description = 'Could not connect to the authentication service. Please check your network connection.';
      }
      toast({ variant: 'destructive', title: 'Sign-in failed', description });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePasswordReset() {
    if (!auth) return;
    const email = emailForm.getValues('email');
    const isValid = await emailForm.trigger('email');
    if (!isValid) return;

    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: 'Password Reset Email Sent', description: 'Please check your inbox (and spam folder) for a link to reset your password.' });
    } catch (error: any) {
      
      toast({ variant: 'destructive', title: 'Password Reset Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAppleSignIn() {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new OAuthProvider('apple.com');
    
    try {
      const result = await signInWithPopup(auth, provider);
      if (result) {
        // 1. Ensure Firestore Profile (CRITICAL FIX)
        const firestore = (auth as any).app.container.getProvider('firestore').getImmediate();
        const profileData = await ensureUserProfile(result.user, firestore);

        // 2. MFA CHECK

        if (profileData?.mfaEnabled) {
            const idToken = await result.user.getIdToken();
            await fetch('/api/auth/send-mfa', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            setMfaUser(result.user);
            setShowMfa(true);
            setIsSubmitting(false);
            return;
        }

        toast({ title: 'Sign In Successful', description: 'Welcome back!' });
        router.push(callbackUrl);
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        try {
          await signInWithRedirect(auth, provider);
          return;
        } catch (redirectError: any) {
          console.error('Apple Redirect failed:', redirectError);
        }
      }
      toast({
        variant: 'destructive',
        title: 'Apple Sign-In Failed',
        description: 'We could not complete your Apple Sign-In. Please try again or use another method.',
      });
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    if (!auth) {
      console.error('SignInForm: Auth instance not available for Google Sign-in.');
      return;
    }
    setIsSubmitting(true);
    
    try {
      console.log('SignInForm: Attempting Google Sign-in via popup...');
      const result = await signInWithPopup(auth, googleProvider);
      if (result) {
        console.log('SignInForm: Popup sign-in successful for:', result.user.email);
        
        // 1. Ensure Firestore Profile (CRITICAL FIX)
        const firestore = (auth as any).app.container.getProvider('firestore').getImmediate();
        const profileData = await ensureUserProfile(result.user, firestore);

        // 2. MFA CHECK

        if (profileData?.mfaEnabled) {
            const idToken = await result.user.getIdToken();
            await fetch('/api/auth/send-mfa', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${idToken}` }
            });
            setMfaUser(result.user);
            setShowMfa(true);
            setIsSubmitting(false);
            return;
        }

        toast({ title: 'Sign In Successful', description: 'Welcome back!' });
        router.push(callbackUrl);
      }
    } catch (error: any) {
      console.error('SignInForm: Google Sign-In Popup failed:', error);
      
      // Fallback to redirect if popup is blocked or explicitly fails in a way redirect might help
      if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
        console.log('SignInForm: Falling back to redirect method...');
        try {
          await signInWithRedirect(auth, googleProvider);
          return; // Redirect will happen, component will unload
        } catch (redirectError: any) {
          console.error('SignInForm: Google Redirect also failed:', redirectError);
        }
      }

      const description = error.code === 'auth/network-request-failed' 
        ? 'Could not connect to the authentication service. Please check your network connection.'
        : 'An authentication error occurred. Please try again or contact support if the issue persists.';

      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: description,
        duration: 5000,
      });
      setIsSubmitting(false);
    }
  }

  const isSubmitDisabled = isSubmitting || !auth;

  if (showMfa) {
    return (
        <MfaVerificationView 
            onSuccess={() => {
                toast({ title: 'Success', description: 'Identity verified.' });
                router.push(callbackUrl);
            }} 
            onCancel={() => {
                auth?.signOut();
                setShowMfa(false);
            }} 
        />
    );
  }

  return (
    <>
      <Form {...emailForm}>
        <form
          onSubmit={emailForm.handleSubmit(handleEmailSignIn)}
          className="space-y-4 pt-4"
        >
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
              {isSubmitting ? <><Loader2 className="animate-spin mr-2" /> Signing in...</> : 'Sign in'}
            </Button>
          </div>
        </form>
      </Form>
      
      <div className="relative mt-8">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }} />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="auth-divider-bg px-3 py-0.5 text-xs tracking-widest" style={{ background: 'transparent', color: 'rgba(255,255,255,0.25)', letterSpacing: '0.12em' }}>
            Or continue with
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
        <button
          type="button"
          onClick={handleAppleSignIn}
          disabled={isSubmitDisabled}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl py-3 px-4 text-sm font-bold transition-all duration-200 disabled:opacity-50 hover:bg-white hover:text-black"
          style={{
            background: '#FFFFFF',
            color: '#000000',
            border: '1px solid #FFFFFF',
          }}
        >
          {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <ProviderIcon provider="apple" />}
          Apple
        </button>

        <button
          type="button"
          onClick={handleGoogleSignIn}
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
