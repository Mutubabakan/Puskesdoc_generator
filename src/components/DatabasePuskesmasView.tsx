import React, { useState, useMemo } from 'react';
import {
  Database,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Download,
  RotateCcw,
  Copy,
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { PuskesmasDatabaseItem, DatabaseCategory, DatabaseMetric, IlpKlaster } from '../types';
import { getStoredDatabase, saveDatabaseItem, deleteDatabaseItem, resetDatabaseToDefault } from '../utils/storage';
import { ILP_KLASTERS } from '../utils/constants';

interface DatabasePuskesmasViewProps {
  onSelectForGenerator?: (item: PuskesmasDatabaseItem) => void;
  onNavigateToGenerator?: () => void;
}

export const DatabasePuskesmasView: React.FC<DatabasePuskesmasViewProps> = ({
  onSelectForGenerator,
  onNavigateToGenerator,
}) => {
  const [databaseList, setDatabaseList] = useState<PuskesmasDatabaseItem[]>(getStoredDatabase());
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notice, setNotice] = useState<string | null>(null);

  // Edit / Add Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PuskesmasDatabaseItem | null>(null);

  // Form State for Modal
  const [formTitle, setFormTitle] = useState('');
  const [formCategory, setFormCategory] = useState<DatabaseCategory>('capaian_program');
  const [formPeriod, setFormPeriod] = useState('Tahun 2026');
  const [formKlaster, setFormKlaster] = useState<IlpKlaster>('KLASTER_1');
  const [formSummary, setFormSummary] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formMetrics, setFormMetrics] = useState<DatabaseMetric[]>([
    { key: '', value: '', target: '', unit: '%', status: 'tercapai' },
  ]);

  const triggerNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(null), 3500);
  };

  // Filtered list
  const filteredList = useMemo(() => {
    return databaseList.filter((item) => {
      const matchCat = selectedCategory === 'ALL' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchCat;

      const inTitle = item.title.toLowerCase().includes(q);
      const inSummary = item.summary.toLowerCase().includes(q);
      const inPeriod = (item.period || '').toLowerCase().includes(q);
      const inMetrics = item.metrics.some(
        (m) => m.key.toLowerCase().includes(q) || m.value.toLowerCase().includes(q)
      );
      return matchCat && (inTitle || inSummary || inPeriod || inMetrics);
    });
  }, [databaseList, selectedCategory, searchQuery]);

  // Overall Statistics
  const stats = useMemo(() => {
    let totalMetrics = 0;
    let tercapai = 0;
    let belumTercapai = 0;
    let pantauan = 0;

    databaseList.forEach((item) => {
      item.metrics.forEach((m) => {
        totalMetrics++;
        if (m.status === 'tercapai') tercapai++;
        else if (m.status === 'belum_tercapai') belumTercapai++;
        else pantauan++;
      });
    });

    return {
      totalItems: databaseList.length,
      totalMetrics,
      tercapai,
      belumTercapai,
      pantauan,
    };
  }, [databaseList]);

  // Open Modal for Create
  const handleOpenCreateModal = () => {
    setEditingItem(null);
    setFormTitle('');
    setFormCategory('capaian_program');
    setFormPeriod('Tahun 2026');
    setFormKlaster('KLASTER_1');
    setFormSummary('');
    setFormNotes('');
    setFormMetrics([
      { key: 'Indikator Utama 1', value: '85%', target: '100%', unit: '%', status: 'tercapai' },
      { key: 'Indikator Utama 2', value: '70%', target: '100%', unit: '%', status: 'belum_tercapai' },
    ]);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: PuskesmasDatabaseItem) => {
    setEditingItem(item);
    setFormTitle(item.title);
    setFormCategory(item.category);
    setFormPeriod(item.period || 'Tahun 2026');
    setFormKlaster(item.klaster || 'KLASTER_1');
    setFormSummary(item.summary);
    setFormNotes(item.notes || '');
    setFormMetrics(item.metrics.length > 0 ? [...item.metrics] : [{ key: '', value: '', status: 'tercapai' }]);
    setIsModalOpen(true);
  };

  // Add / Remove Metric in Form
  const handleAddMetricRow = () => {
    setFormMetrics((prev) => [...prev, { key: '', value: '', target: '', unit: '%', status: 'tercapai' }]);
  };

  const handleUpdateMetricRow = (idx: number, field: keyof DatabaseMetric, val: any) => {
    setFormMetrics((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: val };
      return copy;
    });
  };

  const handleRemoveMetricRow = (idx: number) => {
    setFormMetrics((prev) => prev.filter((_, i) => i !== idx));
  };

  // Save Modal
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      triggerNotice('Judul database tidak boleh kosong!');
      return;
    }

    const cleanedMetrics = formMetrics.filter((m) => m.key.trim().length > 0);

    const now = new Date().toISOString();
    const itemToSave: PuskesmasDatabaseItem = {
      id: editingItem ? editingItem.id : 'db_' + Date.now(),
      title: formTitle.trim(),
      category: formCategory,
      period: formPeriod.trim(),
      klaster: formKlaster,
      summary: formSummary.trim() || 'Data capaian operasional Puskesmas.',
      metrics: cleanedMetrics,
      notes: formNotes.trim(),
      updatedAt: now,
      createdAt: editingItem ? editingItem.createdAt : now,
    };

    saveDatabaseItem(itemToSave);
    const updated = getStoredDatabase();
    setDatabaseList(updated);
    setIsModalOpen(false);
    triggerNotice(editingItem ? 'Data Puskesmas berhasil diperbarui!' : 'Data Puskesmas baru berhasil ditambahkan!');
  };

  // Delete Item
  const handleDeleteItem = (id: string, title: string) => {
    if (window.confirm(`Yakin ingin menghapus data "${title}"?`)) {
      deleteDatabaseItem(id);
      setDatabaseList(getStoredDatabase());
      triggerNotice(`Data "${title}" telah dihapus.`);
    }
  };

  // Reset to default
  const handleResetDefault = () => {
    if (window.confirm('Reset database ke data capaian standar Puskesmas ILP bawaan? Data kustom akan ditimpa.')) {
      const def = resetDatabaseToDefault();
      setDatabaseList(def);
      triggerNotice('Database Puskesmas berhasil direset ke standar ILP!');
    }
  };

  // Copy Summary Text
  const handleCopySummary = (item: PuskesmasDatabaseItem) => {
    const text = `[${item.title} - ${item.period}]\n${item.summary}\n\nCapaian Indikator:\n${item.metrics
      .map((m) => `- ${m.key}: ${m.value}${m.target ? ` (Target: ${m.target})` : ''} [${m.status || ''}]`)
      .join('\n')}${item.notes ? `\n\nCatatan: ${item.notes}` : ''}`;
    navigator.clipboard.writeText(text);
    triggerNotice('Ringkasan data berhasil disalin ke clipboard!');
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(databaseList, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `database_puskesmas_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    triggerNotice('Berkas JSON database Puskesmas berhasil diunduh!');
  };

  // Helper Category Labels
  const categoryLabels: Record<DatabaseCategory, { label: string; color: string }> = {
    spm: { label: 'Standar Pelayanan Minimal (SPM)', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
    indikator_mutu: { label: 'Indikator Nasional Mutu (INM)', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    capaian_program: { label: 'Capaian Program Layanan', color: 'bg-blue-100 text-blue-800 border-blue-200' },
    demografi_sasaran: { label: 'Demografi & Sasaran Wilayah', color: 'bg-purple-100 text-purple-800 border-purple-200' },
    sdmk_ketenagaan: { label: 'SDMK & Ketenagaan', color: 'bg-amber-100 text-amber-800 border-amber-200' },
    sarpras_alkes: { label: 'Sarpras & Alkes (ASPAK)', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' },
    surveilans_penyakit: { label: 'Surveilans & KLB', color: 'bg-rose-100 text-rose-800 border-rose-200' },
    kinerja_keuangan: { label: 'Kinerja BOK & Keuangan', color: 'bg-teal-100 text-teal-800 border-teal-200' },
    kustom: { label: 'Data Kustom', color: 'bg-slate-100 text-slate-800 border-slate-200' },
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Toast Notification */}
      {notice && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 animate-in fade-in flex items-center gap-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{notice}</span>
        </div>
      )}

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-teal-900 via-indigo-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30 text-xs font-semibold">
              <Database className="w-3.5 h-3.5" />
              <span>Pusat Data Riil Faskes & Fakta Capaian</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Database Puskesmas & Capaian ILP
            </h1>
            <p className="text-sm text-slate-300 max-w-2xl leading-relaxed">
              Kumpulan data angka capaian SPM, Indikator Nasional Mutu (INM), ketenagaan, sasaran demografi, dan profil faskes. Seluruh data ini <strong>dapat dilihat dan disitir langsung oleh AI</strong> saat menghasilkan SOP, SK, KAK, dan dokumen akreditasi.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data Puskesmas</span>
            </button>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-white bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl transition-colors cursor-pointer"
              title="Unduh cadangan data dalam format JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              onClick={handleResetDefault}
              className="flex items-center gap-1.5 px-3 py-2.5 text-xs font-semibold text-rose-200 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 rounded-xl transition-colors cursor-pointer"
              title="Reset ke data awal standar Puskesmas ILP"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Standar</span>
            </button>
          </div>
        </div>

        {/* Quick KPI Stats Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-white">
          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-slate-300 block">Total Kumpulan Data</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black">{stats.totalItems}</span>
              <span className="text-[10px] text-teal-300">kategori/laporan</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-slate-300 block">Total Indikator & Metrik</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black">{stats.totalMetrics}</span>
              <span className="text-[10px] text-indigo-300">indikator terdata</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-emerald-300 block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Indikator Tercapai
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-emerald-400">{stats.tercapai}</span>
              <span className="text-[10px] text-slate-300">target terpenuhi</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-xs p-3 rounded-2xl border border-white/10">
            <span className="text-[11px] text-rose-300 block flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Perlu Perhatian (RTL)
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-xl font-black text-rose-400">{stats.belumTercapai}</span>
              <span className="text-[10px] text-slate-300">prioritas intervensi</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari indikator, nama capaian, SPM, angka, atau klaster..."
              className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Info Badge */}
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium shrink-0">
            <Sparkles className="w-4 h-4 text-teal-600" />
            <span>AI akan mengintegrasikan data yang dipilih pada tab Generator Dokumen</span>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 border-t border-slate-100">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Semua ({databaseList.length})
          </button>

          {Object.entries(categoryLabels).map(([catKey, catInfo]) => {
            const count = databaseList.filter((d) => d.category === catKey).length;
            if (count === 0 && selectedCategory !== catKey) return null;
            return (
              <button
                key={catKey}
                onClick={() => setSelectedCategory(catKey)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg shrink-0 transition-all flex items-center gap-1.5 ${
                  selectedCategory === catKey
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{catInfo.label}</span>
                <span className="text-[10px] opacity-80 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Database Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {filteredList.map((item) => {
          const cat = categoryLabels[item.category] || categoryLabels.kustom;
          const klasterObj = ILP_KLASTERS.find((k) => k.id === item.klaster);

          return (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden group"
            >
              {/* Card Header */}
              <div className="p-5 border-b border-slate-100 bg-slate-50/40 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase tracking-wider ${cat.color}`}>
                        {cat.label}
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {item.period || 'Periode Berjalan'}
                      </span>
                      {klasterObj && (
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          {klasterObj.name.split(':')[0]}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                      {item.title}
                    </h3>
                  </div>

                  {/* Actions dropdown/buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopySummary(item)}
                      title="Salin ringkasan data"
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEditModal(item)}
                      title="Edit data ini"
                      className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeleteItem(item.id, item.title)}
                      title="Hapus data ini"
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {item.summary}
                </p>
              </div>

              {/* Card Body: Metrics List */}
              <div className="p-5 flex-1 space-y-3">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                  <span>Indikator / Metrik ({item.metrics.length})</span>
                  <span>Capaian / Target</span>
                </div>

                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {item.metrics.map((metric, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between gap-3 text-xs p-2 rounded-xl bg-slate-50/70 hover:bg-slate-100/70 border border-slate-100 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <span className="font-medium text-slate-800 block truncate" title={metric.key}>
                          {metric.key}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-2xs">
                          {metric.value} {metric.unit || ''}
                        </span>

                        {metric.target && (
                          <span className="text-[10px] text-slate-400 font-mono" title={`Target: ${metric.target}`}>
                            / {metric.target}
                          </span>
                        )}

                        {metric.status === 'tercapai' && (
                          <span className="p-1 rounded bg-emerald-100 text-emerald-700" title="Target Tercapai">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {metric.status === 'belum_tercapai' && (
                          <span className="p-1 rounded bg-rose-100 text-rose-700" title="Target Belum Tercapai">
                            <AlertCircle className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {metric.status === 'dalam_pantauan' && (
                          <span className="p-1 rounded bg-amber-100 text-amber-700" title="Dalam Pantauan">
                            <Clock className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Analytical Notes */}
                {item.notes && (
                  <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Analisis & Rekomendasi Faskes: </span>
                      <span>{item.notes}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Card Footer: Quick Actions */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-between">
                <span className="text-[10px] text-slate-400 font-mono">
                  Update: {new Date(item.updatedAt).toLocaleDateString('id-ID')}
                </span>

                <button
                  onClick={() => {
                    if (onSelectForGenerator) onSelectForGenerator(item);
                    if (onNavigateToGenerator) onNavigateToGenerator();
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-all active:scale-95 cursor-pointer"
                  title="Pilih data ini untuk dibawa ke Generator Dokumen"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Panggil ke Generator Dokumen</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}

        {filteredList.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-dashed border-slate-300 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-600 mx-auto flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-slate-800">
                Tidak ada data Puskesmas yang cocok
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Coba ubah kata kunci pencarian atau buat data baru seperti capaian program, SPM, atau profil ketenagaan.
              </p>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Data Sekarang</span>
            </button>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT PUSKESMAS DATA */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh] animate-in fade-in duration-200">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-teal-50 via-white to-indigo-50 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-600 text-white flex items-center justify-center shadow-sm">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {editingItem ? 'Edit Data Puskesmas' : 'Tambah Data / Capaian Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Data ini akan menjadi bahan acuan AI saat menyusun SOP, SK, KAK, dan pedoman
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Body */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-5 flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">
                    Judul Laporan / Kumpulan Data <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Contoh: Capaian 12 Indikator SPM Kesehatan Tahun 2025"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Category */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Kategori Data</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as DatabaseCategory)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    <option value="spm">Standar Pelayanan Minimal (SPM)</option>
                    <option value="indikator_mutu">Indikator Nasional Mutu (INM)</option>
                    <option value="capaian_program">Capaian Program Layanan</option>
                    <option value="demografi_sasaran">Demografi & Sasaran Wilayah</option>
                    <option value="sdmk_ketenagaan">SDMK & Ketenagaan</option>
                    <option value="sarpras_alkes">Sarpras & Alkes (ASPAK)</option>
                    <option value="surveilans_penyakit">Surveilans & KLB</option>
                    <option value="kinerja_keuangan">Kinerja BOK & Keuangan</option>
                    <option value="kustom">Data Kustom</option>
                  </select>
                </div>

                {/* Period */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700">Periode / Waktu Data</label>
                  <input
                    type="text"
                    value={formPeriod}
                    onChange={(e) => setFormPeriod(e.target.value)}
                    placeholder="Contoh: Tahun 2025, Semester II 2025, Triwulan I 2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                {/* Klaster */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Klaster ILP Terkait (Opsional)</label>
                  <select
                    value={formKlaster}
                    onChange={(e) => setFormKlaster(e.target.value as IlpKlaster)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none bg-white"
                  >
                    {ILP_KLASTERS.map((k) => (
                      <option key={k.id} value={k.id}>
                        {k.name} ({k.description.slice(0, 45)}...)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Summary */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-xs font-bold text-slate-700">Ringkasan Gambaran Umum</label>
                  <textarea
                    rows={2}
                    value={formSummary}
                    onChange={(e) => setFormSummary(e.target.value)}
                    placeholder="Ringkasan konteks data ini untuk dipahami oleh AI..."
                    className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Dynamic Metrics List */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">
                      Rincian Indikator / Angka Capaian ({formMetrics.length})
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Masukkan nama indikator, nilai realisasi, target, dan statusnya
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddMetricRow}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Baris</span>
                  </button>
                </div>

                <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                  {formMetrics.map((metric, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-2"
                    >
                      {/* Metric Name */}
                      <input
                        type="text"
                        placeholder="Nama Indikator / Data"
                        value={metric.key}
                        onChange={(e) => handleUpdateMetricRow(idx, 'key', e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white"
                      />

                      {/* Value */}
                      <input
                        type="text"
                        placeholder="Nilai (e.g. 89%)"
                        value={metric.value}
                        onChange={(e) => handleUpdateMetricRow(idx, 'value', e.target.value)}
                        className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />

                      {/* Target */}
                      <input
                        type="text"
                        placeholder="Target (100%)"
                        value={metric.target || ''}
                        onChange={(e) => handleUpdateMetricRow(idx, 'target', e.target.value)}
                        className="w-24 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-mono"
                      />

                      {/* Status */}
                      <select
                        value={metric.status || 'tercapai'}
                        onChange={(e) => handleUpdateMetricRow(idx, 'status', e.target.value)}
                        className="w-32 px-2 py-1.5 text-xs border border-slate-300 rounded-lg bg-white font-semibold"
                      >
                        <option value="tercapai">✓ Tercapai</option>
                        <option value="belum_tercapai">✗ Belum Tercapai</option>
                        <option value="dalam_pantauan">⏳ Dalam Pantauan</option>
                      </select>

                      {/* Delete row */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMetricRow(idx)}
                        disabled={formMetrics.length <= 1}
                        className="p-1.5 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes / Rekomendasi */}
              <div className="space-y-1 pt-2 border-t border-slate-200">
                <label className="text-xs font-bold text-slate-700">
                  Catatan Analisis & Rencana Tindak Lanjut (RTL)
                </label>
                <textarea
                  rows={2}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Catatan masalah, kendala di lapangan, atau rekomendasi perbaikan untuk disitir oleh AI..."
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-indigo-600 hover:from-teal-700 hover:to-indigo-700 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  {editingItem ? 'Simpan Perubahan' : 'Simpan ke Database'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
