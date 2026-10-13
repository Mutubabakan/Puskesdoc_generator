import { FaskesProfile, VariableItem, PuskesDoc, CanvasTemplate, CustomAgentConfig, CustomDocTypeDefinition, DocumentTemplate, MediaItem, PuskesmasDatabaseItem } from '../types';
import { DEFAULT_FASKES_PROFILE, INITIAL_VARIABLES, DEFAULT_CUSTOM_DOC_TYPES, DEFAULT_DOCUMENT_TEMPLATES, DEFAULT_LOGO_PEMDA, DEFAULT_LOGO_PUSKESMAS, INITIAL_DATABASE_ITEMS } from './constants';

const PROFILE_KEY = 'puskesdoc_faskes_profile';
const VARIABLES_KEY = 'puskesdoc_variables';
const DOCUMENTS_KEY = 'puskesdoc_saved_docs';
const CANVAS_TEMPLATES_KEY = 'puskesdoc_canvas_templates';
const DOCUMENT_TEMPLATES_KEY = 'puskesdoc_document_templates';
const AGENT_CONFIG_KEY = 'puskesdoc_custom_agent_config';
const CUSTOM_TYPES_KEY = 'puskesdoc_custom_doc_types';
const GDRIVE_SETTINGS_KEY = 'puskesdoc_gdrive_settings';
const MEDIA_KEY = 'puskesdoc_media_library_items';
const DATABASE_KEY = 'puskesdoc_database_puskesmas';

export function getStoredProfile(): FaskesProfile {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading profile from localStorage', e);
  }
  return DEFAULT_FASKES_PROFILE;
}

export function saveProfile(profile: FaskesProfile): void {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function getStoredVariables(): VariableItem[] {
  try {
    const raw = localStorage.getItem(VARIABLES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading variables from localStorage', e);
  }
  return INITIAL_VARIABLES;
}

export function saveVariables(vars: VariableItem[]): void {
  localStorage.setItem(VARIABLES_KEY, JSON.stringify(vars));
}

export function getStoredDocuments(): PuskesDoc[] {
  try {
    const raw = localStorage.getItem(DOCUMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading documents from localStorage', e);
  }
  return [];
}

export function saveDocument(doc: PuskesDoc): void {
  const docs = getStoredDocuments();
  const existingIdx = docs.findIndex((d) => d.id === doc.id);
  if (existingIdx >= 0) {
    docs[existingIdx] = doc;
  } else {
    docs.unshift(doc);
  }
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
}

export function deleteDocument(docId: string): void {
  const docs = getStoredDocuments().filter((d) => d.id !== docId);
  localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(docs));
}

export function getStoredCanvasTemplates(): CanvasTemplate[] {
  try {
    const raw = localStorage.getItem(CANVAS_TEMPLATES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading canvas templates from localStorage', e);
  }
  return [];
}

export function saveCanvasTemplate(template: CanvasTemplate): void {
  const templates = getStoredCanvasTemplates();
  const existingIdx = templates.findIndex((t) => t.id === template.id);
  if (existingIdx >= 0) {
    templates[existingIdx] = template;
  } else {
    templates.unshift(template);
  }
  localStorage.setItem(CANVAS_TEMPLATES_KEY, JSON.stringify(templates));
}

export function getStoredDocumentTemplates(): DocumentTemplate[] {
  try {
    const raw = localStorage.getItem(DOCUMENT_TEMPLATES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed reading document templates from localStorage', e);
  }
  return DEFAULT_DOCUMENT_TEMPLATES;
}

export function saveDocumentTemplate(template: DocumentTemplate): void {
  const templates = getStoredDocumentTemplates();
  const existingIdx = templates.findIndex((t) => t.id === template.id);
  if (existingIdx >= 0) {
    templates[existingIdx] = { ...template, updatedAt: new Date().toISOString() };
  } else {
    templates.unshift({ ...template, updatedAt: new Date().toISOString() });
  }
  localStorage.setItem(DOCUMENT_TEMPLATES_KEY, JSON.stringify(templates));
}

export function deleteDocumentTemplate(templateId: string): void {
  const templates = getStoredDocumentTemplates().filter((t) => t.id !== templateId);
  localStorage.setItem(DOCUMENT_TEMPLATES_KEY, JSON.stringify(templates));
}

export function resetDocumentTemplates(): void {
  localStorage.setItem(DOCUMENT_TEMPLATES_KEY, JSON.stringify(DEFAULT_DOCUMENT_TEMPLATES));
}

export function getStoredAgentConfig(): CustomAgentConfig {
  try {
    const raw = localStorage.getItem(AGENT_CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading agent config from localStorage', e);
  }
  return {
    enabled: false,
    name: 'OpenAI / Custom Compatible',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    apiKey: '',
    model: 'gpt-4o-mini',
  };
}

export function saveAgentConfig(config: CustomAgentConfig): void {
  localStorage.setItem(AGENT_CONFIG_KEY, JSON.stringify(config));
}

export function getStoredCustomTypes(): CustomDocTypeDefinition[] {
  try {
    const raw = localStorage.getItem(CUSTOM_TYPES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading custom doc types from localStorage', e);
  }
  return DEFAULT_CUSTOM_DOC_TYPES;
}

export function saveCustomTypes(types: CustomDocTypeDefinition[]): void {
  localStorage.setItem(CUSTOM_TYPES_KEY, JSON.stringify(types));
}

export interface GDriveSettings {
  connected: boolean;
  userEmail: string;
  folderName: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export function getStoredGDriveSettings(): GDriveSettings {
  try {
    const raw = localStorage.getItem(GDRIVE_SETTINGS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed reading GDrive settings', e);
  }
  return {
    connected: false,
    userEmail: 'mutupuskesmasbabakan@gmail.com',
    folderName: 'Akreditasi Puskesmas ILP 2026',
    autoSync: false,
  };
}

export function saveGDriveSettings(settings: GDriveSettings): void {
  localStorage.setItem(GDRIVE_SETTINGS_KEY, JSON.stringify(settings));
}

export const DEFAULT_STEMPEL_PUSKESMAS = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="160" height="160"><circle cx="80" cy="80" r="74" fill="none" stroke="%233b82f6" stroke-width="4" stroke-dasharray="8 4"/><circle cx="80" cy="80" r="66" fill="none" stroke="%233b82f6" stroke-width="2.5"/><path id="circlePath1" d="M 22,80 A 58,58 0 1,1 138,80" fill="none"/><path id="circlePath2" d="M 138,80 A 58,58 0 0,1 22,80" fill="none"/><text font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="%232563eb" letter-spacing="2"><textPath href="%23circlePath1" startOffset="50%" text-anchor="middle">DINAS KESEHATAN KABUPATEN</textPath></text><text font-family="Arial, sans-serif" font-size="11" font-weight="900" fill="%232563eb" letter-spacing="2"><textPath href="%23circlePath2" startOffset="50%" text-anchor="middle">UPTD PUSKESMAS BABAKAN</textPath></text><polygon points="80,50 83,60 93,60 85,67 88,77 80,71 72,77 75,67 67,60 77,60" fill="%232563eb"/><text x="80" y="98" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="%232563eb" text-anchor="middle">TERAKREDITASI</text><text x="80" y="112" font-family="Arial, sans-serif" font-size="9" font-weight="bold" fill="%232563eb" text-anchor="middle">PARIPURNA 2026</text></svg>`;

export const DEFAULT_TTD_KEPALA = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 80" width="200" height="80"><path d="M 20,55 Q 40,20 60,45 T 90,30 T 110,60 T 130,25 T 150,50 Q 170,55 190,52" fill="none" stroke="%231e3a8a" stroke-width="2.5" stroke-linecap="round"/><path d="M 30,58 Q 70,50 120,53 T 180,54" fill="none" stroke="%231e3a8a" stroke-width="1.5" stroke-linecap="round"/><circle cx="165" cy="40" r="3" fill="%231e3a8a"/></svg>`;

export const DEFAULT_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'med_logo_puskesmas',
    name: 'Logo_Puskesmas_Kemenkes.svg',
    type: 'image',
    mimeType: 'image/svg+xml',
    size: 2450,
    dataUrl: DEFAULT_LOGO_PUSKESMAS,
    createdAt: new Date().toISOString(),
    category: 'logo',
    description: 'Logo resmi Puskesmas Kementerian Kesehatan RI (Palang Hijau & Tetes Darah)',
  },
  {
    id: 'med_logo_pemda',
    name: 'Lambang_Pemerintah_Daerah.svg',
    type: 'image',
    mimeType: 'image/svg+xml',
    size: 2890,
    dataUrl: DEFAULT_LOGO_PEMDA,
    createdAt: new Date().toISOString(),
    category: 'logo',
    description: 'Lambang resmi Pemerintah Daerah Kabupaten/Kota untuk KOP Naskah Dinas',
  },
  {
    id: 'med_stempel_resmi',
    name: 'Stempel_Dinas_Puskesmas.svg',
    type: 'image',
    mimeType: 'image/svg+xml',
    size: 3820,
    dataUrl: DEFAULT_STEMPEL_PUSKESMAS,
    createdAt: new Date().toISOString(),
    category: 'stempel',
    description: 'Cap stempel resmi dinas Puskesmas Babakan Terakreditasi Paripurna',
  },
  {
    id: 'med_ttd_kepala',
    name: 'Tanda_Tangan_dr_Ahmad_Fauzi.svg',
    type: 'image',
    mimeType: 'image/svg+xml',
    size: 1650,
    dataUrl: DEFAULT_TTD_KEPALA,
    createdAt: new Date().toISOString(),
    category: 'stempel',
    description: 'Tanda tangan digital Kepala Puskesmas (dr. H. Ahmad Fauzi, M.M.Kes)',
  },
  {
    id: 'med_form_blanko',
    name: 'Blanko_Pemeriksaan_ANC_ILP_2026.docx',
    type: 'document',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 14200,
    dataUrl: 'data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,UEsDBBQAAAAIAAA=',
    createdAt: new Date().toISOString(),
    category: 'form',
    description: 'Format baku blanko skrining rekam medis ANC 6 kali terpadu Klaster 2',
  },
];

export function getStoredMedia(): MediaItem[] {
  try {
    const raw = localStorage.getItem(MEDIA_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed reading media items from localStorage', e);
  }
  return DEFAULT_MEDIA_ITEMS;
}

export function saveMediaItem(item: MediaItem): void {
  const list = getStoredMedia();
  const existingIdx = list.findIndex((m) => m.id === item.id);
  if (existingIdx >= 0) {
    list[existingIdx] = item;
  } else {
    list.unshift(item);
  }
  localStorage.setItem(MEDIA_KEY, JSON.stringify(list));
}

export function deleteMediaItem(itemId: string): void {
  const list = getStoredMedia().filter((m) => m.id !== itemId);
  localStorage.setItem(MEDIA_KEY, JSON.stringify(list));
}

export function saveAllMedia(items: MediaItem[]): void {
  localStorage.setItem(MEDIA_KEY, JSON.stringify(items));
}

// ==========================================
// PUSKESMAS DATABASE (CAPAIAN, SPM, INM, DLL)
// ==========================================

export function getStoredDatabase(): PuskesmasDatabaseItem[] {
  try {
    const raw = localStorage.getItem(DATABASE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.error('Failed reading database from localStorage', e);
  }
  return INITIAL_DATABASE_ITEMS;
}

export function saveDatabaseItem(item: PuskesmasDatabaseItem): void {
  const list = getStoredDatabase();
  const existingIdx = list.findIndex((x) => x.id === item.id);
  if (existingIdx >= 0) {
    list[existingIdx] = item;
  } else {
    list.unshift(item);
  }
  localStorage.setItem(DATABASE_KEY, JSON.stringify(list));
}

export function deleteDatabaseItem(itemId: string): void {
  const list = getStoredDatabase().filter((x) => x.id !== itemId);
  localStorage.setItem(DATABASE_KEY, JSON.stringify(list));
}

export function saveAllDatabase(items: PuskesmasDatabaseItem[]): void {
  localStorage.setItem(DATABASE_KEY, JSON.stringify(items));
}

export function resetDatabaseToDefault(): PuskesmasDatabaseItem[] {
  localStorage.setItem(DATABASE_KEY, JSON.stringify(INITIAL_DATABASE_ITEMS));
  return INITIAL_DATABASE_ITEMS;
}

// Utility: Replace {{variable_key}} with stored variable values
export function substituteVariables(text: string, vars: VariableItem[]): string {
  if (!text) return '';
  let result = text;
  vars.forEach((v) => {
    const regex = new RegExp(`{{${v.key}}}`, 'g');
    result = result.replace(regex, v.value || `{{${v.key}}}`);
  });
  return result;
}

// Export All App Data as JSON Backup
export function exportBackupJSON(): string {
  const data = {
    profile: getStoredProfile(),
    variables: getStoredVariables(),
    documents: getStoredDocuments(),
    canvasTemplates: getStoredCanvasTemplates(),
    customTypes: getStoredCustomTypes(),
    agentConfig: getStoredAgentConfig(),
    media: getStoredMedia(),
    exportedAt: new Date().toISOString(),
    version: '1.0.0',
  };
  return JSON.stringify(data, null, 2);
}

// Import App Data from JSON Backup
export function importBackupJSON(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.profile) saveProfile(data.profile);
    if (data.variables) saveVariables(data.variables);
    if (data.documents) localStorage.setItem(DOCUMENTS_KEY, JSON.stringify(data.documents));
    if (data.canvasTemplates) localStorage.setItem(CANVAS_TEMPLATES_KEY, JSON.stringify(data.canvasTemplates));
    if (data.customTypes) saveCustomTypes(data.customTypes);
    if (data.agentConfig) saveAgentConfig(data.agentConfig);
    if (data.media) saveAllMedia(data.media);
    return true;
  } catch (err) {
    console.error('Failed importing backup JSON', err);
    return false;
  }
}
