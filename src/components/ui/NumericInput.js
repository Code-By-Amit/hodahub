'use client';

import React from 'react';

/**
 * NumericInput enforces numeric-only input on the frontend.
 * Blocks typing non-numeric characters ('e', 'E', '+', '-') as the user types,
 * strips invalid characters on paste/change, and prevents negative values.
 */
export default function NumericInput({
  value,
  onChange,
  min = 0,
  max,
  step = 'any',
  allowDecimals = true,
  placeholder = '0',
  className = '',
  required = false,
  disabled = false,
  id,
  name,
  ...rest
}) {
  const handleKeyDown = (e) => {
    // Prevent typing exponent notation or sign characters
    if (['e', 'E', '+', '-'].includes(e.key)) {
      e.preventDefault();
    }
  };

  const handleChange = (e) => {
    let raw = e.target.value;

    // Filter characters
    if (allowDecimals) {
      // Allow numbers and single decimal point
      raw = raw.replace(/[^0-9.]/g, '');
      const parts = raw.split('.');
      if (parts.length > 2) {
        raw = parts[0] + '.' + parts.slice(1).join('');
      }
    } else {
      raw = raw.replace(/[^0-9]/g, '');
    }

    if (raw !== '' && !isNaN(Number(raw))) {
      const numVal = Number(raw);
      if (min !== undefined && numVal < min && !raw.endsWith('.')) {
        raw = String(min);
      }
      if (max !== undefined && numVal > max) {
        raw = String(max);
      }
    }

    onChange(raw);
  };

  const handlePaste = (e) => {
    const pastedText = e.clipboardData.getData('text');
    const regex = allowDecimals ? /^[0-9.]+$/ : /^[0-9]+$/;
    if (!regex.test(pastedText)) {
      e.preventDefault();
      const sanitized = allowDecimals
        ? pastedText.replace(/[^0-9.]/g, '')
        : pastedText.replace(/[^0-9]/g, '');
      if (sanitized) {
        onChange(sanitized);
      }
    }
  };

  const handleWheel = (e) => {
    // Prevent accidental scroll-to-change value when focused
    e.target.blur();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const droppedText = e.dataTransfer.getData('text');
    const sanitized = allowDecimals
      ? droppedText.replace(/[^0-9.]/g, '')
      : droppedText.replace(/[^0-9]/g, '');
    if (sanitized) {
      onChange(sanitized);
    }
  };

  return (
    <input
      type="text"
      inputMode={allowDecimals ? 'decimal' : 'numeric'}
      id={id}
      name={name}
      value={value ?? ''}
      onKeyDown={handleKeyDown}
      onChange={handleChange}
      onPaste={handlePaste}
      onWheel={handleWheel}
      onDrop={handleDrop}
      placeholder={placeholder}
      className={className}
      required={required}
      disabled={disabled}
      {...rest}
    />
  );
}
