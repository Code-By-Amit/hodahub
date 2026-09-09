import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import ReduxProvider from "@/components/providers/ReduxProvider";
import QueryProvider from "@/components/providers/QueryProvider";
import AuthHydrator from "@/components/providers/AuthHydrator";
import { ToastProvider } from "@/components/ui/Toast";
import AnalyticsTracker from "@/components/analytics/AnalyticsTracker";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata = {
  title: "HodaHub — Official Online Store",
  description:
    "Discover trending products curated for modern lifestyles. Free shipping on orders over $50. Shop fashion, electronics, beauty, fitness & more.",
  keywords: ["ecommerce", "online shopping", "trending products", "HodaHub"],
  openGraph: {
    title: "HodaHub — Official Online Store",
    description: "Shop quality products delivered directly to your doorstep with fast shipping and secure payments.",
    siteName: "HodaHub",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HodaHub — Official Online Store",
    description: "Shop quality products delivered directly to your doorstep.",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen flex flex-col font-sans">
        <ReduxProvider>
          <QueryProvider>
            <AuthHydrator>
              <ToastProvider>
                <Suspense fallback={null}>
                  <AnalyticsTracker />
                </Suspense>
                {children}
              </ToastProvider>
            </AuthHydrator>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}

