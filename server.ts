import express from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '15mb' }));

// Shared Gemini AI Client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// ILP System Instruction for Puskesmas Documents
const ILP_SYSTEM_INSTRUCTION = `Anda adalah Ahli Tata Naskah Dinas dan Tim Akreditasi Puskesmas Kemenkes RI berpengalaman dengan standar Integrasi Layanan Primer (ILP) terbaru (Klaster 1 s/d 5).
Anda membuat dan merapikan dokumen akreditasi Puskesmas sesuai kaidah baku:
1. SOP (Standar Operasional Prosedur):
   - Tabel kotak akreditasi resmi Kemenkes RI
   - 1. Pengertian
   - 2. Tujuan
   - 3. Kebijakan
   - 4. Referensi (Permenkes terbaru, Kepmenkes HK.01.07/MENKES/2015/2023 tentang ILP)
   - 5. Prosedur / Langkah-langkah kerja berurutan dan terinci
   - 6. Diagram Alir (penjelasan alur)
   - 7. Unit / Klaster Terkait
   - 8. Rekaman Historis Perubahan
2. SK (Surat Keputusan Kepala Puskesmas):
   - Judul & Nomor Keputusan
   - Konsiderans: Menimbang (poin a, b, c), Mengingat (UU Kesehatan No 17 Tahun 2023, Permenkes No 43/2019, Regulasi ILP Kemenkes)
   - Diktum MEMUTUSKAN: KESATU, KEDUA, KETIGA, KEEMPAT
   - Lampiran SK jika ada
3. KAK (Kerangka Acuan Kerja):
   - I. Pendahuluan
   - II. Latar Belakang
   - III. Tujuan Umum dan Khusus
   - IV. Kegiatan Pokok dan Rincian Kegiatan (sesuai Klaster ILP)
   - V. Cara Melaksanakan Kegiatan
   - VI. Sasaran
   - VII. Jadwal Pelaksanaan Kegiatan
   - VIII. Evaluasi Pelaksanaan Kegiatan dan Pelaporan
   - IX. Pencatatan, Pelaporan, dan Evaluasi Kegiatan
4. Pedoman / Panduan:
   - Sistematika bab pedoman operasional ILP Puskesmas.

5. PANDUAN EKSEKUSI PROMPT DALAM KURUNG SIKU [...]:
   - Setiap teks yang berada di dalam kurung siku [...] (contoh: [rincikan alur pemeriksaan ANC 6x], [uraikan tugas nakes dan kader], dll) adalah PERINTAH / PROMPT LANGSUNG DARI PENGGUNA UNTUK DIJALANKAN OLEH AI.
   - AI WAJIB mengeksekusi perintah tersebut secara komprehensif dan menghasilkan naskah bermutu tinggi sesuai pedoman akreditasi ILP.
   - Gantikan kurung siku [...] tersebut dengan isi naskah hasil generasi dari perintah tersebut (jangan biarkan tanda kurung siku tertinggal).

Gunakan gaya bahasa naskah dinas kedinasan resmi Indonesia yang lugas, presisi, dan sesuai standar Puskesmas.`;

// API: Generate Document via Gemini 3.8 Flash or Custom Agent
app.post('/api/generate-document', async (req, res) => {
  try {
    const { docType, klaster, title, context, variables, customInstructions, customAgentConfig, targetPages, selectedDatabaseItems } = req.body;

    const klasterLabel = klaster || 'Klaster 1: Manajemen';
    const docTitle = title || `Dokumen ${docType} ${klasterLabel}`;
    const pageCount = targetPages ? parseInt(targetPages, 10) : 2;

    // Detect any bracket prompts [...]
    const combinedInput = `${title || ''} ${context || ''} ${customInstructions || ''}`;
    const bracketMatches = combinedInput.match(/\[(.*?)\]/g);
    const bracketPromptList = bracketMatches && bracketMatches.length > 0 
      ? bracketMatches.map((b, i) => `${i + 1}. ${b}`).join('\n')
      : 'Tidak ada prompt kurung siku khusus.';

    // Format Selected Puskesmas Database (Capaian, SPM, INM, Demografi)
    let formattedDatabaseContext = 'Tidak ada database capaian khusus yang dipilih.';
    if (Array.isArray(selectedDatabaseItems) && selectedDatabaseItems.length > 0) {
      formattedDatabaseContext = selectedDatabaseItems.map((item: any, idx: number) => `
[DATA ${idx + 1}: ${item.title} (${item.period || 'Periode Terkini'}) - Kategori: ${item.category}]
Ringkasan Data: ${item.summary}
Daftar Capaian / Indikator:
${(item.metrics || []).map((m: any) => `  * ${m.key}: ${m.value}${m.target ? ` (Target: ${m.target})` : ''} ${m.unit ? `[${m.unit}]` : ''} - Status: ${m.status || 'terdata'}`).join('\n')}
Catatan & Rekomendasi Faskes: ${item.notes || '-'}
`).join('\n----------------------------------------\n');
    }

    const promptText = `Tolong buatkan draf dokumen akreditasi Puskesmas lengkap:
- Jenis Dokumen: ${docType}
- Klaster ILP: ${klasterLabel}
- Judul Dokumen: ${docTitle}
- Target Jumlah Halaman: ${pageCount} halaman (susun materi, butir prosedur, dan pembahasan agar cukup dan proporsional untuk ${pageCount} halaman A4)
- Catatan Alur / Konteks Khusus: ${context || 'Gunakan alur dan standar pelayanan baku Puskesmas ILP'}
- Instruksi Tambahan: ${customInstructions || 'Sesuai format akreditasi resmi'}

DATABASE & CAPAIAN PUSKESMAS TERPILIH SEBAGAI DASAR NASKAH (WAJIB DISITIR & DIINTEGRASIKAN):
${formattedDatabaseContext}
*INSTRUKSI DATABASE*: Apabila terdapat data capaian Puskesmas di atas, gunakan angka-angka dan fakta riil tersebut ke dalam latar belakang, kebijakan, prosedur, evaluasi, atau indikator kinerja dokumen!

PANDUAN EKSEKUSI PERINTAH DALAM KURUNG SIKU [...]:
${bracketPromptList}
*PENTING*: Teks di dalam tanda kurung siku [...] di atas adalah perintah langsung dari pengguna. Jalankan setiap perintah tersebut secara rinci dan gantikan tanda kurung siku dengan teks hasil generasi yang matang dan formal.

- Variabel Data Faskes:
${JSON.stringify(variables || {}, null, 2)}

Format respon yang diharapkan:
Kembalikan respon JSON murni (JSON parsable) dengan struktur:
{
  "title": "${docTitle}",
  "docNumber": "contoh nomor surat/SOP",
  "docType": "${docType}",
  "klaster": "${klasterLabel}",
  "summary": "ringkasan singkat dokumen",
  "sections": [
    { "title": "Nama Bagian", "content": "Isi uraian bagian..." }
  ],
  "sopMetadata": {
    "noDokumen": "...",
    "noRevisi": "00",
    "tanggalTerbit": "...",
    "halaman": "1/2",
    "penanggungJawab": "..."
  },
  "rawFormattedText": "Teks naskah lengkap tersusun rapi jika dibutuhkan untuk salin teks"
}`;

    // Check if user is using Custom AI Agent / Endpoint
    if (customAgentConfig && customAgentConfig.enabled && customAgentConfig.endpoint && customAgentConfig.apiKey) {
      try {
        const response = await fetch(customAgentConfig.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customAgentConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: customAgentConfig.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: ILP_SYSTEM_INSTRUCTION },
              { role: 'user', content: promptText },
            ],
            temperature: 0.7,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || '';
          // Clean json markdown if any
          const cleanedJson = reply.replace(/```json/g, '').replace(/```/g, '').trim();
          try {
            const parsed = JSON.parse(cleanedJson);
            return res.json({ success: true, data: parsed, provider: 'custom' });
          } catch {
            return res.json({
              success: true,
              data: {
                title: docTitle,
                docType,
                klaster: klasterLabel,
                sections: [{ title: 'Isi Dokumen', content: reply }],
                rawFormattedText: reply,
              },
              provider: 'custom',
            });
          }
        }
      } catch (customErr: any) {
        console.error('Custom Agent Error, falling back to Gemini:', customErr.message);
      }
    }

    // Default: Gemini 3.8 Flash
    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: ILP_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const text = geminiResponse.text || '{}';
    let parsedData;
    try {
      parsedData = JSON.parse(text);
    } catch {
      parsedData = {
        title: docTitle,
        docType,
        klaster: klasterLabel,
        sections: [{ title: 'Hasil Dokumen', content: text }],
        rawFormattedText: text,
      };
    }

    return res.json({ success: true, data: parsedData, provider: 'gemini' });
  } catch (error: any) {
    console.error('Error generating document:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal menghasilkan dokumen' });
  }
});

// API: Execute Bracket Prompt [...] within a specific section
app.post('/api/execute-bracket-prompt', async (req, res) => {
  try {
    const { sectionTitle, sectionContent, docType, klaster, docTitle, variables, customAgentConfig, selectedDatabaseItems } = req.body;
    const bracketMatches = (sectionContent || '').match(/\[(.*?)\]/g);
    if (!bracketMatches || bracketMatches.length === 0) {
      return res.status(400).json({ success: false, error: 'Tidak ditemukan perintah dalam kurung siku [...]' });
    }

    // Format Database Context if provided
    let databaseContext = '';
    if (Array.isArray(selectedDatabaseItems) && selectedDatabaseItems.length > 0) {
      databaseContext = `\nDATA & CAPAIAN PUSKESMAS SEBAGAI REFERENSI:\n` + selectedDatabaseItems.map((item: any, i: number) => `
${i + 1}. ${item.title} (${item.period}):
   Ringkasan: ${item.summary}
   Metrik: ${(item.metrics || []).map((m: any) => `${m.key}: ${m.value}`).join(', ')}
   Catatan: ${item.notes || '-'}
`).join('\n');
    }

    const promptText = `Anda adalah Ahli Regulasi & Tata Naskah Akreditasi Puskesmas ILP.
Pengguna sedang menyusun dokumen "${docTitle || 'Dokumen Akreditasi'}" (${docType || 'SOP'}, ${klaster || 'ILP'}).
Pada bagian "${sectionTitle || 'Seksi Dokumen'}", terdapat instruksi khusus dalam tanda kurung siku [...]:
${bracketMatches.map((m: string, i: number) => `${i + 1}. ${m}`).join('\n')}

Teks asli seksi saat ini:
"""
${sectionContent}
"""

Variabel Faskes:
${JSON.stringify(variables || {}, null, 2)}
${databaseContext}

TUGAS ANDA:
1. Jalankan setiap perintah atau instruksi yang ada di dalam tanda kurung siku [...] tersebut secara mendalam dan profesional.
2. Hasilkan uraian naskah yang lengkap, runtut, berstandar akreditasi Puskesmas Kemenkes RI.
3. Gantikan setiap tanda kurung siku [...] dengan teks hasil eksekusi perintah tersebut secara mulus tanpa meninggalkan tanda kurung siku.
4. Kembalikan teks bagian yang utuh dan siap pakai (hanya kirimkan teks naskah yang sudah selesai).`;

    // Check Custom Agent
    if (customAgentConfig && customAgentConfig.enabled && customAgentConfig.endpoint && customAgentConfig.apiKey) {
      try {
        const response = await fetch(customAgentConfig.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customAgentConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: customAgentConfig.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: ILP_SYSTEM_INSTRUCTION },
              { role: 'user', content: promptText },
            ],
            temperature: 0.7,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || '';
          return res.json({ success: true, updatedContent: reply.trim() });
        }
      } catch (err: any) {
        console.warn('Custom agent error, falling back to Gemini:', err.message);
      }
    }

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: ILP_SYSTEM_INSTRUCTION,
      },
    });

    const resultText = geminiResponse.text?.trim() || sectionContent;
    return res.json({ success: true, updatedContent: resultText });
  } catch (error: any) {
    console.error('Error executing bracket prompt:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal menjalankan perintah AI' });
  }
});

// API: Analyze Template / Reference Document
app.post('/api/analyze-template', async (req, res) => {
  try {
    const { sampleText, customInstructions } = req.body;
    if (!sampleText || sampleText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Teks dokumen contoh tidak boleh kosong' });
    }

    const analyzePrompt = `Anda adalah Analis Tata Naskah Akreditasi Puskesmas.
Berikut adalah contoh dokumen akreditasi:
"""
${sampleText}
"""

Instruksi Tambahan: ${customInstructions || 'Deteksi bagian tetap dan bagian variabel'}

Tolong analisis dokumen ini:
1. Temukan bagian teks mana yang statis (klausul baku/hukum/tetap).
2. Temukan bagian teks mana yang dinamis (bisa diubah dan diisi oleh pengguna, misalnya nama kegiatan, tanggal, nomor surat, sasaran, nama puskesmas).
3. Berikan saran variabel dengan format {{nama_variabel}} (contoh: {{nama_kegiatan}}, {{tanggal_terbit}}, {{target_sasaran}}).
4. Buatkan versi template bersih di mana bagian dinamis sudah diganti menjadi placeholder {{...}}.

Kembalikan respon JSON terstruktur:
{
  "documentTypeDetected": "SOP / SK / KAK / Lainnya",
  "title": "Judul dokumen terdeteksi",
  "detectedVariables": [
    { "variableKey": "nama_variabel", "originalSample": "teks asli di dokumen", "description": "keterangan kolom ini" }
  ],
  "staticClauses": ["Daftar klausul atau poin tetap yang baku"],
  "templateWithPlaceholders": "Teks lengkap template dengan tag {{variabel}} yang siap disimpan",
  "suggestions": ["Saran perbaikan redaksi atau kesesuaian dengan standar ILP terbaru"]
}`;

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: analyzePrompt,
      config: {
        systemInstruction: ILP_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const text = geminiResponse.text || '{}';
    const parsedData = JSON.parse(text);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error analyzing template:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal menganalisis dokumen template' });
  }
});

// API: AI Analyze & Convert Document into Structured Puskesmas Database Item
app.post('/api/ai-analyze-database-document', async (req, res) => {
  try {
    const { documentText, customPrompt, currentData, customAgentConfig } = req.body;
    if (!documentText && !currentData) {
      return res.status(400).json({ success: false, error: 'Teks dokumen atau data yang akan dianalisis tidak boleh kosong' });
    }

    const promptText = `Anda adalah Ahli Analisis Data Kesehatan & Manajemen Mutu Puskesmas ILP (Integrasi Layanan Primer) Kemenkes RI.
Tugas Anda adalah membaca dan menganalisis teks dokumen laporan, tabel capaian, notulen, atau data faskes di bawah ini, kemudian mengekstrak atau menyempurnakannya menjadi data terstruktur format Database Puskesmas.

DOKUMEN SUMBER / TEKS CAPAIAN:
"""
${(documentText || '').slice(0, 30000)}
"""

${currentData ? `DATA DRAFT SAAT INI (YANG INGIN DISEMPURNAKAN):\n${JSON.stringify(currentData, null, 2)}\n` : ''}

${customPrompt ? `INSTRUKSI KHUSUS / PERINTAH PROMPT PENGGUNA:\n"${customPrompt}"\nPerhatikan instruksi di atas secara saksama dalam menyusun judul, kategori, metrik, maupun rekomendasi!\n` : ''}

Format respon yang diharapkan:
Kembalikan respon JSON murni (JSON parsable) dengan struktur:
{
  "title": "Judul Laporan / Data Capaian (misal: Capaian SPM Kesehatan Ibu dan Anak 2025)",
  "category": "Salah satu dari: 'spm' | 'indikator_mutu' | 'capaian_program' | 'demografi_sasaran' | 'sdmk_ketenagaan' | 'sarpras_alkes' | 'surveilans_penyakit' | 'kinerja_keuangan' | 'kustom'",
  "period": "Periode data (misal: 'Tahun 2025', 'Semester II 2025', dll)",
  "klaster": "Salah satu dari: 'KLASTER_1' | 'KLASTER_2' | 'KLASTER_3' | 'KLASTER_4' | 'LINTAS_KLASTER'",
  "summary": "Ringkasan narasi yang informatif dan padat mengenai fakta data ini (2-4 kalimat)",
  "metrics": [
    {
      "key": "Nama Indikator / Butir Capaian",
      "value": "Nilai capaian ril (misal: 89.4%, 14 orang, 24,500 jiwa)",
      "target": "Nilai target jika ada (misal: 100%, 12)",
      "unit": "Satuan (misal: %, jiwa, orang, unit)",
      "status": "tercapai | belum_tercapai | dalam_pantauan"
    }
  ],
  "notes": "Catatan analisis kendala di lapangan dan rekomendasi rencana tindak lanjut (RTL)"
}`;

    // Custom Agent check
    if (customAgentConfig && customAgentConfig.enabled && customAgentConfig.endpoint && customAgentConfig.apiKey) {
      try {
        const response = await fetch(customAgentConfig.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${customAgentConfig.apiKey}`,
          },
          body: JSON.stringify({
            model: customAgentConfig.model || 'gpt-4o-mini',
            messages: [
              { role: 'system', content: ILP_SYSTEM_INSTRUCTION },
              { role: 'user', content: promptText },
            ],
            temperature: 0.3,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          const reply = data.choices?.[0]?.message?.content || '';
          const cleanedJson = reply.replace(/```json/g, '').replace(/```/g, '').trim();
          return res.json({ success: true, data: JSON.parse(cleanedJson), provider: 'custom' });
        }
      } catch (err: any) {
        console.warn('Custom agent error for db analysis, falling back to Gemini:', err.message);
      }
    }

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: promptText,
      config: {
        systemInstruction: ILP_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const text = geminiResponse.text || '{}';
    const parsedData = JSON.parse(text);
    return res.json({ success: true, data: parsedData, provider: 'gemini' });
  } catch (error: any) {
    console.error('Error analyzing database document:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal menganalisis dokumen database dengan AI' });
  }
});

// API: Analyze Custom Document Type Structure
app.post('/api/analyze-doctype', async (req, res) => {
  try {
    const { sampleText } = req.body;
    if (!sampleText || sampleText.trim().length === 0) {
      return res.status(400).json({ success: false, error: 'Teks dokumen contoh tidak boleh kosong' });
    }

    const analyzePrompt = `Anda adalah Analis Tata Naskah Akreditasi Puskesmas Kemenkes RI.
Berikut adalah contoh dokumen:
"""
${sampleText}
"""

Tolong analisis struktur dokumen ini dan ekstrak definisi jenis tipe dokumen:
1. Nama jenis dokumen yang representatif dan baku (misal: "Notulen Rapat Mini Lokakarya", "Laporan Hasil Audit Internal", "Formulir Pemantauan Pelayanan").
2. Deskripsi singkat fungsi dokumen ini di Puskesmas atau akreditasi ILP.
3. Daftar seksi/bab/bagian utama yang ada di dokumen ini secara berurutan.

Kembalikan respon JSON terstruktur:
{
  "name": "Nama Jenis Dokumen",
  "description": "Deskripsi fungsi dokumen...",
  "defaultSections": ["Bagian 1", "Bagian 2", "Bagian 3"]
}`;

    const geminiResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: analyzePrompt,
      config: {
        systemInstruction: ILP_SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
      },
    });

    const text = geminiResponse.text || '{}';
    const parsedData = JSON.parse(text);
    return res.json({ success: true, data: parsedData });
  } catch (error: any) {
    console.error('Error analyzing doctype:', error);
    return res.status(500).json({ success: false, error: error.message || 'Gagal menganalisis tipe dokumen' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Puskesdoc Generator', time: new Date().toISOString() });
});

// Setup Vite middleware in dev or static files in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Puskesdoc Generator server running on http://localhost:${PORT}`);
  });
}

startServer();
