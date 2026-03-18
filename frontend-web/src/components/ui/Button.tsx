import type { ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'secondary' | 'danger';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
};

const variantClasses: Record<Variant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500',
  secondary: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-gray-300',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
};

export function Button({ variant = 'primary', loading, children, disabled, ...props }: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200
        focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50
        ${variantClasses[variant]} ${props.className ?? ''}`}
    >
      {loading ? 'Aguarde...' : children}
    </button>
  );
}
