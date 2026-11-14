'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiInstagram, FiTwitter, FiFacebook, FiYoutube } from 'react-icons/fi';
import { settingsApi } from '@/lib/apiClient/settings.api';
import { CookieSettingsButton } from '@/components/analytics/CookieConsent';

export default function Footer() {
  const [settings, setSettings] = useState({
    storeName: 'HodaHub',
    instagramUrl: '',
    facebookUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
  });

  useEffect(() => {
    settingsApi
      .getPublic()
      .then((data) => {
        if (data?.settings) {
          setSettings(data.settings);
        }
      })
      .catch(() => {});
  }, []);

  const socialItems = [
    { Icon: FiInstagram, href: settings.instagramUrl, label: 'Instagram' },
    { Icon: FiTwitter, href: settings.twitterUrl, label: 'Twitter' },
    { Icon: FiFacebook, href: settings.facebookUrl, label: 'Facebook' },
    { Icon: FiYoutube, href: settings.youtubeUrl, label: 'YouTube' },
  ].filter((item) => Boolean(item.href && item.href.trim() !== ''));

  return (
    <footer className="bg-warm-900 text-warm-300 print:hidden">
      <div className="store-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="inline-flex shrink-0 items-center gap-2">
            <img src="/logof.png" alt="HodaHub" className="h-7 w-auto object-contain" />
            <span className="text-sm font-bold text-white">{settings.storeName || "HodaHub"}</span>
          </Link>
          <p className="text-[10px] text-warm-400">&copy; {new Date().getFullYear()} All rights reserved.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <nav aria-label="Footer policies and support" className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px]">
            <Link href="/contact" className="hover:text-white">Support</Link>
            <Link href="/shipping" className="hover:text-white">Shipping</Link>
            <Link href="/returns" className="hover:text-white">Returns</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <CookieSettingsButton className="hover:text-white">Cookie settings</CookieSettingsButton>
          </nav>
          {socialItems.length > 0 && <div className="flex items-center gap-2">{socialItems.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label} className="inline-flex h-7 w-7 items-center justify-center rounded-full text-warm-400 hover:bg-warm-800 hover:text-white"><item.Icon className="h-3.5 w-3.5" /></a>)}</div>}
        </div>
      </div>
    </footer>
  );
}
