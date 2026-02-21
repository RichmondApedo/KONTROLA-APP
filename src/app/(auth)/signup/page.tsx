import { redirect } from 'next/navigation';

// This component handles redirection from the old /signup route to the new /auth/signup route.
export default function SignUpRedirect() {
  redirect('/auth/signup');
}
