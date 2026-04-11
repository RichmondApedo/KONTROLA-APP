
'use client';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const googleProvider = new GoogleAuthProvider();

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  useEffect(() => {
    if (!auth) return;
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result) {
          console.log('SignUpForm: Redirect sign-in successful for:', result.user.email);
          toast({ title: 'Account Created / Signed In', description: 'Welcome to KONTROLA!' });
          router.push('/dashboard');
        }
      } catch (error: any) {
        console.error('SignUpForm: Redirect result error:', error);
        toast({
          variant: 'destructive',
          title: 'Google Sign-Up Failed',
          description: error.message,
        });
      }
    };
    checkRedirect();
  }, [auth, router, toast]);


  async function handleEmailSignUp(values: z.infer<typeof emailFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      await updateProfile(user, { displayName: values.name });
      try {
        await sendEmailVerification(user);
      } catch (e) {
        console.warn("Could not dispatch verification email", e);
      }
      toast({ title: 'Account Created', description: 'Welcome to KONTROLA! A verification link has been sent to your email.' });
    } catch (error: any) {
      
      toast({ variant: 'destructive', title: 'Sign-up failed', description: `An unexpected error occurred. (Code: ${error.code})` });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!auth) return;
    setIsSubmitting(true);
    
    try {
      console.log('SignUpForm: Attempting Google Sign-up via popup...');
      const result = await signInWithPopup(auth, googleProvider);
      if (result) {
        console.log('SignUpForm: Popup sign-up successful for:', result.user.email);
        toast({ title: 'Account Created', description: 'Welcome to KONTROLA!' });
        router.push('/dashboard');
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

      const description = `Authentication failed. Code: ${error.code || 'N/A'}. Message: ${error.message}`;
      toast({
        variant: 'destructive',
        title: 'Google Sign-Up Failed',
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
