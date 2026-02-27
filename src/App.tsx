import React, { useState, useEffect, useRef } from 'react';
import { 
  Github, 
  Upload, 
  Link as LinkIcon, 
  Copy, 
  Trash2, 
  ExternalLink, 
  ChevronRight, 
  LogOut, 
  Settings, 
  Check,
  Loader2,
  Plus,
  Search,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---

interface User {
  username: string;
  avatar_url: string;
  selected_repo: string | null;
  selected_branch: string | null;
}

interface Repo {
  full_name: string;
  name: string;
  private: boolean;
  default_branch: string;
}

interface Asset {
  name: string;
  path: string;
  sha: string;
  size: number;
  download_url: string;
  cdn_url: string;
}

// --- Components ---

const Navbar = ({ user, onLogout }: { user: User | null, onLogout: () => void }) => (
  <nav className="border-b border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between h-16 items-center">
        <div className="flex items-center gap-2">
          <div className="bg-zinc-900 p-1.5 rounded-lg">
            <Github className="w-6 h-6 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-100">GitCDN</span>
        </div>
        
        {user && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 rounded-full border border-zinc-200 dark:border-zinc-700">
              <img src={user.avatar_url} alt={user.username} className="w-6 h-6 rounded-full" />
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{user.username}</span>
            </div>
            <button 
              onClick={onLogout}
              className="p-2 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    </div>
  </nav>
);

const LandingPage = ({ onConnect }: { onConnect: () => void }) => (
  <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 py-20 bg-zinc-50 dark:bg-zinc-950">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center max-w-3xl"
    >
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium border border-emerald-100 dark:border-emerald-800 mb-6">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        Open Source Asset Hosting
      </div>
      <h1 className="text-5xl md:text-7xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight mb-6">
        Use GitHub as Your <span className="text-emerald-600 dark:text-emerald-400">Asset CDN</span>
      </h1>
      <p className="text-xl text-zinc-600 dark:text-zinc-300 mb-10 leading-relaxed">
        Turn any GitHub repository into a lightweight public asset CDN. 
        Upload images directly to your repo and get instant, reliable public URLs.
      </p>
      
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button 
          onClick={onConnect}
          className="flex items-center justify-center gap-2 px-8 py-4 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 dark:shadow-zinc-950/30"
        >
          <Github className="w-5 h-5" />
          Connect with GitHub
        </button>
        <a 
          href="https://github.com" 
          target="_blank" 
          className="flex items-center justify-center gap-2 px-8 py-4 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-all"
        >
          View Documentation
        </a>
      </div>

      <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
        {[
          { title: "Zero Config", desc: "No S3 buckets or complex IAM roles. Just your GitHub repo.", icon: <Settings className="w-6 h-6" /> },
          { title: "Instant CDN", desc: "Leverage jsDelivr for lightning-fast global asset delivery.", icon: <LinkIcon className="w-6 h-6" /> },
          { title: "Full Control", desc: "You own the data. Files live in your repo, not our servers.", icon: <Check className="w-6 h-6" /> },
        ].map((feature, i) => (
          <div key={i} className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 shadow-sm">
            <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-xl flex items-center justify-center text-zinc-900 dark:text-zinc-100 mb-4">
              {feature.icon}
            </div>
            <h3 className="font-bold text-zinc-900 dark:text-zinc-100 mb-2">{feature.title}</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm leading-relaxed">{feature.desc}</p>
          </div>
        ))}
      </div>
    </motion.div>
  </div>
);

const RepoSelector = ({ repos, onSelect, loading }: { repos: Repo[], onSelect: (repo: Repo) => void, loading: boolean }) => {
  const [search, setSearch] = useState('');
  const filteredRepos = repos.filter(r => r.full_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">Select a Repository</h2>
        <p className="text-zinc-500 dark:text-zinc-400">Choose the repository you want to use as your asset CDN.</p>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
            <input 
              type="text" 
              placeholder="Search repositories..." 
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
              <p className="text-sm text-zinc-500 dark:text-zinc-400">Loading your repositories...</p>
            </div>
          ) : filteredRepos.length > 0 ? (
            filteredRepos.map((repo) => (
              <button
                key={repo.full_name}
                onClick={() => onSelect(repo)}
                className="w-full flex items-center justify-between p-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors border-b border-zinc-50 dark:border-zinc-800 last:border-0 group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg group-hover:bg-white dark:group-hover:bg-zinc-900 transition-colors">
                    <Github className="w-5 h-5 text-zinc-600 dark:text-zinc-300" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{repo.name}</p>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">{repo.full_name} • {repo.default_branch}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {repo.private ? (
                    <span className="px-2 py-0.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px] font-bold uppercase tracking-wider rounded">Private</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider rounded">Public</span>
                  )}
                  <ChevronRight className="w-4 h-4 text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-900 dark:group-hover:text-zinc-100 dark:hover:text-zinc-100 transition-colors" />
                </div>
              </button>
            ))
          ) : (
            <div className="p-12 text-center">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">No repositories found.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Dashboard = ({ user, onChangeRepo }: { user: User, onChangeRepo: () => void }) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [copying, setCopying] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async () => {
    try {
      const res = await fetch('/api/assets');
      const data = await res.json();
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const fileInput = e.target;
    if (!file) return;

    setUploadError(null);
    setUploading(true);
    setUploadingFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const content = typeof reader.result === 'string' ? reader.result : null;
      if (!content) {
        setUploadError('Failed to read file before upload.');
        setUploading(false);
        setUploadingFileName(null);
        fileInput.value = '';
        return;
      }

      try {
        const res = await fetch('/api/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name,
            content,
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          setUploadError(errorData?.error || 'Upload failed. Please try again.');
          return;
        }

        if (res.ok) {
          await fetchAssets();
        }
      } catch (err) {
        console.error(err);
        setUploadError('Upload failed. Please try again.');
      } finally {
        setUploading(false);
        setUploadingFileName(null);
        fileInput.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete ${asset.name}?`)) return;
    try {
      await fetch(`/api/assets/${asset.name}?sha=${asset.sha}`, { method: 'DELETE' });
      fetchAssets();
    } catch (err) {
      console.error(err);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopying(id);
    setTimeout(() => setCopying(null), 2000);
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
        <div>
          <div className="flex items-center gap-2 text-sm text-zinc-500 dark:text-zinc-400 mb-1">
            <Github className="w-4 h-4" />
            <span>Connected to</span>
            <button 
              onClick={onChangeRepo}
              className="font-semibold text-zinc-900 dark:text-zinc-100 hover:underline flex items-center gap-1"
            >
              {user.selected_repo}
              <span className="text-zinc-400 dark:text-zinc-500">({user.selected_branch || 'main'})</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
          <h2 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">Asset Library</h2>
        </div>

        <div className="flex items-center gap-3">
          <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleUpload}
            accept="image/*,video/*,audio/*,application/pdf"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload Asset'}
          </button>
        </div>
      </div>

      {uploading ? (
        <div className="mb-6 rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 flex items-start gap-3">
          <Loader2 className="w-4 h-4 mt-0.5 text-emerald-600 dark:text-emerald-400 animate-spin" />
          <div>
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Uploading asset...</p>
            <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80 truncate max-w-xl">{uploadingFileName}</p>
            <p className="text-xs text-emerald-700/70 dark:text-emerald-300/70 mt-1">Your file will be stored with a randomized private filename.</p>
          </div>
        </div>
      ) : null}

      {uploadError ? (
        <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {uploadError}
        </div>
      ) : null}

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
          <p className="text-zinc-500 dark:text-zinc-400">Fetching your assets...</p>
        </div>
      ) : assets.length === 0 ? (
        <div className="py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-3xl flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-300 dark:text-zinc-600 mb-6">
            <Upload className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">No assets yet</h3>
          <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8">
            Upload your first image, video, or document to start using GitCDN.
          </p>
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-6 py-2.5 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-all disabled:opacity-50"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {uploading ? 'Uploading...' : 'Upload First Asset'}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {assets.map((asset) => (
              <motion.div 
                key={asset.sha}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-xl hover:shadow-zinc-200 dark:hover:shadow-zinc-950/50 transition-all"
              >
                <div className="aspect-video bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800">
                  {asset.name.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i) ? (
                    <img 
                      src={asset.download_url} 
                      alt={asset.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <FileText className="w-12 h-12 text-zinc-300 dark:text-zinc-600" />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button 
                      onClick={() => window.open(asset.cdn_url, '_blank')}
                      className="p-2 bg-white dark:bg-zinc-900 rounded-lg text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/70 transition-colors"
                      title="Open in Browser"
                    >
                      <ExternalLink className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(asset)}
                      className="p-2 bg-white dark:bg-zinc-900 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="Delete Asset"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="min-w-0">
                      <h4 className="font-bold text-zinc-900 dark:text-zinc-100 truncate text-sm" title={asset.name}>
                        {asset.name}
                      </h4>
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">{formatSize(asset.size)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Public CDN URL</label>
                      <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-950 rounded-lg border border-zinc-100 dark:border-zinc-800">
                        <code className="text-[10px] text-zinc-600 dark:text-zinc-300 truncate flex-1 font-mono">{asset.cdn_url}</code>
                        <button 
                          onClick={() => copyToClipboard(asset.cdn_url, asset.sha)}
                          className="p-1 text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                          {copying === asset.sha ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'repos' | 'dashboard'>('landing');

  const fetchUser = async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.selected_repo) {
          setView('dashboard');
        } else {
          setView('repos');
          void fetchRepos();
        }
      } else {
        setUser(null);
        setView('landing');
      }
    } catch (err) {
      setUser(null);
      setView('landing');
    } finally {
      setLoading(false);
    }
  };

  const fetchRepos = async () => {
    setReposLoading(true);
    try {
      const res = await fetch('/api/repos');
      if (!res.ok) {
        setRepos([]);
        return;
      }
      const data = await res.json();
      setRepos(data);
    } catch (err) {
      console.error(err);
      setRepos([]);
    } finally {
      setReposLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        void fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleConnect = async () => {
    try {
      const res = await fetch('/api/auth/url');
      if (!res.ok) {
        return;
      }
      const { url } = await res.json();
      window.open(url, 'github_oauth', 'width=600,height=700');
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectRepo = async (repo: Repo) => {
    try {
      await fetch('/api/select-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repo.full_name, branch: repo.default_branch })
      });
      void fetchUser();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setView('landing');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans selection:bg-emerald-100 dark:selection:bg-emerald-900/40 selection:text-emerald-900 dark:selection:text-emerald-200">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main>
        {view === 'landing' && <LandingPage onConnect={handleConnect} />}
        {view === 'repos' && <RepoSelector repos={repos} onSelect={handleSelectRepo} loading={reposLoading} />}
        {view === 'dashboard' && user && (
          <Dashboard 
            user={user} 
            onChangeRepo={() => {
              setView('repos');
              void fetchRepos();
            }} 
          />
        )}
      </main>

      <footer className="border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Github className="w-5 h-5 text-zinc-400 dark:text-zinc-500" />
            <span className="font-bold text-zinc-900 dark:text-zinc-100">GitCDN</span>
          </div>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            Built for developers who love GitHub. 
            <br />
            No tracking. No ads. Just your assets.
          </p>
          <div className="mt-8 flex justify-center gap-6">
            <a href="#" className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Privacy</a>
            <a href="#" className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">Terms</a>
            <a href="#" className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
