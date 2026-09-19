import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  X,
  Search,
  LayoutDashboard,
  Calendar,
  BookOpen,
  PlusCircle,
  BarChart2,
  Users,
  KeyRound,
  ShieldCheck,
  Building2,
  Printer,
  Share2,
  Sparkles,
  Palette,
  HardDrive,
  Cloud,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Settings,
  ChevronRight,
  Filter,
  FileSpreadsheet,
  Folder,
  Volume2,
  Type,
  Flag,
  ArrowRight,
  Globe,
} from 'lucide-react';

interface HelpGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: string;
}

interface HelpItem {
  id: string;
  name: string;
  category: 'header' | 'schedule' | 'exam' | 'admin' | 'bank';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  iconBg: string;
  badge?: string;
  shortDesc: string;
  detailDesc: string;
  tips?: string;
}

const HELP_CATEGORIES = [
  { id: 'all', label: 'Semua Tombol', icon: HelpCircle, color: 'text-indigo-400' },
  { id: 'header', label: 'Header & Navigasi', icon: LayoutDashboard, color: 'text-blue-400' },
  { id: 'schedule', label: 'Jadwal Ujianku', icon: Calendar, color: 'text-amber-400' },
  { id: 'exam', label: 'Ruang Ujian Siswa', icon: BookOpen, color: 'text-emerald-400' },
  { id: 'admin', label: 'Admin & Keamanan', icon: KeyRound, color: 'text-purple-400' },
  { id: 'bank', label: 'Bank Soal & Nilai', icon: PlusCircle, color: 'text-teal-400' },
];

const HELP_ITEMS: HelpItem[] = [
  // Header & Navigasi
  {
    id: 'btn-header-dashboard',
    name: 'Dashboard Utama',
    category: 'header',
    icon: LayoutDashboard,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20 border-indigo-500/30',
    shortDesc: 'Kembali ke beranda utama sistem CBT.',
    detailDesc: 'Menampilkan ringkasan menyeluruh aplikasi: modul KUMPULAN MAPEL, akses cepat Jadwal Ujian, riwayat pengerjaan, dan statistik umum ujian.',
    tips: 'Gunakan tombol icon dashboard di header ini kapan saja untuk kembali ke beranda utama.',
  },
  {
    id: 'btn-header-exam-schedule',
    name: 'Jadwal Ujianku (Header)',
    category: 'header',
    icon: Calendar,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    badge: 'Akses Cepat',
    shortDesc: 'Akses langsung daftar Jadwal Ujian resmi dari header.',
    detailDesc: 'Menuju daftar jadwal mata pelajaran ujian, status link dibuka/ditutup, jam ujian, token, dan kartu login peserta CBT.',
    tips: 'Klik icon kalender di header dashboard untuk langsung membuka jadwal ujian.',
  },
  {
    id: 'btn-header-offline',
    name: 'Mode Latihan Offline (PWA)',
    category: 'header',
    icon: HardDrive,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    badge: 'Tanpa Kuota',
    shortDesc: 'Mengerjakan bank soal yang tersimpan lokal tanpa internet.',
    detailDesc: 'Memungkinkan siswa tetap dapat mengerjakan latihan soal meskipun koneksi internet terputus atau di ruang kelas tanpa WiFi.',
    tips: 'Guru atau siswa dapat mengunduh paket soal ke memori perangkat terlebih dahulu saat online.',
  },
  {
    id: 'btn-header-menu',
    name: 'Menu & Navigasi Terpadu',
    category: 'header',
    icon: Settings,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20 border-indigo-500/30',
    shortDesc: 'Membuka seluruh menu fitur dan pengaturan sistem.',
    detailDesc: 'Pusat navigasi cepat menuju Jadwal Ujian, Database Siswa NIS, Bank Soal, Google Drive, AI Drill, Pengaturan Kop, Status Terkunci, dan Logout.',
    tips: 'Terdapat tanda titik notifikasi hijau jika ada siswa yang baru saja selesai mengumpulkan ujian.',
  },
  {
    id: 'btn-header-target-ptn',
    name: 'Target PTN & Jurusan',
    category: 'header',
    icon: Sparkles,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/20 border-rose-500/30',
    badge: 'Simulasi UTBK',
    shortDesc: 'Memilih target PTN impian untuk simulasi passing grade.',
    detailDesc: 'Menentukan program studi dan universitas tujuan (misal: ITB, UI, UGM, Unpad) agar sistem menghitung peluang lolos otomatis berdasarkan skor ujian.',
  },
  {
    id: 'btn-header-notif-siswa',
    name: 'Status Siswa Ujian (Notifikasi)',
    category: 'header',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    shortDesc: 'Melihat rekap langsung siswa yang telah mengumpulkan lembar jawaban.',
    detailDesc: 'Daftar nama siswa, NIS, kelas, mata pelajaran, dan skor yang baru saja masuk ke sistem secara real-time.',
  },

  // Jadwal Ujian (Exam Schedule)
  {
    id: 'btn-role-switch',
    name: 'Beralih Mode Siswa / Mode Guru',
    category: 'schedule',
    icon: ShieldCheck,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    badge: 'Keamanan Ujian',
    shortDesc: 'Mengunci antarmuka untuk siswa atau membuka kendali Guru/Admin.',
    detailDesc: 'Dalam Mode Siswa: tombol edit, token, dan fitur admin disembunyikan demi integritas ujian. Dalam Mode Guru: seluruh kontrol pengelolaan aktif.',
    tips: 'Bisa dipasangi PIN Pengawas agar siswa tidak bisa sembarangan beralih ke Mode Admin.',
  },
  {
    id: 'btn-theme-picker',
    name: 'Ganti Tema Warna Siswa (Palette)',
    category: 'schedule',
    icon: Palette,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20 border-indigo-500/30',
    badge: '4 Tema Visual',
    shortDesc: 'Memilih gaya warna tampilan (Standar Gelap atau 3 Pilihan Putih).',
    detailDesc: 'Menyediakan 4 pilihan estetika: 1) Standar Gelap Cyber CBT, 2) Putih Bersih Minimalis, 3) Putih Biru Akademik, dan 4) Putih Zamrud Segar.',
    tips: 'Pilihan tema otomatis tersimpan di peramban dan nyaman digunakan baik di layar proyektor maupun HP.',
  },
  {
    id: 'btn-table-format-picker',
    name: 'Format Tata Letak Tabel',
    category: 'schedule',
    icon: Filter,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/20 border-sky-500/30',
    shortDesc: 'Mengubah tata letak jadwal sesuai kebutuhan rapat/pengawas.',
    detailDesc: 'Pilihan format: 1) Tabel Standar Resmi, 2) Tampilan Kompak Efisien, 3) Roster Per Hari, dan 4) Format Khusus Pengawas Ruang.',
    tips: 'Gunakan Roster Per Hari untuk melihat pembagian jam ujian Senin hingga Jumat secara terstruktur.',
  },
  {
    id: 'btn-auto-import-schedule',
    name: 'Impor Otomatis Jadwal Mapel',
    category: 'schedule',
    icon: Sparkles,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    badge: 'Sekali Klik',
    shortDesc: 'Mengisi jadwal otomatis dari kumpulan paket mapel resmi SMA.',
    detailDesc: 'Menyusun alokasi waktu, sesi, durasi pengerjaan, dan token acak untuk seluruh mata pelajaran MIPA, IPS, Bahasa, dan TPS secara otomatis.',
  },
  {
    id: 'btn-token-access-menu',
    name: 'Kunci Token & Akses Guru (Ikon Kunci)',
    category: 'schedule',
    icon: KeyRound,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    shortDesc: 'Mengatur token ujian, acak token serentak, dan bebas token.',
    detailDesc: 'Pusat kendali autentikasi: acak token 5 digit baru, ubah kebijakan menjadi bebas token (tanpa token), atau sembunyikan mode pengawas dari siswa.',
  },
  {
    id: 'btn-edit-school-kop',
    name: 'Edit Kop Sekolah & Identitas Resmi',
    category: 'schedule',
    icon: Building2,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20 border-indigo-500/30',
    shortDesc: 'Mengubah Nama Sekolah, Alamat, NPSN, dan Logo Dokumen.',
    detailDesc: 'Mengatur identitas resmi kop surat yang akan tercetak di bagian atas lembar jadwal ujian, kartu peserta, dan cetak laporan rekap nilai.',
  },
  {
    id: 'btn-share-schedule',
    name: 'Bagikan Jadwal (Salin Tautan & WA)',
    category: 'schedule',
    icon: Share2,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    shortDesc: 'Menyalin tautan langsung dan format pesan pengumuman WhatsApp.',
    detailDesc: 'Membuat pesan broadcast siap kirim ke grup WhatsApp wali kelas/siswa lengkap dengan tautan langsung dan panduan login siswa.',
  },
  {
    id: 'btn-print-pdf',
    name: 'Cetak PDF / Print Jadwal',
    category: 'schedule',
    icon: Printer,
    iconColor: 'text-blue-400',
    iconBg: 'bg-blue-500/20 border-blue-500/30',
    shortDesc: 'Mencetak jadwal ujian resmi berstandar kertas A4.',
    detailDesc: 'Mengonversi tampilan jadwal ke format cetak bersih hitam-putih dengan garis kop resmi sekolah ganda, siap ditempel di papan pengumuman atau ruang ujian.',
  },
  {
    id: 'btn-lock-filter',
    name: 'Kunci Filter Kelas & Jurusan',
    category: 'schedule',
    icon: Lock,
    iconColor: 'text-rose-400',
    iconBg: 'bg-rose-500/20 border-rose-500/30',
    shortDesc: 'Mengunci pilihan filter kelas/sesi agar tidak diubah siswa.',
    detailDesc: 'Mencegah siswa salah memilih jurusan atau kelas saat mengakses jadwal dari HP/laptop masing-masing.',
  },

  // Ruang Ujian Siswa (CBT)
  {
    id: 'btn-exam-nis-token',
    name: 'Autentikasi NIS & Token Ujian',
    category: 'exam',
    icon: KeyRound,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20 border-indigo-500/30',
    shortDesc: 'Validasi identitas siswa dan token sesi ujian aktif.',
    detailDesc: 'Siswa memasukkan NIS resmi yang terdaftar di database sekolah serta token 5 karakter yang dirilis oleh pengawas ruang.',
  },
  {
    id: 'btn-exam-grid-nav',
    name: 'Nomor Soal & Kisi Navigasi (1..N)',
    category: 'exam',
    icon: LayoutDashboard,
    iconColor: 'text-sky-400',
    iconBg: 'bg-sky-500/20 border-sky-500/30',
    shortDesc: 'Melompat ke nomor soal tertentu dengan indikator warna status.',
    detailDesc: 'Abu-abu: Belum dijawab. Biru: Sudah dijawab. Kuning: Ditandai ragu-ragu. Memudahkan siswa memeriksa kelengkapan jawaban.',
  },
  {
    id: 'btn-exam-doubtful',
    name: 'Tombol Ragu-Ragu (Kuning)',
    category: 'exam',
    icon: Flag,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    shortDesc: 'Menandai butir soal yang masih belum yakin dijawab.',
    detailDesc: 'Nomor soal akan ditandai warna kuning pada kisi navigasi. Jawaban tetap tersimpan namun diberi tanda agar mudah ditinjau ulang.',
  },
  {
    id: 'btn-exam-font-size',
    name: 'Pengatur Ukuran Teks (A- / A / A+)',
    category: 'exam',
    icon: Type,
    iconColor: 'text-purple-400',
    iconBg: 'bg-purple-500/20 border-purple-500/30',
    shortDesc: 'Mengubah ukuran huruf teks soal dan pilihan jawaban.',
    detailDesc: 'Tersedia 3 tingkat ukuran (Kecil, Normal, Besar) untuk kenyamanan membaca bagi siswa berkebutuhan khusus atau layar kecil.',
  },
  {
    id: 'btn-exam-audio-player',
    name: 'Pemutar Audio Listening',
    category: 'exam',
    icon: Volume2,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/20 border-teal-500/30',
    badge: 'Soal Listening',
    shortDesc: 'Memutar rekaman audio soal listening Bahasa Inggris/Indonesia.',
    detailDesc: 'Dilengkapi batas putar audio dan timer jeda agar sesuai standar tes kemampuan mendengarkan resmi.',
  },
  {
    id: 'btn-exam-finish-submit',
    name: 'Tombol Selesaikan Ujian',
    category: 'exam',
    icon: CheckCircle2,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    shortDesc: 'Mengunci dan mengumpulkan seluruh lembar jawaban.',
    detailDesc: 'Akan memunculkan konfirmasi jumlah soal yang telah dijawab, belum dijawab, dan ragu-ragu sebelum dikirim permanen ke sistem.',
  },

  // Admin & Keamanan
  {
    id: 'btn-admin-locked-status',
    name: 'Status Terkunci & Buka Gembok (Reset)',
    category: 'admin',
    icon: Unlock,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    badge: 'Darurat Sesi',
    shortDesc: 'Membuka kunci siswa yang mengalami kendala teknis / ganti HP.',
    detailDesc: 'Jika siswa keluar aplikasi atau gawai mati saat ujian berlangsung, pengawas dapat membuka gembok sesi NIS siswa agar bisa melanjutkan ujian.',
    tips: 'Bisa membuka kunci 1 siswa tertentu atau membuka kunci seluruh siswa serentak dengan tombol Reset Global.',
  },
  {
    id: 'btn-admin-nis-database',
    name: 'Database Siswa & Manajemen NIS',
    category: 'admin',
    icon: Users,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20 border-indigo-500/30',
    shortDesc: 'Mengelola daftar siswa, NIS, kelas, dan jurusan.',
    detailDesc: 'Mendukung impor data siswa banyak sekaligus dari file Excel (.xlsx), penambahan manual, pencarian NIS, dan sinkronisasi ke database cloud.',
  },
  {
    id: 'btn-admin-google-drive',
    name: 'Sinkronisasi Folder Google Drive',
    category: 'admin',
    icon: Folder,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    shortDesc: 'Backup dan restore bank soal langsung ke akun Google Drive.',
    detailDesc: 'Menghubungkan bank soal CBT dengan penyimpanan cloud Google Drive guru agar aman dari kehilangan data peramban.',
  },
  {
    id: 'btn-admin-vercel-unauthorized-domain',
    name: 'Solusi auth/unauthorized-domain di Vercel',
    category: 'admin',
    icon: Globe,
    iconColor: 'text-amber-400',
    iconBg: 'bg-amber-500/20 border-amber-500/30',
    badge: 'Hosting Vercel',
    shortDesc: 'Mengatasi Firebase Auth error auth/unauthorized-domain saat login Google Workspace di Vercel.',
    detailDesc: 'Jika muncul "auth/unauthorized-domain" saat mengakses Google Drive di hosting Vercel, tambahkan domain "vercel.app" atau domain kustom Anda ke Firebase Console > Authentication > Settings > Authorized domains.',
    tips: 'Domain "vercel.app" mencakup semua pratinjau (preview) dan produksi Vercel. Perubahan aktif dalam ~15 detik.',
  },

  // Bank Soal & Nilai
  {
    id: 'btn-bank-input-soal',
    name: 'Input Bank Soal & Editor Rumus',
    category: 'bank',
    icon: PlusCircle,
    iconColor: 'text-indigo-400',
    iconBg: 'bg-indigo-500/20 border-indigo-500/30',
    shortDesc: 'Menambah soal baru dengan rumus LaTeX, audio, dan gambar.',
    detailDesc: 'Mendukung format Pilihan Ganda A-E, Pilihan Ganda Kompleks, Isian Singkat, pembahasan lengkap, dan penentuan bobot skor.',
  },
  {
    id: 'btn-bank-excel-import',
    name: 'Impor Soal dari Excel / Word',
    category: 'bank',
    icon: FileSpreadsheet,
    iconColor: 'text-emerald-400',
    iconBg: 'bg-emerald-500/20 border-emerald-500/30',
    shortDesc: 'Mengunggah puluhan butir soal sekaligus dari template spreadsheet.',
    detailDesc: 'Menghemat waktu pembuatan soal dengan mengunggah template Excel berisi butir soal, opsi A-E, kunci, dan pembahasan.',
  },
  {
    id: 'btn-bank-result-analysis',
    name: 'Analisis Hasil & Rekap Nilai',
    category: 'bank',
    icon: BarChart2,
    iconColor: 'text-teal-400',
    iconBg: 'bg-teal-500/20 border-teal-500/30',
    shortDesc: 'Melihat perolehan skor, daya beda, dan ekspor ke Excel/PDF.',
    detailDesc: 'Menampilkan distribusi nilai siswa per kelas, peringkat tertinggi, soal tersulit, dan tombol unduh laporan resmi rekap nilai.',
  },
];

export const HelpGuideModal: React.FC<HelpGuideModalProps> = ({
  isOpen,
  onClose,
  initialCategory = 'all',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeItemDetail, setActiveItemDetail] = useState<HelpItem | null>(null);

  const filteredItems = useMemo(() => {
    return HELP_ITEMS.filter(item => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const query = searchQuery.toLowerCase().trim();
      const matchSearch =
        query === '' ||
        item.name.toLowerCase().includes(query) ||
        item.shortDesc.toLowerCase().includes(query) ||
        item.detailDesc.toLowerCase().includes(query) ||
        (item.tips && item.tips.toLowerCase().includes(query)) ||
        (item.badge && item.badge.toLowerCase().includes(query));

      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div
      id="modal-help-guide"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-700 shadow-2xl shadow-black/90 overflow-hidden text-slate-100 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/40 flex items-center justify-center shadow-inner shrink-0">
              <HelpCircle className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg md:text-xl font-extrabold text-white tracking-tight">
                  Buku Panduan & Petunjuk Tombol
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {HELP_ITEMS.length} Tombol & Fitur
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Penjelasan fungsi, kegunaan, dan tips dari setiap tombol di aplikasi CBT SMAN 19
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-help-modal"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all flex items-center justify-center cursor-pointer shrink-0"
            title="Tutup Panduan"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search & Category Filter Bar */}
        <div className="p-3 sm:p-4 bg-slate-850/90 border-b border-slate-800 space-y-3 shrink-0">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-search-help"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama tombol atau fungsi fitur (contoh: token, print, tema, ragu, reset)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs px-1"
              >
                Clear
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {HELP_CATEGORIES.map(cat => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-950/40'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : cat.color}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Body: Grid of Help Items */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto" />
              <p className="text-sm font-semibold text-slate-300">
                Tidak ada tombol yang cocok dengan "{searchQuery}"
              </p>
              <p className="text-xs text-slate-500">
                Coba gunakan kata kunci lain atau pilih kategori Semua Tombol.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredItems.map(item => {
                const Icon = item.icon;
                const isSelected = activeItemDetail?.id === item.id;

                return (
                  <div
                    key={item.id}
                    className={`p-3.5 sm:p-4 rounded-2xl border transition-all cursor-pointer text-left relative group ${
                      isSelected
                        ? 'bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/40'
                        : 'bg-slate-850/80 hover:bg-slate-800 border-slate-750 hover:border-slate-650'
                    }`}
                    onClick={() => setActiveItemDetail(isSelected ? null : item)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${item.iconBg} ${item.iconColor} border flex items-center justify-center shrink-0 shadow-sm`}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-indigo-300 transition-colors truncate">
                            {item.name}
                          </h3>
                          {item.badge && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed font-medium mb-1.5">
                          {item.shortDesc}
                        </p>

                        <p className="text-[11px] text-slate-400 leading-relaxed">
                          {item.detailDesc}
                        </p>

                        {item.tips && (
                          <div className="mt-2.5 p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-start gap-2 text-[11px] text-amber-300/90 font-normal">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <span><strong>Tips:</strong> {item.tips}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-slate-850/90 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2 shrink-0 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Sistem CBT SMAN 19 Bandung • Panduan Interaktif</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all cursor-pointer shadow-md shadow-indigo-950/40"
          >
            Tutup Panduan
          </button>
        </div>
      </div>
    </div>
  );
};
