import React, { useState, useRef, useEffect } from 'react';
import { Download, FileText, FileSpreadsheet, FileCode, ChevronDown, Check } from 'lucide-react';
import { ExamPackage, Question } from '../types';
import {
  downloadPackageAsTxt,
  downloadPackageAsExcel,
  downloadPackageAsDocx,
} from '../utils/examExportUtils';

interface PackageDownloadDropdownProps {
  pkg?: ExamPackage;
  questions?: Question[];
  title?: string;
  buttonLabel?: string;
  variant?: 'default' | 'compact' | 'ghost' | 'primary';
  className?: string;
  schoolName?: string;
}

export const PackageDownloadDropdown: React.FC<PackageDownloadDropdownProps> = ({
  pkg,
  questions,
  title,
  buttonLabel = 'Download Soal',
  variant = 'default',
  className = '',
  schoolName,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Construct target package if questions passed directly
  const targetPackage: ExamPackage = pkg || {
    id: `custom-pkg-${Date.now()}`,
    title: title || 'Paket Butir Soal CBT',
    badge: 'BANK SOAL',
    tagline: 'Kumpulan Soal CBT',
    category: 'FULL',
    durationMinutes: 30,
    totalQuestions: questions?.length || 0,
    questions: questions || [],
    subtests: [],
  };

  const handleDownloadTxt = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadPackageAsTxt(targetPackage, schoolName);
    setDownloadSuccess('TXT');
    setTimeout(() => {
      setDownloadSuccess(null);
      setIsOpen(false);
    }, 800);
  };

  const handleDownloadExcel = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadPackageAsExcel(targetPackage, schoolName);
    setDownloadSuccess('EXCEL');
    setTimeout(() => {
      setDownloadSuccess(null);
      setIsOpen(false);
    }, 800);
  };

  const handleDownloadDocx = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadPackageAsDocx(targetPackage, schoolName);
    setDownloadSuccess('DOCX');
    setTimeout(() => {
      setDownloadSuccess(null);
      setIsOpen(false);
    }, 800);
  };

  const getButtonStyles = () => {
    switch (variant) {
      case 'compact':
        return 'px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold';
      case 'ghost':
        return 'px-3 py-1.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/50 text-xs font-medium';
      case 'primary':
        return 'px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md shadow-indigo-950/40';
      case 'default':
      default:
        return 'flex-1 flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-xl bg-slate-800/90 hover:bg-slate-750 text-slate-200 hover:text-white text-xs font-semibold border border-slate-700/70 transition-all';
    }
  };

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      <button
        type="button"
        id={`btn-download-pkg-${targetPackage.id}`}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        className={`${getButtonStyles()} cursor-pointer transition-all duration-150 active:scale-95 flex items-center justify-between gap-1`}
        title="Download Paket Soal dalam format TXT, Excel, atau Word"
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Download className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate">{buttonLabel}</span>
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-cyan-400' : ''
          }`}
        />
      </button>

      {/* Droplist Menu */}
      {isOpen && (
        <div
          className="absolute right-0 bottom-full mb-1.5 sm:bottom-auto sm:top-full sm:mt-1.5 w-60 bg-slate-900/95 backdrop-blur-md border border-slate-700/90 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150 p-1.5 space-y-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-1.5 border-b border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Pilih Format Unduhan Soal:
            </span>
          </div>

          {/* TXT Option */}
          <button
            type="button"
            id={`download-txt-${targetPackage.id}`}
            onClick={handleDownloadTxt}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-indigo-950/60 hover:text-indigo-200 transition-colors group cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-indigo-600/30 text-slate-300 group-hover:text-indigo-300 border border-slate-700/60 transition-colors">
                <FileText className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <span className="font-semibold text-white block">File Teks (.txt)</span>
                <span className="text-[10px] text-slate-400 block">Plain text, soal & pembahasan</span>
              </div>
            </div>
            {downloadSuccess === 'TXT' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          </button>

          {/* Excel / CSV Option */}
          <button
            type="button"
            id={`download-excel-${targetPackage.id}`}
            onClick={handleDownloadExcel}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-emerald-950/60 hover:text-emerald-200 transition-colors group cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-emerald-600/30 text-slate-300 group-hover:text-emerald-300 border border-slate-700/60 transition-colors">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="font-semibold text-white block">File Excel (.csv / .xls)</span>
                <span className="text-[10px] text-slate-400 block">Tabel kolom siap olah nilai</span>
              </div>
            </div>
            {downloadSuccess === 'EXCEL' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          </button>

          {/* Word / DOCX Option */}
          <button
            type="button"
            id={`download-docx-${targetPackage.id}`}
            onClick={handleDownloadDocx}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-left text-xs text-slate-200 hover:bg-blue-950/60 hover:text-blue-200 transition-colors group cursor-pointer"
          >
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 rounded-lg bg-slate-800 group-hover:bg-blue-600/30 text-slate-300 group-hover:text-blue-300 border border-slate-700/60 transition-colors">
                <FileCode className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="font-semibold text-white block">File Word (.doc / .docx)</span>
                <span className="text-[10px] text-slate-400 block">Naskah ujian rapi + Kop resmi</span>
              </div>
            </div>
            {downloadSuccess === 'DOCX' && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
          </button>
        </div>
      )}
    </div>
  );
};
