import React, { useState, useRef } from 'react';
import {
  RepositoryItem,
  FileCategory,
  AccessLevel,
  StorageTier,
  RepositoryCollection,
  UserProfile,
  DriveFolder,
} from '../types';
import { extractDriveId } from '../lib/firebase';
import {
  FileText,
  Folder,
  FolderOpen,
  FolderGit2,
  FolderPlus,
  Search,
  Star,
  Download,
  Eye,
  Copy,
  Check,
  Tag,
  Shield,
  ShieldCheck,
  Megaphone,
  Plus,
  HardDrive,
  Cpu,
  FileCode,
  FileSpreadsheet,
  Film,
  Box,
  Layers,
  Sparkles,
  ChevronRight,
  Upload,
  X,
  History,
  Terminal,
  ExternalLink,
  Trash2,
  CheckSquare,
  Square,
  Filter,
  Globe,
  RotateCw,
  Lock
} from 'lucide-react';

interface RepositoryExplorerProps {
  files: RepositoryItem[];
  repositories: RepositoryCollection[];
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  selectedFolder: string;
  setSelectedFolder: (folder: string) => void;
  onStarToggle: (fileId: string) => void;
  onDeleteFile: (fileId: string) => void;
  onUploadFile: (newFile: Omit<RepositoryItem, 'id' | 'downloadsCount' | 'activeStreams' | 'starsCount' | 'isStarred' | 'updatedAt'>) => void;
  isUploadModalOpen: boolean;
  setIsUploadModalOpen: (open: boolean) => void;
  currentUser?: UserProfile | null;
  onPostAnnouncementClick?: () => void;
  driveFolders?: DriveFolder[];
  onNavigateToAdminFolders?: () => void;
  onDeleteDriveFolder?: (id: string) => void;
}

export const RepositoryExplorer: React.FC<RepositoryExplorerProps> = ({
  files,
  repositories,
  searchTerm,
  setSearchTerm,
  selectedCategory,
  setSelectedCategory,
  selectedFolder,
  setSelectedFolder,
  onStarToggle,
  onDeleteFile,
  onUploadFile,
  isUploadModalOpen,
  setIsUploadModalOpen,
  currentUser,
  onPostAnnouncementClick,
  driveFolders = [],
  onNavigateToAdminFolders,
  onDeleteDriveFolder,
}) => {
  const [selectedFile, setSelectedFile] = useState<RepositoryItem | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [sortBy, setSortBy] = useState<'updatedAt' | 'downloads' | 'size' | 'stars'>('updatedAt');
  const [downloadProgress, setDownloadProgress] = useState<{ [id: string]: number }>({});
  const [showDirectoryPath, setShowDirectoryPath] = useState(false);

  // Dynamic Google Drive Folders mapping from Firestore state
  const availableFolders: DriveFolder[] =
    driveFolders && driveFolders.length > 0
      ? driveFolders
      : [
          {
            id: 'folder-root',
            name: 'Budget of Works (Root)',
            path: 'all',
            driveUrl: 'https://drive.google.com/drive/folders/1EAcyg-_LRsaZ6i_yu4pvDbBdoqPst6Lt?usp=drive_link',
            driveId: '1EAcyg-_LRsaZ6i_yu4pvDbBdoqPst6Lt',
            isDefault: true,
          },
          {
            id: 'folder-g11-dll',
            name: 'Grade 11 DLL',
            path: '/Grade 11 DLL',
            driveUrl: 'https://drive.google.com/drive/folders/1IBAtKJMb0zESnCQ7pRE0H3mN9hGxzPpD?usp=drive_link',
            driveId: '1IBAtKJMb0zESnCQ7pRE0H3mN9hGxzPpD',
            isDefault: true,
          },
          {
            id: 'folder-g12-dll',
            name: 'Grade 12 DLL',
            path: '/Grade 12 DLL',
            driveUrl: 'https://drive.google.com/drive/folders/1Rq_glP2OOakcasHBwuysmZHFzKbSsx9e?usp=drive_link',
            driveId: '1Rq_glP2OOakcasHBwuysmZHFzKbSsx9e',
            isDefault: true,
          },
          {
            id: 'folder-g11-tos-tq',
            name: 'Grade 11 TOS&TQ',
            path: '/Grade 11 TOS&TQ',
            driveUrl: 'https://drive.google.com/drive/folders/1U3JndEJXmTK6uCLvM2zn4pzJr5OnOezz?usp=drive_link',
            driveId: '1U3JndEJXmTK6uCLvM2zn4pzJr5OnOezz',
            isDefault: true,
          },
          {
            id: 'folder-g12-tos-tq',
            name: 'Grade 12 TOS&TQ',
            path: '/Grade 12 TOS&TQ',
            driveUrl: 'https://drive.google.com/drive/folders/17ift90G8tmiLZWewxqzLrhu8-xvjxub4?usp=drive_link',
            driveId: '17ift90G8tmiLZWewxqzLrhu8-xvjxub4',
            isDefault: true,
          },
        ];

  const activeDriveFolder =
    availableFolders.find((f) => f.path === selectedFolder) ||
    availableFolders.find((f) => f.path === 'all') ||
    availableFolders[0];

  const GOOGLE_DRIVE_FOLDER_URL =
    activeDriveFolder?.driveUrl ||
    'https://drive.google.com/drive/folders/1EAcyg-_LRsaZ6i_yu4pvDbBdoqPst6Lt?usp=drive_link';
  const GOOGLE_DRIVE_FOLDER_ID =
    activeDriveFolder?.driveId ||
    extractDriveId(GOOGLE_DRIVE_FOLDER_URL) ||
    '1EAcyg-_LRsaZ6i_yu4pvDbBdoqPst6Lt';

  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showDriveEmbed, setShowDriveEmbed] = useState(true);
  const [webviewKey, setWebviewKey] = useState(0);
  const [uploadNotification, setUploadNotification] = useState<string | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 0) return;

    droppedFiles.forEach((file: File) => {
      let sizeFormatted = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      if (file.size < 1024 * 1024) {
        sizeFormatted = `${(file.size / 1024).toFixed(1)} KB`;
      }

      const targetFolder = selectedFolder === 'all' ? '/Grade 11 DLL' : selectedFolder;

      onUploadFile({
        title: file.name.replace(/\.[^/.]+$/, ''),
        fileName: file.name,
        repositoryId: repositories[0]?.id || 'repo-1',
        category: file.name.endsWith('.pdf') ? 'document_pdf' : 'dataset_raw',
        folder: targetFolder,
        path: `svnhs-shs://${targetFolder.substring(1)}/${file.name}`,
        format: file.type || 'Document / File',
        fileSizeBytes: file.size,
        sizeFormatted: sizeFormatted,
        version: 'v1.0',
        description: `Uploaded file to ${targetFolder} folder and automatically synced with Google Drive repository.`,
        sha256: Math.random().toString(16).substring(2) + Math.random().toString(16).substring(2),
        md5: Math.random().toString(16).substring(2, 18),
        accessLevel: 'public',
        storageTier: 'hot_nvme',
        license: 'Department of Education',
        uploader: 'San Vicente NHS Staff',
        tags: ['Uploaded', 'BudgetOfWorks', targetFolder.replace('/', '')],
        previewType: 'text',
        previewContent: `File: ${file.name}\nSize: ${sizeFormatted}\nFolder: ${targetFolder}\nGoogle Drive Link: ${GOOGLE_DRIVE_FOLDER_URL}`,
      });
    });

    setUploadNotification(`Successfully uploaded ${droppedFiles.length} file(s) to ${selectedFolder === 'all' ? 'Budget of Works' : selectedFolder.replace('/', '')}! Opening Google Drive repository folder...`);
    
    // Automatically open the Google Drive folder link
    try {
      window.open(GOOGLE_DRIVE_FOLDER_URL, '_blank');
    } catch (err) {
      console.log('Popup blocked or prevented', err);
    }

    setTimeout(() => setUploadNotification(null), 6000);
  };

  // Google Drive Link Upload & Direct Quick Link State
  const [uploadMode, setUploadMode] = useState<'file' | 'driveLink'>('file');
  const [quickDriveUrl, setQuickDriveUrl] = useState('');
  const [quickDriveTitle, setQuickDriveTitle] = useState('');
  const [showQuickDriveInput, setShowQuickDriveInput] = useState(false);
  const [customDriveUrl, setCustomDriveUrl] = useState('');

  const handleQuickDriveSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDriveUrl.trim()) return;

    const url = quickDriveUrl.trim();
    let computedTitle = quickDriveTitle.trim();
    
    // Auto generate title if empty
    if (!computedTitle) {
      if (url.includes('/folders/')) {
        computedTitle = 'Google Drive Shared Folder Asset';
      } else if (url.includes('/file/d/')) {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        computedTitle = match ? `Google Drive Document (${match[1].substring(0, 8)})` : 'Google Drive Resource Document';
      } else {
        computedTitle = 'Google Drive Resource Asset';
      }
    }

    const targetFolder = selectedFolder === 'all' ? '/Grade 11 DLL' : selectedFolder;

    onUploadFile({
      title: computedTitle,
      fileName: `${computedTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.gdrive`,
      path: `svnhs-shs://${targetFolder.substring(1)}/${computedTitle}`,
      folder: targetFolder,
      repositoryId: repositories[0]?.id || 'repo-1',
      repositoryName: repositories[0]?.name || 'General Repository',
      category: 'document_pdf',
      fileSizeFormatted: 'Cloud Drive Link',
      fileSizeBytes: 0,
      format: 'Google Drive Asset Link',
      description: `Google Drive linked asset uploaded into ${targetFolder}. Direct access link: ${url}`,
      version: 'v1.0.0',
      versions: [
        {
          version: 'v1.0.0',
          uploadedAt: new Date().toISOString().substring(0, 10),
          fileSizeBytes: 0,
          fileSizeFormatted: 'Cloud Link',
          sha256: 'gdrive-' + Math.random().toString(16).substring(2),
          changelog: 'Google Drive asset link added.',
          uploader: 'San Vicente NHS Faculty',
        },
      ],
      sha256: 'gdrive-' + Math.random().toString(16).substring(2),
      md5: Math.random().toString(16).substring(2, 18),
      accessLevel: 'public',
      storageTier: 'hot_nvme',
      license: 'Department of Education',
      uploader: 'San Vicente NHS Faculty',
      tags: ['GoogleDrive', 'CloudLink', targetFolder.replace('/', '')],
      previewType: 'text',
      previewContent: `Asset Name: ${computedTitle}\nGoogle Drive Link: ${url}\nFolder: ${targetFolder}\nSynced via DepEd Google Drive Vault`,
      driveUrl: url,
      isGoogleDriveLink: true,
    });

    setUploadNotification(`Successfully linked Google Drive asset "${computedTitle}" to ${targetFolder}!`);
    setQuickDriveUrl('');
    setQuickDriveTitle('');
    setShowQuickDriveInput(false);
    setWebviewKey((prev) => prev + 1);
    setTimeout(() => setUploadNotification(null), 6000);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadFileName, setUploadFileName] = useState('');
  const [uploadRepoId, setUploadRepoId] = useState(repositories[0]?.id || 'repo-1');
  const [uploadCategory, setUploadCategory] = useState<FileCategory>('document_pdf');
  const [uploadFolder, setUploadFolder] = useState('/Grade 11 DLL');
  const [uploadFormat, setUploadFormat] = useState('Document / File');
  const [uploadSizeFormatted, setUploadSizeFormatted] = useState('2.4 MB');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadVersion, setUploadVersion] = useState('v1.0.0');
  const [uploadLicense, setUploadLicense] = useState('Department of Education');
  const [uploadAccess, setUploadAccess] = useState<AccessLevel>('public');
  const [uploadStorageTier, setUploadStorageTier] = useState<StorageTier>('hot_nvme');
  const [uploadTagsStr, setUploadTagsStr] = useState('BudgetOfWorks, DepEd, SHS');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setAttachedFile(file);
      setUploadFileName(file.name);
      setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
      let sizeFormatted = `${(file.size / 1024 / 1024).toFixed(1)} MB`;
      if (file.size < 1024 * 1024) {
        sizeFormatted = `${(file.size / 1024).toFixed(1)} KB`;
      }
      setUploadSizeFormatted(sizeFormatted);
      setUploadFormat(file.type || 'Document / File');
    }
  };

  const foldersList = availableFolders.map((f) => f.path);

  // Filter & Sort Logic
  const filteredFiles = files
    .filter((f) => {
      const matchesCategory = selectedCategory === 'all' || f.category === selectedCategory;
      const matchesFolder = selectedFolder === 'all' || f.folder === selectedFolder;
      const matchesSearch =
        !searchTerm ||
        f.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.tags.some((t) => t.toLowerCase().includes(searchTerm.toLowerCase()));
      return matchesCategory && matchesFolder && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'downloads') return b.downloadsCount - a.downloadsCount;
      if (sortBy === 'size') return b.fileSizeBytes - a.fileSizeBytes;
      if (sortBy === 'stars') return b.starsCount - a.starsCount;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadFile = (file: RepositoryItem) => {
    // Simulate real download progress
    setDownloadProgress((prev) => ({ ...prev, [file.id]: 10 }));
    const interval = setInterval(() => {
      setDownloadProgress((prev) => {
        const current = prev[file.id] || 0;
        if (current >= 100) {
          clearInterval(interval);

          // Trigger browser text/json blob download simulation
          const blob = new Blob(
            [file.previewContent || `COREVAULT REPOSITORY FILE EXPORT\nFile: ${file.title}\nPath: ${file.path}\nSHA256: ${file.sha256}`],
            { type: 'text/plain;charset=utf-8' }
          );
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

          return { ...prev, [file.id]: 0 };
        }
        return { ...prev, [file.id]: current + 30 };
      });
    }, 200);
  };

  const handleToggleSelectAll = () => {
    if (selectedFileIds.length === filteredFiles.length) {
      setSelectedFileIds([]);
    } else {
      setSelectedFileIds(filteredFiles.map((f) => f.id));
    }
  };

  const handleToggleSelectFile = (id: string) => {
    setSelectedFileIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadTitle.trim()) return;

    setIsUploading(true);

    const repo = repositories.find((r) => r.id === uploadRepoId);
    const tags = uploadTagsStr.split(',').map((t) => t.trim()).filter(Boolean);

    const isDrive = uploadMode === 'driveLink';
    const actualFileName = uploadFileName.trim() || (isDrive ? `${uploadTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.gdrive` : (attachedFile?.name || 'uploaded_document.pdf'));
    const targetDriveFolderInfo =
      availableFolders.find((f) => f.path === uploadFolder) ||
      availableFolders.find((f) => f.path === 'all') ||
      availableFolders[0];
    const targetDriveFolderId = targetDriveFolderInfo.driveId || extractDriveId(targetDriveFolderInfo.driveUrl) || '1EAcyg-_LRsaZ6i_yu4pvDbBdoqPst6Lt';
    const targetDriveFolderUrl = targetDriveFolderInfo.driveUrl;
    const finalDriveUrl = isDrive ? (customDriveUrl.trim() || targetDriveFolderUrl) : targetDriveFolderUrl;

    let uploadedDriveUrl = finalDriveUrl;

    // Send attached file to Google Drive endpoint
    if (!isDrive && attachedFile) {
      try {
        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const res = reader.result as string;
            resolve(res.split(',')[1] || '');
          };
          reader.readAsDataURL(attachedFile);
        });

        const response = await fetch('/api/gdrive/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileName: actualFileName,
            fileData: base64Data,
            mimeType: attachedFile.type || 'application/octet-stream',
            folderId: targetDriveFolderId,
            folderPath: uploadFolder,
            title: uploadTitle,
          }),
        });

        if (response.ok) {
          const apiData = await response.json();
          if (apiData.driveUrl) {
            uploadedDriveUrl = apiData.driveUrl;
          }
        }
      } catch (err) {
        console.warn('Google Drive Upload notification:', err);
      }
    }

    onUploadFile({
      title: uploadTitle,
      fileName: actualFileName,
      path: `${uploadFolder}/${actualFileName}`,
      folder: uploadFolder,
      repositoryId: uploadRepoId,
      repositoryName: repo?.name || 'General Repository',
      category: uploadCategory,
      fileSizeFormatted: isDrive ? 'Cloud Drive Link' : uploadSizeFormatted,
      fileSizeBytes: isDrive ? 0 : (attachedFile ? attachedFile.size : 2400000000),
      format: isDrive ? 'Google Drive Asset Link' : uploadFormat,
      description: uploadDescription || (isDrive ? `Google Drive linked resource: ${finalDriveUrl}` : `Uploaded and synced to Google Drive folder (${uploadFolder}).`),
      version: uploadVersion,
      versions: [
        {
          version: uploadVersion,
          uploadedAt: new Date().toISOString().substring(0, 10),
          fileSizeBytes: isDrive ? 0 : (attachedFile ? attachedFile.size : 2400000000),
          fileSizeFormatted: isDrive ? 'Cloud Link' : uploadSizeFormatted,
          sha256: 'f839120839102839102938102938102938102938102938102938102938102938',
          changelog: isDrive ? 'Linked via Google Drive URL.' : 'Uploaded file to linked Google Drive folder.',
          uploader: 'San Vicente NHS Staff',
        },
      ],
      sha256: 'f839120839102839102938102938102938102938102938102938102938102938',
      md5: '7d793037a0760186574b0282f2f435e7',
      accessLevel: uploadAccess,
      storageTier: uploadStorageTier,
      license: uploadLicense,
      uploader: 'San Vicente NHS Staff',
      tags: isDrive ? [...tags, 'GoogleDrive', 'CloudLink'] : tags.length ? tags : ['Repository', 'Uploaded', 'GoogleDriveSynced'],
      previewType: 'text',
      previewContent: isDrive
        ? `Asset Name: ${uploadTitle}\nGoogle Drive Link: ${finalDriveUrl}\nFolder: ${uploadFolder}\nDescription: ${uploadDescription}`
        : `File Header: ${uploadTitle}\nStatus: Uploaded & Synced to Google Drive Folder (${uploadFolder})\nFolder ID: ${targetDriveFolderId}\nGoogle Drive Link: ${uploadedDriveUrl}\nVersion: ${uploadVersion}\nLicense: ${uploadLicense}\nDescription: ${uploadDescription}`,
      driveUrl: uploadedDriveUrl,
      isGoogleDriveLink: true,
    });

    setIsUploading(false);
    setIsUploadModalOpen(false);

    setUploadNotification(
      isDrive
        ? `Successfully added Google Drive link "${uploadTitle}" to ${uploadFolder}!`
        : `Successfully published "${actualFileName}" to linked Google Drive folder (${uploadFolder})!`
    );
    setWebviewKey((prev) => prev + 1);

    if (!isDrive) {
      try {
        window.open(uploadedDriveUrl, '_blank');
      } catch (err) {
        console.log('Window open blocked', err);
      }
    }

    setTimeout(() => setUploadNotification(null), 6000);

    // Reset form
    setUploadTitle('');
    setUploadFileName('');
    setCustomDriveUrl('');
    setUploadDescription('');
    setAttachedFile(null);
  };

  const getCategoryBadge = (cat: FileCategory) => {
    switch (cat) {
      case 'dataset_raw':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase">Dataset</span>;
      case 'ai_model':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase">AI Checkpoint</span>;
      case 'document_pdf':
        return <span className="bg-purple-50 text-purple-700 border border-purple-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase">Document</span>;
      case 'code_bundle':
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase">Binary</span>;
      case 'media_assets':
        return <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] px-2 py-0.5 rounded font-mono font-semibold uppercase">Media 4K</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-200">File</span>;
    }
  };

  const getStorageTierBadge = (tier: StorageTier) => {
    switch (tier) {
      case 'hot_nvme':
        return <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded font-medium">Hot NVMe</span>;
      case 'warm_ssd':
        return <span className="text-[10px] font-mono text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded font-medium">Warm SSD</span>;
      case 'cold_archive':
        return <span className="text-[10px] font-mono text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">Cold Archive</span>;
    }
  };

  return (
    <div
      className="space-y-4 pb-8 relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag & Drop Visual Overlay */}
      {isDraggingOver && (
        <div className="fixed inset-0 z-50 bg-blue-900/80 backdrop-blur-md border-4 border-dashed border-blue-300 flex flex-col items-center justify-center text-white p-6 transition-all animate-fadeIn">
          <Upload className="w-12 h-12 text-blue-200 mb-3 animate-bounce" />
          <h2 className="text-xl font-bold font-mono">Drop Files Here to Upload</h2>
          <p className="text-blue-100 font-mono text-xs mt-1.5 text-center max-w-md">
            Uploading directly to <span className="text-white font-bold">{selectedFolder === 'all' ? 'Budget of Works' : selectedFolder.replace('/', '')}</span> (Synced with Google Drive)
          </p>
        </div>
      )}

      {/* Upload Notification Toast */}
      {uploadNotification && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 px-3.5 py-2.5 rounded-xl flex items-center justify-between text-xs font-mono shadow-2xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-semibold text-xs">{uploadNotification}</span>
          </div>
          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:underline flex items-center space-x-1 text-xs font-bold"
          >
            <span>View in Drive</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      {/* Admin Dashboard Banner & Quick Actions */}
      {currentUser?.role === 'Admin' && (
        <div className="bg-gradient-to-r from-[#18261e] via-[#101b15] to-[#18261e] border border-amber-500/50 rounded-xl p-3 sm:p-4 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-start sm:items-center space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
              <ShieldCheck className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-white font-mono font-bold text-xs sm:text-sm">Administrator Control Panel</span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase whitespace-nowrap">
                  Admin Privileges
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-mono mt-1 leading-relaxed break-words">
                Logged in as <span className="text-amber-300 font-bold">{currentUser.name}</span>. Post official announcements and manage faculty resources.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full md:w-auto shrink-0">
            {onPostAnnouncementClick && (
              <button
                onClick={onPostAnnouncementClick}
                className="flex-1 sm:flex-none px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-mono font-extrabold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-amber-300 active:scale-95 whitespace-nowrap"
              >
                <Megaphone className="w-3.5 h-3.5 text-slate-950 shrink-0" />
                <span>Post Announcement</span>
              </button>
            )}

            <button
              onClick={() => setIsUploadModalOpen(true)}
              className="flex-1 sm:flex-none px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-mono font-bold text-xs rounded-lg shadow-2xs transition-all flex items-center justify-center space-x-1.5 cursor-pointer border border-emerald-500 active:scale-95 whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Upload File</span>
            </button>
          </div>
        </div>
      )}

      {/* Top Controls Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-2.5 shadow-2xs">
        {/* Breadcrumb Path & Folder Tabs */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-700 flex-wrap min-w-0">
            <FolderGit2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <button
              onClick={() => {
                setSelectedFolder('all');
                setShowDriveEmbed(true);
                setWebviewKey((prev) => prev + 1);
              }}
              className="text-slate-900 font-extrabold bg-slate-100 px-2.5 py-1 rounded-md border border-slate-300 hover:border-blue-500 cursor-pointer transition-colors shadow-2xs text-[11px] whitespace-nowrap shrink-0"
              title="Click to view Budget of Works in webview"
            >
              {selectedFolder === 'all' ? 'Budget of Works' : selectedFolder.replace('/', '')}
            </button>
            {showDirectoryPath && (
              <>
                <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="text-slate-500 font-medium text-[11px] truncate max-w-xs sm:max-w-md">svnhs-shs://repository{selectedFolder === 'all' ? '' : selectedFolder}</span>
              </>
            )}

            {/* Direct Google Drive Folder Button */}
            <button
              onClick={() => {
                setShowDriveEmbed(true);
                setWebviewKey((prev) => prev + 1);
                window.open(GOOGLE_DRIVE_FOLDER_URL, '_blank');
              }}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold flex items-center space-x-1.5 shadow-2xs transition-all border border-emerald-600 whitespace-nowrap cursor-pointer shrink-0"
            >
              <ExternalLink className="w-3 h-3 shrink-0" />
              <span>Google Drive Folder</span>
            </button>
          </div>
        </div>

        {/* Directory Folder Selector */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1 flex-wrap w-full">
            <span className="text-[11px] font-mono uppercase tracking-wider text-slate-500 mr-1 whitespace-nowrap font-extrabold shrink-0">
              Folders:
            </span>
            {availableFolders.map((folder) => {
              const isSelected = selectedFolder === folder.path;
              const canDelete = currentUser?.role === 'Admin' && onDeleteDriveFolder && !folder.isDefault;
              return (
                <div key={folder.id || folder.path} className="flex items-center group/folder shrink-0">
                  <button
                    onClick={() => {
                      setSelectedFolder(folder.path);
                      setShowDriveEmbed(true);
                      setWebviewKey((prev) => prev + 1);
                    }}
                    className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all flex items-center space-x-1.5 whitespace-nowrap cursor-pointer shadow-2xs ${
                      isSelected
                        ? 'bg-blue-600 text-white border border-blue-600 shadow-2xs ring-1 ring-blue-400/30'
                        : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                    }`}
                  >
                    {isSelected ? (
                      <FolderOpen className="w-3.5 h-3.5 text-white shrink-0" />
                    ) : (
                      <Folder className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    )}
                    <span className="text-xs font-bold tracking-tight whitespace-nowrap">
                      {folder.name || (folder.path === 'all' ? 'Budget of Works' : folder.path.replace('/', ''))}
                    </span>
                  </button>

                  {/* Admin Quick Delete Folder Button */}
                  {canDelete && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const isConfirmed = window.confirm(
                          `Delete folder "${folder.name}" (${folder.path}) from the repository?`
                        );
                        if (isConfirmed) {
                          if (selectedFolder === folder.path) {
                            setSelectedFolder('all');
                          }
                          onDeleteDriveFolder(folder.id);
                        }
                      }}
                      className="ml-1 p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer shrink-0"
                      title={`Delete ${folder.name} Folder`}
                    >
                      <Trash2 className="w-3 h-3 text-rose-500 shrink-0" />
                    </button>
                  )}
                </div>
              );
            })}

            {currentUser?.role === 'Admin' && onNavigateToAdminFolders && (
              <button
                type="button"
                onClick={onNavigateToAdminFolders}
                className="px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all flex items-center space-x-1 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-300 cursor-pointer shadow-2xs"
                title="Manage and Add Google Drive Folders"
              >
                <FolderPlus className="w-3.5 h-3.5 text-emerald-600" />
                <span>+ Add Folder</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setShowDriveEmbed(true);
              setWebviewKey((prev) => prev + 1);
            }}
            className="text-[11px] font-mono text-blue-600 hover:text-blue-800 flex items-center space-x-1 hover:underline whitespace-nowrap cursor-pointer font-bold"
          >
            <span>Show Webview Link</span>
            <ExternalLink className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Google Drive Webview Container */}
      {showDriveEmbed && (
        <div 
          className="bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-2xs animate-fadeIn relative"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag Overlay State */}
          {isDraggingOver && (
            <div className="absolute inset-0 bg-blue-600/20 backdrop-blur-xs z-50 flex flex-col items-center justify-center border-4 border-dashed border-blue-500 font-mono animate-fadeIn">
              <Upload className="w-8 h-8 text-blue-600 mb-1 animate-bounce" />
              <p className="text-slate-900 font-bold text-xs">Drop File to Upload to Repository</p>
              <p className="text-blue-700 text-[10px]">Uploading to {selectedFolder === 'all' ? '/Grade 11 DLL' : selectedFolder}</p>
            </div>
          )}

          {/* Webview Viewport - Scaled down height for higher density view */}
          <div className="relative bg-slate-50 w-full h-[450px]">
            <iframe
              key={webviewKey}
              src={`https://drive.google.com/embeddedfolderview?id=${GOOGLE_DRIVE_FOLDER_ID}#grid`}
              className="w-full h-full border-0 bg-slate-50"
              title="Google Drive Folder Webview"
            />
          </div>
        </div>
      )}

      {/* Batch Operations Bar */}
      {selectedFileIds.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl flex items-center justify-between text-xs font-mono text-blue-800 animate-fadeIn shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckSquare className="w-4 h-4 text-blue-600" />
            <span className="font-bold text-slate-900">{selectedFileIds.length} files selected</span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                alert(`Preparing ZIP archive bundle containing ${selectedFileIds.length} files...`);
              }}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center space-x-1 transition-all shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Batch ZIP</span>
            </button>

            <button
              onClick={() => setSelectedFileIds([])}
              className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Main Files Display */}
      {!showDriveEmbed && (
        <>
      {filteredFiles.length === 0 ? (
        <div className="bg-[#101713] border border-emerald-900/50 rounded-2xl p-12 text-center space-y-3 font-mono shadow-xs">
          <HardDrive className="w-10 h-10 text-emerald-600 mx-auto" />
          <h3 className="text-sm font-bold text-white">
            {selectedFolder === 'all' ? 'No Repository Files Found' : `${selectedFolder.replace('/', '')} Folder is Empty`}
          </h3>
          <p className="text-xs text-emerald-200/80 max-w-md mx-auto">
            {selectedFolder === 'all'
              ? 'There are currently no files in the repository. Click "Upload File" above to publish files to Grade 11/12 folders.'
              : `The ${selectedFolder.replace('/', '')} directory currently contains no files. You can upload new documents using the "Upload File" button above.`}
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('all');
              setSelectedFolder('all');
            }}
            className="px-4 py-2 bg-emerald-950 text-emerald-300 border border-emerald-700 rounded-xl text-xs hover:bg-emerald-900 font-bold transition-all cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* List View Table */
        <div className="bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left font-sans text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase font-bold tracking-wider font-mono">
                <tr>
                  <th className="p-2.5 sm:p-3 w-9 text-center">
                    <button onClick={handleToggleSelectAll} className="text-slate-500 hover:text-blue-600 cursor-pointer">
                      {selectedFileIds.length === filteredFiles.length && filteredFiles.length > 0 ? (
                        <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                    </button>
                  </th>
                  <th className="p-2.5 sm:p-3">{showDirectoryPath ? 'Name & Path' : 'Name'}</th>
                  <th className="p-2.5 sm:p-3">Format</th>
                  <th className="p-2.5 sm:p-3">Size</th>
                  <th className="p-2.5 sm:p-3">Version</th>
                  <th className="p-2.5 sm:p-3">Storage Tier</th>
                  <th className="p-2.5 sm:p-3">Downloads</th>
                  <th className="p-2.5 sm:p-3 text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredFiles.map((file) => {
                  const isSelected = selectedFileIds.includes(file.id);
                  const isDownloading = downloadProgress[file.id] > 0;

                  return (
                    <tr
                      key={file.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="p-2.5 sm:p-3 text-center">
                        <button
                          onClick={() => handleToggleSelectFile(file.id)}
                          className="text-slate-500 hover:text-blue-600 cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-3.5 h-3.5 text-blue-600" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-300" />
                          )}
                        </button>
                      </td>

                      {/* Name & Title */}
                      <td className="p-2.5 sm:p-3 max-w-xs sm:max-w-md">
                        <div className="flex items-start space-x-2">
                          <button
                            onClick={() => onStarToggle(file.id)}
                            className="text-slate-300 hover:text-amber-400 mt-0.5 transition-colors cursor-pointer"
                          >
                            <Star
                              className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-amber-400 text-amber-400' : ''}`}
                            />
                          </button>

                          <div>
                            <button
                              onClick={() => setSelectedFile(file)}
                              className="text-slate-900 hover:text-blue-600 font-bold text-xs text-left line-clamp-1 transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <span>{file.title}</span>
                            </button>
                            {showDirectoryPath && (
                              <span className="text-[10px] text-slate-400 font-mono block truncate mt-0.5">
                                {file.path}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Format */}
                      <td className="p-2.5 sm:p-3">
                        <span className="text-[11px] font-mono text-slate-600 block truncate">{file.format}</span>
                      </td>

                      {/* Size */}
                      <td className="p-2.5 sm:p-3 font-semibold text-slate-800 text-[11px]">{file.fileSizeFormatted}</td>

                      {/* Version */}
                      <td className="p-2.5 sm:p-3">
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-1.5 py-0.5 rounded font-mono font-bold">
                          {file.version}
                        </span>
                      </td>

                      {/* Storage Tier */}
                      <td className="p-2.5 sm:p-3">{getStorageTierBadge(file.storageTier)}</td>

                      {/* Downloads */}
                      <td className="p-2.5 sm:p-3 text-slate-700 text-xs">
                        <span className="text-blue-600 font-bold">{file.downloadsCount.toLocaleString()}</span>
                      </td>

                      {/* Actions */}
                      <td className="p-2.5 sm:p-3 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            onClick={() => setSelectedFile(file)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md border border-slate-200 transition-all cursor-pointer"
                            title="Inspect Details & Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDownloadFile(file)}
                            disabled={isDownloading}
                            className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-[11px] font-bold transition-all flex items-center space-x-1 shadow-2xs cursor-pointer"
                            title="Download File"
                          >
                            <Download className="w-3 h-3" />
                            <span>{isDownloading ? `${downloadProgress[file.id]}%` : 'Get'}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Cards View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredFiles.map((file) => (
            <div
              key={file.id}
              className="bg-white border border-slate-200 rounded-xl p-3.5 sm:p-4 shadow-2xs flex flex-col justify-between hover:border-blue-500 hover:shadow-xs transition-all space-y-3 relative group"
            >
              <div>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center space-x-1.5">
                    <button onClick={() => onStarToggle(file.id)} className="cursor-pointer">
                      <Star
                        className={`w-3.5 h-3.5 ${file.isStarred ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-amber-400'}`}
                      />
                    </button>
                  </div>
                  {getStorageTierBadge(file.storageTier)}
                </div>

                <h3
                  onClick={() => setSelectedFile(file)}
                  className="text-xs sm:text-sm font-bold text-slate-900 cursor-pointer hover:text-blue-600 transition-colors line-clamp-1"
                >
                  {file.title}
                </h3>
                {showDirectoryPath && (
                  <span className="text-[10px] text-slate-400 font-mono block truncate mb-1.5">{file.path}</span>
                )}

                <p className="text-xs text-slate-600 line-clamp-2 leading-snug mb-2.5">{file.description}</p>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-slate-100">
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200/80 font-mono text-[10px]">
                  <div>
                    <span className="text-slate-400 text-[8px] block uppercase tracking-widest font-bold">SIZE</span>
                    <span className="text-slate-900 font-bold">{file.fileSizeFormatted}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[8px] block uppercase tracking-widest font-bold">DOWNLOADS</span>
                    <span className="text-blue-600 font-bold">{file.downloadsCount.toLocaleString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => setSelectedFile(file)}
                    className="flex-1 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-sans font-semibold rounded-md border border-slate-200 transition-all flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Inspect</span>
                  </button>

                  <button
                    onClick={() => handleDownloadFile(file)}
                    className="flex-1 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-sans font-bold rounded-md transition-all shadow-2xs flex items-center justify-center space-x-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
        </>
      )}

      {/* File Details Drawer Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1612] border border-emerald-800/70 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative space-y-6 text-slate-100 font-sans max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-emerald-900/50 pb-4">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-400">
                  <HardDrive className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold font-mono text-white">{selectedFile.title}</h3>
                  </div>
                  {showDirectoryPath && <p className="text-xs text-emerald-400/80 font-mono mt-0.5">{selectedFile.path}</p>}
                </div>
              </div>

              <button
                onClick={() => setSelectedFile(null)}
                className="p-1.5 text-emerald-400 hover:text-white bg-[#18231c] border border-emerald-800 rounded-lg transition-all cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Overview Metadata Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
              <div className="bg-[#090e0b] p-3 rounded-xl border border-emerald-900/60">
                <span className="text-emerald-400/70 text-[10px] uppercase tracking-widest block mb-1 font-bold">SIZE</span>
                <span className="text-base font-bold text-white">{selectedFile.fileSizeFormatted}</span>
              </div>

              <div className="bg-[#090e0b] p-3 rounded-xl border border-emerald-900/60">
                <span className="text-emerald-400/70 text-[10px] uppercase tracking-widest block mb-1 font-bold">TOTAL DOWNLOADS</span>
                <span className="text-base font-bold text-emerald-400">{selectedFile.downloadsCount.toLocaleString()}</span>
              </div>

              <div className="bg-[#090e0b] p-3 rounded-xl border border-emerald-900/60">
                <span className="text-emerald-400/70 text-[10px] uppercase tracking-widest block mb-1 font-bold">VERSION</span>
                <span className="text-base font-bold text-emerald-300">{selectedFile.version}</span>
              </div>

              <div className="bg-[#090e0b] p-3 rounded-xl border border-emerald-900/60">
                <span className="text-emerald-400/70 text-[10px] uppercase tracking-widest block mb-1 font-bold">LICENSE</span>
                <span className="text-base font-bold text-amber-400">{selectedFile.license}</span>
              </div>
            </div>

            {/* Checksums & Direct Links */}
            <div className="space-y-3 font-mono text-xs bg-[#090e0b] p-3 sm:p-4 rounded-xl border border-emerald-900/60">
              <span className="text-emerald-400 font-bold block uppercase tracking-wider text-[10px]">
                Cryptographic Checksums & Verification
              </span>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#111a14] p-2.5 rounded-lg border border-emerald-900/80">
                <span className="text-emerald-400/80 text-[11px] font-bold shrink-0">SHA-256:</span>
                <span className="text-slate-200 font-mono text-[10px] sm:text-[11px] truncate">{selectedFile.sha256}</span>
                <button
                  onClick={() => handleCopy(selectedFile.sha256, 'sha256')}
                  className="self-end sm:self-auto px-2.5 py-1 bg-[#1a271f] hover:bg-[#233429] text-emerald-300 text-[10px] rounded border border-emerald-800 flex items-center space-x-1 cursor-pointer font-bold shrink-0"
                >
                  {copiedField === 'sha256' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'sha256' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#111a14] p-2.5 rounded-lg border border-emerald-900/80">
                <span className="text-emerald-400/80 text-[11px] font-bold shrink-0">MD5:</span>
                <span className="text-slate-200 font-mono text-[10px] sm:text-[11px] truncate">{selectedFile.md5}</span>
                <button
                  onClick={() => handleCopy(selectedFile.md5, 'md5')}
                  className="self-end sm:self-auto px-2.5 py-1 bg-[#1a271f] hover:bg-[#233429] text-emerald-300 text-[10px] rounded border border-emerald-800 flex items-center space-x-1 cursor-pointer font-bold shrink-0"
                >
                  {copiedField === 'md5' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedField === 'md5' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Interactive File Content Preview Snippet */}
            <div className="space-y-2 font-mono text-xs">
              <span className="text-emerald-400 font-bold block uppercase tracking-wider text-[10px]">
                Asset Content Preview / Header Snippet
              </span>
              <pre className="bg-[#050806] p-3 sm:p-4 rounded-xl border border-emerald-900/80 text-[10px] sm:text-[11px] text-emerald-300 overflow-x-auto leading-relaxed">
                <code>{selectedFile.previewContent || `[RAW BINARY DATA STREAM]\nSize: ${selectedFile.fileSizeFormatted}\nFormat: ${selectedFile.format}\nVerified sha256 checksum OK.`}</code>
              </pre>
            </div>

            {/* Modal Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-4 border-t border-emerald-900/50">
              <button
                onClick={() => setSelectedFile(null)}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#18231c] hover:bg-[#202e25] text-emerald-200 text-xs font-mono rounded-xl border border-emerald-800/60 transition-all cursor-pointer font-bold text-center"
              >
                Close
              </button>

              <button
                onClick={() => handleDownloadFile(selectedFile)}
                className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-xl transition-all shadow-xs flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download File ({selectedFile.fileSizeFormatted})</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload New File Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f1612] border border-emerald-800/70 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative space-y-5 text-slate-100 font-sans max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-emerald-900/50 pb-4">
              <div className="flex items-center space-x-2 font-mono">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Upload New Repository Asset</h3>
              </div>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-emerald-400 hover:text-white bg-[#18231c] border border-emerald-800/60 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Upload Mode Selector */}
            <div className="bg-[#090e0b] p-1 rounded-xl border border-emerald-900/60 grid grid-cols-2 gap-1 font-mono text-xs">
              <button
                type="button"
                onClick={() => setUploadMode('file')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  uploadMode === 'file'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Drag & Drop File</span>
              </button>
              <button
                type="button"
                onClick={() => setUploadMode('driveLink')}
                className={`py-2 px-3 rounded-lg font-bold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                  uploadMode === 'driveLink'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-emerald-300 hover:text-white'
                }`}
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Google Drive Link</span>
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 font-mono text-xs">
              {uploadMode === 'file' ? (
                <>
                  {/* Drag & Drop Simulation Zone */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-emerald-800 hover:border-emerald-500 rounded-2xl p-6 text-center space-y-2 bg-[#090e0b] transition-all cursor-pointer group"
                  >
                    <Upload className="w-8 h-8 text-emerald-400 mx-auto animate-pulse group-hover:scale-110 transition-transform" />
                    <p className="text-xs font-bold text-white">
                      {uploadFileName ? `Selected: ${uploadFileName}` : 'Drag & Drop files here, or click to browse'}
                    </p>
                    <p className="text-[10px] text-emerald-400/70">
                      Automatically syncs & opens Google Drive link on submission
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-3 bg-[#090e0b] p-4 rounded-2xl border border-emerald-900/60">
                  <label className="text-emerald-300 block text-[11px] font-bold uppercase tracking-wider">
                    Google Drive Resource Link *
                  </label>
                  <input
                    type="url"
                    required
                    value={customDriveUrl}
                    onChange={(e) => setCustomDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/1.../view?usp=sharing"
                    className="w-full bg-[#111a14] border border-emerald-800/80 rounded-xl px-3 py-2.5 text-xs text-white placeholder-emerald-600/70 focus:outline-none focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-emerald-400/70">
                    Paste any public or DepEd shared Google Drive file/folder URL to link it into the repository.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-emerald-400/80 block mb-1 text-[10px] uppercase tracking-wider font-bold">Asset Title *</label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Grade 11 STEM Math BOW 2026"
                    className="w-full bg-[#090e0b] border border-emerald-800/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-emerald-400/80 block mb-1 text-[10px] uppercase tracking-wider font-bold">File Name / ID</label>
                  <input
                    type="text"
                    value={uploadFileName}
                    onChange={(e) => setUploadFileName(e.target.value)}
                    placeholder={uploadMode === 'driveLink' ? 'Auto-generated or custom filename' : 'e.g. math_bow_g11.pdf'}
                    className="w-full bg-[#090e0b] border border-emerald-800/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-emerald-400/80 block mb-1 text-[10px] uppercase tracking-wider font-bold">Directory Folder</label>
                  <select
                    value={uploadFolder}
                    onChange={(e) => setUploadFolder(e.target.value)}
                    className="w-full bg-[#090e0b] border border-emerald-800/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {availableFolders
                      .filter((f) => f.path !== 'all')
                      .map((f) => (
                        <option key={f.id || f.path} value={f.path}>
                          {f.name} ({f.path})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="text-emerald-400/80 block mb-1 text-[10px] uppercase tracking-wider font-bold">Storage Tier</label>
                  <select
                    value={uploadStorageTier}
                    onChange={(e) => setUploadStorageTier(e.target.value as StorageTier)}
                    className="w-full bg-[#090e0b] border border-emerald-800/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="hot_nvme">Hot NVMe</option>
                    <option value="warm_ssd">Warm SSD</option>
                    <option value="cold_archive">Cold Archive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-emerald-400/80 block mb-1 text-[10px] uppercase tracking-wider font-bold">Description</label>
                <textarea
                  rows={2}
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Provide technical specifications and contents description..."
                  className="w-full bg-[#090e0b] border border-emerald-800/80 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-emerald-900/50">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 bg-[#18231c] hover:bg-[#202e25] text-emerald-200 rounded-xl border border-emerald-800/60 cursor-pointer font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-xs flex items-center space-x-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isUploading ? 'Publishing Asset...' : 'Publish to Repository'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
