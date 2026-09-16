'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import { selectCartItemCount } from '@/lib/store/cartSlice';
import { selectWishlistItemCount } from '@/lib/store/wishlistSlice';
import { selectUser, clearUser } from '@/lib/store/authSlice';
import { useRouter } from 'next/navigation';
import {
  FiSearch, FiHeart, FiUser, FiShoppingCart,
  FiMenu, FiX, FiChevronDown, FiLogOut, FiPackage, FiSettings, FiGrid
} from 'react-icons/fi';

const navLinks = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/products' },
  { label: 'New Arrivals', href: '/products?sort=newest' },
  { label: 'Best Sellers', href: '/products?sort=best-sellers' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [categories, setCategories] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);

  const accountRef = useRef(null);
  const categoriesRef = useRef(null);

  const cartCount = useSelector(selectCartItemCount);
  const wishlistCount = useSelector(selectWishlistItemCount);
  const user = useSelector(selectUser);

  const dispatch = useDispatch();
  const router = useRouter();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (accountRef.current && !accountRef.current.contains(e.target)) {
        setAccountOpen(false);
      }
      if (categoriesRef.current && !categoriesRef.current.contains(e.target)) {
        setCategoriesOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch('/api/categories');
        const data = await res.json();
        setCategories(data.categories || []);
      } catch {}
    }
    fetchCategories();
  }, []);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    dispatch(clearUser());
    setAccountOpen(false);
    router.push('/');
  };

  return (
    <>
      <header
        className={`sticky top-0 z-50 transition-all duration-300 print:hidden ${
          scrolled
            ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-warm-100'
            : 'bg-white border-b border-warm-100'
        }`}
      >
        <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6">
          <div className="flex items-center justify-between h-12 lg:h-14">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-1 shrink-0">
              <span className="text-md font-extrabold text-warm-900 tracking-tight">
                Hoda<span className="text-brand-500">Hub</span>
              </span>
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center gap-0.5">
              <Link
                href="/"
                className="px-2.5 py-1.5 text-[14px] font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products"
                className="px-2.5 py-1.5 text-[14px] font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Shop
              </Link>

              {/* Categories Mega Dropdown */}
              <div className="relative" ref={categoriesRef}>
                <button
                  onClick={() => setCategoriesOpen(!categoriesOpen)}
                  onMouseEnter={() => setCategoriesOpen(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 text-[14px] font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
                >
                  <span>Categories</span>
                  <FiChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${categoriesOpen ? 'rotate-180' : ''}`} />
                </button>

                {categoriesOpen && (
                  <div
                    onMouseLeave={() => setCategoriesOpen(false)}
                    className="absolute left-0 top-full mt-1 w-62 bg-white rounded-lg shadow-xl border border-warm-200 p-2  z-50 grid grid-cols-1 gap-1"
                  >
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-warm-100 mb-1">
                      <span className="text-[12px] font-bold text-warm-900 uppercase tracking-wider flex items-center gap-1">
                        <FiGrid className="w-3 h-3 text-brand-600" /> All Categories
                      </span>
                      <Link
                        href="/categories"
                        onClick={() => setCategoriesOpen(false)}
                        className="text-[12px] text-brand-600 hover:underline font-semibold"
                      >
                        View All
                      </Link>
                    </div>

                    {categories.length > 0 ? (
                      categories.slice(0, 8).map((cat) => (
                        <Link
                          key={cat.id}
                          href={`/categories/${cat.slug}`}
                          onClick={() => setCategoriesOpen(false)}
                          className="flex items-center gap-2.5 px-2 py-1 rounded-md text-[12px] font-semibold text-warm-700 hover:text-warm-900 hover:bg-warm-50 transition-colors"
                        >
                          {cat.imageUrl ? (
                            <img src={cat.imageUrl} alt="" className="w-6 h-6 rounded-md object-cover border border-warm-200 shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded-md bg-warm-100 text-warm-500 flex items-center justify-center shrink-0">
                              <FiPackage className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <span>{cat.name}</span>
                        </Link>
                      ))
                    ) : (
                      <p className="text-[14px] text-warm-400 p-2 text-center">Loading categories...</p>
                    )}
                  </div>
                )}
              </div>

              <Link
                href="/products?sort=newest"
                className="px-2.5 py-1.5 text-[14px] font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                New Arrivals
              </Link>
              <Link
                href="/products?sort=best-sellers"
                className="px-2.5 py-1.5 text-[14px] font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Best Sellers
              </Link>
              <Link
                href="/about"
                className="px-2.5 py-1.5 text-[14px] font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                className="px-2.5 py-1.5 text-[14px] font-medium text-warm-600 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Contact
              </Link>
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Search */}
              <button
                onClick={() => setSearchOpen(true)}
                className="w-10 h-10 flex items-center justify-center text-warm-700 hover:text-warm-900 hover:bg-warm-100/80 rounded-full transition-colors"
                aria-label="Search"
              >
                <FiSearch className="w-5 h-5" />
              </button>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                className="relative hidden sm:flex w-10 h-10 items-center justify-center text-warm-700 hover:text-warm-900 hover:bg-warm-100/80 rounded-full transition-colors"
                aria-label="Wishlist"
              >
                <FiHeart className="w-5 h-5" />
                {wishlistCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {wishlistCount > 99 ? '99+' : wishlistCount}
                  </span>
                )}
              </Link>

              {/* Account */}
              <div className="relative" ref={accountRef}>
                <button
                  onClick={() => setAccountOpen(!accountOpen)}
                  className="w-10 h-10 flex items-center justify-center text-warm-700 hover:text-warm-900 hover:bg-warm-100/80 rounded-full transition-colors"
                  aria-label="Account"
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.name || 'User avatar'}
                      className="w-6 h-6 rounded-full object-cover border border-warm-200"
                    />
                  ) : user ? (
                    <div className="w-6 h-6 rounded-full bg-warm-900 text-white text-[11px] font-bold flex items-center justify-center">
                      {user.name?.[0]?.toUpperCase() || 'U'}
                    </div>
                  ) : (
                    <FiUser className="w-5 h-5" />
                  )}
                </button>

                {accountOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg border border-warm-200 py-1.5 z-50">
                    {user ? (
                      <>
                        <div className="px-3 py-2 border-b border-warm-100 flex items-center gap-2.5">
                          {user.avatarUrl ? (
                            <img src={user.avatarUrl} alt="" className="w-7 h-7 rounded-full object-cover shrink-0 border border-warm-200" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-warm-900 text-white text-[12px] font-bold flex items-center justify-center shrink-0">
                              {user.name?.[0]?.toUpperCase() || 'U'}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-[11px] font-bold text-warm-900 truncate">{user.name}</p>
                            <p className="text-[10px] text-warm-500 truncate">{user.email}</p>
                          </div>
                        </div>
                        {user.role === 'admin' && (
                          <Link
                            href="/admin"
                            onClick={() => setAccountOpen(false)}
                            className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-warm-700 hover:bg-warm-50 transition-colors"
                          >
                            <FiSettings className="w-3.5 h-3.5 text-warm-500" />
                            Admin Dashboard
                          </Link>
                        )}
                        <Link
                          href="/profile"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-warm-700 hover:bg-warm-50 transition-colors"
                        >
                          <FiUser className="w-3.5 h-3.5 text-warm-500" />
                          My Profile
                        </Link>
                        <Link
                          href="/orders"
                          onClick={() => setAccountOpen(false)}
                          className="flex items-center gap-2 px-3 py-2 text-[11px] font-semibold text-warm-700 hover:bg-warm-50 transition-colors"
                        >
                          <FiPackage className="w-3.5 h-3.5 text-warm-500" />
                          My Orders
                        </Link>
                        <button
                          onClick={handleLogout}
                          className="flex items-center gap-2 w-full px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50 transition-colors border-t border-warm-100 mt-1 pt-2"
                        >
                          <FiLogOut className="w-3.5 h-3.5" />
                          Sign Out
                        </button>
                      </>
                    ) : (
                      <>
                        <Link
                          href="/login"
                          onClick={() => setAccountOpen(false)}
                          className="block px-3 py-2 text-[11px] font-semibold text-warm-700 hover:bg-warm-50 transition-colors"
                        >
                          Sign In
                        </Link>
                        <Link
                          href="/signup"
                          onClick={() => setAccountOpen(false)}
                          className="block px-3 py-2 text-[11px] font-semibold text-warm-700 hover:bg-warm-50 transition-colors"
                        >
                          Create Account
                        </Link>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Cart */}
              <Link
                href="/cart"
                className="relative w-10 h-10 flex items-center justify-center text-warm-700 hover:text-warm-900 hover:bg-warm-100/80 rounded-full transition-colors"
                aria-label="Cart"
              >
                <FiShoppingCart className="w-5 h-5" />
                {cartCount > 0 && (
                  <span className="absolute top-1 right-1 px-1.5 py-0.2 min-w-[18px] h-[18px] bg-brand-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileOpen(!mobileOpen)}
                className="lg:hidden w-10 h-10 flex items-center justify-center text-warm-700 hover:text-warm-900 hover:bg-warm-100/80 rounded-full transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? <FiX className="w-5 h-5" /> : <FiMenu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileOpen && (
          <div className="lg:hidden border-t border-warm-100 bg-white"
            style={{ animation: 'slideDown 0.3s ease-out' }}
          >
            <nav className="max-w-6xl mx-auto px-3 py-2 flex flex-col gap-0.5">
              <Link
                href="/"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[11px] font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Home
              </Link>
              <Link
                href="/products"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[11px] font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Shop
              </Link>
              <Link
                href="/categories"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[11px] font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Categories
              </Link>
              <Link
                href="/wishlist"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[11px] font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors flex items-center justify-between"
              >
                <span>Wishlist</span>
                {wishlistCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-bold rounded-full">
                    {wishlistCount}
                  </span>
                )}
              </Link>
              <Link
                href="/products?sort=newest"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[11px] font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                New Arrivals
              </Link>
              <Link
                href="/products?sort=best-sellers"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[11px] font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Best Sellers
              </Link>
              <Link
                href="/about"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[11px] font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                About
              </Link>
              <Link
                href="/contact"
                onClick={() => setMobileOpen(false)}
                className="px-3 py-2.5 text-[11px] font-medium text-warm-700 hover:text-warm-900 hover:bg-warm-50 rounded-md transition-colors"
              >
                Contact
              </Link>
            </nav>
          </div>
        )}
      </header>

      {/* Search Modal */}
      {searchOpen && <SearchOverlay onClose={() => setSearchOpen(false)} />}
    </>
  );
}

function SearchOverlay({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    inputRef.current?.focus();
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(query)}&limit=6`);
        const data = await res.json();
        setResults(data.products || []);
      } catch { setResults([]); }
      setLoading(false);
    }, 300);
  }, [query]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="max-w-xl mx-auto mt-16 mx-4"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'slideDown 0.3s ease-out' }}
      >
        <div className="bg-white rounded-md shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="flex items-center px-4 py-3 border-b border-warm-100">
            <FiSearch className="w-4 h-4 text-warm-400 shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products..."
              className="flex-1 px-3 py-1 text-sm text-warm-900 placeholder-warm-400 outline-none"
            />
            <button type="button" onClick={onClose} className="p-1.5 text-warm-400 hover:text-warm-600">
              <FiX className="w-4 h-4" />
            </button>
          </form>

          {query.trim() && (
            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center text-warm-400 text-xs">Searching...</div>
              ) : results.length > 0 ? (
                <div className="py-1.5">
                  {results.map((product) => (
                    <Link
                      key={product.id}
                      href={`/products/${product.slug}`}
                      onClick={onClose}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-warm-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-warm-100 rounded-md overflow-hidden shrink-0">
                        {product.images?.[0] && (
                          <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-warm-900 truncate">{product.name}</p>
                        <p className="text-xs text-brand-600 font-semibold">
                          ${product.discountPrice || product.price}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center text-warm-400 text-xs">No products found</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}