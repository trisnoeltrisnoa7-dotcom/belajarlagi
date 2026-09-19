import React, { useState } from 'react';
import { X, Target, Check, Plus, School, Award, Sparkles } from 'lucide-react';
import { PtnTarget } from '../types';
import { POPULAR_PTN_TARGETS } from '../data/mockPtn';

interface TargetPtnModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTargets: PtnTarget[];
  onSaveTargets: (targets: PtnTarget[]) => void;
}

export const TargetPtnModal: React.FC<TargetPtnModalProps> = ({
  isOpen,
  onClose,
  selectedTargets,
  onSaveTargets,
}) => {
  const [currentSelected, setCurrentSelected] = useState<PtnTarget[]>(selectedTargets);
  const [filterCategory, setFilterCategory] = useState<'ALL' | 'SAINTEK' | 'SOSHUM'>('ALL');
  const [customPtnName, setCustomPtnName] = useState('');
  const [customMajorName, setCustomMajorName] = useState('');
  const [customScore, setCustomScore] = useState('680');
  const [isAddingCustom, setIsAddingCustom] = useState(false);

  if (!isOpen) return null;

  const toggleTarget = (target: PtnTarget) => {
    const isAlready = currentSelected.some(t => t.id === target.id);
    if (isAlready) {
      setCurrentSelected(currentSelected.filter(t => t.id !== target.id));
    } else {
      if (currentSelected.length >= 3) {
        // Replace the last one
        setCurrentSelected([...currentSelected.slice(0, 2), target]);
      } else {
        setCurrentSelected([...currentSelected, target]);
      }
    }
  };

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customPtnName.trim() || !customMajorName.trim()) return;

    const newTarget: PtnTarget = {
      id: `custom-${Date.now()}`,
      ptnName: customPtnName.trim(),
      majorName: customMajorName.trim(),
      city: 'Indonesia',
      passingScoreEstimate: Math.max(300, Math.min(900, Number(customScore) || 680)),
      category: 'CAMPURAN',
      quota: 80,
      competitiveness: 'Kustom Mandiri',
    };

    setCurrentSelected([...currentSelected, newTarget]);
    setCustomPtnName('');
    setCustomMajorName('');
    setIsAddingCustom(false);
  };

  const filteredTargets = POPULAR_PTN_TARGETS.filter(t => {
    if (filterCategory === 'ALL') return true;
    return t.category === filterCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div
        id="target-ptn-modal-content"
        className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">Pilih Target PTN & Program Studi</h3>
              <p className="text-xs text-slate-400">
                Pilih hingga 3 program studi impian untuk simulasi peluang kelulusan nilai UTBK
              </p>
            </div>
          </div>
          <button
            id="btn-close-target-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Badges Bar */}
        <div className="px-6 py-3 bg-slate-950/60 border-b border-slate-800 flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Pilihan Anda ({currentSelected.length}/3):
          </span>
          {currentSelected.length === 0 ? (
            <span className="text-xs text-slate-500 italic">Belum ada pilihan dipilih</span>
          ) : (
            currentSelected.map((t, idx) => (
              <span
                key={t.id}
                className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-medium"
              >
                <span>
                  #{idx + 1} {t.ptnName} - {t.majorName} (Target: {t.passingScoreEstimate})
                </span>
                <button
                  onClick={() => toggleTarget(t)}
                  className="hover:text-white ml-1 text-rose-400"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))
          )}
        </div>

        {/* Category Tabs */}
        <div className="px-6 pt-3 flex items-center justify-between">
          <div className="flex space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            {(['ALL', 'SAINTEK', 'SOSHUM'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  filterCategory === cat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {cat === 'ALL' ? 'Semua Kategori' : cat}
              </button>
            ))}
          </div>

          <button
            id="btn-toggle-add-custom"
            onClick={() => setIsAddingCustom(!isAddingCustom)}
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{isAddingCustom ? 'Tutup Form Kustom' : '+ Tambah Jurusan Lain'}</span>
          </button>
        </div>

        {/* Custom Input Box if toggled */}
        {isAddingCustom && (
          <form
            onSubmit={handleAddCustom}
            className="mx-6 my-3 p-4 rounded-xl bg-slate-800/80 border border-indigo-500/30 space-y-3"
          >
            <h4 className="text-xs font-semibold text-indigo-300 flex items-center space-x-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Input Target PTN Kustom</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                placeholder="Nama Universitas (misal: UNHAS)"
                value={customPtnName}
                onChange={e => setCustomPtnName(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
              <input
                type="text"
                placeholder="Nama Jurusan (misal: Teknik Sipil)"
                value={customMajorName}
                onChange={e => setCustomMajorName(e.target.value)}
                className="px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                required
              />
              <div className="flex space-x-2">
                <input
                  type="number"
                  placeholder="Passing Target (200-1000)"
                  value={customScore}
                  onChange={e => setCustomScore(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shrink-0"
                >
                  Tambah
                </button>
              </div>
            </div>
          </form>
        )}

        {/* List of Popular PTNs */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-2">
          {filteredTargets.map(target => {
            const isSelected = currentSelected.some(t => t.id === target.id);
            return (
              <div
                key={target.id}
                id={`target-item-${target.id}`}
                onClick={() => toggleTarget(target)}
                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-rose-950/30 border-rose-500/50 shadow-md shadow-rose-950/20'
                    : 'bg-slate-800/40 hover:bg-slate-800 border-slate-700/60'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                      isSelected
                        ? 'bg-rose-600 text-white'
                        : 'bg-slate-700/80 text-slate-300'
                    }`}
                  >
                    <School className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-sm text-white">{target.majorName}</h4>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-300">
                        {target.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {target.ptnName} • {target.city}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <span className="text-xs text-slate-400 block">Est. Skor Lulus</span>
                    <span className="font-bold text-sm text-amber-400">
                      {target.passingScoreEstimate}+
                    </span>
                  </div>
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center border ${
                      isSelected
                        ? 'bg-rose-600 border-rose-500 text-white'
                        : 'border-slate-600 text-transparent'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <p className="text-xs text-slate-400">
            Passing score dihitung otomatis berdasarkan data persaingan SNBT nasional.
          </p>
          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Batal
            </button>
            <button
              id="btn-save-target-ptn"
              onClick={() => {
                onSaveTargets(currentSelected);
                onClose();
              }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-900/30 transition-all"
            >
              Simpan Target
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
