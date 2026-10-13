import { PuskesDoc, FaskesProfile } from '../types';

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
}

// Find or create folder in Google Drive
export async function findOrCreateDriveFolder(accessToken: string, folderName = 'Akreditasi Puskesmas ILP 2026'): Promise<string> {
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  const createdFolder = await createRes.json();
  return createdFolder.id;
}

// Save PuskesDoc to Google Drive as JSON/Text Document
export async function saveDocToGoogleDrive(
  accessToken: string,
  doc: PuskesDoc,
  folderId?: string
): Promise<{ success: boolean; fileId: string; fileName: string }> {
  const targetFolderId = folderId || (await findOrCreateDriveFolder(accessToken));
  const fileName = `${doc.docType}_${doc.title.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 40)}.json`;

  const fileContent = JSON.stringify({
    ...doc,
    exportedToDriveAt: new Date().toISOString(),
  }, null, 2);

  // Search if file already exists in folder to avoid duplicates
  const query = encodeURIComponent(`name = '${fileName}' and '${targetFolderId}' in parents and trashed = false`);
  const checkRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const checkData = await checkRes.json();

  if (checkData.files && checkData.files.length > 0) {
    const existingFileId = checkData.files[0].id;
    // Update existing file
    const updateRes = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${existingFileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: fileContent,
    });
    const updateData = await updateRes.json();
    return { success: true, fileId: updateData.id || existingFileId, fileName };
  }

  // Create new multipart file with metadata & content
  const metadata = {
    name: fileName,
    parents: [targetFolderId],
    mimeType: 'application/json',
    description: `Dokumen ${doc.docType} Puskesdoc Generator ILP`,
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const createRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  const createdFile = await createRes.json();
  return { success: true, fileId: createdFile.id, fileName };
}

// List all accreditation documents stored in Google Drive
export async function listGoogleDriveDocs(accessToken: string): Promise<DriveFileItem[]> {
  const folderId = await findOrCreateDriveFolder(accessToken);
  const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
  
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType,modifiedTime,size)&orderBy=modifiedTime desc`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await res.json();
  return data.files || [];
}

// Read and parse document content from Google Drive
export async function loadDocFromGoogleDrive(accessToken: string, fileId: string): Promise<PuskesDoc | null> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gagal membaca file dari Google Drive (${res.status})`);
  }

  const json = await res.json();
  return json as PuskesDoc;
}

// Delete file from Google Drive with mandatory user confirmation
export async function deleteDocFromGoogleDrive(accessToken: string, fileId: string, fileName: string): Promise<boolean> {
  const confirmed = window.confirm(`Apakah Anda yakin ingin menghapus file "${fileName}" dari Google Drive faskes? Tindakan ini tidak dapat dibatalkan.`);
  if (!confirmed) return false;

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  return res.ok || res.status === 204;
}
