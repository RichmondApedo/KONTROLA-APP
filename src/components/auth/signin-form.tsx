
'use client';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
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
import { useState, useEffect } from 'react';
import {
  GoogleAuthProvider,
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
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(1, { message: 'Please enter your password.' })
    .max(50, { message: 'Password cannot be more than 50 characters.' }),
});


export function SignInForm() {
  const auth = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const googleProvider = new GoogleAuthProvider();

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (!auth) return;
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('SignInForm: Redirect sign-in successful for:', result.user.email);
          toast({ title: 'Sign In Successful', description: 'Welcome back!' });
          router.push('/dashboard');
        }
      } catch (error: any) {
        console.error('SignInForm: Redirect result error:', error);
        toast({
          variant: 'destructive',
          title: 'Google Sign-In Failed',
          description: error.message,
        });
      }
    };
    checkRedirect();
  }, [auth, router, toast]);

  async function handleEmailSignIn(values: z.infer<typeof emailFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      
      // Graceful verification check
      if (!userCredential.user.emailVerified) {
        toast({ title: 'Important Notice', description: 'Your email address is unverified. For your security, please verify your email soon.' });
      } else {
        toast({ title: 'Signed In', description: 'Welcome back!' });
      }
    } catch (error: any) {
      
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
        toast({ title: 'Sign In Successful', description: 'Welcome back!' });
        router.push('/dashboard');
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

      const description = `Authentication failed. Code: ${error.code || 'N/A'}. Message: ${error.message}`;
      toast({
        variant: 'destructive',
        title: 'Google Sign-In Failed',
        description: description,
        duration: 9000,
      });
      setIsSubmitting(false);
    }
  }

  const isSubmitDisabled = isSubmitting || !auth;

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
      <div className="grid grid-cols-1 gap-2 mt-4">
        <button
          type="button"
          onClick={handleGoogleSignIn}
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
