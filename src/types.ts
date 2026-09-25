export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Faculty' | 'Student' | 'Admin';
  department: string;
  designation?: string;
  avatarUrl?: string;
}

export type AnnouncementPriority = 'urgent' | 'important' | 'general' | 'event';
export type AnnouncementTarget = 'All SHS Faculty' | 'Grade 11 Teachers' | 'Grade 12 Teachers' | 'All Staff & Students' | 'Department Heads';
export type AnnouncementStatus = 'published' | 'draft' | 'archived';

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: AnnouncementPriority;
  targetAudience: AnnouncementTarget;
  status: AnnouncementStatus;
  isPinned: boolean;
  authorName: string;
  authorRole: string;
  createdAt: string;
  updatedAt: string;
  attachmentUrl?: string;
  attachmentName?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  path: string;
  driveUrl: string;
  driveId: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  isDefault?: boolean;
}

export interface FacultyFolder {
  id: string;
  facultyEmail: string;
  facultyName: string;
  facultySurname: string;
  name: string;
  description?: string;
  category?: string;
  color?: string;
  driveUrl?: string;
  driveId?: string;
  itemCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolPermanentFolder {
  id: string;
  name: string;
  description: string;
  driveUrl: string;
  driveId?: string;
  category: string;
  color: string;
  isPermanent?: boolean;
  createdAt?: string;
  updatedAt: string;
  updatedBy?: string;
  createdBy?: string;
}

export interface FacultyPersonalFile {
  id: string;
  folderId: string;
  facultyEmail: string;
  facultyName: string;
  title: string;
  fileName: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  format: string;
  category: string;
  driveUrl?: string;
  isGoogleDriveLink?: boolean;
  uploadedAt: string;
  description?: string;
  downloadUrl?: string;
}

export type FileCategory =
  | 'code_bundle'
  | 'dataset_raw'
  | 'document_pdf'
  | 'media_assets'
  | 'ai_model'
  | 'system_binary';

export type AccessLevel = 'public' | 'internal' | 'private';

export type StorageTier = 'hot_nvme' | 'warm_ssd' | 'cold_archive';

export interface FileVersion {
  version: string;
  uploadedAt: string;
  fileSizeBytes: number;
  fileSizeFormatted: string;
  sha256: string;
  changelog: string;
  uploader: string;
}

export interface RepositoryItem {
  id: string;
  title: string;
  fileName: string;
  path: string;
  folder: string;
  repositoryId: string;
  repositoryName: string;
  category: FileCategory;
  fileSizeFormatted: string;
  fileSizeBytes: number;
  format: string;
  description: string;
  version: string;
  versions: FileVersion[];
  sha256: string;
  md5: string;
  downloadsCount: number;
  activeStreams: number;
  starsCount: number;
  isStarred: boolean;
  accessLevel: AccessLevel;
  storageTier: StorageTier;
  license: string;
  updatedAt: string;
  uploader: string;
  tags: string[];
  previewType: 'code' | 'json' | 'pdf' | 'media' | 'binary' | 'text';
  previewContent?: string;
  driveUrl?: string;
  isGoogleDriveLink?: boolean;
}

export interface RepositoryCollection {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  fileCount: number;
  totalSizeBytes: number;
  totalSizeFormatted: string;
  accessLevel: AccessLevel;
  starsCount: number;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  maintainer: string;
  tags: string[];
}

export interface StorageTelemetry {
  timestamp: string;
  timeLabel: string;
  totalEgressGbps: number;
  downloadRequestsCount: number;
  storageUsedGb: number;
  storageQuotaGb: number;
  hotCacheHitPct: number;
  avgLatencyMs: number;
}

export interface ApiAccessKey {
  id: string;
  name: string;
  keyPrefix: string;
  fullToken: string;
  permissions: ('read' | 'write' | 'admin')[];
  createdAt: string;
  lastUsed: string;
  status: 'active' | 'revoked';
}

export interface CopilotMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  suggestedFileIds?: string[];
}

export interface FacultySubmissionRecord {
  facultyEmail: string;
  facultyName: string;
  department?: string;
  termId: string;
  weeks: boolean[]; // 11 elements for weeks 1 to 11
  updatedAt?: string;
  updatedBy?: string;
  notes?: string;
}

