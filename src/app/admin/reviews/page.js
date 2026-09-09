'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/components/ui/Toast';
import Pagination from '@/components/ui/Pagination';
import StarRating from '@/components/ui/StarRating';
import { Eye, EyeOff, Trash2, Film, ImageIcon, X } from 'lucide-react';

export default function AdminReviewsPage() {
  const toast = useToast();
  const [reviews, setReviews] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [modalMedia, setModalMedia] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [pagination.page]);

  async function fetchReviews() {
    try {
      const res = await fetch(`/api/admin/reviews?page=${pagination.page}`);
      const data = await res.json();
      setReviews(data.reviews || []);
      setPagination(data.pagination || pagination);
    } catch {}
    setLoading(false);
  }

  async function toggleHide(id) {
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'PATCH' });
      if (res.ok) {
        toast.success('Review visibility updated');
        fetchReviews();
      }
    } catch {
      toast.error('Error updating review');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this review permanently?')) return;
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Review deleted');
        fetchReviews();
      }
    } catch {
      toast.error('Error deleting review');
    }
  }

  const isVideoUrl = (url) => {
    if (!url) return false;
    return (
      url.match(/\.(mp4|webm|mov|avi|mkv)($|\?)/i) ||
      url.includes('/video/upload/') ||
      url.endsWith('.mp4')
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-base font-bold text-warm-900">Review Moderation</h1>
        <p className="text-[11px] text-warm-500">Moderate customer ratings, feedback, and attached media</p>
      </div>

      <div className="bg-white rounded-md border border-warm-200 overflow-x-auto shadow-xs">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="bg-warm-50/80 text-warm-600 text-[10px] font-semibold border-b border-warm-200">
              <th className="px-3 py-2 text-left">Product</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Rating</th>
              <th className="px-3 py-2 text-left">Comment & Media</th>
              <th className="px-3 py-2 text-left">Date</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-warm-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-warm-400">
                  Loading reviews...
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-warm-400">
                  No reviews submitted yet.
                </td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} className={`hover:bg-warm-50/50 transition-colors ${r.isHidden ? 'opacity-50 bg-warm-50/30' : ''}`}>
                  <td className="px-3 py-2 font-semibold text-warm-900 max-w-[140px] truncate">
                    {r.productName || '—'}
                  </td>
                  <td className="px-3 py-2 text-warm-600">
                    <p className="font-medium text-warm-900">{r.userName || 'Customer'}</p>
                    <p className="text-[9px] text-warm-400">{r.userEmail}</p>
                  </td>
                  <td className="px-3 py-2">
                    <StarRating rating={r.rating} size="xs" />
                  </td>
                  <td className="px-3 py-2 max-w-[240px]">
                    {r.comment && <p className="text-warm-700 line-clamp-2 mb-1">{r.comment}</p>}
                    {Array.isArray(r.mediaUrls) && r.mediaUrls.length > 0 && (
                      <div className="flex gap-1 overflow-x-auto pt-0.5">
                        {r.mediaUrls.map((url, idx) => {
                          const isVid = isVideoUrl(url);
                          return (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => setModalMedia(url)}
                              className="relative w-7 h-7 rounded overflow-hidden border border-warm-200 bg-warm-100 shrink-0 hover:scale-105 transition-transform"
                              title="View media"
                            >
                              {isVid ? (
                                <div className="w-full h-full flex items-center justify-center bg-warm-900 text-white">
                                  <Film className="w-3 h-3" />
                                </div>
                              ) : (
                                <img src={url} alt="" className="w-full h-full object-cover" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-warm-400 text-[10px]">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleHide(r.id)}
                        className={`p-1 rounded-md transition-colors ${
                          r.isHidden
                            ? 'text-emerald-600 hover:bg-emerald-50'
                            : 'text-warm-500 hover:bg-warm-100'
                        }`}
                        title={r.isHidden ? 'Publish review' : 'Hide review'}
                      >
                        {r.isHidden ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="p-1 text-warm-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete review"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination.totalPages > 1 && (
        <div className="mt-3">
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={(p) => setPagination({ ...pagination, page: p })}
          />
        </div>
      )}

      {/* Lightbox Modal */}
      {modalMedia && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalMedia(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] overflow-hidden rounded-md bg-black">
            <button
              onClick={() => setModalMedia(null)}
              className="absolute top-2.5 right-2.5 z-10 p-1.5 bg-black/60 text-white rounded-full hover:bg-black"
            >
              <X className="w-4 h-4" />
            </button>
            {isVideoUrl(modalMedia) ? (
              <video src={modalMedia} controls autoPlay className="max-h-[80vh] w-auto mx-auto" />
            ) : (
              <img src={modalMedia} alt="" className="max-h-[80vh] w-auto mx-auto object-contain" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}