import React, { useState, useMemo, useEffect } from 'react';
import {
  FacultyFolder,
  FacultyPersonalFile,
  UserProfile,
  SchoolPermanentFolder,
} from '../types';
import { extractDriveId, getStoredSchoolPermanentFolders, subscribeSchoolPermanentFolders } from '../lib/firebase';
import { GoogleDriveWebview } from './GoogleDriveWebview';
import {
  Folder,
  FolderPlus,
  FileText,
  File,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Search,
  ExternalLink,
  Download,
  Copy,
  Check,
  Eye,
  X,
  Sparkles,
  Layers,
  Calendar,
  Tag,
  HardDrive,
  FolderOpen,
  FileSpreadsheet,
  FileCode,
  FileCheck,
  Link,
  ChevronRight,
  Filter,
  Info,
  ShieldCheck,
  User,
  ArrowLeft,
  RefreshCw,
  LayoutGrid,
  Maximize2,
  Lock,
  FolderLock,
} from 'lucide-react';

interface FacultyPersonalDashboardProps {
  currentUser: UserProfile;
  facultyFolders: FacultyFolder[];
  facultyFiles: FacultyPersonalFile[];
  schoolPermanentFolders?: SchoolPermanentFolder[];
  onAddFolder: (folder: Omit<FacultyFolder, 'id' | 'createdAt' | 'updatedAt' | 'itemCount'>) => void;
  onEditFolder: (id: string, updated: Partial<FacultyFolder>) => void;
  onDeleteFolder: (id: string) => void;
  onAddFile: (file: Omit<FacultyPersonalFile, 'id' | 'uploadedAt'>) => void;
  onDeleteFile: (id: string) => void;
  onNavigateToRepository?: () => void;
  onNavigateToAdminDashboard?: () => void;
}

const CATEGORY_OPTIONS = [
  'Daily Lesson Log (DLL)',
  'Table of Specifications (TOS)',
  'Test Questions & Answer Keys',
  'Budget of Work (BOW)',
  'Learning Activity Sheets (LAS)',
  'Instructional Media & PPT',
  'Class Records & Grades',
  'DepEd Forms & Portfolio',
  'General Subject Materials',
];

const COLOR_THEMES = [
  { name: 'Emerald', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', icon: 'text-emerald-600', ring: 'ring-emerald-500' },
  { name: 'Blue', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', icon: 'text-blue-600', ring: 'ring-blue-500' },
  { name: 'Indigo', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', icon: 'text-indigo-600', ring: 'ring-indigo-500' },
  { name: 'Purple', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', icon: 'text-purple-600', ring: 'ring-purple-500' },
  { name: 'Amber', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-600', ring: 'ring-amber-500' },
  { name: 'Rose', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', icon: 'text-rose-600', ring: 'ring-rose-500' },
];

export const FacultyPersonalDashboard: React.FC<FacultyPersonalDashboardProps> = ({
  currentUser,
  facultyFolders,
  facultyFiles,
  schoolPermanentFolders,
  onAddFolder,
  onEditFolder,
  onDeleteFolder,
  onAddFile,
  onDeleteFile,
  onNavigateToRepository,
  onNavigateToAdminDashboard,
}) => {
  // Permanent School-Wide Folders state ("SCHOOL FORMS" and "SCHOOL DOCUMENTS")
  const [livePermanentFolders, setLivePermanentFolders] = useState<SchoolPermanentFolder[]>(() => {
    return schoolPermanentFolders && schoolPermanentFolders.length > 0
      ? schoolPermanentFolders
      : getStoredSchoolPermanentFolders();
  });

  useEffect(() => {
    if (schoolPermanentFolders && schoolPermanentFolders.length > 0) {
      setLivePermanentFolders(schoolPermanentFolders);
    }
  }, [schoolPermanentFolders]);

  useEffect(() => {
    const unsub = subscribeSchoolPermanentFolders((folders) => {
      if (folders && folders.length > 0) {
        setLivePermanentFolders(folders);
      }
    });
    return () => unsub();
  }, []);

  // Filter STRICTLY for current logged in faculty member
  const userEmail = (currentUser.email || '').toLowerCase().trim();
  const myFolders = useMemo(() => {
    return facultyFolders.filter(
      (f) => (f.facultyEmail || '').toLowerCase().trim() === userEmail
    );
  }, [facultyFolders, userEmail]);

  const myFiles = useMemo(() => {
    return facultyFiles.filter(
      (f) => (f.facultyEmail || '').toLowerCase().trim() === userEmail
    );
  }, [facultyFiles, userEmail]);

  // Selected Active Folder
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);

  // Active Folder Object (Resolves either to permanent school folder or personal faculty folder)
  const activePermanentFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return livePermanentFolders.find((f) => f.id === activeFolderId) || null;
  }, [livePermanentFolders, activeFolderId]);

  const activePersonalFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return myFolders.find((f) => f.id === activeFolderId) || null;
  }, [myFolders, activeFolderId]);

  const isPermanentActive = Boolean(activePermanentFolder);

  const activeFolder = useMemo(() => {
    if (activePermanentFolder) {
      return {
        id: activePermanentFolder.id,
        name: activePermanentFolder.name,
        description: activePermanentFolder.description,
        category: activePermanentFolder.category,
        color: activePermanentFolder.color,
        driveUrl: activePermanentFolder.driveUrl,
        driveId: activePermanentFolder.driveId,
        facultyEmail: 'admin@deped.gov.ph',
        facultyName: 'School Administration',
        facultySurname: 'Admin',
        createdAt: activePermanentFolder.updatedAt,
        updatedAt: activePermanentFolder.updatedAt,
      } as FacultyFolder;
    }
    return activePersonalFolder;
  }, [activePermanentFolder, activePersonalFolder]);

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');

  // Filtered permanent folders
  const filteredPermanentFolders = useMemo(() => {
    return livePermanentFolders.filter((f) => {
      const matchSearch =
        searchTerm === '' ||
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (f.description && f.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (f.category && f.category.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCategory =
        selectedCategoryFilter === 'all' || f.category === selectedCategoryFilter;
      return matchSearch && matchCategory;
    });
  }, [livePermanentFolders, searchTerm, selectedCategoryFilter]);

  // Filtered personal folders
  const filteredFolders = useMemo(() => {
    return myFolders.filter((folder) => {
      const matchesSearch =
        searchTerm === '' ||
        folder.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (folder.description && folder.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory =
        selectedCategoryFilter === 'all' || folder.category === selectedCategoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [myFolders, searchTerm, selectedCategoryFilter]);

  // Modals & Webview State
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FacultyFolder | null>(null);
  const [isAddFileModalOpen, setIsAddFileModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState<FacultyPersonalFile | null>(null);
  const [showFolderDriveEmbed, setShowFolderDriveEmbed] = useState<boolean>(true);
  const [previewWebviewModal, setPreviewWebviewModal] = useState<{
    isOpen: boolean;
    url: string;
    title: string;
    subtitle?: string;
  }>({
    isOpen: false,
    url: '',
    title: '',
    subtitle: '',
  });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form States - New Folder
  const [folderName, setFolderName] = useState('');
  const [folderDescription, setFolderDescription] = useState('');
  const [folderCategory, setFolderCategory] = useState(CATEGORY_OPTIONS[0]);
  const [folderColor, setFolderColor] = useState('Emerald');
  const [folderDriveUrl, setFolderDriveUrl] = useState('');

  // Form States - Upload File to Folder
  const [uploadMode, setUploadMode] = useState<'upload' | 'driveLink'>('upload');
  const [fileTitle, setFileTitle] = useState('');
  const [fileDescription, setFileDescription] = useState('');
  const [fileCategory, setFileCategory] = useState(CATEGORY_OPTIONS[0]);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [customDriveUrl, setCustomDriveUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filesInActiveFolder = useMemo(() => {
    if (!activeFolderId) return [];
    return myFiles.filter((f) => f.folderId === activeFolderId);
  }, [myFiles, activeFolderId]);

  const handleOpenNewFolderModal = () => {
    setFolderName('');
    setFolderDescription('');
    setFolderCategory(CATEGORY_OPTIONS[0]);
    setFolderColor('Emerald');
    setFolderDriveUrl('');
    setEditingFolder(null);
    setIsNewFolderModalOpen(true);
  };

  const handleOpenEditFolderModal = (folder: FacultyFolder, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (folder.id === 'school-forms' || folder.id === 'school-documents') {
      showToast('Permanent school-wide folders can only be edited by administrators in the Admin Dashboard.');
      return;
    }
    setEditingFolder(folder);
    setFolderName(folder.name);
    setFolderDescription(folder.description || '');
    setFolderCategory(folder.category || CATEGORY_OPTIONS[0]);
    setFolderColor(folder.color || 'Emerald');
    setFolderDriveUrl(folder.driveUrl || '');
    setIsNewFolderModalOpen(true);
  };

  const handleSaveFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      showToast('Please enter a folder title.');
      return;
    }

    const driveId = extractDriveId(folderDriveUrl.trim());

    if (editingFolder) {
      if (editingFolder.id === 'school-forms' || editingFolder.id === 'school-documents') {
        showToast('Permanent school-wide folders cannot be edited here. Use Admin Dashboard.');
        setIsNewFolderModalOpen(false);
        return;
      }
      onEditFolder(editingFolder.id, {
        name: folderName.trim(),
        description: folderDescription.trim(),
        category: folderCategory,
        color: folderColor,
        driveUrl: folderDriveUrl.trim(),
        driveId: driveId || '',
      });
      showToast(`Folder "${folderName.trim()}" updated successfully.`);
    } else {
      onAddFolder({
        facultyEmail: currentUser.email,
        facultyName: currentUser.name,
        facultySurname: '', // Handled in lib/firebase.ts
        name: folderName.trim(),
        description: folderDescription.trim(),
        category: folderCategory,
        color: folderColor,
        driveUrl: folderDriveUrl.trim(),
        driveId: driveId || '',
      });
      showToast(`Personal folder "${folderName.trim()}" created successfully!`);
    }

    setIsNewFolderModalOpen(false);
  };

  const handleDeleteFolderConfirm = (folderId: string, folderTitle: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (folderId === 'school-forms' || folderId === 'school-documents') {
      showToast('Permanent school-wide folders cannot be deleted.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete the folder "${folderTitle}" and all files inside it? This action cannot be undone.`)) {
      onDeleteFolder(folderId);
      if (activeFolderId === folderId) {
        setActiveFolderId(null);
      }
      showToast(`Folder "${folderTitle}" deleted.`);
    }
  };

  const handleOpenAddFileModal = (folderId: string) => {
    setActiveFolderId(folderId);
    setUploadMode('upload');
    setFileTitle('');
    setFileDescription('');
    setFileCategory(activeFolder?.category || CATEGORY_OPTIONS[0]);
    setAttachedFile(null);
    setCustomDriveUrl('');
    setIsAddFileModalOpen(true);
  };

  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeFolderId) return;

    if (!fileTitle.trim()) {
      showToast('Please enter a file title.');
      return;
    }

    if (uploadMode === 'upload' && !attachedFile) {
      showToast('Please select a file to upload.');
      return;
    }

    if (uploadMode === 'driveLink' && !customDriveUrl.trim()) {
      showToast('Please enter a valid Google Drive link.');
      return;
    }

    setIsUploading(true);

    setTimeout(() => {
      let fileName = 'document.pdf';
      let fileSizeBytes = 1024 * 500; // 500 KB default
      let fileSizeFormatted = '500 KB';
      let format = 'pdf';

      if (uploadMode === 'upload' && attachedFile) {
        fileName = attachedFile.name;
        fileSizeBytes = attachedFile.size;
        const sizeMb = fileSizeBytes / (1024 * 1024);
        fileSizeFormatted = sizeMb >= 1 ? `${sizeMb.toFixed(1)} MB` : `${(fileSizeBytes / 1024).toFixed(0)} KB`;
        const extMatch = fileName.match(/\.([0-9a-z]+)$/i);
        format = extMatch ? extMatch[1].toLowerCase() : 'file';
      } else {
        fileName = `${fileTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.gdrive`;
        format = 'gdrive';
        fileSizeFormatted = 'Cloud Link';
      }

      onAddFile({
        folderId: activeFolderId,
        facultyEmail: currentUser.email,
        facultyName: currentUser.name,
        title: fileTitle.trim(),
        fileName,
        fileSizeBytes,
        fileSizeFormatted,
        format,
        category: fileCategory,
        driveUrl: uploadMode === 'driveLink' ? customDriveUrl.trim() : (activeFolder?.driveUrl || ''),
        isGoogleDriveLink: uploadMode === 'driveLink',
        description: fileDescription.trim(),
      });

      setIsUploading(false);
      setIsAddFileModalOpen(false);
      showToast(`File "${fileTitle.trim()}" added to folder.`);
    }, 400);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getFormatIcon = (format: string) => {
    const f = format.toLowerCase();
    if (f === 'pdf') return <FileText className="w-4 h-4 text-rose-600" />;
    if (f.includes('xls') || f.includes('csv') || f.includes('sheet')) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    if (f.includes('doc') || f.includes('word')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (f.includes('ppt') || f.includes('pres')) return <FileText className="w-4 h-4 text-amber-600" />;
    if (f === 'gdrive' || f.includes('drive')) return <HardDrive className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-3 text-xs font-mono animate-slideUp">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Faculty Header */}
      <div className="bg-gradient-to-r from-blue-700 via-blue-800 to-indigo-900 rounded-3xl p-6 sm:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Layers className="w-72 h-72 text-white" />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5">
              <span className="bg-white/15 backdrop-blur-md text-blue-100 text-[11px] font-mono font-bold px-3 py-1 rounded-full uppercase tracking-wider border border-white/20 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                <span>Personal Faculty Workspace</span>
              </span>
              <span className="text-blue-200 text-xs font-mono font-semibold">
                Private & Secure
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-sans text-white">
              Welcome, {currentUser.name}
            </h1>
            <p className="text-blue-100 text-xs sm:text-sm font-medium max-w-2xl leading-relaxed">
              Your personalized repository for Daily Lesson Logs (DLL), Table of Specifications (TOS), Test Questions, and class instructional materials. Only you have access to your personal folders.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              type="button"
              onClick={handleOpenNewFolderModal}
              className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs sm:text-sm font-mono font-bold rounded-2xl transition-all shadow-md flex items-center space-x-2 cursor-pointer hover:scale-[1.02] active:scale-95 border border-emerald-400/50"
            >
              <FolderPlus className="w-4 h-4 text-white" />
              <span>+ Create Personal Folder</span>
            </button>
          </div>
        </div>

        {/* Quick Workspace Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-white/10 text-xs font-mono">
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="text-blue-200 text-[11px]">School Permanent Folders</div>
            <div className="text-xl font-bold text-white mt-0.5">2</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="text-blue-200 text-[11px]">Personal Folders</div>
            <div className="text-xl font-bold text-white mt-0.5">{myFolders.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="text-blue-200 text-[11px]">Personal Files</div>
            <div className="text-xl font-bold text-white mt-0.5">{myFiles.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
            <div className="text-blue-200 text-[11px]">Status</div>
            <div className="text-xs font-bold text-emerald-300 mt-1 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span>Firestore Synced</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace Navigation & Active Folder View */}
      {activeFolder ? (
        /* INSIDE ACTIVE FOLDER VIEW */
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          {/* Breadcrumb & Navigation */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-bold font-mono cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to Folders</span>
              </button>

              <div className="h-5 w-px bg-slate-200" />

              <div className="flex items-center space-x-2">
                <div className={`p-2 rounded-xl ${isPermanentActive ? 'bg-indigo-50 text-indigo-700' : 'bg-blue-50 text-blue-600'}`}>
                  {isPermanentActive ? <FolderLock className="w-5 h-5" /> : <FolderOpen className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                      {activeFolder.name}
                    </h2>
                    {isPermanentActive && (
                      <span className="bg-indigo-600 text-white text-[10px] font-mono px-2 py-0.5 rounded-full font-bold uppercase flex items-center space-x-1">
                        <Lock className="w-3 h-3" />
                        <span>Permanent</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono mt-0.5">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-md font-semibold text-slate-700">
                      {activeFolder.category || 'General'}
                    </span>
                    <span>•</span>
                    {isPermanentActive ? (
                      <span className="text-emerald-700 font-bold">Admin Managed Link • Read Access</span>
                    ) : (
                      <span>{filesInActiveFolder.length} personal items</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {isPermanentActive ? (
                <div className="flex items-center space-x-2">
                  <span className="text-[11px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-3 py-1.5 rounded-xl font-bold flex items-center space-x-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Permanent School Folder</span>
                  </span>
                  {currentUser.role === 'Admin' && onNavigateToAdminDashboard && (
                    <button
                      type="button"
                      onClick={onNavigateToAdminDashboard}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-mono font-bold transition-all shadow-2xs flex items-center space-x-1 cursor-pointer"
                      title="Administrators can change this embedded link in the Admin Dashboard"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit Link in Admin Dashboard</span>
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={(e) => handleOpenEditFolderModal(activeFolder, e)}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all cursor-pointer"
                    title="Edit Folder Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleDeleteFolderConfirm(activeFolder.id, activeFolder.name, e)}
                    className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl transition-all cursor-pointer"
                    title="Delete Folder"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* School-Wide Permanent Banner */}
          {isPermanentActive && (
            <div className="bg-gradient-to-r from-indigo-50 via-blue-50 to-emerald-50 border border-indigo-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 text-xs sm:text-sm">
                    Official Central School Repository • {activeFolder.name}
                  </div>
                  <div className="text-slate-600 text-[11px] mt-0.5">
                    This folder is permanent and visible to all faculty members. The embedded Google Drive link is centrally managed by School Administration through the Admin Dashboard.
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 shrink-0">
                <span className="text-[10px] text-indigo-900 bg-white/90 px-2.5 py-1 rounded-lg border border-indigo-200 font-bold uppercase">
                  DepEd Official Link
                </span>
              </div>
            </div>
          )}

          {/* Folder Description and Optional Google Drive Link Banner */}
          {activeFolder.description && (
            <p className="text-xs sm:text-sm text-slate-600 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-medium">
              <span className="font-bold text-slate-800">Description: </span>
              {activeFolder.description}
            </p>
          )}

          {/* Google Drive Embedded Webview Preview Section */}
          {activeFolder.driveUrl ? (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 bg-emerald-50/90 border border-emerald-200/90 rounded-2xl p-3.5">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-2xs">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-xs text-emerald-950 font-mono">
                        Embedded Google Drive Folder Webview
                      </span>
                      <span className="bg-emerald-600 text-white text-[9px] font-mono px-2 py-0.2 rounded-full font-bold uppercase">
                        Live Preview
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-700 font-mono truncate max-w-md">
                      {activeFolder.driveUrl}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setShowFolderDriveEmbed(!showFolderDriveEmbed)}
                    className={`px-3 py-1.5 rounded-xl border transition-all flex items-center space-x-1.5 font-bold cursor-pointer shadow-2xs ${
                      showFolderDriveEmbed
                        ? 'bg-emerald-700 text-white border-emerald-800'
                        : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span>{showFolderDriveEmbed ? 'Collapse Webview' : 'Show Webview'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => copyToClipboard(activeFolder.driveUrl || '', `drive-${activeFolder.id}`)}
                    className="px-3 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 rounded-xl border border-emerald-300 transition-all flex items-center space-x-1 font-bold cursor-pointer"
                  >
                    {copiedId === `drive-${activeFolder.id}` ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Copy Link</span>
                  </button>

                  <a
                    href={activeFolder.driveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all flex items-center space-x-1 font-bold"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open Drive</span>
                  </a>
                </div>
              </div>

              {/* Embedded Webview Component */}
              {showFolderDriveEmbed && (
                <div className="animate-fadeIn">
                  <GoogleDriveWebview
                    url={activeFolder.driveUrl}
                    title={`${activeFolder.name} - Google Drive`}
                    subtitle={`Embedded folder preview • ${currentUser.name}`}
                    initialHeight={460}
                    allowToggleViewMode={true}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-300 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-slate-200 text-slate-600 rounded-xl">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-slate-800">No Google Drive link embedded for this folder</div>
                  <div className="text-slate-500 text-[11px]">
                    Link your Google Drive folder URL to view your live files inside an embedded webview.
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={(e) => handleOpenEditFolderModal(activeFolder, e)}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold transition-all shadow-2xs flex items-center space-x-1.5 shrink-0 cursor-pointer"
              >
                <Link className="w-3.5 h-3.5" />
                <span>+ Embed Google Drive Link</span>
              </button>
            </div>
          )}
        </div>
      ) : (
        /* FOLDERS OVERVIEW LIST & GRID */
        <div className="space-y-6">
          {/* Controls Bar: Search & Filter */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search your personal folders by name or category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center space-x-2">
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-mono text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="all">All Categories ({myFolders.length})</option>
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* SECTION 1: PERMANENT SCHOOL-WIDE FOLDERS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                  <FolderLock className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 flex items-center space-x-2">
                    <span>School Permanent Folders</span>
                    <span className="bg-indigo-600 text-white text-[10px] font-mono px-2 py-0.2 rounded-full font-bold">
                      Set for All Faculty
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Official central folders. The embedded Google Drive link is managed centrally by administrators.
                  </p>
                </div>
              </div>
              <div className="text-[11px] font-mono text-slate-500 hidden sm:block">
                {filteredPermanentFolders.length} Central Folders
              </div>
            </div>

            {filteredPermanentFolders.length === 0 ? (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-center text-xs font-mono text-slate-500">
                No permanent school folders match "{searchTerm}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPermanentFolders.map((permFolder) => {
                  const isForms = permFolder.id === 'school-forms';
                  const isDocs = permFolder.id === 'school-documents';

                  let bgGradient = 'from-indigo-50/70 to-blue-50/50 hover:border-indigo-500';
                  let iconBg = 'bg-indigo-600';
                  let badgeColor = 'bg-indigo-100 text-indigo-800 border-indigo-200';

                  if (isForms || permFolder.color === 'Blue') {
                    bgGradient = 'from-blue-50/70 to-indigo-50/50 hover:border-blue-500';
                    iconBg = 'bg-blue-600';
                    badgeColor = 'bg-blue-100 text-blue-800 border-blue-200';
                  } else if (isDocs || permFolder.color === 'Emerald') {
                    bgGradient = 'from-emerald-50/70 to-teal-50/50 hover:border-emerald-500';
                    iconBg = 'bg-emerald-600';
                    badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
                  } else if (permFolder.color === 'Purple') {
                    bgGradient = 'from-purple-50/70 to-fuchsia-50/50 hover:border-purple-500';
                    iconBg = 'bg-purple-600';
                    badgeColor = 'bg-purple-100 text-purple-800 border-purple-200';
                  } else if (permFolder.color === 'Amber') {
                    bgGradient = 'from-amber-50/70 to-yellow-50/50 hover:border-amber-500';
                    iconBg = 'bg-amber-600';
                    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
                  } else if (permFolder.color === 'Rose') {
                    bgGradient = 'from-rose-50/70 to-pink-50/50 hover:border-rose-500';
                    iconBg = 'bg-rose-600';
                    badgeColor = 'bg-rose-100 text-rose-800 border-rose-200';
                  } else if (permFolder.color === 'Teal') {
                    bgGradient = 'from-teal-50/70 to-emerald-50/50 hover:border-teal-500';
                    iconBg = 'bg-teal-600';
                    badgeColor = 'bg-teal-100 text-teal-800 border-teal-200';
                  } else if (permFolder.color === 'Cyan') {
                    bgGradient = 'from-cyan-50/70 to-blue-50/50 hover:border-cyan-500';
                    iconBg = 'bg-cyan-600';
                    badgeColor = 'bg-cyan-100 text-cyan-800 border-cyan-200';
                  }

                  return (
                    <div
                      key={permFolder.id}
                      onClick={() => setActiveFolderId(permFolder.id)}
                      className={`bg-gradient-to-br ${bgGradient} border-2 border-slate-200 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group hover:-translate-y-0.5 relative overflow-hidden`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <div className={`p-3 rounded-2xl ${iconBg} text-white shadow-xs shrink-0`}>
                              {isForms ? (
                                <FileSpreadsheet className="w-6 h-6" />
                              ) : isDocs ? (
                                <FileText className="w-6 h-6" />
                              ) : (
                                <FolderLock className="w-6 h-6" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border ${badgeColor}`}>
                                  {permFolder.category}
                                </span>
                                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 text-slate-700 flex items-center space-x-1">
                                  <Lock className="w-3 h-3 text-slate-600" />
                                  <span>{permFolder.isPermanent ? 'Permanent' : 'School Folder'}</span>
                                </span>
                              </div>
                              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 group-hover:text-blue-700 transition-colors mt-1 font-sans">
                                {permFolder.name}
                              </h3>
                            </div>
                          </div>

                          <div
                            className="p-1.5 text-slate-400 bg-white/80 rounded-xl border border-slate-200 shadow-2xs"
                            title="School Central Folder (Admin/Coordinator Managed Link)"
                          >
                            <Lock className="w-4 h-4 text-slate-500" />
                          </div>
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed font-sans">
                          {permFolder.description || 'Central department repository folder.'}
                        </p>
                      </div>

                      <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono">
                        <span className="text-[10px] text-slate-500 flex items-center space-x-1 font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{permFolder.updatedBy ? `Set by ${permFolder.updatedBy}` : 'Central Drive Link'}</span>
                        </span>

                        <div className="flex items-center space-x-1 text-[11px] font-bold text-blue-700 group-hover:translate-x-1 transition-transform">
                          <span>Open Live Drive</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* SECTION 2: PERSONAL FACULTY FOLDERS */}
          <div className="space-y-4 pt-4 border-t border-slate-200/80">
            <div className="flex items-center justify-between pb-1">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                  <Folder className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900">
                    Personal Faculty Folders ({myFolders.length})
                  </h2>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Your private DLL, TOS, TQ, and instructional materials folders.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenNewFolderModal}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 transition-all shadow-2xs cursor-pointer"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ New Folder</span>
              </button>
            </div>

            {/* Folders Grid / Empty State */}
            {myFolders.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-blue-200 rounded-3xl p-8 sm:p-12 text-center space-y-4 shadow-sm">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto flex items-center justify-center shadow-inner">
                  <FolderPlus className="w-7 h-7" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">No Personal Folders Created Yet</h3>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    You have access to the permanent school folders above. You can also create personal folders to organize your Daily Lesson Logs (DLL), Table of Specifications, and personal teaching materials.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenNewFolderModal}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-mono font-bold rounded-2xl transition-all shadow-sm inline-flex items-center space-x-2 cursor-pointer hover:scale-105 active:scale-95"
                >
                  <FolderPlus className="w-4 h-4 text-white" />
                  <span>+ Create Personal Folder</span>
                </button>
              </div>
            ) : filteredFolders.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-xs font-mono text-slate-500 space-y-2">
                <p>No personal folders match your search query: "{searchTerm}"</p>
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategoryFilter('all');
                  }}
                  className="text-blue-600 hover:underline font-bold"
                >
                  Reset filters
                </button>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFolders.map((folder) => {
                const filesCount = myFiles.filter((f) => f.folderId === folder.id).length;
                const theme = COLOR_THEMES.find((t) => t.name === folder.color) || COLOR_THEMES[0];

                return (
                  <div
                    key={folder.id}
                    onClick={() => setActiveFolderId(folder.id)}
                    className="bg-white border border-slate-200 hover:border-blue-500/80 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group hover:-translate-y-0.5 relative overflow-hidden"
                  >
                    <div className="space-y-3">
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-2xl ${theme.bg} ${theme.border} border ${theme.icon} shrink-0`}>
                            <Folder className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md">
                              {folder.category || 'General'}
                            </span>
                            <h3 className="font-bold text-sm sm:text-base text-slate-900 line-clamp-1 group-hover:text-blue-600 transition-colors mt-1">
                              {folder.name}
                            </h3>
                          </div>
                        </div>

                        {/* Quick Folder Controls */}
                        <div
                          className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleOpenEditFolderModal(folder, e)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-all"
                            title="Edit folder"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteFolderConfirm(folder.id, folder.name, e)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            title="Delete folder"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Description */}
                      {folder.description && (
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed font-sans">
                          {folder.description}
                        </p>
                      )}
                    </div>

                    {/* Footer Info */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end text-xs font-mono text-slate-500">
                      {folder.driveUrl ? (
                        <div className="flex items-center space-x-1.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveFolderId(folder.id);
                              setShowFolderDriveEmbed(true);
                            }}
                            className="text-[10px] text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 transition-all"
                            title="Open Google Drive Webview"
                          >
                            <HardDrive className="w-3 h-3 text-emerald-600" />
                            <span>Drive Webview</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400">
                          {folder.createdAt || 'Recent'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          </div>
        </div>
      )}

      {/* CREATE / EDIT FOLDER MODAL */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {editingFolder ? 'Edit Personal Folder' : 'Create New Personal Folder'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Owner: {currentUser.name}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsNewFolderModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFolder} className="space-y-4 text-xs font-mono">
              {/* Folder Name */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Folder Name / Subject Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Grade 11 21st Century Lit DLL or Q1 TOS & Exam Bank"
                  value={folderName}
                  onChange={(e) => setFolderName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-sans"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Folder Category
                </label>
                <select
                  value={folderCategory}
                  onChange={(e) => setFolderCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Google Drive Link */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block flex items-center justify-between">
                  <span>Google Drive Folder Link (Optional)</span>
                  <span className="text-emerald-700 font-normal">Auto ID extraction</span>
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={folderDriveUrl}
                  onChange={(e) => setFolderDriveUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <p className="text-[10px] text-slate-500">
                  Paste your Google Drive folder link to allow quick opening and syncing.
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Description / Notes (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Briefly describe what materials will be stored here..."
                  value={folderDescription}
                  onChange={(e) => setFolderDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-sans"
                />
              </div>

              {/* Color Theme Selector */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Folder Theme Color
                </label>
                <div className="flex items-center space-x-2">
                  {COLOR_THEMES.map((theme) => (
                    <button
                      key={theme.name}
                      type="button"
                      onClick={() => setFolderColor(theme.name)}
                      className={`w-7 h-7 rounded-xl ${theme.bg} ${theme.border} border-2 transition-all flex items-center justify-center cursor-pointer ${
                        folderColor === theme.name ? 'ring-2 ' + theme.ring + ' scale-110' : 'opacity-70 hover:opacity-100'
                      }`}
                      title={theme.name}
                    >
                      {folderColor === theme.name && <Check className="w-3.5 h-3.5 text-slate-800" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer"
                >
                  {editingFolder ? 'Save Changes' : 'Create Folder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD / ADD FILE MODAL */}
      {isAddFileModalOpen && activeFolder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-5 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Add File to "{activeFolder.name}"
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Personal Folder Repository
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddFileModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center p-1 bg-slate-100 rounded-xl border border-slate-200 font-mono text-xs">
              <button
                type="button"
                onClick={() => setUploadMode('upload')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  uploadMode === 'upload' ? 'bg-white text-blue-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Upload Local File</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('driveLink')}
                className={`flex-1 py-2 rounded-lg font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                  uploadMode === 'driveLink' ? 'bg-white text-emerald-700 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HardDrive className="w-3.5 h-3.5 text-emerald-600" />
                <span>Link Google Drive File</span>
              </button>
            </div>

            <form onSubmit={handleFileSubmit} className="space-y-4 text-xs font-mono">
              {/* Document Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Week 1 DLL - Introduction to Literature"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-sans"
                />
              </div>

              {/* Upload file or Google Drive URL */}
              {uploadMode === 'upload' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Choose File (PDF, Word, Excel, PPT, Zip) *
                  </label>
                  <input
                    type="file"
                    required
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setAttachedFile(e.target.files[0]);
                        if (!fileTitle) {
                          setFileTitle(e.target.files[0].name.replace(/\.[^/.]+$/, ''));
                        }
                      }
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-800 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-mono file:font-bold file:bg-blue-600 file:text-white hover:file:bg-blue-700 cursor-pointer"
                  />
                  {attachedFile && (
                    <div className="text-[11px] text-emerald-700 font-mono mt-1">
                      ✓ Ready: {attachedFile.name} ({(attachedFile.size / 1024).toFixed(0)} KB)
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Google Drive File / Doc Link *
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://docs.google.com/document/d/... or drive link"
                    value={customDriveUrl}
                    onChange={(e) => setCustomDriveUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                  />
                </div>
              )}

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Material Classification
                </label>
                <select
                  value={fileCategory}
                  onChange={(e) => setFileCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500 cursor-pointer"
                >
                  {CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  Notes / Competencies Covered (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Optional notes or lesson competencies..."
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 focus:bg-white transition-all font-sans"
                />
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFileModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-sm cursor-pointer flex items-center space-x-1.5"
                >
                  {isUploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Add File to Folder</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT / FOLDER WEBVIEW PREVIEW MODAL */}
      {previewWebviewModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-scaleUp">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-white truncate font-mono">
                    {previewWebviewModal.title}
                  </h3>
                  {previewWebviewModal.subtitle && (
                    <p className="text-[11px] text-slate-400 truncate font-mono">
                      {previewWebviewModal.subtitle}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={previewWebviewModal.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-xl transition-all flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Drive</span>
                </a>
                <button
                  type="button"
                  onClick={() =>
                    setPreviewWebviewModal({ isOpen: false, url: '', title: '', subtitle: '' })
                  }
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                  title="Close Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 flex-1 overflow-auto">
              <GoogleDriveWebview
                url={previewWebviewModal.url}
                title={previewWebviewModal.title}
                subtitle={previewWebviewModal.subtitle}
                initialHeight={520}
                allowToggleViewMode={true}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
