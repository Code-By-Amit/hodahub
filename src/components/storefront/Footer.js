'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { FiInstagram, FiTwitter, FiFacebook, FiYoutube } from 'react-icons/fi';

const footerLinks = {
  Shop: [
    { label: 'New Arrivals', href: '/products?sort=newest' },
    { label: 'Best Sellers', href: '/products?sort=best-sellers' },
    { label: 'All Products', href: '/products' },
    { label: 'Categories', href: '/categories' },
    { label: 'Sale', href: '/products?sort=discount' },
  ],
  'Customer Service': [
    { label: 'Contact Us', href: '/contact' },
    { label: 'Shipping Info', href: '/shipping' },
    { label: 'Returns & Exchanges', href: '/returns' },
    { label: 'FAQs', href: '/faq' },
  ],
  About: [
    { label: 'Our Story', href: '/about' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Contact', href: '/contact' },
  ],
};

export default function Footer() {
  const [settings, setSettings] = useState({
    storeName: 'HodaHub',
    instagramUrl: '',
    facebookUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
  });

  useEffect(() => {
    fetch('/api/settings')
      .then((res) => res.json())
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
      {/* Main footer */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 mb-2">
              <img src="/logof.png" alt="HodaHub" className="h-8 w-auto object-contain bg-white/10 p-1 rounded" />
              <span className="text-base font-extrabold text-white tracking-tight">
                {settings.storeName || 'HodaHub'}
              </span>
            </Link>
            <p className="text-[11px] text-warm-400 leading-relaxed mb-3 max-w-xs">
              Discover trending products curated for modern lifestyles. Premium quality, delivered fast.
            </p>
            {/* Social links */}
            {socialItems.length > 0 && (
              <div className="flex items-center gap-2">
                {socialItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="w-6 h-6 rounded-full bg-warm-800 flex items-center justify-center text-warm-400 hover:bg-brand-500 hover:text-white transition-all duration-200"
                  >
                    <item.Icon className="w-3 h-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-[11px] font-semibold text-white uppercase tracking-wider mb-2">{title}</h3>
              <ul className="leading-4 space-y-1">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[11px] text-warm-400 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-warm-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-[10px] text-warm-500">
              &copy; {new Date().getFullYear()} {settings.storeName || 'HodaHub'}. All rights reserved.
            </p>
            <div className="flex items-center gap-4 text-[10px] text-warm-500">
              <Link href="/privacy" className="hover:text-warm-300 transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-warm-300 transition-colors">Terms of Service</Link>
              <Link href="/contact" className="hover:text-warm-300 transition-colors">Support</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}