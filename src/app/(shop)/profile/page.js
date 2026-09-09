'use client';

import { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useRouter } from 'next/navigation';
import { selectUser, selectAuthLoading, setUser } from '@/lib/store/authSlice';
import { useToast } from '@/components/ui/Toast';
import Breadcrumbs from '@/components/ui/Breadcrumbs';
import ImageUpload from '@/components/ui/ImageUpload';
import { FiUser, FiMapPin, FiMail, FiPhone, FiSave, FiPlus, FiCamera } from 'react-icons/fi';

export default function ProfilePage() {
  const router = useRouter();
  const dispatch = useDispatch();
  const toast = useToast();
  const authUser = useSelector(selectUser);
  const authLoading = useSelector(selectAuthLoading);

  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '', avatarUrl: '' });
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [showAddAddr, setShowAddAddr] = useState(false);
  const [addrForm, setAddrForm] = useState({ label: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' });
  const [addrSaving, setAddrSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      router.push('/login');
      return;
    }
    fetchProfile();
  }, [authUser, authLoading]);

  async function fetchProfile() {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (res.ok && data.user) {
        setProfileData({
          name: data.user.name || '',
          email: data.user.email || '',
          phone: data.user.phone || '',
          avatarUrl: data.user.avatarUrl || '',
        });
        setAddresses(data.addresses || []);
      }
    } catch {}
    setLoading(false);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    if (!profileData.name.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profileData.name,
          phone: profileData.phone,
          avatarUrl: profileData.avatarUrl,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Profile updated!');
        dispatch(setUser(data.user));
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch {
      toast.error('Network error');
    }
    setSaving(false);
  }

  async function handleAddAddress(e) {
    e.preventDefault();
    if (!addrForm.line1 || !addrForm.city || !addrForm.state || !addrForm.pincode) {
      toast.error('Please fill required address fields');
      return;
    }
    setAddrSaving(true);
    try {
      const res = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addrForm),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Address added!');
        setAddrForm({ label: '', line1: '', line2: '', city: '', state: '', pincode: '', phone: '' });
        setShowAddAddr(false);
        fetchProfile();
      } else {
        toast.error(data.error);
      }
    } catch {
      toast.error('Failed to add address');
    }
    setAddrSaving(false);
  }

  if (loading || authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <div className="w-6 h-6 border-2 border-warm-900/20 border-t-warm-900 rounded-full animate-spin mx-auto mb-3" />
        <p className="text-warm-500 text-[12px] font-medium">Loading account details...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'My Account' }]} />

      <h1 className="text-lg font-bold text-warm-900 tracking-tight mb-5">My Account</h1>

      {/* Tabs */}
      <div className="flex border-b border-warm-200 mb-5">
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-1.5 pb-2 px-3 font-semibold text-[12px] border-b-2 transition-colors ${
            activeTab === 'profile'
              ? 'border-warm-900 text-warm-900'
              : 'border-transparent text-warm-500 hover:text-warm-700'
          }`}
        >
          <FiUser className="w-3.5 h-3.5" /> Personal Profile
        </button>
        <button
          onClick={() => setActiveTab('addresses')}
          className={`flex items-center gap-1.5 pb-2 px-3 font-semibold text-[12px] border-b-2 transition-colors ${
            activeTab === 'addresses'
              ? 'border-warm-900 text-warm-900'
              : 'border-transparent text-warm-500 hover:text-warm-700'
          }`}
        >
          <FiMapPin className="w-3.5 h-3.5" /> Saved Addresses ({addresses.length})
        </button>
      </div>

      {/* Tab 1: Profile Form */}
      {activeTab === 'profile' && (
        <div className="bg-white p-4 sm:p-5 rounded-md border border-warm-200 shadow-xs max-w-lg">
          <form onSubmit={handleSaveProfile} className="space-y-3.5">
            {/* Avatar Uploader */}
            <div className="border-b border-warm-100 pb-3.5">
              <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1.5">
                Profile Picture
              </label>
              <div className="flex items-center gap-3 mb-2.5">
                {profileData.avatarUrl ? (
                  <img
                    src={profileData.avatarUrl}
                    alt="Profile Avatar"
                    className="w-12 h-12 rounded-full object-cover border-2 border-warm-200 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-warm-900 text-white font-bold text-[15px] flex items-center justify-center border-2 border-warm-200 shrink-0">
                    {profileData.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-warm-900">Upload new avatar</p>
                  <p className="text-[10px] text-warm-500">Supports JPG, PNG or WEBP up to 10MB</p>
                </div>
              </div>
              <ImageUpload
                images={profileData.avatarUrl ? [profileData.avatarUrl] : []}
                onChange={(urls) => setProfileData({ ...profileData, avatarUrl: urls[0] || '' })}
                type="review-media"
                maxFiles={1}
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full pl-8 pr-3 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                Email Address (ReadOnly)
              </label>
              <div className="relative">
                <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  type="email"
                  value={profileData.email}
                  readOnly
                  className="w-full pl-8 pr-3 py-1.5 bg-warm-50 border border-warm-200 rounded-md text-[11px] text-warm-500 cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-warm-700 uppercase tracking-wider mb-1">
                Phone Number
              </label>
              <div className="relative">
                <FiPhone className="absolute left-3 top-1/2 -translate-y-1/2 text-warm-400 w-3.5 h-3.5" />
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  placeholder="+1 (555) 000-0000"
                  className="w-full pl-8 pr-3 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-warm-900 text-white font-semibold text-[11px] rounded-md hover:bg-warm-800 transition-colors disabled:opacity-50"
            >
              <FiSave className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Tab 2: Addresses */}
      {activeTab === 'addresses' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[13px] font-bold text-warm-900">Delivery Addresses</h2>
            <button
              onClick={() => setShowAddAddr(!showAddAddr)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 transition-colors"
            >
              <FiPlus className="w-3.5 h-3.5" /> Add New Address
            </button>
          </div>

          {showAddAddr && (
            <form onSubmit={handleAddAddress} className="grid grid-cols-2 gap-2.5 p-3.5 bg-white border border-warm-200 rounded-md shadow-xs">
              <input
                value={addrForm.label}
                onChange={(e) => setAddrForm({ ...addrForm, label: e.target.value })}
                placeholder="Label (Home, Office)"
                className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
              />
              <input
                value={addrForm.line1}
                onChange={(e) => setAddrForm({ ...addrForm, line1: e.target.value })}
                placeholder="Address Line 1 *"
                className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                required
              />
              <input
                value={addrForm.line2}
                onChange={(e) => setAddrForm({ ...addrForm, line2: e.target.value })}
                placeholder="Address Line 2"
                className="col-span-2 px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
              />
              <input
                value={addrForm.city}
                onChange={(e) => setAddrForm({ ...addrForm, city: e.target.value })}
                placeholder="City *"
                className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                required
              />
              <input
                value={addrForm.state}
                onChange={(e) => setAddrForm({ ...addrForm, state: e.target.value })}
                placeholder="State *"
                className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                required
              />
              <input
                value={addrForm.pincode}
                onChange={(e) => setAddrForm({ ...addrForm, pincode: e.target.value })}
                placeholder="Pincode *"
                className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
                required
              />
              <input
                value={addrForm.phone}
                onChange={(e) => setAddrForm({ ...addrForm, phone: e.target.value })}
                placeholder="Phone"
                className="px-2.5 py-1.5 border border-warm-200 rounded-md text-[11px] bg-white outline-none focus:ring-2 focus:ring-warm-900/10 focus:border-warm-900 transition-all"
              />
              <div className="col-span-2 flex gap-2 pt-1.5">
                <button
                  type="submit"
                  disabled={addrSaving}
                  className="px-3 py-1.5 bg-warm-900 text-white text-[11px] font-semibold rounded-md hover:bg-warm-800 disabled:opacity-50 transition-colors"
                >
                  {addrSaving ? 'Saving...' : 'Save Address'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddAddr(false)}
                  className="px-3 py-1.5 border border-warm-200 text-[11px] font-semibold rounded-md text-warm-600 hover:bg-warm-100 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="grid sm:grid-cols-2 gap-3">
            {addresses.length === 0 ? (
              <p className="text-warm-400 text-[11px] col-span-2 py-6 text-center bg-white rounded-md border border-warm-200 shadow-xs">
                No saved addresses yet.
              </p>
            ) : (
              addresses.map((addr) => (
                <div key={addr.id} className="p-3.5 bg-white rounded-md border border-warm-200 shadow-xs text-[11px] space-y-1">
                  {addr.label && (
                    <span className="text-[10px] font-bold text-warm-900 uppercase tracking-wider block mb-1">
                      {addr.label}
                    </span>
                  )}
                  <p className="font-semibold text-warm-900">{addr.line1}</p>
                  {addr.line2 && <p className="text-warm-600">{addr.line2}</p>}
                  <p className="text-warm-600">{addr.city}, {addr.state} — {addr.pincode}</p>
                  {addr.phone && <p className="text-[10px] text-warm-400 mt-1.5">Phone: {addr.phone}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}