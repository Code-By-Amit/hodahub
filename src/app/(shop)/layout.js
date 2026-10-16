import { Suspense } from 'react';
import AnnouncementBar from '@/components/storefront/AnnouncementBar';
import Header from '@/components/storefront/Header';
import ProfilePromptBanner from '@/components/storefront/ProfilePromptBanner';
import Footer from '@/components/storefront/Footer';
import MetaPixel from '@/components/analytics/MetaPixel';
import CookieConsent from '@/components/analytics/CookieConsent';
import GA4 from '@/components/analytics/GA4';

export default function ShopLayout({ children }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <ProfilePromptBanner />
      <main className="flex-1">{children}</main>
      <Suspense fallback={null}>
        <MetaPixel />
        <GA4 />
        <CookieConsent />
      </Suspense>
      <Footer />
    </>
  );
}