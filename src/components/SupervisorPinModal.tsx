import React, { useState, useRef, useEffect } from 'react';
import { Lock, X, Check, Eye, EyeOff, AlertCircle } from 'lucide-react';

export interface SupervisorPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  targetPin?: string;
  isEnabled?: boolean;
  title?: string;
  description?: string;
  onToggleDisablePin?: (disabled: boolean) => void;
}

export const SupervisorPinModal: React.FC<SupervisorPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  targetPin = '1234',
  isEnabled = true,
  title = 'PIN Mode Guru',
  onToggleDisablePin,
}) => {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isShaking, setIsShaking] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      if (isEnabled === false) {
        onSuccess();
        onClose();
        return;
      }
      setPin('');
      setErrorMsg('');
      setIsShaking(false);
      setIsDisabling(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, isEnabled]);

  if (!isOpen) return null;

  const handleVerify = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pin.trim();
    const correctPin = (targetPin || '1234').trim();

    if (!cleanPin) {
      setErrorMsg('Masukkan PIN');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      return;
    }

    if (cleanPin === correctPin) {
      setErrorMsg('');
      if (isDisabling && onToggleDisablePin) {
        onToggleDisablePin(false);
      }
      onSuccess();
      onClose();
    } else {
      setErrorMsg('PIN salah, silakan coba lagi');
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
      setPin('');
      inputRef.current?.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        id="supervisor-pin-modal-card"
        className={`w-full max-w-[320px] rounded-2xl bg-slate-900 border ${
          isShaking
            ? 'border-rose-500 shadow-2xl shadow-rose-950/70 translate-x-[-4px]'
            : 'border-slate-800 shadow-2xl shadow-indigo-950/40'
        } p-5 relative transition-all duration-200`}
      >
        {/* Header minimal */}
        <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-800/80">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Lock className="w-3.5 h-3.5" />
            </div>
            <h3 className="font-bold text-white text-sm">
              {isDisabling ? 'Konfirmasi Nonaktifkan PIN' : title}
            </h3>
          </div>
          <button
            type="button"
            id="btn-close-pin-modal"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form PIN Sederhana */}
        <form onSubmit={handleVerify} className="space-y-3">
          <div className="relative">
            <input
              ref={inputRef}
              id="input-supervisor-pin"
              type={showPin ? 'text' : 'password'}
              inputMode="numeric"
              autoFocus
              maxLength={12}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Masukkan PIN"
              className="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-950 border border-slate-700/80 text-center font-mono text-lg tracking-widest text-white placeholder:tracking-normal placeholder:text-slate-500 placeholder:text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              tabIndex={-1}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
              title={showPin ? 'Sembunyikan PIN' : 'Tampilkan PIN'}
            >
              {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 bg-rose-950/40 border border-rose-800/40 rounded-lg py-1.5 px-2.5 animate-in fade-in">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              id="btn-submit-pin"
              className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow flex items-center justify-center gap-1.5 ${
                isDisabling
                  ? 'bg-rose-600 hover:bg-rose-500 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-950/50'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isDisabling ? 'Nonaktifkan' : 'Masuk'}</span>
            </button>
          </div>

          {/* Opsi Nonaktifkan Akses PIN */}
          {onToggleDisablePin && (
            <div className="pt-2 text-center border-t border-slate-800/60">
              <button
                type="button"
                id="btn-toggle-disable-pin-modal"
                onClick={() => {
                  setIsDisabling(!isDisabling);
                  setErrorMsg('');
                  setPin('');
                  inputRef.current?.focus();
                }}
                className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors cursor-pointer underline"
              >
                {isDisabling ? '← Batal, Tetap Gunakan PIN' : 'Nonaktifkan Proteksi PIN Guru'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
