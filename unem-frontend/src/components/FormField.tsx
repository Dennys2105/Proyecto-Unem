import type { UseFormRegister, FieldErrors } from 'react-hook-form';

interface FormFieldProps {
  label: string;
  name: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'date' | 'time';
  register: UseFormRegister<any>;
  errors: FieldErrors;
  placeholder?: string;
  disabled?: boolean;
}

export const FormField = ({ 
  label, 
  name, 
  type = 'text', 
  register, 
  errors, 
  placeholder,
  disabled = false 
}: FormFieldProps) => {
  const error = errors[name];
  const errorMessage = error && typeof error.message === 'string' ? error.message : null;

  return (
    <div className="space-y-1">
      <label htmlFor={name} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={name}
        type={type}
        {...register(name)}
        placeholder={placeholder}
        disabled={disabled}
        className={`block w-full rounded-md border px-3 py-2 shadow-sm focus:outline-none focus:ring-1 sm:text-sm disabled:bg-gray-100 disabled:cursor-not-allowed ${
          errorMessage 
            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
            : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
        }`}
      />
      {errorMessage && (
        <p className="text-sm text-red-600">{errorMessage}</p>
      )}
    </div>
  );
};