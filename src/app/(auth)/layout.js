import Link from 'next/link';

export const metadata = {
  title: 'HodaHub — Account',
  description: 'Sign in or create your HodaHub account',
};

export default function AuthLayout({ children }) {
  return (
    <div className="h-dvh w-full flex overflow-hidden bg-white text-warm-900 antialiased">
      {/* Brand panel — desktop only, gives the flow a hero moment instead of a floating card on empty space */}
      <div className="hidden sm:flex sm:w-[38%] lg:w-[34%] relative flex-col justify-between bg-warm-900 text-warm-50 p-8">
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '20px 20px' }}
        />
        <Link href="/" className="relative text-base font-bold tracking-tight">
          Hoda<span className="text-brand-400">Hub</span>
        </Link>
        <div className="relative">
          <p className="text-2xl font-semibold leading-snug max-w-[15rem]">
            Curated goods, delivered with care.
          </p>
          <p className="text-[11px] text-warm-400 mt-3">
            &copy; {new Date().getFullYear()} HodaHub. All rights reserved.
          </p>
        </div>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col min-h-0">
        <header className="sm:hidden p-3 text-center shrink-0">
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="text-base font-bold tracking-tight">
              Hoda<span className="text-brand-600">Hub</span>
            </span>
          </Link>
        </header>

        <main className="flex-1 min-h-0 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {children}
        </main>

        <footer className="sm:hidden p-3 text-center shrink-0">
          <p className="text-[10px] text-warm-400">
            &copy; {new Date().getFullYear()} HodaHub. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}