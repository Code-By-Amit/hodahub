'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export default function PasswordInput({
  value,
  onChange,
  placeholder = 'Enter password',
  className = '',
  name = 'password',
  id,
  required = false,
  disabled = false,
  autoComplete,
  ...props
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="relative w-full">
      <input
        type={showPassword ? 'text' : 'password'}
        value={value || ''}
        onChange={onChange}
        placeholder={placeholder}
        name={name}
        id={id || name}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        className={`w-full pr-9 ${className}`}
        {...props}
      />
      <button
        type="button"
        onClick={() => setShowPassword((prev) => !prev)}
        disabled={disabled}
        tabIndex={-1}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-warm-400 hover:text-warm-700 focus:outline-none transition-colors cursor-pointer"
        aria-label={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? (
          <EyeOff className="w-3.5 h-3.5 text-warm-500" />
        ) : (
          <Eye className="w-3.5 h-3.5 text-warm-400" />
        )}
      </button>
    </div>
  );
}
