import React, { useState } from 'react';
import { RepositoryCollection, AccessLevel } from '../types';
import {
  FolderGit2,
  Star,
  HardDrive,
  Users,
  Shield,
  Plus,
  Tag,
  Clock,
  ArrowRight,
  Database,
  Lock,
  Globe,
  X
} from 'lucide-react';

interface RepositoriesViewProps {
  repositories: RepositoryCollection[];
  onStarRepoToggle: (repoId: string) => void;
  onCreateRepository: (newRepo: Omit<RepositoryCollection, 'id' | 'fileCount' | 'totalSizeBytes' | 'totalSizeFormatted' | 'starsCount' | 'isStarred' | 'createdAt' | 'updatedAt'>) => void;
  onSelectRepoForFiles: (repoName: string) => void;
}

export const RepositoriesView: React.FC<RepositoriesViewProps> = ({
  repositories,
  onStarRepoToggle,
  onCreateRepository,
  onSelectRepoForFiles,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [category, setCategory] = useState('Databases & Sensors');
  const [description, setDescription] = useState('');
  const [accessLevel, setAccessLevel] = useState<AccessLevel>('public');
  const [maintainer, setMaintainer] = useState('SVNHS SHS Dept Team');
  const [tagsStr, setTagsStr] = useState('Data, Vault, S3');

  const handleNameChange = (val: string) => {
    setName(val);
    setSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const tags = tagsStr.split(',').map((t) => t.trim()).filter(Boolean);
    onCreateRepository({
      name,
      slug: slug || 'new-repo',
      description: description || 'New repository vault.',
      category,
      accessLevel,
      maintainer: maintainer || 'Repository Operator',
      tags: tags.length ? tags : ['Repository'],
    });

    setIsModalOpen(false);
    setName('');
    setDescription('');
  };

  const getAccessBadge = (level: AccessLevel) => {
    switch (level) {
      case 'public':
        return (
          <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1">
            <Globe className="w-3 h-3 text-emerald-700" />
            <span>Public</span>
          </span>
        );
      case 'internal':
        return (
          <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1">
            <Shield className="w-3 h-3 text-amber-700" />
            <span>Internal</span>
          </span>
        );
      case 'private':
        return (
          <span className="bg-rose-100 text-rose-800 border border-rose-300 text-[10px] px-2 py-0.5 rounded font-mono font-semibold flex items-center space-x-1">
            <Lock className="w-3 h-3 text-rose-700" />
            <span>Private</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
        <div>
          <div className="flex items-center space-x-2">
            <FolderGit2 className="w-5 h-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-900 font-mono">
              Repository Collections & Asset Vaults
            </h2>
          </div>
          <p className="text-xs text-slate-600 mt-1 max-w-xl font-sans leading-relaxed">
            Organized high-throughput storage repositories for scientific datasets, AI neural model weights, system software binaries, and academic literature.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-mono text-xs font-semibold rounded-xl transition-all shadow-xs flex items-center space-x-2 flex-shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Repository</span>
        </button>
      </div>

      {/* Grid of Repositories */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {repositories.map((repo) => (
          <div
            key={repo.id}
            className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col justify-between hover:border-blue-400 hover:shadow-md transition-all space-y-5"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                {getAccessBadge(repo.accessLevel)}
                <button
                  onClick={() => onStarRepoToggle(repo.id)}
                  className="flex items-center space-x-1 text-slate-500 hover:text-amber-500 font-mono text-xs transition-colors cursor-pointer"
                >
                  <Star className={`w-4 h-4 ${repo.isStarred ? 'fill-amber-400 text-amber-500' : ''}`} />
                  <span className={repo.isStarred ? 'text-amber-600 font-bold' : ''}>{repo.starsCount}</span>
                </button>
              </div>

              <h3 className="text-base font-bold font-mono text-slate-900 tracking-tight">{repo.name}</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-sans">{repo.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {repo.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-mono px-2 py-0.5 rounded"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-200">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 font-mono text-xs">
                <div>
                  <span className="text-slate-500 text-[9px] block uppercase tracking-widest font-semibold">FILES</span>
                  <span className="text-slate-900 font-bold">{repo.fileCount} Assets</span>
                </div>

                <div>
                  <span className="text-slate-500 text-[9px] block uppercase tracking-widest font-semibold">SIZE</span>
                  <span className="text-blue-700 font-bold">{repo.totalSizeFormatted}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 font-medium">
                <span>By: {repo.maintainer}</span>
                <span>Updated: {repo.updatedAt}</span>
              </div>

              <button
                onClick={() => onSelectRepoForFiles(repo.name)}
                className="w-full py-2 bg-slate-50 hover:bg-blue-50 text-blue-700 font-mono text-xs font-semibold rounded-xl border border-slate-200 hover:border-blue-300 transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Browse Files in Repo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Repository Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5 text-slate-800 font-sans">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 font-mono">
              <div className="flex items-center space-x-2">
                <FolderGit2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Create New Repository</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800 bg-slate-100 border border-slate-200 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-slate-700 block mb-1 text-[10px] uppercase tracking-wider font-bold">Repository Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. High Performance Compute Datasets"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 font-medium"
                />
              </div>

              <div>
                <label className="text-slate-700 block mb-1 text-[10px] uppercase tracking-wider font-bold">Slug URI Identifier</label>
                <input
                  type="text"
                  disabled
                  value={slug}
                  className="w-full bg-slate-100 border border-slate-200 text-slate-500 rounded-xl px-3 py-2 text-xs font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-700 block mb-1 text-[10px] uppercase tracking-wider font-bold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 font-medium"
                  >
                    <option value="Databases & Sensors">Databases & Sensors</option>
                    <option value="Machine Learning">Machine Learning</option>
                    <option value="Education & Research">Education & Research</option>
                    <option value="System Software">System Software</option>
                    <option value="Media & 3D Assets">Media & 3D Assets</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-700 block mb-1 text-[10px] uppercase tracking-wider font-bold">Access Visibility</label>
                  <select
                    value={accessLevel}
                    onChange={(e) => setAccessLevel(e.target.value as AccessLevel)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-blue-600 font-medium"
                  >
                    <option value="public">Public</option>
                    <option value="internal">Internal</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-slate-700 block mb-1 text-[10px] uppercase tracking-wider font-bold">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Explain the purpose and data contents of this repository..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 font-medium"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-200 cursor-pointer font-bold"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                >
                  Initialize Repository
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
