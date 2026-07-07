import { Bell } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { notifications } from '@/lib/mock/notifications';

export function NotificationsSheet() {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant='neutral' size='icon' className='relative'>
          <Bell />
          {unreadCount > 0 && (
            <span className='absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full border-2 border-border bg-main text-xs text-main-foreground'>
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Notifications</SheetTitle>
        </SheetHeader>
        <div className='flex flex-1 flex-col gap-3 overflow-y-auto px-4'>
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className='rounded-base border-2 border-border p-3'
            >
              <div className='flex items-center justify-between'>
                <p className='font-heading text-sm'>{notification.title}</p>
                {!notification.read && (
                  <span className='size-2 rounded-full bg-main' />
                )}
              </div>
              <p className='text-sm text-foreground/70'>
                {notification.message}
              </p>
              <p className='mt-1 text-xs text-foreground/50'>
                {notification.createdAt}
              </p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
