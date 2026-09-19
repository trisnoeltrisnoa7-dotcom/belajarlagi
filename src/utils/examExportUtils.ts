import { ExamPackage, Question } from '../types';
import { ALL_MOCK_QUESTIONS } from '../data/mockQuestions';
import { INITIAL_SMA_QUESTIONS } from '../data/mockSmaData';

/**
 * Normalizes and resolves all questions for a given package.
 * If pkg.questions is empty, attempts to resolve from mock questions or subtests.
 */
export function resolvePackageQuestions(pkg: ExamPackage): Question[] {
  if (pkg.questions && pkg.questions.length > 0) {
    return pkg.questions;
  }

  // Fallback: look up by subtest ids or category
  const allAvailable = [...ALL_MOCK_QUESTIONS, ...INITIAL_SMA_QUESTIONS];
  if (pkg.subtests && pkg.subtests.length > 0) {
    const subtestIds = pkg.subtests.map((s) => s.id);
    const matched = allAvailable.filter((q) => subtestIds.includes(q.subtestId));
    if (matched.length > 0) return matched;
  }

  if (pkg.subject) {
    const matched = allAvailable.filter(
      (q) => q.subject?.toLowerCase() === pkg.subject?.toLowerCase()
    );
    if (matched.length > 0) return matched;
  }

  return [];
}

/**
 * Formats question type into friendly Indonesian label
 */
export function formatQuestionTypeLabel(type?: string): string {
  switch (type) {
    case 'multiple_choice':
      return 'Pilihan Ganda (1 Jawaban Benar)';
    case 'multi_select_choice':
      return 'Pilihan Ganda Banyak Jawaban';
    case 'complex_multiple_choice':
      return 'Pilihan Ganda Kompleks (Benar / Salah)';
    case 'short_numeric':
      return 'Isian Singkat / Angka';
    case 'long_essay':
      return 'Isian Panjang / Uraian';
    case 'cause_reason':
      return 'Sebab Akibat (Pernyataan & Alasan)';
    default:
      return 'Pilihan Ganda';
  }
}

/**
 * Formats correct answer representation into printable string
 */
export function formatCorrectAnswerText(q: Question): string {
  if (Array.isArray(q.correctAnswer)) {
    return q.correctAnswer.join(', ');
  }
  if (typeof q.correctAnswer === 'object' && q.correctAnswer !== null) {
    return Object.entries(q.correctAnswer)
      .map(([key, val]) => {
        const stmt = q.complexStatements?.find((s) => s.id === key);
        const label = stmt ? stmt.text.substring(0, 30) + '...' : key;
        return `${label}: ${val ? 'BENAR' : 'SALAH'}`;
      })
      .join(' | ');
  }
  return String(q.correctAnswer ?? '-');
}

/**
 * Triggers a client-side file download for the given Blob and filename.
 */
export function triggerFileDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Generates a clean, safe filename from package/subject title
 */
export function generateSafeFileName(title: string, extension: string): string {
  const sanitized = title
    .replace(/[^\w\s-]/gi, '')
    .trim()
    .replace(/\s+/g, '_')
    .substring(0, 60);
  const dateStr = new Date().toISOString().split('T')[0];
  return `Soal_${sanitized}_${dateStr}.${extension}`;
}

// ============================================================================
// 1. EXPORT TO TXT
// ============================================================================
export function downloadPackageAsTxt(pkg: ExamPackage, customSchoolName?: string): void {
  const questions = resolvePackageQuestions(pkg);
  const school = customSchoolName || pkg.schoolName || 'SMAN 19 BANDUNG';
  
  let txt = `===============================================================================\n`;
  txt += `                      ${school.toUpperCase()}\n`;
  txt += `              NASKAH BANK SOAL & LEMBAR UJIAN CBT\n`;
  txt += `===============================================================================\n\n`;
  
  txt += `INFORMASI PAKET UJIAN:\n`;
  txt += `• Judul Paket      : ${pkg.title}\n`;
  txt += `• Mata Pelajaran   : ${pkg.subject || 'Semua Subtes'}\n`;
  txt += `• Kelas / Jurusan  : Kelas ${pkg.grade || '10/11/12'} ${pkg.major || 'Semua Jurusan'}\n`;
  txt += `• Jenis Ujian      : ${pkg.examType || pkg.badge || 'Simulasi Ujian'}\n`;
  txt += `• Alokasi Waktu    : ${pkg.durationMinutes} Menit\n`;
  txt += `• Jumlah Butir Soal: ${questions.length} Soal\n`;
  txt += `• Nilai KKM        : ${pkg.kkmScore || 75}\n`;
  txt += `• Tanggal Export   : ${new Date().toLocaleDateString('id-ID', { dateStyle: 'full' })}\n\n`;
  
  txt += `-------------------------------------------------------------------------------\n`;
  txt += `PETUNJUK PENGERJAAN:\n`;
  txt += `1. Periksa dan bacalah setiap butir soal dengan teliti sebelum menjawab.\n`;
  txt += `2. Soal terdiri dari berbagai bentuk: Pilihan Ganda, Benar/Salah, Isian Singkat, atau Sebab-Akibat.\n`;
  txt += `3. Kunci jawaban dan pembahasan terlampir pada bagian akhir dokumen ini.\n`;
  txt += `-------------------------------------------------------------------------------\n\n`;
  
  txt += `===============================================================================\n`;
  txt += `                              BAGIAN I: LEMBAR SOAL\n`;
  txt += `===============================================================================\n\n`;

  questions.forEach((q, idx) => {
    const no = idx + 1;
    txt += `[SOAL NO. ${no}] (${formatQuestionTypeLabel(q.type)} | Tingkat: ${q.difficulty} | Topik: ${q.topic || q.chapter || '-'})\n`;
    
    if (q.stimulusTitle || q.stimulus) {
      txt += `\n--- BACAAN / STIMULUS ---\n`;
      if (q.stimulusTitle) txt += `Judul: ${q.stimulusTitle}\n`;
      if (q.stimulus) txt += `${q.stimulus}\n`;
      txt += `-------------------------\n`;
    }

    if (q.stimulusImage || q.questionImage) {
      txt += `[Catatan Media: Dilengkapi Gambar/Grafik Visual]\n`;
    }
    if (q.stimulusAudio || q.questionAudio) {
      txt += `[Catatan Media: Dilengkapi Rekaman Audio/Listening]\n`;
    }

    txt += `\nPertanyaan:\n${q.questionText}\n\n`;

    // Render options depending on type
    if (q.type === 'complex_multiple_choice' && q.complexStatements && q.complexStatements.length > 0) {
      txt += `Pernyataan (Tentukan Benar / Salah):\n`;
      q.complexStatements.forEach((stmt, sIdx) => {
        txt += `  [${sIdx + 1}] ${stmt.text}  --> [ BENAR / SALAH ]\n`;
      });
    } else if (q.type === 'short_numeric') {
      txt += `Jawaban Singkat: [ ................................. ]\n`;
    } else if (q.type === 'long_essay') {
      txt += `Lembar Jawaban Uraian / Isian Panjang:\n`;
      txt += `  [ ..................................................................................... ]\n`;
      txt += `  [ ..................................................................................... ]\n`;
      txt += `  [ ..................................................................................... ]\n`;
    } else if (q.options && q.options.length > 0) {
      txt += `Pilihan Jawaban:\n`;
      q.options.forEach((opt) => {
        txt += `  ${opt.label}. ${opt.text}\n`;
      });
    }

    txt += `\n-------------------------------------------------------------------------------\n\n`;
  });

  txt += `\n===============================================================================\n`;
  txt += `                  BAGIAN II: KUNCI JAWABAN & PEMBAHASAN LENGKAP\n`;
  txt += `===============================================================================\n\n`;

  questions.forEach((q, idx) => {
    const no = idx + 1;
    txt += `NO. ${no} | KUNCI JAWABAN: ${formatCorrectAnswerText(q)}\n`;
    txt += `• Topik / Bab     : ${q.topic || q.chapter || '-'}\n`;
    txt += `• Bobot IRT       : ${q.irtWeight || 75}\n`;
    txt += `• Konsep Kunci    : ${q.explanation?.concept || '-'}\n`;
    txt += `• Ringkasan       : ${q.explanation?.summary || '-'}\n`;
    if (q.explanation?.steps && q.explanation.steps.length > 0) {
      txt += `• Langkah Penyelesaian:\n`;
      q.explanation.steps.forEach((step, sIdx) => {
        txt += `    ${sIdx + 1}. ${step}\n`;
      });
    }
    if (q.explanation?.fastTrick) {
      txt += `• Trik Cepat / Tips : ${q.explanation.fastTrick}\n`;
    }
    txt += `\n`;
  });

  txt += `\n===============================================================================\n`;
  txt += `              Dokumen digenerate otomatis oleh CBT System SMAN 19 Bandung\n`;
  txt += `===============================================================================\n`;

  const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
  const filename = generateSafeFileName(pkg.title, 'txt');
  triggerFileDownload(blob, filename);
}

// ============================================================================
// 2. EXPORT TO EXCEL (CSV WITH UTF-8 BOM & PROPER ESCAPING)
// ============================================================================
export function downloadPackageAsExcel(pkg: ExamPackage, customSchoolName?: string): void {
  const questions = resolvePackageQuestions(pkg);
  
  // CSV Header
  const headers = [
    'No',
    'Mata Pelajaran',
    'Kelas',
    'Jurusan',
    'Bab / Topik',
    'Bentuk Soal',
    'Tingkat Kesulitan',
    'Bobot IRT',
    'Judul Stimulus',
    'Teks Wacana / Stimulus',
    'Teks Pertanyaan',
    'Pilihan A',
    'Pilihan B',
    'Pilihan C',
    'Pilihan D',
    'Pilihan E',
    'Kunci Jawaban',
    'Pernyataan Kompleks (Jika Ada)',
    'Konsep Kunci',
    'Ringkasan Pembahasan',
    'Langkah Penyelesaian',
    'Trik Cepat',
  ];

  const escapeCsv = (str?: string | number | null): string => {
    if (str === undefined || str === null) return '""';
    const s = String(str).replace(/"/g, '""');
    return `"${s}"`;
  };

  const rows: string[] = [];
  rows.push(headers.map(escapeCsv).join(','));

  questions.forEach((q, idx) => {
    const no = idx + 1;
    const optA = q.options?.find((o) => o.label === 'A')?.text || '';
    const optB = q.options?.find((o) => o.label === 'B')?.text || '';
    const optC = q.options?.find((o) => o.label === 'C')?.text || '';
    const optD = q.options?.find((o) => o.label === 'D')?.text || '';
    const optE = q.options?.find((o) => o.label === 'E')?.text || '';

    const complexStr = q.complexStatements
      ? q.complexStatements.map((s, i) => `[${i + 1}] ${s.text} (${s.correctAnswer ? 'BENAR' : 'SALAH'})`).join('; ')
      : '';

    const stepsStr = q.explanation?.steps ? q.explanation.steps.join(' | ') : '';

    const row = [
      no,
      q.subject || pkg.subject || 'Umum',
      q.grade || pkg.grade || '11',
      q.major || pkg.major || 'Umum',
      q.topic || q.chapter || '',
      formatQuestionTypeLabel(q.type),
      q.difficulty || 'Sedang',
      q.irtWeight || 75,
      q.stimulusTitle || '',
      q.stimulus || '',
      q.questionText || '',
      optA,
      optB,
      optC,
      optD,
      optE,
      formatCorrectAnswerText(q),
      complexStr,
      q.explanation?.concept || '',
      q.explanation?.summary || '',
      stepsStr,
      q.explanation?.fastTrick || '',
    ];

    rows.push(row.map(escapeCsv).join(','));
  });

  // UTF-8 BOM (\uFEFF) ensures Excel opens Indonesian characters, newlines, and accents cleanly
  const csvContent = '\uFEFF' + rows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const filename = generateSafeFileName(pkg.title, 'csv');
  triggerFileDownload(blob, filename);
}

// ============================================================================
// 3. EXPORT TO WORD (.DOC / .DOCX VIA MS OFFICE XML/HTML CONTAINER)
// ============================================================================
export function downloadPackageAsDocx(pkg: ExamPackage, customSchoolName?: string): void {
  const questions = resolvePackageQuestions(pkg);
  const school = customSchoolName || pkg.schoolName || 'SMAN 19 BANDUNG';
  const schoolAddr = pkg.schoolAddress || 'Jl. Dago Pojok No. 8, Coblong, Kota Bandung, Jawa Barat 40135';

  let html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office" 
      xmlns:w="urn:schemas-microsoft-com:office:word" 
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8">
  <title>${pkg.title}</title>
  <!--[if gte mso 9]>
  <xml>
    <w:WordDocument>
      <w:View>Print</w:View>
      <w:Zoom>100</w:Zoom>
      <w:DoNotOptimizeForBrowser/>
    </w:WordDocument>
  </xml>
  <![endif]-->
  <style>
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 12pt;
      line-height: 1.4;
      color: #000;
      margin: 20mm;
    }
    .kop-header {
      text-align: center;
      border-bottom: 3px double #000;
      padding-bottom: 8px;
      margin-bottom: 16px;
    }
    .kop-header h2 {
      font-size: 14pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
    }
    .kop-header h1 {
      font-size: 16pt;
      font-weight: bold;
      margin: 2px 0;
      text-transform: uppercase;
    }
    .kop-header p {
      font-size: 10pt;
      margin: 0;
      font-style: italic;
    }
    .exam-title-box {
      text-align: center;
      margin-bottom: 16px;
    }
    .exam-title-box h3 {
      font-size: 13pt;
      font-weight: bold;
      margin: 0;
      text-transform: uppercase;
      text-decoration: underline;
    }
    .info-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
      font-size: 11pt;
    }
    .info-table td {
      padding: 3px 6px;
      vertical-align: top;
    }
    .petunjuk-box {
      border: 1px solid #000;
      padding: 8px 12px;
      margin-bottom: 20px;
      font-size: 10.5pt;
      background-color: #f9f9f9;
    }
    .petunjuk-box h4 {
      margin: 0 0 4px 0;
      font-size: 11pt;
      font-weight: bold;
    }
    .petunjuk-box ol {
      margin: 0;
      padding-left: 20px;
    }
    .section-title {
      font-size: 12pt;
      font-weight: bold;
      text-transform: uppercase;
      border-bottom: 1px solid #000;
      padding-bottom: 4px;
      margin-top: 24px;
      margin-bottom: 14px;
    }
    .question-item {
      margin-bottom: 18px;
      page-break-inside: avoid;
    }
    .question-badge {
      font-size: 9.5pt;
      font-weight: bold;
      color: #333;
      margin-bottom: 4px;
    }
    .stimulus-box {
      background-color: #f3f4f6;
      border-left: 3px solid #4f46e5;
      padding: 8px 12px;
      margin: 6px 0 10px 0;
      font-size: 11pt;
    }
    .stimulus-box h5 {
      margin: 0 0 4px 0;
      font-weight: bold;
      color: #1e1b4b;
    }
    .question-text {
      font-size: 11.5pt;
      margin-bottom: 8px;
      text-align: justify;
    }
    .options-table {
      width: 100%;
      border-collapse: collapse;
      margin-left: 10px;
      font-size: 11pt;
    }
    .options-table td {
      padding: 2px 4px;
      vertical-align: top;
    }
    .statements-table {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0;
      font-size: 11pt;
    }
    .statements-table th, .statements-table td {
      border: 1px solid #000;
      padding: 6px 8px;
      text-align: left;
    }
    .statements-table th {
      background-color: #e5e7eb;
      text-align: center;
    }
    .key-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
      font-size: 10.5pt;
    }
    .key-table th, .key-table td {
      border: 1px solid #000;
      padding: 6px;
      text-align: left;
      vertical-align: top;
    }
    .key-table th {
      background-color: #f3f4f6;
      font-weight: bold;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>

  <!-- KOP SURAT RESMI -->
  <div class="kop-header">
    <h2>PEMERINTAH DAERAH PROVINSI JAWA BARAT</h2>
    <h2>DINAS PENDIDIKAN</h2>
    <h1>${school.toUpperCase()}</h1>
    <p>${schoolAddr} • CBT Assessment System UJIANKU</p>
  </div>

  <!-- JUDUL NASKAH -->
  <div class="exam-title-box">
    <h3>NASKAH SOAL UJIAN COMPUTER BASED TEST (CBT)</h3>
    <p style="margin: 3px 0; font-size: 11pt; font-weight: bold;">${pkg.title}</p>
  </div>

  <!-- TABEL IDENTITAS -->
  <table class="info-table">
    <tr>
      <td width="20%"><strong>Mata Pelajaran</strong></td>
      <td width="30%">: ${pkg.subject || 'Semua Subtes'}</td>
      <td width="20%"><strong>Alokasi Waktu</strong></td>
      <td width="30%">: ${pkg.durationMinutes} Menit</td>
    </tr>
    <tr>
      <td><strong>Tingkat / Kelas</strong></td>
      <td>: Kelas ${pkg.grade || '10/11/12'} ${pkg.major || ''}</td>
      <td><strong>Jumlah Soal</strong></td>
      <td>: ${questions.length} Butir</td>
    </tr>
    <tr>
      <td><strong>Jenis Ujian</strong></td>
      <td>: ${pkg.examType || pkg.badge || 'Asesmen CBT'}</td>
      <td><strong>Nilai KKM</strong></td>
      <td>: ${pkg.kkmScore || 75}</td>
    </tr>
  </table>

  <!-- PETUNJUK UMUM -->
  <div class="petunjuk-box">
    <h4>PETUNJUK UMUM:</h4>
    <ol>
      <li>Tulislah nama dan nomor peserta Anda pada lembar kerja ujian.</li>
      <li>Periksa dan bacalah soal-soal dengan teliti sebelum Anda menjawabnya.</li>
      <li>Dahulukan menjawab soal-soal yang Anda anggap mudah.</li>
      <li>Kerjakan dengan jujur, teliti, dan penuh tanggung jawab.</li>
    </ol>
  </div>

  <!-- BAGIAN I: LEMBAR BUTIR SOAL -->
  <div class="section-title">BAGIAN I: BUTIR SOAL</div>

  ${questions
    .map((q, idx) => {
      const no = idx + 1;
      let optionsHtml = '';

      if (q.type === 'complex_multiple_choice' && q.complexStatements && q.complexStatements.length > 0) {
        optionsHtml = `
          <table class="statements-table">
            <thead>
              <tr>
                <th width="8%">No</th>
                <th width="72%">Pernyataan</th>
                <th width="10%">Benar</th>
                <th width="10%">Salah</th>
              </tr>
            </thead>
            <tbody>
              ${q.complexStatements
                .map(
                  (stmt, sIdx) => `
                <tr>
                  <td align="center">${sIdx + 1}</td>
                  <td>${stmt.text}</td>
                  <td align="center">[ &nbsp; ]</td>
                  <td align="center">[ &nbsp; ]</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        `;
      } else if (q.type === 'short_numeric') {
        optionsHtml = `
          <p style="margin-top: 8px; font-style: italic; color: #4b5563;">
            Jawaban Singkat: _____________________________________________
          </p>
        `;
      } else if (q.type === 'long_essay') {
        optionsHtml = `
          <div style="margin-top: 8px; font-style: italic; color: #4b5563;">
            <p style="margin-bottom: 4px;"><strong>Lembar Uraian / Isian Panjang${q.minWordCount ? ` (Minimal ${q.minWordCount} kata)` : ''}:</strong></p>
            <div style="border: 1px dashed #9ca3af; border-radius: 4px; height: 120px; padding: 8px; background: #fafafa;">
              <span style="color: #9ca3af; font-size: 11px;">[ Tuliskan uraian jawaban secara terstruktur, runtut, dan lengkap di sini ]</span>
            </div>
          </div>
        `;
      } else if (q.options && q.options.length > 0) {
        optionsHtml = `
          <table class="options-table">
            ${q.options
              .map(
                (opt) => `
              <tr>
                <td width="4%" valign="top"><strong>${opt.label}.</strong></td>
                <td width="96%" valign="top">${opt.text}</td>
              </tr>
            `
              )
              .join('')}
          </table>
        `;
      }

      const stimulusHtml =
        q.stimulusTitle || q.stimulus
          ? `
        <div class="stimulus-box">
          ${q.stimulusTitle ? `<h5>${q.stimulusTitle}</h5>` : ''}
          ${q.stimulus ? `<p style="margin:0;">${q.stimulus}</p>` : ''}
        </div>
      `
          : '';

      return `
        <div class="question-item">
          <div class="question-badge">
            Soal No. ${no} &nbsp;|&nbsp; Bentuk: ${formatQuestionTypeLabel(q.type)} &nbsp;|&nbsp; Bobot IRT: ${q.irtWeight || 75}
          </div>
          ${stimulusHtml}
          <div class="question-text">
            <strong>${no}.</strong> ${q.questionText}
          </div>
          ${optionsHtml}
        </div>
      `;
    })
    .join('')}

  <!-- PAGE BREAK FOR ANSWER KEY -->
  <div class="page-break"></div>

  <!-- BAGIAN II: LEMBAR KUNCI & PEMBAHASAN -->
  <div class="kop-header">
    <h1>${school.toUpperCase()}</h1>
    <p>LEMBAR KUNCI JAWABAN & PEMBAHASAN RESMI PENDIDIK</p>
  </div>

  <div class="section-title">BAGIAN II: KUNCI JAWABAN & PEMBAHASAN LENGKAP</div>

  <table class="key-table">
    <thead>
      <tr>
        <th width="6%">No</th>
        <th width="14%">Kunci Jawaban</th>
        <th width="20%">Topik / Bab</th>
        <th width="60%">Pembahasan & Langkah Penyelesaian</th>
      </tr>
    </thead>
    <tbody>
      ${questions
        .map((q, idx) => {
          const no = idx + 1;
          const stepsHtml = q.explanation?.steps
            ? `<ol style="margin: 4px 0 0 16px; padding:0;">${q.explanation.steps.map((s) => `<li>${s}</li>`).join('')}</ol>`
            : '';
          const fastTrickHtml = q.explanation?.fastTrick
            ? `<p style="margin: 4px 0 0 0; color: #065f46; font-size: 10pt;"><strong>Tips Cepat:</strong> ${q.explanation.fastTrick}</p>`
            : '';

          return `
          <tr>
            <td align="center"><strong>${no}</strong></td>
            <td><strong style="color: #1e40af; font-size: 11.5pt;">${formatCorrectAnswerText(q)}</strong></td>
            <td>${q.topic || q.chapter || '-'}</td>
            <td>
              <p style="margin:0 0 4px 0;"><strong>Konsep:</strong> ${q.explanation?.concept || '-'}</p>
              <p style="margin:0 0 4px 0;">${q.explanation?.summary || '-'}</p>
              ${stepsHtml}
              ${fastTrickHtml}
            </td>
          </tr>
        `;
        })
        .join('')}
    </tbody>
  </table>

  <p style="margin-top: 30px; text-align: right; font-size: 11pt;">
    Bandung, ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}<br>
    <strong>Guru Pengampu Mata Pelajaran / Tim Kurikulum</strong>
  </p>

</body>
</html>
`;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  const filename = generateSafeFileName(pkg.title, 'doc');
  triggerFileDownload(blob, filename);
}
