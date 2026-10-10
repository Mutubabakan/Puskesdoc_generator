# Puskesdoc Generator

Aplikasi web modern untuk penyusunan, standarisasi, perancangan template, dan pembuatan otomatis dokumen akreditasi Puskesmas berbasis **Integrasi Layanan Primer (ILP)** Klaster 1 hingga 5, dengan fitur canvas visual drag-and-drop, manajemen variabel profil faskes & pegawai, analisis AI pintar (Gemini & Custom AI Agent), ekspor Word (.docx), serta sinkronisasi ekspor/impor dan Google Drive.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Ringkasan penyesuaian berdasarkan instruksi dan komentar pengguna:

- **Nama Aplikasi**: **Puskesdoc generator**.
- **Standar Akreditasi & Layanan**: Mengadopsi penuh transformasi **Integrasi Layanan Primer (ILP)**:
  - Klaster 1: Manajemen
  - Klaster 2: Ibu dan Anak (Usia Sekolah & Remaja)
  - Klaster 3: Usia Dewasa dan Lanjut Usia
  - Klaster 4: Penanggulangan Penyakit Menular
  - Lintas Klaster: Farmasi, Laboratorium, Gawat Darurat (UGD/Tindakan)
- **Desain & Tema Visual**: Estetika **Hologram Silver** dengan sentuhan warna aksen **Ungu (Violet/Purple)** dan **Pink (Fuchsia/Rose)** yang futuristik namun tetap elegan dan bersih, serta tipografi standar naskah dinas **Arial**.
- **Sistem Variabel & Profil Dinamis**:
  - Profil Puskesmas (Nama Faskes, Kode Faskes, Alamat, No. Telp, Email, Dinkes Kab/Kota).
  - Profil Pegawai / Tim (Nama Kepala Puskesmas, NIP, Pangkat/Golongan, Penanggung Jawab Klaster, Tim Mutu).
  - Variabel sistem yang dapat dipanggil di dokumen manapun dengan format `{{nama_puskesmas}}`, `{{kepala_puskesmas}}`, `{{nip_kapus}}`, `{{klaster}}`, `{{nomor_dokumen}}`, dll., sehingga pengguna tidak perlu mengetik berulang.
- **Visual Drag & Drop Template Canvas**:
  - Area canvas interaktif yang mendukung **pan/drag kertas**, **zoom in / zoom out** (dengan mouse wheel scroll atau tombol zoom slider).
  - Pengaturan orientasi kertas (**Portrait / Landscape**) dan margin.
  - Penempatan elemen/textbox secara bebas (drag & drop koordinat atau susunan grid/kolom).
  - Pengaturan kolom pada kertas (1 kolom, 2 kolom, tabel berkotak).
- **Analisis AI untuk Template & Dokumen Acuan**:
  - Disediakan contoh template baku.
  - Pengguna bisa mengunggah atau menempelkan contoh template; AI akan otomatis menganalisis teks, mendeteksi bagian mana yang statis dan bagian mana yang dinamis (variabel yang bisa diubah/diisi).
- **Multi-AI Provider & Custom Agent Support**:
  - Selain built-in Google Gemini 3.8 Flash, disediakan pengaturan **Custom AI Provider / Agent** (bisa memasukkan API Key dan Endpoint kustom, misal OpenAI, Groq, OpenRouter, atau Gemini API Key mandiri).
- **Penyimpanan, Ekspor/Impor, dan Google Drive**:
  - Penyimpanan lokal (Local Storage) untuk data offline instan.
  - Fitur Ekspor/Impor File Cadangan (JSON/Template).
  - Fitur Integrasi Google Drive (OAuth / GDrive connect) untuk menyimpan, membuka, mengimpor, dan mengekspor dokumen akreditasi langsung ke Google Drive pengguna.

---

## 1. Overview & Core Concept

**Puskesdoc generator** dirancang khusus untuk mempermudah seluruh staf dan Pokja Puskesmas dalam menyusun ribuan dokumen regulasi, panduan, dan instrumen kepatuhan akreditasi berstandar Permenkes & ILP.

Aplikasi ini menggabungkan:
1. **Generator Berorientasi Format Resmi**: Menyusun SOP berkotak akreditasi, SK (Surat Keputusan), KAK (Kerangka Acuan Kerja), Pedoman, dan Panduan dalam hitungan detik.
2. **Visual Layout Studio**: Editor drag-and-drop untuk menyusun tata letak template naskah dinas secara visual dengan presisi kertas A4/F4.
3. **AI Smart Analyzer**: Mesin analisis draf dokumen yang membedakan klausul baku hukum dengan variabel operasional.
4. **Pusat Variabel Faskes**: Master data pegawai dan fasilitas kesehatan yang terhubung otomatis ke template dokumen.

---

## 2. User Experience & Visual Design

### A. Estetika & Color Palette
- **Tema**: *Holographic Silver & Neo-Violet Fuchsia*.
- **Canvas Dasar**: Silver Metallic Muted Slate (`#F1F5F9`, `#E2E8F0`, `#CBD5E1`) dengan aksen kilau hologram lembut (`#E0E7FF` / `#F5F3FF`).
- **Aksen Utama**: Electric Purple / Violet (`#7C3AED` / `#8B5CF6`) dan Neon Fuchsia Pink (`#EC4899` / `#D946EF`) untuk tombol aksi utama, indikator fokus, dan seleksi visual.
- **Tipografi**: **Arial** di seluruh antarmuka dan naskah dinas dokumen untuk kepatuhan tata naskah resmi instansi pemerintah.

### B. Top Navigation Contract
- **Brand**: `Puskesdoc generator` (dengan badge tipografi holographic silver-violet).
- **Nav Links**:
  - `Generator Dokumen` (Formulir ILP Klaster 1-5 & Pembuat Dokumen Cepat)
  - `Studio Desain Template` (Visual Drag & Drop Canvas, Zoom, Pan, Textbox & Kolom)
  - `Profil & Variabel Faskes` (Master data puskesmas, nakes, kapus, dan kamus variabel `{{...}}`)
  - `Analisis AI & Template` (Deteksi otomatis bagian dinamis dari contoh dokumen)
  - `Koneksi Cloud & GDrive` (Pengaturan Google Drive, Ekspor/Impor, dan API Agent)
- **Aksi Cepat**: `+ Dokumen Baru`, `Ekspor .DOCX`, `Cetak / PDF`.

### C. Fitur Visual Canvas Studio (Drag & Drop Template Maker)
- **Kertas Kerja A4 / F4**: Dukungan Portrait & Landscape dengan skala zoom (25% - 200%) menggunakan mouse wheel scroll atau kontrol zoom.
- **Interaksi Drag & Pan**: Drag latar kanvas untuk menggeser sudut pandang (panning), drag elemen/textbox untuk memindahkan posisi.
- **Komponen yang Dapat Ditambahkan**:
  - Kotak Header KOP Faskes (Logo Pemda, Logo Puskesmas, Garis Ganda).
  - Kotak Header SOP Akreditasi (Tabel 7 sel baku akreditasi Kemenkes).
  - Textbox Dinamis bertaut ke Variabel (`{{nama_puskesmas}}`, `{{klaster}}`, dll.).
  - Blok Kolom (1 kolom penuh, 2 kolom terbagi, tabel dinamis).
  - Blok Konsiderans SK (Menimbang, Mengingat, Menetapkan).
  - Blok Tanda Tangan & Cap Faskes.

---

## 3. Integrasi AI & Arsitektur Multi-Agent

### A. Mode Kerja AI
1. **AI Otomatis Built-in**: Menggunakan Gemini 3.8 Flash di server untuk generasi cepat berbasis standar ILP Kemenkes.
2. **Custom Agent / External API**: Pengguna dapat memasukkan endpoint API kustom (OpenAI-compatible, Groq, OpenRouter, atau Gemini API Key alternatif) di panel pengaturan.
3. **Salin Prompt Manual**: Pengguna dapat menyalin prompt yang sudah dipersiapkan secara presisi untuk ditempelkan ke ChatGPT/Gemini web jika ingin berdialog langsung.

### B. AI Template Variable Detector
- Pengguna mengunggah atau menempelkan contoh naskah SK/SOP/KAK lama.
- AI menganalisis dan menandai:
  - Teks tetap / klausul standar (misal diktum dasar hukum Permenkes).
  - Teks variabel yang harus diganti (ditandai menjadi slot `{{nama_kegiatan}}`, `{{sasaran}}`, `{{target_ilp}}`, dll.).
  - Rekomendasi perbaikan redaksi agar sesuai instrumen akreditasi ILP terbaru.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                       Puskesdoc Generator (React 19)                         │
├──────────────────────────┬───────────────────────────────────────────────────┤
│   Sidebar & Topbar       │   Visual Canvas Studio / Document Workspace       │
│   - Klaster ILP 1 - 5    │   - Pan & Zoom Canvas (Wheel scroll / Slider)     │
│   - Master Variabel      │   - Drag & Drop Textbox & Column Grid Layout      │
│   - Multi-Agent Settings │   - Live A4 Paper Rendering in Arial              │
├──────────────────────────┴───────────────────────────────────────────────────┤
│   State & Integration Services                                                │
│   - LocalStorage Master Data (Profil Puskesmas, Pegawai, Variabel {{...}})    │
│   - Google Drive Sync & Backup / Restore JSON                                 │
│   - Word (.docx) Engine with Tables & Headers                                 │
│   - CSS Print Engine (Cetak langsung & Simpan PDF presisi)                    │
└──────────────────────────┬───────────────────────────────────────────────────┘
                           │ HTTP POST /api/generate & /api/analyze
                           ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                    Express Backend & Multi-Agent Proxy                       │
├──────────────────────────────────────────────────────────────────────────────┤
│   - Google GenAI SDK (@google/genai) gemini-3.8-flash (Built-in)              │
│   - Proxy ke Custom Agent / Third-party OpenAI-compatible endpoints          │
│   - System Instruction: Pedoman Tata Naskah ILP Klaster 1-5 Kemenkes RI      │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Rencana Tahap Eksekusi

1. **Setup Backend & Multi-Agent Proxy**:
   - Express server dengan route `/api/generate-document`, `/api/analyze-template`, dan `/api/custom-agent-proxy`.
2. **Setup Library Pendukung**:
   - Pustaka `docx` untuk ekspor file Microsoft Word berformat tabel, border, dan font Arial resmi.
3. **Modul Profil & Variabel Faskes**:
   - Form input profil Puskesmas, daftar nakes/kapus, logo faskes & pemda.
   - Registry variabel otomatis yang dapat di-insert ke dokumen.
4. **Modul Studio Desain Template Visual (Drag & Drop)**:
   - Canvas dengan kontrol zoom (scroll mouse) dan pan.
   - Pilihan Portrait/Landscape, pengaturan kolom, dan penempatan kotak teks/tabel secara bebas.
5. **Modul Generator Dokumen Berbasis ILP Klaster 1-5**:
   - Pemilihan jenis dokumen (SOP, SK, KAK, Pedoman, Panduan, Custom).
   - Filter Klaster ILP (Klaster 1 Manajemen, Klaster 2 Ibu & Anak, Klaster 3 Dewasa & Lansia, Klaster 4 P2M, Lintas Klaster).
   - AI generator instan + prompt viewer/copier.
6. **Modul Analisis Dokumen AI**:
   - Analisis otomatis teks input/upload untuk mendeteksi bagian yang bisa diubah dan dijadikan variabel template.
7. **Modul Google Drive & Ekspor-Impor**:
   - Ekspor/Impor file JSON, simpan ke Google Drive, ekspor Word (.docx), dan Cetak PDF.
8. **Pengujian & Verifikasi Build**:
   - Build TypeScript, uji rendering cetak, dan validasi seluruh alur.
