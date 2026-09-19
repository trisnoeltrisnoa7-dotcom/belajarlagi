import React from 'react';
import { Sparkles, Edit3, Building2, MapPin, Award, Printer } from 'lucide-react';
import { SchoolInfo } from '../types';
import { SchoolLogoBadge } from './SchoolLogoBadge';

interface SchoolKopHeaderProps {
  schoolInfo: SchoolInfo;
  documentTitle?: string;
  subTitle?: string;
  variant?: 'full' | 'compact' | 'minimal' | 'print';
  showEditButton?: boolean;
  onEditKop?: () => void;
  onPrint?: () => void;
  className?: string;
}

export const SchoolKopHeader: React.FC<SchoolKopHeaderProps> = ({
  schoolInfo,
  documentTitle,
  subTitle,
  variant = 'full',
  showEditButton = false,
  onEditKop,
  onPrint,
  className = '',
}) => {
  // Compact Variant (Used in Student Gate, CBT Navigation, Modal Cards)
  if (variant === 'compact') {
    return (
      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-500/30 p-3.5 sm:p-4.5 shadow-lg max-w-full ${className}`}
      >
        <div className="flex items-center justify-between gap-3 min-w-0">
          <div className="flex items-center gap-3 min-w-0 flex-1 overflow-hidden">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-slate-800/90 p-1.5 border border-amber-400/40 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
              <SchoolLogoBadge logoUrl={schoolInfo.schoolLogo} className="w-full h-full object-contain" />
            </div>
            <div className="min-w-0 flex-1 overflow-hidden">
              <h2 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-tight truncate block" title={schoolInfo.schoolName}>
                {schoolInfo.schoolName}
              </h2>
              <p className="text-[11px] text-slate-300 truncate block leading-tight mt-0.5" title={schoolInfo.schoolAddress}>
                {schoolInfo.schoolAddress}
              </p>
              <div className="flex items-center gap-2 mt-1 text-[10px] text-amber-300 font-semibold overflow-hidden flex-wrap">
                {schoolInfo.schoolNpsn && <span className="truncate max-w-[150px]">{schoolInfo.schoolNpsn}</span>}
                {schoolInfo.schoolNpsn && schoolInfo.academicYear && <span>•</span>}
                {schoolInfo.academicYear && <span className="truncate max-w-[150px]">{schoolInfo.academicYear}</span>}
              </div>
            </div>
          </div>

          {((showEditButton && onEditKop) || onPrint) && (
            <div className="shrink-0 flex items-center rounded-xl bg-slate-800/90 p-0.5 border border-slate-700/80 shadow-md touch-manipulation">
              {showEditButton && onEditKop && (
                <button
                  type="button"
                  id="btn-edit-kop-compact"
                  onClick={onEditKop}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-indigo-600/30 text-indigo-300 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Ubah Kop & Identitas Sekolah"
                  aria-label="Ubah Kop Sekolah"
                >
                  <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
              {showEditButton && onEditKop && onPrint && (
                <div className="w-px h-4 bg-slate-700 mx-0.5" />
              )}
              {onPrint && (
                <button
                  type="button"
                  id="btn-print-kop-compact"
                  onClick={onPrint}
                  className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-blue-600/30 text-blue-300 hover:text-white transition-all active:scale-95 cursor-pointer flex items-center justify-center"
                  title="Cetak Dokumen / PDF"
                  aria-label="Cetak Dokumen (PDF)"
                >
                  <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Minimal Variant (Single line)
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2.5 min-w-0 overflow-hidden max-w-full ${className}`}>
        <div className="w-8 h-8 rounded-lg bg-slate-800 p-1 border border-amber-400/30 shrink-0 flex items-center justify-center overflow-hidden">
          <SchoolLogoBadge logoUrl={schoolInfo.schoolLogo} className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p className="text-xs font-black text-white uppercase tracking-tight truncate block" title={schoolInfo.schoolName}>
            {schoolInfo.schoolName}
          </p>
          <p className="text-[10px] text-slate-400 truncate block" title={schoolInfo.schoolAddress}>
            {schoolInfo.schoolAddress}
          </p>
        </div>
      </div>
    );
  }

  // Full & Print Variant: Official Centered Indonesian Letterhead (KOP SURAT RESMI SEKOLAH)
  return (
    <div
      id="school-official-kop-header"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-indigo-900/50 shadow-xl p-4 sm:p-6 md:p-7 text-center transition-all max-w-full print:bg-white print:text-black print:border-black print:p-3 print:shadow-none ${className}`}
    >
      {/* Glow effect */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-indigo-600/10 blur-3xl pointer-events-none print:hidden" />

      {/* Edit & Print buttons in top right if requested */}
      {((showEditButton && onEditKop) || onPrint) && (
        <div className="sm:absolute sm:top-4 sm:right-4 z-10 mb-3 sm:mb-0 flex justify-end print:hidden">
          <div className="flex items-center rounded-xl bg-slate-900/90 p-0.5 sm:p-1 border border-slate-700/80 shadow-md backdrop-blur-md touch-manipulation">
            {showEditButton && onEditKop && (
              <button
                id="btn-edit-kop-header-official"
                type="button"
                onClick={onEditKop}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center"
                title="Ubah Kop, Alamat, Logo, dan Identitas Sekolah"
                aria-label="Ubah Kop Sekolah"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>
            )}
            {showEditButton && onEditKop && onPrint && (
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
            )}
            {onPrint && (
              <button
                id="btn-print-kop-header-official"
                type="button"
                onClick={onPrint}
                className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 transition-all active:scale-95 cursor-pointer shrink-0 flex items-center justify-center"
                title="Cetak Dokumen / PDF"
                aria-label="Cetak PDF"
              >
                <Printer className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className="relative max-w-4xl mx-auto flex flex-col items-center justify-center space-y-2.5 sm:space-y-3 overflow-hidden min-w-0 w-full">
        {/* Centered Logo Badge */}
        <div className="flex items-center justify-center shrink-0">
          <div className="w-14 h-14 sm:w-18 sm:h-18 md:w-20 md:h-20 rounded-2xl bg-slate-800/90 p-2 border-2 border-amber-400/50 shadow-lg shadow-indigo-950/60 flex items-center justify-center transform hover:scale-105 transition-transform overflow-hidden print:bg-transparent print:border-black print:w-16 print:h-16">
            <SchoolLogoBadge logoUrl={schoolInfo.schoolLogo} className="w-full h-full object-contain" />
          </div>
        </div>

        {/* Centered School Name & Address */}
        <div className="space-y-1 w-full overflow-hidden min-w-0 px-2">
          <h1
            className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-white uppercase print:text-black leading-tight break-words text-truncate-2 sm:text-truncate-1"
            title={schoolInfo.schoolName}
          >
            {schoolInfo.schoolName}
          </h1>

          <p
            className="text-xs sm:text-sm text-slate-300 font-medium max-w-3xl mx-auto leading-relaxed print:text-gray-900 break-words text-truncate-2"
            title={schoolInfo.schoolAddress}
          >
            {schoolInfo.schoolAddress}
          </p>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:text-xs text-indigo-300 font-semibold print:text-gray-800 overflow-hidden">
            {schoolInfo.schoolNpsn && <span className="truncate max-w-[200px]">{schoolInfo.schoolNpsn}</span>}
            {schoolInfo.schoolPhone && <span className="truncate max-w-[200px]">• Telp: {schoolInfo.schoolPhone}</span>}
            {schoolInfo.schoolWebsite && <span className="truncate max-w-[220px]">• Web: {schoolInfo.schoolWebsite}</span>}
          </div>
        </div>

        {/* Document Title Banner if provided */}
        {documentTitle && (
          <div className="pt-1 sm:pt-2 w-full max-w-full overflow-hidden min-w-0">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 text-indigo-200 border border-indigo-500/40 text-xs sm:text-sm font-black uppercase tracking-wider max-w-full overflow-hidden print:bg-transparent print:border-black print:text-black">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 print:hidden" />
              <span className="truncate max-w-full block">{documentTitle}</span>
            </div>
            {subTitle && (
              <p className="text-xs text-slate-400 font-semibold mt-1 print:text-gray-700 truncate max-w-full block">
                {subTitle}
              </p>
            )}
          </div>
        )}

        {/* Official Indonesian Standard Double Line Separator (Garis Ganda Kop Surat) */}
        <div className="w-full pt-1.5 sm:pt-2">
          <div className="w-full h-1 bg-indigo-500/80 rounded-full print:bg-black" />
          <div className="w-full h-0.5 bg-indigo-400/40 rounded-full mt-1 print:bg-black" />
        </div>
      </div>
    </div>
  );
};
