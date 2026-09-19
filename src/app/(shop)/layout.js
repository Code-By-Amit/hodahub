import AnnouncementBar from '@/components/storefront/AnnouncementBar';
import Header from '@/components/storefront/Header';
import ProfilePromptBanner from '@/components/storefront/ProfilePromptBanner';
import Footer from '@/components/storefront/Footer';

export default function ShopLayout({ children }) {
  return (
    <>
      <AnnouncementBar />
      <Header />
      <ProfilePromptBanner />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
