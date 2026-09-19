import type { Question, QuestionFormat, DifficultyLevel, SmaGrade, SmaMajor } from '../types';

interface FallbackParams {
  subject?: string;
  grade?: SmaGrade | string;
  major?: SmaMajor | string;
  chapter?: string;
  examType?: string;
  difficulty?: DifficultyLevel | string;
  count?: number;
  questionFormat?: QuestionFormat | string;
  mediaType?: 'text_only' | 'with_image' | 'with_audio' | 'with_chart_curve';
  minWordCount?: number;
  aiEngine?: string;
}

// Rich subject-matter themes and concepts
const SUBJECT_KNOWLEDGE: Record<string, {
  defaultChapters: string[];
  subtopics: Array<{
    title: string;
    premise: string;
    calculationPrompt: string;
    numVal: number;
    calcSteps: string;
    causeStatement: string;
    causeReason: string;
    causeKey: 'A' | 'B' | 'C' | 'D' | 'E';
    statements: Array<{ text: string; correct: boolean }>;
    options: Array<{ id: string; label: string; text: string }>;
    correctKey: string;
    multiKeys: string[];
    conceptSummary: string;
  }>;
}> = {
  Fisika: {
    defaultChapters: ['Dinamika Gerak & Hukum Newton', 'Termodinamika', 'Gelombang Elektromagnetik', 'Fluida Statis & Dinamis', 'Listrik Dinamis & Magnet'],
    subtopics: [
      {
        title: 'Hukum Kekekalan Energi & Usaha',
        premise: 'Sebuah benda bermassa $m$ bergerak meluncur pada bidang miring licin dari ketinggian awal $h_1$ ke $h_2$. Seluruh energi potensial gravitasi dikonversi secara kontinu menjadi energi kinetik tanpa disipasi termal.',
        calculationPrompt: 'Sebuah balok bermassa 4 kg dilepas dari ketinggian 15 meter tanpa kecepatan awal ($g = 10\\text{ m/s}^2$). Berapakah besar energi kinetik balok ketika mencapai ketinggian 5 meter dari permukaan tanah?',
        numVal: 400,
        calcSteps: '$\\Delta E_k = m \\cdot g \\cdot (h_1 - h_2) = 4 \\times 10 \\times (15 - 5) = 4 \\times 10 \\times 10 = 400\\text{ Joule}$.',
        causeStatement: 'Kecepatan terminal benda jatuh bebas di dalam medium udara bernilai konstan setelah selang waktu tertentu.',
        causeReason: 'Gaya hambat aerodinamis udara (gaya gesek fluida) bertambah sebanding dengan kuadrat kelajuan hingga menyeimbangkan gaya gravitasi bumi.',
        causeKey: 'A',
        statements: [
          { text: 'Pada sistem mekanik tanpa gesekan eksternal, jumlah energi mekanik ($E_p + E_k$) bernilai konstan di setiap titik lintasan.', correct: true },
          { text: 'Besar energi kinetik berbanding terbalik dengan kuadrat massa partikel.', correct: false },
          { text: 'Gaya konservatif seperti gaya gravitasi melakukan usaha yang lintasannya tidak bergantung pada bentuk jalur perpindahan.', correct: true },
          { text: 'Gaya normal selalu menghasilkan usaha mekanik yang bernilai maksimum positif pada bidang datar.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Energi mekanik total selalu kekal karena tidak ada usaha oleh gaya non-konservatif.' },
          { id: 'B', label: 'B', text: 'Kecepatan benda di titik terendah bernilai nol karena percepatan gravitasi mengecil.' },
          { id: 'C', label: 'C', text: 'Perubahan energi potensial berbanding terbalik dengan jarak vertikal yang ditempuh.' },
          { id: 'D', label: 'D', text: 'Gaya normal pada bidang miring nilainya selalu lebih besar dari berat total benda.' },
          { id: 'E', label: 'E', text: 'Usaha yang dilakukan oleh gaya gravitasi selalu bernilai negatif sepanjang gerakan turun.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'Kekekalan energi mekanik berlaku mutlak pada medan gaya konservatif tanpa adanya gaya non-konservatif.'
      },
      {
        title: 'Dinamika Rotasi & Momen Inersia',
        premise: 'Silinder pejal dan bola pejal dengan massa serta jari-jari yang identik menggelinding murni tanpa slip dari puncak bidang miring yang sama.',
        calculationPrompt: 'Sebuah roda pejal dengan momen inersia $I = 0.5\\text{ kg}\\cdot\\text{m}^2$ dikenai momen gaya torsi sebesar $12\\text{ N}\\cdot\\text{m}$. Berapakah percepatan sudut roda tersebut dalam satuan $\\text{rad/s}^2$?',
        numVal: 24,
        calcSteps: '$\\alpha = \\frac{\\tau}{I} = \\frac{12}{0.5} = 24\\text{ rad/s}^2$.',
        causeStatement: 'Bola pejal mencapai dasar bidang miring lebih cepat daripada silinder pejal yang dilepas bersamaan dari ketinggian yang sama.',
        causeReason: 'Koefisien momen inersia bola pejal ($k = 2/5$) lebih kecil daripada silinder pejal ($k = 1/2$), sehingga fraksi energi kinetik rotasinya lebih kecil dan percepatan liniernya lebih besar.',
        causeKey: 'A',
        statements: [
          { text: 'Percepatan linier benda yang menggelinding murni berbanding terbalik dengan nilai faktor inersia $(1 + k)$.', correct: true },
          { text: 'Torsi yang bekerja pada poros rotasi selalu berbanding terbalik dengan percepatan sudut.', correct: false },
          { text: 'Momentum sudut total suatu sistem kekal apabila momen gaya resultan eksternal sama dengan nol.', correct: true },
          { text: 'Semua benda pejal memiliki waktu luncur yang sama tanpa dipengaruhi distribusi massa terhadap sumbu putar.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Distribusi massa yang semakin dekat ke poros putar memperbesar nilai momen inersia.' },
          { id: 'B', label: 'B', text: 'Benda dengan faktor inersia lebih kecil akan menuruni bidang miring dengan percepatan linier lebih tinggi.' },
          { id: 'C', label: 'C', text: 'Gaya gesek statis pada gerak menggelinding murni selalu menguras energi mekanik menjadi panas.' },
          { id: 'D', label: 'D', text: 'Kecepatan linier pusat massa tidak dipengaruhi oleh percepatan gravitasi bumi.' },
          { id: 'E', label: 'E', text: 'Kecepatan sudut roda selalu bernilai konstan kendati dikenai resultan torsi positif.' }
        ],
        correctKey: 'B',
        multiKeys: ['B', 'D'],
        conceptSummary: 'Percepatan benda menggelinding $a = \\frac{g \\sin\\theta}{1 + k}$; semakin kecil $k$, semakin cepat benda menuruni bidang.'
      },
      {
        title: 'Termodinamika & Siklus Mesin Carnot',
        premise: 'Sebuah mesin kalor Carnot beroperasi di antara dua reservoir kalor bersuhu mutlak tinggi $T_H$ dan bersuhu rendah $T_C$. Siklus terdiri dari dua proses isotermal reversibel dan dua proses adiabatik reversibel.',
        calculationPrompt: 'Sebuah mesin Carnot menyerap kalor sebesar 1.200 Joule dari reservoir bersuhu 600 K dan membuang sebagian kalor ke reservoir bersuhu 300 K. Berapakah usaha mekanik yang dihasilkan mesin Carnot tersebut dalam Joule?',
        numVal: 600,
        calcSteps: '$\\eta = 1 - \\frac{T_C}{T_H} = 1 - \\frac{300}{600} = 0.5$. Usaha $W = \\eta \\cdot Q_H = 0.5 \\times 1200 = 600\\text{ Joule}$.',
        causeStatement: 'Tidak ada mesin kalor riil yang efisiensinya dapat melampaui efisiensi mesin Carnot ideal yang bekerja pada rentang reservoir suhu yang sama.',
        causeReason: 'Hukum Kedua Termodinamika (pernyataan Kelvin-Planck dan Clausius) membatasi bahwa perubahan kalor menjadi kerja selalu menyisakan pelepasan entropi ke lingkungan.',
        causeKey: 'A',
        statements: [
          { text: 'Efisiensi mesin Carnot hanya bergantung pada rasio suhu mutlak reservoir tinggi dan reservoir rendah.', correct: true },
          { text: 'Efisiensi mesin kalor dapat mencapai 100% apabila kalor yang diserap bernilai sangat besar.', correct: false },
          { text: 'Pada proses adiabatik, perpindahan kalor antara sistem dengan lingkungan bernilai nol ($Q = 0$).', correct: true },
          { text: 'Pada proses isotermal, suhu gas berubah secara drastis saat terjadi kompresi volume.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Efisiensi mesin Carnot dapat ditingkatkan dengan cara menaikkan suhu reservoir tinggi atau menurunkan suhu reservoir rendah.' },
          { id: 'B', label: 'B', text: 'Seluruh kalor yang diserap dari reservoir panas dapat diubah menjadi usaha tanpa ada kalor terbuang.' },
          { id: 'C', label: 'C', text: 'Usaha yang dihasilkan mesin bernilai sama dengan jumlah total kalor yang dibuang ke lingkungan.' },
          { id: 'D', label: 'D', text: 'Mesin pendingin bekerja dengan menyerap kalor dari reservoir tinggi ke reservoir rendah secara spontan.' },
          { id: 'E', label: 'E', text: 'Perubahan energi dalam gas ideal pada siklus tertutup selalu bernilai positif tak hingga.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'Efisiensi Carnot $\\eta = 1 - T_C/T_H$. Hukum kedua termodinamika melarang efisiensi mesin kalor mencapai 100%.'
      },
      {
        title: 'Gelombang Bunyi & Efek Doppler',
        premise: 'Sebuah mobil ambulans bergerak dengan kelajuan $v_s$ membunyikan sirine berfrekuensi $f_s$. Seorang pengamat berdiri di tepi jalan mendengarkan perubahan frekuensi bunyi sirine tersebut.',
        calculationPrompt: 'Sebuah sirine frekuensi 720 Hz dibunyikan oleh kereta yang mendekati stasiun dengan kecepatan 20 m/s. Jika cepat rambat bunyi di udara adalah 340 m/s, berapakah frekuensi yang didengar oleh penumpang yang diam di stasiun dalam satuan Hz?',
        numVal: 765,
        calcSteps: '$f_p = f_s \\cdot \\frac{v}{v - v_s} = 720 \\times \\frac{340}{340 - 20} = 720 \\times \\frac{340}{320} = 720 \\times 1.0625 = 765\\text{ Hz}$.',
        causeStatement: 'Frekuensi bunyi sirine yang didengar pengamat terdengar lebih tinggi ketika sumber bunyi bergerak mendekatinya.',
        causeReason: 'Gelombang bunyi di depan sumber mengalami pemampatan panjang gelombang ($\\lambda$ mengecil) di medium udara.',
        causeKey: 'A',
        statements: [
          { text: 'Efek Doppler terjadi akibat adanya gerak relatif antara sumber bunyi dengan pendengar.', correct: true },
          { text: 'Frekuensi bunyi bertambah karena cepat rambat gelombang bunyi di udara meningkat.', correct: false },
          { text: 'Taraf intensitas bunyi bertambah 20 dB jika intensitas gelombang bunyi dinaikkan 100 kali lipat.', correct: true },
          { text: 'Gelombang bunyi termasuk gelombang transversal yang dapat terpolarisasi di ruang hampa.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Panjang gelombang tampak memendek di depan sumber sehingga frekuensi deteksi pengamat meningkat.' },
          { id: 'B', label: 'B', text: 'Amplitudo gelombang sirine selalu konstan tidak terpengaruh jarak tempuh.' },
          { id: 'C', label: 'C', text: 'Cepat rambat bunyi di udara berubah sebanding dengan kecepatan gerak sumber ambulans.' },
          { id: 'D', label: 'D', text: 'Pengamat mendengar nada yang lebih rendah saat sumber bunyi bergerak mendekatinya.' },
          { id: 'E', label: 'E', text: 'Efek Doppler hanya terjadi pada gelombang transversal dan tidak berlaku pada bunyi.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'Efek Doppler: $f_p = f_s \\cdot (v \\pm v_p)/(v \\mp v_s)$. Bunyi mendekat: $\\lambda$ memendek, $f$ terdeteksi naik.'
      },
      {
        title: 'Listrik Arus Bolak-Balik & Rangkaian RLC',
        premise: 'Sebuah rangkaian seri RLC dihubungkan dengan sumber tegangan bolak-balik $V = V_m \\sin(\\omega t)$. Terjadi kondisi resonansi ketika reaktansi induktif sama dengan reaktansi kapasitif.',
        calculationPrompt: 'Sebuah resistor $R = 30\\,\\Omega$, induktor dengan reaktansi $X_L = 80\\,\\Omega$, dan kapasitor dengan reaktansi $X_C = 40\\,\\Omega$ disusun seri pada tegangan AC. Berapakah nilai impedansi total $Z$ rangkaian dalam satuan Ohm?',
        numVal: 50,
        calcSteps: '$Z = \\sqrt{R^2 + (X_L - X_C)^2} = \\sqrt{30^2 + (80 - 40)^2} = \\sqrt{900 + 1600} = \\sqrt{2500} = 50\\,\\Omega$.',
        causeStatement: 'Pada keadaan resonansi rangkaian RLC seri, nilai impedansi rangkaian bernilai minimum dan sama dengan nilai hambatannya ($Z = R$).',
        causeReason: 'Reaktansi induktif ($X_L$) meniadakan reaktansi kapasitif ($X_C$) secara fasor karena keduanya saling berlawanan fase 180 derajat.',
        causeKey: 'A',
        statements: [
          { text: 'Pada kondisi resonansi seri, arus listrik efektif pada rangkaian mencapai nilai maksimum.', correct: true },
          { text: 'Faktor daya rangkaian resonansi bernilai nol karena tidak terjadi disipasi daya.', correct: false },
          { text: 'Frekuensi resonansi dirumuskan sebagai $f = \\frac{1}{2\\pi\\sqrt{LC}}$.', correct: true },
          { text: 'Tegangan pada kapasitor selalu mendahului arus listrik sebesar 90 derajat.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Arus efektif bernilai minimum saat reaktansi kapasitif sama dengan reaktansi induktif.' },
          { id: 'B', label: 'B', text: 'Impedansi rangkaian mencapai nilai minimum dan arus listrik efektif bernilai maksimum saat resonansi.' },
          { id: 'C', label: 'C', text: 'Resistor menghasilkan pergeseran fase sebesar 90 derajat terhadap tegangan sumber.' },
          { id: 'D', label: 'D', text: 'Induktor menyimpan energi dalam bentuk medan elektrostatik statis.' },
          { id: 'E', label: 'E', text: 'Daya disipasi rata-rata hanya terjadi pada komponen induktor dan kapasitor murni.' }
        ],
        correctKey: 'B',
        multiKeys: ['B', 'C'],
        conceptSummary: 'Resonansi RLC seri terjadi saat $X_L = X_C \\implies Z = R$ (minimum) dan $I = V/R$ (maksimum).'
      }
    ]
  },
  Kimia: {
    defaultChapters: ['Kesetimbangan Kimia', 'Stoikiometri & Larutan Asam Basa', 'Termokimia', 'Redoks & Elektrokimia', 'Sifat Koligatif Larutan'],
    subtopics: [
      {
        title: 'Prinsip Le Chatelier & Pergeseran Kesetimbangan',
        premise: 'Reaksi sintesis gas amonia: $\\text{N}_2(g) + 3\\text{H}_2(g) \\rightleftharpoons 2\\text{NH}_3(g)$, $\\Delta H = -92\\text{ kJ}$. Sistem berada pada kesetimbangan dinamis di dalam reaktor tertutup bertekanan konstan.',
        calculationPrompt: 'Dalam wadah 2 liter pada suhu tertentu terdapat 0,4 mol $\\text{N}_2$, 0,6 mol $\\text{H}_2$, dan 0,8 mol $\\text{NH}_3$ dalam kesetimbangan. Berapakah konsentrasi molaritas $\\text{NH}_3$ pada keadaan tersebut?',
        numVal: 0.4,
        calcSteps: '$[\\text{NH}_3] = \\frac{\\text{mol}}{\\text{Volume}} = \\frac{0{,}8\\text{ mol}}{2\\text{ L}} = 0{,}4\\text{ M}$.',
        causeStatement: 'Penambahan tekanan pada sistem reaksi gas amonia akan menggeser kesetimbangan ke arah pembentukan produk gas $\\text{NH}_3$.',
        causeReason: 'Peningkatan tekanan total menggeser kesetimbangan ke arah sisi reaksi yang memiliki jumlah koefisien mol gas lebih kecil.',
        causeKey: 'A',
        statements: [
          { text: 'Penurunan suhu pada reaksi eksotermik akan menggeser kesetimbangan ke arah produk (kanan).', correct: true },
          { text: 'Penambahan katalis memperbesar nilai tetapan kesetimbangan $K_c$.', correct: false },
          { text: 'Nilai $K_c$ hanya dipengaruhi oleh perubahan suhu reaksi.', correct: true },
          { text: 'Peningkatan volume wadah reaksi akan menggeser kesetimbangan ke arah jumlah koefisien mol lebih kecil.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Penurunan suhu dan peningkatan tekanan akan meningkatkan rendemen hasil gas amonia.' },
          { id: 'B', label: 'B', text: 'Katalis besi akan mengubah posisi kesetimbangan dan memperbesar nilai tetapan Kc.' },
          { id: 'C', label: 'C', text: 'Penambahan gas nitrogen akan menggeser kesetimbangan ke arah kiri (reaktan).' },
          { id: 'D', label: 'D', text: 'Kenaikan suhu pada reaksi eksotermik akan menambah jumlah mol amonia yang dihasilkan.' },
          { id: 'E', label: 'E', text: 'Tekanan tidak memberikan pengaruh apa pun terhadap sistem kesetimbangan gas homogen.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'D'],
        conceptSummary: 'Azas Le Chatelier: Sistem merespon gangguan eksternal. Tekanan naik $\\rightarrow$ geser ke koefisien gas lebih kecil.'
      },
      {
        title: 'Larutan Penyangga (Buffer) & Derajat Keasaman (pH)',
        premise: 'Campuran larutan asam lemah asam asetat $\\text{CH}_3\\text{COOH}$ dengan garam basa konjugasinya $\\text{CH}_3\\text{COONa}$ membentuk sistem penyangga asam di dalam cairan biologis.',
        calculationPrompt: 'Sebanyak 100 mL $\\text{CH}_3\\text{COOH}$ 0,1 M ($K_a = 10^{-5}$) dicampurkan dengan 100 mL $\\text{CH}_3\\text{COONa}$ 0,1 M. Berapakah nilai pH larutan penyangga yang terbentuk?',
        numVal: 5,
        calcSteps: '$\\text{mol asam} = 10\\text{ mmol}$, $\\text{mol garam} = 10\\text{ mmol}$. $[\\text{H}^+] = K_a \\times \\frac{\\text{mol asam}}{\\text{mol basa konjugasi}} = 10^{-5} \\times \\frac{10}{10} = 10^{-5}$. $\\text{pH} = -\\log[10^{-5}] = 5$.',
        causeStatement: 'Penambahan sedikit asam kuat ke dalam larutan penyangga tidak mengubah nilai pH larutan secara signifikan.',
        causeReason: 'Ion $\\text{H}^+$ dari asam kuat dinetralkan oleh ion basa konjugasi ($\\text{CH}_3\\text{COO}^-$) membentuk molekul asam lemah yang sedikit terionisasi.',
        causeKey: 'A',
        statements: [
          { text: 'Kapasitas penyangga maksimum tercapai ketika konsentrasi asam lemah sama dengan konsentrasi basa konjugasinya.', correct: true },
          { text: 'Pengenceran larutan penyangga dengan air murni akan merusak sistem penyangga secara drastis.', correct: false },
          { text: 'Sistem penyangga karbonat ($\\text{H}_2\\text{CO}_3 / \\text{HCO}_3^-$) menjaga kestabilan pH darah manusia pada rentang 7,35 - 7,45.', correct: true },
          { text: 'Campuran asam kuat berlebih dengan basa lemah selalu menghasilkan larutan penyangga.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Larutan penyangga dapat mempertahankan pH dari penambahan sedikit asam, basa, atau pengenceran.' },
          { id: 'B', label: 'B', text: 'Nilai pH larutan buffer selalu bernilai tepat netral (pH = 7,0).' },
          { id: 'C', label: 'C', text: 'Penambahan asam kuat akan menaikkan konsentrasi basa konjugasi dalam sistem.' },
          { id: 'D', label: 'D', text: 'Komponen buffer hanya bekerja aktif jika dipanaskan pada suhu di atas 100 derajat Celcius.' },
          { id: 'E', label: 'E', text: 'Garam netral seperti NaCl dapat berfungsi sebagai penyangga cairan ekstraseluler.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'Buffer asam: $[\\text{H}^+] = K_a \\cdot (\\text{mol asam}/\\text{mol basa konjugasi})$. Meredam fluktuasi pH.'
      }
    ]
  },
  Biologi: {
    defaultChapters: ['Metabolisme Sel (Enzim & Respirasi)', 'Genetika & Hereditas Mendel', 'Bioteknologi Modern', 'Sistem Imun & Pertahanan Tubuh', 'Ekologi & Daur Biogeokimia'],
    subtopics: [
      {
        title: 'Respirasi Seluler & Fosforilasi Oksidatif',
        premise: 'Katabolisme satu molekul glukosa melalui empat tahapan berurutan: Glikolisis, Dekarboksilasi Oksidatif, Siklus Krebs, dan Rantai Transpor Elektron yang berlangsung di mitokondria.',
        calculationPrompt: 'Dalam proses respirasi aerobik satu molekul glukosa, dihasilkan 10 molekul NADH dan 2 molekul FADH2. Jika 1 NADH menghasilkan 3 ATP dan 1 FADH2 menghasilkan 2 ATP melalui kemiosmosis, berapakah total ATP yang dihasilkan dari rantai transpor elektron tersebut?',
        numVal: 34,
        calcSteps: '$\\text{ATP dari NADH} = 10 \\times 3 = 30$. $\\text{ATP dari FADH}_2 = 2 \\times 2 = 4$. $\\text{Total ATP} = 30 + 4 = 34\\text{ ATP}$.',
        causeStatement: 'Oksigen molekuler ($\text{O}_2$) bertindak sebagai akseptor elektron terakhir pada rantai transpor elektron respirasi aerob.',
        causeReason: 'Oksigen memiliki afinitas elektron yang sangat tinggi dan bergabung dengan ion $\\text{H}^+$ untuk membentuk molekul air ($\\text{H}_2\\text{O}$).',
        causeKey: 'A',
        statements: [
          { text: 'Glikolisis berlangsung di sitosol tanpa memerlukan keberadaan gas oksigen bebas.', correct: true },
          { text: 'Siklus Krebs menghasilkan asam laktat sebagai produk sampingan metabolisme aerob.', correct: false },
          { text: 'Gradien proton antar membran mitokondria menggerakkan enzim ATP sintase untuk memproduksi ATP.', correct: true },
          { text: 'Pada respirasi anaerob fermentasi alkohol, akseptor elektron terakhir adalah oksigen murni.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Transpor elektron menghasilkan jumlah ATP terbanyak melalui pembentukan gradien elektrokimia proton.' },
          { id: 'B', label: 'B', text: 'Glikolisis menghasilkan molekul asetil Ko-A secara langsung di dalam krista mitokondria.' },
          { id: 'C', label: 'C', text: 'Fermentasi asam laktat menghasilkan jumlah energi yang lebih banyak daripada respirasi aerobik.' },
          { id: 'D', label: 'D', text: 'Siklus Krebs tidak menghasilkan molekul pembawa elektron berenergi tinggi NADH.' },
          { id: 'E', label: 'E', text: 'Oksigen diperlukan pada tahap awal glikolisis untuk memecah cincin heksosa glukosa.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'Respirasi aerob menghasilkan energi maksimal (36-38 ATP) dengan oksigen sebagai akseptor elektron terakhir.'
      }
    ]
  },
  Matematika: {
    defaultChapters: ['Turunan & Integral Fungsi', 'Vektor & Geometri Ruang Tiga Dimensi', 'Transformasi Geometri', 'Peluang & Kombinatorika', 'Matriks & Sistem Persamaan'],
    subtopics: [
      {
        title: 'Aplikasi Turunan Fungsi & Nilai Maksimum/Minimum',
        premise: 'Sebuah fungsi kontinu $f(x) = 2x^3 - 9x^2 + 12x + 5$ didefinisikan pada interval tertutup. Nilai stasioner tercapai ketika turunan pertama $f\'(x) = 0$.',
        calculationPrompt: 'Tentukan absis titik stasioner minimum relatif dari kurva fungsi kuadratik/polinomial $f(x) = x^2 - 8x + 15$. Berapakah nilai $x$ yang menyebabkan fungsi mencapai nilai minimum tersebut?',
        numVal: 4,
        calcSteps: '$f\'(x) = 2x - 8 = 0 \\implies 2x = 8 \\implies x = 4$. Turunan kedua $f\'\'(4) = 2 > 0$ (titik minimum).',
        causeStatement: 'Suatu titik stasioner $x = c$ merupakan titik balik maksimum jika nilai turunan kedua $f\'\'(c) < 0$.',
        causeReason: 'Nilai turunan kedua yang negatif menandakan bahwa kelengkungan kurva menghadap ke bawah (cekung ke bawah) di sekitar titik tersebut.',
        causeKey: 'A',
        statements: [
          { text: 'Titik stasioner suatu fungsi mulus tercapai saat gradien garis singgung $f\'(x) = 0$.', correct: true },
          { text: 'Fungsi $f(x)$ selalu monoton naik pada interval di mana $f\'(x) < 0$.', correct: false },
          { text: 'Garis singgung pada kurva di titik stasioner berarah horizontal sejajar sumbu X.', correct: true },
          { text: 'Jika $f\'\'(x) = 0$, maka titik tersebut pasti merupakan titik belok tanpa perlu uji tanda.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Kurva mencapai titik ekstrem lokal saat turunan pertama bernilai nol dan terjadi pergantian tanda gradien.' },
          { id: 'B', label: 'B', text: 'Nilai turunan pertama selalu bernilai positif di setiap titik pada interval kurva mana pun.' },
          { id: 'C', label: 'C', text: 'Garis singgung kurva tegak lurus sumbu X pada setiap titik stasioner yang terdefinisi.' },
          { id: 'D', label: 'D', text: 'Kecekungan kurva tidak memiliki hubungan matematis dengan turunan kedua fungsi.' },
          { id: 'E', label: 'E', text: 'Titik belok selalu berimpit dengan titik stasioner bernilai ekstrem global.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'Stasioner: $f\'(x) = 0$. Jenis ekstrem ditentukan turunan kedua: $f\'\'(c) < 0$ (maksimum), $f\'\'(c) > 0$ (minimum).'
      },
      {
        title: 'Kaidah Pencacahan & Peluang Bersyarat',
        premise: 'Dari suatu kelas berisi 15 siswa laki-laki dan 10 siswa perempuan, akan dipilih delegasi tim cerdas cermat yang terdiri dari 3 orang perwakilan.',
        calculationPrompt: 'Dalam sebuah kotak terdapat 5 bola merah dan 3 bola biru. Jika diambil 2 bola secara acak sekaligus, ada berapakah total kombinasi ruang sampel pemilihan 2 bola tersebut ($C(8, 2)$)?',
        numVal: 28,
        calcSteps: '$C(8, 2) = \\frac{8 \\times 7}{2 \\times 1} = \\frac{56}{2} = 28$.',
        causeStatement: 'Peluang komplemen suatu kejadian $A$ selalu memenuhi relasi $P(A^c) = 1 - P(A)$.',
        causeReason: 'Kejadian $A$ dan komplemennya $A^c$ saling lepas (mutually exclusive) serta gabungannya mencakup seluruh ruang sampel semesta.',
        causeKey: 'A',
        statements: [
          { text: 'Rumus kombinasi $C(n, k)$ digunakan ketika urutan pemilihan unsur tidak diperhatikan.', correct: true },
          { text: 'Nilai peluang suatu peristiwa dapat bernilai negatif jika peristiwa tersebut mustahil terjadi.', correct: false },
          { text: 'Dua kejadian $A$ dan $B$ dikatakan saling bebas jika $P(A \\cap B) = P(A) \\cdot P(B)$.', correct: true },
          { text: 'Permutasi siklis dari $n$ unsur yang melingkar dirumuskan dengan $P = n!$.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Kombinasi mengabaikan urutan susunan, sedangkan permutasi memperhitungkan urutan posisi.' },
          { id: 'B', label: 'B', text: 'Peluang suatu kejadian dapat bernilai lebih besar dari satu pada kondisi ideal.' },
          { id: 'C', label: 'C', text: 'Dua kejadian saling lepas jika irisan probabilitas keduanya bernilai satu.' },
          { id: 'D', label: 'D', text: 'Frekuensi harapan dihitung dengan membagi total percobaan dengan nilai peluang teoritis.' },
          { id: 'E', label: 'E', text: 'Peluang bersyarat P(A|B) selalu identik dengan peluang gabungan P(A U B).' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'Kombinasi tanpa urutan: $C(n, r) = n! / [r!(n-r)!]$. Peluang kejadian bernilai dalam rentang $[0, 1]$.'
      }
    ]
  },
  Ekonomi: {
    defaultChapters: ['Kebijakan Moneter & Fiskal', 'Pendapatan Nasional & APBN', 'Perdagangan Internasional', 'Pasar Modal & Badan Usaha', 'Manajemen & Akuntansi'],
    subtopics: [
      {
        title: 'Kebijakan Moneter Bank Sentral dalam Mengendalikan Inflasi',
        premise: 'Ketika laju inflasi domestik meningkat melampaui target, Bank Sentral (Bank Indonesia) menerapkan kebijakan moneter kontraktif (tight money policy) untuk menjaga stabilitas makroekonomi.',
        calculationPrompt: 'Jika pendapatan nasional suatu negara $Y = 5.000$ triliun dan konsumsi otonom $C_0 = 500$ triliun dengan Marginal Propensity to Consume ($MPC$) sebesar 0,75, berapakah besar nilai konsumsi masyarakat total $C$ dalam triliun rupiah?',
        numVal: 4250,
        calcSteps: '$C = C_0 + MPC \\cdot Y = 500 + (0{,}75 \\times 5000) = 500 + 3750 = 4250\\text{ triliun rupiah}$.',
        causeStatement: 'Penaikan tingkat suku bunga acuan (BI Rate) efektif dalam meredam tekanan inflasi permintaan (demand-pull inflation).',
        causeReason: 'Suku bunga acuan yang tinggi menstimulasi masyarakat untuk menabung dan menaikkan biaya kredit perbankan, sehingga mengurangi jumlah uang beredar di masyarakat.',
        causeKey: 'A',
        statements: [
          { text: 'Operasi pasar terbuka dengan menjual Sertifikat Bank Indonesia (SBI) bertujuan menyerap likuiditas uang beredar.', correct: true },
          { text: 'Penaikan giro wajib minimum (GWM) perbankan akan meningkatkan kapasitas bank umum dalam menyalurkan kredit.', correct: false },
          { text: 'Kebijakan diskonto dilakukan dengan menaikkan atau menurunkan suku bunga pinjaman bank sentral kepada bank umum.', correct: true },
          { text: 'Inflasi dorongan biaya (cost-push inflation) terjadi semata-mata karena lonjakan penawaran agregat barang di pasar.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Menjual obligasi pemerintah dan menaikkan suku bunga acuan mengurangi jumlah uang beredar untuk menekan inflasi.' },
          { id: 'B', label: 'B', text: 'Menurunkan giro wajib minimum perbankan adalah instrumen utama kebijakan kontraktif.' },
          { id: 'C', label: 'C', text: 'Pemberian subsidi barang konsumsi merupakan instrumen moneter langsung dari bank sentral.' },
          { id: 'D', label: 'D', text: 'Kebijakan moneter ekspansif dilakukan dengan menaikkan pajak penghasilan badan usaha.' },
          { id: 'E', label: 'E', text: 'Tingkat diskonto yang rendah akan menurunkan minat perbankan untuk meminjam likuiditas.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'Kebijakan moneter ketat: Naikkan BI Rate, jual SBN/SBI, naikkan GWM $\\rightarrow$ uang beredar turun $\\rightarrow$ inflasi terkendali.'
      }
    ]
  },
  Sosiologi: {
    defaultChapters: ['Perubahan Sosial & Globalisasi', 'Konflik Sosial & Integrasi', 'Stratifikasi & Diferensiasi Sosial', 'Penelitian Sosial', 'Kearifan Lokal'],
    subtopics: [
      {
        title: 'Dampak Perubahan Sosial & Modernisasi terhadap Nilai Budaya',
        premise: 'Transformasi masyarakat agraris tradisional menuju tatanan industri digital memicu pergeseran struktur kekerabatan gotong royong menuju pola relasi individualis rasional di wilayah perkotaan.',
        calculationPrompt: 'Dalam sebuah survei sosiologis terhadap 200 responden warga kota, tercatat 140 responden mengadopsi transaksi pembayaran non-tunai digital. Berapakah persentase tingkat adopsi inovasi teknologi keuangan tersebut?',
        numVal: 70,
        calcSteps: '$\\text{Persentase} = \\frac{140}{200} \\times 100\\% = 70\\%$.',
        causeStatement: 'Cultural lag (ketertinggalan budaya) sering memicu ketegangan sosial dan disorganisasi nilai di masyarakat modern.',
        causeReason: 'Laju perkembangan unsur budaya material (teknologi dan sarana fisik) bergerak jauh lebih pesat daripada penyesuaian budaya non-material (norma, etika, dan hukum).',
        causeKey: 'A',
        statements: [
          { text: 'Cultural lag didefinisikan oleh William F. Ogburn sebagai kesenjangan adaptasi antara budaya materiil dan immateriil.', correct: true },
          { text: 'Globalisasi selalu menghasilkan homogenisasi kebudayaan tanpa adanya resistensi kearifan lokal.', correct: false },
          { text: 'Anomi sosial terjadi ketika norma-norma lama memudar sebelum terbentuknya norma keteraturan yang baru.', correct: true },
          { text: 'Masyarakat paguyuban (gemeinschaft) dicirikan oleh relasi kontraktual berorientasi pamrih ekonomi.', correct: false }
        ],
        options: [
          { id: 'A', label: 'A', text: 'Ketidakseimbangan laju perkembangan antara kemajuan teknologi fisik dan kesiapan norma moral memicu cultural lag.' },
          { id: 'B', label: 'B', text: 'Seluruh lapisan masyarakat mengalami kecepatan perubahan sosial yang seragam tanpa konflik.' },
          { id: 'C', label: 'C', text: 'Westernisasi identik mutlak dengan modernisasi dalam kajian sosiologi kritis.' },
          { id: 'D', label: 'D', text: 'Disintegrasi sosial merupakan tujuan utama dari proses difusi kebudayaan.' },
          { id: 'E', label: 'E', text: 'Nilai kearifan lokal tidak memiliki relevansi dalam menyaring penetrasi budaya asing.' }
        ],
        correctKey: 'A',
        multiKeys: ['A', 'C'],
        conceptSummary: 'William F. Ogburn mengemukakan cultural lag: Budaya materiil melesat cepat sementara budaya non-materiil tertinggal.'
      }
    ]
  }
};

export function generateSmartQuestionsFallback(params: FallbackParams): Question[] {
  const {
    subject = 'Fisika',
    grade = '11',
    major = 'MIPA',
    chapter = 'Konsep Pokok',
    examType = 'Sumatif Tengah Semester (STS / PTS)',
    difficulty = 'Sedang',
    count = 3,
    questionFormat = 'multiple_choice',
    mediaType = 'text_only',
    minWordCount = 0,
    aiEngine = 'gemini',
  } = params;

  const validCount = Math.max(1, Math.min(10, count));
  const cleanSubject = (subject || 'Fisika').trim();
  const matchedKnowledge = SUBJECT_KNOWLEDGE[cleanSubject] || SUBJECT_KNOWLEDGE['Fisika'];
  const subtopics = matchedKnowledge.subtopics;

  const results: Question[] = [];

  for (let i = 0; i < validCount; i++) {
    const subtopic = subtopics[i % subtopics.length];
    const subChapter = chapter.trim() ? `${chapter} (Sub-fokus: ${subtopic.title})` : subtopic.title;
    const id = `sma-auto-${Date.now()}-${i + 1}`;
    const subtestId = `sma_${cleanSubject.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
    const subtestName = `${cleanSubject} SMA`;
    const category = major === 'MIPA' ? 'SMA_MIPA' : major === 'IPS' ? 'SMA_IPS' : 'SMA_UMUM';

    // Distinct stimulus construction
    let stimulus = `Wacana Akademik ${cleanSubject} Kelas ${grade} (${subtopic.title}):\n${subtopic.premise}`;
    let stimulusTitle: string | undefined = `Konteks Kajian: ${subtopic.title}`;
    let stimulusImage: string | undefined = undefined;
    let stimulusAudio: string | undefined = undefined;

    if (mediaType === 'with_image') {
      stimulusImage = i % 2 === 0 
        ? 'https://images.unsplash.com/photo-1636466497217-26a8cbeaf0aa?auto=format&fit=crop&w=600&q=80'
        : 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=600&q=80';
      stimulus = `Perhatikan gambar bagan ilustrasi eksperimen dan data observasi ${subtopic.title} di bawah ini untuk menjawab butir soal.`;
    } else if (mediaType === 'with_chart_curve') {
      const x1 = 2 + i;
      const y1 = (x1 * 5).toFixed(1);
      const x2 = x1 + 3;
      const y2 = (x2 * 5).toFixed(1);
      stimulusTitle = `Kurva Hubungan Parameter: ${subtopic.title}`;
      stimulus = `Perhatikan grafik profil perubahan variabel pada fenomena ${subChapter}:\n` +
        `Data Pengamatan: Titik A ($X_1 = ${x1}$, $Y_1 = ${y1}$), Titik B ($X_2 = ${x2}$, $Y_2 = ${y2}$). ` +
        `Grafik memperlihatkan dinamika respon sistem dengan karakteristik linearitas terukur terhadap parameter bebas.`;
    } else if (mediaType === 'with_audio') {
      stimulusTitle = `Transkrip Audio Pembelajaran: ${subtopic.title}`;
      stimulusAudio = 'https://actions.google.com/sounds/v1/science/morse_code.ogg';
      stimulus = `Dengarkan rekaman narasi penjelasan guru mengenai prinsip dasar ${subtopic.title} berikut secara saksama untuk menjawab pertanyaan.`;
    }

    // Format specific generation
    if (questionFormat === 'complex_multiple_choice') {
      // Pilihan Ganda Kompleks (Benar / Salah) - MUST NOT have options A-E!
      const statements = subtopic.statements.map((stmt, sIdx) => ({
        id: `stmt${sIdx + 1}`,
        text: stmt.text,
        correctAnswer: stmt.correct,
      }));

      const correctAnswersObj: Record<string, boolean> = {};
      statements.forEach((s) => {
        correctAnswersObj[s.id] = s.correctAnswer;
      });

      results.push({
        id,
        subtestId,
        subtestName,
        category,
        grade: grade as SmaGrade,
        major: major as SmaMajor,
        subject: cleanSubject,
        chapter: subChapter,
        examType: examType as any,
        type: 'complex_multiple_choice',
        stimulusTitle,
        stimulus,
        stimulusImage,
        stimulusAudio,
        questionText: `Berdasarkan wacana kajian ${subtopic.title} (${cleanSubject} Kelas ${grade}), tentukan apakah masing-masing pernyataan berikut bernilai BENAR atau SALAH!`,
        complexStatements: statements,
        correctAnswer: correctAnswersObj,
        explanation: {
          summary: `Evaluasi kebenaran pernyataan pada topik ${subtopic.title}: Pernyataan 1 (${statements[0]?.correctAnswer ? 'BENAR' : 'SALAH'}), Pernyataan 2 (${statements[1]?.correctAnswer ? 'BENAR' : 'SALAH'}), Pernyataan 3 (${statements[2]?.correctAnswer ? 'BENAR' : 'SALAH'}).`,
          steps: statements.map((s, idx) => `Pernyataan ${idx + 1}: ${s.correctAnswer ? 'Terbukti BENAR selaras dengan hukum dasar materi.' : 'SALAH karena mengabaikan batasan fisis/konseptual sistem.'}`),
          concept: subtopic.conceptSummary,
          fastTrick: 'Perhatikan kata-kata generalisasi mutlak ("selalu", "tanpa terkecuali") yang umumnya mengindikasikan pernyataan keliru.',
        },
        difficulty: difficulty as DifficultyLevel,
        irtWeight: difficulty === 'HOTS' ? 95 : 85,
        topic: subChapter,
        isUserCreated: true,
        aiEngine: aiEngine as any,
        createdAt: new Date().toISOString(),
      });
    } else if (questionFormat === 'short_numeric') {
      // Isian Singkat (Angka Pasti / Kata Singkat) - Tanpa Opsi A-E
      const numericVal = subtopic.numVal + i * 5;
      const qText = `${subtopic.calculationPrompt} (Tuliskan jawaban akhir dalam bentuk angka pasti atau kata singkat)`;

      results.push({
        id,
        subtestId,
        subtestName,
        category,
        grade: grade as SmaGrade,
        major: major as SmaMajor,
        subject: cleanSubject,
        chapter: subChapter,
        examType: examType as any,
        type: 'short_numeric',
        stimulusTitle,
        stimulus,
        stimulusImage,
        stimulusAudio,
        questionText: qText,
        correctAnswer: String(numericVal),
        explanation: {
          summary: `Hasil perhitungan numerik untuk ${subtopic.title}: Diperoleh nilai sebesar ${numericVal}.`,
          steps: [
            'Langkah 1: Tuliskan besaran yang diketahui dari premis soal.',
            `Langkah 2: Terapkan rumus: ${subtopic.calcSteps}`,
            `Langkah 3: Diperoleh nilai akhir sebesar ${numericVal}.`,
          ],
          concept: subtopic.conceptSummary,
          fastTrick: 'Sederhanakan pecahan sebelum mengalikan nilai variabel.',
        },
        difficulty: difficulty as DifficultyLevel,
        irtWeight: difficulty === 'HOTS' ? 90 : 80,
        topic: subChapter,
        isUserCreated: true,
        aiEngine: aiEngine as any,
        createdAt: new Date().toISOString(),
      });
    } else if (questionFormat === 'long_essay') {
      // Isian Panjang / Soal Uraian Komprehensif
      const targetMinWords = Number(minWordCount) > 0 ? Number(minWordCount) : 50;
      const qText = `Jelaskan secara komprehensif, runtut, dan kritis analisis Anda mengenai konsep pokok pada materi ${subtopic.title} (${cleanSubject} Kelas ${grade}) serta analisis implikasi pentingnya dalam menyelesaikan permasalahan nyata! (Ketentuan: Tuliskan jawaban penjelasan secara mendalam dengan minimal ${targetMinWords} kata).`;

      const essayAnswer = `Prinsip dasar pada materi ${subtopic.title} dalam bidang ${cleanSubject} menjelaskan keterkaitan fisis dan sistemik antar variabel yang saling mempengaruhi secara teratur. Dalam aplikasi kehidupan sehari-hari dan teknologi terapan, pemahaman komprehensif mengenai konsep ini sangat krusial untuk mengoptimalkan efisiensi energi, memprediksi respon dinamik sistem, dan mencegah kegagalan struktural. Analisis mendalam menunjukkan bahwa pemenuhan hukum keteraturan serta pembatasan kondisi batas menjadi prasyarat mutlak keberhasilan penerapan teori ini di lapangan.`;

      results.push({
        id,
        subtestId,
        subtestName,
        category,
        grade: grade as SmaGrade,
        major: major as SmaMajor,
        subject: cleanSubject,
        chapter: subChapter,
        examType: examType as any,
        type: 'long_essay',
        minWordCount: targetMinWords,
        stimulusTitle,
        stimulus,
        stimulusImage,
        stimulusAudio,
        questionText: qText,
        correctAnswer: essayAnswer,
        explanation: {
          summary: `Jawaban esai panjang harus menguraikan definisi esensial, hukum pengatur, dan analisis aplikasi praktis dengan memenuhi ketentuan batas minimal ${targetMinWords} kata.`,
          steps: [
            'Aspek 1 (Konseptual): Paparkan landasan teoretis dan definisi konsep secara terstruktur.',
            'Aspek 2 (Analisis & Pembuktian): Jelaskan hubungan sebab-akibat antar parameter materi.',
            'Aspek 3 (Kontekstual & Solusi): Berikan contoh kontekstual atau implementasi nyata.',
            `Aspek 4 (Kerapian & Kuantitas): Pastikan panjang uraian mencapai minimal ${targetMinWords} kata.`
          ],
          concept: subtopic.conceptSummary,
          fastTrick: 'Gunakan paragraf pembuka definisi, badan argumen ilmiah, dan kesimpulan sintesis.',
        },
        difficulty: difficulty as DifficultyLevel,
        irtWeight: difficulty === 'HOTS' ? 95 : 85,
        topic: subChapter,
        isUserCreated: true,
        aiEngine: aiEngine as any,
        createdAt: new Date().toISOString(),
      });
    } else if (questionFormat === 'cause_reason') {
      // Sebab Akibat (Pernyataan dan Alasan)
      const qText = `Petunjuk Soal Sebab-Akibat (UTBK):\n\nPERNYATAAN:\n${subtopic.causeStatement}\n\nSEBAB\n\nALASAN:\n${subtopic.causeReason}`;
      
      const standardCauseOptions = [
        { id: 'A', label: 'A', text: 'Pernyataan BENAR, Alasan BENAR, dan keduanya menunjukkan hubungan sebab akibat.' },
        { id: 'B', label: 'B', text: 'Pernyataan BENAR, Alasan BENAR, tetapi keduanya TIDAK menunjukkan hubungan sebab akibat.' },
        { id: 'C', label: 'C', text: 'Pernyataan BENAR dan Alasan SALAH.' },
        { id: 'D', label: 'D', text: 'Pernyataan SALAH dan Alasan BENAR.' },
        { id: 'E', label: 'E', text: 'Pernyataan dan Alasan keduanya SALAH.' },
      ];

      results.push({
        id,
        subtestId,
        subtestName,
        category,
        grade: grade as SmaGrade,
        major: major as SmaMajor,
        subject: cleanSubject,
        chapter: subChapter,
        examType: examType as any,
        type: 'cause_reason',
        stimulusTitle,
        stimulus,
        stimulusImage,
        stimulusAudio,
        questionText: qText,
        options: standardCauseOptions,
        correctAnswer: subtopic.causeKey,
        explanation: {
          summary: `Kunci ${subtopic.causeKey}: Pernyataan terbukti BENAR dan kalimat Alasan juga BENAR serta menjelaskan kausalitas langsung mengapa pernyataan tersebut terjadi.`,
          steps: [
            'Langkah 1: Uji kebenaran kalimat PERNYATAAN secara teoretis.',
            'Langkah 2: Uji kebenaran kalimat ALASAN secara independen.',
            'Langkah 3: Sambungkan keduanya dengan kata hubung "karena" untuk membuktikan relasi kausalitas.',
          ],
          concept: subtopic.conceptSummary,
          fastTrick: 'Gunakan kata "karena" di antara pernyataan dan alasan; jika kalimat berpadu logis dan hukum ilmiah terpenuhi, pilih A.',
        },
        difficulty: difficulty as DifficultyLevel,
        irtWeight: difficulty === 'HOTS' ? 95 : 85,
        topic: subChapter,
        isUserCreated: true,
        aiEngine: aiEngine as any,
        createdAt: new Date().toISOString(),
      });
    } else if (questionFormat === 'multi_select_choice') {
      // Pilihan Ganda Banyak Jawaban
      results.push({
        id,
        subtestId,
        subtestName,
        category,
        grade: grade as SmaGrade,
        major: major as SmaMajor,
        subject: cleanSubject,
        chapter: subChapter,
        examType: examType as any,
        type: 'multi_select_choice',
        stimulusTitle,
        stimulus,
        stimulusImage,
        stimulusAudio,
        questionText: `Berdasarkan kajian materi ${subtopic.title} (${cleanSubject} Kelas ${grade}), manakah pernyataan di bawah ini yang BENAR? (Pilihlah lebih dari satu jawaban yang sesuai)`,
        options: subtopic.options,
        correctAnswer: subtopic.multiKeys,
        explanation: {
          summary: `Pilihan yang benar adalah opsi ${subtopic.multiKeys.join(' dan ')} karena memenuhi kaidah konsep fundamental materi ${subtopic.title}.`,
          steps: [
            'Langkah 1: Telaah setiap premis pada pilihan A sampai E.',
            `Langkah 2: Opsi ${subtopic.multiKeys.join(', ')} selaras dengan postulat dan hukum dasar ilmiah.`,
            'Langkah 3: Opsi lainnya terbukti keliru karena memuat kontradiksi atau distorsi besaran.',
          ],
          concept: subtopic.conceptSummary,
          fastTrick: 'Uji tiap opsi secara mandiri; tandai opsi yang benar tanpa terpaku hanya memilih satu jawaban.',
        },
        difficulty: difficulty as DifficultyLevel,
        irtWeight: difficulty === 'HOTS' ? 95 : 85,
        topic: subChapter,
        isUserCreated: true,
        aiEngine: aiEngine as any,
        createdAt: new Date().toISOString(),
      });
    } else {
      // Standard Multiple Choice (Single Correct Answer)
      // Vary the correct keys across questions: A, B, C, D, E
      const answerKeys = ['A', 'B', 'C', 'D', 'E'];
      const targetKey = answerKeys[i % answerKeys.length];

      // Re-map options so the correct one aligns with targetKey
      const baseOptions = [...subtopic.options];
      const correctOptIndex = baseOptions.findIndex((o) => o.id === subtopic.correctKey);
      const targetIndex = answerKeys.indexOf(targetKey);

      if (correctOptIndex !== -1 && correctOptIndex !== targetIndex && targetIndex < baseOptions.length) {
        // Swap contents
        const tempText = baseOptions[targetIndex].text;
        baseOptions[targetIndex].text = baseOptions[correctOptIndex].text;
        baseOptions[correctOptIndex].text = tempText;
      }

      results.push({
        id,
        subtestId,
        subtestName,
        category,
        grade: grade as SmaGrade,
        major: major as SmaMajor,
        subject: cleanSubject,
        chapter: subChapter,
        examType: examType as any,
        type: 'multiple_choice',
        stimulusTitle,
        stimulus,
        stimulusImage,
        stimulusAudio,
        questionText: `Pada pokok bahasan ${subtopic.title} (${cleanSubject} Kelas ${grade}), manakah pernyataan berikut yang paling tepat sesuai dengan kaidah ilmiah dan analisis kurikulum?`,
        options: baseOptions,
        correctAnswer: targetKey,
        explanation: {
          summary: `Kunci jawaban ${targetKey} merupakan pilihan yang paling valid dan akurat sesuai kaidah materi ${subtopic.title}.`,
          steps: [
            `Langkah 1: Identifikasi sub-konsep soal yaitu ${subtopic.title}.`,
            `Langkah 2: Tinjau tiap opsi jawaban dan eliminasi opsi yang menyimpang dari kaidah.`,
            `Langkah 3: Opsi ${targetKey} terbukti merupakan representasi hukum ilmiah yang tepat.`,
          ],
          concept: subtopic.conceptSummary,
          fastTrick: 'Eliminasi opsi yang menggunakan kata-kata generalisasi mutlak tanpa bukti kontekstual.',
        },
        difficulty: difficulty as DifficultyLevel,
        irtWeight: difficulty === 'HOTS' ? 90 : difficulty === 'Sulit' ? 85 : 75,
        topic: subChapter,
        isUserCreated: true,
        aiEngine: aiEngine as any,
        createdAt: new Date().toISOString(),
      });
    }
  }

  return results;
}
