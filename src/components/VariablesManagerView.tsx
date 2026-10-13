import React, { useState, useMemo } from 'react';
import { 
  Variable, 
  Plus, 
  Trash2, 
  Edit3, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  RotateCcw, 
  Save, 
  X, 
  AlertCircle, 
  FileCode,
  Tag,
  Download,
  Upload
} from 'lucide-react';
import { VariableItem } from '../types';
import { INITIAL_VARIABLES } from '../utils/constants';

interface VariablesManagerViewProps {
  variables: VariableItem[];
  setVariables: (vars: VariableItem[]) => void;
  onSaveVariables: (vars: VariableItem[]) => void;
}

export const VariablesManagerView: React.FC<VariablesManagerViewProps> = ({
  variables,
  setVariables,
  onSaveVariables,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Form State for Adding New Variable
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newValue, setNewValue] = useState('');
  const [newCategory, setNewCategory] = useState<VariableItem['category']>('custom');

  // State for Editing Variable
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editValue, setEditValue] = useState('');
  const [editCategory, setEditCategory] = useState<VariableItem['category']>('custom');

  const triggerNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3000);
  };

  // Filtered Variables
  const filteredVariables = useMemo(() => {
    return variables.filter((v) => {
      const matchSearch =
        v.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.value.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCategory = selectedCategory === 'ALL' || v.category === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [variables, searchQuery, selectedCategory]);

  // Copy Tag to Clipboard
  const handleCopyTag = (key: string) => {
    const tag = `{{${key}}}`;
    navigator.clipboard.writeText(tag);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
    triggerNotice(`Variabel ${tag} disalin ke clipboard!`);
  };

  // Add Variable Handler
  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newValue.trim()) {
      triggerNotice('Kunci variabel dan nilai tidak boleh kosong!', 'error');
      return;
    }

    const formattedKey = newKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Check duplicate key
    if (variables.some((v) => v.key === formattedKey)) {
      triggerNotice(`Variabel {{${formattedKey}}} sudah ada! Gunakan kunci lain.`, 'error');
      return;
    }

    const newItem: VariableItem = {
      id: 'var_' + Date.now(),
      key: formattedKey,
      label: newLabel.trim() || formattedKey,
      value: newValue.trim(),
      category: newCategory,
    };

    const updated = [newItem, ...variables];
    setVariables(updated);
    onSaveVariables(updated);

    // Reset Form
    setNewKey('');
    setNewLabel('');
    setNewValue('');
    setNewCategory('custom');
    setIsAddingNew(false);
    triggerNotice(`Variabel {{${formattedKey}}} berhasil ditambahkan!`);
  };

  // Start Edit Handler
  const handleStartEdit = (v: VariableItem) => {
    setEditingId(v.id);
    setEditKey(v.key);
    setEditLabel(v.label);
    setEditValue(v.value);
    setEditCategory(v.category);
  };

  // Save Edit Handler
  const handleSaveEdit = (id: string) => {
    if (!editKey.trim() || !editValue.trim()) {
      triggerNotice('Kunci dan nilai variabel tidak boleh kosong!', 'error');
      return;
    }

    const formattedKey = editKey.toLowerCase().replace(/[^a-z0-9_]/g, '_');

    // Check duplicate key if changed
    const existsOther = variables.some((v) => v.id !== id && v.key === formattedKey);
    if (existsOther) {
      triggerNotice(`Variabel {{${formattedKey}}} sudah digunakan!`, 'error');
      return;
    }

    const updated = variables.map((v) => {
      if (v.id === id) {
        return {
          ...v,
          key: formattedKey,
          label: editLabel.trim() || formattedKey,
          value: editValue.trim(),
          category: editCategory,
        };
      }
      return v;
    });

    setVariables(updated);
    onSaveVariables(updated);
    setEditingId(null);
    triggerNotice(`Perubahan variabel {{${formattedKey}}} berhasil disimpan!`);
  };

  // Delete Variable Handler
  const handleDeleteVariable = (id: string, key: string) => {
    if (window.confirm(`Hapus variabel {{${key}}}? Tindakan ini tidak dapat dibatalkan.`)) {
      const updated = variables.filter((v) => v.id !== id);
      setVariables(updated);
      onSaveVariables(updated);
      if (editingId === id) setEditingId(null);
      triggerNotice(`Variabel {{${key}}} berhasil dihapus.`);
    }
  };

  // Reset to Default Variables
  const handleResetToDefault = () => {
    if (window.confirm('Kembalikan seluruh daftar variabel ke data awal standar Puskesmas ILP? Variabel kustom baru Anda akan terhapus.')) {
      setVariables(INITIAL_VARIABLES);
      onSaveVariables(INITIAL_VARIABLES);
      triggerNotice('Variabel berhasil direset ke standar Puskesmas!');
    }
  };

  // Export Variables JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(variables, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `variabel_puskesmas_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerNotice('Daftar variabel berhasil diekspor ke file JSON!');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div 
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2 animate-bounce ${
            notice.type === 'success' 
              ? 'bg-purple-900 text-white border-purple-700' 
              : 'bg-rose-900 text-white border-rose-700'
          }`}
        >
          {notice.type === 'success' ? <Check className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-rose-400" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-8 h-8 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
              <Variable className="w-4 h-4" />
            </span>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Kelola Variabel Master
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
              {variables.length} Variabel Aktif
            </span>
          </div>
          <p className="text-xs text-slate-500 max-w-2xl">
            Di sini semua variabel dapat <strong>diedit, ditambah, maupun dihapus</strong>. Untuk memanggil variabel di lembar kerja generator dokumen, Anda cukup mengetik <code className="bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded border border-purple-200 font-bold font-mono">{'{{'}</code> di mana pun untuk memunculkan daftar rekomendasi otomatis atau menyelesaikannya secara manual.
          </p>
        </div>

        {/* Action Header Buttons */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            type="button"
            onClick={handleExportJSON}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-2xs"
            title="Ekspor daftar variabel ke JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Ekspor JSON</span>
          </button>

          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 border border-slate-200 rounded-xl transition-all shadow-2xs"
            title="Reset ke daftar variabel standar"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Standar</span>
          </button>

          <button
            type="button"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white text-xs font-bold rounded-xl shadow-md shadow-purple-500/20 transition-all active:scale-95"
          >
            {isAddingNew ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{isAddingNew ? 'Tutup Form' : 'Tambah Variabel Baru'}</span>
          </button>
        </div>
      </div>

      {/* FORM: Tambah Variabel Baru */}
      {isAddingNew && (
        <form
          onSubmit={handleAddVariable}
          className="bg-purple-50/70 border border-purple-200 p-5 rounded-2xl shadow-xs space-y-4 animate-in fade-in duration-200"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-purple-950 flex items-center gap-2">
              <Plus className="w-4 h-4 text-purple-600" />
              Tambah Variabel Baru
            </h3>
            <span className="text-[11px] text-purple-600 font-mono">Format Tag: {'{{kunci}}'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kunci Tag (Key) *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  {'{{'}
                </span>
                <input
                  type="text"
                  required
                  value={newKey}
                  onChange={(e) => setNewKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                  placeholder="contoh_kunci_baru"
                  className="w-full pl-7 pr-7 py-2 text-xs border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-mono bg-white"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">
                  {'}}'}
                </span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Huruf kecil, angka, garis bawah (_)</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Label Deskriptif *
              </label>
              <input
                type="text"
                required
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Contoh: Nama Penanggung Jawab Mutu"
                className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nilai Pengganti (Value) *
              </label>
              <input
                type="text"
                required
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="Contoh: dr. Siti Aminah, Sp.A"
                className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Kategori
              </label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as VariableItem['category'])}
                className="w-full px-3 py-2 text-xs border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
              >
                <option value="faskes">Profil Puskesmas / Faskes</option>
                <option value="nakes">Tenaga Kesehatan & Pejabat</option>
                <option value="dokumen">Tata Naskah & Dokumen</option>
                <option value="custom">Variabel Kustom</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-purple-100 rounded-xl transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-all"
            >
              Simpan Variabel
            </button>
          </div>
        </form>
      )}

      {/* Toolbar Pencarian & Filter Kategori */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kunci, label, atau nilai..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <span className="text-[11px] font-bold text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Filter:
          </span>

          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({variables.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('faskes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'faskes'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Faskes ({variables.filter(v => v.category === 'faskes').length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('nakes')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'nakes'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Nakes & Pejabat ({variables.filter(v => v.category === 'nakes').length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('dokumen')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'dokumen'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Dokumen ({variables.filter(v => v.category === 'dokumen').length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCategory('custom')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              selectedCategory === 'custom'
                ? 'bg-purple-600 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Kustom ({variables.filter(v => v.category === 'custom').length})
          </button>
        </div>
      </div>

      {/* Table / List of Variables */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Tag Variabel</th>
                <th className="px-5 py-3.5">Label / Deskripsi</th>
                <th className="px-5 py-3.5">Nilai Pengganti (Value)</th>
                <th className="px-5 py-3.5">Kategori</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredVariables.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-slate-400">
                    Tidak ada variabel ditemukan dengan kata kunci atau filter ini.
                  </td>
                </tr>
              ) : (
                filteredVariables.map((v) => {
                  const isEditing = editingId === v.id;

                  if (isEditing) {
                    return (
                      <tr key={v.id} className="bg-purple-50/60">
                        <td className="px-5 py-3">
                          <div className="relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{'{{'}</span>
                            <input
                              type="text"
                              value={editKey}
                              onChange={(e) => setEditKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                              className="w-full pl-6 pr-6 py-1.5 text-xs font-mono font-bold bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs">{'}}'}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={editLabel}
                            onChange={(e) => setEditLabel(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          />
                        </td>
                        <td className="px-5 py-3">
                          <select
                            value={editCategory}
                            onChange={(e) => setEditCategory(e.target.value as VariableItem['category'])}
                            className="px-2 py-1.5 text-xs bg-white border border-purple-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="faskes">faskes</option>
                            <option value="nakes">nakes</option>
                            <option value="dokumen">dokumen</option>
                            <option value="custom">custom</option>
                          </select>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(v.id)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-2xs transition-colors flex items-center gap-1"
                            >
                              <Save className="w-3.5 h-3.5" /> Simpan
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg"
                              title="Batal"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={v.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Tag Key */}
                      <td className="px-5 py-3.5">
                        <button
                          type="button"
                          onClick={() => handleCopyTag(v.key)}
                          className="font-mono text-purple-700 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-md border border-purple-200 font-bold transition-all text-xs flex items-center gap-1.5 group/tag"
                          title="Klik untuk menyalin tag ke clipboard"
                        >
                          <span>{`{{${v.key}}}`}</span>
                          {copiedKey === v.key ? (
                            <Check className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-purple-400 opacity-0 group-hover/tag:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </td>

                      {/* Label */}
                      <td className="px-5 py-3.5 font-semibold text-slate-800">
                        {v.label}
                      </td>

                      {/* Current Value */}
                      <td className="px-5 py-3.5 text-slate-600 max-w-xs truncate">
                        {v.value || <span className="text-slate-300 italic">(Kosong)</span>}
                      </td>

                      {/* Category Badge */}
                      <td className="px-5 py-3.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                          v.category === 'faskes' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : v.category === 'nakes'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : v.category === 'dokumen'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : 'bg-purple-50 text-purple-700 border border-purple-200'
                        }`}>
                          {v.category}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleCopyTag(v.key)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Salin {{kunci}}"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleStartEdit(v)}
                            className="p-1.5 text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            title="Edit Variabel"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteVariable(v.id, v.key)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Hapus Variabel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
