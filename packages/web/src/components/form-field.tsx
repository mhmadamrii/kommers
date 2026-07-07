import * as React from 'react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

interface FormFieldProps extends React.ComponentProps<typeof Input> {
  label: string;
  error?: string;
}

export function FormField({
  label,
  error,
  id,
  className,
  ...props
}: FormFieldProps) {
  const fieldId = id ?? props.name;

  return (
    <div className='flex flex-col gap-1.5'>
      <Label htmlFor={fieldId}>{label}</Label>
      <Input
        id={fieldId}
        className={cn(error && 'border-red-500', className)}
        aria-invalid={!!error}
        {...props}
      />
      {error && <p className='text-sm text-red-500'>{error}</p>}
    </div>
  );
}
