// Admin Sections Page — toggle homepage section visibility and edit titles.

import { useState, useEffect } from 'react';
import AdminLayout from './AdminLayout.jsx';
import { adminApi } from '../api/admin.api.js';

const SECTION_META = {
  'popular-categories': { icon: '📂', desc: 'Horizontal category scroll bar below hero' },
  'hero-banners':       { icon: '🎯', desc: 'Hero carousel at the top of homepage'     },
  'clearance':          { icon: '🔥', desc: 'Clearance Carnival deal row'               },
  'weekly-savers':      { icon: '💚', desc: "This Week's Savers deal row"               },
  'daily-essentials':   { icon: '🥛', desc: 'Daily essentials product row'              },
  'best-sellers':       { icon: '⭐', desc: 'Best seller product row'                   },
  'product-grid':       { icon: '🛍️', desc: 'Full product grid at bottom of homepage'  },
};

function SectionCard({ section, onToggle, onTitleSave }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle]     = useState(section.title);
  const [saving, setSaving]   = useState(false);
  const meta = SECTION_META[section.key] || { icon: '📄', desc: '' };

  const handleSave = async () => {
    setSaving(true);
    try { await onTitleSave(section.key, title); setEditing(false); }
    finally { setSaving(false); }
  };

  return (
    <div className={`bg-gray-900 border rounded-2xl p-4 transition-all ${section.isVisible ? 'border-gray-800' : 'border-gray-800/50 opacity-60'}`}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
          {meta.icon}
        </div>

        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2 mb-1">
              <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
                className="flex-1 bg-gray-800 border border-brand-500 text-white rounded-lg px-2 py-1 text-sm focus:outline-none" />
              <button onClick={handleSave} disabled={saving}
                className="px-3 py-1 bg-brand-600 text-white text-xs font-bold rounded-lg disabled:opacity-60">
                {saving ? '…' : 'Save'}
              </button>
              <button onClick={() => { setTitle(section.title); setEditing(false); }}
                className="px-3 py-1 bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg">✕</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-bold text-white">{section.title}</p>
              <button onClick={() => setEditing(true)} className="text-gray-600 hover:text-gray-400 transition-colors">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500">{meta.desc}</p>
          <p className="text-[10px] text-gray-600 mt-1 font-mono">{section.key}</p>
        </div>

        {/* Toggle */}
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <button onClick={() => onToggle(section)}
            className={`w-12 h-6 rounded-full transition-colors ${section.isVisible ? 'bg-brand-600' : 'bg-gray-700'}`}>
            <div className={`w-5 h-5 mt-0.5 mx-0.5 bg-white rounded-full shadow transition-transform ${section.isVisible ? 'translate-x-6' : ''}`} />
          </button>
          <span className={`text-[10px] font-semibold ${section.isVisible ? 'text-brand-500' : 'text-gray-600'}`}>
            {section.isVisible ? 'Visible' : 'Hidden'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function AdminSectionsPage() {
  const [sections, setSections] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = async () => {
    setLoading(true);
    try { const r = await adminApi.getSections(); setSections(r.sections || []); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggle = async (section) => {
    const newVal = !section.isVisible;
    setSections((prev) => prev.map((s) => s.key === section.key ? { ...s, isVisible: newVal } : s));
    try { await adminApi.updateSection(section.key, { isVisible: newVal }); showToast(`${newVal ? '✅' : '🙈'} ${section.title} ${newVal ? 'visible' : 'hidden'}`); }
    catch (e) { showToast(`❌ ${e.message}`); load(); }
  };

  const handleTitleSave = async (key, title) => {
    await adminApi.updateSection(key, { title });
    setSections((prev) => prev.map((s) => s.key === key ? { ...s, title } : s));
    showToast('✅ Title updated');
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 max-w-2xl mx-auto">
        <div>
          <h1 className="text-xl font-bold text-white">Homepage Sections</h1>
          <p className="text-gray-400 text-sm">Control which sections appear on the customer homepage. Click the pencil to edit section titles.</p>
        </div>

        <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-xl px-4 py-3 flex items-start gap-2">
          <span className="text-yellow-500">💡</span>
          <p className="text-xs text-yellow-400/80">Changes take effect immediately on the customer-facing site. Toggling a section OFF hides it for all customers.</p>
        </div>

        {loading ? (
          <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-2xl h-20 animate-pulse" />)}</div>
        ) : (
          <div className="space-y-3">
            {sections.map((section) => (
              <SectionCard key={section.key} section={section} onToggle={handleToggle} onTitleSave={handleTitleSave} />
            ))}
          </div>
        )}
      </div>

      {toast && <div className="fixed bottom-20 md:bottom-6 right-4 bg-gray-800 border border-gray-700 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-xl z-50">{toast}</div>}
    </AdminLayout>
  );
}
