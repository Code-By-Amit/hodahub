export default function LoadingSpinner({ size = 'md', className = '' }) {
  const sizes = {
    xs: 'w-4 h-4 border-[1.5px]',
    sm: 'w-5 h-5 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-[3px]',
    xl: 'w-16 h-16 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`${sizes[size]} border-brand-200 border-t-brand-500 rounded-full animate-spin`}
      />
    </div>
  );
}

export function PageLoader({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <LoadingSpinner size="lg" />
      <p className="text-sm text-warm-500 animate-pulse">{message}</p>
    </div>
  );
}
