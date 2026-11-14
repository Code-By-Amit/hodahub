'use client';

import { Children, useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, ChevronDown, Search } from 'lucide-react';

export default function CustomSelect({ options = [], value = '', onChange, placeholder = 'Select an option', disabled = false, className = '', triggerClassName = '', id, name, required = false, searchable, 'aria-label': ariaLabel, 'aria-labelledby': labelledBy, 'aria-describedby': describedBy, 'aria-invalid': invalid }) {
  const generatedId = useId();
  const selectId = id || generatedId;
  const listId = selectId + '-list';
  const triggerRef = useRef(null);
  const popupRef = useRef(null);
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [position, setPosition] = useState({});
  const normalized = Array.from(new Map(options.map((option) => {
    const item = typeof option === 'object' && option !== null ? option : { value: option, label: String(option) };
    return [String(item.value), item];
  })).values());
  const selected = normalized.find((option) => String(option.value) === String(value));
  const filtered = normalized.filter((option) => String(option.label).toLowerCase().includes(query.toLowerCase()));
  const canSearch = searchable ?? normalized.length > 8;

  const measurePosition = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const height = window.visualViewport?.height || window.innerHeight;
    const width = Math.min(Math.max(rect.width, 180), window.innerWidth - 16);
    const below = height - rect.bottom - 12;
    const above = rect.top - 12;
    const upwards = below < 220 && above > below;
    setPosition({ position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)), width, maxHeight: Math.max(80, Math.min(320, upwards ? above : below)), ...(upwards ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }) });
  }, []);

  function show() {
    if (disabled) return;
    measurePosition();
    setQuery('');
    setActive(Math.max(0, normalized.findIndex((option) => String(option.value) === String(value))));
    setOpen(true);
  }

  function choose(option) {
    if (!option || option.disabled) return;
    onChange?.(option.value);
    setOpen(false);
  }

  function handleOptionClick(event) {
    choose(filtered[Number(event.currentTarget.dataset.optionIndex)]);
    triggerRef.current?.focus({ preventScroll: true });
  }

  function handleKeyDown(event) {
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      event.stopPropagation();
      triggerRef.current?.focus({ preventScroll: true });
    } else if (event.key === 'Tab') {
      setOpen(false);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) { show(); return; }
      const direction = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => {
        for (let step = 1; step <= filtered.length; step++) {
          const next = (index + direction * step + filtered.length) % filtered.length;
          if (!filtered[next]?.disabled) return next;
        }
        return index;
      });
    } else if (event.key === 'Home' && open) {
      event.preventDefault(); setActive(0);
    } else if (event.key === 'End' && open) {
      event.preventDefault(); setActive(Math.max(0, filtered.length - 1));
    } else if (event.key === 'Enter' || (event.key === ' ' && event.target === triggerRef.current)) {
      event.preventDefault();
      if (open) { choose(filtered[active]); triggerRef.current?.focus({ preventScroll: true }); } else show();
    } else if (open && !canSearch && event.key.length === 1) {
      const index = filtered.findIndex((option) => !option.disabled && String(option.label).toLowerCase().startsWith(event.key.toLowerCase()));
      if (index >= 0) setActive(index);
    }
  }

  useEffect(() => {
    if (!open) return;
    function positionPopup() {
      measurePosition();
    }
    function outside(event) {
      if (!triggerRef.current?.contains(event.target) && !popupRef.current?.contains(event.target)) setOpen(false);
    }
    positionPopup();
    if (canSearch) searchRef.current?.focus({ preventScroll: true });
    document.addEventListener('pointerdown', outside);
    window.addEventListener('resize', positionPopup);
    window.addEventListener('scroll', positionPopup, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      window.removeEventListener('resize', positionPopup);
      window.removeEventListener('scroll', positionPopup, true);
    };
  }, [open, canSearch, measurePosition]);

  useEffect(() => {
    if (!open) return;
    const list = listRef.current;
    const activeNode = list?.querySelector('[data-option-index="' + active + '"]');
    if (!list || !activeNode) return;
    const listRect = list.getBoundingClientRect();
    const optionRect = activeNode.getBoundingClientRect();
    if (optionRect.top < listRect.top) list.scrollTop -= listRect.top - optionRect.top;
    else if (optionRect.bottom > listRect.bottom) list.scrollTop += optionRect.bottom - listRect.bottom;
  }, [active, open]);

  return (
    <div className={'relative w-full min-w-0 ' + className}>
      {(name || required) && <input className="sr-only" tabIndex={-1} aria-hidden="true" name={name} value={value ?? ''} required={required} disabled={disabled} onChange={() => {}} onInvalid={() => triggerRef.current?.focus()} />}
      <button ref={triggerRef} id={selectId} type="button" disabled={disabled} role="combobox" aria-label={ariaLabel || (!labelledBy ? placeholder : undefined)} aria-labelledby={labelledBy} aria-describedby={describedBy} aria-invalid={invalid} aria-haspopup="listbox" aria-expanded={open} aria-controls={open ? listId : undefined} aria-activedescendant={open && filtered[active] ? listId + '-' + active : undefined} onKeyDown={handleKeyDown} onClick={() => open ? setOpen(false) : show()} className={'custom-select-trigger flex w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 py-0 text-left text-sm font-normal transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 disabled:cursor-not-allowed disabled:bg-warm-50 disabled:text-warm-400 ' + (open ? 'border-brand-500 text-warm-900 ' : 'border-warm-200 text-warm-800 hover:border-warm-400 ') + triggerClassName}>
        <span className={'truncate ' + (selected ? '' : 'text-warm-500')}>{selected?.label ?? placeholder}</span>
        <ChevronDown aria-hidden="true" className={'select-chevron shrink-0 text-warm-500 transition-transform ' + (open ? 'rotate-180' : '')} />
      </button>
      {open && !disabled && createPortal(
        <div ref={popupRef} style={position} className="z-[300] flex flex-col overflow-hidden custom-select-popup rounded-lg border border-warm-200 bg-white p-1 shadow-lg" onKeyDown={handleKeyDown}>
          {canSearch && <div className="mb-1 border-b border-warm-100 pb-1.5"><div className="relative flex items-center"><Search aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-warm-400" /><input ref={searchRef} role="combobox" aria-label="Search options" aria-expanded="true" aria-controls={listId} aria-activedescendant={filtered[active] ? listId + '-' + active : undefined} value={query} onChange={(event) => { setQuery(event.target.value); setActive(0); }} placeholder="Search…" className="min-h-10 w-full rounded-lg bg-warm-50 py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-brand-500/20" /></div></div>}
          <div ref={listRef} id={listId} role="listbox" aria-label={ariaLabel || placeholder} className="min-h-0 overflow-x-hidden overflow-y-auto overscroll-contain">
            {filtered.length ? filtered.map((option, index) => <div key={String(option.value)} id={listId + '-' + index} role="option" aria-selected={String(option.value) === String(value)} aria-disabled={option.disabled || undefined} data-option-index={index} onPointerMove={() => setActive(index)} onPointerDown={(event) => event.preventDefault()} onClick={handleOptionClick} className={'select-option flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm ' + (option.disabled ? 'cursor-not-allowed text-warm-300 ' : index === active ? 'bg-warm-100 text-warm-900 ' : 'text-warm-700 ') + (String(option.value) === String(value) ? 'font-semibold text-brand-700' : '')}><span className="min-w-0 break-words">{option.label}</span>{String(option.value) === String(value) && <Check aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-600" />}</div>) : <p role="status" className="px-3 py-5 text-center text-sm text-warm-500">No matches found</p>}
          </div>
        </div>, document.body
      )}
    </div>
  );
}

// Preserve existing form events while rendering the shared custom dropdown.
export function CustomSelectField({ children, onChange, className, containerClassName = "", ...props }) {
  const options = Children.toArray(children).filter((child) => child?.props).map((child) => ({ value: child.props.value ?? child.props.children, label: Children.toArray(child.props.children).join(''), disabled: child.props.disabled }));
  return <CustomSelect {...props} className={containerClassName} triggerClassName={className} options={options} onChange={(value) => onChange?.({ target: { value: String(value), name: props.name }, currentTarget: { value: String(value), name: props.name } })} />;
}
