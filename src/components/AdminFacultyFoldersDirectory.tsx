import React, { useState, useMemo } from 'react';
import {
  FacultyFolder,
  FacultyPersonalFile,
  UserProfile,
} from '../types';
import { extractFacultySurname } from '../lib/firebase';
import { GoogleDriveWebview } from './GoogleDriveWebview';
import {
  Folder,
  FolderTree,
  FolderOpen,
  User,
  Users,
  Search,
  ExternalLink,
  Download,
  Copy,
  Check,
  FileText,
  FileSpreadsheet,
  File,
  HardDrive,
  ChevronRight,
  ChevronDown,
  Calendar,
  Layers,
  ShieldCheck,
  Eye,
  Filter,
  CheckCircle,
  Clock,
  Sparkles,
  Info,
  ArrowLeft,
  Mail,
  Building,
  Trash2,
  X,
  LayoutGrid,
} from 'lucide-react';

interface AdminFacultyFoldersDirectoryProps {
  facultyList: Array<{ id: string; name: string; email: string; department?: string; createdAt?: string }>;
  facultyFolders: FacultyFolder[];
  facultyFiles: FacultyPersonalFile[];
  currentUser: UserProfile;
  onDeleteFacultyFolder?: (id: string) => void;
  onDeleteFacultyFile?: (id: string) => void;
}

export const AdminFacultyFoldersDirectory: React.FC<AdminFacultyFoldersDirectoryProps> = ({
  facultyList,
  facultyFolders,
  facultyFiles,
  currentUser,
  onDeleteFacultyFolder,
  onDeleteFacultyFile,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'has_folders' | 'empty'>('all');
  const [selectedFacultyEmail, setSelectedFacultyEmail] = useState<string | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
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

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Combine registered faculty list + any additional faculty emails from folders
  const allFacultyAccounts = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; department: string; createdAt?: string }>();

    // 1. From registered faculty directory
    facultyList.forEach((f) => {
      const emailClean = (f.email || '').toLowerCase().trim();
      if (emailClean) {
        map.set(emailClean, {
          id: f.id,
          name: f.name || emailClean.split('@')[0],
          email: emailClean,
          department: f.department || 'Senior High School Dept.',
          createdAt: f.createdAt,
        });
      }
    });

    // 2. From faculty folders if any account wasn't in directory
    facultyFolders.forEach((folder) => {
      const emailClean = (folder.facultyEmail || '').toLowerCase().trim();
      if (emailClean && !map.has(emailClean)) {
        map.set(emailClean, {
          id: `fac-${emailClean}`,
          name: folder.facultyName || emailClean.split('@')[0],
          email: emailClean,
          department: 'Senior High School Dept.',
          createdAt: folder.createdAt,
        });
      }
    });

    const list = Array.from(map.values());

    // Sort alphabetically by extracted SURNAME
    list.sort((a, b) => {
      const surnameA = extractFacultySurname(a.name);
      const surnameB = extractFacultySurname(b.name);
      return surnameA.localeCompare(surnameB);
    });

    return list;
  }, [facultyList, facultyFolders]);

  // Group folders and files by faculty email
  const facultyDataMap = useMemo(() => {
    const folderMap: Record<string, FacultyFolder[]> = {};
    const fileMap: Record<string, FacultyPersonalFile[]> = {};

    facultyFolders.forEach((folder) => {
      const email = (folder.facultyEmail || '').toLowerCase().trim();
      if (!folderMap[email]) folderMap[email] = [];
      folderMap[email].push(folder);
    });

    facultyFiles.forEach((file) => {
      const email = (file.facultyEmail || '').toLowerCase().trim();
      if (!fileMap[email]) fileMap[email] = [];
      fileMap[email].push(file);
    });

    return { folderMap, fileMap };
  }, [facultyFolders, facultyFiles]);

  // Filter faculty by search query and status
  const filteredFaculty = useMemo(() => {
    return allFacultyAccounts.filter((faculty) => {
      const surname = extractFacultySurname(faculty.name);
      const folders = facultyDataMap.folderMap[faculty.email] || [];
      const files = facultyDataMap.fileMap[faculty.email] || [];

      const matchesSearch =
        surname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faculty.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        faculty.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        folders.some((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

      let matchesStatus = true;
      if (statusFilter === 'has_folders') {
        matchesStatus = folders.length > 0;
      } else if (statusFilter === 'empty') {
        matchesStatus = folders.length === 0;
      }

      return matchesSearch && matchesStatus;
    });
  }, [allFacultyAccounts, searchTerm, statusFilter, facultyDataMap]);

  // Currently Selected Faculty Details
  const activeFaculty = useMemo(() => {
    if (!selectedFacultyEmail) return null;
    return allFacultyAccounts.find((f) => f.email === selectedFacultyEmail) || null;
  }, [allFacultyAccounts, selectedFacultyEmail]);

  const activeFacultyFolders = useMemo(() => {
    if (!selectedFacultyEmail) return [];
    return facultyDataMap.folderMap[selectedFacultyEmail] || [];
  }, [facultyDataMap, selectedFacultyEmail]);

  const activeFacultyFiles = useMemo(() => {
    if (!selectedFacultyEmail) return [];
    return facultyDataMap.fileMap[selectedFacultyEmail] || [];
  }, [facultyDataMap, selectedFacultyEmail]);

  // Selected folder inside active faculty
  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return activeFacultyFolders.find((f) => f.id === selectedFolderId) || null;
  }, [activeFacultyFolders, selectedFolderId]);

  const filesInActiveFolder = useMemo(() => {
    if (!selectedFolderId) return [];
    return activeFacultyFiles.filter((f) => f.folderId === selectedFolderId);
  }, [activeFacultyFiles, selectedFolderId]);

  const getFormatIcon = (format: string) => {
    const f = (format || '').toLowerCase();
    if (f === 'pdf') return <FileText className="w-4 h-4 text-rose-600" />;
    if (f.includes('xls') || f.includes('sheet') || f.includes('csv')) return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    if (f.includes('doc') || f.includes('word')) return <FileText className="w-4 h-4 text-blue-600" />;
    if (f === 'gdrive' || f.includes('drive')) return <HardDrive className="w-4 h-4 text-blue-500" />;
    return <File className="w-4 h-4 text-slate-500" />;
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center space-x-3 text-xs font-mono animate-slideUp">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 sm:p-7 text-white shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center space-x-2">
            <span className="bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[10px] sm:text-xs font-mono px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider flex items-center space-x-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Faculty Folders Explorer</span>
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight font-sans text-white">
            Faculty Repositories by Surname
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl font-medium">
            Each folder below represents a registered faculty member organized by their <strong className="text-amber-300">SURNAME</strong>. Open any faculty surname to inspect their created lesson folders, Daily Lesson Logs, and uploaded files.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs font-mono shrink-0">
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
            <div className="text-slate-400 text-[10px]">Total Faculty</div>
            <div className="text-lg font-bold text-white">{allFacultyAccounts.length}</div>
          </div>
          <div className="bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 text-center">
            <div className="text-slate-400 text-[10px]">Total Folders</div>
            <div className="text-lg font-bold text-amber-300">{facultyFolders.length}</div>
          </div>
        </div>
      </div>

      {/* DETAILED VIEW OF SELECTED FACULTY */}
      {activeFaculty ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6 animate-fadeIn">
          {/* Breadcrumb Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-3">
              <button
                type="button"
                onClick={() => {
                  setSelectedFolderId(null);
                  setSelectedFacultyEmail(null);
                }}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-all flex items-center space-x-1.5 text-xs font-bold font-mono cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>All Faculty Surnames</span>
              </button>

              <div className="h-5 w-px bg-slate-200" />

              <div className="flex items-center space-x-2.5">
                <div className="p-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl font-bold font-mono text-sm">
                  📁 {extractFacultySurname(activeFaculty.name)}
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                    {activeFaculty.name}
                  </h3>
                  <div className="text-xs text-slate-500 font-mono flex items-center space-x-2">
                    <span>{activeFaculty.email}</span>
                    <span>•</span>
                    <span className="text-blue-600 font-semibold">{activeFacultyFolders.length} folders created</span>
                  </div>
                </div>
              </div>
            </div>

            {selectedFolderId && (
              <button
                type="button"
                onClick={() => setSelectedFolderId(null)}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to {extractFacultySurname(activeFaculty.name)}'s Folders</span>
              </button>
            )}
          </div>

          {/* If viewing inside a specific folder of this faculty */}
          {activeFolder ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="p-2.5 bg-blue-600 text-white rounded-xl">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base font-bold text-slate-900">{activeFolder.name}</h4>
                        <span className="text-[10px] font-mono bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md font-bold">
                          {activeFolder.category || 'General'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 font-mono mt-0.5">
                        Created on {activeFolder.createdAt || 'Recent'} • {filesInActiveFolder.length} documents
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                    {activeFolder.driveUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => setShowFolderDriveEmbed(!showFolderDriveEmbed)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer shadow-2xs border ${
                            showFolderDriveEmbed
                              ? 'bg-emerald-700 text-white border-emerald-800'
                              : 'bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                          }`}
                        >
                          <LayoutGrid className="w-3.5 h-3.5" />
                          <span>{showFolderDriveEmbed ? 'Collapse Webview' : 'Show Webview'}</span>
                        </button>

                        <a
                          href={activeFolder.driveUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 shadow-xs"
                        >
                          <HardDrive className="w-3.5 h-3.5" />
                          <span>Open in Drive</span>
                          <ExternalLink className="w-3.5 h-3.5 ml-0.5" />
                        </a>
                      </>
                    )}

                    {currentUser?.role === 'Admin' && onDeleteFacultyFolder && (
                      <button
                        type="button"
                        onClick={() => {
                          const isConfirmed = window.confirm(
                            `Are you sure you want to delete folder "${activeFolder.name}" and all its uploaded files?`
                          );
                          if (isConfirmed) {
                            onDeleteFacultyFolder(activeFolder.id);
                            setSelectedFolderId(null);
                            showToast(`🗑️ Folder "${activeFolder.name}" deleted from faculty repository.`);
                          }
                        }}
                        className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer"
                        title="Delete Faculty Folder"
                      >
                        <Trash2 className="w-4 h-4 text-rose-600" />
                        <span>Delete Folder</span>
                      </button>
                    )}
                  </div>
                </div>

                {activeFolder.description && (
                  <p className="text-xs text-slate-600 pt-2 border-t border-slate-200/60 leading-relaxed font-sans">
                    <span className="font-bold text-slate-800">Faculty Notes: </span>
                    {activeFolder.description}
                  </p>
                )}
              </div>

              {/* Embedded Google Drive Webview for the Folder */}
              {activeFolder.driveUrl && showFolderDriveEmbed && (
                <div className="animate-fadeIn">
                  <GoogleDriveWebview
                    url={activeFolder.driveUrl}
                    title={`${activeFolder.name} - Google Drive`}
                    subtitle={`Faculty Workspace Folder • ${activeFaculty.name}`}
                    initialHeight={460}
                    allowToggleViewMode={true}
                  />
                </div>
              )}
            </div>
          ) : (
            /* List of Folders that this faculty created */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-mono font-bold text-slate-800 uppercase tracking-wider">
                  Personal Folders Created by {activeFaculty.name} ({activeFacultyFolders.length})
                </h4>
              </div>

              {activeFacultyFolders.length === 0 ? (
                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/60 space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 mx-auto flex items-center justify-center">
                    <Folder className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No Folders Created Yet</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">
                    {activeFaculty.name} has not created any personal folders in their workspace yet.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {activeFacultyFolders.map((folder) => {
                    const count = activeFacultyFiles.filter((f) => f.folderId === folder.id).length;
                    return (
                      <div
                        key={folder.id}
                        onClick={() => setSelectedFolderId(folder.id)}
                        className="bg-slate-50 hover:bg-white border border-slate-200 hover:border-blue-400 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="p-3 bg-blue-50 border border-blue-200 text-blue-600 rounded-2xl shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                              <Folder className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-white border border-slate-200 text-slate-700 rounded-md">
                              {folder.category || 'General'}
                            </span>
                          </div>

                          <h5 className="font-bold text-sm text-slate-900 group-hover:text-blue-600 transition-colors line-clamp-1">
                            {folder.name}
                          </h5>

                          {folder.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                              {folder.description}
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between text-xs font-mono text-slate-500">
                          <div className="flex items-center space-x-2">
                            {folder.driveUrl && (
                              <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                                <HardDrive className="w-3 h-3 text-emerald-600" />
                                <span>Drive Webview</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            {currentUser?.role === 'Admin' && onDeleteFacultyFolder && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const isConfirmed = window.confirm(
                                    `Delete folder "${folder.name}" and all its files from ${activeFaculty.name}'s repository?`
                                  );
                                  if (isConfirmed) {
                                    onDeleteFacultyFolder(folder.id);
                                    showToast(`🗑️ Folder "${folder.name}" deleted.`);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete Folder"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <span className="text-blue-600 font-bold flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                              <span>Inspect</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* ALL FACULTY SURNAMES LIST / DIRECTORY */
        <div className="space-y-5">
          {/* Controls Bar: Search & Status Filters */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by faculty surname (e.g., GARNICA, SANTOS), name, or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Faculty ({allFacultyAccounts.length})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('has_folders')}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  statusFilter === 'has_folders' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                }`}
              >
                With Folders ({allFacultyAccounts.filter((f) => (facultyDataMap.folderMap[f.email] || []).length > 0).length})
              </button>

              <button
                type="button"
                onClick={() => setStatusFilter('empty')}
                className={`px-3 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
                  statusFilter === 'empty' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                Empty Workspaces
              </button>
            </div>
          </div>

          {/* Surnames Grid */}
          {filteredFaculty.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-3xl p-10 text-center text-xs font-mono text-slate-500 space-y-2">
              <p>No faculty records found matching "{searchTerm}"</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className="text-blue-600 hover:underline font-bold"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFaculty.map((faculty) => {
                const surname = extractFacultySurname(faculty.name);
                const folders = facultyDataMap.folderMap[faculty.email] || [];
                const files = facultyDataMap.fileMap[faculty.email] || [];
                const hasFolders = folders.length > 0;

                return (
                  <div
                    key={faculty.email}
                    onClick={() => setSelectedFacultyEmail(faculty.email)}
                    className="bg-white border border-slate-200 hover:border-amber-400/90 rounded-3xl p-5 shadow-2xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-4 group hover:-translate-y-0.5"
                  >
                    <div className="space-y-3">
                      {/* Top Surname Badge & Status */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-3">
                          <div className={`p-3 rounded-2xl border ${hasFolders ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-100 border-slate-200 text-slate-500'} shrink-0`}>
                            <Folder className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-1.5">
                              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight group-hover:text-amber-700 transition-colors">
                                {surname}
                              </h3>
                            </div>
                            <div className="text-xs text-slate-600 font-semibold truncate max-w-[170px]">
                              {faculty.name}
                            </div>
                          </div>
                        </div>

                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                          hasFolders ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {hasFolders ? `${folders.length} Folders` : 'Empty'}
                        </span>
                      </div>

                      {/* Faculty Meta Details */}
                      <div className="space-y-1 text-xs font-mono text-slate-500 pt-1">
                        <div className="flex items-center space-x-1.5 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{faculty.email}</span>
                        </div>
                        <div className="flex items-center space-x-1.5 truncate">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{faculty.department}</span>
                        </div>
                      </div>

                      {/* Folder Name Previews */}
                      {hasFolders && (
                        <div className="pt-2 border-t border-slate-100 space-y-1">
                          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
                            Faculty Folders:
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {folders.slice(0, 3).map((f) => (
                              <span
                                key={f.id}
                                className="text-[11px] font-sans bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[150px]"
                              >
                                {f.name}
                              </span>
                            ))}
                            {folders.length > 3 && (
                              <span className="text-[11px] font-mono text-slate-400 px-1 py-0.5">
                                +{folders.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end text-xs font-mono">
                      <span className="text-blue-600 font-bold flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                        <span>Open Folder</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* DOCUMENT / FOLDER WEBVIEW PREVIEW MODAL FOR ADMIN */}
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
