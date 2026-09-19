'use client';

import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { selectUser } from '@/lib/store/authSlice';
import Link from 'next/link';
import { FiUserCheck, FiX, FiArrowRight } from 'react-icons/fi';

export default function ProfilePromptBanner() {
  const user = useSelector(selectUser);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if (!user) {
      setDismissed(true);
      return;
    }

    // Check if name or phone is missing
    const isMissingDetails = !user.name || user.name.trim() === '' || !user.phone || user.phone.trim() === '';
    
    if (isMissingDetails) {
      const isDismissed = sessionStorage.getItem('dismissed_profile_prompt');
      if (!isDismissed) {
        setDismissed(false);
      }
    } else {
      setDismissed(true);
    }
  }, [user]);

  const handleDismiss = () => {
    sessionStorage.setItem('dismissed_profile_prompt', 'true');
    setDismissed(true);
  };

  if (dismissed || !user) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-brand-600 to-amber-600 text-white px-4 py-2.5 shadow-xs border-b border-white/10 z-40">
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-3 text-xs sm:text-[13px]">
        <div className="flex items-center gap-2 min-w-0">
          <FiUserCheck className="w-4 h-4 shrink-0 text-amber-200" />
          <p className="truncate font-medium">
            Welcome to HodaHub! Please complete your profile details (name & mobile number) for faster checkout.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/profile"
            className="flex items-center gap-1 bg-white text-warm-900 px-3 py-1 rounded-md font-bold text-[11px] hover:bg-warm-100 transition-colors shadow-2xs"
          >
            <span>Complete Profile</span>
            <FiArrowRight className="w-3 h-3" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded-md transition-colors text-white/90 hover:text-white"
            aria-label="Dismiss banner"
          >
            <FiX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
