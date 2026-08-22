import React, { useState, useEffect, useMemo } from 'react';
import { UserProfile, FacultyFolder } from '../types';
import {
  subscribeFaculty,
  subscribeFacultySubmissions,
  saveFacultySubmissionToFirestore,
  batchSaveFacultySubmissionsToFirestore,
  saveWeekDataToFirestore,
  getStoredFacultySubmissions,
  extractFacultySurname,
  FacultyDoc,
  SubmissionCategory,
  TermWeeksConfig,
  DEFAULT_TERM_WEEKS_CONFIG,
  MAX_TERM_WEEKS,
  MIN_TERM_WEEKS,
  getStoredTermWeeksConfig,
  saveTermWeeksConfigToFirestore,
  subscribeTermWeeksConfig,
  getStoredActiveTermId,
  saveActiveTermIdToFirestore,
  subscribeActiveTermId,
} from '../lib/firebase';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts';
import {
  FileCheck2,
  CheckSquare,
  Square,
  Search,
  Download,
  Calendar,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  BarChart3,
  RefreshCw,
  Sparkles,
  ChevronDown,
  Building2,
  Check,
  Copy,
  Layers,
  Save,
  Cloud,
  ShieldCheck,
  Eye,
  Lock,
  FileText,
  HelpCircle,
  TrendingUp,
  PieChart as PieChartIcon,
  SlidersHorizontal,
  Plus,
  Minus,
  X,
  CalendarDays,
  Settings,
  Star,
  BookmarkCheck,
  LogOut,
  ArrowLeft,
} from 'lucide-react';

interface SubmissionReportViewProps {
  currentUser: UserProfile;
  facultyFolders?: FacultyFolder[];
}

export interface TermDefinition {
  id: string;
  name: string;
  description: string;
  weeks?: number;
}

export const BASE_TERMS: TermDefinition[] = [
  { id: 'term-1', name: '1st Term', description: 'Weeks 1 to 11' },
  { id: 'term-2', name: '2nd Term', description: 'Weeks 1 to 11' },
  { id: 'term-3', name: '3rd Term', description: 'Weeks 1 to 11' },
];

export interface CategoryDefinition {
  id: SubmissionCategory;
  name: string;
  fullName: string;
  shortDescription: string;
  icon: string;
  badgeColor: string;
  activeBg: string;
  borderColor: string;
  itemType: 'weekly' | 'terms';
}

export const CATEGORIES: CategoryDefinition[] = [
  {
    id: 'dll',
    name: 'DLL',
    fullName: 'Daily Lesson Log',
    shortDescription: 'Weekly instructional lesson logs and teaching deliverables per term',
    icon: '📝',
    badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
    activeBg: 'bg-blue-600 text-white',
    borderColor: 'border-blue-500',
    itemType: 'weekly',
  },
  {
    id: 'tos',
    name: 'TOS',
    fullName: 'Table of Specifications',
    shortDescription: 'Assessment blueprints & competency matrices for Term 1 TOS, Term 2 TOS, and Term 3 TOS',
    icon: '📊',
    badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
    activeBg: 'bg-purple-600 text-white',
    borderColor: 'border-purple-500',
    itemType: 'terms',
  },
  {
    id: 'tq',
    name: 'TQ',
    fullName: 'Test Questions',
    shortDescription: 'Summative & periodic exam questionnaires for Term 1 TQ, Term 2 TQ, and Term 3 TQ',
    icon: '📑',
    badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    activeBg: 'bg-emerald-600 text-white',
    borderColor: 'border-emerald-500',
    itemType: 'terms',
  },
];

export const SubmissionReportView: React.FC<SubmissionReportViewProps> = ({
  currentUser,
  facultyFolders = [],
}) => {
  // Check if current user has administrator role
  const isAdmin =
    currentUser.role === 'Admin' ||
    (currentUser as any).isAdmin === true ||
    currentUser.role?.toLowerCase() === 'admin';

  // Navigation & Category States
  const [activeCategory, setActiveCategory] = useState<SubmissionCategory>('dll');
  const [activeDefaultTermId, setActiveDefaultTermId] = useState<string>(() => getStoredActiveTermId());
  const [selectedTermId, setSelectedTermId] = useState<string>(() => getStoredActiveTermId());
  const [isSettingActiveTerm, setIsSettingActiveTerm] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'complete' | 'in-progress' | 'none'>('all');
  const [viewMode, setViewMode] = useState<'faculty-chart' | 'weekly-chart' | 'pie-chart'>('faculty-chart');
  const [facultyPieTab, setFacultyPieTab] = useState<'both' | 'compliance' | 'volume' | 'periods'>('both');
  const [copiedToast, setCopiedToast] = useState<string | null>(null);

  // Term Weeks Configuration (Max 12 weeks per term)
  const [termWeeksConfig, setTermWeeksConfig] = useState<TermWeeksConfig>(() => getStoredTermWeeksConfig());
  const [isSettingWeeksModalOpen, setIsSettingWeeksModalOpen] = useState<boolean>(false);
  const [tempWeeksConfig, setTempWeeksConfig] = useState<TermWeeksConfig>(() => getStoredTermWeeksConfig());
  const [isSavingWeeksConfig, setIsSavingWeeksConfig] = useState<boolean>(false);
  const [isSavingSingleTerm, setIsSavingSingleTerm] = useState<string | null>(null);
  const [savedTermSuccess, setSavedTermSuccess] = useState<Record<string, boolean>>({});
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(true);

  // Persistence / Saving States
  const [isSavingIndex, setIsSavingIndex] = useState<number | null>(null);
  const [isSavingAll, setIsSavingAll] = useState<boolean>(false);
  const [selectedItemToSave, setSelectedItemToSave] = useState<number>(0);
  const [lastSavedTimestamp, setLastSavedTimestamp] = useState<string | null>(null);

  // Registered faculty state
  const [registeredFaculty, setRegisteredFaculty] = useState<FacultyDoc[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Subscribe to real-time term weeks configuration from Firebase
  useEffect(() => {
    const unsub = subscribeTermWeeksConfig((config) => {
      setTermWeeksConfig(config);
    });
    return () => unsub();
  }, []);

  // Subscribe to real-time active default academic term from Firebase
  useEffect(() => {
    const unsub = subscribeActiveTermId((termId) => {
      setActiveDefaultTermId(termId);
    });
    return () => unsub();
  }, []);

  // Compute active term storage ID
  // DLL is per academic term (term-1, term-2, term-3)
  // TOS and TQ are tracked across the 3 terms (Term 1, Term 2, Term 3) in a unified annual document
  const effectiveTermId = activeCategory === 'dll' ? selectedTermId : 'annual';

  // Current active term's configured week count (1 to 12)
  const currentTermWeeks = useMemo(() => {
    if (activeCategory !== 'dll') return 3;
    const count = termWeeksConfig[selectedTermId as keyof TermWeeksConfig];
    return typeof count === 'number' && count >= MIN_TERM_WEEKS && count <= MAX_TERM_WEEKS ? count : 11;
  }, [activeCategory, selectedTermId, termWeeksConfig]);

  // Dynamic list of academic terms with accurate configured weeks
  const termsList: TermDefinition[] = useMemo(() => {
    return [
      { id: 'term-1', name: '1st Term', description: `Weeks 1 to ${termWeeksConfig['term-1'] || 11}`, weeks: termWeeksConfig['term-1'] || 11 },
      { id: 'term-2', name: '2nd Term', description: `Weeks 1 to ${termWeeksConfig['term-2'] || 11}`, weeks: termWeeksConfig['term-2'] || 11 },
      { id: 'term-3', name: '3rd Term', description: `Weeks 1 to ${termWeeksConfig['term-3'] || 11}`, weeks: termWeeksConfig['term-3'] || 11 },
    ];
  }, [termWeeksConfig]);

  // Submissions map: key is facultyEmail, value is boolean array
  const [submissions, setSubmissions] = useState<Record<string, boolean[]>>(() => {
    return getStoredFacultySubmissions(getStoredActiveTermId(), 'dll');
  });

  // Subscribe to faculty list
  useEffect(() => {
    const unsub = subscribeFaculty((list) => {
      setRegisteredFaculty(list || []);
      setIsLoading(false);
    });
    return () => unsub();
  }, []);

  // Subscribe to faculty submissions whenever category or term changes
  useEffect(() => {
    const cached = getStoredFacultySubmissions(effectiveTermId, activeCategory);
    if (Object.keys(cached).length > 0) {
      setSubmissions(cached);
    } else {
      setSubmissions({});
    }

    const unsub = subscribeFacultySubmissions(effectiveTermId, activeCategory, (data) => {
      setSubmissions(data || {});
    });

    return () => unsub();
  }, [effectiveTermId, activeCategory]);

  // Combine registered faculty from Firestore with any unique faculty found in facultyFolders
  const allFaculty = useMemo(() => {
    const map = new Map<string, { id: string; name: string; email: string; department: string; surname: string }>();

    // Add registered faculty from collection
    registeredFaculty.forEach((f) => {
      const email = (f.email || '').toLowerCase().trim();
      if (email) {
        map.set(email, {
          id: f.id || email,
          name: f.name || email.split('@')[0],
          email: email,
          department: f.department || 'Senior High School Dept.',
          surname: extractFacultySurname(f.name || email),
        });
      }
    });

    // Also include any faculty from facultyFolders who might not be in the direct faculty doc list yet
    facultyFolders.forEach((f) => {
      const email = (f.facultyEmail || '').toLowerCase().trim();
      if (email && !map.has(email)) {
        map.set(email, {
          id: `folder-faculty-${email}`,
          name: f.facultyName || email.split('@')[0],
          email: email,
          department: 'Senior High School Dept.',
          surname: f.facultySurname || extractFacultySurname(f.facultyName || email),
        });
      }
    });

    // If still empty (e.g. fresh database before initial sign-in), provide default template faculty for demonstration
    if (map.size === 0) {
      const demoFaculty = [
        { id: 'f-1', name: 'John Vic Garnica', email: 'johnvic.garnica@deped.gov.ph', department: 'TVL / ICT Strand', surname: 'GARNICA' },
        { id: 'f-2', name: 'Maria Santos', email: 'maria.santos@deped.gov.ph', department: 'STEM Strand', surname: 'SANTOS' },
        { id: 'f-3', name: 'Roberto Dela Cruz', email: 'roberto.delacruz@deped.gov.ph', department: 'HUMSS Strand', surname: 'DELA CRUZ' },
        { id: 'f-4', name: 'Elena Bautista', email: 'elena.bautista@deped.gov.ph', department: 'ABM Strand', surname: 'BAUTISTA' },
        { id: 'f-5', name: 'Mark Anthony Reyes', email: 'mark.reyes@deped.gov.ph', department: 'GAS Strand', surname: 'REYES' },
        { id: 'f-6', name: 'Grace Lim', email: 'grace.lim@deped.gov.ph', department: 'Core Academics', surname: 'LIM' },
      ];
      demoFaculty.forEach((d) => map.set(d.email, d));
    }

    const list = Array.from(map.values());
    // Sort alphabetically by surname
    return list.sort((a, b) => a.surname.localeCompare(b.surname));
  }, [registeredFaculty, facultyFolders]);

  // Unique departments for filter
  const departments = useMemo(() => {
    const set = new Set<string>();
    allFaculty.forEach((f) => {
      if (f.department) set.add(f.department);
    });
    return Array.from(set);
  }, [allFaculty]);

  // Category Configuration
  const currentCategory = CATEGORIES.find((c) => c.id === activeCategory) || CATEGORIES[0];
  const isWeeklyCategory = currentCategory.itemType === 'weekly';

  // Dynamic Column Definitions based on category and configured term weeks (1 to 12 max)
  const columnItems = useMemo(() => {
    if (activeCategory === 'dll') {
      return Array.from({ length: currentTermWeeks }, (_, i) => ({
        index: i,
        key: `w-${i + 1}`,
        headerLabel: `W${i + 1}`,
        fullLabel: `Week ${i + 1}`,
        shortLabel: `W${i + 1}`,
        description: `Week ${i + 1} Daily Lesson Log`,
      }));
    } else if (activeCategory === 'tos') {
      return [
        { index: 0, key: 'tos-t1', headerLabel: 'Term 1 TOS', fullLabel: 'Term 1 TOS', shortLabel: 'T1 TOS', description: 'Term 1 Table of Specifications' },
        { index: 1, key: 'tos-t2', headerLabel: 'Term 2 TOS', fullLabel: 'Term 2 TOS', shortLabel: 'T2 TOS', description: 'Term 2 Table of Specifications' },
        { index: 2, key: 'tos-t3', headerLabel: 'Term 3 TOS', fullLabel: 'Term 3 TOS', shortLabel: 'T3 TOS', description: 'Term 3 Table of Specifications' },
      ];
    } else {
      return [
        { index: 0, key: 'tq-t1', headerLabel: 'Term 1 TQ', fullLabel: 'Term 1 TQ', shortLabel: 'T1 TQ', description: 'Term 1 Test Questions' },
        { index: 1, key: 'tq-t2', headerLabel: 'Term 2 TQ', fullLabel: 'Term 2 TQ', shortLabel: 'T2 TQ', description: 'Term 2 Test Questions' },
        { index: 2, key: 'tq-t3', headerLabel: 'Term 3 TQ', fullLabel: 'Term 3 TQ', shortLabel: 'T3 TQ', description: 'Term 3 Test Questions' },
      ];
    }
  }, [activeCategory, currentTermWeeks]);

  const totalItemCount = columnItems.length;

  // Toast Helper
  const showToast = (msg: string) => {
    setCopiedToast(msg);
    setTimeout(() => setCopiedToast(null), 3000);
  };

  // Handle setting official active academic term (Default across all users and page refreshes)
  const handleSetCurrentActiveTerm = async (termIdToSet: string) => {
    if (!isAdmin) return;
    setIsSettingActiveTerm(true);
    try {
      await saveActiveTermIdToFirestore(termIdToSet);
      setActiveDefaultTermId(termIdToSet);
      setSelectedTermId(termIdToSet);
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      const termObj = termsList.find((t) => t.id === termIdToSet);
      const termName = termObj?.name || (termIdToSet === 'term-1' ? '1st Term' : termIdToSet === 'term-2' ? '2nd Term' : '3rd Term');
      showToast(`⭐ ${termName} is now saved in Firebase as the default Current Term on page refresh!`);
    } catch (err) {
      console.error('Error saving current active term:', err);
      showToast('⚠️ Failed to save current term to Firebase');
    } finally {
      setIsSettingActiveTerm(false);
    }
  };

  // Handle saving configured weeks for a specific single term immediately to Firebase
  const handleSaveSingleTermWeeks = async (termId: 'term-1' | 'term-2' | 'term-3', customWeeks?: number) => {
    if (!isAdmin) return;
    setIsSavingSingleTerm(termId);
    try {
      const targetWeeks = customWeeks !== undefined ? customWeeks : (tempWeeksConfig[termId] || 11);
      const sanitizedWeeks = Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(targetWeeks) || 11));
      const updated: TermWeeksConfig = {
        'term-1': termId === 'term-1' ? sanitizedWeeks : (tempWeeksConfig['term-1'] || termWeeksConfig['term-1'] || 11),
        'term-2': termId === 'term-2' ? sanitizedWeeks : (tempWeeksConfig['term-2'] || termWeeksConfig['term-2'] || 11),
        'term-3': termId === 'term-3' ? sanitizedWeeks : (tempWeeksConfig['term-3'] || termWeeksConfig['term-3'] || 11),
      };
      setTempWeeksConfig(updated);
      setTermWeeksConfig(updated);
      await saveTermWeeksConfigToFirestore(updated);
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      
      setSavedTermSuccess((prev) => ({ ...prev, [termId]: true }));
      setTimeout(() => {
        setSavedTermSuccess((prev) => ({ ...prev, [termId]: false }));
      }, 3000);

      const termName = termId === 'term-1' ? '1st Term' : termId === 'term-2' ? '2nd Term' : '3rd Term';
      showToast(`💾 Saved ${termName} to Firebase: ${sanitizedWeeks} Weeks (W1–W${sanitizedWeeks})`);
    } catch (err) {
      console.error(err);
      showToast('⚠️ Failed to save term weeks configuration to Firebase');
    } finally {
      setIsSavingSingleTerm(null);
    }
  };

  // Quick adjustment with optional auto-save to Firebase
  const handleQuickChangeTermWeeks = async (termId: 'term-1' | 'term-2' | 'term-3', newWeeks: number) => {
    if (!isAdmin) return;
    const sanitizedWeeks = Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(newWeeks) || 11));
    const updated: TermWeeksConfig = {
      ...tempWeeksConfig,
      [termId]: sanitizedWeeks,
    };
    setTempWeeksConfig(updated);

    if (autoSaveEnabled) {
      setTermWeeksConfig(updated);
      await saveTermWeeksConfigToFirestore(updated);
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setSavedTermSuccess((prev) => ({ ...prev, [termId]: true }));
      setTimeout(() => {
        setSavedTermSuccess((prev) => ({ ...prev, [termId]: false }));
      }, 2500);
    }
  };

  // Handle saving configured weeks per term (All terms at once)
  const handleSaveWeeksConfiguration = async () => {
    if (!isAdmin) return;
    setIsSavingWeeksConfig(true);
    try {
      const sanitized: TermWeeksConfig = {
        'term-1': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(tempWeeksConfig['term-1']) || 11)),
        'term-2': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(tempWeeksConfig['term-2']) || 11)),
        'term-3': Math.min(MAX_TERM_WEEKS, Math.max(MIN_TERM_WEEKS, Number(tempWeeksConfig['term-3']) || 11)),
      };
      await saveTermWeeksConfigToFirestore(sanitized);
      setTermWeeksConfig(sanitized);
      setTempWeeksConfig(sanitized);
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setIsSettingWeeksModalOpen(false);
      showToast(`⚙️ Number of weeks saved to Firebase! (Term 1: ${sanitized['term-1']}w, Term 2: ${sanitized['term-2']}w, Term 3: ${sanitized['term-3']}w)`);
    } catch (err) {
      console.error(err);
      showToast('⚠️ Failed to save term weeks configuration');
    } finally {
      setIsSavingWeeksConfig(false);
    }
  };

  // Handle single checkbox toggle (Optimistic + Firebase Firestore sync)
  const handleToggleItem = async (facultyEmail: string, itemIndex: number) => {
    if (!isAdmin) return;

    const cleanEmail = facultyEmail.toLowerCase().trim();
    const currentItems = submissions[cleanEmail] ? [...submissions[cleanEmail]] : Array(totalItemCount).fill(false);

    while (currentItems.length < totalItemCount) {
      currentItems.push(false);
    }

    currentItems[itemIndex] = !currentItems[itemIndex];

    const updated = {
      ...submissions,
      [cleanEmail]: currentItems,
    };
    setSubmissions(updated);

    const facultyObj = allFaculty.find((f) => f.email === cleanEmail);
    await saveFacultySubmissionToFirestore(
      effectiveTermId,
      activeCategory,
      cleanEmail,
      currentItems,
      facultyObj?.name,
      facultyObj?.department
    );
    setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Check all items for a single faculty member
  const handleCheckAllItems = async (facultyEmail: string, checkValue: boolean) => {
    if (!isAdmin) return;

    const cleanEmail = facultyEmail.toLowerCase().trim();
    const currentItems = Array(totalItemCount).fill(checkValue);

    const updated = {
      ...submissions,
      [cleanEmail]: currentItems,
    };
    setSubmissions(updated);

    const facultyObj = allFaculty.find((f) => f.email === cleanEmail);
    await saveFacultySubmissionToFirestore(
      effectiveTermId,
      activeCategory,
      cleanEmail,
      currentItems,
      facultyObj?.name,
      facultyObj?.department
    );
    setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
  };

  // Save data for a specific column/term/week to Firebase Firestore
  const handleSaveItemToFirebase = async (itemIndex: number) => {
    if (!isAdmin) return;
    setIsSavingIndex(itemIndex);
    const itemObj = columnItems[itemIndex];
    try {
      await saveWeekDataToFirestore(
        effectiveTermId,
        activeCategory,
        itemIndex,
        submissions,
        allFaculty.map((f) => ({ email: f.email, name: f.name, department: f.department }))
      );
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast(`☁️ ${itemObj?.fullLabel} data saved to Firebase Firestore for retention!`);
    } catch (e) {
      console.error(e);
      showToast(`⚠️ Error saving ${itemObj?.fullLabel} data to Firebase`);
    } finally {
      setIsSavingIndex(null);
    }
  };

  // Save all items for the current category to Firebase
  const handleSaveAllToFirebase = async () => {
    if (!isAdmin) return;
    setIsSavingAll(true);
    try {
      await batchSaveFacultySubmissionsToFirestore(effectiveTermId, activeCategory, submissions);
      setLastSavedTimestamp(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      showToast(`☁️ All ${currentCategory.name} records saved to Firebase Firestore successfully!`);
    } catch (e) {
      console.error(e);
      showToast('⚠️ Error saving submission data to Firebase');
    } finally {
      setIsSavingAll(false);
    }
  };

  // Filtered faculty list
  const filteredFaculty = useMemo(() => {
    return allFaculty.filter((f) => {
      const matchSearch =
        f.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.surname.toLowerCase().includes(searchTerm.toLowerCase());

      const matchDept = departmentFilter === 'all' || f.department === departmentFilter;

      const items = submissions[f.email] || Array(totalItemCount).fill(false);
      const visibleSlice = items.slice(0, totalItemCount);
      const count = visibleSlice.filter(Boolean).length;

      let matchStatus = true;
      if (statusFilter === 'complete') matchStatus = count === totalItemCount;
      else if (statusFilter === 'in-progress') matchStatus = count > 0 && count < totalItemCount;
      else if (statusFilter === 'none') matchStatus = count === 0;

      return matchSearch && matchDept && matchStatus;
    });
  }, [allFaculty, searchTerm, departmentFilter, statusFilter, submissions, totalItemCount]);

  // Calculate Progress Stats
  const stats = useMemo(() => {
    const totalPossible = allFaculty.length * totalItemCount;
    let totalCompleted = 0;
    let completedFacultyCount = 0;
    let inProgressFacultyCount = 0;
    let noSubmissionFacultyCount = 0;

    allFaculty.forEach((f) => {
      const items = submissions[f.email] || Array(totalItemCount).fill(false);
      const visibleSlice = items.slice(0, totalItemCount);
      const count = visibleSlice.filter(Boolean).length;
      totalCompleted += count;
      if (count === totalItemCount) completedFacultyCount++;
      else if (count > 0) inProgressFacultyCount++;
      else noSubmissionFacultyCount++;
    });

    const overallPercentage =
      totalPossible > 0 ? Math.round((totalCompleted / totalPossible) * 100) : 0;

    return {
      totalFaculty: allFaculty.length,
      totalPossible,
      totalCompleted,
      completedFacultyCount,
      inProgressFacultyCount,
      noSubmissionFacultyCount,
      overallPercentage,
    };
  }, [allFaculty, submissions, totalItemCount]);

  // My personal submission status (for registered faculty)
  const myStatus = useMemo(() => {
    const userEmail = (currentUser.email || '').toLowerCase().trim();
    const items = submissions[userEmail] || Array(totalItemCount).fill(false);
    const visibleSlice = items.slice(0, totalItemCount);
    const count = visibleSlice.filter(Boolean).length;
    const pct = Math.round((count / totalItemCount) * 100);
    return {
      itemsSubmitted: count,
      totalItems: totalItemCount,
      percentage: pct,
      items: visibleSlice,
    };
  }, [currentUser, submissions, totalItemCount]);

  // Chart Data: Progress per Faculty
  const facultyChartData = useMemo(() => {
    return filteredFaculty.map((f) => {
      const items = submissions[f.email] || Array(totalItemCount).fill(false);
      const visibleSlice = items.slice(0, totalItemCount);
      const submittedCount = visibleSlice.filter(Boolean).length;
      const percentage = Math.round((submittedCount / totalItemCount) * 100);

      return {
        name: f.surname || f.name.split(' ')[0],
        fullName: f.name,
        email: f.email,
        department: f.department,
        submittedCount: submittedCount,
        totalItems: totalItemCount,
        percentage: percentage,
      };
    });
  }, [filteredFaculty, submissions, totalItemCount]);

  // Chart Data: Column Compliance Trend (Weeks or Term 1/2/3)
  const trendChartData = useMemo(() => {
    return columnItems.map((col) => {
      let count = 0;
      allFaculty.forEach((f) => {
        const items = submissions[f.email] || Array(totalItemCount).fill(false);
        if (items[col.index]) count++;
      });
      const pct = allFaculty.length > 0 ? Math.round((count / allFaculty.length) * 100) : 0;
      return {
        itemLabel: col.fullLabel,
        shortLabel: col.headerLabel,
        submittedCount: count,
        totalFaculty: allFaculty.length,
        percentage: pct,
      };
    });
  }, [allFaculty, submissions, columnItems, totalItemCount]);

  // Pie Chart Dataset 1: Overall Department Compliance Status Distribution
  const compliancePieData = useMemo(() => {
    const data = [
      {
        name: '100% Fully Compliant',
        shortName: 'Completed',
        value: stats.completedFacultyCount,
        color: '#10B981', // Emerald 500
        percentage: stats.totalFaculty > 0 ? Math.round((stats.completedFacultyCount / stats.totalFaculty) * 100) : 0,
        description: `Submitted all ${totalItemCount} ${isWeeklyCategory ? 'weeks' : 'terms'}`,
      },
      {
        name: 'In Progress (Partial)',
        shortName: 'In Progress',
        value: stats.inProgressFacultyCount,
        color: '#F59E0B', // Amber 500
        percentage: stats.totalFaculty > 0 ? Math.round((stats.inProgressFacultyCount / stats.totalFaculty) * 100) : 0,
        description: `Submitted 1 to ${Math.max(1, totalItemCount - 1)} ${isWeeklyCategory ? 'weeks' : 'terms'}`,
      },
      {
        name: 'Not Started / Pending',
        shortName: 'Pending',
        value: stats.noSubmissionFacultyCount,
        color: '#94A3B8', // Slate 400
        percentage: stats.totalFaculty > 0 ? Math.round((stats.noSubmissionFacultyCount / stats.totalFaculty) * 100) : 0,
        description: `0 ${isWeeklyCategory ? 'weeks' : 'terms'} recorded`,
      },
    ];

    // Filter out 0 values for clean pie chart display unless all are 0
    const nonZero = data.filter((d) => d.value > 0);
    return nonZero.length > 0 ? nonZero : data;
  }, [stats, totalItemCount, isWeeklyCategory]);

  // Pie Chart Dataset 2: Deliverables Volume (Submitted vs Pending items)
  const volumePieData = useMemo(() => {
    const pendingItems = Math.max(0, stats.totalPossible - stats.totalCompleted);
    return [
      {
        name: 'Submitted Deliverables',
        shortName: 'Submitted',
        value: stats.totalCompleted,
        color: '#3B82F6', // Blue 500
        percentage: stats.overallPercentage,
        description: `Recorded deliverables across the department`,
      },
      {
        name: 'Pending Deliverables',
        shortName: 'Pending',
        value: pendingItems,
        color: '#E2E8F0', // Slate 200
        percentage: 100 - stats.overallPercentage,
        description: `Deliverables awaiting submission`,
      },
    ];
  }, [stats]);

  // Pie Chart Dataset 3: Deliverable Distribution by Period (Weeks or Terms)
  const periodDistributionPieData = useMemo(() => {
    const COLOR_PALETTE = [
      '#3B82F6', // blue
      '#6366F1', // indigo
      '#8B5CF6', // purple
      '#A855F7', // fuchsia
      '#EC4899', // pink
      '#F43F5E', // rose
      '#F97316', // orange
      '#F59E0B', // amber
      '#10B981', // emerald
      '#14B8A6', // teal
      '#06B6D4', // cyan
    ];

    return trendChartData.map((col, idx) => ({
      name: col.shortLabel,
      fullName: col.itemLabel,
      value: col.submittedCount,
      totalFaculty: col.totalFaculty,
      percentage: col.percentage,
      color: COLOR_PALETTE[idx % COLOR_PALETTE.length],
    }));
  }, [trendChartData]);

  // Export to CSV (Privacy aware)
  const handleExportCSV = () => {
    if (!isAdmin) {
      // In Faculty Mode, export aggregate department summary & personal status only
      const headers = [
        'Category',
        'Period',
        'Total Registered Teachers',
        'Overall Compliance %',
        '100% Completed Teachers',
        'In Progress Teachers',
        'Pending Teachers',
        'Total Deliverables Submitted',
        'Total Deliverables Target',
        'My Personal Submissions',
        'My Personal Compliance %',
      ];
      const row = [
        `"${currentCategory.name}"`,
        `"${effectiveTermId}"`,
        stats.totalFaculty,
        `"${stats.overallPercentage}%"`,
        stats.completedFacultyCount,
        stats.inProgressFacultyCount,
        stats.noSubmissionFacultyCount,
        stats.totalCompleted,
        stats.totalPossible,
        `"${myStatus.itemsSubmitted}/${totalItemCount}"`,
        `"${myStatus.percentage}%"`,
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), row.join(',')].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute(
        'download',
        `SVNHS_SHS_${activeCategory.toUpperCase()}_Summary_Report_${effectiveTermId}_${new Date()
          .toISOString()
          .substring(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`📊 ${currentCategory.name} Aggregate Summary Report downloaded!`);
      return;
    }

    // Admin full export
    const headers = [
      'Category',
      'Term/Period',
      'Surname',
      'Full Name',
      'Email',
      'Department',
      ...columnItems.map((col) => col.fullLabel),
      `Total Completed (of ${totalItemCount})`,
      'Completion %',
    ];
    const rows = allFaculty.map((f) => {
      const items = submissions[f.email] || Array(totalItemCount).fill(false);
      const visibleSlice = items.slice(0, totalItemCount);
      const count = visibleSlice.filter(Boolean).length;
      const pct = Math.round((count / totalItemCount) * 100);
      const cols = visibleSlice.map((w) => (w ? 'SUBMITTED' : 'PENDING'));
      return [
        `"${currentCategory.name}"`,
        `"${effectiveTermId}"`,
        `"${f.surname}"`,
        `"${f.name}"`,
        `"${f.email}"`,
        `"${f.department}"`,
        ...cols,
        count,
        `${pct}%`,
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `SVNHS_SHS_${activeCategory.toUpperCase()}_Submission_Report_${effectiveTermId}_${new Date()
        .toISOString()
        .substring(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`📊 ${currentCategory.name} CSV Report downloaded!`);
  };

  // Copy Summary to Clipboard (Privacy aware)
  const handleCopySummary = () => {
    if (!isAdmin) {
      // In Faculty Mode, copy only aggregate summary without colleague names
      const summaryText =
        `SVNHS SHS DEPARTMENT - ${currentCategory.fullName.toUpperCase()} (${currentCategory.name}) SUBMISSION OVERVIEW\n` +
        `Period: ${isWeeklyCategory ? termsList.find((t) => t.id === selectedTermId)?.name + ` (Weeks 1 to ${currentTermWeeks})` : 'All Terms (Term 1, Term 2, Term 3)'}\n` +
        `Total Faculty Members: ${stats.totalFaculty}\n` +
        `Overall Compliance: ${stats.overallPercentage}%\n` +
        `100% Completed: ${stats.completedFacultyCount} / ${stats.totalFaculty} (${Math.round((stats.completedFacultyCount / (stats.totalFaculty || 1)) * 100)}%)\n` +
        `In Progress: ${stats.inProgressFacultyCount} / ${stats.totalFaculty}\n` +
        `Pending/Not Started: ${stats.noSubmissionFacultyCount} / ${stats.totalFaculty}\n` +
        `Total Deliverables Submitted: ${stats.totalCompleted} / ${stats.totalPossible}\n\n` +
        `My Personal Status (${currentUser.name}): ${myStatus.itemsSubmitted} / ${totalItemCount} (${myStatus.percentage}%)\n`;
      navigator.clipboard.writeText(summaryText);
      showToast(`📋 ${currentCategory.name} Summary copied to clipboard!`);
      return;
    }

    const summaryText =
      `SVNHS SHS DEPARTMENT - ${currentCategory.fullName.toUpperCase()} (${currentCategory.name}) SUBMISSION REPORT\n` +
      `Period: ${isWeeklyCategory ? termsList.find((t) => t.id === selectedTermId)?.name + ` (Weeks 1 to ${currentTermWeeks})` : 'All Terms (Term 1, Term 2, Term 3)'}\n` +
      `Total Faculty: ${stats.totalFaculty}\n` +
      `Overall Compliance: ${stats.overallPercentage}%\n` +
      `100% Completed: ${stats.completedFacultyCount} / ${stats.totalFaculty}\n\n` +
      `Faculty Compliance List:\n` +
      allFaculty
        .map((f) => {
          const items = submissions[f.email] || Array(totalItemCount).fill(false);
          const count = items.slice(0, totalItemCount).filter(Boolean).length;
          return `- ${f.surname}, ${f.name} (${f.department}): ${count}/${totalItemCount} (${Math.round(
            (count / totalItemCount) * 100
          )}%)`;
        })
        .join('\n');

    navigator.clipboard.writeText(summaryText);
    showToast(`📋 ${currentCategory.name} Summary copied to clipboard!`);
  };

  const getBarColor = (count: number, maxCount: number = totalItemCount) => {
    if (count === maxCount && maxCount > 0) return '#10B981'; // Emerald 500
    const ratio = maxCount > 0 ? count / maxCount : 0;
    if (ratio >= 0.7) return '#3B82F6'; // Blue 500
    if (ratio >= 0.4) return '#F59E0B'; // Amber 500
    if (count > 0) return '#F97316'; // Orange 500
    return '#94A3B8'; // Slate 400
  };

  const currentTerm = termsList.find((t) => t.id === selectedTermId) || termsList[0];

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-mono flex items-center space-x-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>{copiedToast}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5 flex-wrap">
              <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30 shadow-inner">
                <FileCheck2 className="w-6 h-6 text-blue-300" />
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight font-sans">
                Faculty Submission Report
              </h2>

              {isWeeklyCategory ? (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono px-3 py-1 rounded-full font-bold">
                  {currentTerm.name}: Weeks 1 to {currentTermWeeks}
                </span>
              ) : (
                <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-mono px-3 py-1 rounded-full font-bold">
                  Term 1, Term 2 & Term 3 Tracking
                </span>
              )}

              {isAdmin ? (
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/40 text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-300 inline" />
                  <span>Admin Mode (Editable Directory)</span>
                </span>
              ) : (
                <span className="bg-amber-500/20 text-amber-200 border border-amber-500/30 text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold flex items-center space-x-1">
                  <Eye className="w-3.5 h-3.5 text-amber-300 inline" />
                  <span>Faculty Visualizer Mode</span>
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-blue-100/80 max-w-2xl">
              Track and monitor instructional compliance across <strong className="text-white">Daily Lesson Logs (DLL: Configurable up to 12 Weeks)</strong>, <strong className="text-white">Table of Specifications (TOS: Term 1, 2, 3)</strong>, and <strong className="text-white">Test Questions (TQ: Term 1, 2, 3)</strong> with persistent Firebase cloud retention.
            </p>
          </div>

          {/* Action Controls & Selectors */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Term Dropdown Selector (Active for DLL) with Admin Current Term Setter */}
            {isWeeklyCategory ? (
              <>
                <div className="flex items-center space-x-1.5">
                  <div className="relative">
                    <select
                      value={selectedTermId}
                      onChange={(e) => {
                        setSelectedTermId(e.target.value);
                      }}
                      aria-label="Select Academic Term"
                      className="appearance-none bg-white/10 hover:bg-white/15 border border-white/20 text-white text-xs sm:text-sm font-mono font-bold rounded-2xl pl-3.5 pr-9 py-2.5 transition-all cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-400"
                    >
                      {termsList.map((t) => {
                        const isDefault = t.id === activeDefaultTermId;
                        return (
                          <option key={t.id} value={t.id} className="bg-slate-900 text-white font-mono">
                            {t.name} {isDefault ? '⭐ [Current Term]' : ''} ({t.description})
                          </option>
                        );
                      })}
                    </select>
                    <ChevronDown className="w-4 h-4 text-white/70 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Admin Button: Set as Current Term to persist in Firebase across refreshes */}
                  {isAdmin ? (
                    selectedTermId === activeDefaultTermId ? (
                      <div
                        className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-2xl text-xs font-mono font-bold shadow-xs select-none"
                        title="Official Current Academic Term saved in Firebase (automatically loaded on page load & refresh)"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span className="hidden sm:inline">Current Term</span>
                        <span className="text-[10px] bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full font-mono font-extrabold">Default ✓</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSetCurrentActiveTerm(selectedTermId)}
                        disabled={isSettingActiveTerm}
                        className="px-3.5 py-2.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-xs font-mono font-extrabold rounded-2xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer active:scale-95 border border-amber-200"
                        title={`Set ${currentTerm.name} as the official default Current Term in Firebase so it opens on refresh`}
                      >
                        {isSettingActiveTerm ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                        ) : (
                          <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                        )}
                        <span>Set as Current Term</span>
                      </button>
                    )
                  ) : (
                    selectedTermId === activeDefaultTermId ? (
                      <div
                        className="flex items-center space-x-1.5 px-3 py-2 bg-amber-500/20 text-amber-200 border border-amber-400/40 rounded-2xl text-xs font-mono font-bold select-none"
                        title="Currently viewing the official active academic term"
                      >
                        <Star className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
                        <span>Current Term</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedTermId(activeDefaultTermId)}
                        className="px-3 py-2 bg-white/10 hover:bg-white/20 text-amber-200 hover:text-white rounded-2xl text-xs font-mono font-bold transition-all cursor-pointer flex items-center space-x-1 border border-white/20"
                        title="Switch view back to the current active academic term"
                      >
                        <Star className="w-3 h-3 fill-amber-300 text-amber-300" />
                        <span className="hidden sm:inline">Go to Current (T{activeDefaultTermId.replace('term-', '')})</span>
                      </button>
                    )
                  )}
                </div>

                {/* Inline Week Adjuster & Immediate Save Button (Admin) or Indicator (Faculty) */}
                {isAdmin ? (
                  <div className="flex items-center space-x-1.5 bg-white/10 border border-white/20 p-1 rounded-2xl shadow-inner backdrop-blur-xs">
                    <span className="text-[11px] font-mono font-bold text-blue-200 pl-2 hidden sm:inline">
                      Weeks:
                    </span>

                    {/* Stepper */}
                    <div className="flex items-center space-x-1 bg-slate-900/60 border border-white/10 rounded-xl px-1 py-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickChangeTermWeeks(
                            selectedTermId as any,
                            Math.max(MIN_TERM_WEEKS, currentTermWeeks - 1)
                          )
                        }
                        disabled={currentTermWeeks <= MIN_TERM_WEEKS}
                        className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
                        title="Decrease weeks"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-7 text-center font-mono font-extrabold text-xs text-white">
                        {currentTermWeeks}
                      </span>

                      <button
                        type="button"
                        onClick={() =>
                          handleQuickChangeTermWeeks(
                            selectedTermId as any,
                            Math.min(MAX_TERM_WEEKS, currentTermWeeks + 1)
                          )
                        }
                        disabled={currentTermWeeks >= MAX_TERM_WEEKS}
                        className="p-1 rounded-lg text-white/80 hover:text-white hover:bg-white/10 disabled:opacity-30 transition-all cursor-pointer"
                        title="Increase weeks"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quick Dropdown (1 to 12) */}
                    <select
                      value={currentTermWeeks}
                      onChange={(e) =>
                        handleQuickChangeTermWeeks(
                          selectedTermId as any,
                          Number(e.target.value)
                        )
                      }
                      aria-label="Select weeks"
                      className="bg-slate-900/60 border border-white/10 text-white text-xs font-mono font-bold rounded-xl px-2 py-1.5 cursor-pointer focus:outline-hidden"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                        <option key={w} value={w} className="bg-slate-900 text-white">
                          {w} {w === 1 ? 'Wk' : 'Wks'}
                        </option>
                      ))}
                    </select>

                    {/* Save Button for active term weeks */}
                    <button
                      type="button"
                      onClick={() => handleSaveSingleTermWeeks(selectedTermId as any, currentTermWeeks)}
                      disabled={isSavingSingleTerm === selectedTermId}
                      className={`px-3 py-1.5 text-xs font-mono font-bold rounded-xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer active:scale-95 border ${
                        savedTermSuccess[selectedTermId]
                          ? 'bg-emerald-600 border-emerald-400 text-white'
                          : 'bg-blue-600 hover:bg-blue-500 border-blue-400/40 text-white'
                      }`}
                      title={`Save ${currentTerm.name} (${currentTermWeeks} weeks) directly to Firebase Firestore`}
                    >
                      {isSavingSingleTerm === selectedTermId ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : savedTermSuccess[selectedTermId] ? (
                        <Check className="w-3.5 h-3.5 text-white" />
                      ) : (
                        <Save className="w-3.5 h-3.5 text-blue-200" />
                      )}
                      <span>
                        {isSavingSingleTerm === selectedTermId
                          ? 'Saving...'
                          : savedTermSuccess[selectedTermId]
                          ? 'Saved ✓'
                          : 'Save Weeks'}
                      </span>
                    </button>

                    {/* Open Full Configure Modal Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setTempWeeksConfig(termWeeksConfig);
                        setIsSettingWeeksModalOpen(true);
                      }}
                      className="p-1.5 text-blue-200 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
                      title="Open full weeks per term configuration modal"
                    >
                      <SlidersHorizontal className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="bg-white/10 border border-white/20 px-3.5 py-2.5 rounded-2xl text-xs font-mono text-white flex items-center space-x-2 font-bold">
                    <Calendar className="w-4 h-4 text-blue-300" />
                    <span>{currentTerm.name}: Weeks 1 to {currentTermWeeks}</span>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/10 border border-white/20 px-3.5 py-2.5 rounded-2xl text-xs font-mono text-white flex items-center space-x-1.5 font-bold">
                <Calendar className="w-4 h-4 text-purple-300" />
                <span>All 3 Academic Terms</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportCSV}
              className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold rounded-2xl transition-all shadow-md flex items-center space-x-1.5 cursor-pointer active:scale-95 border border-emerald-500/50"
              title="Download CSV Report"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-mono font-bold rounded-2xl transition-all border border-white/20 flex items-center space-x-1.5 cursor-pointer active:scale-95"
              title="Copy Summary Text"
            >
              <Copy className="w-4 h-4" />
              <span className="hidden sm:inline">Copy Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* SECTION SELECTOR TABS: DLL, TOS, and TQ */}
      <div className="bg-white p-2 sm:p-2.5 rounded-3xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="grid grid-cols-3 gap-1.5 sm:gap-2 flex-1">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(cat.id);
                    setSelectedItemToSave(0);
                  }}
                  className={`px-3 py-3 rounded-2xl font-sans font-bold text-xs sm:text-sm transition-all duration-200 flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 cursor-pointer border ${
                    isActive
                      ? `${cat.activeBg} border-transparent shadow-md scale-[1.01]`
                      : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200/70'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <div className="text-center sm:text-left">
                    <span className="font-extrabold uppercase tracking-wider">{cat.name}</span>
                    <span className={`hidden md:inline ml-1 text-xs opacity-90 font-normal ${isActive ? 'text-white' : 'text-slate-500'}`}>
                      • {cat.fullName}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Cloud Sync & Last Saved Indicator */}
          <div className="flex items-center justify-between sm:justify-end space-x-3 px-2 py-1 text-xs font-mono text-slate-500">
            <div className="flex items-center space-x-1.5 text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl font-bold">
              <Cloud className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
              <span>Firebase Cloud Sync</span>
            </div>
            {lastSavedTimestamp && (
              <span className="text-[11px] text-slate-400 hidden lg:inline">
                Saved at {lastSavedTimestamp}
              </span>
            )}
          </div>
        </div>

        {/* Current Active Category Description Banner */}
        <div className="mt-2.5 pt-2.5 border-t border-slate-100 px-2 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-600 font-mono gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900">{currentCategory.name}:</span>
            <span>{currentCategory.fullName} — {currentCategory.shortDescription}</span>
          </div>
          <div className="text-slate-500 font-medium">
            {isWeeklyCategory ? (
              <>
                Active: <span className="font-bold text-blue-600">{currentTerm.name}</span> • <span className="font-bold text-indigo-600">Weeks 1 to {currentTermWeeks}</span>
              </>
            ) : (
              <>
                Checklist: <span className="font-bold text-purple-700">Term 1 {currentCategory.name}</span>, <span className="font-bold text-purple-700">Term 2 {currentCategory.name}</span>, <span className="font-bold text-purple-700">Term 3 {currentCategory.name}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Metric 1: Overall Compliance */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium">
            <span>{currentCategory.name} Compliance</span>
            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
              <BarChart3 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats.overallPercentage}%
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({stats.totalCompleted}/{stats.totalPossible} {isWeeklyCategory ? 'wks' : 'terms'})
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.overallPercentage}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Registered Faculty */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium">
            <span>Registered Faculty</span>
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono">
              {stats.totalFaculty}
            </span>
            <span className="text-xs text-slate-500 font-mono">teachers</span>
          </div>
          <p className="text-[11px] text-slate-500 truncate">
            JHS & SHS Teachers
          </p>
        </div>

        {/* Metric 3: Fully Submitted */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium">
            <span>100% {currentCategory.name} Complete</span>
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-emerald-600 font-mono">
              {stats.completedFacultyCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              / {stats.totalFaculty} teachers
            </span>
          </div>
          <p className="text-[11px] text-emerald-700 font-mono font-medium truncate">
            {stats.totalFaculty > 0 ? Math.round((stats.completedFacultyCount / stats.totalFaculty) * 100) : 0}% perfect compliance ({isWeeklyCategory ? `Weeks 1–${currentTermWeeks}` : 'Terms 1, 2 & 3'})
          </p>
        </div>

        {/* Metric 4: In-Progress / Pending */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-mono font-medium">
            <span>In Progress / Pending</span>
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-extrabold text-amber-600 font-mono">
              {stats.inProgressFacultyCount + stats.noSubmissionFacultyCount}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              ({stats.noSubmissionFacultyCount} not started)
            </span>
          </div>
          <p className="text-[11px] text-slate-500 truncate font-mono">
            {isWeeklyCategory ? `${currentTerm.name} • Weeks 1–${currentTermWeeks}` : 'All 3 Academic Terms'}
          </p>
        </div>
      </div>

      {/* NON-ADMIN FACULTY HIGHLIGHT CARD (When Directory Table is Hidden) */}
      {!isAdmin && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-3xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="text-xl">🌟</span>
                <h3 className="text-base font-bold text-slate-900 font-sans">
                  My {currentCategory.fullName} ({currentCategory.name}) Submission Status
                </h3>
                <span className="bg-blue-600 text-white text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold">
                  {currentUser.name}
                </span>
              </div>
              <p className="text-xs text-slate-600 font-mono">
                {isWeeklyCategory
                  ? `${currentTerm.name} instructional progress. Directory recording is restricted to department administrators.`
                  : `Academic terms progress for ${currentCategory.name} (Term 1, Term 2, Term 3). Directory recording is restricted to administrators.`}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-2xl font-extrabold text-blue-700 font-mono">
                  {myStatus.itemsSubmitted} / {totalItemCount} {isWeeklyCategory ? 'Weeks' : 'Terms'}
                </div>
                <div className="text-xs text-slate-500 font-mono font-bold">
                  {myStatus.percentage}% Complete
                </div>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-white border border-blue-200 flex items-center justify-center font-bold text-blue-700 shadow-2xs text-lg font-mono">
                {myStatus.percentage}%
              </div>
            </div>
          </div>

          {/* Item Checkmarks Visualizer for this Faculty Member */}
          <div className="mt-4 pt-3 border-t border-blue-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-600 mr-2">Submitted {isWeeklyCategory ? 'Weeks' : 'Terms'}:</span>
            {columnItems.map((col, idx) => {
              const isChecked = Boolean(myStatus.items[idx]);
              return (
                <div
                  key={col.key}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center space-x-1.5 border ${
                    isChecked
                      ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                      : 'bg-white text-slate-400 border-slate-200'
                  }`}
                  title={`${col.fullLabel}: ${isChecked ? 'Submitted' : 'Pending'}`}
                >
                  <span>{col.headerLabel}</span>
                  {isChecked ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Clock className="w-3 h-3 text-slate-300" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SECTION 1: FACULTY SUBMISSION DIRECTORY (ADMINISTRATOR ONLY) */}
      {isAdmin ? (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          {/* Controls & Filter Bar */}
          <div className="p-4 sm:p-5 border-b border-slate-200 bg-slate-50/70 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center space-x-2.5">
                <div className={`w-9 h-9 rounded-2xl ${currentCategory.activeBg} text-white flex items-center justify-center font-bold text-base shadow-sm`}>
                  {currentCategory.icon}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-sans">
                    {currentCategory.fullName} ({currentCategory.name}) Faculty Submission Directory
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    {isWeeklyCategory
                      ? `Check each week (W1 – W${currentTermWeeks}) to record instructional submissions for all faculty members.`
                      : `Check Term 1 ${currentCategory.name}, Term 2 ${currentCategory.name}, and Term 3 ${currentCategory.name} for all faculty members.`}
                  </p>
                </div>
              </div>

              {/* Administrator Per-Item Retention & Save Controls */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Specific Column Save Dropdown */}
                <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1 rounded-2xl shadow-2xs">
                  <span className="text-[11px] font-mono font-bold text-slate-500 pl-2">Save:</span>
                  <select
                    value={selectedItemToSave}
                    onChange={(e) => setSelectedItemToSave(Number(e.target.value))}
                    aria-label="Select item to save"
                    className="bg-transparent text-xs font-mono font-bold text-slate-800 px-2 py-1 cursor-pointer focus:outline-hidden"
                  >
                    {columnItems.map((col, i) => (
                      <option key={col.key} value={i}>
                        {col.fullLabel}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleSaveItemToFirebase(selectedItemToSave)}
                    disabled={isSavingIndex === selectedItemToSave}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-xl transition-all flex items-center space-x-1 cursor-pointer active:scale-95 shadow-2xs"
                    title={`Save ${columnItems[selectedItemToSave]?.fullLabel} data permanently to Firebase`}
                  >
                    {isSavingIndex === selectedItemToSave ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save {columnItems[selectedItemToSave]?.shortLabel}</span>
                  </button>
                </div>

                {/* Save All to Firebase Button */}
                <button
                  type="button"
                  onClick={handleSaveAllToFirebase}
                  disabled={isSavingAll}
                  className="px-3.5 py-2 bg-indigo-700 hover:bg-indigo-600 disabled:opacity-50 text-white text-xs font-mono font-bold rounded-2xl transition-all shadow-sm flex items-center space-x-1.5 cursor-pointer active:scale-95"
                  title={`Save all ${currentCategory.name} records to Firebase Firestore for permanent retention`}
                >
                  {isSavingAll ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Cloud className="w-4 h-4 text-indigo-200" />
                  )}
                  <span>Save All to Firebase</span>
                </button>
              </div>
            </div>

            {/* Search, Filter & Status Badges */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 pt-1">
              <div className="sm:col-span-6 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search faculty by name, surname, or email..."
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-mono"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="sm:col-span-3">
                <select
                  value={departmentFilter}
                  onChange={(e) => setDepartmentFilter(e.target.value)}
                  aria-label="Filter by Department or Strand"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  <option value="all">All Departments / Strands</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              {/* Status Filter */}
              <div className="sm:col-span-3 flex items-center space-x-1 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`flex-1 py-2 text-center rounded-xl font-bold transition-all cursor-pointer ${
                    statusFilter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  All ({allFaculty.length})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('complete')}
                  className={`flex-1 py-2 text-center rounded-xl font-bold transition-all cursor-pointer ${
                    statusFilter === 'complete'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Done ({stats.completedFacultyCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('in-progress')}
                  className={`flex-1 py-2 text-center rounded-xl font-bold transition-all cursor-pointer ${
                    statusFilter === 'in-progress'
                      ? 'bg-amber-600 text-white'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Pending
                </button>
              </div>
            </div>
          </div>

          {/* Directory Table / Matrix View */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-slate-100/90 text-slate-700 text-[11px] font-mono font-bold uppercase tracking-wider border-b border-slate-200">
                  <th className="py-3 px-4 w-60 sm:w-72">Faculty Member</th>
                  <th className="py-3 px-3 w-36 sm:w-44">Department</th>
                  {/* Dynamic Headers (Weeks or Term 1, Term 2, Term 3) with Quick Save Action */}
                  {columnItems.map((col) => (
                    <th
                      key={col.key}
                      className={`py-2.5 px-2 text-center border-l border-slate-200/60 ${
                        isWeeklyCategory ? 'w-12' : 'w-32'
                      }`}
                      title={`${col.fullLabel}. Click save icon to persist to Firebase.`}
                    >
                      <div className="flex flex-col items-center justify-center">
                        <span className={`text-[11px] font-extrabold ${isWeeklyCategory ? 'text-blue-700' : 'text-purple-800'}`}>
                          {col.headerLabel}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleSaveItemToFirebase(col.index)}
                          disabled={isSavingIndex === col.index}
                          className="mt-0.5 p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-100 transition-all cursor-pointer"
                          title={`Save ${col.fullLabel} data to Firebase`}
                        >
                          {isSavingIndex === col.index ? (
                            <RefreshCw className="w-3 h-3 animate-spin text-blue-600" />
                          ) : (
                            <Save className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center w-28 border-l border-slate-200">
                    Progress
                  </th>
                  <th className="py-3 px-3 text-center w-28">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/70 text-xs font-mono">
                {filteredFaculty.length === 0 ? (
                  <tr>
                    <td colSpan={4 + totalItemCount} className="py-12 text-center text-slate-500 bg-white">
                      <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                      <div className="font-bold text-sm text-slate-700">No faculty members found</div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Try adjusting your search query or department filter.
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredFaculty.map((faculty, idx) => {
                    const items = submissions[faculty.email] || Array(totalItemCount).fill(false);
                    const visibleSlice = items.slice(0, totalItemCount);
                    const completedCount = visibleSlice.filter(Boolean).length;
                    const pct = Math.round((completedCount / totalItemCount) * 100);
                    const isAllChecked = completedCount === totalItemCount;

                    return (
                      <tr
                        key={faculty.email}
                        className={`hover:bg-blue-50/50 transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        {/* Faculty Name & Info */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div
                              className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-[11px] text-white shrink-0 shadow-2xs ${
                                isAllChecked
                                  ? 'bg-emerald-600'
                                  : completedCount >= Math.ceil(totalItemCount / 2)
                                  ? 'bg-blue-600'
                                  : 'bg-slate-600'
                              }`}
                            >
                              {faculty.surname.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="font-bold text-slate-900 truncate">
                                {faculty.surname}, {faculty.name}
                              </div>
                              <div className="text-[10px] text-slate-400 truncate">
                                {faculty.email}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Department */}
                        <td className="py-3 px-3 text-slate-600 text-[11px]">
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md truncate max-w-[140px] inline-block font-sans font-medium">
                            {faculty.department || 'SHS Dept.'}
                          </span>
                        </td>

                        {/* Checkboxes (Weeks or Term 1, Term 2, Term 3) */}
                        {columnItems.map((col) => {
                          const isChecked = Boolean(items[col.index]);
                          return (
                            <td
                              key={col.key}
                              className="py-2.5 px-2 text-center border-l border-slate-200/60"
                            >
                              <button
                                type="button"
                                onClick={() => handleToggleItem(faculty.email, col.index)}
                                aria-label={`Toggle ${col.fullLabel} for ${faculty.name}`}
                                className={`rounded-lg border flex items-center justify-center mx-auto transition-all cursor-pointer active:scale-90 ${
                                  isWeeklyCategory ? 'w-7 h-7' : 'w-9 h-7 px-2'
                                } ${
                                  isChecked
                                    ? 'bg-emerald-500 border-emerald-600 text-white shadow-2xs'
                                    : 'bg-white border-slate-300 text-transparent hover:border-slate-400 hover:bg-slate-50'
                                }`}
                                title={`${faculty.name} - ${col.fullLabel}: ${isChecked ? 'Submitted' : 'Pending'}`}
                              >
                                {isChecked && <Check className="w-4 h-4 stroke-[3]" />}
                              </button>
                            </td>
                          );
                        })}

                        {/* Progress Bar & Number */}
                        <td className="py-3 px-3 text-center border-l border-slate-200">
                          <div className="flex flex-col items-center justify-center">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${
                                isAllChecked
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : completedCount >= Math.ceil(totalItemCount / 2)
                                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                  : completedCount > 0
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : 'bg-slate-100 text-slate-500'
                              }`}
                            >
                              {completedCount} / {totalItemCount}
                            </span>
                            <span className="text-[10px] text-slate-400 mt-0.5 font-bold">
                              {pct}%
                            </span>
                          </div>
                        </td>

                        {/* Quick Action Button */}
                        <td className="py-3 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleCheckAllItems(faculty.email, !isAllChecked)}
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-mono font-bold transition-all cursor-pointer ${
                              isAllChecked
                                ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                            }`}
                            title={isAllChecked ? `Clear all ${currentCategory.name} submissions` : `Mark all ${currentCategory.name} complete`}
                          >
                            {isAllChecked ? 'Reset' : 'Check All'}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Directory Footer Info */}
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs font-mono text-slate-500 gap-2">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
              <span>Green Check = Submitted {currentCategory.name}</span>
              <span className="text-slate-300">•</span>
              <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
              <span>Empty Box = Pending</span>
            </div>
            <div>
              Showing <span className="font-bold text-slate-700">{filteredFaculty.length}</span> faculty members for{' '}
              <span className="font-bold text-blue-700">
                {currentCategory.name} • {isWeeklyCategory ? `${currentTerm.name} (Weeks 1–${currentTermWeeks})` : 'Term 1, Term 2 & Term 3'}
              </span>
            </div>
          </div>
        </div>
      ) : null}

      {/* SECTION 2: FACULTY SUBMISSION PROGRESS VISUALIZER */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl ${!isAdmin ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'}`}>
              {!isAdmin ? <PieChartIcon className="w-5 h-5" /> : <BarChart3 className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center space-x-2 flex-wrap">
                <h3 className="text-base sm:text-lg font-bold text-slate-900 font-sans">
                  {!isAdmin
                    ? `Faculty Visualizer Mode — ${currentCategory.fullName} (${currentCategory.name}) Data`
                    : `${currentCategory.fullName} (${currentCategory.name}) Progress Visualizer`}
                </h3>
                <span className="bg-blue-100 text-blue-800 text-xs font-mono px-2 py-0.5 rounded-full font-bold">
                  {isWeeklyCategory ? currentTerm.name : 'Terms 1, 2 & 3'}
                </span>
                {!isAdmin && (
                  <span className="bg-purple-100 text-purple-800 text-xs font-mono px-2 py-0.5 rounded-full font-bold flex items-center space-x-1">
                    <Lock className="w-3 h-3 inline mr-1 text-purple-600" />
                    Privacy Protected
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono">
                {!isAdmin
                  ? `Department submission analytics visualizer for ${currentCategory.name}. Displays aggregate progress through pie charts with faculty privacy protection.`
                  : isWeeklyCategory
                  ? `Analytical charts representing submitted weeks out of ${currentTermWeeks} for all faculty members.`
                  : `Visualizer showing Term 1 ${currentCategory.name}, Term 2 ${currentCategory.name}, and Term 3 ${currentCategory.name} compliance.`}
              </p>
            </div>
          </div>

          {/* Toggle View: Admin vs Faculty Visualizer Mode */}
          {isAdmin ? (
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setViewMode('faculty-chart')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'faculty-chart'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                By Faculty Member
              </button>
              <button
                type="button"
                onClick={() => setViewMode('weekly-chart')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  viewMode === 'weekly-chart'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isWeeklyCategory ? `Weekly Trend (W1–W${currentTermWeeks})` : `Term Trend`}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('pie-chart')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center space-x-1 ${
                  viewMode === 'pie-chart'
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PieChartIcon className="w-3.5 h-3.5" />
                <span>Pie Chart</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-mono font-bold">
              <button
                type="button"
                onClick={() => setFacultyPieTab('both')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  facultyPieTab === 'both'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Pie Charts
              </button>
              <button
                type="button"
                onClick={() => setFacultyPieTab('compliance')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  facultyPieTab === 'compliance'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Compliance Status
              </button>
              <button
                type="button"
                onClick={() => setFacultyPieTab('volume')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  facultyPieTab === 'volume'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deliverables Ratio
              </button>
              <button
                type="button"
                onClick={() => setFacultyPieTab('periods')}
                className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                  facultyPieTab === 'periods'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {isWeeklyCategory ? 'Weekly Distribution' : 'Term Distribution'}
              </button>
            </div>
          )}
        </div>

        {/* NON-ADMIN: FACULTY VISUALIZER PIE CHART VIEW */}
        {!isAdmin || viewMode === 'pie-chart' ? (
          <div className="space-y-6">
            {/* Privacy notice banner for Faculty Visualizer Mode */}
            {!isAdmin && (
              <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-2xl flex items-center justify-between gap-3 text-xs font-mono text-purple-900">
                <div className="flex items-center space-x-2.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0" />
                  <span>
                    <strong>Faculty Visualizer Mode:</strong> Displaying anonymized submission data through pie charts. Individual colleague names are confidential.
                  </span>
                </div>
                <span className="hidden sm:inline-block bg-purple-200/70 text-purple-800 text-[10px] font-bold px-2.5 py-0.5 rounded-md">
                  {allFaculty.length} Registered Teachers
                </span>
              </div>
            )}

            {/* Render Selected Pie Charts */}
            {(facultyPieTab === 'both' || facultyPieTab === 'compliance' || viewMode === 'pie-chart') && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Chart 1: Faculty Compliance Status Pie Chart */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                        <span>Faculty Compliance Status Breakdown</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        Distribution across {stats.totalFaculty} teachers ({currentCategory.name})
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full">
                      {stats.overallPercentage}% Overall
                    </span>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={compliancePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                        >
                          {compliancePieData.map((entry, index) => (
                            <Cell key={`cell-comp-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-mono space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                    <span className="font-bold text-white text-xs">{data.name}</span>
                                  </div>
                                  <div className="text-slate-300 text-xs pt-1 border-t border-slate-800">
                                    Faculty Count: <span className="font-bold text-emerald-400">{data.value}</span> / {stats.totalFaculty} ({data.percentage}%)
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {data.description}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value) => <span className="text-xs font-mono font-medium text-slate-700">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200/80 text-center font-mono">
                    <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-100">
                      <div className="text-[10px] text-emerald-700 font-bold uppercase">100% Done</div>
                      <div className="text-sm font-extrabold text-emerald-800">
                        {stats.completedFacultyCount} <span className="text-[10px] font-normal text-emerald-600">({Math.round((stats.completedFacultyCount / (stats.totalFaculty || 1)) * 100)}%)</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="text-[10px] text-amber-700 font-bold uppercase">In Progress</div>
                      <div className="text-sm font-extrabold text-amber-800">
                        {stats.inProgressFacultyCount} <span className="text-[10px] font-normal text-amber-600">({Math.round((stats.inProgressFacultyCount / (stats.totalFaculty || 1)) * 100)}%)</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                      <div className="text-[10px] text-slate-600 font-bold uppercase">Pending</div>
                      <div className="text-sm font-extrabold text-slate-700">
                        {stats.noSubmissionFacultyCount} <span className="text-[10px] font-normal text-slate-500">({Math.round((stats.noSubmissionFacultyCount / (stats.totalFaculty || 1)) * 100)}%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chart 2: Deliverables Target Ratio Pie Chart */}
                <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                        <span>Deliverables Target Volume Ratio</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {stats.totalCompleted} submitted of {stats.totalPossible} expected deliverables
                      </p>
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full">
                      {stats.totalCompleted} / {stats.totalPossible}
                    </span>
                  </div>

                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={volumePieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={95}
                          paddingAngle={4}
                          dataKey="value"
                          nameKey="name"
                        >
                          {volumePieData.map((entry, index) => (
                            <Cell key={`cell-vol-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                          ))}
                        </Pie>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-mono space-y-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                    <span className="font-bold text-white text-xs">{data.name}</span>
                                  </div>
                                  <div className="text-slate-300 text-xs pt-1 border-t border-slate-800">
                                    Deliverables: <span className="font-bold text-blue-400">{data.value}</span> / {stats.totalPossible} ({data.percentage}%)
                                  </div>
                                  <div className="text-[11px] text-slate-400">
                                    {data.description}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          formatter={(value) => <span className="text-xs font-mono font-medium text-slate-700">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-200/80 text-center font-mono">
                    <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="text-[10px] text-blue-700 font-bold uppercase">Submitted Files</div>
                      <div className="text-sm font-extrabold text-blue-800">
                        {stats.totalCompleted} <span className="text-[10px] font-normal text-blue-600">({stats.overallPercentage}%)</span>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-100 border border-slate-200">
                      <div className="text-[10px] text-slate-600 font-bold uppercase">Pending Files</div>
                      <div className="text-sm font-extrabold text-slate-700">
                        {Math.max(0, stats.totalPossible - stats.totalCompleted)} <span className="text-[10px] font-normal text-slate-500">({100 - stats.overallPercentage}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chart 3: Period / Weekly Submissions Pie Breakdown */}
            {(facultyPieTab === 'periods' || (facultyPieTab === 'both' && !isAdmin)) && (
              <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500 inline-block" />
                      <span>
                        {isWeeklyCategory
                          ? `Weekly Submission Distribution (${currentTerm.name} • W1 to W${currentTermWeeks})`
                          : `Term Compliance Distribution (Term 1, Term 2 & Term 3)`}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-500 font-mono">
                      Submissions recorded per {isWeeklyCategory ? 'week' : 'term'} milestone across all faculty
                    </p>
                  </div>
                  <span className="text-xs font-mono font-bold px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full">
                    {totalItemCount} {isWeeklyCategory ? 'Weeks' : 'Terms'}
                  </span>
                </div>

                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={periodDistributionPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {periodDistributionPieData.map((entry, index) => (
                          <Cell key={`cell-period-${index}`} fill={entry.color} stroke="#ffffff" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-mono space-y-1">
                                <div className="flex items-center space-x-2">
                                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
                                  <span className="font-bold text-white text-xs">{data.fullName || data.name}</span>
                                </div>
                                <div className="text-slate-300 text-xs pt-1 border-t border-slate-800">
                                  Faculty Submitted: <span className="font-bold text-emerald-400">{data.value}</span> / {data.totalFaculty} ({data.percentage}%)
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        height={40}
                        formatter={(value) => <span className="text-xs font-mono font-medium text-slate-700">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Department Aggregate Summary Stats Footer */}
            <div className="p-4 bg-slate-900 text-white rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-mono shadow-md">
              <div className="flex items-center space-x-2">
                <FileCheck2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Official SVNHS {currentCategory.fullName} ({currentCategory.name}) Compliance Report
                </span>
              </div>
              <div className="text-slate-400">
                Department Total: <span className="font-bold text-emerald-400">{stats.totalCompleted}</span> / {stats.totalPossible} deliverables ({stats.overallPercentage}%)
              </div>
            </div>
          </div>
        ) : viewMode === 'faculty-chart' ? (
          /* ADMIN: BAR CHART BY FACULTY MEMBER */
          <div className="space-y-3">
            <div className="h-[380px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={facultyChartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 65 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    tick={{ fill: '#475569', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                    height={60}
                  />
                  <YAxis
                    domain={[0, totalItemCount]}
                    ticks={Array.from({ length: totalItemCount + 1 }, (_, i) => i).filter(
                      (i) => totalItemCount <= 6 || i % 2 === 0 || i === totalItemCount
                    )}
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                    label={{
                      value: `${currentCategory.name} Submitted (out of ${totalItemCount})`,
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748b',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      dy: 70,
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-mono space-y-1">
                            <div className="font-bold text-sm text-blue-300">{data.fullName}</div>
                            <div className="text-slate-400 text-[11px]">{data.department}</div>
                            <div className="pt-1.5 border-t border-slate-800 flex items-center justify-between space-x-3">
                              <span className="text-slate-300">{currentCategory.name} Submitted:</span>
                              <span className="font-extrabold text-emerald-400 text-sm">
                                {data.submittedCount} / {totalItemCount} {isWeeklyCategory ? 'Weeks' : 'Terms'} ({data.percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="submittedCount" radius={[8, 8, 0, 0]} maxBarSize={45}>
                    {facultyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getBarColor(entry.submittedCount, totalItemCount)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Legend indicators */}
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-mono text-slate-600 pt-2 border-t border-slate-100">
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
                <span>{totalItemCount} {isWeeklyCategory ? 'Weeks' : 'Terms'} (100% Complete)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-blue-500 inline-block" />
                <span>≥ 70% (High Compliance)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-amber-500 inline-block" />
                <span>≥ 40% (Moderate)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-orange-500 inline-block" />
                <span>1 – {Math.max(1, Math.floor(totalItemCount * 0.4))} (Low)</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <span className="w-3 h-3 rounded-md bg-slate-400 inline-block" />
                <span>0 (No Submission)</span>
              </div>
            </div>
          </div>
        ) : (
          /* ADMIN: BAR CHART BY WEEKLY / TERM TREND */
          <div className="space-y-3">
            <div className="h-[360px] w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={trendChartData}
                  margin={{ top: 20, right: 30, left: 0, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fill: '#334155', fontSize: 11, fontFamily: 'monospace', fontWeight: 600 }}
                  />
                  <YAxis
                    domain={[0, allFaculty.length > 0 ? allFaculty.length : 10]}
                    tick={{ fill: '#64748b', fontSize: 11, fontFamily: 'monospace' }}
                    label={{
                      value: `Number of Faculty Submitted (${currentCategory.name})`,
                      angle: -90,
                      position: 'insideLeft',
                      fill: '#64748b',
                      fontSize: 11,
                      fontFamily: 'monospace',
                      dy: 80,
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl border border-slate-800 text-xs font-mono space-y-1">
                            <div className="font-bold text-sm text-blue-300">{data.itemLabel}</div>
                            <div className="pt-1 flex items-center justify-between space-x-3">
                              <span className="text-slate-300">Compliance:</span>
                              <span className="font-extrabold text-emerald-400">
                                {data.submittedCount} / {data.totalFaculty} ({data.percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="submittedCount" fill="#3B82F6" radius={[8, 8, 0, 0]} maxBarSize={55}>
                    {trendChartData.map((entry, index) => (
                      <Cell
                        key={`cell-trend-${index}`}
                        fill={entry.percentage >= 80 ? '#10B981' : entry.percentage >= 50 ? '#3B82F6' : '#F59E0B'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-xs font-mono text-slate-500 pt-2 border-t border-slate-100">
              Department-wide {currentCategory.fullName} ({currentCategory.name}) compliance breakdown for{' '}
              {isWeeklyCategory ? `${currentTerm.name} (Weeks 1 to ${currentTermWeeks})` : 'Term 1, Term 2 and Term 3'}
            </div>
          </div>
        )}
      </div>

      {/* ADMIN: SET NUMBER OF WEEKS PER TERM MODAL (1 to 12 Weeks Max) */}
      {isSettingWeeksModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-4 sm:p-6 flex items-start justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-blue-500/20 text-blue-300 rounded-2xl border border-blue-400/30">
                  <CalendarDays className="w-6 h-6 text-blue-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold font-sans tracking-tight">
                    Set Number of Weeks per Term
                  </h3>
                  <p className="text-xs text-blue-200/80 font-mono">
                    Configure instructional week checkboxes for each academic term (Max: 12 Weeks)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingWeeksModalOpen(false)}
                className="p-1.5 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0 overscroll-contain">
              {/* Default Active Academic Term (On Page Load & Refresh) */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50/50 border border-amber-200/90 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <Star className="w-4 h-4 text-amber-500 fill-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold text-slate-900 text-xs font-mono uppercase tracking-wider">
                        Default Current Academic Term
                      </span>
                      <p className="text-[11px] text-slate-600 font-mono">
                        Saved in Firebase so the page automatically opens this term on load and refresh
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                    <span className="text-[11px] font-mono font-bold text-amber-900 bg-amber-200/80 px-2.5 py-1 rounded-full border border-amber-300">
                      Active: {activeDefaultTermId === 'term-1' ? '1st Term' : activeDefaultTermId === 'term-2' ? '2nd Term' : '3rd Term'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(
                    [
                      { id: 'term-1', name: '1st Academic Term' },
                      { id: 'term-2', name: '2nd Academic Term' },
                      { id: 'term-3', name: '3rd Academic Term' },
                    ] as const
                  ).map((t) => {
                    const isCurrentDefault = activeDefaultTermId === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSetCurrentActiveTerm(t.id)}
                        disabled={isSettingActiveTerm}
                        className={`px-3 py-2.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between transition-all cursor-pointer border ${
                          isCurrentDefault
                            ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-xs'
                            : 'bg-white hover:bg-amber-100 text-slate-700 border-slate-200 hover:border-amber-300'
                        }`}
                        title={`Click to set ${t.name} as the official default term saved in Firebase`}
                      >
                        <span className="flex items-center space-x-1.5">
                          {isCurrentDefault ? (
                            <Star className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-300" />
                          )}
                          <span>{t.name}</span>
                        </span>
                        {isCurrentDefault && (
                          <span className="text-[10px] bg-slate-950/15 text-slate-950 px-1.5 py-0.5 rounded-md font-extrabold">
                            Saved ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Presets & Auto-save Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-mono font-bold text-slate-500">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => {
                      const cfg = { 'term-1': 11, 'term-2': 11, 'term-3': 11 };
                      setTempWeeksConfig(cfg);
                      if (autoSaveEnabled) {
                        saveTermWeeksConfigToFirestore(cfg);
                        setTermWeeksConfig(cfg);
                        showToast('💾 Applied and auto-saved 11 Weeks preset to Firebase!');
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer"
                  >
                    Default 11 Wks
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cfg = { 'term-1': 10, 'term-2': 10, 'term-3': 10 };
                      setTempWeeksConfig(cfg);
                      if (autoSaveEnabled) {
                        saveTermWeeksConfigToFirestore(cfg);
                        setTermWeeksConfig(cfg);
                        showToast('💾 Applied and auto-saved 10 Weeks preset to Firebase!');
                      }
                    }}
                    className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-mono font-medium transition-all cursor-pointer"
                  >
                    10 Wks
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const cfg = { 'term-1': 12, 'term-2': 12, 'term-3': 12 };
                      setTempWeeksConfig(cfg);
                      if (autoSaveEnabled) {
                        saveTermWeeksConfigToFirestore(cfg);
                        setTermWeeksConfig(cfg);
                        showToast('💾 Applied and auto-saved 12 Weeks (Max) preset to Firebase!');
                      }
                    }}
                    className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer"
                  >
                    12 Wks (Max)
                  </button>
                </div>

                {/* Auto-save Switch */}
                <label className="flex items-center space-x-2 text-xs font-mono font-bold text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <span>Auto-save to Firebase on edit</span>
                </label>
              </div>

              {/* Term Configurations with dedicated Save Buttons */}
              <div className="space-y-4">
                {(
                  [
                    { id: 'term-1' as const, name: '1st Academic Term', color: 'blue' },
                    { id: 'term-2' as const, name: '2nd Academic Term', color: 'indigo' },
                    { id: 'term-3' as const, name: '3rd Academic Term', color: 'purple' },
                  ]
                ).map((term) => {
                  const weeks = tempWeeksConfig[term.id] || 11;
                  const isSavingThisTerm = isSavingSingleTerm === term.id;
                  const isSavedThisTerm = savedTermSuccess[term.id];

                  return (
                    <div
                      key={term.id}
                      className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div>
                        <div className="font-bold text-slate-900 text-sm font-sans flex items-center space-x-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                          <span>{term.name}</span>
                          {isSavedThisTerm && (
                            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-mono px-2 py-0.5 rounded-full font-bold flex items-center space-x-1 animate-fadeIn">
                              <Check className="w-3 h-3" />
                              <span>Saved to Firebase</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-0.5">
                          Checkboxes: <strong className="text-blue-600 font-bold">W1 to W{weeks}</strong> ({weeks} instructional weeks)
                        </div>
                      </div>

                      {/* Stepper, Number Selection & Dedicated Save Button */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        {/* Stepper */}
                        <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1 rounded-xl shadow-2xs">
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickChangeTermWeeks(
                                term.id,
                                Math.max(MIN_TERM_WEEKS, (tempWeeksConfig[term.id] || 11) - 1)
                              )
                            }
                            disabled={weeks <= MIN_TERM_WEEKS}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                            title="Decrease weeks"
                          >
                            <Minus className="w-4 h-4" />
                          </button>

                          <div className="w-10 text-center font-mono font-extrabold text-slate-900 text-base">
                            {weeks}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuickChangeTermWeeks(
                                term.id,
                                Math.min(MAX_TERM_WEEKS, (tempWeeksConfig[term.id] || 11) + 1)
                              )
                            }
                            disabled={weeks >= MAX_TERM_WEEKS}
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent transition-all cursor-pointer"
                            title="Increase weeks"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Quick Number Pills (1 to 12) */}
                        <select
                          value={weeks}
                          onChange={(e) =>
                            handleQuickChangeTermWeeks(
                              term.id,
                              Number(e.target.value)
                            )
                          }
                          aria-label={`Select weeks for ${term.name}`}
                          className="bg-white border border-slate-200 text-slate-700 text-xs font-mono font-bold rounded-xl px-2.5 py-2 shadow-2xs cursor-pointer focus:outline-hidden"
                        >
                          {Array.from({ length: 12 }, (_, i) => i + 1).map((w) => (
                            <option key={w} value={w}>
                              {w} {w === 1 ? 'Week' : 'Weeks'}
                            </option>
                          ))}
                        </select>

                        {/* SAVE BUTTON PLACED RIGHT AFTER SETTING WEEKS FOR THIS TERM */}
                        <button
                          type="button"
                          onClick={() => handleSaveSingleTermWeeks(term.id, weeks)}
                          disabled={isSavingThisTerm}
                          className={`px-3.5 py-2 text-xs font-mono font-bold rounded-xl transition-all shadow-2xs flex items-center space-x-1.5 cursor-pointer active:scale-95 border ${
                            isSavedThisTerm
                              ? 'bg-emerald-600 border-emerald-400 text-white'
                              : 'bg-blue-600 hover:bg-blue-500 border-blue-400/40 text-white'
                          }`}
                          title={`Save ${term.name} (${weeks} weeks) permanently to Firebase`}
                        >
                          {isSavingThisTerm ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          ) : isSavedThisTerm ? (
                            <Check className="w-3.5 h-3.5 text-white" />
                          ) : (
                            <Save className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {isSavingThisTerm
                              ? 'Saving...'
                              : isSavedThisTerm
                              ? 'Saved ✓'
                              : `Save ${term.id === 'term-1' ? 'T1' : term.id === 'term-2' ? 'T2' : 'T3'}`}
                          </span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Info Notice */}
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-3.5 text-xs text-blue-900 font-mono flex items-start space-x-2.5">
                <FileCheck2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Synchronized Dynamic Directory:</strong> Changing and saving the number of weeks automatically updates all DLL checkboxes, matrix tables, progress visualizers, and weekly trend graphs in real-time across both Admin and Faculty portals.
                </div>
              </div>
            </div>

            {/* Modal Footer (Always visible & docked) */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
              <div className="flex items-center space-x-2 text-xs font-mono text-slate-500">
                <Cloud className="w-4 h-4 text-blue-600" />
                <span>
                  {lastSavedTimestamp
                    ? `Last synced with Firebase at ${lastSavedTimestamp}`
                    : 'Changes are synced live to Firebase Firestore'}
                </span>
              </div>

              <div className="flex flex-wrap items-center space-x-2.5 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => setIsSettingWeeksModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-700 rounded-2xl text-xs font-mono font-bold transition-all flex items-center space-x-1.5 cursor-pointer active:scale-95 shadow-2xs"
                  title="Exit weeks configuration and return to Faculty Submission Report"
                >
                  <LogOut className="w-4 h-4 text-slate-500" />
                  <span>Exit & Return to Page</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveWeeksConfiguration}
                  disabled={isSavingWeeksConfig}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-300 text-white rounded-2xl text-xs font-mono font-bold transition-all shadow-md flex items-center space-x-2 cursor-pointer active:scale-95 border border-blue-400/40"
                >
                  {isSavingWeeksConfig ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Saving All to Firebase...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save All Weeks to Firebase</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
