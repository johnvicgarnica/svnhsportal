import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  initializeFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Announcement, DriveFolder, FacultyFolder, FacultyPersonalFile } from '../types';
import { INITIAL_DRIVE_FOLDERS } from '../mockData';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const db = firebaseConfig.firestoreDatabaseId
  ? initializeFirestore(app, {}, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Types
export interface FacultyDoc {
  id: string;
  name: string;
  email: string;
  department: string;
  createdAt?: string;
}

export interface AdminDoc {
  id: string;
  name: string;
  email: string;
  designation: string;
  createdAt?: string;
}

export interface RegistrationReqDoc {
  id: string;
  name: string;
  email: string;
  password: string;
  department?: string;
  designation?: string;
  requestedAt: string;
  status: string;
}

// Collections
const FACULTY_COL = 'faculty';
const ADMINS_COL = 'admins';
const FACULTY_REQ_COL = 'facultyRequests';
const ADMIN_REQ_COL = 'adminRequests';
const PASSWORDS_COL = 'userPasswords';
const SETTINGS_COL = 'settings';
const ANNOUNCEMENTS_COL = 'announcements';
const DRIVE_FOLDERS_COL = 'driveFolders';
const FACULTY_FOLDERS_COL = 'facultyFolders';
const FACULTY_FILES_COL = 'facultyFiles';
const FACULTY_SUBMISSIONS_COL = 'facultySubmissions';
const FACULTY_TOSTQ_COL = 'facultyTosTq';
const FACULTY_SCHOOL_FORMS_COL = 'facultySchoolForms';

const FACULTY_SUBMISSIONS_STORAGE_KEY = 'svnhs_faculty_submissions_cache_v1';
const FACULTY_TOSTQ_STORAGE_KEY = 'svnhs_faculty_tostq_cache_v1';
const FACULTY_SCHOOL_FORMS_STORAGE_KEY = 'svnhs_faculty_school_forms_cache_v1';

// Helper: Sanitize email for doc ID
const emailToDocId = (email: string) => email.trim().toLowerCase().replace(/[^a-z0-9]/gi, '_');

// Helper: Extract Surname from Full Name
export const extractFacultySurname = (fullName: string): string => {
  if (!fullName) return 'UNKNOWN';
  const clean = fullName.trim().replace(/\s*\(Admin\)/i, '').replace(/\s*\(Faculty\)/i, '').replace(/\s*\(Teacher\)/i, '');
  
  // If formatted like "Garnica, John Vic" or "Dela Cruz, Maria"
  if (clean.includes(',')) {
    const parts = clean.split(',');
    return parts[0].trim().toUpperCase();
  }
  
  // If formatted like "John Vic Garnica"
  const tokens = clean.split(/\s+/);
  if (tokens.length === 1) return tokens[0].toUpperCase();
  
  // Check for common Filipino multi-word surnames (e.g. "Dela Cruz", "De Los Santos", "San Juan")
  const lowerTokens = tokens.map(t => t.toLowerCase());
  const multiWordPrefixes = ['dela', 'de la', 'delos', 'de los', 'del', 'de', 'san', 'santa', 'van', 'von'];
  
  for (let i = 0; i < tokens.length - 1; i++) {
    const candidatePrefix = lowerTokens.slice(i, tokens.length - 1).join(' ');
    if (multiWordPrefixes.includes(candidatePrefix)) {
      return tokens.slice(i).join(' ').toUpperCase();
    }
  }
  
  return tokens[tokens.length - 1].toUpperCase();
};

// 1. FACULTY DIRECTORY
export const saveFacultyToFirestore = async (facultyList: FacultyDoc[]) => {
  try {
    for (const f of facultyList) {
      const docId = emailToDocId(f.email);
      await setDoc(doc(db, FACULTY_COL, docId), {
        id: f.id,
        name: f.name,
        email: f.email.toLowerCase(),
        department: f.department || 'Senior High School Dept.',
        createdAt: f.createdAt || new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    console.error('Error saving faculty to Firestore:', err);
  }
};

export const deleteFacultyFromFirestore = async (email: string) => {
  try {
    await deleteDoc(doc(db, FACULTY_COL, emailToDocId(email)));
  } catch (err) {
    console.error('Error deleting faculty from Firestore:', err);
  }
};

export const subscribeFaculty = (onUpdate: (facultyList: FacultyDoc[]) => void) => {
  return onSnapshot(collection(db, FACULTY_COL), (snapshot) => {
    const list: FacultyDoc[] = snapshot.docs.map((d) => d.data() as FacultyDoc);
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to faculty collection:', err);
  });
};

// 2. ADMIN DIRECTORY
export const saveAdminsToFirestore = async (adminList: AdminDoc[]) => {
  try {
    for (const a of adminList) {
      const docId = emailToDocId(a.email);
      await setDoc(doc(db, ADMINS_COL, docId), {
        id: a.id,
        name: a.name,
        email: a.email.toLowerCase(),
        designation: a.designation || 'School Administrator',
        createdAt: a.createdAt || new Date().toISOString(),
      }, { merge: true });
    }
  } catch (err) {
    console.error('Error saving admins to Firestore:', err);
  }
};

export const deleteAdminFromFirestore = async (email: string) => {
  try {
    await deleteDoc(doc(db, ADMINS_COL, emailToDocId(email)));
  } catch (err) {
    console.error('Error deleting admin from Firestore:', err);
  }
};

export const subscribeAdmins = (onUpdate: (adminList: AdminDoc[]) => void) => {
  return onSnapshot(collection(db, ADMINS_COL), (snapshot) => {
    const list: AdminDoc[] = snapshot.docs.map((d) => d.data() as AdminDoc);
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to admins collection:', err);
  });
};

// 3. FACULTY REGISTRATION REQUESTS
export const saveFacultyRequestsToFirestore = async (requests: RegistrationReqDoc[]) => {
  try {
    for (const req of requests) {
      await setDoc(doc(db, FACULTY_REQ_COL, req.id), {
        ...req,
        email: req.email.toLowerCase(),
      }, { merge: true });
    }
  } catch (err) {
    console.error('Error saving faculty requests to Firestore:', err);
  }
};

export const deleteFacultyRequestFromFirestore = async (requestId: string) => {
  try {
    await deleteDoc(doc(db, FACULTY_REQ_COL, requestId));
  } catch (err) {
    console.error('Error deleting faculty request from Firestore:', err);
  }
};

export const subscribeFacultyRequests = (onUpdate: (requests: RegistrationReqDoc[]) => void) => {
  return onSnapshot(collection(db, FACULTY_REQ_COL), (snapshot) => {
    const list: RegistrationReqDoc[] = snapshot.docs.map((d) => d.data() as RegistrationReqDoc);
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to faculty requests collection:', err);
  });
};

// 4. ADMIN REGISTRATION REQUESTS
export const saveAdminRequestsToFirestore = async (requests: RegistrationReqDoc[]) => {
  try {
    for (const req of requests) {
      await setDoc(doc(db, ADMIN_REQ_COL, req.id), {
        ...req,
        email: req.email.toLowerCase(),
      }, { merge: true });
    }
  } catch (err) {
    console.error('Error saving admin requests to Firestore:', err);
  }
};

export const deleteAdminRequestFromFirestore = async (requestId: string) => {
  try {
    await deleteDoc(doc(db, ADMIN_REQ_COL, requestId));
  } catch (err) {
    console.error('Error deleting admin request from Firestore:', err);
  }
};

export const subscribeAdminRequests = (onUpdate: (requests: RegistrationReqDoc[]) => void) => {
  return onSnapshot(collection(db, ADMIN_REQ_COL), (snapshot) => {
    const list: RegistrationReqDoc[] = snapshot.docs.map((d) => d.data() as RegistrationReqDoc);
    onUpdate(list);
  }, (err) => {
    console.error('Error subscribing to admin requests collection:', err);
  });
};

// 5. USER PASSWORDS (CUSTOM FACULTY AND ADMIN PASSWORDS)
export const saveUserPasswordToFirestore = async (email: string, password: string, role: 'Faculty' | 'Admin') => {
  try {
    const docId = `${role.toLowerCase()}_${emailToDocId(email)}`;
    await setDoc(doc(db, PASSWORDS_COL, docId), {
      email: email.toLowerCase(),
      password: password,
      role: role,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving user password to Firestore:', err);
  }
};

export const deleteUserPasswordFromFirestore = async (email: string, role: 'Faculty' | 'Admin') => {
  try {
    const docId = `${role.toLowerCase()}_${emailToDocId(email)}`;
    await deleteDoc(doc(db, PASSWORDS_COL, docId));
  } catch (err) {
    console.error('Error deleting user password from Firestore:', err);
  }
};

export const subscribeUserPasswords = (onUpdate: (passwords: { facultyMap: Record<string, string>; adminMap: Record<string, string> }) => void) => {
  return onSnapshot(collection(db, PASSWORDS_COL), (snapshot) => {
    const facultyMap: Record<string, string> = {};
    const adminMap: Record<string, string> = {};

    snapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.email && data.password) {
        if (data.role === 'Admin') {
          adminMap[data.email.toLowerCase()] = data.password;
        } else {
          facultyMap[data.email.toLowerCase()] = data.password;
        }
      }
    });

    onUpdate({ facultyMap, adminMap });
  }, (err) => {
    console.error('Error subscribing to user passwords collection:', err);
  });
};

// 6. MASTER SETTINGS (MASTER PASSWORDS)
export const saveSettingToFirestore = async (key: string, value: string) => {
  try {
    await setDoc(doc(db, SETTINGS_COL, key), {
      key: key,
      value: value,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  } catch (err) {
    console.error('Error saving setting to Firestore:', err);
  }
};

export const subscribeSettings = (onUpdate: (settings: Record<string, string>) => void) => {
  return onSnapshot(collection(db, SETTINGS_COL), (snapshot) => {
    const settingsMap: Record<string, string> = {};
    snapshot.docs.forEach((d) => {
      const data = d.data();
      if (data.key && data.value) {
        settingsMap[data.key] = data.value;
      }
    });
    onUpdate(settingsMap);
  }, (err) => {
    console.error('Error subscribing to settings collection:', err);
  });
};

// 7. ANNOUNCEMENTS
const ANNOUNCEMENTS_STORAGE_KEY = 'svnhs_announcements';

export const getStoredAnnouncements = (): Announcement[] => {
  try {
    const data = localStorage.getItem(ANNOUNCEMENTS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading announcements from localStorage:', err);
  }
  return [];
};

export const saveAnnouncementToLocalStorage = (announcement: Announcement) => {
  try {
    const list = getStoredAnnouncements();
    const existingIdx = list.findIndex((a) => a.id === announcement.id);
    if (existingIdx >= 0) {
      list[existingIdx] = announcement;
    } else {
      list.unshift(announcement);
    }
    localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving announcement to localStorage:', err);
  }
};

export const deleteAnnouncementFromLocalStorage = (id: string) => {
  try {
    const list = getStoredAnnouncements();
    const updated = list.filter((a) => a.id !== id);
    localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting announcement from localStorage:', err);
  }
};

export const saveAnnouncementToFirestore = async (announcement: Announcement) => {
  try {
    // Save to LocalStorage immediately
    saveAnnouncementToLocalStorage(announcement);
    // Save to Firestore
    await setDoc(doc(db, ANNOUNCEMENTS_COL, announcement.id), announcement, { merge: true });
  } catch (err) {
    console.error('Error saving announcement to Firestore:', err);
  }
};

export const deleteAnnouncementFromFirestore = async (id: string) => {
  try {
    // Delete from LocalStorage immediately
    deleteAnnouncementFromLocalStorage(id);
    // Delete from Firestore
    await deleteDoc(doc(db, ANNOUNCEMENTS_COL, id));
  } catch (err) {
    console.error('Error deleting announcement from Firestore:', err);
  }
};

export const subscribeAnnouncements = (onUpdate: (announcements: Announcement[]) => void) => {
  return onSnapshot(
    collection(db, ANNOUNCEMENTS_COL),
    (snapshot) => {
      const list: Announcement[] = snapshot.docs.map((d) => d.data() as Announcement);

      // Sort by pinned first, then by createdAt desc
      list.sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1;
        if (!a.isPinned && b.isPinned) return 1;
        return (b.createdAt || '').localeCompare(a.createdAt || '');
      });

      // Synchronize exact Firestore collection snapshot to LocalStorage
      try {
        localStorage.setItem(ANNOUNCEMENTS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Error storing announcements snapshot to localStorage:', e);
      }

      onUpdate(list);
    },
    (err) => {
      console.error('Error subscribing to announcements collection:', err);
      // Fallback to localStorage on network error
      const cached = getStoredAnnouncements();
      onUpdate(cached);
    }
  );
};

export const seedInitialAnnouncementsIfEmpty = async () => {
  try {
    const seedSnap = await getDoc(doc(db, SETTINGS_COL, 'announcements_seeded'));
    if (!seedSnap.exists()) {
      const today = new Date().toISOString().substring(0, 10);
      const defaultAnnouncements: Announcement[] = [
        {
          id: 'ann-1',
          title: 'Submission of Q1 Daily Lesson Logs (DLL) & Table of Specifications (TOS)',
          content: 'All Senior High School faculty members are requested to upload their complete Q1 Daily Lesson Logs (DLL), Table of Specifications (TOS), and Test Questions (TQ) to their respective Grade 11 or Grade 12 repositories before Friday 5:00 PM.',
          priority: 'urgent',
          targetAudience: 'All SHS Faculty',
          status: 'published',
          isPinned: true,
          authorName: 'John Vic Garnica (Admin)',
          authorRole: 'SHS Department Head / Admin',
          createdAt: today,
          updatedAt: today,
        },
        {
          id: 'ann-2',
          title: 'Faculty Development Workshop on DepEd SHS Curriculum Updates',
          content: 'Join our upcoming SHS Curriculum & Assessment Alignment Session in the Audio-Visual Room (AVR). Attendance for all Grade 11 and Grade 12 advisers and subject teachers is required.',
          priority: 'important',
          targetAudience: 'All SHS Faculty',
          status: 'published',
          isPinned: false,
          authorName: 'John Vic Garnica (Admin)',
          authorRole: 'SHS Department Head / Admin',
          createdAt: today,
          updatedAt: today,
        }
      ];

      for (const ann of defaultAnnouncements) {
        saveAnnouncementToLocalStorage(ann);
        await setDoc(doc(db, ANNOUNCEMENTS_COL, ann.id), ann, { merge: true });
      }

      await setDoc(doc(db, SETTINGS_COL, 'announcements_seeded'), {
        key: 'announcements_seeded',
        value: 'true',
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Error seeding initial announcements to Firestore:', err);
  }
};

// 8. GOOGLE DRIVE FOLDERS MANAGEMENT
const DRIVE_FOLDERS_STORAGE_KEY = 'svnhs_drive_folders';

export const extractDriveId = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const fileMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  if (/^[a-zA-Z0-9_-]{15,}$/.test(trimmed)) {
    return trimmed;
  }
  return '';
};

export const getStoredDriveFolders = (): DriveFolder[] => {
  try {
    const data = localStorage.getItem(DRIVE_FOLDERS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (err) {
    console.error('Error reading drive folders from localStorage:', err);
  }
  return INITIAL_DRIVE_FOLDERS;
};

export const saveDriveFolderToLocalStorage = (folder: DriveFolder) => {
  try {
    const list = getStoredDriveFolders();
    const existingIdx = list.findIndex((f) => f.id === folder.id || f.path === folder.path);
    if (existingIdx >= 0) {
      list[existingIdx] = folder;
    } else {
      list.push(folder);
    }
    localStorage.setItem(DRIVE_FOLDERS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving drive folder to localStorage:', err);
  }
};

export const deleteDriveFolderFromLocalStorage = (id: string) => {
  try {
    const list = getStoredDriveFolders();
    const updated = list.filter((f) => f.id !== id);
    localStorage.setItem(DRIVE_FOLDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting drive folder from localStorage:', err);
  }
};

export const saveDriveFolderToFirestore = async (folder: DriveFolder) => {
  try {
    saveDriveFolderToLocalStorage(folder);
    const docId = folder.id || `folder_${folder.name.toLowerCase().replace(/[^a-z0-9]/gi, '_')}`;
    const cleanFolder: DriveFolder = {
      ...folder,
      id: docId,
      driveId: folder.driveId || extractDriveId(folder.driveUrl),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, DRIVE_FOLDERS_COL, docId), cleanFolder, { merge: true });
  } catch (err) {
    console.error('Error saving drive folder to Firestore:', err);
  }
};

export const deleteDriveFolderFromFirestore = async (id: string) => {
  try {
    deleteDriveFolderFromLocalStorage(id);
    await deleteDoc(doc(db, DRIVE_FOLDERS_COL, id));
  } catch (err) {
    console.error('Error deleting drive folder from Firestore:', err);
  }
};

export const subscribeDriveFolders = (onUpdate: (folders: DriveFolder[]) => void) => {
  return onSnapshot(
    collection(db, DRIVE_FOLDERS_COL),
    (snapshot) => {
      if (snapshot.empty) {
        // If Firestore is empty, seed initial folders and fallback to defaults
        seedInitialDriveFoldersIfEmpty();
        const cached = getStoredDriveFolders();
        onUpdate(cached.length > 0 ? cached : INITIAL_DRIVE_FOLDERS);
        return;
      }

      const list: DriveFolder[] = snapshot.docs.map((d) => d.data() as DriveFolder);

      // Order root first, then by name
      list.sort((a, b) => {
        if (a.path === 'all') return -1;
        if (b.path === 'all') return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      try {
        localStorage.setItem(DRIVE_FOLDERS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Error storing drive folders snapshot to localStorage:', e);
      }

      onUpdate(list);
    },
    (err) => {
      console.error('Error subscribing to drive folders collection:', err);
      const cached = getStoredDriveFolders();
      onUpdate(cached.length > 0 ? cached : INITIAL_DRIVE_FOLDERS);
    }
  );
};

export const seedInitialDriveFoldersIfEmpty = async () => {
  try {
    const seedSnap = await getDoc(doc(db, SETTINGS_COL, 'drive_folders_seeded'));
    if (!seedSnap.exists()) {
      for (const folder of INITIAL_DRIVE_FOLDERS) {
        saveDriveFolderToLocalStorage(folder);
        await setDoc(doc(db, DRIVE_FOLDERS_COL, folder.id), folder, { merge: true });
      }

      await setDoc(doc(db, SETTINGS_COL, 'drive_folders_seeded'), {
        key: 'drive_folders_seeded',
        value: 'true',
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Error seeding initial drive folders to Firestore:', err);
  }
};

// INITIALIZATION & SEEDING
export const seedInitialAdminIfEmpty = async () => {
  try {
    // Seed default announcements if not already seeded
    await seedInitialAnnouncementsIfEmpty();
    // Seed default drive folders if not already seeded
    await seedInitialDriveFoldersIfEmpty();

    // Seed master admin email into Firebase settings if not already present
    const adminEmailSnap = await getDoc(doc(db, SETTINGS_COL, 'svnhs_admin_email'));
    let masterAdminEmail = 'johnvic.garnica@deped.gov.ph';
    if (!adminEmailSnap.exists()) {
      await setDoc(doc(db, SETTINGS_COL, 'svnhs_admin_email'), {
        key: 'svnhs_admin_email',
        value: masterAdminEmail,
        updatedAt: new Date().toISOString(),
      });
    } else {
      masterAdminEmail = adminEmailSnap.data()?.value || masterAdminEmail;
    }

    const masterAdminDocId = emailToDocId(masterAdminEmail);
    const masterAdminObj = {
      id: 'admin-master',
      name: 'John Vic Garnica (Admin)',
      email: masterAdminEmail,
      designation: 'School Administrator (Master Admin)',
      createdAt: new Date().toISOString(),
    };

    await setDoc(doc(db, ADMINS_COL, masterAdminDocId), masterAdminObj, { merge: true });

    // Seed master admin password into Firebase settings if not already present
    const adminPassSnap = await getDoc(doc(db, SETTINGS_COL, 'svnhs_admin_password'));
    if (!adminPassSnap.exists()) {
      await setDoc(doc(db, SETTINGS_COL, 'svnhs_admin_password'), {
        key: 'svnhs_admin_password',
        value: 'garjohn@1995',
        updatedAt: new Date().toISOString(),
      });
    }

    // Seed master faculty password into Firebase settings if not already present
    const facultyPassSnap = await getDoc(doc(db, SETTINGS_COL, 'svnhs_faculty_password'));
    if (!facultyPassSnap.exists()) {
      await setDoc(doc(db, SETTINGS_COL, 'svnhs_faculty_password'), {
        key: 'svnhs_faculty_password',
        value: 'shs304868',
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error('Error seeding initial admin to Firestore:', err);
  }
};

// 9. FACULTY PERSONAL WORKSPACE FOLDERS
const FACULTY_FOLDERS_STORAGE_KEY = 'svnhs_faculty_folders';
const FACULTY_FILES_STORAGE_KEY = 'svnhs_faculty_files';

export const getStoredFacultyFolders = (): FacultyFolder[] => {
  try {
    const data = localStorage.getItem(FACULTY_FOLDERS_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading faculty folders from localStorage:', err);
  }
  return [];
};

export const saveFacultyFolderToLocalStorage = (folder: FacultyFolder) => {
  try {
    const list = getStoredFacultyFolders();
    const existingIdx = list.findIndex((f) => f.id === folder.id);
    if (existingIdx >= 0) {
      list[existingIdx] = folder;
    } else {
      list.push(folder);
    }
    localStorage.setItem(FACULTY_FOLDERS_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving faculty folder to localStorage:', err);
  }
};

export const deleteFacultyFolderFromLocalStorage = (id: string) => {
  try {
    const list = getStoredFacultyFolders();
    const updated = list.filter((f) => f.id !== id);
    localStorage.setItem(FACULTY_FOLDERS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting faculty folder from localStorage:', err);
  }
};

export const saveFacultyFolderToFirestore = async (folder: FacultyFolder) => {
  try {
    saveFacultyFolderToLocalStorage(folder);
    const docId = folder.id;
    const cleanFolder: FacultyFolder = {
      ...folder,
      facultySurname: folder.facultySurname || extractFacultySurname(folder.facultyName),
      driveId: folder.driveId || extractDriveId(folder.driveUrl || ''),
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, FACULTY_FOLDERS_COL, docId), cleanFolder, { merge: true });
  } catch (err) {
    console.error('Error saving faculty folder to Firestore:', err);
  }
};

export const deleteFacultyFolderFromFirestore = async (id: string) => {
  try {
    deleteFacultyFolderFromLocalStorage(id);
    await deleteDoc(doc(db, FACULTY_FOLDERS_COL, id));

    // Also delete associated files for this folder
    const allFiles = getStoredFacultyFiles();
    const filesToDelete = allFiles.filter((f) => f.folderId === id);
    for (const file of filesToDelete) {
      await deleteFacultyFileFromFirestore(file.id);
    }
  } catch (err) {
    console.error('Error deleting faculty folder from Firestore:', err);
  }
};

export const subscribeFacultyFolders = (onUpdate: (folders: FacultyFolder[]) => void) => {
  return onSnapshot(
    collection(db, FACULTY_FOLDERS_COL),
    (snapshot) => {
      const list: FacultyFolder[] = snapshot.docs.map((d) => d.data() as FacultyFolder);
      // Sort by creation date desc
      list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

      try {
        localStorage.setItem(FACULTY_FOLDERS_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Error storing faculty folders to localStorage:', e);
      }

      onUpdate(list);
    },
    (err) => {
      console.error('Error subscribing to faculty folders collection:', err);
      const cached = getStoredFacultyFolders();
      onUpdate(cached);
    }
  );
};

// 10. FACULTY PERSONAL FILES
export const getStoredFacultyFiles = (): FacultyPersonalFile[] => {
  try {
    const data = localStorage.getItem(FACULTY_FILES_STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.error('Error reading faculty files from localStorage:', err);
  }
  return [];
};

export const saveFacultyFileToLocalStorage = (file: FacultyPersonalFile) => {
  try {
    const list = getStoredFacultyFiles();
    const existingIdx = list.findIndex((f) => f.id === file.id);
    if (existingIdx >= 0) {
      list[existingIdx] = file;
    } else {
      list.unshift(file);
    }
    localStorage.setItem(FACULTY_FILES_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.error('Error saving faculty file to localStorage:', err);
  }
};

export const deleteFacultyFileFromLocalStorage = (id: string) => {
  try {
    const list = getStoredFacultyFiles();
    const updated = list.filter((f) => f.id !== id);
    localStorage.setItem(FACULTY_FILES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error deleting faculty file from localStorage:', err);
  }
};

export const saveFacultyFileToFirestore = async (file: FacultyPersonalFile) => {
  try {
    saveFacultyFileToLocalStorage(file);
    await setDoc(doc(db, FACULTY_FILES_COL, file.id), file, { merge: true });

    // Update folder itemCount if exists
    const folders = getStoredFacultyFolders();
    const targetFolder = folders.find((f) => f.id === file.folderId);
    if (targetFolder) {
      const folderFiles = getStoredFacultyFiles().filter((f) => f.folderId === file.folderId);
      targetFolder.itemCount = folderFiles.length;
      targetFolder.updatedAt = new Date().toISOString();
      await saveFacultyFolderToFirestore(targetFolder);
    }
  } catch (err) {
    console.error('Error saving faculty file to Firestore:', err);
  }
};

export const deleteFacultyFileFromFirestore = async (id: string) => {
  try {
    const files = getStoredFacultyFiles();
    const file = files.find((f) => f.id === id);
    const folderId = file?.folderId;

    deleteFacultyFileFromLocalStorage(id);
    await deleteDoc(doc(db, FACULTY_FILES_COL, id));

    if (folderId) {
      const folders = getStoredFacultyFolders();
      const targetFolder = folders.find((f) => f.id === folderId);
      if (targetFolder) {
        const remaining = getStoredFacultyFiles().filter((f) => f.folderId === folderId);
        targetFolder.itemCount = remaining.length;
        targetFolder.updatedAt = new Date().toISOString();
        await saveFacultyFolderToFirestore(targetFolder);
      }
    }
  } catch (err) {
    console.error('Error deleting faculty file from Firestore:', err);
  }
};

export const subscribeFacultyFiles = (onUpdate: (files: FacultyPersonalFile[]) => void) => {
  return onSnapshot(
    collection(db, FACULTY_FILES_COL),
    (snapshot) => {
      const list: FacultyPersonalFile[] = snapshot.docs.map((d) => d.data() as FacultyPersonalFile);
      list.sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''));

      try {
        localStorage.setItem(FACULTY_FILES_STORAGE_KEY, JSON.stringify(list));
      } catch (e) {
        console.error('Error storing faculty files to localStorage:', e);
      }

      onUpdate(list);
    },
    (err) => {
      console.error('Error subscribing to faculty files collection:', err);
      const cached = getStoredFacultyFiles();
      onUpdate(cached);
    }
  );
};

// 10. FACULTY WEEKLY SUBMISSION REPORTS (DLL, TOS, TQ - 11 WEEKS PER TERM)
export type SubmissionCategory = 'dll' | 'tos' | 'tq';

export const getCategoryCollectionName = (category: SubmissionCategory = 'dll') => {
  if (category === 'tos') return 'facultySubmissions_tos';
  if (category === 'tq') return 'facultySubmissions_tq';
  return 'facultySubmissions_dll';
};

export const getCategoryStorageKey = (category: SubmissionCategory = 'dll') => {
  return `svnhs_faculty_sub_${category}_cache_v1`;
};

export const getStoredFacultySubmissions = (
  termId: string,
  category: SubmissionCategory = 'dll'
): Record<string, boolean[]> => {
  try {
    const raw = localStorage.getItem(`${getCategoryStorageKey(category)}_${termId}`);
    if (raw) {
      return JSON.parse(raw);
    }
    // Fallback for legacy key if category is 'dll'
    if (category === 'dll') {
      const legacyRaw = localStorage.getItem(`${FACULTY_SUBMISSIONS_STORAGE_KEY}_${termId}`);
      if (legacyRaw) {
        return JSON.parse(legacyRaw);
      }
    }
  } catch (e) {
    console.error(`Error reading faculty ${category} submissions from localStorage:`, e);
  }
  return {};
};

export const saveFacultySubmissionsToLocalStorage = (
  termId: string,
  category: SubmissionCategory = 'dll',
  data: Record<string, boolean[]>
) => {
  try {
    localStorage.setItem(`${getCategoryStorageKey(category)}_${termId}`, JSON.stringify(data));
    if (category === 'dll') {
      localStorage.setItem(`${FACULTY_SUBMISSIONS_STORAGE_KEY}_${termId}`, JSON.stringify(data));
    }
  } catch (e) {
    console.error(`Error saving faculty ${category} submissions to localStorage:`, e);
  }
};

export const saveFacultySubmissionToFirestore = async (
  termId: string,
  category: SubmissionCategory = 'dll',
  facultyEmail: string,
  weeks: boolean[],
  facultyName?: string,
  department?: string
) => {
  try {
    const cleanEmail = facultyEmail.toLowerCase().trim();
    const docId = `${termId}_${emailToDocId(cleanEmail)}`;
    const colName = getCategoryCollectionName(category);

    // Update local storage immediately for responsive UI
    const currentCached = getStoredFacultySubmissions(termId, category);
    currentCached[cleanEmail] = weeks;
    saveFacultySubmissionsToLocalStorage(termId, category, currentCached);

    const docPayload = {
      id: docId,
      termId,
      category,
      facultyEmail: cleanEmail,
      facultyName: facultyName || '',
      department: department || '',
      weeks: Array.isArray(weeks) ? [...weeks] : [],
      updatedAt: new Date().toISOString(),
    };

    // Save to category collection
    await setDoc(doc(db, colName, docId), docPayload, { merge: true });

    // Also mirror to legacy collection if DLL for backwards compatibility
    if (category === 'dll') {
      await setDoc(doc(db, FACULTY_SUBMISSIONS_COL, docId), docPayload, { merge: true });
    }
  } catch (err) {
    console.error(`Error saving faculty ${category} submission to Firestore:`, err);
    throw err;
  }
};

export const batchSaveFacultySubmissionsToFirestore = async (
  termId: string,
  category: SubmissionCategory = 'dll',
  submissions: Record<string, boolean[]>
) => {
  try {
    saveFacultySubmissionsToLocalStorage(termId, category, submissions);
    const colName = getCategoryCollectionName(category);

    const promises = Object.entries(submissions).map(([email, weeks]) => {
      const cleanEmail = email.toLowerCase().trim();
      const docId = `${termId}_${emailToDocId(cleanEmail)}`;
      const docPayload = {
        id: docId,
        termId,
        category,
        facultyEmail: cleanEmail,
        weeks: Array.isArray(weeks) ? [...weeks] : [],
        updatedAt: new Date().toISOString(),
      };
      return setDoc(doc(db, colName, docId), docPayload, { merge: true });
    });

    await Promise.all(promises);
  } catch (err) {
    console.error(`Error batch saving faculty ${category} submissions to Firestore:`, err);
    throw err;
  }
};

export const saveWeekDataToFirestore = async (
  termId: string,
  category: SubmissionCategory = 'dll',
  weekIndex: number,
  submissions: Record<string, boolean[]>,
  facultyList: { email: string; name?: string; department?: string }[]
) => {
  try {
    saveFacultySubmissionsToLocalStorage(termId, category, submissions);
    const colName = getCategoryCollectionName(category);

    const promises = facultyList.map((f) => {
      const cleanEmail = f.email.toLowerCase().trim();
      const docId = `${termId}_${emailToDocId(cleanEmail)}`;
      const weeks = submissions[cleanEmail] || Array(MAX_TERM_WEEKS).fill(false);

      const docPayload = {
        id: docId,
        termId,
        category,
        facultyEmail: cleanEmail,
        facultyName: f.name || '',
        department: f.department || '',
        weeks: Array.isArray(weeks) ? [...weeks] : [],
        lastSavedWeek: weekIndex + 1,
        updatedAt: new Date().toISOString(),
      };

      return setDoc(doc(db, colName, docId), docPayload, { merge: true });
    });

    await Promise.all(promises);
  } catch (err) {
    console.error(`Error saving Week ${weekIndex + 1} data to Firestore:`, err);
    throw err;
  }
};

export const subscribeFacultySubmissions = (
  termId: string,
  category: SubmissionCategory = 'dll',
  onUpdate: (submissionsMap: Record<string, boolean[]>) => void
) => {
  const colName = getCategoryCollectionName(category);

  return onSnapshot(
    collection(db, colName),
    (snapshot) => {
      const map: Record<string, boolean[]> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.termId === termId && data.facultyEmail && Array.isArray(data.weeks)) {
          map[data.facultyEmail.toLowerCase().trim()] = data.weeks;
        }
      });

      // If category is dll and empty, also check legacy collection
      if (category === 'dll' && Object.keys(map).length === 0) {
        const localCached = getStoredFacultySubmissions(termId, 'dll');
        const merged = { ...localCached, ...map };
        onUpdate(merged);
        return;
      }

      // Merge with local storage if not empty
      const localCached = getStoredFacultySubmissions(termId, category);
      const merged = { ...localCached, ...map };
      saveFacultySubmissionsToLocalStorage(termId, category, merged);

      onUpdate(merged);
    },
    (err) => {
      console.error(`Error subscribing to faculty ${category} submissions:`, err);
      const cached = getStoredFacultySubmissions(termId, category);
      onUpdate(cached);
    }
  );
};

// 11. FACULTY TOS / TQ SUBMISSION REPORTS
export interface TosTqRecord {
  midtermTos: boolean;
  midtermTq: boolean;
  midtermKey: boolean;
  midtermAnalysis: boolean;
  finalTos: boolean;
  finalTq: boolean;
  finalKey: boolean;
  finalAnalysis: boolean;
}

export const DEFAULT_TOSTQ_RECORD: TosTqRecord = {
  midtermTos: false,
  midtermTq: false,
  midtermKey: false,
  midtermAnalysis: false,
  finalTos: false,
  finalTq: false,
  finalKey: false,
  finalAnalysis: false,
};

export const getStoredFacultyTosTq = (termId: string): Record<string, TosTqRecord> => {
  try {
    const raw = localStorage.getItem(`${FACULTY_TOSTQ_STORAGE_KEY}_${termId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading TOS/TQ submissions from localStorage:', e);
  }
  return {};
};

export const saveFacultyTosTqToLocalStorage = (termId: string, data: Record<string, TosTqRecord>) => {
  try {
    localStorage.setItem(`${FACULTY_TOSTQ_STORAGE_KEY}_${termId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving TOS/TQ submissions to localStorage:', e);
  }
};

export const saveFacultyTosTqToFirestore = async (
  termId: string,
  facultyEmail: string,
  record: TosTqRecord,
  facultyName?: string,
  department?: string
) => {
  try {
    const cleanEmail = facultyEmail.toLowerCase().trim();
    const docId = `${termId}_${emailToDocId(cleanEmail)}`;

    const currentCached = getStoredFacultyTosTq(termId);
    currentCached[cleanEmail] = record;
    saveFacultyTosTqToLocalStorage(termId, currentCached);

    await setDoc(
      doc(db, FACULTY_TOSTQ_COL, docId),
      {
        id: docId,
        termId,
        facultyEmail: cleanEmail,
        facultyName: facultyName || '',
        department: department || '',
        ...record,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving TOS/TQ submission to Firestore:', err);
  }
};

export const subscribeFacultyTosTq = (
  termId: string,
  onUpdate: (dataMap: Record<string, TosTqRecord>) => void
) => {
  return onSnapshot(
    collection(db, FACULTY_TOSTQ_COL),
    (snapshot) => {
      const map: Record<string, TosTqRecord> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.termId === termId && data.facultyEmail) {
          map[data.facultyEmail.toLowerCase().trim()] = {
            midtermTos: Boolean(data.midtermTos),
            midtermTq: Boolean(data.midtermTq),
            midtermKey: Boolean(data.midtermKey),
            midtermAnalysis: Boolean(data.midtermAnalysis),
            finalTos: Boolean(data.finalTos),
            finalTq: Boolean(data.finalTq),
            finalKey: Boolean(data.finalKey),
            finalAnalysis: Boolean(data.finalAnalysis),
          };
        }
      });

      const localCached = getStoredFacultyTosTq(termId);
      const merged = { ...localCached, ...map };
      saveFacultyTosTqToLocalStorage(termId, merged);

      onUpdate(merged);
    },
    (err) => {
      console.error('Error subscribing to TOS/TQ submissions:', err);
      const cached = getStoredFacultyTosTq(termId);
      onUpdate(cached);
    }
  );
};

// 12. FACULTY SCHOOL FORMS SUBMISSION REPORTS
export interface SchoolFormsRecord {
  sf1: boolean;
  sf2: boolean;
  sf3: boolean;
  sf4: boolean;
  sf5a: boolean;
  sf5b: boolean;
  sf9: boolean;
  sf10: boolean;
  gradingSheets: boolean;
}

export const DEFAULT_SCHOOL_FORMS_RECORD: SchoolFormsRecord = {
  sf1: false,
  sf2: false,
  sf3: false,
  sf4: false,
  sf5a: false,
  sf5b: false,
  sf9: false,
  sf10: false,
  gradingSheets: false,
};

export const getStoredFacultySchoolForms = (termId: string): Record<string, SchoolFormsRecord> => {
  try {
    const raw = localStorage.getItem(`${FACULTY_SCHOOL_FORMS_STORAGE_KEY}_${termId}`);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error reading School Forms submissions from localStorage:', e);
  }
  return {};
};

export const saveFacultySchoolFormsToLocalStorage = (termId: string, data: Record<string, SchoolFormsRecord>) => {
  try {
    localStorage.setItem(`${FACULTY_SCHOOL_FORMS_STORAGE_KEY}_${termId}`, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving School Forms submissions to localStorage:', e);
  }
};

export const saveFacultySchoolFormsToFirestore = async (
  termId: string,
  facultyEmail: string,
  record: SchoolFormsRecord,
  facultyName?: string,
  department?: string
) => {
  try {
    const cleanEmail = facultyEmail.toLowerCase().trim();
    const docId = `${termId}_${emailToDocId(cleanEmail)}`;

    const currentCached = getStoredFacultySchoolForms(termId);
    currentCached[cleanEmail] = record;
    saveFacultySchoolFormsToLocalStorage(termId, currentCached);

    await setDoc(
      doc(db, FACULTY_SCHOOL_FORMS_COL, docId),
      {
        id: docId,
        termId,
        facultyEmail: cleanEmail,
        facultyName: facultyName || '',
        department: department || '',
        ...record,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving School Forms submission to Firestore:', err);
  }
};

export const subscribeFacultySchoolForms = (
  termId: string,
  onUpdate: (dataMap: Record<string, SchoolFormsRecord>) => void
) => {
  return onSnapshot(
    collection(db, FACULTY_SCHOOL_FORMS_COL),
    (snapshot) => {
      const map: Record<string, SchoolFormsRecord> = {};
      snapshot.docs.forEach((d) => {
        const data = d.data();
        if (data.termId === termId && data.facultyEmail) {
          map[data.facultyEmail.toLowerCase().trim()] = {
            sf1: Boolean(data.sf1),
            sf2: Boolean(data.sf2),
            sf3: Boolean(data.sf3),
            sf4: Boolean(data.sf4),
            sf5a: Boolean(data.sf5a),
            sf5b: Boolean(data.sf5b),
            sf9: Boolean(data.sf9),
            sf10: Boolean(data.sf10),
            gradingSheets: Boolean(data.gradingSheets),
          };
        }
      });

      const localCached = getStoredFacultySchoolForms(termId);
      const merged = { ...localCached, ...map };
      saveFacultySchoolFormsToLocalStorage(termId, merged);

      onUpdate(merged);
    },
    (err) => {
      console.error('Error subscribing to School Forms submissions:', err);
      const cached = getStoredFacultySchoolForms(termId);
      onUpdate(cached);
    }
  );
};

// 13. TERM WEEKS CONFIGURATION (Up to 12 weeks per term)
export interface TermWeeksConfig {
  'term-1': number;
  'term-2': number;
  'term-3': number;
}

export const DEFAULT_TERM_WEEKS_CONFIG: TermWeeksConfig = {
  'term-1': 11,
  'term-2': 11,
  'term-3': 11,
};

export const MAX_TERM_WEEKS = 12;
export const MIN_TERM_WEEKS = 1;

const TERM_WEEKS_STORAGE_KEY = 'svnhs_term_weeks_config';

export const getStoredTermWeeksConfig = (): TermWeeksConfig => {
  try {
    const raw = localStorage.getItem(TERM_WEEKS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        'term-1': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(parsed['term-1']) || 11)),
        'term-2': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(parsed['term-2']) || 11)),
        'term-3': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(parsed['term-3']) || 11)),
      };
    }
  } catch (e) {
    console.error('Error reading term weeks config from localStorage:', e);
  }
  return DEFAULT_TERM_WEEKS_CONFIG;
};

export const saveTermWeeksConfigToLocalStorage = (config: TermWeeksConfig) => {
  try {
    localStorage.setItem(TERM_WEEKS_STORAGE_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving term weeks config to localStorage:', e);
  }
};

export const saveTermWeeksConfigToFirestore = async (config: TermWeeksConfig) => {
  try {
    const sanitized: TermWeeksConfig = {
      'term-1': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(config['term-1']) || 11)),
      'term-2': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(config['term-2']) || 11)),
      'term-3': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(config['term-3']) || 11)),
    };
    saveTermWeeksConfigToLocalStorage(sanitized);
    await setDoc(
      doc(db, SETTINGS_COL, 'term_weeks_config'),
      {
        id: 'term_weeks_config',
        ...sanitized,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving term weeks config to Firestore:', err);
  }
};

export const subscribeTermWeeksConfig = (onUpdate: (config: TermWeeksConfig) => void) => {
  return onSnapshot(
    doc(db, SETTINGS_COL, 'term_weeks_config'),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const config: TermWeeksConfig = {
          'term-1': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(data['term-1']) || 11)),
          'term-2': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(data['term-2']) || 11)),
          'term-3': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(data['term-3']) || 11)),
        };
        saveTermWeeksConfigToLocalStorage(config);
        onUpdate(config);
      } else {
        const cached = getStoredTermWeeksConfig();
        onUpdate(cached);
      }
    },
    (err) => {
      console.error('Error subscribing to term weeks config:', err);
      const cached = getStoredTermWeeksConfig();
      onUpdate(cached);
    }
  );
};

// 14. ACTIVE ACADEMIC TERM CONFIGURATION (Default term remembered across page refreshes)
export const ACTIVE_TERM_STORAGE_KEY = 'svnhs_active_academic_term';
export const DEFAULT_ACTIVE_TERM_ID = 'term-1';

export const getStoredActiveTermId = (): string => {
  try {
    const raw = localStorage.getItem(ACTIVE_TERM_STORAGE_KEY);
    if (raw && (raw === 'term-1' || raw === 'term-2' || raw === 'term-3')) {
      return raw;
    }
  } catch (e) {
    console.error('Error reading active academic term from localStorage:', e);
  }
  return DEFAULT_ACTIVE_TERM_ID;
};

export const saveActiveTermIdToLocalStorage = (termId: string) => {
  try {
    const valid = termId === 'term-2' || termId === 'term-3' ? termId : 'term-1';
    localStorage.setItem(ACTIVE_TERM_STORAGE_KEY, valid);
  } catch (e) {
    console.error('Error saving active academic term to localStorage:', e);
  }
};

export const saveActiveTermIdToFirestore = async (termId: string) => {
  try {
    const valid = termId === 'term-2' || termId === 'term-3' ? termId : 'term-1';
    saveActiveTermIdToLocalStorage(valid);
    await setDoc(
      doc(db, SETTINGS_COL, 'active_academic_term'),
      {
        id: 'active_academic_term',
        key: 'active_academic_term',
        value: valid,
        termId: valid,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('Error saving active academic term to Firestore:', err);
  }
};

export const subscribeActiveTermId = (onUpdate: (termId: string) => void) => {
  return onSnapshot(
    doc(db, SETTINGS_COL, 'active_academic_term'),
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        const termId = data.value || data.termId || DEFAULT_ACTIVE_TERM_ID;
        const valid = termId === 'term-2' || termId === 'term-3' ? termId : 'term-1';
        saveActiveTermIdToLocalStorage(valid);
        onUpdate(valid);
      } else {
        const cached = getStoredActiveTermId();
        onUpdate(cached);
      }
    },
    (err) => {
      console.error('Error subscribing to active academic term:', err);
      const cached = getStoredActiveTermId();
      onUpdate(cached);
    }
  );
};




