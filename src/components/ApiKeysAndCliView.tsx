import React, { useState } from 'react';
import { ApiAccessKey } from '../types';
import {
  Key,
  Terminal,
  Plus,
  Copy,
  Check,
  ShieldAlert,
  ShieldCheck,
  Code2,
  Trash2,
  Globe,
  Database,
  Lock,
  X
} from 'lucide-react';

interface ApiKeysAndCliViewProps {
  apiKeys: ApiAccessKey[];
  onCreateKey: (name: string, permissions: ('read' | 'write' | 'admin')[]) => void;
  onRevokeKey: (keyId: string) => void;
}

export const ApiKeysAndCliView: React.FC<ApiKeysAndCliViewProps> = ({
  apiKeys,
  onCreateKey,
  onRevokeKey,
}) => {
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [permRead, setPermRead] = useState(true);
  const [permWrite, setPermWrite] = useState(false);
  const [permAdmin, setPermAdmin] = useState(false);

  // Selected CLI Language Tab
  const [cliLang, setCliLang] = useState<'curl' | 'python' | 'cli' | 's3'>('cli');

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLabel(label);
    setTimeout(() => setCopiedLabel(null), 2000);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;

    const perms: ('read' | 'write' | 'admin')[] = [];
    if (permRead) perms.push('read');
    if (permWrite) perms.push('write');
    if (permAdmin) perms.push('admin');

    onCreateKey(newKeyName, perms.length ? perms : ['read']);
    setIsModalOpen(false);
    setNewKeyName('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="bg-[#0a0a0f] p-5 rounded-2xl border border-slate-800/80 space-y-2 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold text-white font-mono">
              Developer API Keys, CLI Sync & S3 Endpoint Credentials
            </h2>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-mono text-xs font-semibold rounded-xl transition-all shadow-md shadow-blue-900/40 flex items-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Access Token</span>
          </button>
        </div>
        <p className="text-xs text-slate-400 font-sans leading-relaxed">
          Authenticate command-line scripts, CI/CD artifact publishers, Git-LFS drivers, and S3-compatible bucket tools with secure HMAC access tokens.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: API Access Keys List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Active SVNHS SHS Dept API Tokens ({apiKeys.length})</span>
              </h3>
            </div>

            <div className="space-y-3">
              {apiKeys.map((key) => (
                <div
                  key={key.id}
                  className={`p-4 rounded-xl border transition-all ${
                    key.status === 'active'
                      ? 'bg-[#050507] border-slate-800'
                      : 'bg-rose-950/10 border-rose-900/40 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-xs font-bold text-white">{key.name}</h4>
                        <span className="bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[10px] px-2 py-0.5 rounded uppercase">
                          {key.permissions.join(' + ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-1">Created: {key.createdAt} • Last Used: {key.lastUsed}</span>
                    </div>

                    {key.status === 'active' ? (
                      <button
                        onClick={() => onRevokeKey(key.id)}
                        className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-[10px] rounded transition-all flex items-center space-x-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Revoke Token</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-rose-400 font-bold uppercase">Revoked</span>
                    )}
                  </div>

                  <div className="flex items-center justify-between bg-[#0a0a0f] p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300">
                    <span className="font-mono text-[11px]">{key.fullToken}</span>
                    <button
                      onClick={() => handleCopy(key.fullToken, key.id)}
                      className="p-1 text-blue-400 hover:text-white rounded transition-colors"
                    >
                      {copiedLabel === key.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* S3 Endpoint Configuration Card */}
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
            <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
              <Database className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                S3-Compatible Gateway Endpoint Configuration
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="bg-[#050507] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase tracking-widest mb-1">S3 ENDPOINT URL</span>
                <span className="text-blue-400 font-bold">https://s3.corevault.io/v1</span>
              </div>

              <div className="bg-[#050507] p-3 rounded-xl border border-slate-800">
                <span className="text-slate-500 text-[10px] block uppercase tracking-widest mb-1">DEFAULT REGION</span>
                <span className="text-emerald-400 font-bold">us-east-1 (Global Edge)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Interactive CLI & Code Snippets Generator */}
        <div className="space-y-4">
          <div className="bg-[#0a0a0f] border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4 font-mono text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  CLI & Code Integrations
                </h3>
              </div>
            </div>

            {/* Language Selector Tabs */}
            <div className="flex space-x-1 bg-[#050507] p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setCliLang('cli')}
                className={`flex-1 py-1 rounded text-[11px] ${cliLang === 'cli' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                CoreVault CLI
              </button>
              <button
                onClick={() => setCliLang('curl')}
                className={`flex-1 py-1 rounded text-[11px] ${cliLang === 'curl' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                cURL
              </button>
              <button
                onClick={() => setCliLang('python')}
                className={`flex-1 py-1 rounded text-[11px] ${cliLang === 'python' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                Python SDK
              </button>
              <button
                onClick={() => setCliLang('s3')}
                className={`flex-1 py-1 rounded text-[11px] ${cliLang === 's3' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                AWS CLI / S3
              </button>
            </div>

            {/* Snippet Output */}
            <div className="bg-[#050507] p-4 rounded-xl border border-slate-800 text-[11px] space-y-3 relative group">
              <button
                onClick={() => {
                  let snippetText = '';
                  if (cliLang === 'cli') snippetText = `curl -sSL https://get.corevault.io | sh\ncorevault login --token cv_live_9a81f02...\ncorevault pull /datasets/climate_50y_global_oceanography.netcdf4`;
                  if (cliLang === 'curl') snippetText = `curl -X GET "https://repository.corevault.io/v1/files/datasets/climate_50y" \\\n  -H "Authorization: Bearer cv_live_9a81f02..."`;
                  if (cliLang === 'python') snippetText = `import corevault\n\nclient = corevault.Client(api_key="cv_live_9a81f02...")\nfile_data = client.download("/datasets/climate_50y")`;
                  if (cliLang === 's3') snippetText = `aws s3 cp s3://corevault-bucket/datasets/climate_50y . \\\n  --endpoint-url https://s3.corevault.io/v1`;
                  handleCopy(snippetText, 'snippet');
                }}
                className="absolute top-3 right-3 p-1.5 bg-[#0a0a0f] text-blue-400 hover:text-white rounded border border-slate-800"
              >
                {copiedLabel === 'snippet' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              {cliLang === 'cli' && (
                <pre className="text-emerald-300 overflow-x-auto leading-relaxed">
                  <code>
                    {`# 1. Install CoreVault CLI\ncurl -sSL https://get.corevault.io | sh\n\n# 2. Authenticate Token\ncorevault login --token cv_live_9a81f02...\n\n# 3. Pull File Asset\ncorevault pull /datasets/climate_50y_global_oceanography.netcdf4`}
                  </code>
                </pre>
              )}

              {cliLang === 'curl' && (
                <pre className="text-blue-300 overflow-x-auto leading-relaxed">
                  <code>
                    {`curl -X GET "https://repository.corevault.io/v1/files/datasets/climate_50y" \\\n  -H "Authorization: Bearer cv_live_9a81f02..." \\\n  --output climate_50y.nc`}
                  </code>
                </pre>
              )}

              {cliLang === 'python' && (
                <pre className="text-purple-300 overflow-x-auto leading-relaxed">
                  <code>
                    {`import corevault\n\nclient = corevault.Client(\n    api_key="cv_live_9a81f02...",\n    endpoint="https://repository.corevault.io"\n)\n\n# Stream chunked dataset directly to memory\ndata = client.download("/datasets/climate_50y")`}
                  </code>
                </pre>
              )}

              {cliLang === 's3' && (
                <pre className="text-amber-300 overflow-x-auto leading-relaxed">
                  <code>
                    {`aws s3 cp s3://corevault-vault/datasets/climate_50y . \\\n  --endpoint-url https://s3.corevault.io/v1 \\\n  --region us-east-1`}
                  </code>
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Generate Access Token Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#050507]/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0a0a0f] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5 text-slate-100 font-sans">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 font-mono">
              <div className="flex items-center space-x-2">
                <Key className="w-5 h-5 text-blue-400" />
                <h3 className="text-base font-bold text-white">Generate Access Token</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white bg-[#0d0d14] border border-slate-800 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 font-mono text-xs">
              <div>
                <label className="text-slate-400 block mb-1 text-[10px] uppercase tracking-wider">Token Name / Service *</label>
                <input
                  type="text"
                  required
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. GitHub Actions CI Deploy Token"
                  className="w-full bg-[#050507] border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-2 text-[10px] uppercase tracking-wider">Token Permissions</label>
                <div className="space-y-2 bg-[#050507] p-3 rounded-xl border border-slate-800">
                  <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permRead}
                      onChange={(e) => setPermRead(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span>Read (Download Repository Files & Metadata)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permWrite}
                      onChange={(e) => setPermWrite(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span>Write (Upload & Modify Repository Assets)</span>
                  </label>

                  <label className="flex items-center space-x-2 text-xs text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={permAdmin}
                      onChange={(e) => setPermAdmin(e.target.checked)}
                      className="rounded accent-blue-600"
                    />
                    <span>Admin (Full Quota & Access Control Management)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#0d0d14] hover:bg-slate-800 text-slate-300 rounded-xl border border-slate-800"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-md shadow-blue-900/40"
                >
                  Create HMAC Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
