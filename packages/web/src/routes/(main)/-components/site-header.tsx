import * as React from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

import { CartSheet } from './cart-sheet';
import { NotificationsSheet } from './notifications-sheet';

export function SiteHeader() {
  const navigate = useNavigate();
  const [query, setQuery] = React.useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    navigate({ to: '/search', search: { q: query } });
  }

  return (
    <header className='sticky top-0 z-40 border-b-2 border-border bg-background'>
      <div className='mx-auto flex max-w-6xl items-center gap-4 px-4 py-3'>
        <Link to='/' className='font-heading text-xl'>
          kommers
        </Link>
        <nav className='hidden items-center gap-4 text-sm font-heading sm:flex'>
          <Link to='/products' className='hover:underline'>
            Products
          </Link>
          <Link to='/categories' className='hover:underline'>
            Categories
          </Link>
          <Link to='/orders' className='hover:underline'>
            Orders
          </Link>
        </nav>
        <form onSubmit={handleSearch} className='ml-auto flex-1 max-w-xs'>
          <div className='relative'>
            <Search className='pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-foreground/50' />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder='Search products...'
              className='pl-8'
            />
          </div>
        </form>
        <div className='flex items-center gap-2'>
          <NotificationsSheet />
          <CartSheet />
          <Button variant='neutral' asChild>
            <Link to='/auth'>Account</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
