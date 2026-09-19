'use client';

import { useState, useEffect } from 'react';
import FieldError from './FieldError';

const COUNTRY_OPTIONS = [
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'AE', name: 'UAE', dialCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', dialCode: '+966', flag: '🇸🇦' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
];

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
  const initial = parseE164(value);
  const [selectedDialCode, setSelectedDialCode] = useState(initial.dialCode);
  const [nationalNumber, setNationalNumber] = useState(initial.nationalNumber);

  useEffect(() => {
    const parsed = parseE164(value);
    setSelectedDialCode(parsed.dialCode);
    setNationalNumber(parsed.nationalNumber);
  }, [value]);

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
    setSelectedDialCode(newCode);
    emitValue(newCode, nationalNumber);
  }

  function handleNumberChange(e) {
    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
    setNationalNumber(val);
    emitValue(selectedDialCode, val);
  }

  const isError = Boolean(error);

  return (
    <div className={`space-y-1 ${className}`}>
      {label && (
        <label htmlFor={id || name} className="block text-[10px] font-semibold text-warm-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="flex gap-1.5 items-center">
        {/* Country Dial Code Dropdown */}
        <div className="relative shrink-0">
          <select
            value={selectedDialCode}
            onChange={handleCountryChange}
            disabled={disabled}
            aria-label="Country Dial Code"
            className={`px-2 py-1.5 bg-warm-50 border rounded-md text-[11px] font-medium text-warm-900 focus:outline-none focus:border-brand-600 cursor-pointer disabled:opacity-60 ${
              isError ? 'border-red-400 bg-red-50/20' : 'border-warm-200'
            }`}
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={`${c.code}-${c.dialCode}`} value={c.dialCode}>
                {c.flag} {c.dialCode}
              </option>
            ))}
          </select>
        </div>

        {/* Local Number Text Input */}
        <input
          id={id || name}
          name={name}
          type="tel"
          value={nationalNumber}
          onChange={handleNumberChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`w-full px-2.5 py-1.5 bg-white border rounded-md text-[11px] text-warm-900 focus:outline-none transition-colors ${
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
