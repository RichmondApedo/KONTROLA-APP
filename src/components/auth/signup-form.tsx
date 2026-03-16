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
import { useEffect, useRef, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  OAuthProvider,
  updateProfile,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  type ConfirmationResult,
  signInWithPopup,
} from 'firebase/auth';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


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

const emailFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters."}),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' })
    .max(50, { message: 'Password cannot be more than 50 characters.' }),
});

const phoneFormSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number with country code, e.g., +1..."),
});

const codeFormSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits."),
});

export function SignUpForm() {
  const auth = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Phone auth state
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifier = useRef<RecaptchaVerifier | null>(null);

  useEffect(() => {
    if (auth) {
      setIsAuthReady(true);
    }
  }, [auth]);

  const emailForm = useForm<z.infer<typeof emailFormSchema>>({
    resolver: zodResolver(emailFormSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const phoneForm = useForm<z.infer<typeof phoneFormSchema>>({
    resolver: zodResolver(phoneFormSchema),
    defaultValues: { phone: '' },
  });
  
  const codeForm = useForm<z.infer<typeof codeFormSchema>>({
    resolver: zodResolver(codeFormSchema),
    defaultValues: { code: '' },
  });

  async function handleEmailSignUp(values: z.infer<typeof emailFormSchema>) {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      const user = userCredential.user;
      // Set the user's display name. This will be picked up by the onAuthStateChanged listener.
      await updateProfile(user, { displayName: values.name });

      // The profile document is now created centrally by the listener in FirebaseProvider.

      toast({ title: 'Account Created', description: 'Welcome to KONTROLA!' });
    } catch (error: any) {
      
      toast({ variant: 'destructive', title: 'Sign-up failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handlePhoneSignUp = async (values: z.infer<typeof phoneFormSchema>) => {
    if (!auth) return;
    setIsSubmitting(true);
    try {
      recaptchaVerifier.current = new RecaptchaVerifier(auth, 'recaptcha-container', { 'size': 'invisible' });
      const appVerifier = recaptchaVerifier.current;
      const result = await signInWithPhoneNumber(auth, values.phone, appVerifier);
      setConfirmationResult(result);
      setIsCodeSent(true);
      toast({ title: 'Verification Code Sent', description: 'Please check your phone for the code.' });
    } catch (error: any) {
      let description = error.message;
      if (error.code === 'auth/operation-not-allowed') {
        description = "Phone number sign-in is not enabled for this project. Please enable it in the Firebase console.";
      }
      toast({ variant: 'destructive', title: 'Error sending code', description });
      recaptchaVerifier.current?.clear();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async (values: z.infer<typeof codeFormSchema>) => {
    if (!confirmationResult) return;
    setIsSubmitting(true);
    try {
        await confirmationResult.confirm(values.code);
        
        // The profile document is now created centrally by the listener in FirebaseProvider.

        toast({ title: 'Account Created', description: 'Welcome to KONTROLA!' });
    } catch (error: any) {
        
        toast({ variant: 'destructive', title: 'Verification failed', description: error.message });
    } finally {
        setIsSubmitting(false);
    }
  };


  async function handleGoogleSignUp() {
    if (!auth) return;
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({ title: 'Account Created', description: 'Welcome to KONTROLA!' });
    } catch (error: any) {
      console.error("Google Sign-Up Error:", error.code, error.message);
      let description = 'An unexpected error occurred. Please try again.';
      if (error.code === 'auth/popup-closed-by-user') {
          description = 'The sign-up window was closed before completion. Please try again.';
      } else if (error.code === 'auth/cancelled-popup-request') {
          description = 'The sign-up process was cancelled. Please try again if this was a mistake.';
      } else if (error.code === 'auth/popup-blocked-by-browser') {
          description = 'The sign-up popup was blocked by your browser. Please allow popups for this site and try again.';
      } else if (error.code === 'auth/operation-not-allowed') {
          description = 'Google Sign-Up is not enabled for this application. Please check your Firebase console authentication settings.';
      } else if (error.code === 'auth/account-exists-with-different-credential') {
          description = 'An account already exists with the same email address. Please sign in using the original method.';
      } else {
          description = `An unexpected error occurred: ${error.message} (Code: ${error.code})`; 
      }
      toast({ variant: 'destructive', title: 'Google Sign-Up Failed', description });
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
      toast({ title: 'Account Created', description: 'Welcome to KONTROLA!' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Apple Sign-Up Failed', description: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }
  
  const isSubmitDisabled = isSubmitting || !isAuthReady;

  return (
    <>
      <Tabs defaultValue="email" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="email">Email</TabsTrigger>
            <TabsTrigger value="phone">Phone</TabsTrigger>
        </TabsList>
        <TabsContent value="email">
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
        </TabsContent>
        <TabsContent value="phone">
            {!isCodeSent ? (
                <Form {...phoneForm}>
                    <form onSubmit={phoneForm.handleSubmit(handlePhoneSignUp)} className="space-y-4 pt-4">
                        <FormField
                            control={phoneForm.control}
                            name="phone"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Phone Number</FormLabel>
                                    <FormControl>
                                        <Input placeholder="+233 24 123 4567" {...field} disabled={isSubmitDisabled} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div>
                            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
                                {isSubmitting ? <><Loader2 className="animate-spin" /> Sending Code...</> : 'Send Verification Code'}
                            </Button>
                        </div>
                    </form>
                </Form>
            ) : (
                <Form {...codeForm}>
                    <form onSubmit={codeForm.handleSubmit(handleVerifyCode)} className="space-y-4 pt-4">
                        <FormField
                            control={codeForm.control}
                            name="code"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Verification Code</FormLabel>
                                    <FormControl>
                                        <Input placeholder="123456" {...field} disabled={isSubmitDisabled} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <div>
                            <Button type="submit" className="w-full" disabled={isSubmitDisabled}>
                                {isSubmitting ? <><Loader2 className="animate-spin" /> Verifying...</> : 'Verify and Sign Up'}
                            </Button>
                        </div>
                    </form>
                </Form>
            )}
        </TabsContent>
      </Tabs>
      <div id="recaptcha-container" className="mt-4"></div>

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
          <div>
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
          </div>
          <div>
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
      </div>
    </>
  );
}
