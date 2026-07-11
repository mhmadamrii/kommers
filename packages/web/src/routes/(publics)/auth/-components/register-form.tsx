import * as React from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';

import { Button } from '@/components/ui/button';
import { FormField } from '@/components/form-field';
import {
  authClient,
  AuthApiError,
  type EmailPasswordRequest,
} from '@/lib/auth-client';
import { useAuthStore } from '@/lib/auth-store';

export function RegisterForm() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const registerMutation = useMutation({
    mutationFn: async (payload: EmailPasswordRequest) => {
      await authClient.register(payload);
      return authClient.login(payload);
    },
    onSuccess: (tokens) => {
      setAuth(tokens, email);
      navigate({ to: '/' });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    registerMutation.mutate({ email, password });
  }

  const error =
    registerMutation.error instanceof AuthApiError
      ? registerMutation.error.message
      : registerMutation.error
        ? 'Something went wrong. Try again.'
        : null;

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
        autoComplete='new-password'
        required
        minLength={8}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      {error && <p className='text-sm text-red-500'>{error}</p>}
      <Button type='submit' disabled={registerMutation.isPending}>
        {registerMutation.isPending ? 'Creating account...' : 'Create account'}
      </Button>
    </form>
  );
}
