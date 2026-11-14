import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import ShopByBrand from '../../src/components/storefront/ShopByBrand';
import CustomSelect, { CustomSelectField } from '../../src/components/ui/CustomSelect';
import FilterPanel from '../../src/components/ui/FilterPanel';
import Modal from '../../src/components/ui/Modal';
import PhoneInput from '../../src/components/ui/PhoneInput';
import NewArrivals from '../../src/components/storefront/NewArrivals';
import ReduxProvider from '../../src/components/providers/ReduxProvider';
import { ToastProvider } from '../../src/components/ui/Toast';
import QueryProvider from '../../src/components/providers/QueryProvider';
import AdminProducts from '../../src/app/admin/products/page';
import AdminBrands from '../../src/app/admin/brands/page';
import AdminSettings from '../../src/app/admin/settings/page';
import Footer from '../../src/components/storefront/Footer';

const names = ['Casio', 'Hublot', 'Cartier', 'Patek Philippe', 'Maserati', 'Rado', 'Tissot', 'Fossil', 'Emporio Armani', 'Seiko', 'Citizen', 'Timex', 'Titan', 'Omega', 'Longines', 'Orient', 'Swatch', 'Hamilton'];
const brands = names.map((name, index) => ({ id: String(index), name, slug: name.toLowerCase().replaceAll(' ', '-'), image: '/watch.svg', productCount: 100 + index }));
brands.push({ ...brands[0] }); // Defensive regression: duplicate incoming slug.
const products = Array.from({ length: 10 }, (_, index) => ({ id: 'product-' + index, slug: 'fixture-watch-' + index, name: 'Fixture watch ' + index, price: 2999, discountPrice: 2199, stock: 5, images: ['/watch.svg'], reviewCount: 0 }));
function Fixture() {
  const [sort, setSort] = useState('newest');
  const [filters, setFilters] = useState(null);
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState('');
  return <><ShopByBrand brands={brands} /><div className="mx-auto max-w-4xl space-y-6 px-4 py-8"><h1 className="text-xl font-semibold">Shopping controls</h1><PhoneInput label="Phone number" id="fixture-phone" value={phone} onChange={setPhone} /><div className="h-14 overflow-hidden"><CustomSelect aria-label="Sort products" options={[{ value: 'newest', label: 'Newest arrivals' }, { value: 'price', label: 'Price: low to high' }]} value={sort} onChange={setSort} /></div><output data-testid="selected-sort">{sort}</output><CustomSelectField aria-label="Brand selection" value={sort} onChange={(event) => setSort(event.target.value)}>{names.map((name) => <option key={name} value={name}>{name}</option>)}</CustomSelectField><button onClick={() => setOpen(true)} className="min-h-11 rounded-xl bg-warm-900 px-4 text-white">Open filters</button><output className="block break-words" data-testid="applied-filters">{JSON.stringify(filters)}</output><Modal isOpen={open} onClose={() => setOpen(false)} title="Filters" size="drawer"><FilterPanel brands={brands.slice(0, -1)} categories={[{ id: 'w', slug: 'watches', name: 'Watches' }]} onRatingChange={() => {}} onApplyFilters={setFilters} onApplied={() => setOpen(false)} onClear={() => setFilters(null)} /></Modal></div><NewArrivals products={products} /></>;
}
const adminPage = new URLSearchParams(window.location.search).get('admin');
const adminPages = { products: AdminProducts, brands: AdminBrands, settings: AdminSettings };
const AdminPage = adminPages[adminPage];
createRoot(document.getElementById('root')).render(<ReduxProvider><QueryProvider><ToastProvider>{AdminPage ? <main className="mx-auto max-w-7xl p-4"><AdminPage /></main> : <><Fixture /><Footer /></>}</ToastProvider></QueryProvider></ReduxProvider>);
