
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
  updateProfile,
  signInWithPopup,
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
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const googleProvider = new GoogleAuthProvider();

  useEffect(() => {
    if (auth) {
      setIsAuthReady(true);
    }
  }, [auth]);

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
      await updateProfile(user, { displayName: values.name });
      toast({ title: 'Account Created', description: 'Welcome to KONTROLA!' });
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
      await signInWithPopup(auth, googleProvider);
      toast({
        title: 'Sign In Successful',
        description: 'Welcome to KONTROLA!',
      });
    } catch (error: any) {
      console.error("Google sign-up error:", error);
      let description = `An unexpected error occurred. (Code: ${error.code}) Message: ${error.message}`;
      if (error.code === 'auth/account-exists-with-different-credential') {
        const email = error.customData?.email;
        description = `The email ${email} is already associated with another sign-in method. Please sign in with that method.`
      } else if (error.code === 'auth/popup-closed-by-user') {
        description = 'The sign-up window was closed before completing. Please try again.';
      } else if (error.code === 'auth/cancelled-popup-request') {
        setIsSubmitting(false);
        return; // Don't show a toast for this.
      }
       toast({
        variant: 'destructive',
        title: 'Google Sign-Up Failed',
        description: description,
        duration: 10000,
      });
    } finally {
        setIsSubmitting(false);
    }
  }
  
  const isSubmitDisabled = isSubmitting || !isAuthReady;

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
                className="w-full"
                disabled={isSubmitDisabled}
                >
                {isSubmitting ? <><Loader2 className="animate-spin" /> Creating Account...</> : 'Create account'}
                </Button>
            </div>
        </form>
      </Form>

      <div className="relative mt-8">
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
          <div>
            <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignUp}
            disabled={isSubmitDisabled}
            >
            {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <ProviderIcon provider="google" />}
            Google
            </Button>
          </div>
      </div>
    </>
  );
}
