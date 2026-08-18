import { RepositoryCollection, RepositoryItem, StorageTelemetry, ApiAccessKey, Announcement, DriveFolder } from './types';

export const INITIAL_ANNOUNCEMENTS: Announcement[] = [];

export const INITIAL_DRIVE_FOLDERS: DriveFolder[] = [
  {
    id: 'folder-root',
    name: 'Budget of Works (Root)',
    path: 'all',
    driveUrl: 'https://drive.google.com/drive/folders/1EAcyg-_LRsaZ6i_yu4pvDbBdoqPst6Lt?usp=drive_link',
    driveId: '1EAcyg-_LRsaZ6i_yu4pvDbBdoqPst6Lt',
    description: 'Senior High School Central Budget of Works Repository',
    isDefault: true,
    createdAt: '2025-06-01',
    updatedAt: '2026-03-01',
  },
  {
    id: 'folder-g11-dll',
    name: 'Grade 11 DLL',
    path: '/Grade 11 DLL',
    driveUrl: 'https://drive.google.com/drive/folders/1IBAtKJMb0zESnCQ7pRE0H3mN9hGxzPpD?usp=drive_link',
    driveId: '1IBAtKJMb0zESnCQ7pRE0H3mN9hGxzPpD',
    description: 'Daily Lesson Logs (DLL) for Grade 11 Senior High School Subjects',
    isDefault: true,
    createdAt: '2025-06-01',
    updatedAt: '2026-03-01',
  },
  {
    id: 'folder-g12-dll',
    name: 'Grade 12 DLL',
    path: '/Grade 12 DLL',
    driveUrl: 'https://drive.google.com/drive/folders/1Rq_glP2OOakcasHBwuysmZHFzKbSsx9e?usp=drive_link',
    driveId: '1Rq_glP2OOakcasHBwuysmZHFzKbSsx9e',
    description: 'Daily Lesson Logs (DLL) for Grade 12 Senior High School Subjects',
    isDefault: true,
    createdAt: '2025-06-01',
    updatedAt: '2026-03-01',
  },
  {
    id: 'folder-g11-tos-tq',
    name: 'Grade 11 TOS&TQ',
    path: '/Grade 11 TOS&TQ',
    driveUrl: 'https://drive.google.com/drive/folders/1U3JndEJXmTK6uCLvM2zn4pzJr5OnOezz?usp=drive_link',
    driveId: '1U3JndEJXmTK6uCLvM2zn4pzJr5OnOezz',
    description: 'Table of Specifications and Test Questions for Grade 11',
    isDefault: true,
    createdAt: '2025-06-01',
    updatedAt: '2026-03-01',
  },
  {
    id: 'folder-g12-tos-tq',
    name: 'Grade 12 TOS&TQ',
    path: '/Grade 12 TOS&TQ',
    driveUrl: 'https://drive.google.com/drive/folders/17ift90G8tmiLZWewxqzLrhu8-xvjxub4?usp=drive_link',
    driveId: '17ift90G8tmiLZWewxqzLrhu8-xvjxub4',
    description: 'Table of Specifications and Test Questions for Grade 12',
    isDefault: true,
    createdAt: '2025-06-01',
    updatedAt: '2026-03-01',
  },
];

export const INITIAL_REPOSITORIES: RepositoryCollection[] = [
  {
    id: 'repo-1',
    name: 'Grade 11 Instructional & Assessment Vault',
    slug: 'grade-11-vault',
    description: 'Curated Daily Lesson Logs (DLL), Table of Specifications (TOS), and Test Questions (TQ) for Grade 11 Senior High School subjects.',
    category: 'SHS Grade 11',
    fileCount: 0,
    totalSizeBytes: 0,
    totalSizeFormatted: '0 B',
    accessLevel: 'public',
    starsCount: 0,
    isStarred: true,
    createdAt: '2025-06-01',
    updatedAt: 'Just now',
    maintainer: 'SVNHS Grade 11 Curriculum Committee',
    tags: ['Grade11', 'DLL', 'TOS', 'TQ', 'DepEd'],
  },
  {
    id: 'repo-2',
    name: 'Grade 12 Instructional & Assessment Vault',
    slug: 'grade-12-vault',
    description: 'Complete DepEd-compliant Daily Lesson Logs, Table of Specifications, and Examination Question Banks for Grade 12 SHS tracks.',
    category: 'SHS Grade 12',
    fileCount: 0,
    totalSizeBytes: 0,
    totalSizeFormatted: '0 B',
    accessLevel: 'public',
    starsCount: 0,
    isStarred: true,
    createdAt: '2025-06-01',
    updatedAt: 'Just now',
    maintainer: 'SVNHS Grade 12 Curriculum Committee',
    tags: ['Grade12', 'DLL', 'TOS', 'TQ', 'DepEd'],
  },
  {
    id: 'repo-3',
    name: 'Senior High School Master Assessment Bank',
    slug: 'shs-assessment-bank',
    description: 'Central department archive for verified TOS and TQ document templates and validated quarterly exam materials.',
    category: 'Department Archives',
    fileCount: 0,
    totalSizeBytes: 0,
    totalSizeFormatted: '0 B',
    accessLevel: 'internal',
    starsCount: 0,
    isStarred: false,
    createdAt: '2025-05-15',
    updatedAt: 'Just now',
    maintainer: 'SVNHS SHS Dept Assessment Head',
    tags: ['TOS', 'TQ', 'Examinations', 'Rubrics'],
  },
];

export const INITIAL_FILES: RepositoryItem[] = [];

export const INITIAL_TELEMETRY: StorageTelemetry[] = Array.from({ length: 15 }).map((_, i) => {
  const time = new Date(Date.now() - (14 - i) * 120000);
  const timeLabel = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return {
    timestamp: time.toISOString(),
    timeLabel,
    totalEgressGbps: 0,
    downloadRequestsCount: 0,
    storageUsedGb: 0,
    storageQuotaGb: 1000,
    hotCacheHitPct: 100,
    avgLatencyMs: 4,
  };
});

export const INITIAL_API_KEYS: ApiAccessKey[] = [
  {
    id: 'key-1',
    name: 'Department Portal Integration Token',
    keyPrefix: 'sv_live_9a81',
    fullToken: 'sv_live_9a81f02938102938a1920398f021a89b',
    permissions: ['read', 'write'],
    createdAt: '2026-01-10',
    lastUsed: '12 Mins ago',
    status: 'active',
  },
  {
    id: 'key-2',
    name: 'Curriculum Audit Sync Key',
    keyPrefix: 'sv_live_3b72',
    fullToken: 'sv_live_3b72e019283748291029384756102938',
    permissions: ['read'],
    createdAt: '2026-02-04',
    lastUsed: '1 Hour ago',
    status: 'active',
  },
];
