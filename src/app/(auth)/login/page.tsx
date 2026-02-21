import { redirect } from 'next/navigation';

// This component handles redirection from the old /login route to the new /auth/login route.
export default function LoginRedirect() {
  redirect('/auth/login');
}
