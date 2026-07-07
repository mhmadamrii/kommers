export interface Notification {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export const notifications: Notification[] = [
  {
    id: 'notif-1',
    title: 'Order shipped',
    message: 'Order #ord-1002 is on its way.',
    createdAt: '2026-07-06',
    read: false,
  },
  {
    id: 'notif-2',
    title: 'Order confirmed',
    message: 'Order #ord-1003 has been confirmed and is processing.',
    createdAt: '2026-07-04',
    read: false,
  },
  {
    id: 'notif-3',
    title: 'Price drop',
    message: 'ClearView 27" Monitor is now 15% off.',
    createdAt: '2026-07-02',
    read: true,
  },
  {
    id: 'notif-4',
    title: 'Order delivered',
    message: 'Order #ord-1001 was delivered.',
    createdAt: '2026-06-29',
    read: true,
  },
];
