export function validatePriceRange(min, max) {
  const valid = (value) => value === '' || value === undefined || value === null || (Number.isFinite(Number(value)) && Number(value) >= 0);
  if (!valid(min) || !valid(max)) return 'Enter a valid, non-negative price.';
  if (min !== '' && max !== '' && min != null && max != null && Number(min) > Number(max)) return 'Maximum price must be greater than or equal to minimum price.';
  return '';
}
