import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  ({ label, error, id, ...props }, ref) => {
    const inputId = id ?? label.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
        <input
          id={inputId}
          ref={ref}
          {...props}
          className={`mt-1 block w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-blue-500
            ${error ? 'border-red-500 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'}
            ${props.className ?? ''}`}
        />
        {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
      </div>
    );
  }
);

FormField.displayName = 'FormField';
