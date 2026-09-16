'use client';

import { useState, useRef } from 'react';
import { Upload, X, ArrowLeft, ArrowRight, Film, Image as ImageIcon, Loader2 } from 'lucide-react';
import { isVideoUrl } from '@/lib/utils';

export default function ImageUpload({
  uploadType = 'product-image',
  value = [],
  onChange,
  multiple = true,
  maxFiles = 10,
  maxSizeMB = 50,
  label = 'Upload Media',
}) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Normalize value array
  const mediaList = Array.isArray(value) ? value : value ? [value] : [];


  const uploadFileDirect = async (file) => {
    // Check file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      throw new Error(`File size exceeds maximum allowed size of ${maxSizeMB}MB.`);
    }

    // Fetch signed params from server
    const sigRes = await fetch('/api/upload/signature', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadType }),
    });

    if (!sigRes.ok) {
      const errData = await sigRes.json();
      throw new Error(errData.error || 'Failed to authorize upload.');
    }

    const { signature, timestamp, folder, apiKey, cloudName } = await sigRes.json();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp);
    formData.append('folder', folder);
    formData.append('signature', signature);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setProgress(percent);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res.secure_url);
          } catch {
            reject(new Error('Invalid Cloudinary response'));
          }
        } else {
          try {
            const res = JSON.parse(xhr.responseText);
            reject(new Error(res.error?.message || 'Upload to Cloudinary failed'));
          } catch {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));

      xhr.open('POST', uploadUrl, true);
      xhr.send(formData);
    });
  };

  const handleFilesSelect = async (files) => {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    setProgress(0);

    const uploadedUrls = [];

    try {
      const filesArray = Array.from(files).slice(0, maxFiles - mediaList.length);
      for (const file of filesArray) {
        const url = await uploadFileDirect(file);
        uploadedUrls.push(url);
      }

      const newList = multiple ? [...mediaList, ...uploadedUrls] : uploadedUrls.slice(-1);
      onChange(multiple ? newList : newList[0] || '');
    } catch (err) {
      console.error('ImageUpload error:', err);
      setError(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (uploading) return;
    const files = e.dataTransfer.files;
    handleFilesSelect(files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleRemove = (index) => {
    const newList = mediaList.filter((_, i) => i !== index);
    onChange(multiple ? newList : '');
  };

  const handleMove = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= mediaList.length) return;
    const newList = [...mediaList];
    const [moved] = newList.splice(index, 1);
    newList.splice(targetIndex, 0, moved);
    onChange(multiple ? newList : newList[0]);
  };

  return (
    <div className="space-y-3">
      {label && <label className="block text-xs font-semibold text-warm-700">{label}</label>}

      {/* Upload Drag & Drop Area */}
      {(!multiple && mediaList.length >= 1) ? null : (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={() => !uploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            uploading
              ? 'bg-warm-50 border-warm-300 opacity-75 cursor-not-allowed'
              : 'bg-white border-warm-200 hover:border-brand-500 hover:bg-warm-50/50'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            multiple={multiple}
            className="hidden"
            onChange={(e) => handleFilesSelect(e.target.files)}
            disabled={uploading}
          />

          <div className="flex flex-col items-center justify-center gap-2">
            {uploading ? (
              <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                <Upload className="w-5 h-5" />
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-warm-900">
                {uploading ? `Uploading... ${progress}%` : 'Click or drag & drop to upload'}
              </p>
              <p className="text-[11px] text-warm-500 mt-0.5">
                PNG, JPG, WEBP, GIF or MP4 videos up to 50MB
              </p>
            </div>
          </div>

          {/* Progress bar */}
          {uploading && (
            <div className="w-full bg-warm-100 rounded-full h-1.5 mt-4 overflow-hidden">
              <div
                className="bg-brand-600 h-1.5 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

      {/* Previews & Reorder List */}
      {mediaList.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-2">
          {mediaList.map((url, i) => {
            const isVid = isVideoUrl(url);
            return (
              <div
                key={url + i}
                className="relative group aspect-square rounded-xl overflow-hidden bg-warm-100 border border-warm-200"
              >
                {isVid ? (
                  <video
                    src={url}
                    className="w-full h-full object-cover"
                    controls={false}
                    muted
                  />
                ) : (
                  <img
                    src={url}
                    alt={`Uploaded media ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                )}

                {/* Media Type Indicator */}
                <div className="absolute top-2 left-2 px-1.5 py-0.5 bg-black/60 backdrop-blur-sm rounded text-[10px] font-medium text-white flex items-center gap-1">
                  {isVid ? <Film className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                  <span>{isVid ? 'Video' : 'Image'}</span>
                </div>

                {/* Controls overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                  {multiple && i > 0 && (
                    <button
                      type="button"
                      onClick={() => handleMove(i, -1)}
                      className="p-1.5 bg-white/90 rounded-md text-warm-900 hover:bg-white transition-colors"
                      title="Move left"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {multiple && i < mediaList.length - 1 && (
                    <button
                      type="button"
                      onClick={() => handleMove(i, 1)}
                      className="p-1.5 bg-white/90 rounded-md text-warm-900 hover:bg-white transition-colors"
                      title="Move right"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRemove(i)}
                    className="p-1.5 bg-red-600/90 rounded-md text-white hover:bg-red-600 transition-colors"
                    title="Remove item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
