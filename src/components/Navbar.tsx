import React, { useState } from 'react';
import { 
  FileText, 
  BookOpen,
  Variable,
  Folder,
  Database,
  Settings,
  Building2,
  Cloud, 
  Plus,
  Pin,
  PinOff,
  ChevronDown
} from 'lucide-react';

export type MainNavTab = 'generator' | 'templates' | 'variables' | 'database' | 'media' | 'profile';

interface NavbarProps {
  activeTab: MainNavTab;
  setActiveTab: (tab: MainNavTab) => void;
  onNewDoc: () => void;
  onOpenCloudModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onNewDoc,
  onOpenCloudModal,
}) => {
  const [autoHide, setAutoHide] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <>
      {/* Floating Trigger Bar when Auto-Hide is active and navbar is collapsed */}
      {autoHide && (
        <div 
          onMouseEnter={() => setIsHovered(true)}
          onClick={() => setIsHovered(true)}
          className="fixed top-0 left-0 right-0 z-40 h-8 cursor-pointer transition-all flex items-center justify-center no-print"
        >
          <div className="bg-slate-900/90 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-1.5 rounded-b-xl shadow-lg flex items-center gap-2 border-b border-x border-purple-500/30 backdrop-blur-sm transition-all hover:scale-105">
            <ChevronDown className="w-3.5 h-3.5 text-purple-400 animate-bounce" />
            <span>Tab Bar Tersembunyi (Klik / Arahkan kursor ke sini)</span>
          </div>
        </div>
      )}

      {/* Main Navbar */}
      <header
        onMouseEnter={() => autoHide && setIsHovered(true)}
        onMouseLeave={() => autoHide && setIsHovered(false)}
        className={`sticky top-0 z-30 holo-card border-b border-slate-200/80 px-4 lg:px-8 py-2.5 transition-all duration-300 no-print ${
          autoHide && !isHovered
            ? '-translate-y-full opacity-0 pointer-events-none'
            : 'translate-y-0 opacity-100'
        }`}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
          {/* Brand Zone */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-600 via-fuchsia-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight bg-gradient-to-r from-slate-900 via-purple-900 to-slate-800 bg-clip-text text-transparent">
                  Puskesdoc Generator
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.2 rounded-full bg-purple-100/80 text-purple-700 border border-purple-200">
                  ILP 2026
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-normal">Tata Naskah Akreditasi Puskesmas</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/60 shadow-inner">
            <button
              onClick={() => setActiveTab('generator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'generator'
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Generator Dokumen
            </button>

            <button
              onClick={() => setActiveTab('templates')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'templates'
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Pustaka Template
            </button>

            <button
              onClick={() => setActiveTab('variables')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'variables'
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Variable className="w-3.5 h-3.5" />
              Variabel
            </button>

            <button
              onClick={() => setActiveTab('database')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'database'
                  ? 'bg-white text-teal-700 shadow-sm border border-teal-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Database className="w-3.5 h-3.5 text-teal-600" />
              Database Puskesmas
            </button>

            <button
              onClick={() => setActiveTab('media')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'media'
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Folder className="w-3.5 h-3.5" />
              Pustaka Media
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'profile'
                  ? 'bg-white text-purple-700 shadow-sm border border-purple-100'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              Profil Faskes & KOP
            </button>
          </nav>

          {/* Action Controls & Auto-Hide Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Auto-Hide Toggle Button */}
            <button
              onClick={() => setAutoHide(!autoHide)}
              title={autoHide ? 'Kunci Tab Bar (Selalu Tampil)' : 'Aktifkan Auto-Hide Tab Bar'}
              className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all ${
                autoHide
                  ? 'bg-purple-100 text-purple-700 border-purple-300'
                  : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
              }`}
            >
              {autoHide ? <PinOff className="w-3.5 h-3.5 text-purple-600" /> : <Pin className="w-3.5 h-3.5 text-slate-400" />}
              <span className="hidden xl:inline">{autoHide ? 'Auto-Hide Aktif' : 'Auto-Hide'}</span>
            </button>

            <button
              onClick={onOpenCloudModal}
              title="Google Drive, Firebase, & Backup"
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-sm transition-all hover:border-purple-300"
            >
              <Cloud className="w-3.5 h-3.5 text-purple-600" />
              <span className="hidden sm:inline">Cloud & GDrive</span>
            </button>

            <button
              onClick={onNewDoc}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-lg shadow-sm shadow-purple-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="whitespace-nowrap">Dokumen Baru</span>
            </button>
          </div>
        </div>

        {/* Mobile / Tablet Tab Strip */}
        <div className="flex lg:hidden overflow-x-auto gap-1 pt-2 pb-1 border-t border-slate-200/50 mt-2">
          <button
            onClick={() => setActiveTab('generator')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'generator' ? 'bg-purple-600 text-white font-medium' : 'text-slate-600'
            }`}
          >
            Generator
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'templates' ? 'bg-purple-600 text-white font-medium' : 'text-slate-600'
            }`}
          >
            Pustaka Template
          </button>
          <button
            onClick={() => setActiveTab('variables')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'variables' ? 'bg-purple-600 text-white font-medium' : 'text-slate-600'
            }`}
          >
            Variabel
          </button>
          <button
            onClick={() => setActiveTab('database')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'database' ? 'bg-teal-600 text-white font-medium' : 'text-slate-600'
            }`}
          >
            Database Puskesmas
          </button>
          <button
            onClick={() => setActiveTab('media')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'media' ? 'bg-purple-600 text-white font-medium' : 'text-slate-600'
            }`}
          >
            Pustaka Media
          </button>
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-2.5 py-1 text-xs rounded-md whitespace-nowrap ${
              activeTab === 'profile' ? 'bg-purple-600 text-white font-medium' : 'text-slate-600'
            }`}
          >
            Profil Faskes
          </button>
        </div>
      </header>
    </>
  );
};
