import clsx from 'clsx';
import { ButtonHTMLAttributes } from 'react';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' };

export function Button({ variant = 'primary', className, ...props }: Props) {
  return (
    <button
      className={clsx(
        'rounded-lg px-4 py-2 text-sm font-medium transition',
        variant === 'primary'
          ? 'bg-brand-500 text-white hover:bg-brand-700'
          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
        className
      )}
      {...props}
    />
  );
}
