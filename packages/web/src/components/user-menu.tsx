import { Link, useNavigate } from '@tanstack/react-router';
import { LogOut } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { logout, useAuthStore } from '@/lib/auth-store';

// UserMenu renders the auth corner of a header: user identity + logout when
// logged in, a link to /auth otherwise. Renders the guest state until the
// persisted store hydrates so SSR markup matches the first client render.
export function UserMenu() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);

  if (!hasHydrated || !user) {
    return (
      <Button variant='neutral' asChild>
        <Link to='/auth'>Login</Link>
      </Button>
    );
  }

  async function handleLogout() {
    await logout();
    navigate({ to: '/' });
  }

  return (
    <div className='flex items-center gap-2'>
      <span
        className='hidden max-w-40 truncate text-sm sm:inline'
        title={user.email}
      >
        {user.email}
      </span>
      {user.role === 'admin' && (
        <span className='rounded-base border-2 border-border bg-main px-1.5 py-0.5 text-xs font-heading'>
          admin
        </span>
      )}
      <Button
        variant='neutral'
        size='icon'
        onClick={handleLogout}
        title='Log out'
      >
        <LogOut className='size-4' />
        <span className='sr-only'>Log out</span>
      </Button>
    </div>
  );
}
