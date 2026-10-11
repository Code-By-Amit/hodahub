'use client';

import React from 'react';

/**
 * @typedef {Object} ColumnDef
 * @property {string} key - Unique key for the column
 * @property {React.ReactNode} header - Header label or component
 * @property {'left' | 'center' | 'right'} [align='left'] - Text alignment
 * @property {string} [className=''] - Cell CSS class names
 * @property {string} [headerClassName=''] - Header CSS class names
 * @property {(value: unknown, row: Record<string, unknown>, index: number) => React.ReactNode} [render] - Custom cell renderer
 */

/**
 * Reusable DataTable component with column configs, skeleton loader, and empty state.
 *
 * @param {Object} props
 * @param {ColumnDef[]} props.columns - Column configuration definitions
 * @param {Array<Record<string, unknown>>} props.data - Array of row records
 * @param {boolean} [props.loading=false] - Whether data is loading
 * @param {number} [props.skeletonRows=5] - Number of skeleton rows to render during loading
 * @param {React.ReactNode} [props.emptyState] - Component or message when table has no data
 * @param {(row: Record<string, unknown>, index: number) => string | number} [props.rowKey] - Key extractor for rows
 * @param {string} [props.className=''] - Table wrapper CSS class names
 */
export default function DataTable({
  columns,
  data = [],
  loading = false,
  skeletonRows = 5,
  emptyState,
  rowKey,
  className = '',
}) {
  const getRowKey = (row, index) => {
    if (rowKey) return rowKey(row, index);
    if (row && typeof row === 'object' && row.id) return row.id;
    return index;
  };

  const getAlignClass = (align) => {
    switch (align) {
      case 'center':
        return 'text-center';
      case 'right':
        return 'text-right';
      case 'left':
      default:
        return 'text-left';
    }
  };

  return (
    <div className={`bg-white rounded-md border border-warm-200 shadow-2xs overflow-x-auto ${className}`}>
      <table className="w-full text-[11px] border-collapse" role="table">
        <thead>
          <tr className="bg-warm-50/70 border-b border-warm-200 text-warm-600 text-[10px] uppercase tracking-wider font-semibold">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-3 py-2.5 ${getAlignClass(col.align)} ${col.headerClassName || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-warm-100">
          {loading ? (
            Array.from({ length: skeletonRows }).map((_, rIdx) => (
              <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                {columns.map((col) => (
                  <td
                    key={`skeleton-${rIdx}-${col.key}`}
                    className={`px-3 py-3.5 ${getAlignClass(col.align)}`}
                  >
                    <div
                      className={`h-3 bg-warm-200/70 rounded ${
                        col.align === 'right'
                          ? 'ml-auto w-16'
                          : col.align === 'center'
                          ? 'mx-auto w-12'
                          : 'w-24'
                      }`}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-8 text-center text-warm-400 text-[11px]"
              >
                {emptyState || 'No records found.'}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={getRowKey(row, index)}
                className="hover:bg-warm-50/50 transition-colors"
              >
                {columns.map((col) => {
                  const val = row[col.key];
                  const content = col.render ? col.render(val, row, index) : (val ?? '—');
                  return (
                    <td
                      key={`${getRowKey(row, index)}-${col.key}`}
                      className={`px-3 py-2.5 ${getAlignClass(col.align)} ${col.className || ''}`}
                    >
                      {content}
                    </td>
                  );
                })}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
