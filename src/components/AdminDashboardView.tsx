import React, { useState, useEffect, useMemo } from 'react';
import {
  Announcement,
  AnnouncementPriority,
  AnnouncementTarget,
  AnnouncementStatus,
  UserProfile,
  DriveFolder,
  FacultyFolder,
  FacultyPersonalFile,
  SchoolPermanentFolder,
} from '../types';
import { AdminFacultyFoldersDirectory } from './AdminFacultyFoldersDirectory';
import { GoogleDriveWebview } from './GoogleDriveWebview';
import {
  saveFacultyToFirestore,
  deleteFacultyFromFirestore,
  subscribeFaculty,
  saveAdminsToFirestore,
  deleteAdminFromFirestore,
  subscribeAdmins,
  saveFacultyRequestsToFirestore,
  deleteFacultyRequestFromFirestore,
  subscribeFacultyRequests,
  saveAdminRequestsToFirestore,
  deleteAdminRequestFromFirestore,
  subscribeAdminRequests,
  saveUserPasswordToFirestore,
  deleteUserPasswordFromFirestore,
  subscribeUserPasswords,
  saveSettingToFirestore,
  subscribeSettings,
  getStoredSchoolPermanentFolders,
  subscribeSchoolPermanentFolders,
  updateSchoolPermanentFolderInFirestore,
  INITIAL_SCHOOL_PERMANENT_FOLDERS,
  extractDriveId,
} from '../lib/firebase';
import {
  Megaphone,
  Pin,
  Plus,
  Edit2,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  Info,
  X,
  Key,
  Lock,
  RefreshCw,
  UserPlus,
  CheckCircle2,
  Save,
  ShieldAlert,
  UserCheck,
  UserX,
  Sliders,
  FileText,
  Clock,
  CheckCircle,
  FolderGit2,
  FolderLock,
  Link,
  RotateCcw,
  FileSpreadsheet,
  ExternalLink,
} from 'lucide-react';

interface AdminDashboardViewProps {
  announcements: Announcement[];
  currentUser: UserProfile;
  driveFolders?: DriveFolder[];
  facultyFolders?: FacultyFolder[];
  facultyFiles?: FacultyPersonalFile[];
  schoolPermanentFolders?: SchoolPermanentFolder[];
  onUpdateSchoolPermanentFolder?: (id: 'school-forms' | 'school-documents', updates: { driveUrl?: string; description?: string; updatedBy?: string }) => void;
  onAddAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditAnnouncement: (id: string, updated: Partial<Announcement>) => void;
  onDeleteAnnouncement: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleStatus: (id: string) => void;
  onAddDriveFolder?: (folder: Omit<DriveFolder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditDriveFolder?: (id: string, updated: Partial<DriveFolder>) => void;
  onDeleteDriveFolder?: (id: string) => void;
  onDeleteFacultyFolder?: (id: string) => void;
  onDeleteFacultyFile?: (id: string) => void;
  shouldOpenModal?: boolean;
  onModalOpened?: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({
  announcements,
  currentUser,
  driveFolders = [],
  facultyFolders = [],
  facultyFiles = [],
  schoolPermanentFolders: propPermanentFolders,
  onUpdateSchoolPermanentFolder,
  onAddAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onTogglePin,
  onToggleStatus,
  onAddDriveFolder,
  onEditDriveFolder,
  onDeleteDriveFolder,
  onDeleteFacultyFolder,
  onDeleteFacultyFile,
  shouldOpenModal,
  onModalOpened,
}) => {
  const isAdmin = currentUser.role === 'Admin';

  // Admin Sub-Section Tab ('passwords', 'faculty-folders', 'announcements', or 'school-folders')
  // Default to 'announcements' so passwords page is not exposed by default
  const [adminSubTab, setAdminSubTab] = useState<'passwords' | 'faculty-folders' | 'announcements' | 'school-folders'>('announcements');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('all');

  // School Permanent Folders State (SCHOOL FORMS & SCHOOL DOCUMENTS)
  const [schoolFolders, setSchoolFolders] = useState<SchoolPermanentFolder[]>(() => {
    return propPermanentFolders && propPermanentFolders.length > 0
      ? propPermanentFolders
      : getStoredSchoolPermanentFolders();
  });

  useEffect(() => {
    if (propPermanentFolders && propPermanentFolders.length > 0) {
      setSchoolFolders(propPermanentFolders);
    }
  }, [propPermanentFolders]);

  useEffect(() => {
    const unsub = subscribeSchoolPermanentFolders((list) => {
      if (list && list.length > 0) {
        setSchoolFolders(list);
      }
    });
    return () => unsub();
  }, []);

  const formsPermanentFolder = useMemo(() => {
    return schoolFolders.find((f) => f.id === 'school-forms') || INITIAL_SCHOOL_PERMANENT_FOLDERS[0];
  }, [schoolFolders]);

  const docsPermanentFolder = useMemo(() => {
    return schoolFolders.find((f) => f.id === 'school-documents') || INITIAL_SCHOOL_PERMANENT_FOLDERS[1];
  }, [schoolFolders]);

  const [formsUrlInput, setFormsUrlInput] = useState<string>(formsPermanentFolder.driveUrl || '');
  const [formsDescInput, setFormsDescInput] = useState<string>(formsPermanentFolder.description || '');
  const [isSavingForms, setIsSavingForms] = useState<boolean>(false);
  const [showFormsPreview, setShowFormsPreview] = useState<boolean>(false);

  const [docsUrlInput, setDocsUrlInput] = useState<string>(docsPermanentFolder.driveUrl || '');
  const [docsDescInput, setDocsDescInput] = useState<string>(docsPermanentFolder.description || '');
  const [isSavingDocs, setIsSavingDocs] = useState<boolean>(false);
  const [showDocsPreview, setShowDocsPreview] = useState<boolean>(false);

  useEffect(() => {
    if (formsPermanentFolder) {
      setFormsUrlInput(formsPermanentFolder.driveUrl || '');
      setFormsDescInput(formsPermanentFolder.description || '');
    }
  }, [formsPermanentFolder]);

  useEffect(() => {
    if (docsPermanentFolder) {
      setDocsUrlInput(docsPermanentFolder.driveUrl || '');
      setDocsDescInput(docsPermanentFolder.description || '');
    }
  }, [docsPermanentFolder]);

  const handleSaveFormsLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingForms(true);
    const driveId = extractDriveId(formsUrlInput.trim());
    try {
      if (onUpdateSchoolPermanentFolder) {
        onUpdateSchoolPermanentFolder('school-forms', {
          driveUrl: formsUrlInput.trim(),
          description: formsDescInput.trim(),
          updatedBy: currentUser.name || 'Admin',
        });
      } else {
        await updateSchoolPermanentFolderInFirestore('school-forms', {
          driveUrl: formsUrlInput.trim(),
          description: formsDescInput.trim(),
          driveId: driveId || '',
          updatedBy: currentUser.name || 'Admin',
        });
      }
      showToast('⚡ SCHOOL FORMS embedded Google Drive link saved! Visible immediately in all faculty workspaces.');
    } catch {
      showToast('⚠️ Error updating SCHOOL FORMS link. Please check network.');
    } finally {
      setIsSavingForms(false);
    }
  };

  const handleSaveDocsLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDocs(true);
    const driveId = extractDriveId(docsUrlInput.trim());
    try {
      if (onUpdateSchoolPermanentFolder) {
        onUpdateSchoolPermanentFolder('school-documents', {
          driveUrl: docsUrlInput.trim(),
          description: docsDescInput.trim(),
          updatedBy: currentUser.name || 'Admin',
        });
      } else {
        await updateSchoolPermanentFolderInFirestore('school-documents', {
          driveUrl: docsUrlInput.trim(),
          description: docsDescInput.trim(),
          driveId: driveId || '',
          updatedBy: currentUser.name || 'Admin',
        });
      }
      showToast('⚡ SCHOOL DOCUMENTS embedded Google Drive link saved! Visible immediately in all faculty workspaces.');
    } catch {
      showToast('⚠️ Error updating SCHOOL DOCUMENTS link. Please check network.');
    } finally {
      setIsSavingDocs(false);
    }
  };

  const handleResetFormsDefault = async () => {
    if (window.confirm('Reset SCHOOL FORMS embedded link to official DepEd default?')) {
      const defaultUrl = INITIAL_SCHOOL_PERMANENT_FOLDERS[0].driveUrl;
      const defaultDesc = INITIAL_SCHOOL_PERMANENT_FOLDERS[0].description;
      setFormsUrlInput(defaultUrl);
      setFormsDescInput(defaultDesc);
      await updateSchoolPermanentFolderInFirestore('school-forms', {
        driveUrl: defaultUrl,
        description: defaultDesc,
        driveId: extractDriveId(defaultUrl) || '',
        updatedBy: currentUser.name || 'Admin',
      });
      showToast('⚡ SCHOOL FORMS link reset to default.');
    }
  };

  const handleResetDocsDefault = async () => {
    if (window.confirm('Reset SCHOOL DOCUMENTS embedded link to official DepEd default?')) {
      const defaultUrl = INITIAL_SCHOOL_PERMANENT_FOLDERS[1].driveUrl;
      const defaultDesc = INITIAL_SCHOOL_PERMANENT_FOLDERS[1].description;
      setDocsUrlInput(defaultUrl);
      setDocsDescInput(defaultDesc);
      await updateSchoolPermanentFolderInFirestore('school-documents', {
        driveUrl: defaultUrl,
        description: defaultDesc,
        driveId: extractDriveId(defaultUrl) || '',
        updatedBy: currentUser.name || 'Admin',
      });
      showToast('⚡ SCHOOL DOCUMENTS link reset to default.');
    }
  };

  // Master Faculty Password State
  const [masterPassword, setMasterPassword] = useState<string>('shs304868');
  const [showMasterPassword, setShowMasterPassword] = useState<boolean>(false);
  const [newMasterInput, setNewMasterInput] = useState<string>('');
  const [confirmMasterInput, setConfirmMasterInput] = useState<string>('');
  const [showNewMasterInput, setShowNewMasterInput] = useState<boolean>(false);
  const [masterPasswordError, setMasterPasswordError] = useState<string | null>(null);

  // Master Admin Email & Password State
  const [masterAdminEmail, setMasterAdminEmail] = useState<string>('johnvic.garnica@deped.gov.ph');
  const [inputMasterAdminEmail, setInputMasterAdminEmail] = useState<string>('johnvic.garnica@deped.gov.ph');
  const [masterAdminPassword, setMasterAdminPassword] = useState<string>('garjohn@1995');
  const [showMasterAdminPassword, setShowMasterAdminPassword] = useState<boolean>(false);
  const [newMasterAdminInput, setNewMasterAdminInput] = useState<string>('');
  const [confirmMasterAdminInput, setConfirmMasterAdminInput] = useState<string>('');
  const [showNewMasterAdminInput, setShowNewMasterAdminInput] = useState<boolean>(false);
  const [masterAdminPasswordError, setMasterAdminPasswordError] = useState<string | null>(null);

  // Security Check: Verify if logged-in admin is the Master Admin
  const userEmailClean = (currentUser.email || '').toLowerCase().trim();
  const masterEmailClean = (masterAdminEmail || 'johnvic.garnica@deped.gov.ph').toLowerCase().trim();
  const isMasterAdmin = currentUser.role === 'Admin' && (
    userEmailClean === masterEmailClean ||
    userEmailClean === 'johnvic.garnica@deped.gov.ph' ||
    userEmailClean === 'garjohn@deped.gov.ph' ||
    userEmailClean === 'johnvicgarnica1@gmail.com'
  );
  const isCoordinator =
    currentUser.designation === 'Coordinator' ||
    (currentUser.designation?.toLowerCase().includes('coordinator') ?? false);

  // Restrict Accounts & Passwords tab strictly to Master Admin, and restrict Faculty Folders from Coordinator
  useEffect(() => {
    if (!isMasterAdmin && adminSubTab === 'passwords') {
      setAdminSubTab('announcements');
    }
    if (isCoordinator && (adminSubTab === 'passwords' || adminSubTab === 'faculty-folders')) {
      setAdminSubTab('announcements');
    }
  }, [isMasterAdmin, isCoordinator, adminSubTab]);

  // Modal for adding a new admin account
  const [isAddAdminOpen, setIsAddAdminOpen] = useState<boolean>(false);
  const [newAdminName, setNewAdminName] = useState<string>('');
  const [newAdminEmail, setNewAdminEmail] = useState<string>('');
  const [newAdminDesignation, setNewAdminDesignation] = useState<'School Principal' | 'Master Teacher' | 'Coordinator'>('School Principal');
  const [newAdminPass, setNewAdminPass] = useState<string>('');

  // Custom Faculty Account Passwords Map
  const [customFacultyPasswords, setCustomFacultyPasswords] = useState<Record<string, string>>({});

  // Faculty Directory List
  const [facultyList, setFacultyList] = useState<Array<{ id: string; name: string; email: string; department: string }>>([]);

  // Pending Faculty Registration Requests State
  const [facultyRequests, setFacultyRequests] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      password: string;
      department: string;
      requestedAt: string;
      status: string;
    }>
  >([]);

  // State to reveal requested password in Admin view
  const [revealedReqPasswords, setRevealedReqPasswords] = useState<Record<string, boolean>>({});

  const toggleRevealReqPassword = (id: string) => {
    setRevealedReqPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Pending Admin Registration Requests State
  const [adminRequests, setAdminRequests] = useState<
    Array<{
      id: string;
      name: string;
      email: string;
      password: string;
      designation: string;
      requestedAt: string;
      status: string;
    }>
  >([]);

  // Registered Admin Directory List
  const [adminList, setAdminList] = useState<
    Array<{ id: string; name: string; email: string; designation: string }>
  >([
    {
      id: 'admin-master',
      name: 'John Vic Garnica (Admin)',
      email: 'johnvic.garnica@deped.gov.ph',
      designation: 'Web Developer',
    },
    {
      id: 'admin-marivic',
      name: 'Marivic R. Villaluz',
      email: 'marivic.villaluz@deped.gov.ph',
      designation: 'School Principal',
    },
    {
      id: 'admin-norma',
      name: 'Norma Jabagat',
      email: 'norma.jabagat@deped.gov.ph',
      designation: 'Master Teacher',
    },
  ]);

  // Custom Admin Passwords Map
  const [adminPasswords, setAdminPasswords] = useState<Record<string, string>>({});

  // State to reveal requested password in Admin view
  const [revealedAdminReqPasswords, setRevealedAdminReqPasswords] = useState<Record<string, boolean>>({});

  const toggleRevealAdminReqPassword = (id: string) => {
    setRevealedAdminReqPasswords((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Modal for editing an individual faculty password
  const [editingFaculty, setEditingFaculty] = useState<{ name: string; email: string } | null>(null);
  const [individualPasswordInput, setIndividualPasswordInput] = useState<string>('');
  const [showIndividualPassword, setShowIndividualPassword] = useState<boolean>(false);

  // Modal for adding a new faculty member
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState<boolean>(false);
  const [newFacultyName, setNewFacultyName] = useState<string>('');
  const [newFacultyEmail, setNewFacultyEmail] = useState<string>('');
  const [newFacultyDepartment, setNewFacultyDepartment] = useState<'Junior High School Department' | 'Senior High School Department'>('Senior High School Department');
  const [newFacultyPass, setNewFacultyPass] = useState<string>('');
  const [facultyDeptFilter, setFacultyDeptFilter] = useState<string>('all');

  // Live Password Test Sandbox
  const [testEmail, setTestEmail] = useState<string>('');
  const [testPassword, setTestPassword] = useState<string>('');
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Real-time Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Real-Time Firebase Subscriptions
  useEffect(() => {
    const unsubFaculty = subscribeFaculty((list) => {
      setFacultyList(list || []);
    });

    const unsubAdmins = subscribeAdmins((list) => {
      setAdminList(list || []);
    });

    const unsubFacultyReq = subscribeFacultyRequests((requests) => {
      setFacultyRequests(requests || []);
    });

    const unsubAdminReq = subscribeAdminRequests((requests) => {
      setAdminRequests(requests || []);
    });

    const unsubPasswords = subscribeUserPasswords(({ facultyMap, adminMap }) => {
      setCustomFacultyPasswords(facultyMap || {});
      setAdminPasswords(adminMap || {});
    });

    const unsubSettings = subscribeSettings((settings) => {
      if (settings.svnhs_faculty_password) {
        setMasterPassword(settings.svnhs_faculty_password);
      }
      if (settings.svnhs_admin_password) {
        setMasterAdminPassword(settings.svnhs_admin_password);
      }
      if (settings.svnhs_admin_email) {
        setMasterAdminEmail(settings.svnhs_admin_email);
        setInputMasterAdminEmail(settings.svnhs_admin_email);
      }
    });

    return () => {
      unsubFaculty();
      unsubAdmins();
      unsubFacultyReq();
      unsubAdminReq();
      unsubPasswords();
      unsubSettings();
    };
  }, []);

  // Handlers for Faculty Requests
  const handleAcceptRequest = (req: { id: string; name: string; email: string; password: string; department?: string }) => {
    const cleanEmail = req.email.toLowerCase();

    const newMember = {
      id: `f-${Date.now()}`,
      name: req.name,
      email: cleanEmail,
      department: req.department || 'Senior High School Department',
    };

    const updatedDir = [...facultyList, newMember];
    setFacultyList(updatedDir);
    saveFacultyToFirestore(updatedDir);

    if (req.password) {
      const updatedMap = { ...customFacultyPasswords, [cleanEmail]: req.password };
      setCustomFacultyPasswords(updatedMap);
      saveUserPasswordToFirestore(cleanEmail, req.password, 'Faculty');
    }

    const updatedRequests = facultyRequests.filter((r) => r.id !== req.id && r.email.toLowerCase() !== cleanEmail);
    setFacultyRequests(updatedRequests);
    deleteFacultyRequestFromFirestore(req.id);

    showToast(`⚡ Faculty Account ACCEPTED! "${req.name}" (${cleanEmail}) [${newMember.department}] is now registered and saved to Firebase.`);
  };

  const handleDenyRequest = (id: string, name: string, email: string) => {
    if (window.confirm(`Are you sure you want to DENY and delete the registration request for "${name}" (${email})?`)) {
      const updatedRequests = facultyRequests.filter((r) => r.id !== id);
      setFacultyRequests(updatedRequests);
      deleteFacultyRequestFromFirestore(id);

      showToast(`Faculty registration request for "${name}" (${email}) DENIED.`);
    }
  };

  // Handlers for Admin Requests
  const handleAcceptAdminRequest = (req: {
    id: string;
    name: string;
    email: string;
    password: string;
    designation?: string;
  }) => {
    const cleanEmail = req.email.toLowerCase();

    const newAdmin = {
      id: `admin-${Date.now()}`,
      name: req.name,
      email: cleanEmail,
      designation: req.designation || 'School Administrator',
    };

    const updatedDir = [...adminList, newAdmin];
    setAdminList(updatedDir);
    saveAdminsToFirestore(updatedDir);

    if (req.password) {
      const updatedMap = { ...adminPasswords, [cleanEmail]: req.password };
      setAdminPasswords(updatedMap);
      saveUserPasswordToFirestore(cleanEmail, req.password, 'Admin');
    }

    const updatedRequests = adminRequests.filter((r) => r.id !== req.id && r.email.toLowerCase() !== cleanEmail);
    setAdminRequests(updatedRequests);
    deleteAdminRequestFromFirestore(req.id);

    showToast(`⚡ Admin Account ACCEPTED! "${req.name}" (${cleanEmail}) is now an authorized Administrator and saved to Firebase.`);
  };

  const handleDenyAdminRequest = (id: string, name: string, email: string) => {
    if (window.confirm(`Are you sure you want to DENY and delete the admin application for "${name}" (${email})?`)) {
      const updatedRequests = adminRequests.filter((r) => r.id !== id);
      setAdminRequests(updatedRequests);
      deleteAdminRequestFromFirestore(id);

      showToast(`Admin registration request for "${name}" (${email}) DENIED and removed.`);
    }
  };

  const handleDeleteAdmin = (id: string, name: string, email: string) => {
    const cleanEmail = email.toLowerCase();
    const currentMasterEmail = masterAdminEmail.toLowerCase();
    if (cleanEmail === currentMasterEmail || cleanEmail === 'johnvic.garnica@deped.gov.ph') {
      alert(`Action Restricted: Master Admin account (${email}) cannot be deleted.`);
      return;
    }

    if (window.confirm(`Are you sure you want to REVOKE and DELETE the admin account for "${name}" (${email})?`)) {
      const updatedDir = adminList.filter((a) => a.id !== id && a.email.toLowerCase() !== cleanEmail);
      setAdminList(updatedDir);
      deleteAdminFromFirestore(cleanEmail);

      if (adminPasswords[cleanEmail]) {
        const updatedMap = { ...adminPasswords };
        delete updatedMap[cleanEmail];
        setAdminPasswords(updatedMap);
        deleteUserPasswordFromFirestore(cleanEmail, 'Admin');
      }

      showToast(`⚡ Admin account "${name}" (${cleanEmail}) has been deleted.`);
    }
  };

  // Handler: Update Admin Designation / Title
  const handleUpdateAdminDesignation = (id: string, designation: string) => {
    if (!isMasterAdmin) {
      alert('Security Restriction: Only the Master Admin can update admin titles.');
      return;
    }
    const updated = adminList.map((a) => (a.id === id ? { ...a, designation } : a));
    setAdminList(updated);
    saveAdminsToFirestore(updated);
    showToast(`⚡ Updated admin title to "${designation}" in real time!`);
  };

  // Handler: Add New Administrator Directly
  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) {
      alert('Security Restriction: Only the Master Admin can register administrators.');
      return;
    }
    if (!newAdminName.trim() || !newAdminEmail.trim()) return;

    let cleanEmail = newAdminEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith('@deped.gov.ph')) {
      cleanEmail += '@deped.gov.ph';
    }

    const newAdmin = {
      id: `admin-${Date.now()}`,
      name: newAdminName.trim(),
      email: cleanEmail,
      designation: newAdminDesignation,
    };

    const updatedDir = [...adminList, newAdmin];
    setAdminList(updatedDir);
    saveAdminsToFirestore(updatedDir);

    if (newAdminPass.trim()) {
      const updatedMap = { ...adminPasswords, [cleanEmail]: newAdminPass.trim() };
      setAdminPasswords(updatedMap);
      saveUserPasswordToFirestore(cleanEmail, newAdminPass.trim(), 'Admin');
    }

    setIsAddAdminOpen(false);
    setNewAdminName('');
    setNewAdminEmail('');
    setNewAdminDesignation('School Principal');
    setNewAdminPass('');
    showToast(`⚡ Administrator "${newAdmin.name}" (${cleanEmail}) [${newAdminDesignation}] registered in real time!`);
  };

  // Handler: Update Master Admin Credentials
  const handleUpdateMasterAdminCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) {
      alert('Security Restriction: Only the Master Admin is authorized to update Master Admin credentials.');
      return;
    }
    setMasterAdminPasswordError(null);

    const cleanEmail = inputMasterAdminEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setMasterAdminPasswordError('Please enter a valid master admin email address.');
      return;
    }

    if (!cleanEmail.endsWith('@deped.gov.ph')) {
      setMasterAdminPasswordError('Master admin email must be an official DepEd email (@deped.gov.ph).');
      return;
    }

    let updatedMsg = [];

    if (cleanEmail !== masterAdminEmail) {
      setMasterAdminEmail(cleanEmail);
      saveSettingToFirestore('svnhs_admin_email', cleanEmail);
      updatedMsg.push(`Email (${cleanEmail})`);
    }

    const cleanPass = newMasterAdminInput.trim();
    if (cleanPass) {
      if (cleanPass !== confirmMasterAdminInput.trim()) {
        setMasterAdminPasswordError('Passwords do not match. Please re-enter.');
        return;
      }
      if (cleanPass.length < 5) {
        setMasterAdminPasswordError('Password must be at least 5 characters.');
        return;
      }

      setMasterAdminPassword(cleanPass);
      saveSettingToFirestore('svnhs_admin_password', cleanPass);
      setNewMasterAdminInput('');
      setConfirmMasterAdminInput('');
      updatedMsg.push('Password');
    }

    if (updatedMsg.length === 0) {
      showToast('No changes detected for Master Admin Credentials.');
      return;
    }

    showToast(`⚡ Master Admin ${updatedMsg.join(' & ')} updated in Firebase & live state!`);
  };

  // Handler: Update Master Faculty Password
  const handleUpdateMasterPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) {
      alert('Security Restriction: Only the Master Admin is authorized to update the Master Faculty Password.');
      return;
    }
    setMasterPasswordError(null);
    const cleanPass = newMasterInput.trim();
    if (!cleanPass) {
      setMasterPasswordError('Please enter a new master password.');
      return;
    }
    if (cleanPass !== confirmMasterInput.trim()) {
      setMasterPasswordError('Passwords do not match. Please re-enter.');
      return;
    }
    if (cleanPass.length < 5) {
      setMasterPasswordError('Password must be at least 5 characters.');
      return;
    }

    setMasterPassword(cleanPass);
    saveSettingToFirestore('svnhs_faculty_password', cleanPass);
    setNewMasterInput('');
    setConfirmMasterInput('');
    showToast(`⚡ Master Faculty Password changed to "${cleanPass}" in real time!`);
  };

  // Handler: Reset Master Password to default
  const handleResetMasterPassword = () => {
    if (!isMasterAdmin) {
      alert('Security Restriction: Only the Master Admin is authorized to reset the Master Password.');
      return;
    }
    if (window.confirm('Reset Master Faculty Password to default DepEd password (shs304868)?')) {
      setMasterPassword('shs304868');
      saveSettingToFirestore('svnhs_faculty_password', 'shs304868');
      setNewMasterInput('');
      setConfirmMasterInput('');
      showToast('⚡ Master Faculty Password reset to default "shs304868" in real time.');
    }
  };

  // Handler: Save Individual Faculty Password
  const handleSaveIndividualPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMasterAdmin) {
      alert('Security Restriction: Only the Master Admin is authorized to set custom faculty passwords.');
      return;
    }
    if (!editingFaculty || !individualPasswordInput.trim()) return;

    const emailKey = editingFaculty.email.toLowerCase();
    const cleanPass = individualPasswordInput.trim();
    const updatedMap = { ...customFacultyPasswords, [emailKey]: cleanPass };

    setCustomFacultyPasswords(updatedMap);
    saveUserPasswordToFirestore(emailKey, cleanPass, 'Faculty');
    setEditingFaculty(null);
    setIndividualPasswordInput('');
    showToast(`⚡ Custom password set for ${editingFaculty.name} (${emailKey}) in real time!`);
  };

  // Handler: Reset Individual Faculty Password
  const handleResetIndividualPassword = (email: string, name: string) => {
    if (!isMasterAdmin) {
      alert('Security Restriction: Only the Master Admin is authorized to reset faculty passwords.');
      return;
    }
    const emailKey = email.toLowerCase();
    const updatedMap = { ...customFacultyPasswords };
    delete updatedMap[emailKey];

    setCustomFacultyPasswords(updatedMap);
    deleteUserPasswordFromFirestore(emailKey, 'Faculty');
    showToast(`⚡ Password for ${name} reset to Master Password in real time.`);
  };

  // Handler: Delete Faculty Account
  const handleDeleteFaculty = (id: string, name: string, email: string) => {
    if (!isMasterAdmin) {
      alert('Security Restriction: Only the Master Admin can delete faculty accounts.');
      return;
    }
    if (window.confirm(`Are you sure you want to delete faculty account "${name}" (${email})?`)) {
      const updatedDir = facultyList.filter((f) => f.id !== id);
      setFacultyList(updatedDir);
      deleteFacultyFromFirestore(email);

      const emailKey = email.toLowerCase();
      if (customFacultyPasswords[emailKey]) {
        const updatedMap = { ...customFacultyPasswords };
        delete updatedMap[emailKey];

        setCustomFacultyPasswords(updatedMap);
        deleteUserPasswordFromFirestore(emailKey, 'Faculty');
      }

      showToast(`⚡ Faculty account "${name}" deleted.`);
    }
  };

  // Handler: Add New Faculty Account
  const handleAddFaculty = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFacultyName.trim() || !newFacultyEmail.trim()) return;

    let cleanEmail = newFacultyEmail.trim().toLowerCase();
    if (!cleanEmail.endsWith('@deped.gov.ph')) {
      cleanEmail += '@deped.gov.ph';
    }

    const newMember = {
      id: `f-${Date.now()}`,
      name: newFacultyName.trim(),
      email: cleanEmail,
      department: newFacultyDepartment,
    };

    const updatedDir = [...facultyList, newMember];
    setFacultyList(updatedDir);
    saveFacultyToFirestore(updatedDir);

    if (newFacultyPass.trim()) {
      const updatedMap = { ...customFacultyPasswords, [cleanEmail]: newFacultyPass.trim() };
      setCustomFacultyPasswords(updatedMap);
      saveUserPasswordToFirestore(cleanEmail, newFacultyPass.trim(), 'Faculty');
    }

    setIsAddFacultyOpen(false);
    setNewFacultyName('');
    setNewFacultyEmail('');
    setNewFacultyDepartment('Senior High School Department');
    setNewFacultyPass('');
    showToast(`⚡ Faculty account ${cleanEmail} (${newFacultyDepartment}) created & password active in real time!`);
  };

  // Handler: Live Password Tester Sandbox
  const handleTestCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = testEmail.trim().toLowerCase();
    const customPass = customFacultyPasswords[cleanEmail];
    const expectedPass = customPass || masterPassword;

    if (testPassword.trim() === expectedPass) {
      setTestResult({
        success: true,
        message: `✅ AUTHENTICATION SUCCESSFUL! "${cleanEmail}" logged in successfully using active credentials.`,
      });
    } else {
      setTestResult({
        success: false,
        message: `❌ AUTHENTICATION FAILED! Provided credentials do not match records for "${cleanEmail}".`,
      });
    }
  };

  // Modal for Announcement Editing/Creating inside Admin Dashboard
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('important');
  const [formTarget, setFormTarget] = useState<AnnouncementTarget>('All SHS Faculty');
  const [formStatus, setFormStatus] = useState<AnnouncementStatus>('published');
  const [formIsPinned, setFormIsPinned] = useState<boolean>(false);
  const [formAttachmentName, setFormAttachmentName] = useState<string>('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState<string>('');

  const openCreateModal = () => {
    setEditingId(null);
    setFormTitle('');
    setFormContent('');
    setFormPriority('important');
    setFormTarget('All SHS Faculty');
    setFormStatus('published');
    setFormIsPinned(false);
    setFormAttachmentName('');
    setFormAttachmentUrl('');
    setIsModalOpen(true);
  };

  useEffect(() => {
    if (shouldOpenModal) {
      openCreateModal();
      onModalOpened?.();
    }
  }, [shouldOpenModal, onModalOpened]);

  const openEditModal = (item: Announcement) => {
    setEditingId(item.id);
    setFormTitle(item.title);
    setFormContent(item.content);
    setFormPriority(item.priority);
    setFormTarget(item.targetAudience);
    setFormStatus(item.status);
    setFormIsPinned(item.isPinned);
    setFormAttachmentName(item.attachmentName || '');
    setFormAttachmentUrl(item.attachmentUrl || '');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formContent.trim()) return;

    if (editingId) {
      onEditAnnouncement(editingId, {
        title: formTitle,
        content: formContent,
        priority: formPriority,
        targetAudience: formTarget,
        status: formStatus,
        isPinned: formIsPinned,
        attachmentName: formAttachmentName.trim() || undefined,
        attachmentUrl: formAttachmentUrl.trim() || undefined,
        updatedAt: new Date().toISOString().substring(0, 10),
      });
    } else {
      onAddAnnouncement({
        title: formTitle,
        content: formContent,
        priority: formPriority,
        targetAudience: formTarget,
        status: formStatus,
        isPinned: formIsPinned,
        authorName: currentUser.name || 'SHS Dept Admin',
        authorRole: 'SHS Department Head / Admin',
        attachmentName: formAttachmentName.trim() || undefined,
        attachmentUrl: formAttachmentUrl.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const adminFilteredAnnouncements = announcements.filter((item) => {
    if (adminStatusFilter === 'all') return true;
    return item.status === adminStatusFilter;
  });

  const getPriorityBadge = (priority: AnnouncementPriority) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-mono px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center space-x-1 shadow-2xs">
            <AlertTriangle className="w-3 h-3 text-rose-600" />
            <span>Urgent Alert</span>
          </span>
        );
      case 'important':
        return (
          <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] font-mono px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center space-x-1 shadow-2xs">
            <Megaphone className="w-3 h-3 text-amber-600" />
            <span>Important Notice</span>
          </span>
        );
      case 'event':
        return (
          <span className="bg-sky-50 text-sky-800 border border-sky-200 text-[10px] font-mono px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center space-x-1 shadow-2xs">
            <Calendar className="w-3 h-3 text-sky-600" />
            <span>School Event</span>
          </span>
        );
      case 'general':
      default:
        return (
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-mono px-2.5 py-0.5 rounded-md font-bold uppercase tracking-wider flex items-center space-x-1 shadow-2xs">
            <Info className="w-3 h-3 text-emerald-600" />
            <span>General Advisory</span>
          </span>
        );
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-white border border-rose-200 rounded-2xl p-8 text-center space-y-4 max-w-2xl mx-auto my-8 shadow-sm">
        <div className="w-16 h-16 bg-rose-50 border border-rose-200 rounded-full flex items-center justify-center mx-auto text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold font-mono text-slate-900">Access Restricted to Department Administrators</h2>
        <p className="text-xs text-slate-600 font-sans leading-relaxed">
          The Admin Dashboard contains sensitive account directory management, faculty password controls, and system parameters. You are currently logged in as <span className="font-bold text-slate-900">{currentUser.name}</span> ({currentUser.role}).
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-16 w-full font-sans animate-fadeIn">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="bg-emerald-600 text-white font-mono text-xs font-bold px-4 py-3 rounded-2xl shadow-2xl border border-emerald-400 flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-white flex-shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="p-1 hover:bg-emerald-700 rounded-lg cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Admin Dashboard Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 shadow-2xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                  SVNHS Admin Security & Management Dashboard
                </h1>
                <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-mono font-extrabold uppercase">
                  MASTER CONTROL
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                San Vicente National High School • Administrator Panel
              </p>
            </div>
          </div>
        </div>

        {/* Master Admin Indicator Badge */}
        <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-xl text-xs font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-slate-600 font-bold">Logged in as:</span>
          <span className="text-slate-900 font-bold truncate max-w-[180px]">{currentUser.name}</span>
          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ml-1">
            {currentUser.designation || (isMasterAdmin ? 'Web Developer' : 'Admin')}
          </span>
        </div>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          {/* Faculty & Admin Accounts & Passwords Tab: STRICTLY VISIBLE ONLY TO MASTER ADMIN */}
          {isMasterAdmin && !isCoordinator && (
            <div className="flex items-center space-x-1 flex-1 sm:flex-none">
              <button
                type="button"
                onClick={() => setAdminSubTab('passwords')}
                className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
                  adminSubTab === 'passwords'
                    ? 'bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400 ring-offset-1 border border-emerald-600 scale-[1.02]'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-500 hover:shadow-xs'
                }`}
              >
                <Key className="w-4 h-4 text-emerald-200" />
                <span>Faculty & Admin Accounts & Passwords</span>
                {facultyRequests.length + adminRequests.length > 0 ? (
                  <span className="bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-bounce ml-1">
                    {facultyRequests.length + adminRequests.length} Pending
                  </span>
                ) : (
                  <span className="bg-emerald-900/60 text-emerald-100 border border-emerald-400/40 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ml-1">
                    Master Admin Only
                  </span>
                )}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => setAdminSubTab('announcements')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
              adminSubTab === 'announcements'
                ? 'bg-blue-700 text-white shadow-md ring-2 ring-blue-400 ring-offset-1 border border-blue-600 scale-[1.02]'
                : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-500 hover:shadow-xs'
            }`}
          >
            <Megaphone className="w-4 h-4 text-blue-200" />
            <span>Department Bulletins ({announcements.length})</span>
          </button>

          {!isCoordinator && (
            <button
              type="button"
              onClick={() => setAdminSubTab('faculty-folders')}
              className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
                adminSubTab === 'faculty-folders'
                  ? 'bg-amber-700 text-white shadow-md ring-2 ring-amber-400 ring-offset-1 border border-amber-600 scale-[1.02]'
                  : 'bg-amber-600 hover:bg-amber-700 text-white border border-amber-500 hover:shadow-xs'
              }`}
            >
              <FolderGit2 className="w-4 h-4 text-amber-200" />
              <span>Faculty Folders ({facultyFolders.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setAdminSubTab('school-folders')}
            className={`flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer shadow-xs ${
              adminSubTab === 'school-folders'
                ? 'bg-indigo-700 text-white shadow-md ring-2 ring-indigo-400 ring-offset-1 border border-indigo-600 scale-[1.02]'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-500 hover:shadow-xs'
            }`}
          >
            <FolderLock className="w-4 h-4 text-indigo-200" />
            <span>School Forms & Documents (2)</span>
          </button>
        </div>

        <div className="text-[11px] font-mono text-slate-600 flex items-center space-x-1.5 px-3 py-1 bg-white/70 rounded-lg border border-slate-200/60 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">DepEd Firestore Synced</span>
        </div>
      </div>

      {/* SUB-TAB 1: FACULTY & ADMIN REAL-TIME PASSWORD CONTROL & ACCOUNTS (RESTRICTED TO MASTER ADMIN) */}
      {adminSubTab === 'passwords' && isMasterAdmin && (
        <div className="space-y-6">

          {/* Pending Faculty Account Registration Requests */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                      Pending Faculty Registration Requests
                    </h3>
                    {facultyRequests.length > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                        {facultyRequests.length} New Request{facultyRequests.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Faculty members who submitted account creation requests from the Faculty Portal. Accept or Deny below.
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono text-slate-500">
                Total Pending: <span className="font-bold text-slate-900">{facultyRequests.length}</span>
              </div>
            </div>

            {facultyRequests.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs font-mono text-slate-500 flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No pending faculty account registration requests at this time.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Faculty Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Requested Password</th>
                      <th className="p-3">Requested Date</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facultyRequests.map((req) => {
                      const isJHS = (req.department || '').toLowerCase().includes('junior');
                      return (
                        <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900 flex items-center space-x-2">
                            <UserCheck className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{req.name}</span>
                          </td>

                          <td className="p-3 text-slate-700">{req.email}</td>

                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              isJHS
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}>
                              {isJHS ? 'Junior High School' : 'Senior High School'}
                            </span>
                          </td>

                          <td className="p-3 font-mono">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-amber-800">
                                {isMasterAdmin ? (
                                  revealedReqPasswords[req.id] ? req.password : '••••••••'
                                ) : (
                                  '••••••••'
                                )}
                              </span>
                              {isMasterAdmin ? (
                                <button
                                  type="button"
                                  onClick={() => toggleRevealReqPassword(req.id)}
                                  className="text-slate-500 hover:text-slate-900 cursor-pointer"
                                  title="Toggle View Password"
                                >
                                  {revealedReqPasswords[req.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic" title="Master Admin Only">
                                  (Protected)
                                </span>
                              )}
                            </div>
                          </td>

                          <td className="p-3 text-slate-500 text-[11px]">{req.requestedAt}</td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-2">
                              <button
                                type="button"
                                onClick={() => handleAcceptRequest(req)}
                                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1 cursor-pointer border border-emerald-600"
                                title="Accept and Register Faculty Member"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                <span>Accept</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDenyRequest(req.id, req.name, req.email)}
                                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center space-x-1 cursor-pointer"
                                title="Deny and Delete Request"
                              >
                                <X className="w-3.5 h-3.5 text-rose-600" />
                                <span>Deny</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pending Administrator Account Registration Requests */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-600">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                      Pending Administrator Account Requests
                    </h3>
                    {adminRequests.length > 0 && (
                      <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full animate-bounce">
                        {adminRequests.length} New Request{adminRequests.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Faculty/Staff requesting Department Administrator privileges. Accept or Deny below.
                  </p>
                </div>
              </div>

              <div className="text-xs font-mono text-slate-500">
                Total Pending Admins: <span className="font-bold text-slate-900">{adminRequests.length}</span>
              </div>
            </div>

            {adminRequests.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs font-mono text-slate-500 flex items-center justify-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                <span>No pending administrator registration requests at this time.</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Applicant Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Designation</th>
                      <th className="p-3">Requested Password</th>
                      <th className="p-3">Requested Date</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminRequests.map((req) => (
                      <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center space-x-2">
                          <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                          <span>{req.name}</span>
                        </td>

                        <td className="p-3 text-slate-700">{req.email}</td>

                        <td className="p-3 text-slate-600 text-[11px]">{req.designation || 'School Administrator'}</td>

                        <td className="p-3 font-mono">
                          <div className="flex items-center space-x-2">
                            <span className="font-bold text-amber-800">
                              {isMasterAdmin ? (
                                revealedAdminReqPasswords[req.id] ? req.password : '••••••••'
                              ) : (
                                '••••••••'
                              )}
                            </span>
                            {isMasterAdmin ? (
                              <button
                                type="button"
                                onClick={() => toggleRevealAdminReqPassword(req.id)}
                                className="text-slate-500 hover:text-slate-900 cursor-pointer"
                                title="Toggle View Password"
                              >
                                {revealedAdminReqPasswords[req.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 italic" title="Master Admin Only">
                                (Protected)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-slate-500 text-[11px]">{req.requestedAt}</td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => handleAcceptAdminRequest(req)}
                              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1 cursor-pointer border border-amber-600"
                              title="Accept and Register as Administrator"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                              <span>Accept Admin</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDenyAdminRequest(req.id, req.name, req.email)}
                              className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 transition-all flex items-center space-x-1 cursor-pointer"
                              title="Deny and Delete Request"
                            >
                              <X className="w-3.5 h-3.5 text-rose-600" />
                              <span>Deny</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Real-time Password Sync & Reset Control Header */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-600 shrink-0">
                <Key className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-sm font-bold font-mono text-slate-900">Faculty Login Real-Time Password Control</h2>
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
                    <span>REAL-TIME SYNC ACTIVE</span>
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 font-mono">
                  All password updates are written directly to local credentials storage and take effect immediately on subsequent faculty login attempts.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 w-full md:w-auto shrink-0">
              <button
                onClick={handleResetMasterPassword}
                disabled={!isMasterAdmin}
                className={`px-3.5 py-2 font-mono font-bold text-xs rounded-xl border transition-all flex items-center space-x-1.5 ${
                  isMasterAdmin
                    ? 'bg-slate-100 hover:bg-slate-200 text-amber-800 border-amber-200 cursor-pointer'
                    : 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                }`}
                title={isMasterAdmin ? "Reset Master Faculty Password to default DepEd password (shs304868)" : "Security Restriction: Only Master Admin can reset to default"}
              >
                {isMasterAdmin ? <RefreshCw className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
                <span>Reset Master Default</span>
              </button>

              <button
                onClick={() => setIsAddFacultyOpen(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1.5 border border-blue-600 cursor-pointer"
              >
                <UserPlus className="w-4 h-4 text-white" />
                <span>Add Faculty Account</span>
              </button>
            </div>
          </div>

          {/* CARD 1: Master Admin Credentials (Stored in Firebase Firestore) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-5 h-5 text-amber-600" />
                <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                  Master Admin Credentials (Stored in Firebase Firestore)
                </h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isMasterAdmin 
                  ? 'text-amber-800 bg-amber-50 border-amber-200' 
                  : 'text-slate-500 bg-slate-100 border-slate-200'
              }`}>
                {isMasterAdmin ? 'Firebase Cloud Security' : 'Protected (Master Admin Only)'}
              </span>
            </div>

            {!isMasterAdmin && (
              <div className="p-3 bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-mono rounded-xl flex items-center space-x-2 shadow-2xs">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Security Protection: Only the Master Admin can access or update Master Admin Credentials.</span>
              </div>
            )}

            {/* Current Active Master Admin Display */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
                  Active Master Admin Email
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <span className="font-mono text-xs font-bold text-slate-900 tracking-wide truncate">
                    {isMasterAdmin ? masterAdminEmail : '•••••••••••• (Master Admin Only)'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
                  Active Master Admin Password Status
                </span>
                <div className="flex items-center justify-between mt-1 bg-white px-3 py-2 rounded-lg border border-slate-200">
                  <div className="flex items-center space-x-2">
                    <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="font-mono text-xs font-bold text-slate-800 tracking-widest">
                      ••••••••••••••••
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-mono font-bold rounded border border-slate-200 shrink-0">
                    Protected for Privacy
                  </span>
                </div>
              </div>
            </div>

            {/* Form to Update Master Admin Credentials */}
            <form onSubmit={handleUpdateMasterAdminCredentials} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-700 mb-1">
                    Master Admin Email (@deped.gov.ph)
                  </label>
                  <input
                    type="email"
                    value={inputMasterAdminEmail}
                    onChange={(e) => setInputMasterAdminEmail(e.target.value)}
                    placeholder="e.g. johnvic.garnica@deped.gov.ph"
                    required
                    disabled={!isMasterAdmin}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-700 mb-1">
                    New Master Admin Password (Optional)
                  </label>
                  <div className="relative">
                    <input
                      type={showNewMasterAdminInput ? 'text' : 'password'}
                      value={newMasterAdminInput}
                      onChange={(e) => setNewMasterAdminInput(e.target.value)}
                      placeholder="Enter new admin password"
                      disabled={!isMasterAdmin}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    {isMasterAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowNewMasterAdminInput(!showNewMasterAdminInput)}
                        className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-900"
                      >
                        {showNewMasterAdminInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-700 mb-1">
                    Confirm New Admin Password
                  </label>
                  <input
                    type="password"
                    value={confirmMasterAdminInput}
                    onChange={(e) => setConfirmMasterAdminInput(e.target.value)}
                    placeholder="Re-enter new admin password"
                    disabled={!isMasterAdmin}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {masterAdminPasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{masterAdminPasswordError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500 font-mono">
                  Updating credentials saves changes to Firebase Firestore instantly.
                </p>

                <button
                  type="submit"
                  disabled={!isMasterAdmin}
                  className={`px-5 py-2.5 font-mono font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-2 border ${
                    isMasterAdmin
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 cursor-pointer active:scale-95'
                      : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-70'
                  }`}
                >
                  {isMasterAdmin ? <Save className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <span>Save to Firebase</span>
                </button>
              </div>
            </form>
          </div>

          {/* CARD 2: Master Faculty Password (All Unassigned Faculty Accounts) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                  Master Faculty Password (All Unassigned Faculty Accounts)
                </h3>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                isMasterAdmin
                  ? 'text-slate-700 bg-slate-100 border-slate-200'
                  : 'text-slate-500 bg-slate-100 border-slate-200'
              }`}>
                {isMasterAdmin ? 'Default Fallback' : 'Protected (Master Admin Only)'}
              </span>
            </div>

            {!isMasterAdmin && (
              <div className="p-3 bg-amber-50/90 border border-amber-200 text-amber-900 text-xs font-mono rounded-xl flex items-center space-x-2 shadow-2xs">
                <Lock className="w-4 h-4 text-amber-700 shrink-0" />
                <span>Security Protection: Only the Master Admin can access or change the Master Faculty Password.</span>
              </div>
            )}

            {/* Current Active Master Password Display */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase text-slate-500 tracking-wider font-bold">
                  Active Master Faculty Password Status
                </span>
                <div className="flex items-center space-x-2 mt-1">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="font-mono text-sm font-bold text-slate-800 tracking-widest">
                    ••••••••••••••••
                  </span>
                </div>
              </div>

              <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-xs font-mono font-bold rounded-lg border border-slate-200 flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Protected for Privacy</span>
              </span>
            </div>

            {/* Form to Update Master Password */}
            <form onSubmit={handleUpdateMasterPassword} className="space-y-4 pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-700 mb-1">
                    New Master Faculty Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewMasterInput ? 'text' : 'password'}
                      value={newMasterInput}
                      onChange={(e) => setNewMasterInput(e.target.value)}
                      placeholder="Enter new password"
                      required
                      disabled={!isMasterAdmin}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                    />
                    {isMasterAdmin && (
                      <button
                        type="button"
                        onClick={() => setShowNewMasterInput(!showNewMasterInput)}
                        className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-900"
                      >
                        {showNewMasterInput ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-700 mb-1">
                    Confirm New Master Password
                  </label>
                  <input
                    type="password"
                    value={confirmMasterInput}
                    onChange={(e) => setConfirmMasterInput(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    disabled={!isMasterAdmin}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {masterPasswordError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-mono rounded-xl flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{masterPasswordError}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-2">
                <p className="text-[11px] text-slate-500 font-mono">
                  Changes take effect immediately across all registered faculty accounts without custom passwords.
                </p>

                <button
                  type="submit"
                  disabled={!isMasterAdmin}
                  className={`px-5 py-2.5 font-mono font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-2 border ${
                    isMasterAdmin
                      ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600 cursor-pointer active:scale-95'
                      : 'bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed opacity-70'
                  }`}
                >
                  {isMasterAdmin ? <Save className="w-4 h-4 text-white" /> : <Lock className="w-4 h-4 text-slate-400" />}
                  <span>Update Master Password Real-Time</span>
                </button>
              </div>
            </form>
          </div>

          {/* CARD 3: Faculty Account Directory & Custom Passwords */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                  Faculty Account Directory & Individual Password Settings
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Set specific passwords for individual faculty members, or let them default to the Master Faculty Password.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {/* Department Filter */}
                <div className="flex items-center space-x-1.5 font-mono text-xs">
                  <span className="text-slate-500 text-[10px] uppercase font-bold">Dept:</span>
                  <select
                    value={facultyDeptFilter}
                    onChange={(e) => setFacultyDeptFilter(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-blue-500"
                  >
                    <option value="all">All Departments ({facultyList.length})</option>
                    <option value="Junior High School Department">
                      JHS Department ({facultyList.filter((f) => (f.department || '').toLowerCase().includes('junior')).length})
                    </option>
                    <option value="Senior High School Department">
                      SHS Department ({facultyList.filter((f) => !(f.department || '').toLowerCase().includes('junior')).length})
                    </option>
                  </select>
                </div>

                <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold flex items-center space-x-1 shadow-2xs">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Passwords Hidden & Protected for Privacy</span>
                </span>
              </div>
            </div>

            {facultyList.length === 0 ? (
              <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs font-mono text-slate-500">
                No faculty members registered in directory. Click "Add Faculty Account" above.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Faculty Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Password Mode</th>
                      <th className="p-3">Active Login Password</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {facultyList
                      .filter((f) => {
                        if (facultyDeptFilter === 'all') return true;
                        if (facultyDeptFilter === 'Junior High School Department') {
                          return (f.department || '').toLowerCase().includes('junior');
                        }
                        if (facultyDeptFilter === 'Senior High School Department') {
                          return !(f.department || '').toLowerCase().includes('junior');
                        }
                        return true;
                      })
                      .map((f) => {
                      const emailKey = f.email.toLowerCase();
                      const customPass = customFacultyPasswords[emailKey];
                      const isCustom = Boolean(customPass);
                      const isJHS = (f.department || '').toLowerCase().includes('junior');

                      return (
                        <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 font-bold text-slate-900">{f.name}</td>
                          <td className="p-3 text-slate-700">{f.email}</td>

                          <td className="p-3">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                              isJHS
                                ? 'bg-blue-50 text-blue-800 border-blue-200'
                                : 'bg-amber-50 text-amber-900 border-amber-200'
                            }`}>
                              {isJHS ? 'Junior High School' : 'Senior High School'}
                            </span>
                          </td>

                          <td className="p-3">
                            {isCustom ? (
                              <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                                Custom Password
                              </span>
                            ) : (
                              <span className="bg-slate-100 text-slate-600 border border-slate-200 text-[10px] px-2 py-0.5 rounded font-bold uppercase">
                                Master Password Default
                              </span>
                            )}
                          </td>

                          <td className="p-3 font-mono font-bold">
                            <span className="text-slate-600 font-medium text-[11px] flex items-center space-x-1.5" title="All faculty passwords are encrypted and hidden for privacy">
                              <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                              <span>•••••••• (Protected)</span>
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end space-x-1.5">
                              {isMasterAdmin ? (
                                <button
                                  onClick={() => {
                                    setEditingFaculty({ name: f.name, email: f.email });
                                    setIndividualPasswordInput('');
                                  }}
                                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg border border-slate-200 font-bold text-[11px] transition-all cursor-pointer flex items-center space-x-1"
                                  title="Change Password for this specific faculty member"
                                >
                                  <Key className="w-3 h-3 text-amber-600" />
                                  <span>Set Custom Password</span>
                                </button>
                              ) : (
                                <span
                                  className="px-2.5 py-1 bg-slate-100 text-slate-400 rounded-lg border border-slate-200 font-bold text-[11px] flex items-center space-x-1 opacity-70 cursor-not-allowed"
                                  title="Only Master Admin can modify faculty passwords"
                                >
                                  <Lock className="w-3 h-3 text-slate-400" />
                                  <span>Protected</span>
                                </span>
                              )}

                              {isCustom && isMasterAdmin && (
                                <button
                                  onClick={() => handleResetIndividualPassword(f.email, f.name)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 font-bold text-[10px] transition-all cursor-pointer"
                                  title="Reset password back to Master Password default"
                                >
                                  Reset to Master
                                </button>
                              )}

                              <button
                                onClick={() => {
                                  if (!isMasterAdmin) {
                                    alert('Security Restriction: Only the Master Admin can delete faculty accounts.');
                                    return;
                                  }
                                  handleDeleteFaculty(f.id, f.name, f.email);
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-all cursor-pointer"
                                title="Delete Faculty Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* CARD 4: Registered Administrator Directory */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-600" />
                  <span>Authorized Administrator Accounts Directory</span>
                </h3>
                <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                  Accounts with full Department Administrator privileges for posting, editing, and managing repository settings.
                </p>
              </div>

              <div className="flex items-center space-x-3">
                <div className="text-xs font-mono text-slate-500">
                  Total Active Admins: <span className="text-slate-900 font-bold">{adminList.length}</span>
                </div>
                {isMasterAdmin && (
                  <button
                    onClick={() => setIsAddAdminOpen(true)}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5 text-white" />
                    <span>Add Administrator</span>
                  </button>
                )}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Admin Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Admin Title / Designation</th>
                    <th className="p-3">Active Password</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminList.map((admin) => {
                    const cleanEmail = admin.email.toLowerCase();
                    const isMaster = cleanEmail === (masterAdminEmail || 'johnvic.garnica@deped.gov.ph').toLowerCase();

                    return (
                      <tr key={admin.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center space-x-2">
                          <span>{admin.name}</span>
                          {isMaster && (
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[9px] px-1.5 py-0.2 rounded uppercase font-bold">
                              Master Admin
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-slate-700">{admin.email}</td>

                        <td className="p-3">
                          {isMaster ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300">
                              Web Developer
                            </span>
                          ) : isMasterAdmin ? (
                            <select
                              value={admin.designation || 'School Principal'}
                              onChange={(e) => handleUpdateAdminDesignation(admin.id, e.target.value)}
                              className="bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 cursor-pointer focus:outline-none focus:border-amber-500"
                              title="Update Administrator Title"
                            >
                              <option value="School Principal">School Principal</option>
                              <option value="Master Teacher">Master Teacher</option>
                              <option value="Coordinator">Coordinator</option>
                            </select>
                          ) : (
                            <span className="text-slate-700 font-medium text-[11px]">{admin.designation}</span>
                          )}
                        </td>

                        <td className="p-3 font-mono font-bold">
                          <span className="text-slate-600 font-medium text-[11px] flex items-center space-x-1.5" title="All admin passwords are encrypted and hidden for privacy">
                            <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>•••••••• (Protected)</span>
                          </span>
                        </td>

                        <td className="p-3 text-right">
                          {!isMaster && (
                            <button
                              onClick={() => {
                                if (!isMasterAdmin) {
                                  alert('Security Restriction: Only Master Admin can delete admin accounts.');
                                  return;
                                }
                                handleDeleteAdmin(admin.id, admin.name, admin.email);
                              }}
                              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 font-bold text-[11px] transition-all cursor-pointer"
                              title="Revoke Admin Access"
                            >
                              Revoke Admin
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* CARD 5: Live Credentials Test Sandbox */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                Live Credentials Authenticator Sandbox
              </h3>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                Test any faculty email and password combination against the active login rules in real time.
              </p>
            </div>

            <form onSubmit={handleTestCredentials} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-700 mb-1">
                    Test Faculty Email
                  </label>
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    placeholder="e.g. maria.santos@deped.gov.ph"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase font-bold text-slate-700 mb-1">
                    Test Password Input
                  </label>
                  <input
                    type="text"
                    value={testPassword}
                    onChange={(e) => setTestPassword(e.target.value)}
                    placeholder="Enter password to verify"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-mono font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center space-x-1.5"
              >
                <span>Run Credentials Verification Check</span>
              </button>
            </form>

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs font-mono font-bold transition-all ${
                  testResult.success
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border-rose-200'
                }`}
              >
                {testResult.message}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 2: ANNOUNCEMENTS & BULLETINS MANAGEMENT */}
      {adminSubTab === 'announcements' && (
        <div className="space-y-6">
          {/* Admin Banner Info */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-600 flex-shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-sm font-bold font-mono text-slate-900 flex items-center space-x-2">
                  <span>Administrator Bulletin Management Panel</span>
                  <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                    AUTHORITY: OFFICIAL ADMIN
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Publish, edit, pin priority advisories, or archive outdated department bulletins.
                </p>
              </div>
            </div>

            <button
              onClick={openCreateModal}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-2 border border-blue-600 cursor-pointer flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Post New Announcement</span>
            </button>
          </div>

          {/* Admin Table Controls */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2 font-mono text-xs">
                <span className="text-slate-500 uppercase tracking-widest font-bold">Filter Status:</span>
                {['all', 'published', 'draft', 'archived'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setAdminStatusFilter(st)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold capitalize transition-all cursor-pointer ${
                      adminStatusFilter === st
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>

              <div className="text-xs font-mono text-slate-500">
                Total Bulletins: <span className="text-slate-900 font-bold">{announcements.length}</span>
              </div>
            </div>

            {/* Admin Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Priority / Pinned</th>
                    <th className="p-3">Title & Target</th>
                    <th className="p-3">Author</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {adminFilteredAnnouncements.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                        No announcements matching filter criteria.
                      </td>
                    </tr>
                  ) : (
                    adminFilteredAnnouncements.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-3">
                          <div className="flex items-center space-x-2">
                            {getPriorityBadge(item.priority)}
                            {item.isPinned && (
                              <span className="p-1 bg-amber-50 text-amber-700 rounded border border-amber-200" title="Pinned to Top">
                                <Pin className="w-3 h-3 fill-amber-500" />
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 max-w-xs">
                          <div className="font-bold text-slate-900 line-clamp-1">{item.title}</div>
                          <div className="text-[10px] text-slate-500 font-sans mt-0.5">
                            Target: <span className="font-mono text-slate-700">{item.targetAudience}</span>
                          </div>
                        </td>

                        <td className="p-3 text-slate-700">
                          <div className="font-bold text-[11px]">{item.authorName}</div>
                          <div className="text-[9px] text-slate-500">{item.authorRole}</div>
                        </td>

                        <td className="p-3">
                          <button
                            onClick={() => onToggleStatus(item.id)}
                            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase transition-all cursor-pointer ${
                              item.status === 'published'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : item.status === 'draft'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-600 border border-slate-200'
                            }`}
                            title="Click to toggle status"
                          >
                            {item.status}
                          </button>
                        </td>

                        <td className="p-3 text-slate-500 text-[11px]">{item.createdAt}</td>

                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              onClick={() => onTogglePin(item.id)}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                item.isPinned
                                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-200'
                              }`}
                              title={item.isPinned ? 'Unpin from Top' : 'Pin to Top of Board'}
                            >
                              <Pin className={`w-3.5 h-3.5 ${item.isPinned ? 'fill-amber-500' : ''}`} />
                            </button>

                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 transition-all cursor-pointer"
                              title="Edit Announcement"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                                  onDeleteAnnouncement(item.id);
                                }
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-all cursor-pointer"
                              title="Delete Announcement"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Individual Faculty Custom Password Set */}
      {editingFaculty && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="font-mono font-bold text-sm text-slate-900 uppercase">
                  Set Custom Password
                </h3>
              </div>
              <button
                onClick={() => setEditingFaculty(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs space-y-1">
              <div>
                Faculty Name: <span className="font-bold text-slate-900">{editingFaculty.name}</span>
              </div>
              <div>
                Email: <span className="font-bold text-slate-900">{editingFaculty.email}</span>
              </div>
            </div>

            <form onSubmit={handleSaveIndividualPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-700 mb-1">
                  Custom Login Password
                </label>
                <div className="relative">
                  <input
                    type={showIndividualPassword ? 'text' : 'password'}
                    value={individualPasswordInput}
                    onChange={(e) => setIndividualPasswordInput(e.target.value)}
                    placeholder="Enter custom password"
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowIndividualPassword(!showIndividualPassword)}
                    className="absolute right-2.5 top-2 text-slate-500 hover:text-slate-900"
                  >
                    {showIndividualPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingFaculty(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-mono font-bold text-xs rounded-xl cursor-pointer shadow-2xs"
                >
                  Save Custom Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Add New Faculty Account */}
      {isAddFacultyOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="font-mono font-bold text-sm text-slate-900 uppercase">
                  Add Faculty Account to Directory
                </h3>
              </div>
              <button
                onClick={() => setIsAddFacultyOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFaculty} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                  Full Name (e.g. Maria Santos)
                </label>
                <input
                  type="text"
                  value={newFacultyName}
                  onChange={(e) => setNewFacultyName(e.target.value)}
                  placeholder="Enter full name"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                  DepEd Email Address (@deped.gov.ph)
                </label>
                <input
                  type="text"
                  value={newFacultyEmail}
                  onChange={(e) => setNewFacultyEmail(e.target.value)}
                  placeholder="e.g. maria.santos@deped.gov.ph"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>School Department / Teaching Level *</span>
                  <span className="text-slate-400 font-normal">Choose Level</span>
                </label>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewFacultyDepartment('Junior High School Department')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      newFacultyDepartment === 'Junior High School Department'
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-400/30 text-blue-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        newFacultyDepartment === 'Junior High School Department'
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        JHS Dept.
                      </span>
                      {newFacultyDepartment === 'Junior High School Department' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-[11px] leading-tight">Junior High</div>
                      <div className="text-[9px] opacity-75 font-sans leading-tight">Grades 7 - 10</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewFacultyDepartment('Senior High School Department')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-1 ${
                      newFacultyDepartment === 'Senior High School Department'
                        ? 'bg-amber-50 border-amber-500 ring-2 ring-amber-400/30 text-amber-900 shadow-2xs'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded font-mono ${
                        newFacultyDepartment === 'Senior High School Department'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}>
                        SHS Dept.
                      </span>
                      {newFacultyDepartment === 'Senior High School Department' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-[11px] leading-tight">Senior High</div>
                      <div className="text-[9px] opacity-75 font-sans leading-tight">Grades 11 - 12</div>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                  Initial Password (Optional - defaults to Master Password)
                </label>
                <input
                  type="password"
                  value={newFacultyPass}
                  onChange={(e) => setNewFacultyPass(e.target.value)}
                  placeholder="Leave empty for Master Password default"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddFacultyOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-2xs"
                >
                  Create Faculty Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create / Edit Announcement */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl p-6 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Megaphone className="w-5 h-5 text-blue-600" />
                <h3 className="font-mono font-bold text-sm text-slate-900 uppercase">
                  {editingId ? 'Edit Department Announcement' : 'Post Official Department Advisory'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                  Advisory Title *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. Mandatory Faculty Meeting for Q3 Assessment Review"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                    Priority Level
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                  >
                    <option value="important">Important Notice</option>
                    <option value="urgent">Urgent Alert</option>
                    <option value="event">School Event</option>
                    <option value="general">General Advisory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                    Target Audience
                  </label>
                  <select
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value as AnnouncementTarget)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold cursor-pointer"
                  >
                    <option value="All SHS Faculty">All SHS Faculty</option>
                    <option value="Department Heads">Department Heads</option>
                    <option value="Grade 11 Teachers">Grade 11 Teachers</option>
                    <option value="Grade 12 Teachers">Grade 12 Teachers</option>
                    <option value="All Students">All Students</option>
                    <option value="Public">Public / All Users</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                  Advisory Details & Content *
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={5}
                  placeholder="Provide complete guidelines, dates, instructions, or venue details..."
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-sans leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                    Attachment File Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={formAttachmentName}
                    onChange={(e) => setFormAttachmentName(e.target.value)}
                    placeholder="e.g. Q3_Assessment_Schedule.pdf"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-700 mb-1">
                    Attachment Download Link (Optional)
                  </label>
                  <input
                    type="text"
                    value={formAttachmentUrl}
                    onChange={(e) => setFormAttachmentUrl(e.target.value)}
                    placeholder="e.g. https://deped.gov.ph/docs/file.pdf"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pinNotice"
                    checked={formIsPinned}
                    onChange={(e) => setFormIsPinned(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 cursor-pointer"
                  />
                  <label htmlFor="pinNotice" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Pin Advisory to Top of Bulletin Board
                  </label>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] uppercase font-bold text-slate-500">Status:</span>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AnnouncementStatus)}
                    className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-bold cursor-pointer"
                  >
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer shadow-2xs flex items-center space-x-1.5"
                >
                  <Megaphone className="w-4 h-4 text-white" />
                  <span>{editingId ? 'Save Advisory Changes' : 'Publish Advisory Now'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD NEW ADMINISTRATOR MODAL */}
      {isAddAdminOpen && isMasterAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-amber-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/20 text-white rounded-2xl border border-white/30">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-sans">Register New Administrator</h3>
                  <p className="text-[11px] text-amber-100 font-mono">Master Admin Direct Registration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsAddAdminOpen(false);
                  setNewAdminName('');
                  setNewAdminEmail('');
                  setNewAdminDesignation('School Principal');
                  setNewAdminPass('');
                }}
                className="p-1.5 hover:bg-white/10 rounded-xl text-white/80 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAdmin} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  Admin Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newAdminName}
                  onChange={(e) => setNewAdminName(e.target.value)}
                  placeholder="e.g., Marivic Villaluz"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  DepEd Email Address <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="e.g., marivic.villaluz@deped.gov.ph"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  Admin Title / Designation <span className="text-rose-500">*</span>
                </label>
                <select
                  value={newAdminDesignation}
                  onChange={(e) => setNewAdminDesignation(e.target.value as 'School Principal' | 'Master Teacher' | 'Coordinator')}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-800 focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                >
                  <option value="School Principal">School Principal</option>
                  <option value="Master Teacher">Master Teacher</option>
                  <option value="Coordinator">Coordinator</option>
                </select>
                <p className="text-[11px] text-slate-500 font-mono mt-1">
                  Designated DepEd Administrative role for this user account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  Administrator Password <span className="text-slate-400 font-normal">(Optional, defaults to Master Password)</span>
                </label>
                <input
                  type="password"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  placeholder="Enter initial password or leave blank for default"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-amber-500 focus:outline-hidden"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddAdminOpen(false);
                    setNewAdminName('');
                    setNewAdminEmail('');
                    setNewAdminDesignation('School Principal');
                    setNewAdminPass('');
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs rounded-xl cursor-pointer shadow-2xs flex items-center space-x-1.5"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Register Administrator</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB: FACULTY WORKSPACE FOLDERS (GROUPED BY SURNAME) */}
      {adminSubTab === 'faculty-folders' && !isCoordinator && (
        <AdminFacultyFoldersDirectory
          facultyList={facultyList}
          facultyFolders={facultyFolders}
          facultyFiles={facultyFiles}
          currentUser={currentUser}
          onDeleteFacultyFolder={onDeleteFacultyFolder}
          onDeleteFacultyFile={onDeleteFacultyFile}
        />
      )}

      {/* SUB-TAB: SCHOOL PERMANENT FOLDERS (SCHOOL FORMS & SCHOOL DOCUMENTS) */}
      {adminSubTab === 'school-folders' && (
        <div className="space-y-6">
          {/* Main Info Banner */}
          <div className="bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
            <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full uppercase flex items-center space-x-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-300" />
                    <span>School Administration Central Links</span>
                  </span>
                  <span className="bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Real-time Global Sync</span>
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold font-sans tracking-tight">
                  Permanent School Folders Management
                </h2>
                <p className="text-xs sm:text-sm text-indigo-100/90 max-w-2xl leading-relaxed">
                  Configure the official Google Drive folders for <strong className="text-white">"SCHOOL FORMS"</strong> and <strong className="text-white">"SCHOOL DOCUMENTS"</strong>.
                  These two folders appear permanently in every faculty member's <strong className="text-white">"My Workspace"</strong> page. Only authorized administrators can set or update the embedded Google Drive links.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 text-xs font-mono text-indigo-100 space-y-1.5 shrink-0">
                <div className="text-[11px] text-indigo-300 font-bold uppercase">Folder Targets</div>
                <div className="flex items-center space-x-2 font-bold text-white">
                  <FolderLock className="w-4 h-4 text-emerald-300" />
                  <span>2 Permanent Folders</span>
                </div>
                <div className="text-[10px] text-indigo-200">
                  Shared across {facultyList.length} Faculty Members
                </div>
              </div>
            </div>
          </div>

          {/* TWO PERMANENT FOLDER EDITORS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. SCHOOL FORMS */}
            <div className="bg-white border-2 border-slate-200 hover:border-blue-400/60 rounded-3xl p-6 shadow-sm space-y-5 transition-all">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-xs shrink-0">
                    <FileSpreadsheet className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-blue-100 text-blue-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-blue-200 uppercase">
                        Permanent System Folder
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>All Faculty Workspaces</span>
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      SCHOOL FORMS
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                    Active
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveFormsLink} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Link className="w-3.5 h-3.5 text-blue-600" />
                      <span>Embedded Google Drive Link *</span>
                    </span>
                    {extractDriveId(formsUrlInput) ? (
                      <span className="text-[10px] text-emerald-600 font-bold lowercase">
                        Drive ID: {extractDriveId(formsUrlInput)?.substring(0, 14)}...
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600">Standard Google Drive folder URL</span>
                    )}
                  </label>
                  <input
                    type="url"
                    value={formsUrlInput}
                    onChange={(e) => setFormsUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-mono transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Paste the shared Google Drive folder link containing DepEd SF1-SF10, Clearance, Inventory, and official School Forms.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-700 mb-1">
                    Folder Description & Instructions for Faculty
                  </label>
                  <textarea
                    rows={2}
                    value={formsDescInput}
                    onChange={(e) => setFormsDescInput(e.target.value)}
                    placeholder="Provide notes or guidelines for faculty regarding school forms..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white font-mono transition-all resize-none"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowFormsPreview(!showFormsPreview)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>{showFormsPreview ? 'Hide Preview' : 'Preview Webview'}</span>
                    </button>

                    {formsPermanentFolder.driveUrl && (
                      <a
                        href={formsPermanentFolder.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
                        title="Open in new browser tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Drive</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleResetFormsDefault}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                      title="Reset to default official link"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingForms}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      {isSavingForms ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Link for All</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Embedded Webview Preview */}
              {showFormsPreview && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                    <span className="font-bold flex items-center space-x-1.5">
                      <FolderLock className="w-4 h-4 text-blue-600" />
                      <span>Live Drive Webview (SCHOOL FORMS)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFormsPreview(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <GoogleDriveWebview
                    driveUrl={formsUrlInput || formsPermanentFolder.driveUrl || ''}
                    title="SCHOOL FORMS Preview"
                    height="400px"
                  />
                </div>
              )}
            </div>

            {/* 2. SCHOOL DOCUMENTS */}
            <div className="bg-white border-2 border-slate-200 hover:border-emerald-400/60 rounded-3xl p-6 shadow-sm space-y-5 transition-all">
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-xs shrink-0">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border border-emerald-200 uppercase">
                        Permanent System Folder
                      </span>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold flex items-center space-x-1">
                        <Lock className="w-3 h-3 text-slate-400" />
                        <span>All Faculty Workspaces</span>
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mt-1">
                      SCHOOL DOCUMENTS
                    </h3>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md font-bold">
                    Active
                  </span>
                </div>
              </div>

              <form onSubmit={handleSaveDocsLink} className="space-y-4 text-xs font-mono">
                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <Link className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Embedded Google Drive Link *</span>
                    </span>
                    {extractDriveId(docsUrlInput) ? (
                      <span className="text-[10px] text-emerald-600 font-bold lowercase">
                        Drive ID: {extractDriveId(docsUrlInput)?.substring(0, 14)}...
                      </span>
                    ) : (
                      <span className="text-[10px] text-amber-600">Standard Google Drive folder URL</span>
                    )}
                  </label>
                  <input
                    type="url"
                    value={docsUrlInput}
                    onChange={(e) => setDocsUrlInput(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/..."
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono transition-all"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">
                    Paste the shared Google Drive folder link containing School Memos, DepEd Orders, Division Advisories, and Institutional Policies.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] uppercase font-bold text-slate-700 mb-1">
                    Folder Description & Instructions for Faculty
                  </label>
                  <textarea
                    rows={2}
                    value={docsDescInput}
                    onChange={(e) => setDocsDescInput(e.target.value)}
                    placeholder="Provide notes or guidelines for faculty regarding school documents..."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white font-mono transition-all resize-none"
                  />
                </div>

                <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowDocsPreview(!showDocsPreview)}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-slate-600" />
                      <span>{showDocsPreview ? 'Hide Preview' : 'Preview Webview'}</span>
                    </button>

                    {docsPermanentFolder.driveUrl && (
                      <a
                        href={docsPermanentFolder.driveUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-all"
                        title="Open in new browser tab"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Drive</span>
                      </a>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={handleResetDocsDefault}
                      className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
                      title="Reset to default official link"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingDocs}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl text-xs shadow-2xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    >
                      {isSavingDocs ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          <span>Save Link for All</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>

              {/* Embedded Webview Preview */}
              {showDocsPreview && (
                <div className="mt-4 pt-4 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-600">
                    <span className="font-bold flex items-center space-x-1.5">
                      <FolderLock className="w-4 h-4 text-emerald-600" />
                      <span>Live Drive Webview (SCHOOL DOCUMENTS)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowDocsPreview(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <GoogleDriveWebview
                    driveUrl={docsUrlInput || docsPermanentFolder.driveUrl || ''}
                    title="SCHOOL DOCUMENTS Preview"
                    height="400px"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Quick Explanatory Guide Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 text-xs font-mono text-slate-600 space-y-3">
            <div className="flex items-center space-x-2 text-slate-900 font-bold">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              <span className="uppercase tracking-wider">Administrator Instructions & Permission Guide</span>
            </div>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-600 leading-relaxed">
              <li>
                <strong>Visibility:</strong> Both folders are permanently anchored at the top of the <strong className="text-slate-800">"My Workspace"</strong> view for every registered faculty member. Teachers cannot delete or rename them.
              </li>
              <li>
                <strong>Central Link Management:</strong> Only administrators accessing this dashboard can update the embedded Google Drive URLs. Once saved, the new link immediately updates across all teacher workspaces.
              </li>
              <li>
                <strong>Drive Permissions:</strong> To ensure all faculty members can view and download files without access requests, set the Google Drive folder share permissions to <strong className="text-slate-800">"Department of Education (DepEd)"</strong> or <strong className="text-slate-800">"Anyone with the link can view"</strong>.
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
