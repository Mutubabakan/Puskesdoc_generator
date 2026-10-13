import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sparkles, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  Save, 
  RotateCcw, 
  Eye, 
  Plus, 
  Trash2, 
  AlertCircle,
  RefreshCw,
  FileText,
  Upload,
  Image as ImageIcon,
  Sliders,
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  X,
  Layers,
  FileCheck,
  Variable,
  Database
} from 'lucide-react';
import { extractTextFromDocx, extractDocxAsHtml } from '../utils/docxReader';
import { 
  DocumentType, 
  IlpKlaster, 
  PuskesDoc, 
  FaskesProfile, 
  VariableItem, 
  CustomDocTypeDefinition,
  DocumentSection,
  DocumentTemplate,
  PuskesmasDatabaseItem
} from '../types';
import { ILP_KLASTERS } from '../utils/constants';
import { substituteVariables, saveDocument, getStoredAgentConfig, getStoredDocumentTemplates, getStoredDatabase } from '../utils/storage';
import { exportToDocx } from '../utils/docxExport';
import { generateStructuredPrompt } from '../utils/promptGenerator';

interface GeneratorViewProps {
  profile: FaskesProfile;
  variables: VariableItem[];
  customTypes: CustomDocTypeDefinition[];
  currentDoc: PuskesDoc;
  setCurrentDoc: (doc: PuskesDoc) => void;
  onOpenPromptModal: (promptText: string) => void;
  onNavigateToTemplates?: () => void;
  selectedDatabaseItems?: PuskesmasDatabaseItem[];
  setSelectedDatabaseItems?: React.Dispatch<React.SetStateAction<PuskesmasDatabaseItem[]>>;
}

interface GeneratorTabItem {
  id: string;
  title: string;
  doc: PuskesDoc;
  contextInput: string;
  customInstructions: string;
  targetPages: number;
}

export const GeneratorView: React.FC<GeneratorViewProps> = ({
  profile,
  variables,
  customTypes,
  currentDoc,
  setCurrentDoc,
  onOpenPromptModal,
  onNavigateToTemplates,
  selectedDatabaseItems = [],
  setSelectedDatabaseItems,
}) => {
  // Available Puskesmas database items
  const [availableDatabases, setAvailableDatabases] = useState<PuskesmasDatabaseItem[]>(getStoredDatabase());
  const [isDbShelfOpen, setIsDbShelfOpen] = useState(false);

  // Sync available databases on mount
  useEffect(() => {
    setAvailableDatabases(getStoredDatabase());
  }, []);

  // Multiple tabs state for Generator
  const [tabs, setTabs] = useState<GeneratorTabItem[]>([
    {
      id: currentDoc.id || 'tab_1',
      title: currentDoc.title || 'Dokumen 1',
      doc: currentDoc,
      contextInput: '',
      customInstructions: '',
      targetPages: currentDoc.targetPages || 2,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState<string>(currentDoc.id || 'tab_1');

  // Preview page selection: 'all' or specific page number (1, 2, 3...)
  const [selectedPreviewPage, setSelectedPreviewPage] = useState<'all' | number>('all');

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [showResolvedValues, setShowResolvedValues] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [storedTemplates, setStoredTemplates] = useState<DocumentTemplate[]>(getStoredDocumentTemplates());
  const [kopLogoError, setKopLogoError] = useState(false);
  const [executingBracketIdx, setExecutingBracketIdx] = useState<number | null>(null);
  const [isExecutingAllBrackets, setIsExecutingAllBrackets] = useState(false);

  // Variable autocomplete state when typing {{ or {{}} anywhere
  const [autocomplete, setAutocomplete] = useState<{
    isOpen: boolean;
    query: string;
    fieldId: string;
    sectionIdx?: number;
    cursorIndex: number;
    position: { top: number; left: number };
    selectedIndex: number;
  }>({
    isOpen: false,
    query: '',
    fieldId: '',
    cursorIndex: 0,
    position: { top: 0, left: 0 },
    selectedIndex: 0,
  });

  const matchingAutocompleteVariables = useMemo(() => {
    if (!autocomplete.isOpen) return [];
    const q = (autocomplete.query || '').trim().toLowerCase();
    if (!q) return variables;
    const filtered = variables.filter(
      (v) =>
        v.key.toLowerCase().includes(q) ||
        v.label.toLowerCase().includes(q) ||
        v.value.toLowerCase().includes(q)
    );
    return filtered.length > 0 ? filtered : variables;
  }, [autocomplete.isOpen, autocomplete.query, variables]);

  const handleInputCheckTrigger = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>,
    fieldId: string,
    sectionIdx?: number
  ) => {
    const target = e.currentTarget;
    const value = target.value;
    const cursor = target.selectionStart || 0;
    const textBefore = value.slice(0, cursor);

    let query = '';
    let matchLen = 0;
    let isMatch = false;

    // 1. Direct match: typing {{ or {{variable
    const matchEndsWith = textBefore.match(/\{\{([a-zA-Z0-9_\s]*)$/);
    if (matchEndsWith) {
      query = matchEndsWith[1].trim().toLowerCase();
      matchLen = matchEndsWith[0].length;
      isMatch = true;
    } else if (textBefore.endsWith('{{}}')) {
      // 2. Direct {{}} typed
      query = '';
      matchLen = 4;
      isMatch = true;
    } else {
      // 3. Or last {{ was within 35 characters
      const lastOpen = textBefore.lastIndexOf('{{');
      if (lastOpen !== -1 && (cursor - lastOpen) <= 35) {
        const slice = textBefore.slice(lastOpen + 2);
        if (slice === '}}' || slice === '}') {
          query = '';
          matchLen = slice.length + 2;
          isMatch = true;
        } else if (!slice.includes('}}')) {
          query = slice.trim().toLowerCase();
          matchLen = slice.length + 2;
          isMatch = true;
        }
      }
    }

    if (isMatch) {
      const rect = target.getBoundingClientRect();
      setAutocomplete({
        isOpen: true,
        query,
        fieldId,
        sectionIdx,
        cursorIndex: Math.max(0, cursor - matchLen),
        position: {
          top: rect.bottom,
          left: Math.max(16, rect.left),
        },
        selectedIndex: 0,
      });
    } else {
      if (autocomplete.isOpen) {
        setAutocomplete((prev) => ({ ...prev, isOpen: false }));
      }
    }
  };

  const insertVariableTag = (key: string, explicitField?: string, explicitSecIdx?: number) => {
    const tag = `{{${key}}}`;
    const fieldId = explicitField || autocomplete.fieldId;
    const sectionIdx = explicitSecIdx !== undefined ? explicitSecIdx : autocomplete.sectionIdx;
    const cursorIndex = autocomplete.cursorIndex;

    if (fieldId === 'contextInput') {
      const text = activeTab.contextInput;
      const before = text.slice(0, cursorIndex);
      const after = text.slice(cursorIndex).replace(/^\{\{[a-zA-Z0-9_\s]*/, '').replace(/^\}\}/, '');
      updateActiveTab({ contextInput: before + tag + after });
    } else if (fieldId === 'title') {
      const text = activeDoc.title;
      const before = text.slice(0, cursorIndex);
      const after = text.slice(cursorIndex).replace(/^\{\{[a-zA-Z0-9_\s]*/, '').replace(/^\}\}/, '');
      updateActiveTab({}, { ...activeDoc, title: before + tag + after });
    } else if (fieldId === 'docNumber') {
      const text = activeDoc.docNumber;
      const before = text.slice(0, cursorIndex);
      const after = text.slice(cursorIndex).replace(/^\{\{[a-zA-Z0-9_\s]*/, '').replace(/^\}\}/, '');
      updateActiveTab({}, { ...activeDoc, docNumber: before + tag + after });
    } else if (fieldId.startsWith('section_title_') && typeof sectionIdx === 'number') {
      const sec = activeDoc.sections[sectionIdx];
      if (sec) {
        const text = sec.title;
        const before = text.slice(0, cursorIndex);
        const after = text.slice(cursorIndex).replace(/^\{\{[a-zA-Z0-9_\s]*/, '').replace(/^\}\}/, '');
        const updated = [...activeDoc.sections];
        updated[sectionIdx] = { ...sec, title: before + tag + after };
        updateActiveTab({}, { ...activeDoc, sections: updated });
      }
    } else if (fieldId.startsWith('section_') && typeof sectionIdx === 'number') {
      const sec = activeDoc.sections[sectionIdx];
      if (sec) {
        const text = sec.content;
        const before = text.slice(0, cursorIndex);
        const after = text.slice(cursorIndex).replace(/^\{\{[a-zA-Z0-9_\s]*/, '').replace(/^\}\}/, '');
        const updated = [...activeDoc.sections];
        updated[sectionIdx] = { ...sec, content: before + tag + after };
        updateActiveTab({}, { ...activeDoc, sections: updated });
      }
    }

    setAutocomplete((prev) => ({ ...prev, isOpen: false }));
    triggerNotice(`Variabel ${tag} disisipkan!`);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!autocomplete.isOpen || matchingAutocompleteVariables.length === 0) {
      if (e.key === 'Escape' && autocomplete.isOpen) {
        setAutocomplete((prev) => ({ ...prev, isOpen: false }));
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setAutocomplete((prev) => ({
        ...prev,
        selectedIndex: (prev.selectedIndex + 1) % matchingAutocompleteVariables.length,
      }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setAutocomplete((prev) => ({
        ...prev,
        selectedIndex: (prev.selectedIndex - 1 + matchingAutocompleteVariables.length) % matchingAutocompleteVariables.length,
      }));
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      const selected = matchingAutocompleteVariables[autocomplete.selectedIndex];
      if (selected) {
        insertVariableTag(selected.key);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setAutocomplete((prev) => ({ ...prev, isOpen: false }));
    }
  };

  // Active tab derived values
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];
  const activeDoc = activeTab.doc;

  const [activeKlasterInfo, setActiveKlasterInfo] = useState(
    ILP_KLASTERS.find((k) => k.id === activeDoc.klaster) || ILP_KLASTERS[0]
  );

  useEffect(() => {
    setStoredTemplates(getStoredDocumentTemplates());
  }, []);

  useEffect(() => {
    const found = ILP_KLASTERS.find((k) => k.id === activeDoc.klaster);
    if (found) setActiveKlasterInfo(found);
  }, [activeDoc.klaster]);

  const triggerNotice = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Helper to update active tab state & sync with setCurrentDoc
  const updateActiveTab = (updates: Partial<GeneratorTabItem>, updatedDoc?: PuskesDoc) => {
    setTabs((prevTabs) =>
      prevTabs.map((t) => {
        if (t.id === activeTabId) {
          const newDoc = updatedDoc || (updates.doc ? updates.doc : t.doc);
          const newTitle = newDoc.title || t.title;
          const merged = { ...t, ...updates, doc: newDoc, title: newTitle };
          setCurrentDoc(newDoc);
          return merged;
        }
        return t;
      })
    );
  };

  // Add new tab in Generator
  const handleAddNewTab = () => {
    const newId = 'tab_' + Date.now();
    const newDoc: PuskesDoc = {
      id: 'doc_' + Date.now(),
      title: `Dokumen Akreditasi Baru ${tabs.length + 1}`,
      docType: 'SOP',
      klaster: 'KLASTER_1',
      docNumber: `440/${String(tabs.length + 1).padStart(3, '0')}/SOP/PKM/2026`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      useKop: true,
      targetPages: 2,
      sopMetadata: {
        noDokumen: `440/${String(tabs.length + 1).padStart(3, '0')}/SOP/PKM/2026`,
        noRevisi: '00',
        tanggalTerbit: new Date().toLocaleDateString('id-ID'),
        halaman: '1/2',
        unitTerkait: 'Klaster 1 Manajemen',
        penanggungJawab: profile.kepalaPuskesmas || 'Kepala Puskesmas',
      },
      sections: [
        { id: 'sec_1', title: '1. Pengertian', content: 'Uraian definisi operasional naskah dinas akreditasi...' },
        { id: 'sec_2', title: '2. Tujuan', content: 'Sebagai acuan penerapan langkah-langkah kerja petugas...' },
        { id: 'sec_3', title: '3. Kebijakan', content: 'Surat Keputusan Kepala {{nama_puskesmas}}...' },
        { id: 'sec_4', title: '4. Referensi', content: 'Kepmenkes HK.01.07/MENKES/2015/2023 tentang Juknis Integrasi Pelayanan Kesehatan Primer' },
        { id: 'sec_5', title: '5. Prosedur / Langkah-Langkah', content: '1. Petugas melakukan persiapan alat dan formulir.\n2. Petugas memverifikasi identitas pasien.\n3. Petugas memberikan pelayanan terstandar.' },
        { id: 'sec_6', title: '6. Diagram Alir', content: 'Persiapan -> Verifikasi -> Pelayanan -> Pencatatan' },
        { id: 'sec_7', title: '7. Unit Terkait', content: 'Seluruh unit dan klaster pelayanan terkait' },
        { id: 'sec_8', title: '8. Rekaman Historis Perubahan', content: 'No | Yang Diubah | Isi Perubahan | Tgl Diberlakukan\n1. | Dokumen Baru | Format Standar ILP | 2026' },
      ],
    };

    const newTabItem: GeneratorTabItem = {
      id: newId,
      title: newDoc.title,
      doc: newDoc,
      contextInput: '',
      customInstructions: '',
      targetPages: 2,
    };

    setTabs([...tabs, newTabItem]);
    setActiveTabId(newId);
    setCurrentDoc(newDoc);
    triggerNotice('Tab generator baru berhasil dibuka!');
  };

  // Close a tab
  const handleCloseTab = (tabIdToClose: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length <= 1) {
      triggerNotice('Minimal harus ada 1 tab generator aktif.');
      return;
    }

    const filtered = tabs.filter((t) => t.id !== tabIdToClose);
    setTabs(filtered);

    if (activeTabId === tabIdToClose) {
      const nextTab = filtered[0];
      setActiveTabId(nextTab.id);
      setCurrentDoc(nextTab.doc);
    }
    triggerNotice('Tab generator ditutup.');
  };

  // Switch tab
  const handleSelectTab = (tabId: string) => {
    setActiveTabId(tabId);
    const target = tabs.find((t) => t.id === tabId);
    if (target) {
      setCurrentDoc(target.doc);
    }
  };

  // Apply template from library
  const handleApplyTemplateById = (templateId: string) => {
    const tpl = storedTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const isStandardType = ['SOP', 'SK', 'KAK', 'PEDOMAN', 'PANDUAN'].includes(tpl.docType);
    const targetP = tpl.pageCount || activeTab.targetPages || 2;
    const newDoc: PuskesDoc = {
      ...activeDoc,
      title: tpl.name,
      docType: (isStandardType ? tpl.docType : 'CUSTOM') as DocumentType,
      customTypeName: !isStandardType ? tpl.name : undefined,
      sections: tpl.sections.map((s, idx) => ({
        id: s.id || `sec_tpl_${idx}`,
        title: s.title,
        content: s.content,
      })),
      useKop: tpl.useKopDefault ?? true,
      kopMode: tpl.kopMode || activeDoc.kopMode || 'manual',
      targetPages: targetP,
      sopMetadata: activeDoc.sopMetadata ? {
        ...activeDoc.sopMetadata,
        halaman: `1/${targetP}`,
      } : undefined,
      originalDocxHtml: tpl.originalDocxHtml,
    };

    updateActiveTab({ targetPages: targetP }, newDoc);
    triggerNotice(`Template "${tpl.name}" berhasil diterapkan otomatis ke dokumen!`);
  };

  // Change Document Type
  const handleTypeChange = (newTypeValue: string) => {
    // If it is from stored templates (prefixed with "tpl:")
    if (newTypeValue.startsWith('tpl:')) {
      const tplId = newTypeValue.replace('tpl:', '');
      handleApplyTemplateById(tplId);
      return;
    }

    const isCustom = customTypes.find((c) => c.id === newTypeValue);
    let defaultSections: DocumentSection[] = [];

    if (newTypeValue === 'SOP') {
      defaultSections = [
        { id: 'sec_1', title: '1. Pengertian', content: 'Uraian definisi dan ruang lingkup pelayanan terintegrasi...' },
        { id: 'sec_2', title: '2. Tujuan', content: 'Sebagai acuan penerapan langkah-langkah dalam pelayanan...' },
        { id: 'sec_3', title: '3. Kebijakan', content: 'Surat Keputusan Kepala {{nama_puskesmas}} Nomor {{nomor_surat_sk}} tentang...' },
        { id: 'sec_4', title: '4. Referensi', content: '1. Undang-Undang Nomor 17 Tahun 2023 tentang Kesehatan\n2. Kepmenkes HK.01.07/MENKES/2015/2023 tentang Juknis Integrasi Pelayanan Kesehatan Primer' },
        { id: 'sec_5', title: '5. Prosedur / Langkah-Langkah', content: '1. Petugas menyapa pasien dengan ramah dan memverifikasi identitas.\n2. Petugas melakukan skrining kesehatan sesuai siklus hidup.\n3. Petugas mencatat hasil pemeriksaan ke dalam sistem rekam medis.' },
        { id: 'sec_6', title: '6. Diagram Alir', content: 'Pendaftaran -> Ruang Pelayanan Klaster -> Pemeriksaan Penunjang (bila perlu) -> Farmasi/Rujuk' },
        { id: 'sec_7', title: '7. Unit Terkait', content: 'Pendaftaran, Ruang Pemeriksaan Klaster, Laboratorium, Farmasi' },
        { id: 'sec_8', title: '8. Rekaman Historis Perubahan', content: 'No | Yang Diubah | Isi Perubahan | Tgl Diberlakukan\n1.  | Format Dokumen | Penyesuaian Standar ILP | 2026' },
      ];
    } else if (newTypeValue === 'SK') {
      defaultSections = [
        { id: 'sec_sk_1', title: 'MENIMBANG', content: 'a. bahwa dalam rangka peningkatan mutu pelayanan kesehatan dan keselamatan pasien di {{nama_puskesmas}};\nb. bahwa untuk kelancaran pelaksanaan tugas perlu ditetapkan regulasi internal;\nc. bahwa berdasarkan pertimbangan sebagaimana dimaksud dalam huruf a dan b, perlu menetapkan Keputusan Kepala {{nama_puskesmas}};' },
        { id: 'sec_sk_2', title: 'MENGINGAT', content: '1. Undang-Undang Nomor 17 Tahun 2023 tentang Kesehatan;\n2. Peraturan Menteri Kesehatan Nomor 43 Tahun 2019 tentang Pusat Kesehatan Masyarakat;\n3. Keputusan Menteri Kesehatan Nomor HK.01.07/MENKES/2015/2023 tentang Integrasi Pelayanan Kesehatan Primer;' },
        { id: 'sec_sk_3', title: 'MEMUTUSKAN', content: 'MENETAPKAN: KEPUTUSAN KEPALA {{nama_puskesmas}} TENTANG PENETAPAN REGULASI OPERASIONAL.\n\nKESATU: Menetapkan standar pelaksanaan kegiatan sebagaimana tercantum dalam lampiran keputusan ini.\n\nKEDUA: Segala biaya yang timbul dibebankan pada anggaran yang sesuai.\n\nKETIGA: Keputusan ini berlaku sejak tanggal ditetapkan.' },
      ];
    } else if (newTypeValue === 'KAK') {
      defaultSections = [
        { id: 'sec_kak_1', title: 'I. Pendahuluan', content: 'Puskesmas merupakan faskes tingkat pertama yang menyelenggarakan pelayanan kesehatan terpadu...' },
        { id: 'sec_kak_2', title: 'II. Latar Belakang', content: 'Transformasi layanan primer berfokus pada pendekatan siklus hidup...' },
        { id: 'sec_kak_3', title: 'III. Tujuan', content: 'Tujuan Umum:\nMeningkatkan capaian mutu pelayanan.\n\nTujuan Khusus:\n1. Meningkatkan cakupan skrining kesehatan.\n2. Menjamin kontinuitas layanan.' },
        { id: 'sec_kak_4', title: 'IV. Kegiatan Pokok & Rincian Kegiatan', content: '1. Pelaksanaan skrining terpadu.\n2. Edukasi dan konseling kesehatan.\n3. Pencatatan dan evaluasi berkala.' },
        { id: 'sec_kak_5', title: 'V. Cara Melaksanakan Kegiatan', content: 'Kegiatan dilaksanakan secara komprehensif oleh tim kerja klaster...' },
        { id: 'sec_kak_6', title: 'VI. Sasaran', content: 'Masyarakat di wilayah kerja {{nama_puskesmas}}.' },
        { id: 'sec_kak_7', title: 'VII. Jadwal Pelaksanaan', content: 'Dilaksanakan secara berkala setiap bulan tahun {{tahun_anggaran}}.' },
        { id: 'sec_kak_8', title: 'VIII. Evaluasi Pelaksanaan Kegiatan', content: 'Evaluasi dilakukan setiap akhir bulan oleh Penanggung Jawab Klaster.' },
        { id: 'sec_kak_9', title: 'IX. Pencatatan & Pelaporan', content: 'Hasil kegiatan dicatat dan dilaporkan kepada Kepala Puskesmas.' },
      ];
    } else if (isCustom) {
      defaultSections = isCustom.defaultSections.map((s, idx) => ({
        id: `sec_custom_${idx}`,
        title: `${idx + 1}. ${s}`,
        content: `Uraian untuk ${s}...`,
      }));
    } else {
      defaultSections = [
        { id: 'sec_ped_1', title: 'BAB I PENDAHULUAN', content: 'Latar Belakang, Tujuan, dan Ruang Lingkup Pedoman...' },
        { id: 'sec_ped_2', title: 'BAB II STANDAR KETENAGAAN', content: 'Kualifikasi Sumber Daya Manusia dan Distribusi Ketenagaan...' },
        { id: 'sec_ped_3', title: 'BAB III STANDAR FASILITAS', content: 'Sarana, Prasarana, dan Denah Ruang Pelayanan...' },
        { id: 'sec_ped_4', title: 'BAB IV TATA LAKSANA PELAYANAN', content: 'Alur Pelayanan dan Langkah Penatalaksanaan Terintegrasi...' },
        { id: 'sec_ped_5', title: 'BAB V LOGISTIK & KESELAMATAN', content: 'Pengelolaan Bahan Medis Habis Pakai dan Manajemen Risiko...' },
        { id: 'sec_ped_6', title: 'BAB VI PENGENDALIAN MUTU', content: 'Indikator Mutu dan Evaluasi Kepatuhan Standar...' },
      ];
    }

    const updatedDoc: PuskesDoc = {
      ...activeDoc,
      docType: (isCustom ? 'CUSTOM' : newTypeValue) as DocumentType,
      customTypeName: isCustom ? isCustom.name : undefined,
      sections: defaultSections,
    };

    updateActiveTab({}, updatedDoc);
  };

  // Generate Document via Server-side AI
  const handleGenerateAI = async () => {
    setIsGenerating(true);
    setErrorMsg(null);

    const agentConfig = getStoredAgentConfig();
    const targetP = activeTab.targetPages || 2;

    try {
      const res = await fetch('/api/generate-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          docType: activeDoc.docType === 'CUSTOM' ? (activeDoc.customTypeName || 'Custom') : activeDoc.docType,
          klaster: activeKlasterInfo.name,
          title: activeDoc.title,
          context: activeTab.contextInput,
          customInstructions: activeTab.customInstructions,
          targetPages: targetP,
          variables: variables.reduce((acc: any, item) => {
            acc[item.key] = item.value;
            return acc;
          }, {}),
          customAgentConfig: agentConfig.enabled ? agentConfig : undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        const d = json.data;
        const newSections: DocumentSection[] = (d.sections || []).map((s: any, idx: number) => ({
          id: 'sec_gen_' + idx,
          title: s.title || `Bagian ${idx + 1}`,
          content: s.content || '',
        }));

        const updatedDoc: PuskesDoc = {
          ...activeDoc,
          title: d.title || activeDoc.title,
          docNumber: d.docNumber || activeDoc.docNumber,
          targetPages: targetP,
          sections: newSections.length > 0 ? newSections : activeDoc.sections,
          sopMetadata: d.sopMetadata ? {
            ...d.sopMetadata,
            halaman: `1/${targetP}`,
          } : {
            ...(activeDoc.sopMetadata || {
              noDokumen: activeDoc.docNumber,
              noRevisi: '00',
              tanggalTerbit: new Date().toLocaleDateString('id-ID'),
              unitTerkait: activeKlasterInfo.name,
              penanggungJawab: profile.kepalaPuskesmas,
            }),
            halaman: `1/${targetP}`,
          },
          rawFormattedText: d.rawFormattedText,
        };

        updateActiveTab({}, updatedDoc);
        triggerNotice(`Dokumen berhasil digenerate via AI (${json.provider === 'custom' ? 'Custom Agent' : 'Gemini 3.8 Flash'}) untuk ${targetP} halaman!`);
      } else {
        setErrorMsg(json.error || 'Gagal menghasilkan dokumen dari AI');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi gangguan jaringan saat menghubungi AI');
    } finally {
      setIsGenerating(false);
    }
  };

  // Execute bracket prompt [...] on a specific section
  const handleExecuteBracketPrompt = async (globalIdx: number) => {
    const sec = activeDoc.sections[globalIdx];
    if (!sec) return;
    setExecutingBracketIdx(globalIdx);
    setErrorMsg(null);

    const agentConfig = getStoredAgentConfig();

    try {
      const res = await fetch('/api/execute-bracket-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: sec.title,
          sectionContent: sec.content,
          docType: activeDoc.docType,
          klaster: activeKlasterInfo.name,
          docTitle: activeDoc.title,
          variables: variables.reduce((acc: any, v) => {
            acc[v.key] = v.value;
            return acc;
          }, {}),
          customAgentConfig: agentConfig.enabled ? agentConfig : undefined,
        }),
      });

      const json = await res.json();
      if (json.success && json.updatedContent) {
        const updated = [...activeDoc.sections];
        updated[globalIdx] = { ...sec, content: json.updatedContent };
        updateActiveTab({}, { ...activeDoc, sections: updated });
        triggerNotice(`Perintah AI [...] pada "${sec.title}" berhasil dieksekusi!`);
      } else {
        setErrorMsg(json.error || 'Gagal mengeksekusi perintah AI pada bagian ini');
      }
    } catch (err: any) {
      setErrorMsg(`Gagal: ${err.message}`);
    } finally {
      setExecutingBracketIdx(null);
    }
  };

  // Open Structured Prompt for External AI
  const handleOpenPrompt = () => {
    const promptText = generateStructuredPrompt(
      activeDoc.docType,
      activeDoc.klaster,
      activeDoc.title,
      activeTab.contextInput,
      profile,
      variables
    );
    onOpenPromptModal(promptText);
  };

  // Save Document to Local History
  const handleSaveDoc = () => {
    saveDocument(activeDoc);
    triggerNotice(`Dokumen "${activeDoc.title}" berhasil disimpan ke arsip!`);
  };

  // Download Word .DOCX
  const handleExportWord = async () => {
    try {
      await exportToDocx(activeDoc, profile);
      triggerNotice('Dokumen Word (.docx) berhasil dibuat dan diunduh!');
    } catch (err: any) {
      setErrorMsg(`Gagal mengekspor ke Word: ${err.message}`);
    }
  };

  // Print Document (Direct Print or Save as PDF)
  const handlePrint = () => {
    window.print();
  };

  // Export document as JSON
  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(activeDoc, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.docType}_${activeDoc.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    triggerNotice('Dokumen JSON berhasil diunduh!');
  };

  // Import document from JSON or Word (.docx)
  const handleImportDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.docx')) {
      try {
        const docxRes = await extractDocxAsHtml(file);
        const newCtx = activeTab.contextInput ? `${activeTab.contextInput}\n\n[Draf dari Berkas Word]:\n${docxRes.rawText}` : docxRes.rawText;
        const fileNameTitle = file.name.replace(/\.docx$/i, '');
        updateActiveTab({ contextInput: newCtx }, {
          ...activeDoc,
          title: fileNameTitle,
          originalDocxHtml: docxRes.html,
        });
        triggerNotice(`Naskah Word "${file.name}" berhasil dimuat sesuai tampilan aslinya dan siap diedit!`);
      } catch (err: any) {
        setErrorMsg(`Gagal membaca Word: ${err.message}`);
      }
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.title && parsed.docType) {
            updateActiveTab({}, parsed);
            triggerNotice('Dokumen berhasil dimuat dari file JSON!');
          } else {
            setErrorMsg('Format file JSON dokumen tidak valid.');
          }
        } catch {
          setErrorMsg('Gagal membaca berkas JSON.');
        }
      };
      reader.readAsText(file);
    }
  };

  // Quick insert variable into active section
  const handleInsertVariable = (key: string) => {
    const tag = `{{${key}}}`;
    if (activeDoc.sections.length > 0) {
      const updated = [...activeDoc.sections];
      updated[0].content += ` ${tag}`;
      updateActiveTab({}, { ...activeDoc, sections: updated });
    }
  };

  // Update a section content
  const handleSectionContentChange = (index: number, newContent: string) => {
    const updated = [...activeDoc.sections];
    updated[index].content = newContent;
    updateActiveTab({}, { ...activeDoc, sections: updated });
  };

  // Change target pages
  const handleTargetPagesChange = (num: number) => {
    const safeNum = Math.max(1, Math.min(10, num));
    const updatedDoc: PuskesDoc = {
      ...activeDoc,
      targetPages: safeNum,
      sopMetadata: activeDoc.sopMetadata ? {
        ...activeDoc.sopMetadata,
        halaman: `1/${safeNum}`,
      } : undefined,
    };
    updateActiveTab({ targetPages: safeNum }, updatedDoc);
  };

  // Determine pagination split of sections for multi-page rendering
  const totalTargetPages = activeTab.targetPages || 2;
  const sectionsPerPage = Math.max(1, Math.ceil(activeDoc.sections.length / totalTargetPages));

  return (
    <div className="max-w-7xl mx-auto px-4 lg:px-8 py-6 space-y-5">
      {/* MULTIPLE GENERATOR TABS BAR */}
      <div className="no-print bg-white p-2 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 overflow-x-auto">
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-x-auto py-0.5">
          {tabs.map((tab, idx) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                onClick={() => handleSelectTab(tab.id)}
                className={`group flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all border shrink-0 max-w-[220px] ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-50 to-pink-50 text-purple-900 border-purple-300 shadow-2xs ring-1 ring-purple-400/40'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span className="w-4 h-4 rounded-full bg-purple-600/10 text-purple-700 text-[10px] flex items-center justify-center font-mono">
                  {idx + 1}
                </span>
                <span className="truncate flex-1">
                  {tab.doc.title || `Dokumen ${idx + 1}`}
                </span>
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-100 text-purple-700 font-bold uppercase">
                  {tab.doc.docType}
                </span>
                {tabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab.id, e)}
                    className="text-slate-400 hover:text-rose-600 hover:bg-rose-50 p-0.5 rounded-md transition-colors"
                    title="Tutup tab ini"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            );
          })}

          {/* Add New Generator Tab Button */}
          <button
            type="button"
            onClick={handleAddNewTab}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 border-dashed transition-all shrink-0 hover:scale-102"
            title="Buka tab lembar kerja dokumen baru"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah Tab</span>
          </button>
        </div>

        {/* Global Action Toolbar */}
        <div className="flex items-center gap-1.5 shrink-0 pl-2 border-l border-slate-200">
          <button
            onClick={handleExportWord}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all hover:border-purple-300"
            title="Ekspor dokumen aktif ke file Microsoft Word (.docx)"
          >
            <Download className="w-3.5 h-3.5 text-purple-600" />
            <span className="hidden sm:inline">.DOCX</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl shadow-2xs transition-all hover:border-purple-300"
            title="Cetak langsung atau simpan sebagai PDF"
          >
            <Printer className="w-3.5 h-3.5 text-pink-600" />
            <span className="hidden sm:inline">Cetak</span>
          </button>
          <button
            onClick={handleSaveDoc}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl shadow-sm shadow-purple-500/20 transition-all active:scale-95"
            title="Simpan dokumen ini ke arsip lokal"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
        </div>
      </div>

      {/* Banner & Klaster Summary */}
      <div className="p-4 rounded-2xl holo-card border border-purple-200/80 flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-purple-600 text-white shadow-2xs">
              ILP Klaster {activeKlasterInfo.number}
            </span>
            <h1 className="text-sm font-bold text-slate-900">{activeKlasterInfo.name}</h1>
          </div>
          <p className="text-[11px] text-slate-500 max-w-2xl">{activeKlasterInfo.description}</p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
            Format: <strong className="text-purple-700">{activeDoc.docType}</strong>
          </span>
          <span className="px-2.5 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
            Target: <strong className="text-purple-700">{totalTargetPages} Halaman</strong>
          </span>
        </div>
      </div>

      {/* Notices */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in shadow-2xs no-print">
          <Check className="w-4 h-4 text-emerald-600" />
          <span>{successNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 animate-fade-in no-print">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* PANEL KIRI: Kontrol Form & Parameter AI (5 Kolom) */}
        <div className="lg:col-span-5 space-y-4 no-print">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-slate-800 flex items-center gap-2 border-b border-slate-100 pb-2.5">
              <FileText className="w-4 h-4 text-purple-600" />
              Pengaturan Dokumen Akreditasi
            </h3>

            {/* Pilihan Jenis Dokumen (Otomatis mencakup Pustaka Template) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Pilih Jenis Dokumen
                </label>
                {onNavigateToTemplates && (
                  <button
                    type="button"
                    onClick={onNavigateToTemplates}
                    className="text-[11px] font-bold text-purple-700 hover:text-purple-900 flex items-center gap-1 hover:underline transition-all"
                    title="Buka Tab Pustaka Template untuk kelola, edit, dan import/export seluruh template"
                  >
                    <BookOpen className="w-3.5 h-3.5 text-purple-600" />
                    <span>Pustaka Template ({storedTemplates.length})</span>
                  </button>
                )}
              </div>

              <select
                value={activeDoc.docType === 'CUSTOM' ? (activeDoc.customTypeName || 'CUSTOM') : activeDoc.docType}
                onChange={(e) => handleTypeChange(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-semibold bg-white"
              >
                <optgroup label="Standar Akreditasi Kemenkes">
                  <option value="SOP">SOP (Standar Operasional Prosedur - Kotak Akreditasi)</option>
                  <option value="SK">SK (Surat Keputusan Kepala Puskesmas)</option>
                  <option value="KAK">KAK (Kerangka Acuan Kerja 9 Bab)</option>
                  <option value="PEDOMAN">Pedoman Pelayanan Puskesmas</option>
                  <option value="PANDUAN">Panduan Operasional Teknis</option>
                </optgroup>

                {storedTemplates.length > 0 && (
                  <optgroup label={`Pustaka Template Tersimpan (${storedTemplates.length} Template)`}>
                    {storedTemplates.map((t) => (
                      <option key={t.id} value={`tpl:${t.id}`}>
                        [{t.docType}] {t.name} ({t.sections.length} bagian)
                      </option>
                    ))}
                  </optgroup>
                )}

                {customTypes.length > 0 && (
                  <optgroup label="Format Kustom Lainnya">
                    {customTypes.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </optgroup>
                )}
              </select>

              {/* Import & Export Dokumen Bar */}
              <div className="flex items-center gap-1.5 pt-2">
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200"
                  title="Ekspor dokumen format JSON"
                >
                  <Download className="w-3 h-3 text-purple-600" />
                  Ekspor JSON
                </button>
                <label
                  className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border border-slate-200 cursor-pointer"
                  title="Impor dokumen dari JSON atau Word .docx"
                >
                  <Upload className="w-3 h-3 text-pink-600" />
                  Impor (.json / .docx)
                  <input
                    type="file"
                    accept=".json,.docx"
                    onChange={handleImportDocument}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Target Jumlah Halaman yang Mau Digenerate */}
            <div className="p-3 rounded-xl bg-purple-50/50 border border-purple-200/70 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Jumlah Halaman yang Digenerate
                  </label>
                  <p className="text-[10px] text-slate-500">AI mengatur kepadatan materi & rincian prosedur</p>
                </div>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={totalTargetPages}
                    onChange={(e) => handleTargetPagesChange(parseInt(e.target.value, 10) || 1)}
                    className="w-14 px-2 py-1 text-xs font-bold text-center border border-purple-300 rounded-lg bg-white text-purple-900 focus:ring-1 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold text-purple-900">Hal</span>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 pt-0.5">
                {[1, 2, 3, 4, 5].map((pages) => (
                  <button
                    key={pages}
                    type="button"
                    onClick={() => handleTargetPagesChange(pages)}
                    className={`flex-1 py-1 text-[11px] font-semibold rounded-lg border transition-all ${
                      totalTargetPages === pages
                        ? 'bg-purple-600 text-white border-purple-600 shadow-2xs'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-purple-300 hover:bg-purple-50/40'
                    }`}
                  >
                    {pages} Hal
                  </button>
                ))}
              </div>
            </div>

            {/* Pilihan Klaster ILP */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pilih Klaster ILP (Integrasi Layanan Primer)
              </label>
              <select
                value={activeDoc.klaster}
                onChange={(e) => updateActiveTab({}, { ...activeDoc, klaster: e.target.value as IlpKlaster })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 bg-white"
              >
                {ILP_KLASTERS.map((k) => (
                  <option key={k.id} value={k.id}>{k.name}</option>
                ))}
              </select>
            </div>

            {/* Mode KOP Surat - Fixed Icon & Error Handling */}
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-white border border-purple-200 flex items-center justify-center p-1 overflow-hidden shrink-0 shadow-2xs">
                    {profile.logoPuskesmas && !kopLogoError ? (
                      <img 
                        src={profile.logoPuskesmas} 
                        alt="Logo Puskesmas" 
                        onError={() => setKopLogoError(true)}
                        className="max-w-full max-h-full object-contain" 
                      />
                    ) : (
                      <Building2 className="w-4 h-4 text-purple-600" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Gunakan KOP Surat Resmi</span>
                    <p className="text-[10px] text-slate-500">{profile.namaPuskesmas || 'Puskesmas'}</p>
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={activeDoc.useKop}
                    onChange={(e) => updateActiveTab({}, { ...activeDoc, useKop: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              {/* Pilihan Mode KOP yang akan dipakai */}
              {activeDoc.useKop && (
                <div className="pt-2 border-t border-purple-100 space-y-1.5 animate-fade-in">
                  <label className="block text-[11px] font-bold text-slate-700">
                    Pilih Mode KOP yang Akan Dipakai:
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {/* Mode 1: Manual / Teks Standar */}
                    <button
                      type="button"
                      onClick={() => updateActiveTab({}, { ...activeDoc, kopMode: 'manual' })}
                      className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        (activeDoc.kopMode || profile.kopMode || 'manual') === 'manual'
                          ? 'bg-white border-purple-600 text-purple-900 shadow-2xs ring-1 ring-purple-600'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <FileText className="w-3.5 h-3.5 text-purple-600" />
                        {(activeDoc.kopMode || profile.kopMode || 'manual') === 'manual' && (
                          <span className="w-2 h-2 rounded-full bg-purple-600" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold leading-tight block">Teks Baku</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 block leading-tight">2 Logo + Teks</span>
                    </button>

                    {/* Mode 2: Gambar KOP Jadi */}
                    <button
                      type="button"
                      onClick={() => updateActiveTab({}, { ...activeDoc, kopMode: 'image' })}
                      className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        activeDoc.kopMode === 'image' || (!activeDoc.kopMode && profile.kopMode === 'image')
                          ? 'bg-white border-purple-600 text-purple-900 shadow-2xs ring-1 ring-purple-600'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <ImageIcon className="w-3.5 h-3.5 text-pink-600" />
                        {(activeDoc.kopMode === 'image' || (!activeDoc.kopMode && profile.kopMode === 'image')) && (
                          <span className="w-2 h-2 rounded-full bg-pink-600" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold leading-tight block">Gambar KOP</span>
                      <span className={`text-[9px] mt-0.5 block leading-tight ${profile.gambarKopJadi ? 'text-emerald-600 font-medium' : 'text-amber-600'}`}>
                        {profile.gambarKopJadi ? 'Gambar Siap' : 'Belum Upload'}
                      </span>
                    </button>

                    {/* Mode 3: Editor KOP Visual */}
                    <button
                      type="button"
                      onClick={() => updateActiveTab({}, { ...activeDoc, kopMode: 'drag_editor' })}
                      className={`p-2 rounded-lg border text-left transition-all flex flex-col justify-between ${
                        activeDoc.kopMode === 'drag_editor' || (!activeDoc.kopMode && profile.kopMode === 'drag_editor')
                          ? 'bg-white border-purple-600 text-purple-900 shadow-2xs ring-1 ring-purple-600'
                          : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                        {(activeDoc.kopMode === 'drag_editor' || (!activeDoc.kopMode && profile.kopMode === 'drag_editor')) && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600" />
                        )}
                      </div>
                      <span className="text-[11px] font-bold leading-tight block">Editor Visual</span>
                      <span className="text-[9px] text-slate-400 mt-0.5 block leading-tight">Desain Profil</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Judul Dokumen & Nomor */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Judul Dokumen</span>
                  <span className="text-[10px] text-purple-600 font-mono">Ketik {'{{'} untuk variabel</span>
                </label>
                <input
                  type="text"
                  value={activeDoc.title}
                  onChange={(e) => {
                    updateActiveTab({}, { ...activeDoc, title: e.target.value });
                    handleInputCheckTrigger(e, 'title');
                  }}
                  onKeyUp={(e) => handleInputCheckTrigger(e, 'title')}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Contoh: Pemeriksaan ANC Terpadu Klaster Ibu dan Anak"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-bold"
                />
              </div>

              {/* Rekomendasi Judul Klaster */}
              <div className="flex flex-wrap gap-1">
                <span className="text-[10px] text-slate-400 font-semibold mr-1">Rekomendasi Judul:</span>
                {activeKlasterInfo.examples.map((ex, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => updateActiveTab({}, { ...activeDoc, title: ex })}
                    className="text-[10px] px-2 py-0.5 bg-slate-100 hover:bg-purple-50 hover:text-purple-700 rounded border border-slate-200 text-slate-600 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Nomor Dokumen / No. SK</span>
                  <span className="text-[10px] text-purple-600 font-mono">Ketik {'{{'} untuk variabel</span>
                </label>
                <input
                  type="text"
                  value={activeDoc.docNumber}
                  onChange={(e) => {
                    updateActiveTab({}, { ...activeDoc, docNumber: e.target.value });
                    handleInputCheckTrigger(e, 'docNumber');
                  }}
                  onKeyUp={(e) => handleInputCheckTrigger(e, 'docNumber')}
                  onKeyDown={handleInputKeyDown}
                  placeholder="Contoh: 440/012/SOP/PKM.BBK/2026"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg font-mono"
                />
              </div>
            </div>

            {/* Catatan Alur / Konteks Khusus */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Catatan Alur Pelayanan / Notulensi Acuan</span>
                <span className="text-[10px] text-purple-600 font-mono">Ketik {'{{'} untuk variabel</span>
              </label>
              <textarea
                rows={3}
                value={activeTab.contextInput}
                onChange={(e) => {
                  updateActiveTab({ contextInput: e.target.value });
                  handleInputCheckTrigger(e, 'contextInput');
                }}
                onKeyUp={(e) => handleInputCheckTrigger(e, 'contextInput')}
                onKeyDown={handleInputKeyDown}
                placeholder="Tuliskan catatan alur, petugas pemeriksa, atau ketik {{ untuk memanggil daftar variabel atau selesaikan manual..."
                className="w-full p-2.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500"
              />
            </div>

            {/* AI Generator Action Buttons */}
            <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
              <button
                onClick={handleGenerateAI}
                disabled={isGenerating || !activeDoc.title.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-purple-600 via-fuchsia-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 rounded-xl shadow-md shadow-purple-500/20 transition-all active:scale-95"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Membuat Dokumen via AI ({totalTargetPages} Halaman)...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-fuchsia-200" />
                    Generate Otomatis via AI ({totalTargetPages} Halaman)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOpenPrompt}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                Salin Prompt Manual (untuk ChatGPT / Gemini Web)
              </button>
            </div>
          </div>
        </div>

        {/* PANEL KANAN: Lembar Kerja A4 Presisi & Live Document Preview (7 Kolom) */}
        <div className="lg:col-span-7 space-y-3">
          {/* Paper View Controls & Multi-Page Selector */}
          <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs no-print">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-purple-600" />
                Lembar Kerja Naskah Dinas (Arial)
              </span>
            </div>

            {/* Page Selection Bar */}
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 px-1 uppercase tracking-wider">
                Halaman:
              </span>
              <button
                type="button"
                onClick={() => setSelectedPreviewPage('all')}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                  selectedPreviewPage === 'all'
                    ? 'bg-purple-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                }`}
              >
                Semua ({totalTargetPages})
              </button>

              {Array.from({ length: totalTargetPages }, (_, i) => i + 1).map((pageNo) => (
                <button
                  key={pageNo}
                  type="button"
                  onClick={() => setSelectedPreviewPage(pageNo)}
                  className={`w-7 h-6 text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                    selectedPreviewPage === pageNo
                      ? 'bg-purple-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
                  }`}
                  title={`Tampilkan Lembar Halaman ${pageNo}`}
                >
                  {pageNo}
                </button>
              ))}

              <div className="flex items-center gap-0.5 pl-1 border-l border-slate-300">
                <button
                  type="button"
                  disabled={selectedPreviewPage === 'all' || selectedPreviewPage === 1}
                  onClick={() => {
                    if (typeof selectedPreviewPage === 'number' && selectedPreviewPage > 1) {
                      setSelectedPreviewPage(selectedPreviewPage - 1);
                    }
                  }}
                  className="p-1 text-slate-600 hover:text-purple-600 disabled:opacity-30 rounded hover:bg-white"
                  title="Halaman Sebelumnya"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={selectedPreviewPage === 'all' || selectedPreviewPage === totalTargetPages}
                  onClick={() => {
                    if (typeof selectedPreviewPage === 'number' && selectedPreviewPage < totalTargetPages) {
                      setSelectedPreviewPage(selectedPreviewPage + 1);
                    }
                  }}
                  className="p-1 text-slate-600 hover:text-purple-600 disabled:opacity-30 rounded hover:bg-white"
                  title="Halaman Selanjutnya"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            <label className="flex items-center gap-1.5 text-xs cursor-pointer select-none text-slate-600">
              <input
                type="checkbox"
                checked={showResolvedValues}
                onChange={(e) => setShowResolvedValues(e.target.checked)}
                className="rounded text-purple-600 focus:ring-purple-500 h-3.5 w-3.5"
              />
              <span>Nilai Nyata Faskes</span>
            </label>
          </div>

          {/* Real A4 Paper Simulation Container */}
          <div className="bg-slate-200/80 p-4 sm:p-6 rounded-2xl border border-slate-300 shadow-inner flex flex-col items-center gap-6 overflow-x-auto">
            {/* If 'all' is selected: Render distinct stacked A4 sheets for each page */}
            {selectedPreviewPage === 'all' ? (
              Array.from({ length: totalTargetPages }, (_, pIdx) => {
                const pageNumber = pIdx + 1;
                const pageSections = activeDoc.sections.slice(
                  pIdx * sectionsPerPage,
                  (pIdx + 1) * sectionsPerPage
                );

                return (
                  <div
                    key={pageNumber}
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      width: '100%',
                      maxWidth: '794px',
                      minHeight: '1050px',
                    }}
                    className="a4-page bg-white text-slate-900 p-8 sm:p-12 shadow-xl rounded-sm border border-slate-300 space-y-6 leading-relaxed select-text flex flex-col justify-between"
                  >
                    <div className="space-y-5">
                      {/* Page Header Indicator */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-200 pb-1 font-mono no-print">
                        <span>{activeDoc.title} · {activeDoc.docType}</span>
                        <span>Lembar Kerja {pageNumber} dari {totalTargetPages}</span>
                      </div>

                      {/* If original DOCX HTML is available: Render authentic document appearance directly editable */}
                      {activeDoc.originalDocxHtml ? (
                        <div className="space-y-4">
                          <div className="p-2.5 bg-pink-50 border border-pink-200 rounded-xl flex items-center justify-between text-xs text-pink-900 no-print">
                            <span className="font-semibold flex items-center gap-1.5">
                              <FileCheck className="w-4 h-4 text-pink-600" />
                              Format Naskah Word Asli (.docx) — Tampilan Sesuai Aslinya
                            </span>
                            <button
                              type="button"
                              onClick={() => updateActiveTab({}, { ...activeDoc, originalDocxHtml: undefined })}
                              className="text-[10px] text-pink-700 underline font-medium hover:text-pink-900"
                            >
                              Beralih ke Format Standar
                            </button>
                          </div>
                          <div
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            onInput={(e) => {
                              updateActiveTab({}, { ...activeDoc, originalDocxHtml: e.currentTarget.innerHTML });
                            }}
                            dangerouslySetInnerHTML={{ __html: activeDoc.originalDocxHtml }}
                            className="docx-document-content min-h-[750px] p-2 leading-relaxed select-text focus:outline-none focus:ring-1 focus:ring-purple-300 rounded cursor-text"
                            title="Klik di sini untuk langsung mengedit naskah dokumen sesuai aslinya"
                          />
                        </div>
                      ) : (
                        <>
                          {/* Halaman 1: Render KOP & Dokumen Header */}
                          {pageNumber === 1 && (
                            <>
                              {/* 1. KOP SURAT */}
                              {activeDoc.useKop && (
                            (() => {
                              const effectiveKopMode = activeDoc.kopMode || profile.kopMode || 'manual';

                              // Mode 2: Gambar KOP Jadi
                              if (effectiveKopMode === 'image') {
                                if (profile.gambarKopJadi) {
                                  return (
                                    <div className="text-center border-b-2 border-slate-900 pb-2 mb-2">
                                      <img
                                        src={profile.gambarKopJadi}
                                        alt="KOP Surat Resmi Jadi"
                                        className="w-full max-h-36 object-contain mx-auto"
                                      />
                                    </div>
                                  );
                                }
                                return (
                                  <div className="space-y-2 mb-2">
                                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-800 no-print">
                                      <span className="font-semibold block">⚠️ Mode Gambar KOP Terpilih (Berkas belum diunggah)</span>
                                      <span className="text-[10px] text-amber-600 block mt-0.5">
                                        Menampilkan KOP Teks Standar sementara. Unggah berkas gambar KOP di tab Profil Faskes.
                                      </span>
                                    </div>
                                    <div className="text-center border-b-2 border-slate-900 pb-2">
                                      <div className="flex items-center justify-between gap-3 px-2">
                                        {profile.logoPemda && (
                                          <img 
                                            src={profile.logoPemda} 
                                            alt="Pemda" 
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            className="w-14 h-14 object-contain" 
                                          />
                                        )}
                                        <div className="flex-1 text-center">
                                          <p className="text-[12px] font-bold text-slate-800 tracking-wider">{profile.pemerintahDaerah?.toUpperCase()}</p>
                                          <p className="text-[13px] font-bold text-slate-900 tracking-wider">{profile.dinasKesehatan?.toUpperCase()}</p>
                                          <p className="text-[15px] font-black text-slate-950 tracking-wider">{profile.namaPuskesmas?.toUpperCase()}</p>
                                          <p className="text-[10px] text-slate-600 italic mt-0.5">{profile.alamat} · Telp: {profile.telepon}</p>
                                        </div>
                                        {profile.logoPuskesmas && (
                                          <img 
                                            src={profile.logoPuskesmas} 
                                            alt="Puskesmas" 
                                            onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                            className="w-14 h-14 object-contain" 
                                          />
                                        )}
                                      </div>
                                      <div className="border-b-2 border-slate-900 mt-2" />
                                      <div className="border-b border-slate-900 mt-[1px]" />
                                    </div>
                                  </div>
                                );
                              }

                              // Mode 1 & 3: Teks Baku Standar
                              return (
                                <div className="text-center border-b-2 border-slate-900 pb-2">
                                  <div className="flex items-center justify-between gap-3 px-2">
                                    {profile.logoPemda ? (
                                      <img 
                                        src={profile.logoPemda} 
                                        alt="Pemda" 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        className="w-14 h-14 object-contain" 
                                      />
                                    ) : <div className="w-14 h-14" />}
                                    <div className="flex-1 text-center">
                                      <p className="text-[12px] font-bold text-slate-800 tracking-wider">
                                        {profile.pemerintahDaerah?.toUpperCase()}
                                      </p>
                                      <p className="text-[13px] font-bold text-slate-900 tracking-wider">
                                        {profile.dinasKesehatan?.toUpperCase()}
                                      </p>
                                      <p className="text-[15px] font-black text-slate-950 tracking-wider">
                                        {profile.namaPuskesmas?.toUpperCase()}
                                      </p>
                                      <p className="text-[10px] text-slate-600 italic mt-0.5">
                                        {profile.alamat} · Telp: {profile.telepon} · Email: {profile.email}
                                      </p>
                                    </div>
                                    {profile.logoPuskesmas ? (
                                      <img 
                                        src={profile.logoPuskesmas} 
                                        alt="Puskesmas" 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        className="w-14 h-14 object-contain" 
                                      />
                                    ) : <div className="w-14 h-14" />}
                                  </div>
                                  <div className="border-b-2 border-slate-900 mt-2" />
                                  <div className="border-b border-slate-900 mt-[1px]" />
                                </div>
                              );
                            })()
                          )}

                          {/* 2. DRAFT FORMAT: SOP KOTAK AKREDITASI */}
                          {activeDoc.docType === 'SOP' && (
                            <div className="space-y-4">
                              <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                                <tbody>
                                  <tr>
                                    <td rowSpan={2} className="border-2 border-slate-900 p-3 text-center font-bold text-sm w-1/2 align-middle">
                                      {activeDoc.title?.toUpperCase()}
                                    </td>
                                    <td className="border-2 border-slate-900 p-2 text-xs space-y-0.5 w-1/2">
                                      <p><strong>No. Dokumen</strong> : {activeDoc.sopMetadata?.noDokumen || activeDoc.docNumber || '440/SOP/PKM/2026'}</p>
                                      <p><strong>No. Revisi</strong>   : {activeDoc.sopMetadata?.noRevisi || '00'}</p>
                                      <p><strong>SOP</strong></p>
                                      <p><strong>Tanggal Terbit</strong>: {activeDoc.sopMetadata?.tanggalTerbit || new Date().toLocaleDateString('id-ID')}</p>
                                      <p><strong>Halaman</strong>      : {`1/${totalTargetPages}`}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="border-2 border-slate-900 p-2 text-xs">
                                      <p className="font-semibold">Ditetapkan Oleh:</p>
                                      <p className="text-[11px]">{profile.jabatanKepala}</p>
                                      <div className="h-10" />
                                      <p className="font-bold underline text-xs">{profile.kepalaPuskesmas}</p>
                                      <p className="text-[11px]">NIP. {profile.nipKepala}</p>
                                    </td>
                                  </tr>
                                  <tr>
                                    <td className="border-2 border-slate-900 p-2 text-center font-bold text-xs uppercase bg-slate-50">
                                      {profile.namaPuskesmas}
                                    </td>
                                    <td className="border-2 border-slate-900 p-2 text-xs font-semibold bg-slate-50">
                                      Unit/Klaster: {activeKlasterInfo.name}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* 2b. DRAFT FORMAT: SK KEPUTUSAN */}
                          {activeDoc.docType === 'SK' && (
                            <div className="text-center space-y-1.5 pb-2">
                              <p className="text-sm font-bold tracking-wide">
                                KEPUTUSAN KEPALA {profile.namaPuskesmas?.toUpperCase()}
                              </p>
                              <p className="text-xs font-bold font-mono">
                                NOMOR : {activeDoc.docNumber || '440/012/SK/PKM.BBK/2026'}
                              </p>
                              <p className="text-xs font-bold pt-1">TENTANG</p>
                              <p className="text-sm font-bold max-w-lg mx-auto pt-1 leading-snug">
                                {activeDoc.title?.toUpperCase()}
                              </p>
                              <p className="text-xs font-bold pt-2">
                                DENGAN RAHMAT TUHAN YANG MAHA ESA<br />
                                KEPALA {profile.namaPuskesmas?.toUpperCase()},
                              </p>
                            </div>
                          )}

                          {/* 2c. DRAFT FORMAT: KAK / PEDOMAN / CUSTOM */}
                          {activeDoc.docType !== 'SOP' && activeDoc.docType !== 'SK' && (
                            <div className="text-center space-y-1 border-b border-slate-200 pb-3">
                              <p className="text-sm font-bold tracking-wide">
                                {activeDoc.docType === 'KAK' ? 'KERANGKA ACUAN KERJA (KAK)' : (activeDoc.customTypeName || activeDoc.title)?.toUpperCase()}
                              </p>
                              <p className="text-xs font-semibold text-slate-700">
                                {activeDoc.title}
                              </p>
                              <p className="text-[11px] font-mono text-slate-500">
                                {activeKlasterInfo.name} · Tahun {new Date().getFullYear()}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* Halaman 2+: Running Header Naskah Dinas */}
                      {pageNumber > 1 && (
                        <div className="border-b border-slate-300 pb-2 text-[11px] flex items-center justify-between text-slate-700">
                          <span className="font-bold truncate max-w-sm">{activeDoc.title}</span>
                          <span className="font-mono">No: {activeDoc.docNumber || '440/PKM/2026'}</span>
                        </div>
                      )}

                      {/* Sections for this page */}
                      <div className="space-y-4 pt-1">
                        {pageSections.map((sec, localIdx) => {
                          const globalIdx = pIdx * sectionsPerPage + localIdx;
                          return (
                            <div key={sec.id} className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={sec.title}
                                  onChange={(e) => {
                                    const updated = [...activeDoc.sections];
                                    updated[globalIdx] = { ...sec, title: e.target.value };
                                    updateActiveTab({}, { ...activeDoc, sections: updated });
                                    handleInputCheckTrigger(e, `section_title_${globalIdx}`, globalIdx);
                                  }}
                                  onKeyUp={(e) => handleInputCheckTrigger(e, `section_title_${globalIdx}`, globalIdx)}
                                  onKeyDown={handleInputKeyDown}
                                  className="text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-purple-300 rounded px-1 py-0.5 flex-1"
                                  placeholder="Judul Bagian"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setAutocomplete({
                                      isOpen: true,
                                      query: '',
                                      fieldId: `section_${globalIdx}`,
                                      sectionIdx: globalIdx,
                                      cursorIndex: sec.content.length,
                                      position: { top: rect.bottom, left: Math.max(16, rect.left - 150) },
                                      selectedIndex: 0,
                                    });
                                  }}
                                  className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded transition-all no-print flex items-center gap-1 shrink-0"
                                  title="Sisipkan variabel ke bagian ini"
                                >
                                  <Variable className="w-3 h-3" />
                                  <span>{`{{ }}`}</span>
                                </button>
                              </div>

                              {/* Bracket Prompt [...] Detection & One-Click AI Execution */}
                              {sec.content.includes('[') && sec.content.includes(']') && (
                                <div className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg text-purple-900 text-[11px] font-semibold animate-fade-in no-print">
                                  <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                    <span className="truncate">Perintah AI <code>[...]</code> terdeteksi di bagian ini</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteBracketPrompt(globalIdx)}
                                    disabled={executingBracketIdx === globalIdx}
                                    className="shrink-0 px-2.5 py-1 text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-md shadow-2xs flex items-center gap-1 transition-all"
                                  >
                                    {executingBracketIdx === globalIdx ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Mengeksekusi...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3 text-pink-300" />
                                        <span>Jalankan Prompt [...] via AI</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              <textarea
                                rows={Math.max(2, sec.content.split('\n').length + 1)}
                                value={showResolvedValues && focusedField !== `section_${globalIdx}` ? substituteVariables(sec.content, variables) : sec.content}
                                onFocus={() => setFocusedField(`section_${globalIdx}`)}
                                onBlur={() => setFocusedField(null)}
                                onChange={(e) => {
                                  handleSectionContentChange(globalIdx, e.target.value);
                                  handleInputCheckTrigger(e, `section_${globalIdx}`, globalIdx);
                                }}
                                onKeyUp={(e) => handleInputCheckTrigger(e, `section_${globalIdx}`, globalIdx)}
                                onKeyDown={handleInputKeyDown}
                                placeholder="Tuliskan isi bagian dokumen. Ketik {{ untuk variabel, atau ketik [perintah untuk AI]..."
                                className="w-full p-2 text-xs font-sans text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-400 rounded focus:outline-none leading-relaxed resize-y transition-colors"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Sign-off Block on Last Page */}
                      {pageNumber === totalTargetPages && activeDoc.docType !== 'SOP' && (
                        <div className="pt-6 flex justify-end">
                          <div className="text-right text-xs space-y-0.5 w-64">
                            <p>Ditetapkan di: {profile.kabupatenKota}</p>
                            <p>Pada tanggal : {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="font-bold pt-2">{profile.jabatanKepala?.toUpperCase()},</p>
                            <div className="h-14" />
                            <p className="font-bold underline text-xs">{profile.kepalaPuskesmas}</p>
                            <p className="text-[11px]">NIP. {profile.nipKepala}</p>
                          </div>
                        </div>
                      )}
                        </>
                      )}
                    </div>

                    {/* Bottom Page Footer */}
                    <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{profile.namaPuskesmas} · Akreditasi ILP 2026</span>
                      <span>Halaman {pageNumber} dari {totalTargetPages}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              /* Single Selected Page Preview */
              (() => {
                const pageNumber = typeof selectedPreviewPage === 'number' ? selectedPreviewPage : 1;
                const pageSections = activeDoc.sections.slice(
                  (pageNumber - 1) * sectionsPerPage,
                  pageNumber * sectionsPerPage
                );

                return (
                  <div
                    style={{
                      fontFamily: 'Arial, sans-serif',
                      width: '100%',
                      maxWidth: '794px',
                      minHeight: '1050px',
                    }}
                    className="a4-page bg-white text-slate-900 p-8 sm:p-12 shadow-xl rounded-sm border border-slate-300 space-y-6 leading-relaxed select-text flex flex-col justify-between"
                  >
                    <div className="space-y-5">
                      {/* Page Header */}
                      <div className="flex items-center justify-between text-[10px] text-slate-400 border-b border-slate-200 pb-1 font-mono no-print">
                        <span>{activeDoc.title} · {activeDoc.docType}</span>
                        <span className="font-bold text-purple-700">Fokus Lembar Halaman {pageNumber} dari {totalTargetPages}</span>
                      </div>

                      {/* If original DOCX HTML is available: Render authentic document appearance directly editable */}
                      {activeDoc.originalDocxHtml ? (
                        <div className="space-y-4">
                          <div className="p-2.5 bg-pink-50 border border-pink-200 rounded-xl flex items-center justify-between text-xs text-pink-900 no-print">
                            <span className="font-semibold flex items-center gap-1.5">
                              <FileCheck className="w-4 h-4 text-pink-600" />
                              Format Naskah Word Asli (.docx) — Tampilan Sesuai Aslinya
                            </span>
                            <button
                              type="button"
                              onClick={() => updateActiveTab({}, { ...activeDoc, originalDocxHtml: undefined })}
                              className="text-[10px] text-pink-700 underline font-medium hover:text-pink-900"
                            >
                              Beralih ke Format Standar
                            </button>
                          </div>
                          <div
                            contentEditable={true}
                            suppressContentEditableWarning={true}
                            onBlur={(e) => {
                              updateActiveTab({}, { ...activeDoc, originalDocxHtml: e.currentTarget.innerHTML });
                            }}
                            dangerouslySetInnerHTML={{ __html: activeDoc.originalDocxHtml }}
                            className="docx-document-content min-h-[750px] p-2 leading-relaxed select-text focus:outline-none focus:ring-1 focus:ring-purple-300 rounded cursor-text"
                            title="Klik di sini untuk langsung mengedit naskah dokumen sesuai aslinya"
                          />
                        </div>
                      ) : (
                        <>
                          {/* If Page 1: Render KOP and Document Heading */}
                          {pageNumber === 1 && (
                            <>
                              {/* 1. KOP SURAT */}
                              {activeDoc.useKop && (
                                (() => {
                                  const effectiveKopMode = activeDoc.kopMode || profile.kopMode || 'manual';

                              if (effectiveKopMode === 'image' && profile.gambarKopJadi) {
                                return (
                                  <div className="text-center border-b-2 border-slate-900 pb-2 mb-2">
                                    <img
                                      src={profile.gambarKopJadi}
                                      alt="KOP Surat Resmi Jadi"
                                      className="w-full max-h-36 object-contain mx-auto"
                                    />
                                  </div>
                                );
                              }

                              return (
                                <div className="text-center border-b-2 border-slate-900 pb-2">
                                  <div className="flex items-center justify-between gap-3 px-2">
                                    {profile.logoPemda ? (
                                      <img 
                                        src={profile.logoPemda} 
                                        alt="Pemda" 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        className="w-14 h-14 object-contain" 
                                      />
                                    ) : <div className="w-14 h-14" />}
                                    <div className="flex-1 text-center">
                                      <p className="text-[12px] font-bold text-slate-800 tracking-wider">
                                        {profile.pemerintahDaerah?.toUpperCase()}
                                      </p>
                                      <p className="text-[13px] font-bold text-slate-900 tracking-wider">
                                        {profile.dinasKesehatan?.toUpperCase()}
                                      </p>
                                      <p className="text-[15px] font-black text-slate-950 tracking-wider">
                                        {profile.namaPuskesmas?.toUpperCase()}
                                      </p>
                                      <p className="text-[10px] text-slate-600 italic mt-0.5">
                                        {profile.alamat} · Telp: {profile.telepon}
                                      </p>
                                    </div>
                                    {profile.logoPuskesmas ? (
                                      <img 
                                        src={profile.logoPuskesmas} 
                                        alt="Puskesmas" 
                                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                        className="w-14 h-14 object-contain" 
                                      />
                                    ) : <div className="w-14 h-14" />}
                                  </div>
                                  <div className="border-b-2 border-slate-900 mt-2" />
                                  <div className="border-b border-slate-900 mt-[1px]" />
                                </div>
                              );
                            })()
                          )}

                          {/* SOP Kotak Akreditasi */}
                          {activeDoc.docType === 'SOP' && (
                            <table className="w-full border-collapse border-2 border-slate-900 text-xs">
                              <tbody>
                                <tr>
                                  <td rowSpan={2} className="border-2 border-slate-900 p-3 text-center font-bold text-sm w-1/2 align-middle">
                                    {activeDoc.title?.toUpperCase()}
                                  </td>
                                  <td className="border-2 border-slate-900 p-2 text-xs space-y-0.5 w-1/2">
                                    <p><strong>No. Dokumen</strong> : {activeDoc.sopMetadata?.noDokumen || activeDoc.docNumber || '440/SOP/PKM/2026'}</p>
                                    <p><strong>No. Revisi</strong>   : {activeDoc.sopMetadata?.noRevisi || '00'}</p>
                                    <p><strong>SOP</strong></p>
                                    <p><strong>Tanggal Terbit</strong>: {activeDoc.sopMetadata?.tanggalTerbit || new Date().toLocaleDateString('id-ID')}</p>
                                    <p><strong>Halaman</strong>      : {`1/${totalTargetPages}`}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border-2 border-slate-900 p-2 text-xs">
                                    <p className="font-semibold">Ditetapkan Oleh:</p>
                                    <p className="text-[11px]">{profile.jabatanKepala}</p>
                                    <div className="h-10" />
                                    <p className="font-bold underline text-xs">{profile.kepalaPuskesmas}</p>
                                    <p className="text-[11px]">NIP. {profile.nipKepala}</p>
                                  </td>
                                </tr>
                                <tr>
                                  <td className="border-2 border-slate-900 p-2 text-center font-bold text-xs uppercase bg-slate-50">
                                    {profile.namaPuskesmas}
                                  </td>
                                  <td className="border-2 border-slate-900 p-2 text-xs font-semibold bg-slate-50">
                                    Unit/Klaster: {activeKlasterInfo.name}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )}

                          {/* SK Keputusan */}
                          {activeDoc.docType === 'SK' && (
                            <div className="text-center space-y-1.5 pb-2">
                              <p className="text-sm font-bold tracking-wide">
                                KEPUTUSAN KEPALA {profile.namaPuskesmas?.toUpperCase()}
                              </p>
                              <p className="text-xs font-bold font-mono">
                                NOMOR : {activeDoc.docNumber || '440/012/SK/PKM.BBK/2026'}
                              </p>
                              <p className="text-xs font-bold pt-1">TENTANG</p>
                              <p className="text-sm font-bold max-w-lg mx-auto pt-1 leading-snug">
                                {activeDoc.title?.toUpperCase()}
                              </p>
                            </div>
                          )}
                        </>
                      )}

                      {/* If Page 2+: Running Header */}
                      {pageNumber > 1 && (
                        <div className="border-b border-slate-300 pb-2 text-[11px] flex items-center justify-between text-slate-700">
                          <span className="font-bold truncate max-w-sm">{activeDoc.title}</span>
                          <span className="font-mono">No: {activeDoc.docNumber || '440/PKM/2026'}</span>
                        </div>
                      )}

                      {/* Sections */}
                      <div className="space-y-4 pt-1">
                        {pageSections.map((sec, localIdx) => {
                          const globalIdx = (pageNumber - 1) * sectionsPerPage + localIdx;
                          return (
                            <div key={sec.id} className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <input
                                  type="text"
                                  value={sec.title}
                                  onChange={(e) => {
                                    const updated = [...activeDoc.sections];
                                    updated[globalIdx] = { ...sec, title: e.target.value };
                                    updateActiveTab({}, { ...activeDoc, sections: updated });
                                    handleInputCheckTrigger(e, `section_title_${globalIdx}`, globalIdx);
                                  }}
                                  onKeyUp={(e) => handleInputCheckTrigger(e, `section_title_${globalIdx}`, globalIdx)}
                                  onKeyDown={handleInputKeyDown}
                                  className="text-xs font-bold text-slate-900 bg-transparent hover:bg-slate-100 focus:bg-white border border-transparent focus:border-purple-300 rounded px-1 py-0.5 flex-1"
                                  placeholder="Judul Bagian"
                                />
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    setAutocomplete({
                                      isOpen: true,
                                      query: '',
                                      fieldId: `section_${globalIdx}`,
                                      sectionIdx: globalIdx,
                                      cursorIndex: sec.content.length,
                                      position: { top: rect.bottom, left: Math.max(16, rect.left - 150) },
                                      selectedIndex: 0,
                                    });
                                  }}
                                  className="text-[10px] font-mono font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 px-1.5 py-0.5 rounded transition-all no-print flex items-center gap-1 shrink-0"
                                  title="Sisipkan variabel ke bagian ini"
                                >
                                  <Variable className="w-3 h-3" />
                                  <span>{`{{ }}`}</span>
                                </button>
                              </div>

                              {/* Bracket Prompt [...] Detection & One-Click AI Execution */}
                              {sec.content.includes('[') && sec.content.includes(']') && (
                                <div className="flex items-center justify-between p-2 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg text-purple-900 text-[11px] font-semibold animate-fade-in no-print">
                                  <span className="flex items-center gap-1.5 min-w-0 flex-1 truncate">
                                    <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                                    <span className="truncate">Perintah AI <code>[...]</code> terdeteksi di bagian ini</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleExecuteBracketPrompt(globalIdx)}
                                    disabled={executingBracketIdx === globalIdx}
                                    className="shrink-0 px-2.5 py-1 text-[10px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-md shadow-2xs flex items-center gap-1 transition-all"
                                  >
                                    {executingBracketIdx === globalIdx ? (
                                      <>
                                        <RefreshCw className="w-3 h-3 animate-spin" />
                                        <span>Mengeksekusi...</span>
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="w-3 h-3 text-pink-300" />
                                        <span>Jalankan Prompt [...] via AI</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              )}

                              <textarea
                                rows={Math.max(2, sec.content.split('\n').length + 1)}
                                value={showResolvedValues && focusedField !== `section_${globalIdx}` ? substituteVariables(sec.content, variables) : sec.content}
                                onFocus={() => setFocusedField(`section_${globalIdx}`)}
                                onBlur={() => setFocusedField(null)}
                                onChange={(e) => {
                                  handleSectionContentChange(globalIdx, e.target.value);
                                  handleInputCheckTrigger(e, `section_${globalIdx}`, globalIdx);
                                }}
                                onKeyUp={(e) => handleInputCheckTrigger(e, `section_${globalIdx}`, globalIdx)}
                                onKeyDown={handleInputKeyDown}
                                placeholder="Tuliskan isi bagian dokumen. Ketik {{ untuk variabel, atau ketik [perintah untuk AI]..."
                                className="w-full p-2 text-xs font-sans text-slate-800 bg-transparent hover:bg-slate-50 focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-400 rounded focus:outline-none leading-relaxed resize-y transition-colors"
                              />
                            </div>
                          );
                        })}
                      </div>

                      {/* Sign-off if last page */}
                      {pageNumber === totalTargetPages && activeDoc.docType !== 'SOP' && (
                        <div className="pt-6 flex justify-end">
                          <div className="text-right text-xs space-y-0.5 w-64">
                            <p>Ditetapkan di: {profile.kabupatenKota}</p>
                            <p>Pada tanggal : {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            <p className="font-bold pt-2">{profile.jabatanKepala?.toUpperCase()},</p>
                            <div className="h-14" />
                            <p className="font-bold underline text-xs">{profile.kepalaPuskesmas}</p>
                            <p className="text-[11px]">NIP. {profile.nipKepala}</p>
                          </div>
                        </div>
                      )}
                        </>
                      )}
                    </div>

                    {/* Bottom Page Footer */}
                    <div className="border-t border-slate-200 pt-2 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                      <span>{profile.namaPuskesmas} · Akreditasi ILP 2026</span>
                      <span>Halaman {pageNumber} dari {totalTargetPages}</span>
                    </div>
                  </div>
                );
              })()
            )}
          </div>
        </div>
      </div>

      {/* FLOATING VARIABLE AUTOCOMPLETE POPUP (TRIGGERS ON {{) */}
      {autocomplete.isOpen && matchingAutocompleteVariables.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: `${Math.min(window.innerHeight - 340, Math.max(10, autocomplete.position.top + 4))}px`,
            left: `${Math.min(window.innerWidth - 340, Math.max(16, autocomplete.position.left))}px`,
            zIndex: 99999,
          }}
          className="w-80 bg-white rounded-2xl shadow-2xl border-2 border-purple-500 overflow-hidden text-xs animate-in fade-in duration-150 ring-4 ring-purple-500/20 no-print"
        >
          <div className="bg-gradient-to-r from-purple-700 via-fuchsia-700 to-indigo-700 px-3.5 py-2 text-white flex items-center justify-between text-[11px] font-bold">
            <span className="flex items-center gap-1.5">
              <Variable className="w-3.5 h-3.5" />
              Pilih Variabel ({matchingAutocompleteVariables.length})
            </span>
            <span className="text-[9px] font-mono opacity-80">↑↓ Pilih · Enter/Klik</span>
          </div>

          <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 p-1 bg-slate-50/50">
            {matchingAutocompleteVariables.map((v, idx) => {
              const isSelected = idx === autocomplete.selectedIndex;
              return (
                <div
                  key={v.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertVariableTag(v.key);
                  }}
                  className={`p-2 rounded-xl cursor-pointer transition-all flex items-center justify-between gap-2 ${
                    isSelected
                      ? 'bg-purple-100 text-purple-900 font-semibold ring-1 ring-purple-300 shadow-2xs'
                      : 'hover:bg-white text-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-mono text-purple-700 text-xs font-bold block truncate">
                      {`{{${v.key}}}`}
                    </span>
                    <span className="text-[10px] text-slate-600 block truncate">
                      {v.label}
                    </span>
                    <span className="text-[10px] text-slate-400 italic block truncate">
                      {v.value || '(kosong)'}
                    </span>
                  </div>
                  <span className="shrink-0 text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-white text-purple-700 border border-purple-200 uppercase">
                    {v.category}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="px-3 py-1.5 bg-slate-100 text-[10px] text-slate-500 flex items-center justify-between border-t border-slate-200">
            <span>Ketik manual atau tekan <strong>Esc</strong> untuk tutup</span>
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                setAutocomplete((prev) => ({ ...prev, isOpen: false }));
              }}
              className="text-slate-400 hover:text-slate-700 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
