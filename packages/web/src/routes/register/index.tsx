/**
 * DIRECTION CONTRACT
 * THESIS: Registration is the hinge between "browsing" and "the two real
 *   jobs this app does" (buy, or start selling) — the banner side proves
 *   both are one account away, the form side gets there fast.
 * OWN-WORLD: inherits the established system (homepage) — emerald primary
 *   as a full-bleed field on the banner half, Plus Jakarta Sans, rounded
 *   friendly geometry; restrained on the form half, committed on the banner.
 * STORY: visitor sees the marketplace's real capabilities (search fast,
 *   stock is trustworthy, selling is frictionless) animated as floating UI
 *   fragments — not invented stats/testimonials — while filling a short form.
 * FIRST VIEWPORT: split screen (banner left / form right on lg+, form-only
 *   stacked on mobile — the banner is decoration, never blocks the task).
 * FORM: reference = established homepage world; split-auth-screen structure
 *   per the user's brief. Concept-seed direction roll skipped — brief-pinned
 *   structure + inherited world, consistent with the homepage build.
 * FINISH: reviewed via curl content checks + tsc (browser tool withheld per
 *   this project's CLAUDE.md); no live-brower/finish-reviewer pass this
 *   round — disclosed simplification, same as the homepage build.
 */
import { A } from '@solidjs/router';
import { CircleCheck, Search, Store, Zap } from 'lucide-solid';
import { Motion } from 'solid-motionone';
import { createMemo, createSignal } from 'solid-js';
import { Button } from '~/components/ui/button';
import { Checkbox, CheckboxControl, CheckboxLabel } from '~/components/ui/checkbox';
import { DialogTrigger } from '~/components/ui/dialog';
import { LoginDialog } from '~/components/login-dialog';
import { TextField, TextFieldInput, TextFieldLabel } from '~/components/ui/text-field';

const BANNER_POINTS = [
  { icon: Search, label: 'Cari & filter produk secepat kilat' },
  { icon: CircleCheck, label: 'Checkout aman, stok selalu akurat' },
  { icon: Zap, label: 'Mulai jualan kapan aja, tanpa ribet' },
];

function BannerPanel() {
  return (
    <div class='relative hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-emerald-700 p-12 lg:flex lg:flex-col lg:justify-center'>
      <div class='relative z-10 max-w-sm'>
        <A href='/' class='mb-8 flex items-center gap-1.5 text-xl font-extrabold tracking-tight text-white'>
          <Store class='size-6' aria-hidden='true' />
          kommers
        </A>
        <h1 class='mb-3 text-3xl font-extrabold leading-tight text-white'>
          Satu akun, dua cara untung
        </h1>
        <p class='mb-10 text-sm text-white/85'>
          Belanja dari berbagai penjual pilihan, atau buka toko sendiri kapan pun kamu siap.
        </p>

        <div class='flex flex-col gap-4'>
          {BANNER_POINTS.map((point, i) => (
            <Motion.div
              class='flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm'
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 4,
                repeat: Infinity,
                easing: 'ease-in-out',
                delay: i * 0.4,
              }}
            >
              <span class='flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15 text-white'>
                <point.icon class='size-4' aria-hidden='true' />
              </span>
              <span class='text-sm font-medium text-white'>{point.label}</span>
            </Motion.div>
          ))}
        </div>
      </div>

      <Motion.div
        class='pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-white/10'
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 6, repeat: Infinity, easing: 'ease-in-out' }}
      />
      <Motion.div
        class='pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-black/10'
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 7, repeat: Infinity, easing: 'ease-in-out' }}
      />
    </div>
  );
}

export default function Register() {
  const [fullName, setFullName] = createSignal('');
  const [email, setEmail] = createSignal('');
  const [password, setPassword] = createSignal('');
  const [acceptedTerms, setAcceptedTerms] = createSignal(false);

  const canSubmit = createMemo(
    () => fullName().trim() !== '' && email().trim() !== '' && password() !== '' && acceptedTerms(),
  );

  function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    // TODO: wire to POST /api/v1/auth/register once the backend is connected.
  }

  function handleGoogleRegister() {
    // TODO: wire to Google OAuth once set up — no-op for now.
  }

  return (
    <div class='grid h-dvh overflow-hidden lg:grid-cols-2'>
      <BannerPanel />

      <div class='flex items-center justify-center overflow-y-auto px-4 py-10 sm:px-6'>
        <div class='w-full max-w-sm'>
          <div class='mb-8'>
            <h2 class='text-2xl font-bold text-foreground'>Buat Akun Baru</h2>
            <p class='text-sm text-muted-foreground'>
              Daftar untuk mulai belanja atau jualan di kommers.
            </p>
          </div>

          <form class='flex flex-col gap-4' onSubmit={handleSubmit}>
            <TextField class='gap-1.5'>
              <TextFieldLabel>Nama Lengkap</TextFieldLabel>
              <TextFieldInput
                type='text'
                placeholder='Nama kamu'
                autocomplete='name'
                value={fullName()}
                onInput={(e) => setFullName(e.currentTarget.value)}
              />
            </TextField>

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
                placeholder='Minimal 8 karakter'
                autocomplete='new-password'
                value={password()}
                onInput={(e) => setPassword(e.currentTarget.value)}
              />
            </TextField>

            <Checkbox checked={acceptedTerms()} onChange={setAcceptedTerms}>
              <CheckboxControl />
              <CheckboxLabel>
                Saya menyetujui{' '}
                <A href='/terms' class='font-medium text-primary hover:underline'>
                  Syarat &amp; Ketentuan
                </A>{' '}
                kommers.
              </CheckboxLabel>
            </Checkbox>

            <Button type='submit' class='w-full' disabled={!canSubmit()}>
              Daftar
            </Button>
          </form>

          <div class='my-4 flex items-center gap-3'>
            <div class='h-px flex-1 bg-border' />
            <span class='text-xs text-muted-foreground'>atau</span>
            <div class='h-px flex-1 bg-border' />
          </div>

          <Button variant='outline' class='w-full gap-2' onClick={handleGoogleRegister}>
            <img src='/google.svg' alt='' class='size-4' />
            Daftar dengan Google
          </Button>

          <p class='mt-6 text-center text-sm text-muted-foreground'>
            Sudah punya akun?{' '}
            <LoginDialog
              trigger={
                <DialogTrigger as='button' class='font-medium text-primary hover:underline'>
                  Masuk
                </DialogTrigger>
              }
            />
          </p>
        </div>
      </div>
    </div>
  );
}
