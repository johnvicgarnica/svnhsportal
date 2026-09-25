import React, { useState, useEffect } from 'react';
import {
  RepositoryItem,
  RepositoryCollection,
  StorageTelemetry,
  ApiAccessKey,
  FileCategory,
  AccessLevel,
  StorageTier,
  UserProfile,
  Announcement,
  DriveFolder,
  FacultyFolder,
  FacultyPersonalFile,
  SchoolPermanentFolder,
} from './types';
import {
  INITIAL_FILES,
  INITIAL_REPOSITORIES,
  INITIAL_TELEMETRY,
  INITIAL_API_KEYS,
  INITIAL_ANNOUNCEMENTS,
  INITIAL_DRIVE_FOLDERS,
} from './mockData';
import { Header } from './components/Header';
import { RepositoryExplorer } from './components/RepositoryExplorer';
import { RepositoriesView } from './components/RepositoriesView';
import { StorageTelemetryDashboard } from './components/StorageTelemetryDashboard';
import { ApiKeysAndCliView } from './components/ApiKeysAndCliView';
import { AiCopilot } from './components/AiCopilot';
import { AnnouncementsView } from './components/AnnouncementsView';
import { AdminDashboardView } from './components/AdminDashboardView';
import { FacultyPersonalDashboard } from './components/FacultyPersonalDashboard';
import { SubmissionReportView } from './components/SubmissionReportView';
import { LoginScreen } from './components/LoginScreen';
import buildingBg from './assets/images/svnhs_shs_building_1785313106378.jpg';
import {
  subscribeAnnouncements,
  saveAnnouncementToFirestore,
  deleteAnnouncementFromFirestore,
  getStoredAnnouncements,
  seedInitialAnnouncementsIfEmpty,
  subscribeDriveFolders,
  saveDriveFolderToFirestore,
  deleteDriveFolderFromFirestore,
  getStoredDriveFolders,
  seedInitialDriveFoldersIfEmpty,
  subscribeFacultyFolders,
  saveFacultyFolderToFirestore,
  deleteFacultyFolderFromFirestore,
  getStoredFacultyFolders,
  subscribeFacultyFiles,
  saveFacultyFileToFirestore,
  deleteFacultyFileFromFirestore,
  getStoredFacultyFiles,
  seedInitialAdminIfEmpty,
  subscribeSchoolPermanentFolders,
  getStoredSchoolPermanentFolders,
  updateSchoolPermanentFolderInFirestore,
} from './lib/firebase';

export function App() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('svnhs_user_session');
    if (saved) {
      try {
        const user = JSON.parse(saved);
        if (user && user.role === 'Faculty' && user.email) {
          if (user.email.includes('@deped.gov.ph')) {
            user.name = user.email.split('@deped.gov.ph')[0];
          } else if (user.email.includes('@')) {
            user.name = user.email.split('@')[0];
          }
        }
        if (user && user.role === 'Admin') {
          const emailLower = (user.email || '').toLowerCase();
          if (emailLower.includes('johnvic') || emailLower === 'garjohn@deped.gov.ph' || emailLower === 'johnvicgarnica1@gmail.com') {
            user.designation = 'Web Developer';
          } else if (emailLower.includes('marivic') || emailLower.includes('villaluz')) {
            user.designation = 'School Principal';
          } else if (emailLower.includes('norma') || emailLower.includes('jabagat')) {
            user.designation = 'Master Teacher';
          } else if (emailLower.includes('coordinator')) {
            user.designation = user.designation || 'Coordinator';
          }
        }
        return user;
      } catch {
        return null;
      }
    }
    return null;
  });

  const [activeTab, setActiveTab] = useState<'files' | 'my-workspace' | 'announcements' | 'admin' | 'submission-report' | 'copilot'>(() => {
    const saved = localStorage.getItem('svnhs_user_session');
    if (saved) {
      try {
        const u = JSON.parse(saved);
        if (u && (u.designation === 'Coordinator' || u.designation?.toLowerCase().includes('coordinator'))) {
          return 'announcements';
        }
        if (u && u.role === 'Faculty') return 'my-workspace';
        if (u && u.role === 'Admin') return 'admin';
      } catch {}
    }
    return 'announcements';
  });
  const [isAdminDemoMode, setIsAdminDemoMode] = useState<boolean>(false);
  const [shouldOpenAnnouncementModal, setShouldOpenAnnouncementModal] = useState<boolean>(false);

  const handlePostAnnouncementClick = () => {
    if (currentUser?.role === 'Admin') {
      setActiveTab('admin');
    } else {
      setActiveTab('announcements');
    }
    setShouldOpenAnnouncementModal(true);
  };

  // Application Data States
  const [files, setFiles] = useState<RepositoryItem[]>(INITIAL_FILES);
  const [repositories, setRepositories] = useState<RepositoryCollection[]>(INITIAL_REPOSITORIES);
  const [telemetryHistory, setTelemetryHistory] = useState<StorageTelemetry[]>(INITIAL_TELEMETRY);
  const [apiKeys, setApiKeys] = useState<ApiAccessKey[]>(INITIAL_API_KEYS);
  const [announcements, setAnnouncements] = useState<Announcement[]>(() => {
    const cached = getStoredAnnouncements();
    return cached.length > 0 ? cached : INITIAL_ANNOUNCEMENTS;
  });

  const [driveFolders, setDriveFolders] = useState<DriveFolder[]>(() => {
    const cached = getStoredDriveFolders();
    return cached.length > 0 ? cached : INITIAL_DRIVE_FOLDERS;
  });

  const [facultyFolders, setFacultyFolders] = useState<FacultyFolder[]>(() => {
    return getStoredFacultyFolders();
  });

  const [facultyFiles, setFacultyFiles] = useState<FacultyPersonalFile[]>(() => {
    return getStoredFacultyFiles();
  });

  // Subscribe to Announcements in Firebase
  useEffect(() => {
    seedInitialAnnouncementsIfEmpty();
    const unsub = subscribeAnnouncements((list) => {
      setAnnouncements(list || []);
    });
    return () => unsub();
  }, []);

  // Subscribe to Google Drive Folders in Firebase
  useEffect(() => {
    seedInitialDriveFoldersIfEmpty();
    seedInitialAdminIfEmpty();
    const unsub = subscribeDriveFolders((list) => {
      setDriveFolders(list || []);
    });
    return () => unsub();
  }, []);

  // Subscribe to Faculty Personal Folders in Firebase
  useEffect(() => {
    const unsub = subscribeFacultyFolders((list) => {
      setFacultyFolders(list || []);
    });
    return () => unsub();
  }, []);

  // Subscribe to Faculty Personal Files in Firebase
  useEffect(() => {
    const unsub = subscribeFacultyFiles((list) => {
      setFacultyFiles(list || []);
    });
    return () => unsub();
  }, []);

  // School Permanent Folders (SCHOOL FORMS & SCHOOL DOCUMENTS)
  const [schoolPermanentFolders, setSchoolPermanentFolders] = useState<SchoolPermanentFolder[]>(() => {
    return getStoredSchoolPermanentFolders();
  });

  useEffect(() => {
    const unsub = subscribeSchoolPermanentFolders((list) => {
      if (list && list.length > 0) {
        setSchoolPermanentFolders(list);
      }
    });
    return () => unsub();
  }, []);

  const handleUpdateSchoolPermanentFolder = async (
    id: 'school-forms' | 'school-documents',
    updates: { driveUrl?: string; description?: string; updatedBy?: string }
  ) => {
    await updateSchoolPermanentFolderInFirestore(id, updates);
  };

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Simulated telemetry stream tick every 4 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryHistory((prev) => {
        const last = prev[prev.length - 1];
        const nextTime = new Date(Date.now());
        const timeLabel = nextTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        const nextEgress = Math.max(15, last.totalEgressGbps + (Math.random() * 4 - 2));
        const nextRequests = Math.max(5000, Math.floor(last.downloadRequestsCount + (Math.random() * 600 - 300)));

        const nextSnapshot: StorageTelemetry = {
          timestamp: nextTime.toISOString(),
          timeLabel,
          totalEgressGbps: parseFloat(nextEgress.toFixed(1)),
          downloadRequestsCount: nextRequests,
          storageUsedGb: last.storageUsedGb,
          storageQuotaGb: 5000,
          hotCacheHitPct: parseFloat(Math.min(99.5, Math.max(88, last.hotCacheHitPct + (Math.random() * 0.8 - 0.4))).toFixed(1)),
          avgLatencyMs: Math.floor(12 + Math.random() * 6),
        };

        const updated = [...prev.slice(1), nextSnapshot];
        return updated;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleStarFileToggle = (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId
          ? {
              ...f,
              isStarred: !f.isStarred,
              starsCount: f.isStarred ? f.starsCount - 1 : f.starsCount + 1,
            }
          : f
      )
    );
  };

  const handleStarRepoToggle = (repoId: string) => {
    setRepositories((prev) =>
      prev.map((r) =>
        r.id === repoId
          ? {
              ...r,
              isStarred: !r.isStarred,
              starsCount: r.isStarred ? r.starsCount - 1 : r.starsCount + 1,
            }
          : r
      )
    );
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const handleUploadFile = (
    newFileData: Omit<RepositoryItem, 'id' | 'downloadsCount' | 'activeStreams' | 'starsCount' | 'isStarred' | 'updatedAt'>
  ) => {
    const newFile: RepositoryItem = {
      ...newFileData,
      id: `file-${Date.now()}`,
      downloadsCount: 1,
      activeStreams: 0,
      starsCount: 0,
      isStarred: false,
      updatedAt: new Date().toISOString().substring(0, 10),
    };

    setFiles((prev) => [newFile, ...prev]);

    // Update repository file count & size
    setRepositories((prev) =>
      prev.map((r) =>
        r.id === newFile.repositoryId
          ? {
              ...r,
              fileCount: r.fileCount + 1,
              totalSizeBytes: r.totalSizeBytes + newFile.fileSizeBytes,
              totalSizeFormatted: `${((r.totalSizeBytes + newFile.fileSizeBytes) / 1000000000).toFixed(1)} GB`,
              updatedAt: 'Just now',
            }
          : r
      )
    );
  };

  const handleCreateRepository = (
    newRepoData: Omit<RepositoryCollection, 'id' | 'fileCount' | 'totalSizeBytes' | 'totalSizeFormatted' | 'starsCount' | 'isStarred' | 'createdAt' | 'updatedAt'>
  ) => {
    const newRepo: RepositoryCollection = {
      ...newRepoData,
      id: `repo-${Date.now()}`,
      fileCount: 0,
      totalSizeBytes: 0,
      totalSizeFormatted: '0.0 GB',
      starsCount: 1,
      isStarred: true,
      createdAt: new Date().toISOString().substring(0, 10),
      updatedAt: 'Just now',
    };

    setRepositories((prev) => [newRepo, ...prev]);
  };

  const handleCreateApiKey = (name: string, permissions: ('read' | 'write' | 'admin')[]) => {
    const randomHex = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
    const prefix = `cv_live_${randomHex.substring(0, 4)}`;
    const newKey: ApiAccessKey = {
      id: `key-${Date.now()}`,
      name,
      keyPrefix: prefix,
      fullToken: `${prefix}${randomHex}`,
      permissions,
      createdAt: new Date().toISOString().substring(0, 10),
      lastUsed: 'Just created',
      status: 'active',
    };

    setApiKeys((prev) => [newKey, ...prev]);
  };

  const handleRevokeApiKey = (keyId: string) => {
    setApiKeys((prev) =>
      prev.map((k) => (k.id === keyId ? { ...k, status: 'revoked' } : k))
    );
  };

  const handleSelectRepoForFiles = (repoName: string) => {
    setSearchTerm(repoName);
    setActiveTab('files');
  };

  const handleLogout = () => {
    localStorage.removeItem('svnhs_user_session');
    setCurrentUser(null);
  };

  // Announcement Handlers
  const handleAddAnnouncement = (
    newAnnouncementData: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const today = new Date().toISOString().substring(0, 10);
    const newAnnouncement: Announcement = {
      ...newAnnouncementData,
      id: `ann-${Date.now()}`,
      createdAt: today,
      updatedAt: today,
    };
    setAnnouncements((prev) => [newAnnouncement, ...prev]);
    saveAnnouncementToFirestore(newAnnouncement);
  };

  const handleEditAnnouncement = (id: string, updated: Partial<Announcement>) => {
    setAnnouncements((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, ...updated, updatedAt: new Date().toISOString().substring(0, 10) };
          saveAnnouncementToFirestore(updatedItem);
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleDeleteAnnouncement = (id: string) => {
    setAnnouncements((prev) => prev.filter((item) => item.id !== id));
    deleteAnnouncementFromFirestore(id);
  };

  const handleTogglePinAnnouncement = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const updatedItem = { ...item, isPinned: !item.isPinned };
          saveAnnouncementToFirestore(updatedItem);
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleToggleStatusAnnouncement = (id: string) => {
    setAnnouncements((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === 'published' ? 'draft' : 'published';
          const updatedItem = { ...item, status: nextStatus };
          saveAnnouncementToFirestore(updatedItem);
          return updatedItem;
        }
        return item;
      })
    );
  };

  // Google Drive Folders Handlers
  const handleAddDriveFolder = (
    folderData: Omit<DriveFolder, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    const today = new Date().toISOString().substring(0, 10);
    const newFolder: DriveFolder = {
      ...folderData,
      id: `folder-${Date.now()}`,
      createdAt: today,
      updatedAt: today,
    };
    setDriveFolders((prev) => [...prev, newFolder]);
    saveDriveFolderToFirestore(newFolder);
  };

  const handleEditDriveFolder = (id: string, updated: Partial<DriveFolder>) => {
    setDriveFolders((prev) =>
      prev.map((folder) => {
        if (folder.id === id) {
          const updatedFolder = {
            ...folder,
            ...updated,
            updatedAt: new Date().toISOString().substring(0, 10),
          };
          saveDriveFolderToFirestore(updatedFolder);
          return updatedFolder;
        }
        return folder;
      })
    );
  };

  const handleDeleteDriveFolder = (id: string) => {
    setDriveFolders((prev) => prev.filter((f) => f.id !== id));
    deleteDriveFolderFromFirestore(id);
  };

  // Faculty Personal Folders Handlers
  const handleAddFacultyFolder = (
    folderData: Omit<FacultyFolder, 'id' | 'createdAt' | 'updatedAt' | 'itemCount'>
  ) => {
    const today = new Date().toISOString().substring(0, 10);
    const newFolder: FacultyFolder = {
      ...folderData,
      id: `ffolder-${Date.now()}`,
      itemCount: 0,
      createdAt: today,
      updatedAt: today,
    };
    setFacultyFolders((prev) => [newFolder, ...prev]);
    saveFacultyFolderToFirestore(newFolder);
  };

  const handleEditFacultyFolder = (id: string, updated: Partial<FacultyFolder>) => {
    setFacultyFolders((prev) =>
      prev.map((folder) => {
        if (folder.id === id) {
          const updatedFolder: FacultyFolder = {
            ...folder,
            ...updated,
            updatedAt: new Date().toISOString().substring(0, 10),
          };
          saveFacultyFolderToFirestore(updatedFolder);
          return updatedFolder;
        }
        return folder;
      })
    );
  };

  const handleDeleteFacultyFolder = (id: string) => {
    setFacultyFolders((prev) => prev.filter((f) => f.id !== id));
    setFacultyFiles((prev) => prev.filter((f) => f.folderId !== id));
    deleteFacultyFolderFromFirestore(id);
  };

  // Faculty Personal Files Handlers
  const handleAddFacultyFile = (
    fileData: Omit<FacultyPersonalFile, 'id' | 'uploadedAt'>
  ) => {
    const today = new Date().toISOString().substring(0, 10);
    const newFile: FacultyPersonalFile = {
      ...fileData,
      id: `ffile-${Date.now()}`,
      uploadedAt: today,
    };
    setFacultyFiles((prev) => [newFile, ...prev]);
    saveFacultyFileToFirestore(newFile);
  };

  const handleDeleteFacultyFile = (id: string) => {
    setFacultyFiles((prev) => prev.filter((f) => f.id !== id));
    deleteFacultyFileFromFirestore(id);
  };

  // Metrics for Header
  const totalStorageUsedGb = files.reduce((acc, f) => acc + (f.fileSizeBytes / 1000000000), 0);
  const latestTelemetry = telemetryHistory[telemetryHistory.length - 1] || {
    totalEgressGbps: 34.2,
  };
  const publishedAnnouncementsCount = announcements.filter((a) => a.status === 'published').length;

  const isCoordinator =
    currentUser?.designation === 'Coordinator' ||
    (currentUser?.designation?.toLowerCase().includes('coordinator') ?? false);

  // Restrict Coordinator from accessing Submission Report, My Workspace, or Files
  useEffect(() => {
    if (isCoordinator && (activeTab === 'submission-report' || activeTab === 'my-workspace' || activeTab === 'files')) {
      setActiveTab('announcements');
    }
  }, [isCoordinator, activeTab]);

  const handleLogin = (user: UserProfile) => {
    setCurrentUser(user);
    const isCoord =
      user.designation === 'Coordinator' ||
      (user.designation?.toLowerCase().includes('coordinator') ?? false);
    if (isCoord) {
      setActiveTab('announcements');
    } else if (user.role === 'Admin') {
      setActiveTab('admin');
    } else if (user.role === 'Faculty') {
      setActiveTab('my-workspace');
    } else {
      setActiveTab('announcements');
    }
  };

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen text-slate-800 font-sans selection:bg-emerald-500 selection:text-white relative bg-slate-100/90 overflow-x-hidden">
      {/* Background Image Layer with Controlled Opacity */}
      <div 
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat bg-fixed z-0 opacity-25 mix-blend-multiply"
        style={{ backgroundImage: `url(${buildingBg})` }}
      />
      {/* Soft Light Backdrop Tint to preserve high foreground readability */}
      <div className="fixed inset-0 pointer-events-none bg-slate-50/70 backdrop-blur-[0.5px] z-0" />

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalStorageUsedGb={totalStorageUsedGb}
          totalEgressGbps={latestTelemetry.totalEgressGbps}
          totalFilesCount={files.length}
          announcementsCount={publishedAnnouncementsCount}
          onOpenUploadModal={() => setIsUploadModalOpen(true)}
          onPostAnnouncementClick={handlePostAnnouncementClick}
          globalSearchQuery={searchTerm}
          setGlobalSearchQuery={setSearchTerm}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="w-full px-3 sm:px-5 lg:px-6 pt-4 flex-1">
          {activeTab === 'my-workspace' && (
            <FacultyPersonalDashboard
              currentUser={currentUser}
              facultyFolders={facultyFolders}
              facultyFiles={facultyFiles}
              schoolPermanentFolders={schoolPermanentFolders}
              onAddFolder={handleAddFacultyFolder}
              onEditFolder={handleEditFacultyFolder}
              onDeleteFolder={handleDeleteFacultyFolder}
              onAddFile={handleAddFacultyFile}
              onDeleteFile={handleDeleteFacultyFile}
              onNavigateToRepository={() => setActiveTab('files')}
              onNavigateToAdminDashboard={() => setActiveTab('admin')}
            />
          )}

          {activeTab === 'files' && (
            <RepositoryExplorer
              files={files}
              repositories={repositories}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              selectedFolder={selectedFolder}
              setSelectedFolder={setSelectedFolder}
              onStarToggle={handleStarFileToggle}
              onDeleteFile={handleDeleteFile}
              onUploadFile={handleUploadFile}
              isUploadModalOpen={isUploadModalOpen}
              setIsUploadModalOpen={setIsUploadModalOpen}
              currentUser={currentUser}
              onPostAnnouncementClick={handlePostAnnouncementClick}
              driveFolders={driveFolders}
              onNavigateToAdminFolders={() => setActiveTab('admin')}
              onDeleteDriveFolder={handleDeleteDriveFolder}
            />
          )}

          {activeTab === 'announcements' && (
            <AnnouncementsView
              announcements={announcements}
              currentUser={currentUser}
              onAddAnnouncement={handleAddAnnouncement}
              onEditAnnouncement={handleEditAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onTogglePin={handleTogglePinAnnouncement}
              onToggleStatus={handleToggleStatusAnnouncement}
              isAdminDemoMode={isAdminDemoMode}
              setIsAdminDemoMode={setIsAdminDemoMode}
              shouldOpenModal={shouldOpenAnnouncementModal}
              onModalOpened={() => setShouldOpenAnnouncementModal(false)}
            />
          )}

          {activeTab === 'admin' && (
            <AdminDashboardView
              announcements={announcements}
              currentUser={currentUser}
              driveFolders={driveFolders}
              facultyFolders={facultyFolders}
              facultyFiles={facultyFiles}
              schoolPermanentFolders={schoolPermanentFolders}
              onUpdateSchoolPermanentFolder={handleUpdateSchoolPermanentFolder}
              onAddAnnouncement={handleAddAnnouncement}
              onEditAnnouncement={handleEditAnnouncement}
              onDeleteAnnouncement={handleDeleteAnnouncement}
              onTogglePin={handleTogglePinAnnouncement}
              onToggleStatus={handleToggleStatusAnnouncement}
              onAddDriveFolder={handleAddDriveFolder}
              onEditDriveFolder={handleEditDriveFolder}
              onDeleteDriveFolder={handleDeleteDriveFolder}
              onDeleteFacultyFolder={handleDeleteFacultyFolder}
              onDeleteFacultyFile={handleDeleteFacultyFile}
              shouldOpenModal={shouldOpenAnnouncementModal}
              onModalOpened={() => setShouldOpenAnnouncementModal(false)}
            />
          )}

          {activeTab === 'submission-report' && !isCoordinator && (
            <SubmissionReportView
              currentUser={currentUser}
              facultyFolders={facultyFolders}
            />
          )}

          {activeTab === 'copilot' && <AiCopilot files={files} />}
        </main>

        {/* Clean Footer with High-Contrast Text */}
        <footer className="bg-white/95 backdrop-blur-md border-t border-slate-200/80 mt-12 py-5 text-center text-xs font-sans text-slate-600 shadow-2xs relative z-10">
          <p className="font-medium">Department of Education • CARAGA Region • Division of Bislig City</p>
          <p className="mt-1 text-slate-900 font-bold">San Vicente National High School • Official Portal</p>
          <div className="font-mono text-[11px] text-emerald-800 font-bold pt-2 mt-2 border-t border-slate-100 max-w-xs mx-auto">
            <p>Powered by: GARJOHN</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
