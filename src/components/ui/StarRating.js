import { FiStar } from 'react-icons/fi';

export default function StarRating({ rating = 0, count, size = 'sm' }) {
  const stars = [];
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;

  const sizes = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      stars.push(
        <FiStar key={i} className={`${sizes[size]} fill-amber-400 text-amber-400`} />
      );
    } else if (i === fullStars && hasHalf) {
      stars.push(
        <div key={i} className="relative">
          <FiStar className={`${sizes[size]} text-warm-200`} />
          <div className="absolute inset-0 overflow-hidden w-1/2">
            <FiStar className={`${sizes[size]} fill-amber-400 text-amber-400`} />
          </div>
        </div>
      );
    } else {
      stars.push(
        <FiStar key={i} className={`${sizes[size]} text-warm-200`} />
      );
    }
  }

  return (
    <div className="flex items-center gap-0.5">
      <div className="flex items-center gap-px">{stars}</div>
      {count !== undefined && (
        <span className="text-[9px] text-warm-400 ml-0.5">({count})</span>
      )}
    </div>
  );
}