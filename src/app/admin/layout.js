'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSelector, useDispatch } from 'react-redux';
import { selectUser, clearUser } from '@/lib/store/authSlice';
import {
  LayoutDashboard,
  Package,
  FolderTree,
  Tag,
  Star,
  ShoppingBag,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Store,
  ChevronRight,
  Image as ImageIcon,
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Banners', href: '/admin/banners', icon: ImageIcon },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Categories', href: '/admin/categories', icon: FolderTree },
  { label: 'Coupons', href: '/admin/coupons', icon: Tag },
  { label: 'Reviews', href: '/admin/reviews', icon: Star },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }) {
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') router.push('/');
  }, [user, router]);

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-warm-50">
        <div className="text-center">
          <div className="w-6 h-6 border-2 border-brand-600/30 border-t-brand-600 rounded-full animate-spin mx-auto mb-2" />
          <p className="text-warm-500 text-[11px]">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    dispatch(clearUser());
    router.push('/');
  }

  return (
    <div className="h-screen flex bg-warm-50/50 text-warm-900 antialiased overflow-hidden">
      {/* Sidebar - fixed to viewport height, never grows with page content */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-40 h-screen bg-warm-900 text-white transform transition-transform duration-300 lg:relative lg:translate-x-0 lg:h-full flex flex-col ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header - fixed, does not scroll */}
        <div className="shrink-0 flex items-center justify-between px-3.5 py-3 border-b border-warm-800">
          <Link href="/admin" className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-white">
              Hoda<span className="text-brand-400">Hub</span>
            </span>
            <span className="text-[9px] px-1 py-0.5 bg-brand-500/20 text-brand-300 rounded font-semibold uppercase tracking-wider">
              Admin
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-warm-400 hover:text-white rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation - the ONLY part that scrolls if links overflow */}
        <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-[11px] font-semibold transition-all ${
                  isActive
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'text-warm-400 hover:text-white hover:bg-warm-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </div>
                {isActive && <ChevronRight className="w-3 h-3 text-white/70" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer controls - fixed, never scrolls */}
        <div className="shrink-0 p-2 border-t border-warm-800 space-y-0.5">
          <Link
            href="/"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-[11px] text-warm-300 hover:text-white hover:bg-warm-800 transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span>View Storefront</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[11px] text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden backdrop-blur-xs"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area - this is the only thing that scrolls on desktop */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-warm-200 px-3 sm:px-5 py-2.5 flex items-center justify-between">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-1 text-warm-600 hover:bg-warm-100 rounded-md"
          >
            <Menu className="w-4 h-4" />
          </button>
          <div className="hidden lg:block text-[11px] text-warm-500 font-medium">
            Admin Management Portal
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <div className="text-right">
              <p className="text-[11px] font-semibold text-warm-900">{user.name}</p>
              <p className="text-[9px] text-warm-500">{user.email}</p>
            </div>
            <div className="w-7 h-7 bg-warm-900 text-white rounded-md flex items-center justify-center font-bold text-[11px] shadow-xs">
              {user.name?.[0]?.toUpperCase() || 'A'}
            </div>
          </div>
        </header>

        <main className="flex-1 p-3 sm:p-4 lg:p-5 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}