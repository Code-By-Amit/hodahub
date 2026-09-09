'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export default function CustomSelect({
  options = [],
  value = '',
  onChange,
  placeholder = 'Select option...',
  disabled = false,
  className = '',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Normalize options array: support [{value, label}] or string/number array
  const formattedOptions = options.map((opt) =>
    typeof opt === 'object' && opt !== null ? opt : { value: opt, label: String(opt) }
  );

  const selectedOption = formattedOptions.find((opt) => String(opt.value) === String(value));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (optValue) => {
    if (disabled) return;
    onChange(optValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-3 py-1.5 bg-white border rounded-md text-left text-[11px] font-medium flex items-center justify-between transition-all ${
          disabled
            ? 'bg-warm-50 border-warm-200 text-warm-400 cursor-not-allowed'
            : isOpen
            ? 'border-brand-500 ring-2 ring-brand-500/10 text-warm-900'
            : 'border-warm-200 text-warm-900 hover:border-warm-300'
        }`}
      >
        <span className={selectedOption ? 'text-warm-900 truncate' : 'text-warm-400 truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-warm-500 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1.5 bg-white border border-warm-200 rounded-lg shadow-lg max-h-60 overflow-y-auto py-1 animate-fadeIn">
          {formattedOptions.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-warm-400 text-center">No options</div>
          ) : (
            formattedOptions.map((opt) => {
              const isSelected = String(opt.value) === String(value);
              return (
                <button
                  key={String(opt.value)}
                  type="button"
                  onClick={() => handleSelect(opt.value)}
                  className={`w-full px-3.5 py-2 text-left text-[11px] font-medium flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-brand-50 text-brand-700 font-semibold'
                      : 'text-warm-800 hover:bg-warm-50'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
