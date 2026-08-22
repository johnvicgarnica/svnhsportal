import React, { useState, useEffect } from 'react';
import {
  Announcement,
  AnnouncementPriority,
  AnnouncementTarget,
  AnnouncementStatus,
  UserProfile,
} from '../types';
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
  Bell,
  Megaphone,
  Pin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle,
  Eye,
  EyeOff,
  Search,
  Filter,
  ExternalLink,
  Calendar,
  User,
  ShieldCheck,
  AlertTriangle,
  Info,
  Sparkles,
  Paperclip,
  X,
  FileText,
  Clock,
  ArrowRight,
  Sliders,
  Key,
  Lock,
  RefreshCw,
  UserPlus,
  UserCheck,
  CheckCircle2,
  Save,
  ShieldAlert,
  XCircle,
  UserX,
} from 'lucide-react';

interface AnnouncementsViewProps {
  announcements: Announcement[];
  currentUser: UserProfile;
  onAddAnnouncement: (announcement: Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditAnnouncement: (id: string, updated: Partial<Announcement>) => void;
  onDeleteAnnouncement: (id: string) => void;
  onTogglePin: (id: string) => void;
  onToggleStatus: (id: string) => void;
  isAdminDemoMode?: boolean;
  setIsAdminDemoMode?: (adminMode: boolean) => void;
  shouldOpenModal?: boolean;
  onModalOpened?: () => void;
  onGoToAdminDashboard?: () => void;
}

export const AnnouncementsView: React.FC<AnnouncementsViewProps> = ({
  announcements,
  currentUser,
  onAddAnnouncement,
  onEditAnnouncement,
  onDeleteAnnouncement,
  onTogglePin,
  onToggleStatus,
  shouldOpenModal,
  onModalOpened,
  onGoToAdminDashboard,
}) => {
  const isAdmin = currentUser.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'board' | 'admin'>('board');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [adminStatusFilter, setAdminStatusFilter] = useState<string>('all');

  // Admin Sub-Section Tab ('announcements' or 'passwords')
  const [adminSubTab, setAdminSubTab] = useState<'announcements' | 'passwords'>('announcements');

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
  const [masterAdminPassword, setMasterAdminPassword] = useState<string>('');
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
    userEmailClean === 'garjohn@deped.gov.ph'
  );

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

  // Handler: Accept Faculty Account Registration Request
  const handleAcceptRequest = (req: { id: string; name: string; email: string; password: string; department?: string }) => {
    const cleanEmail = req.email.toLowerCase();

    // 1. Add to Faculty Directory
    const newMember = {
      id: `f-${Date.now()}`,
      name: req.name,
      email: cleanEmail,
      department: req.department || 'Senior High School Dept.',
    };

    const updatedDir = [...facultyList, newMember];
    setFacultyList(updatedDir);
    saveFacultyToFirestore(updatedDir);

    // 2. Set Custom Password
    if (req.password) {
      const updatedMap = { ...customFacultyPasswords, [cleanEmail]: req.password };
      setCustomFacultyPasswords(updatedMap);
      saveUserPasswordToFirestore(cleanEmail, req.password, 'Faculty');
    }

    // 3. Remove from pending requests
    const updatedRequests = facultyRequests.filter((r) => r.id !== req.id && r.email.toLowerCase() !== cleanEmail);
    setFacultyRequests(updatedRequests);
    deleteFacultyRequestFromFirestore(req.id);

    showToast(`⚡ Faculty Account ACCEPTED! "${req.name}" (${cleanEmail}) is now registered and saved to Firebase.`);
  };

  // Handler: Deny Faculty Account Registration Request
  const handleDenyRequest = (id: string, name: string, email: string) => {
    if (window.confirm(`Are you sure you want to DENY and delete the registration request for "${name}" (${email})?`)) {
      const updatedRequests = facultyRequests.filter((r) => r.id !== id);
      setFacultyRequests(updatedRequests);
      deleteFacultyRequestFromFirestore(id);

      showToast(`Faculty registration request for "${name}" (${email}) DENIED.`);
    }
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

  // Handler: Accept Admin Registration Request
  const handleAcceptAdminRequest = (req: {
    id: string;
    name: string;
    email: string;
    password: string;
    designation?: string;
  }) => {
    const cleanEmail = req.email.toLowerCase();

    // 1. Add to Admin Directory
    const newAdmin = {
      id: `admin-${Date.now()}`,
      name: req.name,
      email: cleanEmail,
      designation: req.designation || 'School Administrator',
    };

    const updatedDir = [...adminList, newAdmin];
    setAdminList(updatedDir);
    saveAdminsToFirestore(updatedDir);

    // 2. Set Custom Admin Password
    if (req.password) {
      const updatedMap = { ...adminPasswords, [cleanEmail]: req.password };
      setAdminPasswords(updatedMap);
      saveUserPasswordToFirestore(cleanEmail, req.password, 'Admin');
    }

    // 3. Remove from pending admin requests
    const updatedRequests = adminRequests.filter((r) => r.id !== req.id && r.email.toLowerCase() !== cleanEmail);
    setAdminRequests(updatedRequests);
    deleteAdminRequestFromFirestore(req.id);

    showToast(`⚡ Admin Account ACCEPTED! "${req.name}" (${cleanEmail}) is now an authorized Administrator and saved to Firebase.`);
  };

  // Handler: Deny Admin Registration Request
  const handleDenyAdminRequest = (id: string, name: string, email: string) => {
    if (window.confirm(`Are you sure you want to DENY and delete the admin application for "${name}" (${email})?`)) {
      const updatedRequests = adminRequests.filter((r) => r.id !== id);
      setAdminRequests(updatedRequests);
      deleteAdminRequestFromFirestore(id);

      showToast(`Admin registration request for "${name}" (${email}) DENIED and removed.`);
    }
  };

  // Handler: Delete/Revoke Registered Admin Account
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

  // Modal for editing an individual faculty password
  const [editingFaculty, setEditingFaculty] = useState<{ name: string; email: string } | null>(null);
  const [individualPasswordInput, setIndividualPasswordInput] = useState<string>('');
  const [showIndividualPassword, setShowIndividualPassword] = useState<boolean>(false);

  // Modal for adding a new faculty member
  const [isAddFacultyOpen, setIsAddFacultyOpen] = useState<boolean>(false);
  const [newFacultyName, setNewFacultyName] = useState<string>('');
  const [newFacultyEmail, setNewFacultyEmail] = useState<string>('');
  const [newFacultyPass, setNewFacultyPass] = useState<string>('');

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

  // Handler: Update Master Admin Credentials (Email & Password)
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

    // Check if email changed
    if (cleanEmail !== masterAdminEmail) {
      setMasterAdminEmail(cleanEmail);
      saveSettingToFirestore('svnhs_admin_email', cleanEmail);
      updatedMsg.push(`Email (${cleanEmail})`);
    }

    // Check if password change was requested
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
      department: 'Senior High School Dept.',
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
    setNewFacultyPass('');
    showToast(`⚡ Faculty account ${cleanEmail} created & password active in real time!`);
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
        message: `✅ AUTHENTICATION SUCCESSFUL! "${cleanEmail}" logged in using ${
          customPass ? 'Individual Custom Password' : 'Master Faculty Password'
        }.`,
      });
    } else {
      setTestResult({
        success: false,
        message: `❌ AUTHENTICATION FAILED! Provided password "${testPassword}" does NOT match required password "${expectedPass}" for ${cleanEmail}.`,
      });
    }
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState<string>('');
  const [formContent, setFormContent] = useState<string>('');
  const [formPriority, setFormPriority] = useState<AnnouncementPriority>('important');
  const [formTarget, setFormTarget] = useState<AnnouncementTarget>('All SHS Faculty');
  const [formStatus, setFormStatus] = useState<AnnouncementStatus>('published');
  const [formIsPinned, setFormIsPinned] = useState<boolean>(false);
  const [formAttachmentName, setFormAttachmentName] = useState<string>('');
  const [formAttachmentUrl, setFormAttachmentUrl] = useState<string>('');

  const openCreateModal = () => {
    if (!isAdmin) {
      alert('Access Denied: Only Department Administrators can post or manage announcements.');
      return;
    }
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

  React.useEffect(() => {
    if (shouldOpenModal) {
      if (isAdmin) {
        openCreateModal();
      } else {
        alert('Access Denied: Posting announcements is restricted to Administrator accounts.');
      }
      onModalOpened?.();
    }
  }, [shouldOpenModal, onModalOpened, isAdmin]);

  const openEditModal = (item: Announcement) => {
    if (!isAdmin) return;
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
    if (!isAdmin) return;
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
        authorRole: currentUser.role === 'Admin' ? 'SHS Department Head / Admin' : 'Faculty Administrator',
        attachmentName: formAttachmentName.trim() || undefined,
        attachmentUrl: formAttachmentUrl.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  // Filtered lists
  const publishedAnnouncements = announcements.filter((a) => a.status === 'published');

  const filteredBoardAnnouncements = publishedAnnouncements.filter((item) => {
    const matchesPriority = selectedPriority === 'all' || item.priority === selectedPriority;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesPriority && matchesSearch;
  });

  const pinnedAnnouncements = filteredBoardAnnouncements.filter((a) => a.isPinned);
  const regularAnnouncements = filteredBoardAnnouncements.filter((a) => !a.isPinned);

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

  return (
    <div className="space-y-6 pb-16 w-full font-sans">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-600 shadow-2xs">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-mono text-slate-900 tracking-tight">
                Important Announcements
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                San Vicente National High School • Directives & Bulletins
              </p>
            </div>
          </div>
        </div>

        {/* Header Banner Right Actions / Count Indicator */}
        <div className="flex items-center space-x-3 w-full md:w-auto justify-between md:justify-end relative z-10">
          {isAdmin && onGoToAdminDashboard ? (
            <button
              onClick={onGoToAdminDashboard}
              className="px-3.5 py-1.5 rounded-xl font-bold font-mono text-xs transition-all flex items-center space-x-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              <span>Admin Dashboard</span>
              <span className="bg-amber-200/80 text-amber-900 text-[9px] px-1.5 py-0.2 rounded font-extrabold uppercase ml-0.5">
                Tab
              </span>
            </button>
          ) : (
            <div className="bg-slate-100 p-1 rounded-xl border border-slate-200 flex items-center space-x-1 font-mono text-xs">
              <div className="px-3.5 py-1.5 rounded-lg font-bold bg-blue-600 text-white shadow-2xs flex items-center space-x-1.5">
                <Bell className="w-3.5 h-3.5" />
                <span>Announcements Board</span>
                <span className="ml-1 bg-blue-100 text-blue-800 px-1.5 py-0.2 rounded text-[10px] font-bold">
                  {publishedAnnouncements.length}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN DASHBOARD VIEW (REMOVED) */}
      {false && (
        <div className="space-y-6 animate-fadeIn">
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

          {/* Admin Sub-Navigation Selector */}
          <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setAdminSubTab('announcements')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  adminSubTab === 'announcements'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }`}
              >
                <Megaphone className="w-3.5 h-3.5" />
                <span>School Bulletins ({announcements.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminSubTab('passwords')}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                  adminSubTab === 'passwords'
                    ? 'bg-amber-600 text-white shadow-2xs'
                    : 'text-amber-800 hover:text-amber-950 hover:bg-amber-100/60'
                }`}
              >
                <Key className="w-3.5 h-3.5 text-amber-500" />
                <span>Faculty & Admin Accounts Management</span>
                {facultyRequests.length + adminRequests.length > 0 ? (
                  <span className="bg-rose-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                    {facultyRequests.length + adminRequests.length} Pending
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[9px] px-1.5 py-0.2 rounded font-bold uppercase">
                    Real-Time
                  </span>
                )}
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-500 flex items-center space-x-1.5 px-2">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Admin Security Panel</span>
            </div>
          </div>

          {/* SUB-TAB 1: ANNOUNCEMENTS MANAGEMENT */}
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

          {/* SUB-TAB 2: FACULTY REAL-TIME PASSWORD SECURITY CONTROL */}
          {adminSubTab === 'passwords' && (
            <div className="space-y-6">

              {/* CARD: Pending Faculty Account Registration Requests */}
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

                  <span className="text-xs font-mono text-emerald-800 font-bold bg-slate-100 px-3 py-1 rounded-xl border border-slate-200">
                    Total Pending: {facultyRequests.length}
                  </span>
                </div>

                {facultyRequests.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono text-xs text-slate-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-2 opacity-80" />
                    <span>No pending faculty registration requests. All faculty accounts are up to date!</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-amber-800 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Faculty Name</th>
                          <th className="p-3">Requested DepEd Email</th>
                          <th className="p-3">Created Password</th>
                          <th className="p-3">Requested Date</th>
                          <th className="p-3 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {facultyRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                <User className="w-3.5 h-3.5 text-amber-600" />
                                <span>{req.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-sans ml-5">
                                {req.department || 'Senior High School Dept.'}
                              </div>
                            </td>

                            <td className="p-3 font-bold text-blue-600">{req.email}</td>

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
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1 cursor-pointer"
                                  title="Accept and Register Account"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-white" />
                                  <span>Accept Account</span>
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
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* CARD: Pending Admin Registration Applications */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-amber-800 uppercase tracking-wider flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Pending Administrator Account Applications</span>
                      {adminRequests.length > 0 && (
                        <span className="bg-amber-500 text-white font-extrabold text-[10px] px-2 py-0.5 rounded-full">
                          {adminRequests.length} ACTION REQUIRED
                        </span>
                      )}
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      New admin access requests. Approving will grant full administrative privileges to the applicant.
                    </p>
                  </div>

                  <div className="text-xs font-mono text-slate-600">
                    Pending Admin Requests: <span className="text-amber-700 font-bold">{adminRequests.length}</span>
                  </div>
                </div>

                {adminRequests.length === 0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono text-xs text-slate-500">
                    ✅ No pending admin account applications. All submitted requests have been reviewed.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left font-mono text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-amber-800 text-[10px] uppercase tracking-wider">
                        <tr>
                          <th className="p-3">Applicant Name & Title</th>
                          <th className="p-3">Official DepEd Email</th>
                          <th className="p-3">Requested Admin Password</th>
                          <th className="p-3">Requested Date</th>
                          <th className="p-3 text-right">Admin Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {adminRequests.map((req) => (
                          <tr key={req.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span>{req.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-sans ml-5">
                                {req.designation || 'School Administrator'}
                              </div>
                            </td>

                            <td className="p-3 font-bold text-blue-600">{req.email}</td>

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
              {/* Header Status Banner */}
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

              {/* Master Password Cards Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* CARD 0: Master Admin Credentials Manager */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
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
                      <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">
                        Master Admin Official Email:
                      </span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="font-mono text-xs font-bold text-slate-900 tracking-wide truncate">
                          {isMasterAdmin ? masterAdminEmail : '•••••••••••• (Master Admin Only)'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t md:border-t-0 md:border-l border-slate-200 pt-2 md:pt-0 md:pl-4">
                      <div>
                        <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">
                          Master Admin Password:
                        </span>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="font-mono text-xs font-bold text-slate-900 tracking-wider">
                            {isMasterAdmin ? (
                              showMasterAdminPassword ? (masterAdminPassword || '••••••••••••') : '••••••••••••'
                            ) : (
                              '•••••••••••• (Master Admin Only)'
                            )}
                          </span>
                        </div>
                      </div>

                      {isMasterAdmin ? (
                        <button
                          type="button"
                          onClick={() => setShowMasterAdminPassword(!showMasterAdminPassword)}
                          className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[11px] font-mono font-bold rounded-lg border border-slate-200 flex items-center space-x-1 cursor-pointer shrink-0"
                        >
                          {showMasterAdminPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          <span>{showMasterAdminPassword ? 'Hide' : 'Show'}</span>
                        </button>
                      ) : (
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-400 text-[10px] font-mono font-bold rounded-lg border border-slate-200 flex items-center space-x-1 shrink-0">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Protected</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Form to Update Master Admin Credentials */}
                  <form onSubmit={handleUpdateMasterAdminCredentials} className="space-y-4 pt-2">
                    <div className="text-xs font-mono text-amber-800 font-bold flex items-center space-x-1">
                      <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Update Master Admin Email or Password</span>
                    </div>

                    {masterAdminPasswordError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono rounded-xl flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{masterAdminPasswordError}</span>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-slate-600">Master Admin Official Email (@deped.gov.ph)</label>
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-600">New Password (Leave blank to keep current)</label>
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

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-600">Confirm New Password</label>
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

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-mono text-slate-500">
                        * Saves directly to Firebase Firestore (`svnhs_admin_email` & `svnhs_admin_password`).
                      </span>

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

                {/* CARD 1: Master Faculty Password Manager */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center space-x-2">
                      <Lock className="w-4 h-4 text-amber-600" />
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
                      <span className="text-[10px] font-mono text-slate-500 block uppercase font-bold">
                        Current Master Faculty Password:
                      </span>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="font-mono text-sm font-bold text-amber-800 tracking-wider">
                          {isMasterAdmin ? (
                            showMasterPassword ? masterPassword : '••••••••••••'
                          ) : (
                            '•••••••••••• (Master Admin Only)'
                          )}
                        </span>
                      </div>
                    </div>

                    {isMasterAdmin ? (
                      <button
                        type="button"
                        onClick={() => setShowMasterPassword(!showMasterPassword)}
                        className="px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded-lg border border-slate-200 flex items-center space-x-1.5 cursor-pointer"
                      >
                        {showMasterPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        <span>{showMasterPassword ? 'Hide' : 'Show Password'}</span>
                      </button>
                    ) : (
                      <span className="px-3 py-1.5 bg-slate-100 text-slate-400 text-xs font-mono font-bold rounded-lg border border-slate-200 flex items-center space-x-1.5">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Protected</span>
                      </span>
                    )}
                  </div>

                  {/* Form to Update Master Password */}
                  <form onSubmit={handleUpdateMasterPassword} className="space-y-4 pt-2">
                    <div className="text-xs font-mono text-slate-700 font-bold flex items-center space-x-1">
                      <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                      <span>Change Master Faculty Password Real-Time</span>
                    </div>

                    {masterPasswordError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-mono rounded-xl flex items-center space-x-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{masterPasswordError}</span>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-600">New Master Password</label>
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

                      <div className="space-y-1">
                        <label className="text-[11px] font-mono text-slate-600">Confirm New Password</label>
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

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-[10px] font-mono text-slate-500">
                        * Applies to all faculty accounts without a custom password override.
                      </span>

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

                {/* CARD 2: Real-Time Password Credential Tester */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider">
                        Live Password Tester
                      </h3>
                    </div>

                    <p className="text-xs text-slate-500 font-mono mt-3">
                      Test any faculty member's active password in real-time to verify login capability.
                    </p>

                    <form onSubmit={handleTestCredentials} className="space-y-3 mt-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                          Faculty Email Address
                        </label>
                        {facultyList.length > 0 ? (
                          <select
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                          >
                            <option value="">-- Select or type faculty email --</option>
                            {facultyList.map((f) => (
                              <option key={f.id} value={f.email}>
                                {f.name} ({f.email})
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="email"
                            value={testEmail}
                            onChange={(e) => setTestEmail(e.target.value)}
                            placeholder="e.g. teacher@deped.gov.ph"
                            required
                            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        )}
                      </div>

                      <div className="space-y-1">
                        <label className="text-[10px] font-mono uppercase text-slate-600 font-bold">
                          Enter Password To Test
                        </label>
                        <input
                          type="password"
                          value={testPassword}
                          onChange={(e) => setTestPassword(e.target.value)}
                          placeholder="Type password..."
                          required
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-mono"
                        />
                      </div>

                      <button
                        type="submit"
                        className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-bold text-xs rounded-xl border border-slate-200 transition-all flex items-center justify-center space-x-2 cursor-pointer"
                      >
                        <UserCheck className="w-4 h-4 text-blue-600" />
                        <span>Test Credentials Live</span>
                      </button>
                    </form>

                    {/* Test Result Display */}
                    {testResult && (
                      <div
                        className={`mt-3 p-3 rounded-xl border text-xs font-mono ${
                          testResult.success
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                            : 'bg-rose-50 border-rose-200 text-rose-800'
                        }`}
                      >
                        {testResult.message}
                      </div>
                    )}
                  </div>

                  <div className="text-[10px] font-mono text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-center">
                    🔒 Verification matches exact logic used by Faculty Login Screen.
                  </div>
                </div>

              </div>

              {/* CARD 3: Faculty Accounts Directory & Individual Passwords Table */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>SHS Faculty Account Directory & Custom Passwords</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Assign custom individual passwords to specific faculty email accounts or reset them to Master Password.
                    </p>
                  </div>

                  <div className="flex items-center space-x-3">
                    {isMasterAdmin ? (
                      <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold flex items-center space-x-1 shadow-2xs">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Master Admin Access</span>
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 text-[10px] px-2.5 py-1 rounded-lg font-mono font-bold flex items-center space-x-1 shadow-2xs">
                        <Lock className="w-3.5 h-3.5 text-amber-600" />
                        <span>Passwords Hidden (Master Admin Only)</span>
                      </span>
                    )}

                    <div className="text-xs font-mono text-slate-500">
                      Total Registered Faculty: <span className="text-slate-900 font-bold">{facultyList.length}</span>
                    </div>
                  </div>
                </div>

                {/* Faculty Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Faculty Name & Dept</th>
                        <th className="p-3">Official DepEd Email</th>
                        <th className="p-3">Password Type</th>
                        <th className="p-3">Active Password</th>
                        <th className="p-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {facultyList.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                            No faculty accounts registered yet. Click <span className="text-blue-600 font-bold">"Add Faculty Account"</span> above to create new faculty logins.
                          </td>
                        </tr>
                      ) : (
                        facultyList.map((f) => {
                          const emailKey = f.email.toLowerCase();
                          const customPass = customFacultyPasswords[emailKey];
                          const isCustom = Boolean(customPass);

                          return (
                            <tr key={f.id} className="hover:bg-slate-50 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">{f.name}</div>
                                <div className="text-[10px] text-slate-500 font-sans">{f.department}</div>
                              </td>

                              <td className="p-3 text-blue-600 font-bold">{f.email}</td>

                              <td className="p-3">
                                {isCustom ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                    Custom Override
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    Master Password
                                  </span>
                                )}
                              </td>

                              <td className="p-3 font-mono font-bold">
                                {isMasterAdmin ? (
                                  <span className="text-amber-800">
                                    {isCustom ? customPass : `${masterPassword} (Master)`}
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-medium text-[11px] flex items-center space-x-1" title="Only Master Admin can view active faculty passwords">
                                    <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span>•••••••• (Master Admin Only)</span>
                                  </span>
                                )}
                              </td>

                              <td className="p-3 text-right">
                                <div className="flex items-center justify-end space-x-2">
                                  {isMasterAdmin ? (
                                    <button
                                      onClick={() => {
                                        setEditingFaculty({ name: f.name, email: f.email });
                                        setIndividualPasswordInput(customPass || masterPassword);
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
                                      title="Reset to Master Password"
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
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* CARD: Authorized System Administrators Directory */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-xs font-mono font-bold text-slate-900 uppercase tracking-wider flex items-center space-x-2">
                      <ShieldCheck className="w-4 h-4 text-amber-600" />
                      <span>Authorized System Administrators Directory</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      Registered admin accounts with full portal management access. Click the trash bin icon to revoke or delete an administrator account.
                    </p>
                  </div>

                  <div className="text-xs font-mono text-slate-500">
                    Total Registered Admins: <span className="text-slate-900 font-bold">{adminList.length}</span>
                  </div>
                </div>

                {/* Admins Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left font-mono text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] uppercase tracking-wider">
                      <tr>
                        <th className="p-3">Admin Name & Title</th>
                        <th className="p-3">Official DepEd Email</th>
                        <th className="p-3">Access Level</th>
                        <th className="p-3">Active Password</th>
                        <th className="p-3 text-right">Delete Account</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {adminList.map((a) => {
                        const emailKey = a.email.toLowerCase();
                        const isMaster = emailKey === masterAdminEmail.toLowerCase() || emailKey === 'johnvic.garnica@deped.gov.ph';
                        const customPass = adminPasswords[emailKey];

                        return (
                          <tr key={a.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3">
                              <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                                <span>{a.name}</span>
                              </div>
                              <div className="text-[10px] text-slate-500 font-sans ml-5">{a.designation}</div>
                            </td>

                            <td className="p-3 text-blue-600 font-bold">{a.email}</td>

                            <td className="p-3">
                              {isMaster ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-500 text-white">
                                  Master Admin
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                  System Admin
                                </span>
                              )}
                            </td>

                            <td className="p-3 font-mono font-bold">
                              {isMasterAdmin ? (
                                <span className="text-amber-800">
                                  {customPass || 'DepEd Admin Password'}
                                </span>
                              ) : (
                                <span className="text-slate-400 font-medium text-[11px] flex items-center space-x-1" title="Only Master Admin can view admin passwords">
                                  <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>•••••••• (Master Admin Only)</span>
                                </span>
                              )}
                            </td>

                            <td className="p-3 text-right">
                              {isMaster ? (
                                <span className="text-[10px] text-slate-400 italic">Protected</span>
                              ) : (
                                <button
                                  onClick={() => handleDeleteAdmin(a.id, a.name, a.email)}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg border border-rose-200 transition-all cursor-pointer flex items-center space-x-1 ml-auto"
                                  title="Delete / Revoke Admin Account"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                                  <span className="text-[10px]">Delete</span>
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
            </div>
          )}
        </div>
      )}

      {/* ANNOUNCEMENTS BOARD VIEW (ALL USERS) */}
      <div className="space-y-6">
          {/* Search & Priority Category Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Priority Filters */}
            <div className="flex items-center space-x-1.5 overflow-x-auto scrollbar-none w-full md:w-auto">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mr-1 whitespace-nowrap font-bold">
                Category:
              </span>
              {[
                { id: 'all', label: 'All Announcements' },
                { id: 'urgent', label: 'Urgent Alerts 🚨' },
                { id: 'important', label: 'Important Notices ⚠️' },
                { id: 'event', label: 'Events 📅' },
                { id: 'general', label: 'General Advisories ℹ️' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedPriority(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono transition-all whitespace-nowrap cursor-pointer ${
                    selectedPriority === cat.id
                      ? 'bg-blue-600 text-white font-bold shadow-2xs'
                      : 'bg-slate-100 text-slate-700 hover:text-slate-900 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Search Box & Admin Post Action */}
            <div className="flex items-center space-x-2 w-full md:w-auto">
              {isAdmin && (
                <button
                  onClick={openCreateModal}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-mono font-extrabold text-xs rounded-xl shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer border border-blue-600 shrink-0"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>Post Announcement</span>
                </button>
              )}

              <div className="w-full md:w-64 relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search announcements..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>
          </div>

          {/* PINNED ANNOUNCEMENTS SPOTLIGHT CAROUSEL / SECTION */}
          {pinnedAnnouncements.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center space-x-2 text-amber-700 font-mono text-xs font-bold uppercase tracking-wider">
                <Pin className="w-4 h-4 text-amber-600 fill-amber-500" />
                <span>Pinned High-Priority Directives</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedAnnouncements.map((item) => (
                  <div
                    key={item.id}
                    className="bg-amber-50/40 border-2 border-amber-300 rounded-2xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between space-y-4 hover:border-amber-400 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        {getPriorityBadge(item.priority)}
                        <div className="flex items-center space-x-1.5 text-[10px] font-mono text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Pin className="w-3 h-3 text-amber-600 fill-amber-500" />
                          <span>PINNED</span>
                        </div>
                      </div>

                      <h3 className="text-base font-bold text-slate-900 font-mono leading-snug">
                        {item.title}
                      </h3>

                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        {item.content}
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t border-amber-200/80">
                      {item.attachmentName && (
                        <a
                          href={item.attachmentUrl || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-blue-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-mono transition-all font-medium"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                          <span className="truncate max-w-[220px]">{item.attachmentName}</span>
                          <ExternalLink className="w-3 h-3 text-blue-600" />
                        </a>
                      )}

                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500">
                        <div className="flex items-center space-x-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-800">{item.authorName}</span>
                          <span className="text-slate-300">•</span>
                          <span>{item.targetAudience}</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center space-x-1 text-slate-400">
                            <Clock className="w-3 h-3" />
                            <span>{item.createdAt}</span>
                          </div>

                          {isAdmin && (
                            <div className="flex items-center space-x-1 border-l border-amber-200 pl-2 ml-1">
                              <button
                                onClick={() => openEditModal(item)}
                                className="p-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-200 cursor-pointer"
                                title="Edit Announcement"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => onTogglePin(item.id)}
                                className="p-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded border border-amber-300 cursor-pointer"
                                title="Unpin"
                              >
                                <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                                    onDeleteAnnouncement(item.id);
                                  }
                                }}
                                className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 cursor-pointer"
                                title="Delete Announcement"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* REGULAR ANNOUNCEMENTS LIST */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-800 font-mono text-xs font-bold uppercase tracking-wider">
                <Bell className="w-4 h-4 text-blue-600" />
                <span>All Department Bulletins & Advisories</span>
              </div>
              <span className="text-xs font-mono text-slate-500">
                Showing {filteredBoardAnnouncements.length} postings
              </span>
            </div>

            {filteredBoardAnnouncements.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center space-y-3 font-mono shadow-xs">
                <Megaphone className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-sm font-bold text-slate-900">No Announcements Found</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  No bulletins match your search criteria or selected priority filter.
                </p>
                <button
                  onClick={() => {
                    setSelectedPriority('all');
                    setSearchQuery('');
                  }}
                  className="px-4 py-2 bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
                >
                  Reset Filters
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {regularAnnouncements.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 hover:border-slate-300 transition-all relative group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        {getPriorityBadge(item.priority)}
                        <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono px-2.5 py-0.5 rounded-md font-semibold">
                          Target: {item.targetAudience}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Posted {item.createdAt}</span>
                      </div>
                    </div>

                    <h3 className="text-base font-bold font-mono text-slate-900 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                      {item.content}
                    </p>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-[11px] font-mono">
                      <div className="flex items-center space-x-2 text-slate-600">
                        <span className="font-bold text-slate-900">{item.authorName}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-slate-500">{item.authorRole}</span>
                      </div>

                      <div className="flex items-center space-x-2">
                        {item.attachmentName && (
                          <a
                            href={item.attachmentUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1.5 bg-slate-50 hover:bg-slate-100 text-blue-700 border border-slate-200 px-3 py-1 rounded-lg text-xs transition-all font-medium"
                          >
                            <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                            <span>{item.attachmentName}</span>
                          </a>
                        )}

                        {/* Admin Quick Action directly on card if admin */}
                        {isAdmin && (
                          <div className="flex items-center space-x-1 border-l border-slate-200 pl-2 ml-2">
                            <button
                              onClick={() => openEditModal(item)}
                              className="p-1 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded border border-slate-200 cursor-pointer"
                              title="Edit"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onTogglePin(item.id)}
                              className="p-1 bg-slate-50 hover:bg-slate-100 text-amber-700 rounded border border-slate-200 cursor-pointer"
                              title={item.isPinned ? 'Unpin' : 'Pin to Top'}
                            >
                              <Pin className={`w-3 h-3 ${item.isPinned ? 'text-amber-600 fill-amber-500' : ''}`} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm(`Are you sure you want to delete "${item.title}"?`)) {
                                  onDeleteAnnouncement(item.id);
                                }
                              }}
                              className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-200 cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      {/* CREATE / EDIT ANNOUNCEMENT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full p-6 shadow-xl relative space-y-5 text-slate-800 font-sans max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center space-x-2.5 font-mono">
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-600">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingId ? 'Edit Department Announcement' : 'Post New Department Announcement'}
                  </h3>
                  <p className="text-xs text-slate-500 font-sans">
                    Visible to faculty and staff on the SVNHS SHS Department Portal
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4 font-mono text-xs">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-slate-600 block uppercase tracking-wider font-bold text-[10px]">
                  Announcement Headline / Title *
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="e.g. 🚨 URGENT: Q3 Daily Lesson Logs (DLL) Submission Deadline"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>

              {/* Priority & Target Audience */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-600 block uppercase tracking-wider font-bold text-[10px]">
                    Priority Classification
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as AnnouncementPriority)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="urgent">🚨 Urgent Alert</option>
                    <option value="important">⚠️ Important Notice</option>
                    <option value="event">📅 School Event</option>
                    <option value="general">ℹ️ General Advisory</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-600 block uppercase tracking-wider font-bold text-[10px]">
                    Target Audience
                  </label>
                  <select
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value as AnnouncementTarget)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="All SHS Faculty">All SHS Faculty</option>
                    <option value="Grade 11 Teachers">Grade 11 Teachers</option>
                    <option value="Grade 12 Teachers">Grade 12 Teachers</option>
                    <option value="All Staff & Students">All Staff & Students</option>
                    <option value="Department Heads">Department Heads</option>
                  </select>
                </div>
              </div>

              {/* Status & Pin */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="space-y-1">
                  <label className="text-slate-600 block uppercase tracking-wider font-bold text-[10px]">
                    Publishing Status
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as AnnouncementStatus)}
                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:border-blue-500 font-bold"
                  >
                    <option value="published">Published (Visible on Board)</option>
                    <option value="draft">Draft (Saved in Admin)</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>

                <div className="flex items-center pt-4">
                  <label className="flex items-center space-x-2 text-slate-800 font-bold cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={formIsPinned}
                      onChange={(e) => setFormIsPinned(e.target.checked)}
                      className="w-4 h-4 rounded bg-white border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="flex items-center space-x-1">
                      <Pin className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
                      <span>Pin to Top Spotlight Carousel</span>
                    </span>
                  </label>
                </div>
              </div>

              {/* Content Description */}
              <div className="space-y-1">
                <label className="text-slate-600 block uppercase tracking-wider font-bold text-[10px]">
                  Announcement Details & Directives *
                </label>
                <textarea
                  rows={4}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Provide comprehensive details, instructions, deadlines, or guidance for the faculty..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                />
              </div>

              {/* Optional Attachment */}
              <div className="space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <label className="text-slate-600 uppercase tracking-wider font-bold text-[10px] flex items-center space-x-1">
                  <Paperclip className="w-3.5 h-3.5 text-blue-600" />
                  <span>Optional Document / Link Attachment</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formAttachmentName}
                    onChange={(e) => setFormAttachmentName(e.target.value)}
                    placeholder="Attachment Name (e.g. DepEd_Advisory_042.pdf)"
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <input
                    type="text"
                    value={formAttachmentUrl}
                    onChange={(e) => setFormAttachmentUrl(e.target.value)}
                    placeholder="URL (e.g. Google Drive Link)"
                    className="bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                <div>
                  {editingId && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete this announcement?`)) {
                          onDeleteAnnouncement(editingId);
                          setIsModalOpen(false);
                        }
                      }}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl border border-rose-200 font-bold cursor-pointer flex items-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                      <span>Delete</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-2xs transition-all border border-blue-600 cursor-pointer flex items-center space-x-1.5"
                  >
                    <Megaphone className="w-4 h-4 text-white" />
                    <span>{editingId ? 'Save Changes' : 'Publish Announcement'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT INDIVIDUAL FACULTY PASSWORD */}
      {editingFaculty && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-amber-700">
                <Key className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">Set Custom Password</h3>
              </div>
              <button
                onClick={() => setEditingFaculty(null)}
                className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-1">
              <div>Faculty Member: <span className="font-bold text-slate-900">{editingFaculty.name}</span></div>
              <div>DepEd Email: <span className="font-bold text-blue-600">{editingFaculty.email}</span></div>
            </div>

            <form onSubmit={handleSaveIndividualPassword} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">New Custom Password</label>
                <div className="relative">
                  <input
                    type={showIndividualPassword ? 'text' : 'password'}
                    value={individualPasswordInput}
                    onChange={(e) => setIndividualPasswordInput(e.target.value)}
                    placeholder="Enter custom password..."
                    required
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowIndividualPassword(!showIndividualPassword)}
                    className="absolute right-3 top-3 text-slate-400 hover:text-slate-800"
                  >
                    {showIndividualPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingFaculty(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer transition-all flex items-center space-x-1"
                >
                  <Save className="w-4 h-4 text-white" />
                  <span>Save Password Real-Time</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW FACULTY ACCOUNT */}
      {isAddFacultyOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2 text-blue-600">
                <UserPlus className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">Add New Faculty Account</h3>
              </div>
              <button
                onClick={() => setIsAddFacultyOpen(false)}
                className="p-1 hover:bg-slate-100 text-slate-500 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddFaculty} className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Faculty Full Name</label>
                <input
                  type="text"
                  value={newFacultyName}
                  onChange={(e) => setNewFacultyName(e.target.value)}
                  placeholder="e.g. Maria Clara Santos"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">DepEd Email Address</label>
                <input
                  type="email"
                  value={newFacultyEmail}
                  onChange={(e) => setNewFacultyEmail(e.target.value)}
                  placeholder="e.g. santos.mariaclara@deped.gov.ph"
                  required
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Initial Password (Optional)</label>
                <input
                  type="text"
                  value={newFacultyPass}
                  onChange={(e) => setNewFacultyPass(e.target.value)}
                  placeholder="Leave empty to use Master Password"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-500 font-mono"
                />
                <span className="text-[10px] text-slate-500 block">
                  * If left blank, defaults to current Master Faculty Password ({masterPassword}).
                </span>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddFacultyOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-2xs cursor-pointer transition-all flex items-center space-x-1"
                >
                  <UserPlus className="w-4 h-4 text-white" />
                  <span>Create Account Real-Time</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
