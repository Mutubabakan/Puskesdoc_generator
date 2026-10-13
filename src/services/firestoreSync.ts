import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { PuskesDoc, FaskesProfile } from '../types';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Save document to Firestore
export async function saveDocumentToFirestore(docData: PuskesDoc): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const path = `documents/${docData.id}`;
  try {
    await setDoc(doc(db, 'documents', docData.id), {
      ...docData,
      userId: user.uid,
      userEmail: user.email,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch all documents for current user from Firestore
export async function fetchUserDocumentsFromFirestore(): Promise<PuskesDoc[]> {
  const user = auth.currentUser;
  if (!user) return [];

  const path = 'documents';
  try {
    const q = query(collection(db, 'documents'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const docs: PuskesDoc[] = [];
    snapshot.forEach((snap) => {
      docs.push(snap.data() as PuskesDoc);
    });
    return docs;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// Delete document from Firestore
export async function deleteDocumentFromFirestore(docId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const path = `documents/${docId}`;
  try {
    await deleteDoc(doc(db, 'documents', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// Save Faskes Profile to Firestore
export async function saveProfileToFirestore(profile: FaskesProfile): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;

  const path = `faskes_profiles/${user.uid}`;
  try {
    await setDoc(doc(db, 'faskes_profiles', user.uid), {
      ...profile,
      userId: user.uid,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Fetch Faskes Profile from Firestore
export async function fetchProfileFromFirestore(): Promise<FaskesProfile | null> {
  const user = auth.currentUser;
  if (!user) return null;

  const path = `faskes_profiles/${user.uid}`;
  try {
    const snap = await getDoc(doc(db, 'faskes_profiles', user.uid));
    if (snap.exists()) {
      return snap.data() as FaskesProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
