import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  LogIn, 
  LogOut, 
  Check, 
  Cloud, 
  RefreshCw, 
  ShieldCheck, 
  HardDrive,
  AlertCircle
} from 'lucide-react';
import { 
  getStoredUserAccount, 
  saveUserAccount, 
  logoutUserAccount, 
  UserAccount,
  exportBackupJSON,
  importBackupJSON
} from '../utils/storage';
import { 
  googleSignIn, 
  logout as googleLogout, 
  getAccessToken 
} from '../services/googleAuth';
import { 
  saveAppBackupToGoogleDrive, 
  loadLatestBackupFromGoogleDrive 
} from '../services/googleDrive';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string) => void;
  onDataRestored: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onDataRestored,
}) => {
  const [account, setAccount] = useState<UserAccount>(getStoredUserAccount());
  const [emailInput, setEmailInput] = useState(account.email || 'mutupuskesmasbabakan@gmail.com');
  const [passwordInput, setPasswordInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notice, setNotice] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const stored = getStoredUserAccount();
      setAccount(stored);
      if (stored.email) setEmailInput(stored.email);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const triggerNotice = (message: string, type: 'success' | 'error' = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 4000);
  };

  // Perform Google Drive Sync using current accessToken or after login
  const performGDriveSync = async (token?: string | null) => {
    try {
      const activeToken = token || (await getAccessToken());
      if (!activeToken) {
        return;
      }

      // 1. Try to load latest backup from Google Drive
      const cloudBackup = await loadLatestBackupFromGoogleDrive(activeToken);
      if (cloudBackup) {
        const imported = importBackupJSON(cloudBackup);
        if (imported) {
          onDataRestored();
          triggerNotice('Data aplikasi berhasil disinkronkan dengan cadangan Google Drive!', 'success');
          return;
        }
      }

      // 2. If no cloud backup exists yet, save current local state to Google Drive as initial backup
      const localBackup = exportBackupJSON();
      await saveAppBackupToGoogleDrive(activeToken, localBackup);
      triggerNotice('Cadangan data awal berhasil diunggah ke Google Drive!', 'success');
    } catch (err: any) {
      console.warn('GDrive auto-sync notice:', err);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      triggerNotice('Harap masukkan alamat email valid.', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const updated: UserAccount = {
        email: emailInput.trim(),
        name: emailInput.split('@')[0],
        isLoggedIn: true,
        lastLoginAt: new Date().toISOString(),
        autoSyncGDrive: true,
      };

      saveUserAccount(updated);
      setAccount(updated);
      onLoginSuccess(updated.email);

      // Attempt background GDrive sync if token is available
      const token = await getAccessToken();
      if (token) {
        await performGDriveSync(token);
      }

      triggerNotice(`Berhasil masuk sebagai ${updated.email}. Sesi akun aktif!`, 'success');
      setTimeout(() => onClose(), 1200);
    } catch (err: any) {
      triggerNotice(`Gagal login: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsProcessing(true);
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        const email = res.user.email || emailInput;
        const updated: UserAccount = {
          email,
          name: res.user.displayName || email.split('@')[0],
          isLoggedIn: true,
          lastLoginAt: new Date().toISOString(),
          autoSyncGDrive: true,
        };
        saveUserAccount(updated);
        setAccount(updated);
        onLoginSuccess(email);

        // Sync backup with Google Drive immediately
        await performGDriveSync(res.accessToken);

        triggerNotice(`Berhasil masuk & tersinkronisasi dengan akun Google ${email}!`, 'success');
        setTimeout(() => onClose(), 1500);
      }
    } catch (err: any) {
      triggerNotice(`Gagal masuk dengan Google: ${err.message}`, 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualSyncNow = async () => {
    setIsProcessing(true);
    try {
      const token = await getAccessToken();
      if (!token) {
        triggerNotice('Silakan login dengan Google terlebih dahulu untuk sinkronisasi Google Drive.', 'error');
        return;
      }
      await performGDriveSync(token);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = async () => {
    await googleLogout();
    logoutUserAccount();
    setAccount({ email: '', isLoggedIn: false });
    triggerNotice('Anda telah berhasil keluar dari akun.', 'success');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-teal-700 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Login & Sinkronisasi Akun</h2>
              <p className="text-xs text-purple-100">Otomatis sinkron dengan Google Drive</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notices */}
        {notice && (
          <div className={`p-3 text-xs flex items-center gap-2 ${
            notice.type === 'success' 
              ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-200' 
              : 'bg-rose-50 text-rose-800 border-b border-rose-200'
          }`}>
            {notice.type === 'success' ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />}
            <span>{notice.message}</span>
          </div>
        )}

        <div className="p-6 space-y-5">
          {account.isLoggedIn && account.email ? (
            /* Logged In Status */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50 to-white border border-emerald-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    Sesi Akun Aktif
                  </span>
                  <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-full font-bold">
                    Tersinkron
                  </span>
                </div>
                <p className="text-sm font-extrabold text-slate-800 font-mono break-all">
                  {account.email}
                </p>
                <p className="text-[11px] text-slate-500">
                  Data faskes, dokumen, capaian, dan variabel otomatis tersinkron ke Google Drive.
                </p>
              </div>

              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleManualSyncNow}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <RefreshCw className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                  <span>Sinkronkan Sekarang dengan Google Drive</span>
                </button>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  <Cloud className="w-4 h-4 text-purple-600" />
                  <span>Hubungkan / Ganti Akun Google</span>
                </button>

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Keluar dari Akun Ini</span>
                </button>
              </div>
            </div>
          ) : (
            /* Login Form */
            <div className="space-y-4">
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Alamat Email Faskes / Petugas Mutu
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="contoh: mutupuskesmasbabakan@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white text-slate-900 font-medium"
                    />
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Email ini akan digunakan untuk identifikasi sesi dan sinkronisasi data ke Google Drive faskes.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 rounded-xl shadow-md transition-all active:scale-98 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Masuk dengan Email & Sinkronkan</span>
                </button>
              </form>

              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] text-slate-400 uppercase font-semibold">atau</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* 1-Click Google Sign-In with official Drive scopes */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isProcessing}
                className="w-full flex items-center justify-center gap-2.5 py-2.5 px-4 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>Masuk dengan Akun Google Resmi</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <HardDrive className="w-3.5 h-3.5 text-teal-600" />
            Cadangan tersimpan di Google Drive & Lokal
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-600 hover:text-slate-900 font-bold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
