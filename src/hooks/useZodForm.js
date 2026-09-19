'use client';

import { useState, useCallback } from 'react';
import { flattenZodErrors } from '@/lib/zod-utils';

/**
 * Custom React hook for state-based form management with Zod schema validation.
 *
 * @param {Object} initialValues - Default form field values object
 * @param {Object} [schema] - Optional Zod schema for client-side validation
 * @returns {Object} Form utilities including values, errors, handleChange, validate, setServerError, reset
 */
export function useZodForm(initialValues = {}, schema = null) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  /**
   * Update field value and automatically clear error for that specific field
   */
  const handleChange = useCallback((fieldName, value) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    setErrors((prev) => {
      if (!prev[fieldName]) return prev;
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  /**
   * Set field value generator for input onChange events
   */
  const register = useCallback(
    (fieldName) => ({
      value: values[fieldName] ?? '',
      onChange: (e) => {
        const val = e && e.target !== undefined ? (e.target.type === 'checkbox' ? e.target.checked : e.target.value) : e;
        handleChange(fieldName, val);
      },
    }),
    [values, handleChange]
  );

  /**
   * Client-side validation execution
   * @param {Object} [overrideSchema] - Optional schema if not provided to hook init
   * @returns {{ success: boolean, data?: any, errors: Record<string, string> }}
   */
  const validate = useCallback(
    (overrideSchema) => {
      const activeSchema = overrideSchema || schema;
      if (!activeSchema) {
        setErrors({});
        return { success: true, data: values, errors: {} };
      }

      const result = activeSchema.safeParse(values);
      if (!result.success) {
        const fieldErrors = flattenZodErrors(result.error);
        setErrors(fieldErrors);
        return { success: false, errors: fieldErrors };
      }

      setErrors({});
      return { success: true, data: result.data, errors: {} };
    },
    [values, schema]
  );

  /**
   * Merge backend server response errors into local error state
   * @param {Object|string} serverErrorResponse - Backend API response JSON (e.g. data.errors or data.error)
   */
  const setServerErrors = useCallback((serverErrorResponse) => {
    if (!serverErrorResponse) return;

    if (typeof serverErrorResponse === 'object' && serverErrorResponse.errors) {
      setErrors((prev) => ({ ...prev, ...serverErrorResponse.errors }));
    } else if (typeof serverErrorResponse === 'string') {
      setErrors((prev) => ({ ...prev, _form: serverErrorResponse }));
    } else if (typeof serverErrorResponse.error === 'string') {
      setErrors((prev) => ({ ...prev, _form: serverErrorResponse.error }));
    }
  }, []);

  /**
   * Reset form to initial state or new values
   */
  const reset = useCallback((newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
  }, [initialValues]);

  return {
    values,
    setValues,
    errors,
    setErrors,
    handleChange,
    register,
    validate,
    setServerErrors,
    reset,
  };
}

export default useZodForm;
