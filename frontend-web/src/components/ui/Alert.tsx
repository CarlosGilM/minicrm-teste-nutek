type AlertProps = {
  message: string;
  variant?: 'error' | 'success';
};

const variants = {
  error: 'bg-red-100 text-red-600',
  success: 'bg-green-100 text-green-700',
};

export function Alert({ message, variant = 'error' }: AlertProps) {
  if (!message) return null;
  return (
    <div className={`rounded p-3 text-sm ${variants[variant]}`}>
      {message}
    </div>
  );
}
