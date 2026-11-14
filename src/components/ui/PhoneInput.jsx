'use client';
import { CustomSelectField } from '@/components/ui/CustomSelect';


import FieldError from './FieldError';

const COUNTRY_OPTIONS = [{ code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' }];

/**
 * Parses raw input value into dial code and national number
 */
function parseE164(rawVal) {
  if (!rawVal || typeof rawVal !== 'string') {
    return { dialCode: '+91', nationalNumber: '' };
  }
  const str = rawVal.trim();
  const matched = COUNTRY_OPTIONS.find((c) => str.startsWith(c.dialCode));
  if (matched) {
    return {
      dialCode: matched.dialCode,
      nationalNumber: str.slice(matched.dialCode.length).replace(/\D/g, ''),
    };
  }
  // Strip leading 0 or +91 if user saved raw 10 digits or 91
  if (str.startsWith('+')) {
    const digitsOnly = str.replace(/\D/g, '');
    return { dialCode: '+91', nationalNumber: digitsOnly.slice(-10) };
  }
  const clean = str.replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return { dialCode: '+91', nationalNumber: clean.slice(2) };
  }
  return { dialCode: '+91', nationalNumber: clean };
}

/**
 * PhoneInput component combining country dial code selector & local number input.
 * Outputs E.164 formatted string e.g. "+919876543210".
 */
export default function PhoneInput({
  value = '',
  onChange,
  error,
  label,
  placeholder = '9876543210',
  id,
  name,
  disabled = false,
  required = false,
  className = '',
}) {
  const { dialCode: selectedDialCode, nationalNumber } = parseE164(value);

  function emitValue(dialCode, number) {
    const cleanNum = number.replace(/\D/g, '');
    if (!cleanNum) {
      if (onChange) onChange('');
      return;
    }
    const e164 = `${dialCode}${cleanNum}`;
    if (onChange) onChange(e164);
  }

  function handleCountryChange(e) {
    const newCode = e.target.value;
    emitValue(newCode, nationalNumber);
  }

  function handleNumberChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    emitValue(selectedDialCode, val);
  }

  const isError = Boolean(error);

  return (
    <div className={`min-w-0 space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-[10px] font-semibold text-warm-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="phone-field">
        {/* Country Dial Code Dropdown */}
        <div className="phone-prefix relative">
          <CustomSelectField
            value={selectedDialCode}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Country Dial Code"
            className={`text-warm-900 focus:border-brand-600 disabled:opacity-60 ${
              isError ? 'border-red-400 bg-red-50/20' : 'border-warm-200'
            }`}
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                {c.dialCode}
              </option>
            ))}
          </CustomSelectField>
        </div>

        {/* Local Number Text Input */}
        <input
          id={id || name}
          name={name}
          type="tel"
          autoComplete="tel-national"
          inputMode="numeric"
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`h-10 min-w-0 flex-1 px-3 py-0 bg-white border rounded-lg text-sm text-warm-900 focus:outline-none transition-colors ${
            isError
              ? 'border-red-500 bg-red-50/20 text-red-900 focus:border-red-600'
              : 'border-warm-200 focus:border-brand-600'
          }`}
        />
      </div>

      <FieldError message={error} />
    </div>
  );
}
