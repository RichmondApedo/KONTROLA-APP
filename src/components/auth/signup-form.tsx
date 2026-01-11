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
} from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { doc, setDoc, getFirestore } from 'firebase/firestore';


const formSchema = z.object({
    name: z.string().min(2, { message: "Name must be at least 2 characters."}),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z
    .string()
    .min(6, { message: 'Password must be at least 6 characters.' }),
});

export function SignUpForm() {
  const auth = useAuth();
  const firestore = getFirestore();
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
      const [firstName, ...lastName] = values.name.split(' ');

      // Create user profile document in Firestore with the correct path
      await setDoc(doc(firestore, "users", user.uid, "profile", user.uid), {
        id: user.uid,
        email: user.email,
        displayName: values.name,
        firstName: firstName || '',
        lastName: lastName.join(' ') || '',
        preferredLanguage: 'en',
        preferredCurrency: 'usd',
        points: 0,
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
  
  const isSubmitDisabled = isSubmitting || !isAuthReady;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleEmailSignUp)}
        className="space-y-4 pt-4"
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
          {isSubmitting ? <><Loader2 className="animate-spin" /> Signing Up...</> : 'Sign Up'}
        </Button>
      </form>
    </Form>
  );
}
