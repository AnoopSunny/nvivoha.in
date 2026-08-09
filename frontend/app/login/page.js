import { redirect } from 'next/navigation'

// Public /login is removed. Redirect anyone who finds it to the homepage.
export default function LoginRedirect() {
  redirect('/')
}
