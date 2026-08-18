import React, { useState } from 'react';
import { DriveFolder, UserProfile } from '../types';
import { extractDriveId } from '../lib/firebase';
import {
  FolderPlus,
  FolderGit2,
  ExternalLink,
  Edit2,
  Trash2,
  Eye,
  Search,
  CheckCircle2,
  Copy,
  Check,
  HardDrive,
  Link2,
  Info,
  X,
  Plus,
  RefreshCw,
  Folder,
  FolderOpen,
  Layers,
  Sparkles,
} from 'lucide-react';

interface FolderManagementPanelProps {
  driveFolders: DriveFolder[];
  currentUser: UserProfile;
  onAddDriveFolder: (folder: Omit<DriveFolder, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onEditDriveFolder: (id: string, updated: Partial<DriveFolder>) => void;
  onDeleteDriveFolder: (id: string) => void;
  onShowToast: (message: string) => void;
}

export const FolderManagementPanel: React.FC<FolderManagementPanelProps> = ({
  driveFolders,
  currentUser,
  onAddDriveFolder,
  onEditDriveFolder,
  onDeleteDriveFolder,
  onShowToast,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [previewFolder, setPreviewFolder] = useState<DriveFolder | null>(null);
  const [editingFolder, setEditingFolder] = useState<DriveFolder | null>(null);

  // Add Folder Form State
  const [addName, setAddName] = useState('');
  const [addPath, setAddPath] = useState('');
  const [addDriveUrl, setAddDriveUrl] = useState('');
  const [addDescription, setAddDescription] = useState('');
  const [addPathManuallyEdited, setAddPathManuallyEdited] = useState(false);

  // Edit Folder Form State
  const [editName, setEditName] = useState('');
  const [editPath, setEditPath] = useState('');
  const [editDriveUrl, setEditDriveUrl] = useState('');
  const [editDescription, setEditDescription] = useState('');

  // Handle auto-populating path when name changes
  const handleAddNameChange = (val: string) => {
    setAddName(val);
    if (!addPathManuallyEdited) {
      const sanitized = val.trim().replace(/[^a-zA-Z0-9_\-\s]/g, '');
      setAddPath(sanitized ? `/${sanitized}` : '');
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    onShowToast('📋 Google Drive link copied to clipboard!');
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleOpenAddModal = () => {
    setAddName('');
    setAddPath('');
    setAddDriveUrl('');
    setAddDescription('');
    setAddPathManuallyEdited(false);
    setIsAddModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim() || !addDriveUrl.trim()) return;

    let cleanPath = addPath.trim();
    if (cleanPath && !cleanPath.startsWith('/') && cleanPath !== 'all') {
      cleanPath = `/${cleanPath}`;
    }
    if (!cleanPath) {
      cleanPath = `/${addName.trim()}`;
    }

    const driveId = extractDriveId(addDriveUrl);

    onAddDriveFolder({
      name: addName.trim(),
      path: cleanPath,
      driveUrl: addDriveUrl.trim(),
      driveId: driveId || `custom-${Date.now()}`,
      description: addDescription.trim() || undefined,
      isDefault: false,
    });

    onShowToast(`📁 Folder "${addName.trim()}" added to SHS Repository with embedded Google Drive link!`);
    setIsAddModalOpen(false);
  };

  const handleOpenEditModal = (folder: DriveFolder) => {
    setEditingFolder(folder);
    setEditName(folder.name);
    setEditPath(folder.path);
    setEditDriveUrl(folder.driveUrl);
    setEditDescription(folder.description || '');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolder || !editName.trim() || !editDriveUrl.trim()) return;

    let cleanPath = editPath.trim();
    if (cleanPath && !cleanPath.startsWith('/') && cleanPath !== 'all') {
      cleanPath = `/${cleanPath}`;
    }
    if (!cleanPath) {
      cleanPath = `/${editName.trim()}`;
    }

    const driveId = extractDriveId(editDriveUrl);

    onEditDriveFolder(editingFolder.id, {
      name: editName.trim(),
      path: cleanPath,
      driveUrl: editDriveUrl.trim(),
      driveId: driveId || editingFolder.driveId,
      description: editDescription.trim() || undefined,
    });

    onShowToast(`⚡ Updated Google Drive link & folder settings for "${editName.trim()}"!`);
    setIsEditModalOpen(false);
    setEditingFolder(null);
  };

  const handleDelete = (folder: DriveFolder) => {
    const isConfirmed = window.confirm(
      `Are you sure you want to delete the folder "${folder.name}" (${folder.path}) from the repository?`
    );
    if (isConfirmed) {
      onDeleteDriveFolder(folder.id);
      onShowToast(`🗑️ Folder "${folder.name}" deleted from repository.`);
    }
  };

  const filteredFolders = (driveFolders || []).filter((f) => {
    const q = searchTerm.toLowerCase();
    return (
      f.name.toLowerCase().includes(q) ||
      f.path.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q)) ||
      f.driveId.toLowerCase().includes(q)
    );
  });

  const totalFolders = driveFolders.length;
  const customFoldersCount = driveFolders.filter((f) => !f.isDefault).length;
  const defaultVaultsCount = driveFolders.filter((f) => f.isDefault).length;

  return (
    <div className="space-y-6">
      {/* Header Banner & Primary CTA */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 shadow-2xs">
                <FolderGit2 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-lg font-bold font-mono text-slate-900">
                    Google Drive Folders & Embedded Links Management
                  </h2>
                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] px-2 py-0.5 rounded font-mono font-extrabold uppercase">
                    LIVE REPOSITORY SYNC
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-sans mt-0.5">
                  Add new department folders with embedded Google Drive links, update URLs on existing folders, and customize repository navigation.
                </p>
              </div>
            </div>
          </div>

          {/* "+ Add Folder with Google Drive Link" CTA Button */}
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="w-full lg:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-mono font-bold rounded-xl cursor-pointer shadow-md hover:shadow-lg transition-all flex items-center justify-center space-x-2 flex-shrink-0"
          >
            <FolderPlus className="w-4 h-4 text-emerald-100" />
            <span>+ Add Folder with Google Drive Link</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-slate-500">Total Folders</span>
              <Folder className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl font-mono font-extrabold text-slate-900">{totalFolders}</div>
            <p className="text-[10px] text-slate-500">Accessible in Repository</p>
          </div>

          <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-800">Custom Added</span>
              <FolderPlus className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="text-xl font-mono font-extrabold text-emerald-900">{customFoldersCount}</div>
            <p className="text-[10px] text-emerald-700">Created by Administrator</p>
          </div>

          <div className="bg-blue-50/60 border border-blue-200/80 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-blue-800">Default DepEd Vaults</span>
              <HardDrive className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-xl font-mono font-extrabold text-blue-900">{defaultVaultsCount}</div>
            <p className="text-[10px] text-blue-700">Central Curriculum Vaults</p>
          </div>

          <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-800">Google Drive Sync</span>
              <Sparkles className="w-4 h-4 text-amber-600" />
            </div>
            <div className="text-xs font-mono font-bold text-amber-900 mt-1 flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Real-Time Cloud</span>
            </div>
            <p className="text-[10px] text-amber-700">Firestore & Webview Active</p>
          </div>
        </div>
      </div>

      {/* Search & Folder List */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search folders by name, path, or description..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white"
            />
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="px-3.5 py-2 bg-emerald-50 border border-emerald-300 text-emerald-800 hover:bg-emerald-100 font-mono text-xs font-bold rounded-xl cursor-pointer flex items-center space-x-1.5 transition-all"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>New Folder</span>
            </button>
          </div>
        </div>

        {/* Folders List Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-slate-50 border-b border-slate-200 font-mono text-[11px] text-slate-600 uppercase">
                <tr>
                  <th className="py-3 px-4 font-bold">Folder Name & Details</th>
                  <th className="py-3 px-4 font-bold">Repository Path</th>
                  <th className="py-3 px-4 font-bold">Embedded Google Drive Link</th>
                  <th className="py-3 px-4 font-bold">Vault Type</th>
                  <th className="py-3 px-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredFolders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400 font-mono text-xs">
                      No matching repository folders found.
                    </td>
                  </tr>
                ) : (
                  filteredFolders.map((folder) => {
                    const extractedId = folder.driveId || extractDriveId(folder.driveUrl);
                    return (
                      <tr key={folder.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 flex-shrink-0 mt-0.5">
                              <Folder className="w-4 h-4 text-emerald-600" />
                            </div>
                            <div className="space-y-0.5">
                              <div className="font-bold text-slate-900 text-sm font-sans flex items-center space-x-2">
                                <span>{folder.name}</span>
                                {folder.path === 'all' && (
                                  <span className="bg-blue-100 text-blue-800 text-[9px] px-1.5 py-0.2 rounded font-mono font-bold">
                                    ROOT
                                  </span>
                                )}
                              </div>
                              {folder.description && (
                                <p className="text-xs text-slate-500 line-clamp-1 max-w-sm">
                                  {folder.description}
                                </p>
                              )}
                              <div className="text-[10px] font-mono text-slate-400">
                                ID: <span className="text-slate-600">{folder.id}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                          <span className="bg-slate-100 text-slate-800 px-2 py-1 rounded-md text-[11px] border border-slate-200/80">
                            {folder.path}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1 max-w-xs">
                            <div className="flex items-center space-x-1.5">
                              <a
                                href={folder.driveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-700 hover:text-emerald-900 font-mono text-xs font-bold hover:underline truncate max-w-[200px] flex items-center space-x-1"
                                title={folder.driveUrl}
                              >
                                <ExternalLink className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                                <span className="truncate">{folder.driveUrl}</span>
                              </a>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(folder.driveUrl, folder.id)}
                                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded cursor-pointer transition-colors"
                                title="Copy Drive URL"
                              >
                                {copiedId === folder.id ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            {extractedId && (
                              <div className="text-[10px] font-mono text-slate-500 flex items-center space-x-1">
                                <span className="text-slate-400">Drive ID:</span>
                                <span className="bg-emerald-50 text-emerald-800 px-1.5 py-0.2 rounded border border-emerald-200 text-[9px] font-bold">
                                  {extractedId}
                                </span>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {folder.isDefault ? (
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                              Default Vault
                            </span>
                          ) : (
                            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                              Custom Folder
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {/* Preview Webview Button */}
                            <button
                              type="button"
                              onClick={() => setPreviewFolder(folder)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer transition-colors"
                              title="Preview Google Drive Webview"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                            </button>

                            {/* Open Direct Link */}
                            <a
                              href={folder.driveUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 bg-slate-100 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer transition-colors"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>

                            {/* Edit Folder & Link Button */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(folder)}
                              className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200/80 rounded-lg cursor-pointer transition-colors"
                              title="Edit Folder & Embedded Google Drive Link"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-amber-700" />
                            </button>

                            {/* Delete Folder Button */}
                            <button
                              type="button"
                              onClick={() => handleDelete(folder)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/80 rounded-lg cursor-pointer transition-colors"
                              title="Delete Folder"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-rose-600" />
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
      </div>

      {/* MODAL 1: ADD NEW FOLDER WITH GOOGLE DRIVE LINK */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 font-sans animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-200">
                  <FolderPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-slate-900">
                    Add Folder with Google Drive Link
                  </h3>
                  <p className="text-xs text-slate-500">
                    Embed a new Google Drive folder into the SHS Repository
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-sans text-xs">
              {/* Folder Name */}
              <div>
                <label className="text-slate-700 font-bold block mb-1 font-mono uppercase text-[11px]">
                  Folder Name *
                </label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => handleAddNameChange(e.target.value)}
                  placeholder="e.g. Grade 11 Science Laboratory Guides"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-sans text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Repository Path */}
              <div>
                <label className="text-slate-700 font-bold block mb-1 font-mono uppercase text-[11px]">
                  Repository Path / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={addPath}
                  onChange={(e) => {
                    setAddPath(e.target.value);
                    setAddPathManuallyEdited(true);
                  }}
                  placeholder="e.g. /Grade 11 Science Guides"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Used as the tab pill name and filter path in the repository explorer.
                </p>
              </div>

              {/* Google Drive Link URL */}
              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold block font-mono uppercase text-[11px]">
                  Google Drive Folder / Resource Link *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={addDriveUrl}
                    onChange={(e) => setAddDriveUrl(e.target.value)}
                    placeholder="https://drive.google.com/drive/folders/1EAcyg-_LRsaZ6i_yu4pvDbBdoqPst6Lt?usp=drive_link"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <Link2 className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Real-time Drive ID Detection Badge */}
                {addDriveUrl.trim() && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1.5 text-emerald-800 font-mono font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      <span>Extracted Drive ID:</span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-emerald-300 text-emerald-950 font-bold">
                        {extractDriveId(addDriveUrl) || 'Validating URL...'}
                      </span>
                    </div>
                    <p className="text-[10px] text-emerald-700">
                      Files and embedded webview will automatically sync with this Google Drive folder ID.
                    </p>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-700 font-bold block mb-1 font-mono uppercase text-[11px]">
                  Folder Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={addDescription}
                  onChange={(e) => setAddDescription(e.target.value)}
                  placeholder="e.g. Table of specifications, assessment guides, and materials for senior high school teachers."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-sans text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs rounded-xl cursor-pointer shadow-2xs flex items-center space-x-1.5"
                >
                  <FolderPlus className="w-4 h-4 text-white" />
                  <span>Add Folder to Repository</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT FOLDER & EMBEDDED GOOGLE DRIVE LINK */}
      {isEditModalOpen && editingFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 font-sans animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-50 text-amber-700 rounded-xl border border-amber-200">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold font-mono text-slate-900">
                    Edit Folder & Google Drive Link
                  </h3>
                  <p className="text-xs text-slate-500">
                    Update folder metadata or replace the embedded Google Drive URL
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 bg-slate-100 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4 font-sans text-xs">
              {/* Folder Name */}
              <div>
                <label className="text-slate-700 font-bold block mb-1 font-mono uppercase text-[11px]">
                  Folder Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-sans text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Repository Path */}
              <div>
                <label className="text-slate-700 font-bold block mb-1 font-mono uppercase text-[11px]">
                  Repository Path / Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={editPath}
                  onChange={(e) => setEditPath(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Google Drive Link URL */}
              <div className="space-y-1.5">
                <label className="text-slate-700 font-bold block font-mono uppercase text-[11px]">
                  Embedded Google Drive Link (URL) *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    required
                    value={editDriveUrl}
                    onChange={(e) => setEditDriveUrl(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-3 pr-8 py-2 text-xs font-mono text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                  />
                  <Link2 className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                </div>

                {/* Real-time Drive ID Detection Badge */}
                {editDriveUrl.trim() && (
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
                    <div className="flex items-center space-x-1.5 text-amber-900 font-mono font-bold text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span>Drive ID:</span>
                      <span className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300 text-amber-950 font-bold">
                        {extractDriveId(editDriveUrl) || 'Detected'}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <label className="text-slate-700 font-bold block mb-1 font-mono uppercase text-[11px]">
                  Folder Description
                </label>
                <textarea
                  rows={2}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-sans text-slate-900 focus:outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-mono font-bold text-xs rounded-xl cursor-pointer shadow-2xs flex items-center space-x-1.5"
                >
                  <Edit2 className="w-4 h-4 text-white" />
                  <span>Save Link & Folder Changes</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: WEBVIEW PREVIEW MODAL */}
      {previewFolder && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0b120e] border border-emerald-800/80 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative space-y-4 font-sans text-white max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-emerald-900/60 pb-3 flex-shrink-0">
              <div className="flex items-center space-x-2.5 font-mono">
                <div className="p-2 bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 rounded-xl">
                  <FolderOpen className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">{previewFolder.name}</h3>
                    <span className="bg-emerald-900/80 text-emerald-300 border border-emerald-700/60 text-[10px] px-2 py-0.5 rounded font-mono">
                      {previewFolder.path}
                    </span>
                  </div>
                  <p className="text-[11px] text-emerald-400/80 font-sans">
                    Live Webview Preview of embedded Google Drive folder
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <a
                  href={previewFolder.driveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-mono font-bold flex items-center space-x-1"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open Drive</span>
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewFolder(null)}
                  className="p-1.5 text-emerald-400 hover:text-white bg-[#18231c] border border-emerald-800/60 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Embedded Iframe */}
            <div className="flex-1 min-h-[420px] bg-white rounded-xl overflow-hidden border border-emerald-900/40 relative">
              <iframe
                src={`https://drive.google.com/embeddedfolderview?id=${previewFolder.driveId || extractDriveId(previewFolder.driveUrl)}#grid`}
                className="w-full h-full border-0 absolute inset-0"
                title={`Google Drive Webview - ${previewFolder.name}`}
                allow="autoplay"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-emerald-400/80 pt-1 flex-shrink-0">
              <span className="truncate max-w-md">URL: {previewFolder.driveUrl}</span>
              <button
                type="button"
                onClick={() => setPreviewFolder(null)}
                className="px-4 py-1.5 bg-emerald-950 hover:bg-emerald-900 text-emerald-200 border border-emerald-800/60 rounded-lg cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
