import React, { useState } from 'react';
import { 
  Building2, 
  Users, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  Save, 
  Eye, 
  RefreshCcw,
  Sparkles,
  Edit2,
  X,
  Move,
  Upload,
  Sliders
} from 'lucide-react';
import { FaskesProfile, VariableItem } from '../types';
import { DEFAULT_LOGO_PEMDA, DEFAULT_LOGO_PUSKESMAS, INITIAL_VARIABLES } from '../utils/constants';

interface ProfileVariablesViewProps {
  profile: FaskesProfile;
  setProfile: (p: FaskesProfile) => void;
  variables: VariableItem[];
  setVariables: (v: VariableItem[]) => void;
  onSaveProfile: (p: FaskesProfile) => void;
  onSaveVariables: (v: VariableItem[]) => void;
}

export const ProfileVariablesView: React.FC<ProfileVariablesViewProps> = ({
  profile,
  setProfile,
  variables,
  setVariables,
  onSaveProfile,
  onSaveVariables,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'variables'>('profile');
  const [kopSubTab, setKopSubTab] = useState<'manual' | 'image' | 'drag_editor'>(
    profile.kopMode || 'manual'
  );

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Variable editing state
  const [editingVariableId, setEditingVariableId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');

  // New Variable Form State
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<'faskes' | 'nakes' | 'dokumen' | 'custom'>('custom');

  // Drag & drop coordinates for KOP visual editor
  const [kopPositions, setKopPositions] = useState({
    logoPemdaX: 20,
    logoPemdaY: 15,
    logoPuskesmasX: 650,
    logoPuskesmasY: 15,
    textX: 90,
    textY: 10,
    lineWidth: 714,
  });
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleCopyTag = (key: string) => {
    navigator.clipboard.writeText(`{{${key}}}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'logoPemda' | 'logoPuskesmas' | 'gambarKopJadi') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      const updated = { ...profile, [field]: base64 };
      setProfile(updated);
      onSaveProfile(updated);
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteImage = (field: 'logoPemda' | 'logoPuskesmas' | 'gambarKopJadi') => {
    const updated = { ...profile, [field]: '' };
    setProfile(updated);
    onSaveProfile(updated);
  };

  const handleSaveAllProfile = () => {
    const updated = { ...profile, kopMode: kopSubTab };
    onSaveProfile(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  // Add new variable
  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) return;

    const formattedKey = newKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');
    const newVar: VariableItem = {
      id: 'v_' + Date.now(),
      key: formattedKey,
      label: newLabel.trim() || formattedKey,
      value: newValue.trim(),
      category: newCategory,
    };

    const updated = [...variables, newVar];
    setVariables(updated);
    onSaveVariables(updated);

    setNewKey('');
    setNewLabel('');
    setNewValue('');
  };

  // Start editing variable
  const handleStartEdit = (v: VariableItem) => {
    setEditingVariableId(v.id);
    setEditKey(v.key);
    setEditLabel(v.label);
    setEditValue(v.value);
  };

  // Save edited variable
  const handleSaveEdit = (id: string) => {
    const updated = variables.map((v) =>
      v.id === id
        ? {
            ...v,
            key: editKey.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
            label: editLabel.trim() || v.label,
            value: editValue.trim(),
          }
        : v
    );
    setVariables(updated);
    onSaveVariables(updated);
    setEditingVariableId(null);
  };

  // Delete variable
  const handleDeleteVariable = (id: string) => {
    const confirmed = window.confirm('Apakah Anda yakin ingin menghapus variabel ini dari kamus?');
    if (!confirmed) return;
    const updated = variables.filter((v) => v.id !== id);
    setVariables(updated);
    onSaveVariables(updated);
  };

  // Reset variables to defaults
  const handleResetVariables = () => {
    const confirmed = window.confirm('Kembalikan semua variabel ke pengaturan standar awal?');
    if (!confirmed) return;
    setVariables(INITIAL_VARIABLES);
    onSaveVariables(INITIAL_VARIABLES);
  };

  // KOP Drag and Drop Handlers
  const handleKopMouseDown = (e: React.MouseEvent, itemKey: string) => {
    e.stopPropagation();
    setDraggingItem(itemKey);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleKopMouseMove = (e: React.MouseEvent) => {
    if (!draggingItem) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setDragStart({ x: e.clientX, y: e.clientY });

    setKopPositions((prev) => {
      if (draggingItem === 'logoPemda') {
        return { ...prev, logoPemdaX: Math.max(0, Math.min(680, prev.logoPemdaX + dx)), logoPemdaY: Math.max(0, Math.min(100, prev.logoPemdaY + dy)) };
      }
      if (draggingItem === 'logoPuskesmas') {
        return { ...prev, logoPuskesmasX: Math.max(0, Math.min(680, prev.logoPuskesmasX + dx)), logoPuskesmasY: Math.max(0, Math.min(100, prev.logoPuskesmasY + dy)) };
      }
      if (draggingItem === 'text') {
        return { ...prev, textX: Math.max(0, Math.min(500, prev.textX + dx)), textY: Math.max(0, Math.min(80, prev.textY + dy)) };
      }
      return prev;
    });
  };

  const handleKopMouseUp = () => {
    setDraggingItem(null);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Banner */}
      <div className="p-6 rounded-2xl holo-card border border-purple-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Profil Faskes, KOP & Kamus Variabel</h1>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">
              Pengaturan Terpadu
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
            Kelola profil resmi Puskesmas, pilih mode KOP surat (input manual, upload gambar KOP utuh, atau editor KOP visual drag & drop), serta kelola kamus variabel dinamis.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'profile'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 inline mr-1.5" />
            Profil & KOP Faskes
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all ${
              activeTab === 'variables'
                ? 'bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white shadow-md shadow-purple-500/20'
                : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 inline mr-1.5" />
            Kamus Variabel ({variables.length})
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in shadow-sm">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>Profil Puskesmas dan konfigurasi KOP berhasil disimpan!</span>
        </div>
      )}

      {/* TAB 1: PROFIL & KOP */}
      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* SubTab Selection for KOP Mode */}
          <div className="bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2 max-w-xl">
            <span className="text-xs font-bold text-slate-700 px-2">Mode KOP:</span>
            <button
              onClick={() => setKopSubTab('manual')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                kopSubTab === 'manual'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Format Teks & 2 Logo
            </button>
            <button
              onClick={() => setKopSubTab('image')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                kopSubTab === 'image'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Upload Gambar KOP Jadi
            </button>
            <button
              onClick={() => setKopSubTab('drag_editor')}
              className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all ${
                kopSubTab === 'drag_editor'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              Editor KOP Drag & Drop
            </button>
          </div>

          {/* MODE 2: UPLOAD GAMBAR KOP JADI */}
          {kopSubTab === 'image' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Upload className="w-4 h-4 text-purple-600" />
                    Upload File Gambar Banner KOP Surat Utuh
                  </h3>
                  <p className="text-xs text-slate-500">
                    Gunakan file gambar header KOP resmi yang sudah didesain instansi (format PNG/JPG transparan/putih).
                  </p>
                </div>
                {profile.gambarKopJadi && (
                  <button
                    onClick={() => handleDeleteImage('gambarKopJadi')}
                    className="flex items-center gap-1 px-3 py-1 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Hapus Gambar KOP
                  </button>
                )}
              </div>

              {profile.gambarKopJadi ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 flex justify-center">
                    <img src={profile.gambarKopJadi} alt="Gambar KOP Jadi" className="max-h-36 object-contain" />
                  </div>
                  <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer border border-purple-200">
                    <Upload className="w-3.5 h-3.5" />
                    Ganti Gambar KOP
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'gambarKopJadi')} className="hidden" />
                  </label>
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <ImageIcon className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-600 font-medium">Belum ada gambar KOP yang diunggah</p>
                  <label className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-lg cursor-pointer shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    Pilih Berkas Gambar KOP (.png, .jpg)
                    <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'gambarKopJadi')} className="hidden" />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* MODE 3: EDITOR KOP VISUAL DRAG & DROP */}
          {kopSubTab === 'drag_editor' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    <Move className="w-4 h-4 text-purple-600" />
                    Editor Tata Letak KOP Visual (Drag & Drop)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Klik dan geser logo Pemda, logo Puskesmas, atau teks judul instansi untuk menyesuaikan tata letak KOP secara presisi.
                  </p>
                </div>
                <button
                  onClick={() => setKopPositions({ logoPemdaX: 20, logoPemdaY: 15, logoPuskesmasX: 650, logoPuskesmasY: 15, textX: 90, textY: 10, lineWidth: 714 })}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg"
                >
                  <RefreshCcw className="w-3 h-3" />
                  Reset Posisi
                </button>
              </div>

              {/* Interactive KOP Canvas Container */}
              <div
                onMouseMove={handleKopMouseMove}
                onMouseUp={handleKopMouseUp}
                className="w-full max-w-[760px] h-[160px] bg-white border-2 border-slate-300 rounded-xl relative overflow-hidden select-none shadow-sm cursor-default"
                style={{ fontFamily: 'Arial, sans-serif' }}
              >
                {/* Draggable Logo Pemda */}
                <div
                  onMouseDown={(e) => handleKopMouseDown(e, 'logoPemda')}
                  style={{ left: `${kopPositions.logoPemdaX}px`, top: `${kopPositions.logoPemdaY}px` }}
                  className="absolute cursor-move p-1 rounded hover:ring-2 hover:ring-purple-400 bg-white/70"
                  title="Drag Logo Pemda"
                >
                  <img src={profile.logoPemda || DEFAULT_LOGO_PEMDA} alt="Logo Pemda" className="w-14 h-14 object-contain pointer-events-none" />
                </div>

                {/* Draggable Center Text */}
                <div
                  onMouseDown={(e) => handleKopMouseDown(e, 'text')}
                  style={{ left: `${kopPositions.textX}px`, top: `${kopPositions.textY}px` }}
                  className="absolute cursor-move p-2 rounded hover:ring-2 hover:ring-purple-400 text-center w-[540px] bg-white/70"
                  title="Drag Teks Instansi"
                >
                  <p className="text-[12px] font-bold text-slate-800 leading-tight">
                    {profile.pemerintahDaerah.toUpperCase()}
                  </p>
                  <p className="text-[13px] font-bold text-slate-900 leading-tight">
                    {profile.dinasKesehatan.toUpperCase()}
                  </p>
                  <p className="text-[15px] font-black text-purple-900 leading-tight">
                    {profile.namaPuskesmas.toUpperCase()}
                  </p>
                  <p className="text-[9px] text-slate-600 italic mt-0.5">
                    {profile.alamat} · Telp: {profile.telepon}
                  </p>
                </div>

                {/* Draggable Logo Puskesmas */}
                <div
                  onMouseDown={(e) => handleKopMouseDown(e, 'logoPuskesmas')}
                  style={{ left: `${kopPositions.logoPuskesmasX}px`, top: `${kopPositions.logoPuskesmasY}px` }}
                  className="absolute cursor-move p-1 rounded hover:ring-2 hover:ring-purple-400 bg-white/70"
                  title="Drag Logo Puskesmas"
                >
                  <img src={profile.logoPuskesmas || DEFAULT_LOGO_PUSKESMAS} alt="Logo Puskesmas" className="w-14 h-14 object-contain pointer-events-none" />
                </div>

                {/* Double Border Line at Bottom */}
                <div className="absolute bottom-2 left-4 right-4 space-y-[1px]">
                  <div className="border-b-2 border-slate-900" />
                  <div className="border-b border-slate-900" />
                </div>
              </div>

              <span className="text-[11px] text-slate-400 block italic">
                * Drag logo atau teks untuk mengatur posisi simetris KOP faskes Anda.
              </span>
            </div>
          )}

          {/* Form Profil Utama & Pengaturan Logo */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Form Profil Puskesmas & Kapus */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Building2 className="w-4 h-4 text-purple-600" />
                  Data Master Puskesmas
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Pemerintah Daerah
                    </label>
                    <input
                      type="text"
                      value={profile.pemerintahDaerah}
                      onChange={(e) => setProfile({ ...profile, pemerintahDaerah: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Dinas Kesehatan
                    </label>
                    <input
                      type="text"
                      value={profile.dinasKesehatan}
                      onChange={(e) => setProfile({ ...profile, dinasKesehatan: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama UPTD Puskesmas
                    </label>
                    <input
                      type="text"
                      value={profile.namaPuskesmas}
                      onChange={(e) => setProfile({ ...profile, namaPuskesmas: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Kode Puskesmas
                    </label>
                    <input
                      type="text"
                      value={profile.kodeFaskes}
                      onChange={(e) => setProfile({ ...profile, kodeFaskes: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Alamat Lengkap Faskes
                    </label>
                    <input
                      type="text"
                      value={profile.alamat}
                      onChange={(e) => setProfile({ ...profile, alamat: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      No. Telepon / WhatsApp
                    </label>
                    <input
                      type="text"
                      value={profile.telepon}
                      onChange={(e) => setProfile({ ...profile, telepon: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Email Resmi
                    </label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              {/* Data Kapus */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Users className="w-4 h-4 text-purple-600" />
                  Data Pejabat Penandatangan (Kepala Puskesmas)
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nama Lengkap & Gelar Kapus
                    </label>
                    <input
                      type="text"
                      value={profile.kepalaPuskesmas}
                      onChange={(e) => setProfile({ ...profile, kepalaPuskesmas: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      NIP Kepala Puskesmas
                    </label>
                    <input
                      type="text"
                      value={profile.nipKepala}
                      onChange={(e) => setProfile({ ...profile, nipKepala: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Sebutan Jabatan
                    </label>
                    <input
                      type="text"
                      value={profile.jabatanKepala}
                      onChange={(e) => setProfile({ ...profile, jabatanKepala: e.target.value })}
                      className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleSaveAllProfile}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 rounded-xl shadow-md shadow-purple-500/20 transition-all active:scale-95"
                >
                  <Save className="w-4 h-4" />
                  Simpan Seluruh Profil Faskes
                </button>
              </div>
            </div>

            {/* Kolom Kanan: Logo Pemda & Logo Puskesmas (dengan fitur HAPUS & GANTI) */}
            <div className="space-y-5">
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-3">
                  <ImageIcon className="w-4 h-4 text-purple-600" />
                  Logo Faskes Resmi
                </h3>

                <div className="space-y-4">
                  {/* Logo Pemda */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Logo Pemda (Kiri)</span>
                      {profile.logoPemda && (
                        <button
                          onClick={() => handleDeleteImage('logoPemda')}
                          className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700"
                          title="Hapus Logo Pemda"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white p-1 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {profile.logoPemda ? (
                          <img src={profile.logoPemda} alt="Logo Pemda" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400">Kosong</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer border border-purple-200">
                          {profile.logoPemda ? 'Ganti' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'logoPemda')}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => setProfile({ ...profile, logoPemda: DEFAULT_LOGO_PEMDA })}
                          title="Kembalikan logo default"
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Logo Puskesmas */}
                  <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">Logo Puskesmas (Kanan)</span>
                      {profile.logoPuskesmas && (
                        <button
                          onClick={() => handleDeleteImage('logoPuskesmas')}
                          className="flex items-center gap-1 text-[11px] text-rose-600 hover:text-rose-700"
                          title="Hapus Logo Puskesmas"
                        >
                          <Trash2 className="w-3 h-3" />
                          Hapus
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-white p-1 border border-slate-200 flex items-center justify-center overflow-hidden">
                        {profile.logoPuskesmas ? (
                          <img src={profile.logoPuskesmas} alt="Logo Puskesmas" className="max-w-full max-h-full object-contain" />
                        ) : (
                          <span className="text-[10px] text-slate-400">Kosong</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg cursor-pointer border border-purple-200">
                          {profile.logoPuskesmas ? 'Ganti' : 'Upload'}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, 'logoPuskesmas')}
                            className="hidden"
                          />
                        </label>
                        <button
                          onClick={() => setProfile({ ...profile, logoPuskesmas: DEFAULT_LOGO_PUSKESMAS })}
                          title="Kembalikan logo default"
                          className="p-1 text-slate-400 hover:text-slate-600"
                        >
                          <RefreshCcw className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: KAMUS VARIABEL (DENGAN FITUR EDIT & HAPUS LENGKAP) */}
      {activeTab === 'variables' && (
        <div className="space-y-6">
          {/* Add New Variable Form */}
          <form onSubmit={handleAddVariable} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600" />
              Tambah Variabel Kustom Baru
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Kunci Variabel
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2 text-xs text-purple-600 font-mono">{'{{'}</span>
                  <input
                    type="text"
                    value={newKey}
                    onChange={(e) => setNewKey(e.target.value)}
                    placeholder="nama_bendahara"
                    className="w-full pl-6 pr-6 py-1.5 text-xs border border-slate-200 rounded-lg font-mono focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
                  />
                  <span className="absolute right-2.5 top-2 text-xs text-purple-600 font-mono">{'}}'}</span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Label Penjelasan
                </label>
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  placeholder="Bendahara JKN"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Nilai Otomatis / Isi Teks
                </label>
                <input
                  type="text"
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder="Hj. YULIANTI, S.E"
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex items-end gap-2">
                <button
                  type="submit"
                  disabled={!newKey.trim() || !newValue.trim()}
                  className="w-full py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-lg shadow-sm transition-all"
                >
                  Simpan Variabel
                </button>
              </div>
            </div>
          </form>

          {/* List of Variables with Full Inline Edit & Delete */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Daftar Variabel Tersimpan</h3>
                <p className="text-xs text-slate-500">Anda dapat menyalin tag, mengedit isi nilai variabel, atau menghapusnya</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetVariables}
                  className="text-xs text-slate-500 hover:text-slate-800 underline"
                  title="Kembalikan variabel awal"
                >
                  Reset Standar
                </button>
                <span className="text-xs font-semibold px-2.5 py-1 bg-purple-100 text-purple-700 rounded-full">
                  {variables.length} Variabel
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {variables.map((v) => (
                <div key={v.id} className="p-4 hover:bg-slate-50/80 transition-colors">
                  {editingVariableId === v.id ? (
                    /* Inline Edit Mode */
                    <div className="space-y-3 bg-purple-50/40 p-3 rounded-xl border border-purple-200">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Kunci</label>
                          <input
                            type="text"
                            value={editKey}
                            onChange={(e) => setEditKey(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Label</label>
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Nilai Isi</label>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2 py-1 text-xs border border-slate-300 rounded"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingVariableId(null)}
                          className="px-3 py-1 text-xs text-slate-600 bg-white border border-slate-300 rounded hover:bg-slate-100"
                        >
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(v.id)}
                          className="px-3 py-1 text-xs font-semibold text-white bg-purple-600 rounded hover:bg-purple-700"
                        >
                          Simpan Perubahan
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Normal View Mode */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                            {`{{${v.key}}}`}
                          </span>
                          <span className="text-xs font-medium text-slate-700">{v.label}</span>
                          <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                            {v.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-800 font-semibold">{v.value}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleCopyTag(v.key)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                        >
                          {copiedKey === v.key ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Disalin</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Salin</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => handleStartEdit(v)}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg border border-purple-200 transition-colors"
                          title="Edit variabel"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>

                        <button
                          onClick={() => handleDeleteVariable(v.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                          title="Hapus variabel"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
