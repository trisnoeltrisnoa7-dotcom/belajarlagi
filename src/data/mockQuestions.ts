import { Question } from '../types';

export const ALL_MOCK_QUESTIONS: Question[] = [
  // =========================================================================
  // SUBTEST 1: PENALARAN UMUM (PU) - TPS
  // =========================================================================
  {
    id: 'pu-01',
    subtestId: 'tps_pu',
    subtestName: 'Penalaran Umum (PU)',
    category: 'TPS',
    type: 'multiple_choice',
    stimulusTitle: 'Wacana Efisiensi Transportasi Publik',
    stimulus:
      'Pemerintah kota X mencatat bahwa peningkatan jumlah armada bus listrik sebesar 30% berbanding lurus dengan penurunan tingkat emisi karbon di pusat kota sebesar 18%. Namun demikian, jika infrastruktur jalur khusus bus tidak diperluas, maka kecepatan rata-rata perjalanan tetap stagnan. Diketahui pada kuartal ini, tingkat emisi karbon di pusat kota mengalami penurunan sebesar 18% dan kecepatan rata-rata perjalanan meningkat secara signifikan.',
    questionText:
      'Berdasarkan informasi di atas, manakah simpulan yang PASTI BENAR mengenai kuartal ini?',
    options: [
      { id: 'A', label: 'A', text: 'Infrastruktur jalur khusus bus telah diperluas oleh pemerintah kota X.' },
      { id: 'B', label: 'B', text: 'Pemerintah kota X tidak menambah jumlah armada bus listrik.' },
      { id: 'C', label: 'C', text: 'Tingkat kemacetan lalu lintas meningkat pesat di seluruh wilayah kota X.' },
      { id: 'D', label: 'D', text: 'Kecepatan rata-rata bus listrik lebih lambat daripada kendaraan pribadi.' },
      { id: 'E', label: 'E', text: 'Masyarakat beralih menggunakan kendaraan berbahan bakar fosil.' },
    ],
    correctAnswer: 'A',
    explanation: {
      summary: 'Gunakan prinsip kontraposisi dan modus tollens pada premis kondisional.',
      steps: [
        'Premis 1: Jika jalur khusus TIDAK diperluas → kecepatan rata-rata perjalanan stagnan.',
        'Fakta: Kecepatan rata-rata perjalanan meningkat (TIDAK stagnan).',
        'Berdasarkan Modus Tollens (~Q → ~P): Karena kecepatan tidak stagnan (~Q), maka jalur khusus bus PASTI diperluas (~P).',
      ],
      concept: 'Logika Deduktif - Modus Tollens (p → q, ~q, maka ~p)',
      fastTrick: 'Cari negasi dari premis syarat: Syarat macet/stagnan gugur, berarti infrastruktur jalur khusus sudah diperluas!',
    },
    difficulty: 'Sedang',
    irtWeight: 88,
    topic: 'Penalaran Deduktif & Silogisme',
  },
  {
    id: 'pu-02',
    subtestId: 'tps_pu',
    subtestName: 'Penalaran Umum (PU)',
    category: 'TPS',
    type: 'multiple_choice',
    questionText:
      'Perhatikan deret pola bilangan berikut:\n4, 7, 13, 25, 49, 97, x, y\n\nBerapakah nilai x dan y berturut-turut?',
    options: [
      { id: 'A', label: 'A', text: '193 dan 385' },
      { id: 'B', label: 'B', text: '191 dan 383' },
      { id: 'C', label: 'C', text: '193 dan 384' },
      { id: 'D', label: 'D', text: '185 dan 369' },
      { id: 'E', label: 'E', text: '195 dan 387' },
    ],
    correctAnswer: 'A',
    explanation: {
      summary: 'Analisis beda antarsuku atau relasi rekursif n_k = 2 * n_(k-1) - 1.',
      steps: [
        'Metode 1 (Relasi x2 - 1):',
        '4 * 2 - 1 = 7',
        '7 * 2 - 1 = 13',
        '13 * 2 - 1 = 25',
        '25 * 2 - 1 = 49',
        '49 * 2 - 1 = 97',
        'x = 97 * 2 - 1 = 194 - 1 = 193',
        'y = 193 * 2 - 1 = 386 - 1 = 385',
      ],
      concept: 'Pola Bilangan Aritmetika Bertingkat / Rekursif',
      fastTrick: 'Lihat selisihnya: +3, +6, +12, +24, +48... Selisih selalu berlipat ganda! Maka +96 (97+96=193) dan +192 (193+192=385).',
    },
    difficulty: 'Mudah',
    irtWeight: 75,
    topic: 'Pola Barisan & Deret Angka',
  },
  {
    id: 'pu-03',
    subtestId: 'tps_pu',
    subtestName: 'Penalaran Umum (PU)',
    category: 'TPS',
    type: 'complex_multiple_choice',
    stimulusTitle: 'Data Hasil Panen Petani Desa Sukamaju',
    stimulus:
      'Sebuah kelompok tani menguji efektivitas 3 varietas padi (V1, V2, V3). Hasil panen rata-rata V1 adalah 7,2 ton/ha dengan masa tanam 100 hari. Hasil panen V2 adalah 8,5 ton/ha dengan masa tanam 120 hari. Hasil panen V3 adalah 6,8 ton/ha dengan masa tanam 90 hari. Seluruh varietas memerlukan biaya pemupukan yang sama per hektare.',
    questionText:
      'Tentukan apakah pernyataan-pernyataan berikut BENAR atau SALAH berdasarkan data efisiensi harian hasil panen (ton per hari tanam):',
    complexStatements: [
      { id: 'stmt1', text: 'Varietas V3 memiliki produktivitas hasil panen harian (ton/hari) lebih tinggi dibandingkan Varietas V2.', correctAnswer: true },
      { id: 'stmt2', text: 'Varietas V1 menghasilkan tonase per hari paling rendah di antara ketiga varietas.', correctAnswer: false },
      { id: 'stmt3', text: 'Jika petani ingin memanen 2 kali dalam 200 hari, Varietas V1 dapat memberikan total tonase 14,4 ton/ha.', correctAnswer: true },
    ],
    correctAnswer: { stmt1: true, stmt2: false, stmt3: true },
    explanation: {
      summary: 'Hitung rasio produktivitas per hari untuk setiap varietas.',
      steps: [
        'Produktivitas V1 = 7.2 / 100 = 0.072 ton/hari.',
        'Produktivitas V2 = 8.5 / 120 = 0.0708 ton/hari.',
        'Produktivitas V3 = 6.8 / 90 = 0.0755 ton/hari.',
        'Pernyataan 1: V3 (0.0755) > V2 (0.0708) -> BENAR.',
        'Pernyataan 2: V2 yang paling rendah (0.0708), bukan V1 -> SALAH.',
        'Pernyataan 3: Dalam 200 hari V1 panen 2 kali: 2 x 7.2 = 14.4 ton/ha -> BENAR.',
      ],
      concept: 'Penalaran Kuantitatif Terapan & Analisis Rasio',
      fastTrick: 'Bagi cepat: 68/9 = 7.55, 85/12 = 7.08, 72/10 = 7.20. Urutan: V3 > V1 > V2.',
    },
    difficulty: 'HOTS',
    irtWeight: 92,
    topic: 'Penalaran Analitik & Optimasi Data',
  },

  // =========================================================================
  // SUBTEST 2: PEMAHAMAN BACAAN DAN MENULIS (PBM) - TPS
  // =========================================================================
  {
    id: 'pbm-01',
    subtestId: 'tps_pbm',
    subtestName: 'Pemahaman Bacaan & Menulis (PBM)',
    category: 'TPS',
    type: 'multiple_choice',
    stimulusTitle: 'Teks Perkembangan Kecerdasan Buatan',
    stimulus:
      '(1) Transformasi digital telah mengubah lanskap industri secara masif. (2) Penerapan kecerdasan artifisial tidak hanya meningkatkan efisiensi operasional, melainkan juga menuntut reskilling tenaga kerja. (3) Banyak perusahaan rintisan yang terpaksa gulung tikar dikarenakan ketidakmampuan beradaptasi. (4) Namun demikian, regulasi perlindungan data pribadi harus di prioritaskan oleh pembuat kebijakan.',
    questionText:
      'Kesalahan penggunaan ejaan atau tanda baca dan konjungsi yang tidak baku pada teks di atas ditemukan pada kalimat...',
    options: [
      { id: 'A', label: 'A', text: 'Kalimat (1) dan (2)' },
      { id: 'B', label: 'B', text: 'Kalimat (2) dan (4)' },
      { id: 'C', label: 'C', text: 'Kalimat (3) dan (4)' },
      { id: 'D', label: 'D', text: 'Kalimat (1) dan (3)' },
      { id: 'E', label: 'E', text: 'Hanya Kalimat (4)' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary: 'Perhatikan konjungsi korelatif "tidak hanya... tetapi juga..." dan penulisan imbuhan "di-".',
      steps: [
        'Pada kalimat (2): Pasangan korelatif "tidak hanya..." harus diikuti "tetapi juga...", bukan "melainkan juga...". (Pasangan "bukan..." barulah "melainkan...").',
        'Pada kalimat (4): Kata "di prioritaskan" seharusnya digabung menjadi "diprioritaskan" karena "di-" berfungsi sebagai awalan pembentuk kata kerja pasif, bukan kata depan penunjuk tempat.',
      ],
      concept: 'PUEBI: Konjungsi Korelatif dan Prefiks di- vs Preposisi di',
      fastTrick: 'Ingat rumus pasangan kata: "Tidak hanya -> Tetapi juga", "Bukan -> Melainkan". Jika kata setelah di- bisa dipasifkan/diaktifkan (memprioritaskan), maka WAJIB digabung!',
    },
    difficulty: 'Sedang',
    irtWeight: 80,
    topic: 'Kaidah Ejaan & Konjungsi PUEBI',
  },
  {
    id: 'pbm-02',
    subtestId: 'tps_pbm',
    subtestName: 'Pemahaman Bacaan & Menulis (PBM)',
    category: 'TPS',
    type: 'multiple_choice',
    questionText:
      'Manakah kalimat di bawah ini yang merupakan KALIMAT EFEKTIF memenuhi syarat ketat struktur gramatikal?',
    options: [
      { id: 'A', label: 'A', text: 'Bagi seluruh peserta ujian diharapkan memasuki ruangan sepuluh menit sebelum dimulai.' },
      { id: 'B', label: 'B', text: 'Meskipun harga bahan bakar minyak naik, namun tarif angkutan umum tetap stabil.' },
      { id: 'C', label: 'C', text: 'Peneliti menyimpulkan bahwa perubahan iklim mempercepat kepunahan spesies endemik.' },
      { id: 'D', label: 'D', text: 'Dalam penelitian ini membicarakan tentang dampak polusi mikroplastik terhadap biota laut.' },
      { id: 'E', label: 'E', text: 'Rapat pleno pimpinan universitas yang mana menghasilkan keputusan penting bagi mahasiswa.' },
    ],
    correctAnswer: 'C',
    explanation: {
      summary: 'Analisis fungsi Subjek-Predikat (S-P) dan kepatuhan hemat kata.',
      steps: [
        'Opsi A: Kehilangan Subjek karena diawali preposisi "Bagi...".',
        'Opsi B: Kerancuan konjungsi bertingkat ganda "Meskipun..." dan "namun...".',
        'Opsi C: Struktur lengkap (S: Peneliti, P: menyimpulkan, O/Klausa: bahwa perubahan iklim...), lugas dan efektif.',
        'Opsi D: Kehilangan subjek karena "Dalam penelitian ini..." menjadi keterangan, sedangkan "membicarakan" adalah predikat aktif transitif.',
        'Opsi E: Kerancuan klausa tergantung ("yang mana") sehingga tidak memiliki induk kalimat utuh.',
      ],
      concept: 'Kalimat Efektif: Keutuhan S-P dan Kesejajaran Struktur',
      fastTrick: 'Cek Subjek: Hati-hati dengan kalimat yang diawali "Bagi", "Untuk", "Dalam", "Kepada" jika tidak ada subjek mandiri setelahnya!',
    },
    difficulty: 'Sedang',
    irtWeight: 82,
    topic: 'Struktur Kalimat Efektif',
  },

  // =========================================================================
  // SUBTEST 3: PENGETAHUAN DAN PEMAHAMAN UMUM (PPU) - TPS
  // =========================================================================
  {
    id: 'ppu-01',
    subtestId: 'tps_ppu',
    subtestName: 'Pengetahuan & Pemahaman Umum (PPU)',
    category: 'TPS',
    type: 'multiple_choice',
    stimulusTitle: 'Paragraf Ekonomi Sirkular',
    stimulus:
      'Konsep ekonomi sirkular bertujuan untuk meminimalkan limbah dan memaksimalkan nilai guna sumber daya yang ada melalui proses pemulihan dan regenerasi material. Model ini bertolak belakang secara diametral dengan pendekatan ekonomi linear konvensional yang mengusung paradigma "ambil, buat, buang".',
    questionText:
      'Frasa "bertolak belakang secara diametral" dalam konteks wacana di atas bermakna...',
    options: [
      { id: 'A', label: 'A', text: 'Memiliki perbedaan sudut pandang teoritis yang sangat tipis' },
      { id: 'B', label: 'B', text: 'Berada pada kondisi saling melengkapi secara dinamis' },
      { id: 'C', label: 'C', text: 'Berseberangan secara menyeluruh dan berlawanan secara mutlak' },
      { id: 'D', label: 'D', text: 'Menunjukkan penurunan efisiensi secara gradual' },
      { id: 'E', label: 'E', text: 'Mengalami penyesuaian adaptif terhadap kondisi pasar' },
    ],
    correctAnswer: 'C',
    explanation: {
      summary: 'Kata "diametral" merujuk pada garis lurus yang membelah lingkaran dari dua titik yang berlawanan 180 derajat (berlawanan mutlak).',
      steps: [
        'Secara leksikal, diametral berarti menurut garis tengah lingkaran; secara kiasan bermakna benar-benar berlawanan atau berlawanan 180 derajat.',
        'Dengan demikian, "bertolak belakang secara diametral" = berseberangan secara penuh/mutlak.',
      ],
      concept: 'Semantik dan Makna Kontekstual Frasa Idiomatis',
      fastTrick: 'Ingat diameter lingkaran: dua ujung berlawanan total melintasi pusat!',
    },
    difficulty: 'Sedang',
    irtWeight: 78,
    topic: 'Makna Kata & Hubungan Semantik',
  },

  // =========================================================================
  // SUBTEST 4: PENGETAHUAN KUANTITATIF (PK) - TPS
  // =========================================================================
  {
    id: 'pk-01',
    subtestId: 'tps_pk',
    subtestName: 'Pengetahuan Kuantitatif (PK)',
    category: 'TPS',
    type: 'short_numeric',
    stimulusTitle: 'Soal Isian Singkat Aljabar & Fungsi',
    questionText:
      'Diketahui fungsi f(x) = (3x - 5) / (2x + 1) dengan x ≠ -1/2.\nJika invers dari fungsi f adalah f⁻¹(x), dan f⁻¹(k) = 3,\n\nBerapakah nilai bulat dari 7k ?',
    correctAnswer: '4',
    explanation: {
      summary: 'Gunakan sifat dasar invers fungsi: f⁻¹(k) = 3 ⇔ f(3) = k.',
      steps: [
        'Sifat invers: f⁻¹(k) = 3 berarti f(3) = k.',
        'Hitung f(3): f(3) = (3(3) - 5) / (2(3) + 1) = (9 - 5) / (6 + 1) = 4/7.',
        'Maka k = 4/7.',
        'Ditanyakan nilai 7k: 7 * (4/7) = 4.',
      ],
      concept: 'Fungsi Komposisi & Invers Aljabar',
      fastTrick: 'Tidak perlu repot mencari rumus f⁻¹(x)! Cukup balikkan f(3) = k, langsung ketemu 4/7!',
    },
    difficulty: 'Sedang',
    irtWeight: 85,
    topic: 'Fungsi Invers & Aljabar',
  },
  {
    id: 'pk-02',
    subtestId: 'tps_pk',
    subtestName: 'Pengetahuan Kuantitatif (PK)',
    category: 'TPS',
    type: 'cause_reason',
    stimulusTitle: 'Kecukupan Data Geometri Segitiga',
    questionText:
      'Apakah segitiga ABC merupakan segitiga siku-siku?\n\nInformasi tambahan yang diberikan:\n(1) AB² + BC² = AC²\n(2) Besar sudut ∠ABC = 90°\n\nPutuskan apakah pernyataan (1) dan (2) cukup untuk menjawab pertanyaan tersebut!',
    options: [
      { id: 'A', label: 'A', text: 'Pernyataan (1) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (2) SAJA tidak cukup.' },
      { id: 'B', label: 'B', text: 'Pernyataan (2) SAJA cukup untuk menjawab pertanyaan, tetapi pernyataan (1) SAJA tidak cukup.' },
      { id: 'C', label: 'C', text: 'DUA pernyataan BERSAMA-SAMA cukup untuk menjawab pertanyaan, tetapi SATU pernyataan SAJA tidak cukup.' },
      { id: 'D', label: 'D', text: 'Pernyataan (1) SAJA cukup untuk menjawab pertanyaan dan pernyataan (2) SAJA cukup.' },
      { id: 'E', label: 'E', text: 'Pernyataan (1) dan pernyataan (2) tidak cukup untuk menjawab pertanyaan.' },
    ],
    correctAnswer: 'D',
    explanation: {
      summary: 'Uji kecukupan masing-masing pernyataan secara independen.',
      steps: [
        'Uji Pernyataan (1): AB² + BC² = AC² memenuhi Teorema Pythagoras, yang membuktikan bahwa segitiga ABC adalah siku-siku di titik B. (CUKUP)',
        'Uji Pernyataan (2): Besar ∠ABC = 90° secara definisi membuktikan segitiga ABC adalah siku-siku. (CUKUP)',
        'Kesimpulan: Pernyataan (1) SAJA cukup DAN pernyataan (2) SAJA cukup.',
      ],
      concept: 'Kecukupan Data (Data Sufficiency) Geometri',
      fastTrick: 'Masing-masing pernyataan berdiri sendiri secara pasti menyatakan sifat segitiga siku-siku -> Opsi D!',
    },
    difficulty: 'HOTS',
    irtWeight: 90,
    topic: 'Kecukupan Data Geometri',
  },

  // =========================================================================
  // SUBTEST 5: LITERASI DALAM BAHASA INDONESIA (LBI) - TKA / LITERASI
  // =========================================================================
  {
    id: 'lbi-01',
    subtestId: 'tka_lbi',
    subtestName: 'Literasi Bahasa Indonesia (LBI)',
    category: 'LITERASI',
    type: 'multiple_choice',
    stimulusTitle: 'Wacana Ketahanan Pangan & Teknologi Smart Farming',
    stimulus:
      'Krisis iklim global memicu anomali cuaca yang kian tidak terprediksi, mengancam kestabilan produksi agrikultur nasional. Sebagai respons, teknologi smart farming berbasis Internet of Things (IoT) dan sensor tanah mulai diadopsi oleh sejumlah sentra pertanian presisi di Pulau Jawa. Sistem ini mengotomatisasi irigasi mikro dan kalkulasi nutrisi secara presisi per meter persegi lahan. Meskipun investasi awal tergolong tinggi, efisiensi konsumsi air tercatat mencapai 45% dan hasil panen per siklus meningkat hingga 28%. Kendati demikian, tantangan literasi digital petani usia lanjut dan keterbatasan infrastruktur jaringan di daerah terpencil masih menjadi simpul penghambat akselerasi nasional.',
    questionText:
      'Gagasan utama yang mendasari keseluruhan paragraf wacana di atas adalah...',
    options: [
      { id: 'A', label: 'A', text: 'Tantangan literasi digital petani usia lanjut yang menghambat pertanian modern' },
      { id: 'B', label: 'B', text: 'Potensi dan tantangan implementasi smart farming dalam memitigasi dampak krisis iklim terhadap agrikultur' },
      { id: 'C', label: 'C', text: 'Tingginya biaya investasi awal teknologi sensor tanah dan irigasi mikro di Pulau Jawa' },
      { id: 'D', label: 'D', text: 'Penurunan konsumsi air sebesar 45% akibat anomali cuaca ekstrem' },
      { id: 'E', label: 'E', text: 'Ketergantungan penuh sektor agrikultur nasional pada infrastruktur jaringan internet kota' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary: 'Paragraf membahas latar belakang krisis iklim, solusi smart farming beserta manfaatnya, serta tantangan adopsinya.',
      steps: [
        'Wacana terstruktur dari: Masalah (krisis iklim) -> Solusi (smart farming) -> Hasil/Manfaat (hemat air & panen naik) -> Kendala (literasi digital & jaringan).',
        'Gagasan utama mencakup keseluruhan benang merah ini: Potensi dan tantangan implementasi teknologi smart farming.',
      ],
      concept: 'Gagasan Utama & Struktur Paragraf Analitis',
      fastTrick: 'Pilih opsi yang merangkum solusi (smart farming) + hasil + tantangannya, bukan hanya 1 detail parsial!',
    },
    difficulty: 'Sedang',
    irtWeight: 84,
    topic: 'Literasi Teks Informasi & Analisis Ide Pokok',
  },

  // =========================================================================
  // SUBTEST 6: LITERASI DALAM BAHASA INGGRIS (LBE) - TKA / LITERASI
  // =========================================================================
  {
    id: 'lbe-01',
    subtestId: 'tka_lbe',
    subtestName: 'Literasi Bahasa Inggris (LBE)',
    category: 'LITERASI',
    type: 'multiple_choice',
    stimulusTitle: 'Academic Passage on Deep-Sea Bioluminescence',
    stimulus:
      'In the aphotic zone of the world\'s oceans, where sunlight is completely extinguished beyond depths of 1,000 meters, organisms have evolved sophisticated biochemical adaptations to thrive. Bioluminescence—the production and emission of light by a living organism via the luciferin-luciferase reaction—serves multiple evolutionary functions. Deep-sea anglerfish utilize a glowing dorsal appendage as a symbiotic lure to attract unsuspecting prey in perpetual darkness. Meanwhile, certain species of squid eject bioluminescent clouds rather than dark ink, startling predators and providing a fleeting window for evasion. Scientists emphasize that these intricate optical strategies are vital for reproductive signaling, predation, and camouflage, making these deep ecosystems remarkably dynamic despite their harsh environmental extremes.',
    questionText:
      'According to the passage, why do certain deep-sea squids release bioluminescent clouds instead of conventional dark ink?',
    options: [
      { id: 'A', label: 'A', text: 'To illuminate the seabed and forage for benthic microorganisms' },
      { id: 'B', label: 'B', text: 'To disorient and stun predators, creating a temporary opportunity to escape' },
      { id: 'C', label: 'C', text: 'To attract mates for reproductive signaling in perpetual darkness' },
      { id: 'D', label: 'D', text: 'To oxidize luciferin and generate biochemical warmth in cold water' },
      { id: 'E', label: 'E', text: 'To mimic the luminous lure of deep-sea anglerfish' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary: 'Identify the exact supporting detail in the sentence describing squids.',
      steps: [
        'Text states: "...squid eject bioluminescent clouds rather than dark ink, startling predators and providing a fleeting window for evasion."',
        '"Startling predators and providing a fleeting window for evasion" matches "disorient and stun predators, creating a temporary opportunity to escape".',
      ],
      concept: 'Reading Comprehension: Detailed Fact Retrieval & Paraphrasing',
      fastTrick: 'Find the keyword "squid" in the passage and match the synonym: "evasion" = "escape", "startling" = "disorient/stun".',
    },
    difficulty: 'Sedang',
    irtWeight: 86,
    topic: 'English Reading Comprehension & Inference',
  },

  // =========================================================================
  // SUBTEST 7: PENALARAN MATEMATIKA (PM) - TKA / LITERASI
  // =========================================================================
  {
    id: 'pm-01',
    subtestId: 'tka_pm',
    subtestName: 'Penalaran Matematika (PM)',
    category: 'LITERASI',
    type: 'multiple_choice',
    stimulusTitle: 'Kasus Pemodelan Finansial & Investasi UMKM',
    stimulus:
      'Seorang pengusaha muda mendirikan startup katering sehat dengan modal awal Rp 30.000.000. Biaya variabel untuk memproduksi 1 paket makanan sehat adalah Rp 15.000, sedangkan biaya tetap operasional per bulan (sewa dapur dan listrik) adalah Rp 6.000.000. Setiap paket makanan sehat dijual ke konsumen dengan harga Rp 25.000.',
    questionText:
      'Berapa jumlah paket makanan sehat minimal yang harus terjual dalam 1 bulan agar usaha katering tersebut mencapai titik impas (Break Even Point / BEP) operasional bulanan?',
    options: [
      { id: 'A', label: 'A', text: '400 paket' },
      { id: 'B', label: 'B', text: '500 paket' },
      { id: 'C', label: 'C', text: '600 paket' },
      { id: 'D', label: 'D', text: '750 paket' },
      { id: 'E', label: 'E', text: '800 paket' },
    ],
    correctAnswer: 'C',
    explanation: {
      summary: 'Rumus Titik Impas (BEP Unit) = Biaya Tetap / (Harga Jual per unit - Biaya Variabel per unit).',
      steps: [
        'Biaya Tetap (FC) = Rp 6.000.000',
        'Harga Jual (P) = Rp 25.000',
        'Biaya Variabel (VC) = Rp 15.000',
        'Margin Kontribusi per unit = P - VC = 25.000 - 15.000 = Rp 10.000 per paket.',
        'BEP (Unit) = FC / Margin Kontribusi = 6.000.000 / 10.000 = 600 paket.',
      ],
      concept: 'Pemodelan Aritmetika Sosial & Titik Impas (BEP)',
      fastTrick: 'Untung kotor per paket = 10 ribu. Perlu 6 juta / 10 ribu = 600 paket langsung!',
    },
    difficulty: 'Sedang',
    irtWeight: 80,
    topic: 'Aritmetika Sosial & Optimasi Bisnis',
  },
  {
    id: 'pm-02',
    subtestId: 'tka_pm',
    subtestName: 'Penalaran Matematika (PM)',
    category: 'LITERASI',
    type: 'short_numeric',
    stimulusTitle: 'Desain Tangki Penampungan Air Silinder',
    questionText:
      'Sebuah tangki air berbentuk tabung tanpa tutup memiliki jari-jari alas r = 7 meter dan tinggi t = 10 meter. Tangki tersebut akan dicat pada seluruh permukaan dinding samping (selimut) dan alas dalamnya.\n\nDengan menggunakan pendekatan π = 22/7, berapa meter persegi luas total permukaan tangki yang dicat?',
    correctAnswer: '594',
    explanation: {
      summary: 'Luas tabung tanpa tutup = Luas Alas + Luas Selimut Tabung.',
      steps: [
        'Luas Alas = π * r² = (22/7) * 7² = 22 * 7 = 154 m².',
        'Luas Selimut = 2 * π * r * t = 2 * (22/7) * 7 * 10 = 2 * 22 * 10 = 440 m².',
        'Luas Total Permukaan yang Dicat = 154 + 440 = 594 m².',
      ],
      concept: 'Geometri Ruang - Tabung Tanpa Tutup',
      fastTrick: 'L = πr(r + 2t) = (22/7)*7*(7 + 20) = 22 * 27 = 594 m².',
    },
    difficulty: 'Sedang',
    irtWeight: 82,
    topic: 'Geometri Ruang & Luas Permukaan',
  },

  // =========================================================================
  // SUBTEST 8: TKA SAINTEK (FISIKA & KIMIA)
  // =========================================================================
  {
    id: 'tka-saintek-01',
    subtestId: 'tka_saintek',
    subtestName: 'TKA Saintek (Fisika/Kimia/Biologi)',
    category: 'TKA',
    type: 'multiple_choice',
    stimulusTitle: 'Fisika Dinamika & Energi Mekanik',
    questionText:
      'Sebuah balok bermassa 2 kg meluncur dari keadaan diam pada bidang miring licin dengan sudut kemiringan 30° dari ketinggian vertikal h = 5 meter. Jika percepatan gravitasi g = 10 m/s², berapakah kecepatan balok saat tiba di dasar bidang miring?',
    options: [
      { id: 'A', label: 'A', text: '5 m/s' },
      { id: 'B', label: 'B', text: '10 m/s' },
      { id: 'C', label: 'C', text: '10√2 m/s' },
      { id: 'D', label: 'D', text: '15 m/s' },
      { id: 'E', label: 'E', text: '20 m/s' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary: 'Gunakan Hukum Kekekalan Energi Mekanik (karena bidang licin tanpa gesekan): Ep_awal = Ek_akhir.',
      steps: [
        'm * g * h = 1/2 * m * v²',
        'v = √(2 * g * h)',
        'v = √(2 * 10 * 5) = √100 = 10 m/s.',
      ],
      concept: 'Hukum Kekekalan Energi Mekanik',
      fastTrick: 'Kecepatan jatuh bebas hanya bergantung ketinggian: v = √(2gh) = √(2*10*5) = 10 m/s langsung tanpa terpengaruh sudut kemiringan!',
    },
    difficulty: 'Sedang',
    irtWeight: 85,
    topic: 'Mekanika Klasik & Hukum Kekekalan Energi',
  },
  {
    id: 'tka-saintek-02',
    subtestId: 'tka_saintek',
    subtestName: 'TKA Saintek (Fisika/Kimia/Biologi)',
    category: 'TKA',
    type: 'multiple_choice',
    stimulusTitle: 'Kimia Larutan Penyangga (Buffer)',
    questionText:
      'Campuran manakah di bawah ini yang dapat membentuk LARUTAN PENYANGGA (BUFFER) dengan pH kurang dari 7 (buffer asam)?',
    options: [
      { id: 'A', label: 'A', text: '100 mL CH₃COOH 0,1 M + 100 mL NaOH 0,1 M' },
      { id: 'B', label: 'B', text: '100 mL CH₃COOH 0,2 M + 100 mL NaOH 0,1 M' },
      { id: 'C', label: 'C', text: '100 mL HCl 0,1 M + 100 mL NH₄OH 0,1 M' },
      { id: 'D', label: 'D', text: '100 mL HCl 0,2 M + 100 mL NaOH 0,1 M' },
      { id: 'E', label: 'E', text: '100 mL NH₄OH 0,2 M + 100 mL HCl 0,1 M' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary: 'Buffer asam terbentuk dari Asam Lemah sisa berlebih dengan Garam/Basa Konjugasinya.',
      steps: [
        'Mol CH₃COOH = 100 mL x 0,2 M = 20 mmol (Asam Lemah).',
        'Mol NaOH = 100 mL x 0,1 M = 10 mmol (Basa Kuat).',
        'Reaksi menghasilkan 10 mmol CH₃COONa dan menyisakan 10 mmol CH₃COOH (Asam Lemah bersisa).',
        'Karena ada sisa asam lemah + garamnya, maka terbentuk larutan penyangga asam (pH < 7).',
      ],
      concept: 'Kimia Larutan: Sistem Penyangga Asam & Basa',
      fastTrick: 'Cari asam lemah yang mol-nya LEBIH BESAR daripada basa kuatnya: 100x0.2 > 100x0.1 -> Opsi B!',
    },
    difficulty: 'Sedang',
    irtWeight: 86,
    topic: 'Kimia Larutan Penyangga',
  },

  // =========================================================================
  // SUBTEST 9: TKA SOSHUM (EKONOMI & SOSIOLOGI)
  // =========================================================================
  {
    id: 'tka-soshum-01',
    subtestId: 'tka_soshum',
    subtestName: 'TKA Soshum (Ekonomi/Geografi/Sosiologi)',
    category: 'TKA',
    type: 'multiple_choice',
    stimulusTitle: 'Ekonomi Mikro: Elastisitas Permintaan',
    questionText:
      'Ketika harga suatu barang mengalami kenaikan sebesar 10%, jumlah barang yang diminta oleh konsumen mengalami penurunan sebesar 25%. Koefisien elastisitas permintaan barang tersebut dan sifatnya adalah...',
    options: [
      { id: 'A', label: 'A', text: 'Ed = 0,4 (Inelastis)' },
      { id: 'B', label: 'B', text: 'Ed = 1,0 (Unitary Elastis)' },
      { id: 'C', label: 'C', text: 'Ed = 2,5 (Elastis)' },
      { id: 'D', label: 'D', text: 'Ed = 2,5 (Inelastis Sempurna)' },
      { id: 'E', label: 'E', text: 'Ed = 0,25 (Elastis Sempurna)' },
    ],
    correctAnswer: 'C',
    explanation: {
      summary: 'Rumus Elastisitas Permintaan Ed = |%ΔQ / %ΔP|.',
      steps: [
        'Ed = | -25% / +10% | = 2,5.',
        'Karena Ed > 1, maka sifat permintaan adalah ELASTIS (konsumen sangat sensitif terhadap perubahan harga).',
      ],
      concept: 'Elastisitas Permintaan & Penawaran',
      fastTrick: 'Bagi langsung: 25 / 10 = 2.5. Angka > 1 selalu bersifat Elastis!',
    },
    difficulty: 'Mudah',
    irtWeight: 76,
    topic: 'Ekonomi Mikro - Elastisitas Harga',
  },
  {
    id: 'tka-soshum-02',
    subtestId: 'tka_soshum',
    subtestName: 'TKA Soshum (Ekonomi/Geografi/Sosiologi)',
    category: 'TKA',
    type: 'multiple_choice',
    stimulusTitle: 'Sosiologi: Diferensiasi dan Stratifikasi Sosial',
    questionText:
      'Stratifikasi sosial terbuka ditandai dengan adanya kemungkinan bagi individu untuk melakukan mobilitas sosial vertikal naik (social climbing) ataupun turun (social sinking). Faktor utama yang menjadi dasar penentuan posisi seseorang dalam stratifikasi sosial terbuka adalah...',
    options: [
      { id: 'A', label: 'A', text: 'Keturunan darah bangsawan (ascribed status)' },
      { id: 'B', label: 'B', text: 'Prestasi, keahlian, dan tingkat pendidikan (achieved status)' },
      { id: 'C', label: 'C', text: 'Kasta kelahiran yang ditentukan secara turun-temurun' },
      { id: 'D', label: 'D', text: 'Pengelompokan berdasarkan ciri-ciri fisik rasial' },
      { id: 'E', label: 'E', text: 'Sistem feodalisme kepemilikan tanah tradisional' },
    ],
    correctAnswer: 'B',
    explanation: {
      summary: 'Stratifikasi terbuka didasarkan pada achieved status (status yang diraih melalui usaha, keahlian, dan prestasi).',
      steps: [
        'Ascribed status = status bawaan lahir (kasta, keturunan), merupakan ciri stratifikasi tertutup.',
        'Achieved status = status yang diperoleh melalui kerja keras, sekolah, karier, dan prestasi, menjadi pilar stratifikasi terbuka.',
      ],
      concept: 'Struktur Sosial & Mobilitas Sosial',
      fastTrick: 'Terbuka = Bisa berubah lewat Usaha & Pendidikan (Achieved Status)!',
    },
    difficulty: 'Mudah',
    irtWeight: 75,
    topic: 'Sosiologi - Stratifikasi Sosial',
  },
];
