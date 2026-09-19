import React, { useState } from 'react';
import {
  GraduationCap,
  BookOpen,
  Layers,
  BarChart2,
  Settings,
  ChevronUp,
  ChevronDown,
  Cloud,
  Users,
  Maximize2,
  Minimize2,
  Compass,
  X,
  Bell,
  KeyRound,
  Calendar,
  HelpCircle,
  Sliders,
} from 'lucide-react';

interface DashboardBottomMenuProps {
  collapsedSections: {
    sectionA: boolean;
    sectionD: boolean;
    sectionE: boolean;
  };
  onNavigateToSection: (sectionKey: 'sectionA'  | 'sectionD' | 'sectionE') => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  onNavigateToGoogleDrive?: () => void;
  onOpenNisSettings?: () => void;
  onNavigateToLockedStatus?: () => void;
  onNavigateToScheduleList?: () => void;
  onNavigateToScheduleManagement?: () => void;
  onOpenHelpModal?: () => void;
  onNavigateToLayoutEditor?: () => void;
  onOpenCentralSubjectClass?: () => void;
  position?: 'left' | 'center' | 'right' | 'hidden';
}

export const DashboardBottomMenu: React.FC<DashboardBottomMenuProps> = ({
  collapsedSections,
  onNavigateToSection,
  onExpandAll,
  onCollapseAll,
  onNavigateToGoogleDrive,
  onOpenNisSettings,
  onNavigateToLockedStatus,
  onNavigateToScheduleList,
  onNavigateToScheduleManagement,
  onOpenHelpModal,
  onNavigateToLayoutEditor,
  onOpenCentralSubjectClass,
  position = 'left',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (position === 'hidden') return null;

  const positionClass =
    position === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : position === 'right'
      ? 'right-2 sm:right-6 left-auto'
      : 'left-2 sm:left-6';

  const navItems: Array<{
    key: 'sectionA'  | 'sectionD' | 'sectionE';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    color: string;
    badgeColor: string;
  }> = [
    {
      key: 'sectionA',
      label: 'Ujian',
      icon: GraduationCap,
      color: 'text-indigo-400',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    {
      key: 'sectionD',
      label: 'Riwayat',
      icon: Bell,
      color: 'text-emerald-400',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      key: 'sectionE',
      label: 'Pengaturan',
      icon: Settings,
      color: 'text-purple-400',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
  ];

  const handleItemClick = (key: 'sectionA'  | 'sectionD' | 'sectionE') => {
    setActiveSection(key);
    onNavigateToSection(key);
    setTimeout(() => {
      setActiveSection(null);
    }, 2000);
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div
      id="floating-dashboard-navigation"
      className={`fixed bottom-3 sm:bottom-4 ${positionClass} z-40 max-w-[calc(100vw-1rem)] sm:max-w-fit transition-all duration-300 touch-manipulation`}
    >
      <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl shadow-2xl shadow-slate-950/80 p-1.5 sm:p-2.5 flex items-center gap-1.5 sm:gap-2 overflow-hidden">
        {/* Toggle Collapse Button for Mobile / Minimized View */}
        <button
          type="button"
          id="btn-toggle-floating-nav"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
          title={isExpanded ? 'Sembunyikan Navigasi' : 'Tampilkan Navigasi'}
          aria-label="Toggle Floating Menu"
        >
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-indigo-400" />
          ) : (
            <Compass className="w-4 h-4 text-indigo-400 animate-pulse" />
          )}
        </button>

        {isExpanded && (
          <>
            <div className="h-6 w-px bg-slate-800 shrink-0" />

            {/* Navigation Buttons - Uniform Height, Min-Width, and Shape */}
            <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 scroll-smooth touch-pan-x">
              {navItems.map(item => {
                const Icon = item.icon;
                const isCollapsed = collapsedSections[item.key];
                const isActive = activeSection === item.key;

                return (
                  <button
                    key={item.key}
                    type="button"
                    id={`floating-nav-btn-${item.key}`}
                    onClick={() => handleItemClick(item.key)}
                    className={`flex items-center justify-center gap-1.5 px-2.5 sm:px-3 h-8.5 sm:h-10 min-w-[105px] sm:min-w-[130px] rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap active:scale-95 border ${
                      isActive
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-950/60 ring-1 ring-indigo-400 border-indigo-400'
                        : !isCollapsed
                        ? 'bg-slate-800 hover:bg-slate-750 text-white border-slate-700'
                        : 'bg-slate-850/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                    title={`Lompat ke ${item.label}`}
                  >
                    <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0 ${item.color}`} />
                    <span className="text-[11px] sm:text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="h-6 w-px bg-slate-800 shrink-0 hidden sm:block" />

            {/* Secondary Actions - Uniform Square Dimensions */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {(onNavigateToScheduleManagement || onNavigateToScheduleList) && (
                <button
                  type="button"
                  id="floating-nav-schedule-btn"
                  onClick={() => {
                    if (onNavigateToScheduleManagement) {
                      onNavigateToScheduleManagement();
                    } else if (onNavigateToScheduleList) {
                      onNavigateToScheduleList();
                    }
                  }}
                  className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                  title="Manajemen Jadwal Ujian (Mode Guru & Pengawas)"
                  aria-label="Manajemen Jadwal Ujian"
                >
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {onNavigateToGoogleDrive && (
                <button
                  type="button"
                  id="floating-nav-drive-btn"
                  onClick={onNavigateToGoogleDrive}
                  className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                  title="Sinkronisasi Google Drive"
                >
                  <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {onNavigateToLockedStatus && (
                <button
                  type="button"
                  id="floating-nav-locked-btn"
                  onClick={onNavigateToLockedStatus}
                  className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                  title="Status Terkunci & Buka Kunci Peserta"
                >
                  <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {onOpenNisSettings && (
                <button
                  type="button"
                  id="floating-nav-nis-btn"
                  onClick={onOpenNisSettings}
                  className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-emerald-400 hover:text-emerald-300 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                  title="Database Siswa & NIS"
                >
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {onOpenCentralSubjectClass && (
                <button
                  type="button"
                  id="floating-nav-central-mapel-btn"
                  onClick={onOpenCentralSubjectClass}
                  className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-cyan-400 hover:text-cyan-300 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                  title="Master Mata Pelajaran & Kelas Tersinkronisasi"
                >
                  <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {onOpenHelpModal && (
                <button
                  type="button"
                  id="floating-nav-help-btn"
                  onClick={onOpenHelpModal}
                  className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-amber-400 hover:text-amber-300 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                  title="Buku Panduan & Keterangan Singkat Setiap Tombol"
                >
                  <HelpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              {onNavigateToLayoutEditor && (
                <button
                  type="button"
                  id="floating-nav-layout-editor-btn"
                  onClick={onNavigateToLayoutEditor}
                  className="w-8.5 h-8.5 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 border border-slate-700/60 transition-all active:scale-95 cursor-pointer flex items-center justify-center shrink-0"
                  title="Kustomisasi Tata Letak & Flowchart Arsitektur"
                >
                  <Sliders className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </button>
              )}

              <button
                type="button"
                id="floating-nav-expand-btn"
                onClick={onExpandAll}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer hidden md:flex items-center justify-center shrink-0"
                title="Buka Semua Modul"
              >
                <Maximize2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="floating-nav-collapse-btn"
                onClick={onCollapseAll}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white border border-slate-700/60 transition-all cursor-pointer hidden md:flex items-center justify-center shrink-0"
                title="Tutup Semua Modul"
              >
                <Minimize2 className="w-4 h-4" />
              </button>

              <button
                type="button"
                id="floating-nav-scroll-top-btn"
                onClick={scrollToTop}
                className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-indigo-400 hover:text-indigo-300 border border-slate-700/60 transition-all cursor-pointer flex items-center justify-center shrink-0"
                title="Kembali ke Atas"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
