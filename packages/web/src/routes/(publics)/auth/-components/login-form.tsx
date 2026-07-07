import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/form-field';
import { authClient, AuthApiError } from '@/lib/auth-client';
import { setTokens } from '@/lib/token-storage';

export function LoginForm() {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const tokens = await authClient.login({ email, password });
      setTokens(tokens.access_token, tokens.refresh_token);
      navigate({ to: '/' });
    } catch (err) {
      setError(
        err instanceof AuthApiError
          ? err.message
          : 'Something went wrong. Try again.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className='flex flex-col gap-4'>
      <FormField
        label='Email'
        name='email'
        type='email'
        autoComplete='email'
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <FormField
        label='Password'
        name='password'
        type='password'
        autoComplete='current-password'
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className='text-sm text-red-500'>{error}</p>}
      <Button type='submit' disabled={isSubmitting}>
        {isSubmitting ? 'Logging in...' : 'Login'}
      </Button>
    </form>
  );
}
