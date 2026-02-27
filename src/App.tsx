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
  Check,
  Loader2,
  Plus,
  Search,
  FileText,
  Folder,
  FolderPlus,
  ArrowRightLeft
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
  folder: string;
  sha: string;
  size: number;
  download_url: string | null;
  cdn_url: string;
}

interface FolderEntry {
  name: string;
  path: string;
}

interface AssetsResponse {
  current_folder: string;
  folders: FolderEntry[];
  files: Asset[];
  all_folders: string[];
}

interface FolderTreeNode {
  path: string;
  name: string;
  children: FolderTreeNode[];
}

function getParentFolderPath(path: string): string {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash < 0) {
    return '';
  }

  return path.slice(0, lastSlash);
}

function getFolderDisplayName(path: string): string {
  const parentPath = getParentFolderPath(path);
  if (!parentPath) {
    return path;
  }

  return path.slice(parentPath.length + 1);
}

function buildFolderTree(paths: string[]): FolderTreeNode[] {
  const sortedPaths = [...new Set(paths)].sort((a, b) => a.localeCompare(b));
  const nodeMap = new Map<string, FolderTreeNode>();

  for (const path of sortedPaths) {
    nodeMap.set(path, {
      path,
      name: getFolderDisplayName(path),
      children: [],
    });
  }

  const roots: FolderTreeNode[] = [];
  for (const path of sortedPaths) {
    const node = nodeMap.get(path);
    if (!node) {
      continue;
    }

    const parentPath = getParentFolderPath(path);
    if (parentPath && nodeMap.has(parentPath)) {
      nodeMap.get(parentPath)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortTree = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    for (const node of nodes) {
      sortTree(node.children);
    }
  };

  sortTree(roots);
  return roots;
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
  <div className="h-full px-4 py-12 sm:py-16 bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden">
    <div className="absolute -top-24 -right-16 w-72 h-72 bg-emerald-400/20 dark:bg-emerald-500/15 blur-3xl rounded-full pointer-events-none" />
    <div className="absolute top-1/2 -left-24 w-64 h-64 bg-zinc-300/20 dark:bg-zinc-700/25 blur-3xl rounded-full pointer-events-none" />
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1.15fr,0.85fr] gap-8 lg:gap-12 items-center relative"
    >
      <div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-900 dark:text-zinc-100 leading-tight">
          Publish assets from the same repo you already ship.
        </h1>
        <p className="mt-5 text-lg text-zinc-600 dark:text-zinc-300 max-w-2xl leading-relaxed">
          GitCDN gives your team a clean path from upload to public URL without adding another storage vendor.
          Keep files in GitHub, deliver via jsDelivr.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row gap-3">
          <button
            onClick={onConnect}
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-zinc-900 text-white rounded-xl font-semibold hover:bg-zinc-800 transition-all shadow-lg shadow-zinc-200 dark:shadow-zinc-950/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-50 dark:focus-visible:ring-offset-zinc-950 active:ring-2 active:ring-emerald-500/80 active:ring-offset-2 active:ring-offset-zinc-50 dark:active:ring-offset-zinc-950 active:scale-[0.99]"
          >
            <Github className="w-5 h-5" />
            Connect with GitHub
          </button>
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="flex items-center justify-center gap-2 px-6 py-3.5 bg-white dark:bg-zinc-900 text-zinc-400 dark:text-zinc-500 border border-zinc-200 dark:border-zinc-700 rounded-xl font-semibold cursor-not-allowed opacity-70"
          >
            <LinkIcon className="w-4 h-4" />
            Docs & Source
          </button>
        </div>

        <div className="mt-8 flex flex-wrap gap-2">
          {['OAuth login', 'Folder-based library', 'Instant CDN URLs'].map((badge) => (
            <span key={badge} className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              {badge}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-700 shadow-xl shadow-zinc-200/60 dark:shadow-zinc-950/40 overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/60">
          <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">How teams use GitCDN</p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Fast path from repository to production asset URL.</p>
        </div>
        <div className="p-5 space-y-4">
          {[
            { step: '01', title: 'Connect GitHub', desc: 'Authorize once and pick a repository branch.' },
            { step: '02', title: 'Organize by folders', desc: 'Group files by product area or release.' },
            { step: '03', title: 'Ship public links', desc: 'Copy CDN URLs directly into your app.' },
          ].map((item) => (
            <div key={item.step} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-bold flex items-center justify-center flex-shrink-0">
                {item.step}
              </div>
              <div>
                <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{item.title}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}

          <div className="mt-4 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700">
            <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">Example URL</p>
            <code className="text-[11px] text-zinc-700 dark:text-zinc-300 break-all">
              https://cdn.jsdelivr.net/gh/your-org/assets-repo@main/assets/hero/logo.png
            </code>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 p-3">
              <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">No vendor lock-in</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Files stay in GitHub.</p>
            </div>
            <div className="rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 p-3">
              <p className="text-[11px] font-semibold text-zinc-900 dark:text-zinc-100">Built for OSS</p>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Simple and transparent.</p>
            </div>
          </div>
        </div>
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
  const [folders, setFolders] = useState<FolderEntry[]>([]);
  const [allFolders, setAllFolders] = useState<string[]>([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [newFolderName, setNewFolderName] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [folderActionError, setFolderActionError] = useState<string | null>(null);
  const [folderActionLoading, setFolderActionLoading] = useState(false);
  const [movingAssetPath, setMovingAssetPath] = useState<string | null>(null);
  const [moveTargets, setMoveTargets] = useState<Record<string, string>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [draggedAsset, setDraggedAsset] = useState<{ path: string; folder: string } | null>(null);
  const [dropFolderPath, setDropFolderPath] = useState<string | null>(null);
  const [imagePreviewAttempts, setImagePreviewAttempts] = useState<Record<string, number>>({});
  const [copying, setCopying] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchAssets = async (folderOverride?: string) => {
    const targetFolder = folderOverride ?? currentFolder;
    try {
      const params = new URLSearchParams();
      if (targetFolder) {
        params.set('folder', targetFolder);
      }

      const endpoint = params.toString() ? `/api/assets?${params.toString()}` : '/api/assets';
      const res = await fetch(endpoint);
      if (!res.ok) {
        setAssets([]);
        setFolders([]);
        setAllFolders([]);
        return;
      }

      const data = (await res.json()) as AssetsResponse;
      setAssets(data.files ?? []);
      setFolders(data.folders ?? []);
      setAllFolders(data.all_folders ?? []);
      setCurrentFolder(data.current_folder ?? targetFolder);
      setImagePreviewAttempts({});
    } catch (err) {
      console.error(err);
      setAssets([]);
      setFolders([]);
      setAllFolders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAssets('');
  }, []);

  const openFolder = async (path: string) => {
    setLoading(true);
    setFolderActionError(null);
    if (path) {
      setExpandedFolders((previous) => {
        const next = { ...previous };
        let cursor = path;
        while (cursor) {
          next[cursor] = true;
          cursor = getParentFolderPath(cursor);
        }
        return next;
      });
    }

    await fetchAssets(path);
  };

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
            folder: currentFolder,
            content,
          })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          setUploadError(errorData?.error || 'Upload failed. Please try again.');
          return;
        }

        if (res.ok) {
          await fetchAssets(currentFolder);
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
    if (!confirm(`Are you sure you want to delete ${asset.path}?`)) return;
    try {
      const params = new URLSearchParams({ path: asset.path, sha: asset.sha });
      await fetch(`/api/assets?${params.toString()}`, { method: 'DELETE' });
      await fetchAssets(currentFolder);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateFolder = async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) {
      return;
    }

    const targetPath = currentFolder ? `${currentFolder}/${trimmed}` : trimmed;
    setFolderActionLoading(true);
    setFolderActionError(null);
    try {
      const res = await fetch('/api/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: targetPath }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFolderActionError(errorData?.error || 'Failed to create folder.');
        return;
      }

      setNewFolderName('');
      await fetchAssets(currentFolder);
    } catch (err) {
      console.error(err);
      setFolderActionError('Failed to create folder.');
    } finally {
      setFolderActionLoading(false);
    }
  };

  const handleDeleteFolder = async (folderPath: string) => {
    if (!confirm(`Delete folder "${folderPath}" and all nested files?`)) {
      return;
    }

    setFolderActionLoading(true);
    setFolderActionError(null);
    try {
      const params = new URLSearchParams({ path: folderPath });
      const res = await fetch(`/api/folders?${params.toString()}`, { method: 'DELETE' });
      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFolderActionError(errorData?.error || 'Failed to delete folder.');
        return;
      }

      const nextFolder = currentFolder.startsWith(`${folderPath}/`) || currentFolder === folderPath
        ? getParentFolderPath(folderPath)
        : currentFolder;
      await fetchAssets(nextFolder);
    } catch (err) {
      console.error(err);
      setFolderActionError('Failed to delete folder.');
    } finally {
      setFolderActionLoading(false);
    }
  };

  const moveAssetToFolder = async (assetPath: string, sourceFolder: string, destinationFolder: string) => {
    if (destinationFolder === sourceFolder) {
      return false;
    }

    setMovingAssetPath(assetPath);
    setFolderActionError(null);
    try {
      const res = await fetch('/api/assets/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: assetPath,
          destination_folder: destinationFolder,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFolderActionError(errorData?.error || 'Failed to move asset.');
        return false;
      }

      await fetchAssets(currentFolder);
      return true;
    } catch (err) {
      console.error(err);
      setFolderActionError('Failed to move asset.');
      return false;
    } finally {
      setMovingAssetPath(null);
    }
  };

  const handleMoveAsset = async (asset: Asset) => {
    const destinationFolder = moveTargets[asset.path] ?? currentFolder;
    await moveAssetToFolder(asset.path, asset.folder, destinationFolder);
  };

  const handleAssetDragStart = (asset: Asset) => {
    setDraggedAsset({ path: asset.path, folder: asset.folder });
    setDropFolderPath(null);
    setFolderActionError(null);
  };

  const handleAssetDragEnd = () => {
    setDraggedAsset(null);
    setDropFolderPath(null);
  };

  const handleFolderDragOver = (event: React.DragEvent, targetFolderPath: string) => {
    if (!draggedAsset || draggedAsset.folder === targetFolderPath) {
      return;
    }

    event.preventDefault();
    if (dropFolderPath !== targetFolderPath) {
      setDropFolderPath(targetFolderPath);
    }
  };

  const handleFolderDrop = async (event: React.DragEvent, targetFolderPath: string) => {
    event.preventDefault();
    if (!draggedAsset) {
      return;
    }

    setDropFolderPath(null);
    const source = draggedAsset;
    setDraggedAsset(null);
    await moveAssetToFolder(source.path, source.folder, targetFolderPath);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopying(id);
    setTimeout(() => setCopying(null), 2000);
  };

  const isImageAsset = (assetName: string) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(assetName);

  const getPreviewUrl = (asset: Asset) => {
    const attempt = imagePreviewAttempts[asset.sha] ?? 0;
    if (attempt === 0 && asset.download_url) {
      return asset.download_url;
    }
    if (attempt <= 1 && asset.cdn_url) {
      return asset.cdn_url;
    }
    return null;
  };

  const handlePreviewError = (asset: Asset) => {
    setImagePreviewAttempts((previous) => ({
      ...previous,
      [asset.sha]: Math.min((previous[asset.sha] ?? 0) + 1, 2),
    }));
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const breadcrumbParts = currentFolder ? currentFolder.split('/') : [];
  const currentFolderLabel = currentFolder || 'Root';
  const folderTree = buildFolderTree(allFolders);

  const renderFolderTree = (nodes: FolderTreeNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasChildren = node.children.length > 0;
      const isExpanded = expandedFolders[node.path] ?? true;
      const isActive = node.path === currentFolder;
      const isDropTarget = dropFolderPath === node.path && draggedAsset?.folder !== node.path;

      return (
        <React.Fragment key={node.path}>
          <div
            className={`flex items-center gap-1 rounded-lg px-2 py-1.5 transition-colors ${
              isActive
                ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
            } ${isDropTarget ? 'ring-2 ring-emerald-500/60' : ''}`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onDragOver={(event) => handleFolderDragOver(event, node.path)}
            onDrop={(event) => void handleFolderDrop(event, node.path)}
          >
            <button
              onClick={() =>
                hasChildren
                  ? setExpandedFolders((previous) => ({ ...previous, [node.path]: !(previous[node.path] ?? true) }))
                  : void openFolder(node.path)
              }
              className="p-0.5 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
              title={hasChildren ? 'Toggle folder tree' : 'Open folder'}
            >
              {hasChildren ? (
                <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              ) : (
                <span className="w-3 h-3 inline-block" />
              )}
            </button>
            <button
              onClick={() => void openFolder(node.path)}
              className="min-w-0 flex items-center gap-2 text-left flex-1"
              title={node.path}
            >
              <Folder className="w-4 h-4 flex-shrink-0 text-emerald-500" />
              <span className="truncate text-sm">{node.name}</span>
            </button>
          </div>
          {hasChildren && isExpanded ? renderFolderTree(node.children, depth + 1) : null}
        </React.Fragment>
      );
    });
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
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Current folder: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{currentFolderLabel}</span></p>
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

      {folderActionError ? (
        <div className="mb-6 rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm font-medium text-red-700 dark:text-red-300">
          {folderActionError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <aside className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden h-fit">
          <div className="px-4 py-3 border-b border-zinc-200 dark:border-zinc-700">
            <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Folder Tree</p>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Drag files onto folders to move them.</p>
          </div>

          <div className="p-2 space-y-1 max-h-[52vh] overflow-y-auto">
            <div
              className={`flex items-center gap-2 rounded-lg px-2 py-1.5 cursor-pointer transition-colors ${
                currentFolder === ''
                  ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-200'
                  : 'hover:bg-zinc-100 dark:hover:bg-zinc-800'
              } ${dropFolderPath === '' && draggedAsset?.folder !== '' ? 'ring-2 ring-emerald-500/60' : ''}`}
              onClick={() => void openFolder('')}
              onDragOver={(event) => handleFolderDragOver(event, '')}
              onDrop={(event) => void handleFolderDrop(event, '')}
            >
              <Folder className="w-4 h-4 text-emerald-500" />
              <span className="text-sm font-medium">Root</span>
            </div>
            {folderTree.length > 0 ? renderFolderTree(folderTree) : (
              <p className="px-2 py-2 text-xs text-zinc-500 dark:text-zinc-400">No folders yet.</p>
            )}
          </div>

          <div className="px-3 py-3 border-t border-zinc-200 dark:border-zinc-700 space-y-2">
            <div className="relative">
              <FolderPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                value={newFolderName}
                onChange={(event) => setNewFolderName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    void handleCreateFolder();
                  }
                }}
                placeholder="New folder"
                className="w-full pl-10 pr-3 py-2 text-sm rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <button
              onClick={() => void handleCreateFolder()}
              disabled={folderActionLoading || !newFolderName.trim()}
              className="w-full px-4 py-2 text-sm rounded-xl bg-zinc-900 text-white font-semibold hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {folderActionLoading ? 'Working...' : `Create in ${currentFolderLabel}`}
            </button>
          </div>
        </aside>

        <div>
          <div className="mb-4 flex items-center flex-wrap gap-2 text-sm">
            <button
              onClick={() => void openFolder('')}
              className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
            >
              Root
            </button>
            {breadcrumbParts.map((part, index) => {
              const path = breadcrumbParts.slice(0, index + 1).join('/');
              return (
                <React.Fragment key={path}>
                  <ChevronRight className="w-3 h-3 text-zinc-400 dark:text-zinc-500" />
                  <button
                    onClick={() => void openFolder(path)}
                    className="px-2 py-1 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors"
                  >
                    {part}
                  </button>
                </React.Fragment>
              );
            })}
          </div>

          {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
              <p className="text-zinc-500 dark:text-zinc-400">Fetching your assets...</p>
            </div>
          ) : assets.length === 0 && folders.length === 0 ? (
            <div className="py-20 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-3xl flex flex-col items-center justify-center text-center px-4">
              <div className="w-16 h-16 bg-zinc-50 dark:bg-zinc-950 rounded-2xl flex items-center justify-center text-zinc-300 dark:text-zinc-600 mb-6">
                <Upload className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">No assets in {currentFolderLabel}</h3>
              <p className="text-zinc-500 dark:text-zinc-400 max-w-sm mb-8">
                Upload files or create a folder to start organizing your asset library.
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
            <div className="space-y-6">
              {folders.length > 0 ? (
                <div>
                  <p className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-3">Folders</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                    {folders.map((folder) => (
                      <div
                        key={folder.path}
                        className={`bg-white dark:bg-zinc-900 border rounded-xl px-4 py-3 flex items-center justify-between gap-3 ${
                          dropFolderPath === folder.path && draggedAsset?.folder !== folder.path
                            ? 'border-emerald-500 ring-2 ring-emerald-500/40'
                            : 'border-zinc-200 dark:border-zinc-700'
                        }`}
                        onDragOver={(event) => handleFolderDragOver(event, folder.path)}
                        onDrop={(event) => void handleFolderDrop(event, folder.path)}
                      >
                        <button
                          onClick={() => void openFolder(folder.path)}
                          className="flex items-center gap-2 min-w-0 text-left"
                          title={folder.path}
                        >
                          <Folder className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">{folder.name}</span>
                        </button>
                        <button
                          onClick={() => void handleDeleteFolder(folder.path)}
                          disabled={folderActionLoading}
                          className="p-1.5 rounded-lg text-zinc-400 dark:text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors disabled:opacity-50"
                          title="Delete Folder"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {assets.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <AnimatePresence>
                    {assets.map((asset) => (
                      <motion.div
                        key={asset.sha}
                        layout
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.effectAllowed = 'move';
                          handleAssetDragStart(asset);
                        }}
                        onDragEnd={handleAssetDragEnd}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className={`group bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden hover:shadow-xl hover:shadow-zinc-200 dark:hover:shadow-zinc-950/50 transition-all ${
                          draggedAsset?.path === asset.path ? 'opacity-60 cursor-grabbing' : 'cursor-grab'
                        }`}
                      >
                        <div className="aspect-video bg-zinc-50 dark:bg-zinc-950 relative overflow-hidden flex items-center justify-center border-b border-zinc-100 dark:border-zinc-800">
                          {isImageAsset(asset.name) && getPreviewUrl(asset) ? (
                            <img
                              src={getPreviewUrl(asset)!}
                              alt={asset.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                              referrerPolicy="no-referrer"
                              loading="lazy"
                              onError={() => handlePreviewError(asset)}
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
                              <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-1" title={asset.path}>
                                {asset.path}
                              </p>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Move To Folder</label>
                              <div className="flex items-center gap-2">
                                <select
                                  value={moveTargets[asset.path] ?? currentFolder}
                                  onChange={(event) =>
                                    setMoveTargets((previous) => ({ ...previous, [asset.path]: event.target.value }))
                                  }
                                  className="flex-1 px-2 py-1.5 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700"
                                >
                                  <option value="">Root</option>
                                  {allFolders.map((folderPath) => (
                                    <option key={folderPath} value={folderPath}>
                                      {folderPath}
                                    </option>
                                  ))}
                                </select>
                                <button
                                  onClick={() => void handleMoveAsset(asset)}
                                  disabled={movingAssetPath === asset.path || (moveTargets[asset.path] ?? currentFolder) === asset.folder}
                                  className="px-2 py-1.5 rounded-lg bg-zinc-900 text-white text-xs font-semibold hover:bg-zinc-800 disabled:opacity-50 transition-colors flex items-center gap-1"
                                >
                                  {movingAssetPath === asset.path ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRightLeft className="w-3 h-3" />}
                                  Move
                                </button>
                              </div>
                            </div>

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
              ) : null}
            </div>
          )}
        </div>
      </div>
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
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans selection:bg-emerald-100 dark:selection:bg-emerald-900/40 selection:text-emerald-900 dark:selection:text-emerald-200 flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />
      
      <main className="flex-1">
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

      <footer className="border-t border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 py-12 mt-auto">
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
