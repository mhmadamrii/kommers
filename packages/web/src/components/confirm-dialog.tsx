import type { JSX } from 'solid-js';
import { Button } from '~/components/ui/button';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPortal,
  DialogTitle,
} from '~/components/ui/dialog';

export function ConfirmDialog(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string | JSX.Element;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  confirming?: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogPortal>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{props.title}</DialogTitle>
            {props.description && <DialogDescription>{props.description}</DialogDescription>}
          </DialogHeader>

          <DialogFooter>
            <Button
              type='button'
              variant='outline'
              onClick={() => props.onOpenChange(false)}
              disabled={props.confirming}
            >
              {props.cancelLabel ?? 'Batal'}
            </Button>
            <Button
              type='button'
              variant={props.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={props.onConfirm}
              disabled={props.confirming}
            >
              {props.confirming ? 'Memproses...' : props.confirmLabel ?? 'Konfirmasi'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}
