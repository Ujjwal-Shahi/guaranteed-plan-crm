import { useState, useEffect, useRef } from 'react';
import { dealsApi } from '../api';
import type { Deal, Photo } from '../types';

const BHK_SLOTS: Record<string, string[]> = {
  '1BHK': ['exterior', 'entrance', 'living_room', 'kitchen', 'bedroom_1', 'bathroom_1', 'balcony', 'society_amenity'],
  '2BHK': ['exterior', 'entrance', 'living_room', 'kitchen', 'bedroom_1', 'bedroom_2', 'bathroom_1', 'bathroom_2', 'balcony', 'society_amenity'],
  '3BHK': ['exterior', 'entrance', 'living_room', 'kitchen', 'bedroom_1', 'bedroom_2', 'bedroom_3', 'bathroom_1', 'bathroom_2', 'balcony', 'society_amenity'],
  '4BHK+': ['exterior', 'entrance', 'living_room', 'kitchen', 'bedroom_1', 'bedroom_2', 'bedroom_3', 'bedroom_4', 'bathroom_1', 'bathroom_2', 'balcony', 'society_amenity'],
};

const SLOT_LABELS: Record<string, string> = {
  exterior: '🏢 Building Exterior',
  entrance: '🚪 Entrance',
  living_room: '🛋️ Living Room',
  kitchen: '🍳 Kitchen',
  bedroom_1: '🛏️ Bedroom 1',
  bedroom_2: '🛏️ Bedroom 2',
  bedroom_3: '🛏️ Bedroom 3',
  bedroom_4: '🛏️ Bedroom 4',
  bathroom_1: '🚿 Bathroom 1',
  bathroom_2: '🚿 Bathroom 2',
  balcony: '🌅 Balcony / View',
  society_amenity: '🏊 Society Amenity',
};

export default function PhotosPanel({ deal, canUpload, onUpdated }: { deal: Deal; canUpload: boolean; onUpdated: () => void }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState<Record<string, boolean>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const requiredSlots = BHK_SLOTS[deal.bhk] || BHK_SLOTS['2BHK'];

  const reload = async () => {
    const p = await dealsApi.getPhotos(deal.id);
    setPhotos(p);
  };

  useEffect(() => { reload(); }, [deal.id]);

  const photoMap: Record<string, Photo> = {};
  photos.forEach((p) => { photoMap[p.slot] = p; });

  const handleUpload = async (slot: string, file: File) => {
    setUploading((u) => ({ ...u, [slot]: true }));
    try {
      await dealsApi.uploadPhoto(deal.id, slot, file);
      await reload();
      onUpdated();
    } finally {
      setUploading((u) => ({ ...u, [slot]: false }));
    }
  };

  const uploaded = requiredSlots.filter((s) => photoMap[s]?.gcs_path).length;
  const total = requiredSlots.length;

  return (
    <div>
      <div style={{ background: '#fff', borderRadius: 10, padding: 20, marginBottom: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#333' }}>Photos ({uploaded}/{total} mandatory)</h3>
          {uploaded === total && <span style={{ fontSize: 13, color: '#2e7d32', fontWeight: 600 }}>✓ All mandatory slots filled</span>}
        </div>
        <div style={{ height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#4caf50', width: `${(uploaded / total) * 100}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
        {requiredSlots.map((slot) => {
          const photo = photoMap[slot];
          const isUploading = uploading[slot];
          return (
            <div key={slot} style={{
              background: '#fff', borderRadius: 10, padding: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
              border: photo?.gcs_path ? '2px solid #c8e6c9' : '2px dashed #e0e0e0',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: '#333' }}>
                {SLOT_LABELS[slot] || slot.replace(/_/g, ' ')}
              </div>

              {photo?.gcs_path ? (
                <div>
                  <div style={{ background: '#e8f5e9', borderRadius: 6, padding: '24px 0', textAlign: 'center', marginBottom: 8, fontSize: 28 }}>✓</div>
                  <div style={{ fontSize: 11, color: '#2e7d32', fontWeight: 600 }}>Uploaded</div>
                  {photo.uploaded_at && <div style={{ fontSize: 11, color: '#999' }}>{new Date(photo.uploaded_at).toLocaleString()}</div>}
                </div>
              ) : (
                <div style={{ background: '#fafafa', borderRadius: 6, padding: '24px 0', textAlign: 'center', marginBottom: 8, fontSize: 24, color: '#bbb' }}>
                  📷
                </div>
              )}

              {canUpload && (
                <>
                  <input
                    type="file" accept="image/*" capture="environment"
                    ref={(el) => { fileRefs.current[slot] = el; }}
                    onChange={(e) => { if (e.target.files?.[0]) handleUpload(slot, e.target.files[0]); }}
                    style={{ display: 'none' }}
                  />
                  <button
                    onClick={() => fileRefs.current[slot]?.click()}
                    disabled={isUploading}
                    style={{
                      width: '100%', padding: '7px 0', border: '1px solid', borderRadius: 6, cursor: 'pointer', fontSize: 13,
                      borderColor: photo?.gcs_path ? '#a5d6a7' : '#1a237e',
                      background: photo?.gcs_path ? '#f1f8e9' : '#e8eaf6',
                      color: photo?.gcs_path ? '#2e7d32' : '#1a237e',
                      opacity: isUploading ? 0.7 : 1,
                    }}
                  >
                    {isUploading ? 'Uploading…' : photo?.gcs_path ? 'Re-upload' : 'Upload Photo'}
                  </button>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
