import React, { ReactNode } from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'outline';
  children: ReactNode;
}

export const Button = ({ variant = 'primary', children, className, ...props }: ButtonProps) => {
  const variants = {
    primary: 'bg-ink text-cream hover:bg-accent',
    ghost: 'text-ink-muted hover:text-ink',
    outline: 'border border-ink bg-transparent text-ink hover:bg-ink hover:text-cream',
  };

  return (
    <button 
      className={cn(
        'interactive px-6 py-2.5 font-bn transition-all flex items-center justify-center gap-2',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};
