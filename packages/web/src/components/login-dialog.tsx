import { A } from '@solidjs/router';
import { type JSX, createSignal } from 'solid-js';
import { toast } from 'somoto';
import { Button } from '~/components/ui/button';

import {
  TextField,
  TextFieldInput,
  TextFieldLabel,
} from '~/components/ui/text-field';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { ApiError } from '~/lib/api-client';
import { useLoginMutation } from '~/queries/auth';

export function LoginDialog(props: { trigger?: JSX.Element }) {
  const [open, setOpen] = createSignal(false);
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');

  const login = useLoginMutation();

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    login.mutate(
      { email: email(), password: password() },
      {
        onSuccess: (data) => {
          toast.success(`Selamat datang kembali, ${data.user.full_name}!`);
          setOpen(false);
          setPassword('');
        },
        onError: (err) => {
          toast.error(err instanceof ApiError ? err.message : 'Gagal masuk, coba lagi.');
        },
      },
    );
  }

  function handleGoogleLogin() {
    // TODO: wire to Google OAuth once set up — no-op for now.
  }

  return (
    <Dialog open={open()} onOpenChange={setOpen}>
      {props.trigger ?? (
        <DialogTrigger
          as={Button}
          variant='outline'
          size='sm'
          class='hidden sm:inline-flex'
        >
          Masuk
        </DialogTrigger>
      )}
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Masuk ke kommers</DialogTitle>
            <DialogDescription>
              Masuk untuk melanjutkan belanja.
            </DialogDescription>
          </DialogHeader>

          <form class='flex flex-col gap-4' onSubmit={handleSubmit}>
            <TextField class='gap-1.5'>
              <TextFieldLabel>Email</TextFieldLabel>
              <TextFieldInput
                type='email'
                placeholder='nama@email.com'
                autocomplete='email'
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
              />
            </TextField>

            <TextField class='gap-1.5'>
              <TextFieldLabel>Password</TextFieldLabel>
              <TextFieldInput
                type='password'
                placeholder='••••••••'
                autocomplete='current-password'
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
            </TextField>

            <Button type='submit' class='w-full' disabled={login.isPending}>
              {login.isPending ? 'Memproses...' : 'Masuk'}
            </Button>
          </form>

          <div class='flex items-center gap-3'>
            <div class='h-px flex-1 bg-border' />
            <span class='text-xs text-muted-foreground'>atau</span>
            <div class='h-px flex-1 bg-border' />
          </div>

          <Button
            variant='outline'
            class='w-full gap-2'
            onClick={handleGoogleLogin}
          >
            <img src='/google.svg' alt='' class='size-4' />
            Masuk dengan Google
          </Button>

          <p class='text-center text-sm text-muted-foreground'>
            Belum punya akun?{' '}
            <A
              href='/register'
              class='font-medium text-primary hover:underline'
              onClick={() => setOpen(false)}
            >
              Daftar
            </A>
          </p>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
