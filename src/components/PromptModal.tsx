import React, { useState } from 'react';
import { Copy, Check, X, Sparkles } from 'lucide-react';

interface PromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  promptText: string;
}

export const PromptModal: React.FC<PromptModalProps> = ({ isOpen, onClose, promptText }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-purple-200 overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 via-pink-50 to-white">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Salin Prompt AI Terstruktur</h3>
              <p className="text-xs text-slate-500">Gunakan di ChatGPT, Gemini Web, atau Claude</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50/50">
          <div className="mb-3 text-xs text-slate-600 bg-purple-50/70 p-3 rounded-lg border border-purple-100">
            Prompt ini sudah disesuaikan secara otomatis dengan jenis dokumen, klaster ILP, dan data master faskes yang Anda tentukan. Cukup salin dan tempelkan ke ruang obrolan AI Anda.
          </div>
          <pre className="text-xs text-slate-800 font-mono whitespace-pre-wrap bg-white p-4 rounded-xl border border-slate-200 shadow-inner select-all leading-relaxed">
            {promptText}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {promptText.length} karakter
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Tutup
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 rounded-lg shadow-sm shadow-purple-500/20 transition-all active:scale-95"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Berhasil Disalin!' : 'Salin ke Clipboard'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
