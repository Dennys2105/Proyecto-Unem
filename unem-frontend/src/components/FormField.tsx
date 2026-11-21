import type { UseFormRegister, FieldErrors } from 'react-hook-form';

interface FormFieldProps {
  label: string; name: string;
  type?: 'text' | 'password' | 'email' | 'number' | 'date' | 'time';
  register: UseFormRegister<any>; errors: FieldErrors;
  placeholder?: string; disabled?: boolean;
}

export const FormField = ({ label, name, type = 'text', register, errors, placeholder, disabled = false }: FormFieldProps) => {
  const error = errors[name];
  const msg = error && typeof error.message === 'string' ? error.message : null;
  return (
    <div className="unem-field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name} type={type} {...register(name)} placeholder={placeholder} disabled={disabled}
        className="unem-input" style={msg ? { borderColor: 'var(--danger)' } : undefined}
      />
      {msg && <span style={{ color: 'var(--danger)', fontSize: 12 }}>{msg}</span>}
    </div>
  );
};