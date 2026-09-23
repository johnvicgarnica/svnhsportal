import React, { useState, useEffect } from 'react';
import {
  Announcement,
  AnnouncementPriority,
  AnnouncementTarget,
  AnnouncementStatus,
  UserProfile,
  DriveFolder,
  FacultyFolder,
  FacultyPersonalFile,
} from '../types';
import { AdminFacultyFoldersDirectory } from './AdminFacultyFoldersDirectory';
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
} from 'lucide-react';

interface AdminDashboardViewProps {
  announcements: Announcement[];
  currentUser: UserProfile;
  driveFolders?: DriveFolder[];
  facultyFolders?: FacultyFolder[];
  facultyFiles?: FacultyPersonalFile[];
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

  // Admin Sub-Section Tab ('passwords', 'faculty-folders', or 'announcements')
  // Default to 'announcements' so passwords page is not exposed by default
  const [adminSubTab, setAdminSubTab] = useState<'passwords' | 'faculty-folders' | 'announcements'>('announcements');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('all');

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

  // Master Admin Password Verification & Unlock State (Restricting Accounts & Passwords to Master Admin)
  const [isMasterAdminUnlocked, setIsMasterAdminUnlocked] = useState<boolean>(false);
  const canAccessMasterAdmin = isMasterAdmin || isMasterAdminUnlocked;
  const [isMasterAuthModalOpen, setIsMasterAuthModalOpen] = useState<boolean>(false);
  const [masterAuthInput, setMasterAuthInput] = useState<string>('');
  const [masterAuthError, setMasterAuthError] = useState<string | null>(null);
  const [showMasterAuthInput, setShowMasterAuthInput] = useState<boolean>(false);

  const handleUnlockMasterAdmin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setMasterAuthError(null);
    const expectedPassword = masterAdminPassword || 'garjohn@1995';
    if (masterAuthInput.trim() === expectedPassword) {
      setIsMasterAdminUnlocked(true);
      setIsMasterAuthModalOpen(false);
      setMasterAuthInput('');
      setAdminSubTab('passwords');
      showToast('Master Admin verified: Faculty & Admin Accounts & Passwords unlocked.');
    } else {
      setMasterAuthError('Incorrect Master Admin password. Access denied.');
    }
  };

  const handleLockMasterAdmin = () => {
    setIsMasterAdminUnlocked(false);
    if (!isMasterAdmin && adminSubTab === 'passwords') {
      setAdminSubTab('announcements');
    }
    showToast('Master Admin session locked.');
  };

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
      designation: 'School Administrator (Master Admin)',
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
          {isMasterAdmin && (
            <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ml-1">
              Master Admin
            </span>
          )}
        </div>
      </div>

      {/* Admin Sub-Navigation Tabs */}
      <div className="bg-slate-100 p-2 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2.5 shadow-sm">
        <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 w-full sm:w-auto">
          {/* Faculty & Admin Accounts & Passwords Tab: ONLY VISIBLE TO MASTER ADMIN */}
          {canAccessMasterAdmin ? (
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
                    Master Admin
                  </span>
                )}
              </button>
              {isMasterAdminUnlocked && !isMasterAdmin && (
                <button
                  type="button"
                  onClick={handleLockMasterAdmin}
                  className="px-2.5 py-2.5 rounded-xl bg-slate-200 hover:bg-rose-100 text-slate-700 hover:text-rose-700 transition-all cursor-pointer border border-slate-300 text-xs font-mono font-bold"
                  title="Lock Master Admin session"
                >
                  <Lock className="w-4 h-4" />
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setMasterAuthError(null);
                setMasterAuthInput('');
                setIsMasterAuthModalOpen(true);
              }}
              className="flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl font-mono text-xs font-bold text-slate-600 hover:text-emerald-800 hover:bg-emerald-50/70 transition-all cursor-pointer border border-dashed border-slate-300 hover:border-emerald-400 bg-white/70 flex items-center justify-center space-x-2"
              title="Protected: Enter Master Admin Password to view Faculty & Admin Accounts & Passwords"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Master Admin Access</span>
            </button>
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
        </div>

        <div className="text-[11px] font-mono text-slate-600 flex items-center space-x-1.5 px-3 py-1 bg-white/70 rounded-lg border border-slate-200/60 shadow-2xs">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span className="font-medium">DepEd Firestore Synced</span>
        </div>
      </div>

      {/* SUB-TAB 1: FACULTY & ADMIN REAL-TIME PASSWORD CONTROL & ACCOUNTS (RESTRICTED TO MASTER ADMIN) */}
      {adminSubTab === 'passwords' && canAccessMasterAdmin && (
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

              <div className="text-xs font-mono text-slate-500">
                Total Active Admins: <span className="text-slate-900 font-bold">{adminList.length}</span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                  <tr>
                    <th className="p-3">Admin Name</th>
                    <th className="p-3">Email Address</th>
                    <th className="p-3">Designation / Role</th>
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

                        <td className="p-3 text-slate-600 text-[11px]">{admin.designation}</td>

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

      {/* MASTER ADMIN PASSWORD UNLOCK MODAL */}
      {isMasterAuthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-fadeIn">
            <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-2xl border border-emerald-400/30">
                  <ShieldCheck className="w-5 h-5 text-emerald-300" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-sans">Master Admin Authentication</h3>
                  <p className="text-[11px] text-emerald-200/80 font-mono">Restricted Access Control</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsMasterAuthModalOpen(false);
                  setMasterAuthInput('');
                  setMasterAuthError(null);
                }}
                className="p-1.5 hover:bg-white/10 rounded-xl text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUnlockMasterAdmin} className="p-6 space-y-4">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-mono text-amber-800 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <Lock className="w-3.5 h-3.5 text-amber-600" />
                  <span>Confidential Management Zone</span>
                </div>
                <p className="text-[11px] text-amber-700">
                  The Faculty & Admin Accounts & Passwords page is strictly reserved for the Master Admin. Please enter the Master Admin Password to proceed.
                </p>
              </div>

              <div>
                <label className="block text-xs font-mono font-bold text-slate-700 uppercase mb-1.5">
                  Master Admin Password
                </label>
                <div className="relative">
                  <input
                    type={showMasterAuthInput ? 'text' : 'password'}
                    value={masterAuthInput}
                    onChange={(e) => setMasterAuthInput(e.target.value)}
                    placeholder="Enter Master Admin Password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-hidden pr-10"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowMasterAuthInput(!showMasterAuthInput)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showMasterAuthInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {masterAuthError && (
                  <p className="text-xs font-mono text-rose-600 font-bold mt-1.5 flex items-center space-x-1">
                    <span>⚠️ {masterAuthError}</span>
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsMasterAuthModalOpen(false);
                    setMasterAuthInput('');
                    setMasterAuthError(null);
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs rounded-xl cursor-pointer shadow-2xs flex items-center space-x-1.5"
                >
                  <Key className="w-4 h-4 text-emerald-200" />
                  <span>Verify & Unlock</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUB-TAB: FACULTY WORKSPACE FOLDERS (GROUPED BY SURNAME) */}
      {adminSubTab === 'faculty-folders' && (
        <AdminFacultyFoldersDirectory
          facultyList={facultyList}
          facultyFolders={facultyFolders}
          facultyFiles={facultyFiles}
          currentUser={currentUser}
          onDeleteFacultyFolder={onDeleteFacultyFolder}
          onDeleteFacultyFile={onDeleteFacultyFile}
        />
      )}
    </div>
  );
};
