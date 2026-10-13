import { DocumentType, IlpKlaster, FaskesProfile, VariableItem } from '../types';

export function generateStructuredPrompt(
  docType: DocumentType,
  klaster: IlpKlaster,
  title: string,
  context: string,
  profile: FaskesProfile,
  variables: VariableItem[]
): string {
  const varsText = variables
    .map((v) => `- {{${v.key}}}: ${v.value}`)
    .join('\n');

  return `### INSTRUKSI TATA NASKAH DOKUMEN AKREDITASI PUSKESMAS (ILP)
Bertindaklah sebagai Konsultan Akreditasi Faskes & Ahli Regulasi Kemenkes RI.
Buatkan draft dokumen resmi berstandar akreditasi Puskesmas dan Integrasi Layanan Primer (ILP).

1. IDENTITAS DOKUMEN:
- Jenis Dokumen: ${docType}
- Klaster ILP: ${klaster}
- Judul Dokumen: ${title}
- Puskesmas: ${profile.namaPuskesmas} (${profile.dinasKesehatan})
- Kepala Puskesmas: ${profile.kepalaPuskesmas} (NIP: ${profile.nipKepala})

2. KONTEKS & ALUR OPERASIONAL KHUSUS:
${context || 'Lakukan penyesuaian alur pelayanan dan tupoksi tenaga kesehatan sesuai pedoman ILP terbaru.'}

3. DAFTAR VARIABEL FASKES:
${varsText}

4. KETENTUAN FORMAT NASKAH:
${
  docType === 'SOP'
    ? `- Ikuti tabel kotak SOP Kemenkes:
  1. Pengertian
  2. Tujuan
  3. Kebijakan (cantumkan SK terkait)
  4. Referensi (UU Kesehatan No. 17/2023, Permenkes, Buku Panduan ILP Kemenkes 2023)
  5. Prosedur/Langkah-Langkah (rincikan tahapan berurutan 1, 2, 3...)
  6. Diagram Alir
  7. Unit/Klaster Terkait
  8. Rekaman Historis Perubahan`
    : docType === 'SK'
    ? `- Format Surat Keputusan Kepala Puskesmas:
  - Konsiderans Menimbang (a, b, c)
  - Mengingat (Peraturan perundang-undangan kesehatan terbaru)
  - Diktum MEMUTUSKAN: Menetapkan, KESATU, KEDUA, KETIGA, KEEMPAT
  - Ditetapkan oleh Kepala Puskesmas`
    : docType === 'KAK'
    ? `- Format Kerangka Acuan Kerja 9 Bab:
  I. Pendahuluan
  II. Latar Belakang
  III. Tujuan Umum dan Khusus
  IV. Kegiatan Pokok dan Rincian Kegiatan
  V. Cara Melaksanakan Kegiatan
  VI. Sasaran
  VII. Jadwal Pelaksanaan Kegiatan
  VIII. Evaluasi Pelaksanaan Kegiatan dan Pelaporan
  IX. Pencatatan, Pelaporan, dan Evaluasi Kegiatan`
    : `- Buat dengan sistematika naskah dinas resmi kesehatan.`
}

Tuliskan dokumen secara lengkap, terstruktur rapi, siap pakai, dan gunakan bahasa Indonesia baku tanpa singkatan yang tidak jelas.`;
}
