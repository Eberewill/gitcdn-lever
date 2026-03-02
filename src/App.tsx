import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
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
  ArrowRightLeft,
  KeyRound,
  Settings,
  Database,
  Cloud,
  Menu,
  X,
  ChevronDown,
  HardDrive,
  Shield,
  Zap,
  Globe,
  LayoutGrid,
  List,
  Image as ImageIcon,
  File,
  Video,
  MoreVertical,
  FolderOpen
} from 'lucide-react';

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

interface ApiAppCredential {
  app_id: string;
  app_name: string;
  token_type: 'Bearer';
  app_secret: string;
  ingest_url: string;
  repo: string;
  branch: string;
  base_folder: string;
  allowed_extensions: string[];
  max_bytes: number;
  issued_at: number;
  expires_at: number;
}

// --- Utilities ---

const getParentFolderPath = (path: string): string => {
  const lastSlash = path.lastIndexOf('/');
  if (lastSlash < 0) return '';
  return path.slice(0, lastSlash);
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// --- UI Components ---

const Button = memo<{
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  className?: string;
  type?: 'button' | 'submit';
}>(({ children, variant = 'primary', size = 'md', onClick, disabled, loading, icon, className = '', type = 'button' }) => {
  const baseStyles = 'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 cursor-pointer';
  
  const variantStyles = {
    primary: 'bg-[#1a73e8] text-white hover:bg-[#1557b0] focus:ring-[#1a73e8] shadow-sm',
    secondary: 'bg-white text-[#202124] border border-[#dadce0] hover:bg-[#f8f9fa] hover:border-[#9aa0a6] focus:ring-[#1a73e8] dark:bg-[#202124] dark:text-[#e8eaed] dark:border-[#5f6368] dark:hover:bg-[#3c4043]',
    tertiary: 'bg-transparent text-[#1a73e8] hover:bg-[#e8f0fe] focus:ring-[#1a73e8]',
    ghost: 'bg-transparent text-[#5f6368] hover:bg-[#e8eaed] hover:text-[#202124] focus:ring-[#1a73e8]',
    danger: 'bg-[#d93025] text-white hover:bg-[#b31412] focus:ring-[#d93025]'
  };

  const sizeStyles = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-6 py-3 text-base'
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${disabled || loading ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
    >
      {loading && <Loader2 className="w-4 h-4 spinner" />}
      {!loading && icon}
      {children}
    </button>
  );
});

const Card = memo<{
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  elevated?: boolean;
}>(({ children, className = '', hover = false, elevated = false }) => {
  const baseStyles = 'bg-white dark:bg-[#202124] rounded-xl border border-[#dadce0] dark:border-[#5f6368]';
  const shadowStyles = elevated ? 'shadow-md' : 'shadow-sm';
  const hoverStyles = hover ? 'transition-shadow duration-200 hover:shadow-md' : '';
  
  return (
    <div className={`${baseStyles} ${shadowStyles} ${hoverStyles} ${className}`}>
      {children}
    </div>
  );
});

const Badge = memo<{
  children: React.ReactNode;
  variant?: 'primary' | 'success' | 'warning' | 'error' | 'neutral';
  icon?: React.ReactNode;
}>(({ children, variant = 'neutral', icon }) => {
  const styles = {
    primary: 'bg-[#e8f0fe] text-[#174ea6]',
    success: 'bg-[#e6f4ea] text-[#188038]',
    warning: 'bg-[#fef3e8] text-[#b06000]',
    error: 'bg-[#fce8e8] text-[#d93025]',
    neutral: 'bg-[#f1f3f4] text-[#5f6368] dark:bg-[#3c4043] dark:text-[#9aa0a6]'
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${styles[variant]}`}>
      {icon}
      {children}
    </span>
  );
});

const Input = memo<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  icon?: React.ReactNode;
  type?: string;
  disabled?: boolean;
  onKeyDown?: (e: React.KeyboardEvent) => void;
  className?: string;
}>(({ value, onChange, placeholder, icon, type = 'text', disabled, onKeyDown, className = '' }) => {
  return (
    <div className={`relative ${className}`}>
      {icon && (
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9aa0a6]">
          {icon}
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full py-2.5 text-sm bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368] rounded-lg transition-all duration-150
          placeholder:text-[#9aa0a6] text-[#202124] dark:text-[#e8eaed]
          hover:border-[#9aa0a6]
          focus:outline-none focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8]
          disabled:bg-[#f1f3f4] dark:disabled:bg-[#3c4043] disabled:cursor-not-allowed
          ${icon ? 'pl-10 pr-4' : 'px-4'}`}
      />
    </div>
  );
});

const EmptyState = memo<{
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}>(({ icon, title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-4">
      <div className="w-20 h-20 mb-6 rounded-2xl bg-[#f1f3f4] dark:bg-[#3c4043] flex items-center justify-center text-[#9aa0a6]">
        {icon}
      </div>
      <h3 className="text-lg font-medium text-[#202124] dark:text-[#e8eaed] mb-2">{title}</h3>
      <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6] max-w-sm mb-6">{description}</p>
      {action}
    </div>
  );
});

const Toast = memo<{
  message: string;
  type?: 'success' | 'error';
  onClose?: () => void;
}>(({ message, type = 'success', onClose }) => {
  useEffect(() => {
    if (onClose) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [onClose]);

  const styles = {
    success: 'bg-[#188038]',
    error: 'bg-[#d93025]'
  };

  return (
    <div className={`fixed bottom-4 right-4 px-4 py-3 text-white text-sm rounded-lg shadow-lg z-50 ${styles[type]} animate-slide-up flex items-center gap-2`}>
      {type === 'success' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
      {message}
    </div>
  );
});

// --- Feature Components ---

const Header = memo<{
  user: User | null;
  onLogout: () => void;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}>(({ user, onLogout, sidebarOpen, onToggleSidebar }) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#202124]/95 backdrop-blur-sm border-b border-[#dadce0] dark:border-[#5f6368]">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-lg lg:hidden"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-[#1a73e8] to-[#174ea6] rounded-lg flex items-center justify-center shadow-sm">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-[#202124] dark:text-[#e8eaed] tracking-tight">GitCDN</h1>
              <p className="text-xs text-[#9aa0a6] hidden sm:block">Asset Delivery Network</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-[#f8f9fa] dark:bg-[#3c4043] rounded-full border border-[#dadce0] dark:border-[#5f6368]">
                <img src={user.avatar_url} alt={user.username} className="w-6 h-6 rounded-full" />
                <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">{user.username}</span>
              </div>
              <button
                onClick={onLogout}
                className="p-2 text-[#5f6368] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] hover:text-[#d93025] rounded-lg transition-colors"
                title="Sign out"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Button variant="primary" icon={<Github className="w-4 h-4" />}>
              Sign in
            </Button>
          )}
        </div>
      </div>
    </header>
  );
});

const Sidebar = memo<{
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
  repo?: string | null;
}>(({ activeView, onViewChange, isOpen, onClose, repo }) => {
  const navItems = [
    { id: 'dashboard', label: 'Assets', icon: Database },
    { id: 'api', label: 'API Access', icon: KeyRound },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/30 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      
      <aside className={`
        fixed lg:sticky top-16 left-0 z-30 w-64 h-[calc(100vh-4rem)] 
        bg-white dark:bg-[#202124] border-r border-[#dadce0] dark:border-[#5f6368]
        transform transition-transform duration-200 ease-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        overflow-y-auto
      `}>
        <div className="p-4">
          {repo && (
            <Card className="mb-4 p-3 bg-[#e8f0fe] dark:bg-[#1a73e8]/20 border-[#1a73e8]/20">
              <div className="flex items-center gap-2 text-[#174ea6] dark:text-[#8ab4f8]">
                <Github className="w-4 h-4" />
                <span className="text-xs font-medium truncate">{repo}</span>
              </div>
            </Card>
          )}

          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onViewChange(item.id);
                    onClose();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors
                    ${isActive 
                      ? 'bg-[#e8f0fe] dark:bg-[#1a73e8]/20 text-[#1a73e8] dark:text-[#8ab4f8]' 
                      : 'text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] hover:text-[#202124] dark:hover:text-[#e8eaed]'}
                  `}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                  {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              );
            })}
          </nav>

          <div className="mt-6 pt-6 border-t border-[#dadce0] dark:border-[#5f6368]">
            <p className="text-xs font-medium text-[#9aa0a6] uppercase tracking-wider mb-3 px-3">
              Quick Links
            </p>
            <div className="space-y-1">
              <a 
                href="https://github.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 text-sm text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                GitHub
              </a>
              <a 
                href="https://www.jsdelivr.com" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-3 py-2 text-sm text-[#5f6368] dark:text-[#9aa0a6] hover:text-[#202124] dark:hover:text-[#e8eaed] hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded-lg transition-colors"
              >
                <Globe className="w-4 h-4" />
                jsDelivr
              </a>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
});

const LandingPage = memo<{
  onConnect: () => void;
}>(({ onConnect }) => {
  const features = [
    {
      icon: <Cloud className="w-6 h-6 text-[#1a73e8]" />,
      title: 'GitHub-Native',
      description: 'Your assets live in your repositories. No external storage needed.'
    },
    {
      icon: <Zap className="w-6 h-6 text-[#b06000]" />,
      title: 'Instant CDN',
      description: 'Get public URLs immediately via jsDelivr global CDN.'
    },
    {
      icon: <Shield className="w-6 h-6 text-[#188038]" />,
      title: 'Secure & Private',
      description: 'OAuth authentication with granular repository access.'
    },
    {
      icon: <HardDrive className="w-6 h-6 text-[#5f6368]" />,
      title: 'Organized Storage',
      description: 'Folder-based structure with drag-and-drop management.'
    }
  ];

  const steps = [
    { step: '01', title: 'Connect GitHub', desc: 'Authorize once and select a repository' },
    { step: '02', title: 'Upload Assets', desc: 'Drag and drop or select files to upload' },
    { step: '03', title: 'Get CDN URL', desc: 'Copy the generated public URL instantly' }
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col">
      <section className="relative overflow-hidden bg-gradient-to-br from-[#f8f9fa] to-white dark:from-[#171717] dark:to-[#202124]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(26,115,232,0.1)_0%,_transparent_50%)]" />
        
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#e8f0fe] dark:bg-[#1a73e8]/20 text-[#1a73e8] dark:text-[#8ab4f8] rounded-full text-sm font-medium mb-6">
                <Zap className="w-4 h-4" />
                Free & Open Source
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold text-[#202124] dark:text-[#e8eaed] leading-tight tracking-tight mb-6">
                Use GitHub as your{' '}
                <span className="text-[#1a73e8]">Asset CDN</span>
              </h1>
              
              <p className="text-lg text-[#5f6368] dark:text-[#9aa0a6] leading-relaxed mb-8 max-w-xl">
                Transform any GitHub repository into a lightweight public asset CDN. 
                Upload images and files, get instant URLs powered by jsDelivr.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Button variant="primary" size="lg" onClick={onConnect} icon={<Github className="w-5 h-5" />}>
                  Connect with GitHub
                </Button>
                <Button variant="secondary" size="lg" icon={<LinkIcon className="w-5 h-5" />}>
                  View Documentation
                </Button>
              </div>

              <div className="mt-8 flex items-center gap-6 text-sm text-[#5f6368] dark:text-[#9aa0a6]">
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#188038]" />
                  No storage fees
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#188038]" />
                  Open source
                </span>
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#188038]" />
                  Instant deploy
                </span>
              </div>
            </div>

            <div className="relative animate-slide-up">
              <Card elevated className="p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-[#dadce0] dark:border-[#5f6368]">
                  <div className="w-10 h-10 bg-[#e8f0fe] dark:bg-[#1a73e8]/20 rounded-lg flex items-center justify-center">
                    <Database className="w-5 h-5 text-[#1a73e8]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#202124] dark:text-[#e8eaed]">How it works</h3>
                    <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">Simple three-step process</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {steps.map((item, index) => (
                    <div key={item.step} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white text-sm font-semibold flex items-center justify-center">
                          {item.step}
                        </div>
                        {index < steps.length - 1 && (
                          <div className="w-0.5 h-full bg-[#dadce0] dark:bg-[#5f6368] my-2" />
                        )}
                      </div>
                      <div className="pb-6">
                        <h4 className="font-medium text-[#202124] dark:text-[#e8eaed]">{item.title}</h4>
                        <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-[#f8f9fa] dark:bg-[#3c4043] rounded-lg">
                  <p className="text-xs font-medium text-[#9aa0a6] uppercase tracking-wider mb-2">Example URL</p>
                  <code className="text-xs text-[#1a73e8] break-all font-mono">
                    https://cdn.jsdelivr.net/gh/user/repo@main/assets/logo.png
                  </code>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-white dark:bg-[#202124]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-semibold text-[#202124] dark:text-[#e8eaed] mb-4">Built for Developers</h2>
            <p className="text-lg text-[#5f6368] dark:text-[#9aa0a6] max-w-2xl mx-auto">
              Everything you need to manage and deliver assets without the complexity
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <Card key={feature.title} hover className="p-6">
                <div className="w-12 h-12 bg-[#f8f9fa] dark:bg-[#3c4043] rounded-xl flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-[#202124] dark:text-[#e8eaed] mb-2">{feature.title}</h3>
                <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">{feature.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-[#f8f9fa] dark:bg-[#171717]">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-semibold text-[#202124] dark:text-[#e8eaed] mb-4">Ready to get started?</h2>
          <p className="text-lg text-[#5f6368] dark:text-[#9aa0a6] mb-8">
            Connect your GitHub account and start uploading assets in seconds.
          </p>
          <Button variant="primary" size="lg" onClick={onConnect} icon={<Github className="w-5 h-5" />}>
            Connect with GitHub
          </Button>
        </div>
      </section>
    </div>
  );
});

const RepoSelector = memo<{
  repos: Repo[];
  onSelect: (repo: Repo) => void;
  loading: boolean;
}>(({ repos, onSelect, loading }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'public' | 'private'>('all');

  const filteredRepos = useMemo(() => {
    return repos.filter(r => {
      const matchesSearch = r.full_name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = filter === 'all' || (filter === 'private' ? r.private : !r.private);
      return matchesSearch && matchesFilter;
    });
  }, [repos, search, filter]);

  const publicCount = repos.filter(r => !r.private).length;
  const privateCount = repos.filter(r => r.private).length;

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-[#e8f0fe] dark:bg-[#1a73e8]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Github className="w-8 h-8 text-[#1a73e8]" />
        </div>
        <h2 className="text-2xl font-semibold text-[#202124] dark:text-[#e8eaed] mb-2">Select a Repository</h2>
        <p className="text-[#5f6368] dark:text-[#9aa0a6]">Choose where you want to store your assets</p>
      </div>

      <Card>
        <div className="p-4 border-b border-[#dadce0] dark:border-[#5f6368]">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              value={search}
              onChange={setSearch}
              placeholder="Search repositories..."
              icon={<Search className="w-4 h-4" />}
              className="flex-1"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'all' ? 'bg-[#1a73e8] text-white' : 'bg-[#f8f9fa] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#e8eaed] dark:hover:bg-[#5f6368]'
                }`}
              >
                All ({repos.length})
              </button>
              <button
                onClick={() => setFilter('public')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'public' ? 'bg-[#188038] text-white' : 'bg-[#f8f9fa] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#e8eaed] dark:hover:bg-[#5f6368]'
                }`}
              >
                Public ({publicCount})
              </button>
              <button
                onClick={() => setFilter('private')}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  filter === 'private' ? 'bg-[#202124] dark:bg-[#e8eaed] text-white dark:text-[#202124]' : 'bg-[#f8f9fa] dark:bg-[#3c4043] text-[#5f6368] dark:text-[#9aa0a6] hover:bg-[#e8eaed] dark:hover:bg-[#5f6368]'
                }`}
              >
                Private ({privateCount})
              </button>
            </div>
          </div>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {loading ? (
            <div className="p-12 flex flex-col items-center justify-center gap-4">
              <Loader2 className="w-8 h-8 text-[#1a73e8] spinner" />
              <p className="text-sm text-[#5f6368]">Loading repositories...</p>
            </div>
          ) : filteredRepos.length > 0 ? (
            <div className="divide-y divide-[#e8eaed] dark:divide-[#3c4043]">
              {filteredRepos.map((repo) => (
                <button
                  key={repo.full_name}
                  onClick={() => onSelect(repo)}
                  className="w-full flex items-center justify-between p-4 hover:bg-[#f8f9fa] dark:hover:bg-[#3c4043] transition-colors text-left group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-[#f1f3f4] dark:bg-[#3c4043] rounded-lg flex items-center justify-center flex-shrink-0 group-hover:bg-white dark:group-hover:bg-[#5f6368] transition-colors">
                      <Github className="w-5 h-5 text-[#5f6368]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-[#202124] dark:text-[#e8eaed] truncate">{repo.name}</p>
                      <p className="text-xs text-[#9aa0a6] truncate">{repo.full_name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <Badge variant={repo.private ? 'neutral' : 'success'}>
                      {repo.private ? 'Private' : 'Public'}
                    </Badge>
                    <span className="text-xs text-[#9aa0a6] hidden sm:block">
                      {repo.default_branch}
                    </span>
                    <ChevronRight className="w-5 h-5 text-[#9aa0a6] group-hover:text-[#1a73e8] transition-colors" />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Search className="w-8 h-8" />}
              title="No repositories found"
              description={search ? `No results for "${search}"` : "You don't have any repositories yet."}
            />
          )}
        </div>
      </Card>
    </div>
  );
});

// --- Dashboard Component ---

const Dashboard = memo<{
  user: User;
  activeView: string;
  onChangeRepo: () => void;
  onToast: (message: string, type?: 'success' | 'error') => void;
}>(({ user, activeView, onChangeRepo, onToast }) => {
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
  const [expandedAssets, setExpandedAssets] = useState<Record<string, boolean>>({});
  const [imagePreviewAttempts, setImagePreviewAttempts] = useState<Record<string, number>>({});
  const [copying, setCopying] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API App state
  const [apiAppName, setApiAppName] = useState('');
  const [apiAppFolder, setApiAppFolder] = useState('');
  const [apiAppExtensions, setApiAppExtensions] = useState('');
  const [apiAppMaxMb, setApiAppMaxMb] = useState('4');
  const [apiAppTtlDays, setApiAppTtlDays] = useState('90');
  const [apiAppLoading, setApiAppLoading] = useState(false);
  const [apiAppError, setApiAppError] = useState<string | null>(null);
  const [createdApiApp, setCreatedApiApp] = useState<ApiAppCredential | null>(null);

  const fetchAssets = useCallback(async (targetFolder: string) => {
    try {
      const params = new URLSearchParams();
      if (targetFolder) params.set('folder', targetFolder);
      const endpoint = params.toString() ? `/api/assets?${params.toString()}` : '/api/assets';
      const res = await fetch(endpoint);
      
      if (!res.ok) {
        setAssets([]);
        setFolders([]);
        setAllFolders([]);
        return;
      }

      const data = await res.json() as AssetsResponse;
      setAssets(data.files ?? []);
      setFolders(data.folders ?? []);
      setAllFolders(data.all_folders ?? []);
      setCurrentFolder(data.current_folder ?? targetFolder);
      setImagePreviewAttempts({});
      setExpandedAssets({});
    } catch (err) {
      console.error(err);
      setAssets([]);
      setFolders([]);
      setAllFolders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAssets('');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredAssets = useMemo(() => {
    if (!searchQuery) return assets;
    return assets.filter(a => 
      a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.path.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [assets, searchQuery]);

  const openFolder = useCallback(async (path: string) => {
    setLoading(true);
    setFolderActionError(null);
    setShowNewFolderInput(false);
    setNewFolderName('');
    await fetchAssets(path);
  }, [fetchAssets]);

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
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
          body: JSON.stringify({ name: file.name, folder: currentFolder, content })
        });

        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          setUploadError(errorData?.error || 'Upload failed. Please try again.');
          onToast(errorData?.error || 'Upload failed', 'error');
          return;
        }

        onToast('File uploaded successfully');
        await fetchAssets(currentFolder);
      } catch (err) {
        console.error(err);
        setUploadError('Upload failed. Please try again.');
        onToast('Upload failed', 'error');
      } finally {
        setUploading(false);
        setUploadingFileName(null);
        fileInput.value = '';
      }
    };
    reader.readAsDataURL(file);
  }, [currentFolder, fetchAssets, onToast]);

  const handleDelete = useCallback(async (asset: Asset) => {
    if (!confirm(`Delete "${asset.name}"?`)) return;
    try {
      const params = new URLSearchParams({ path: asset.path, sha: asset.sha });
      await fetch(`/api/assets?${params.toString()}`, { method: 'DELETE' });
      onToast('File deleted successfully');
      await fetchAssets(currentFolder);
    } catch (err) {
      console.error(err);
      onToast('Failed to delete file', 'error');
    }
  }, [currentFolder, fetchAssets, onToast]);

  const handleCreateFolder = useCallback(async () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;

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
      setShowNewFolderInput(false);
      onToast('Folder created successfully');
      await fetchAssets(currentFolder);
    } catch (err) {
      console.error(err);
      setFolderActionError('Failed to create folder.');
    } finally {
      setFolderActionLoading(false);
    }
  }, [newFolderName, currentFolder, fetchAssets, onToast]);

  const handleDeleteFolder = useCallback(async (folderPath: string) => {
    if (!confirm(`Delete folder "${folderPath}" and all its contents?`)) return;

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
      onToast('Folder deleted successfully');
      await fetchAssets(nextFolder);
    } catch (err) {
      console.error(err);
      setFolderActionError('Failed to delete folder.');
    } finally {
      setFolderActionLoading(false);
    }
  }, [currentFolder, fetchAssets, onToast]);

  const parseExtensionInput = (value: string): string[] | null => {
    const trimmed = value.trim();
    if (!trimmed) return [];
    const entries = trimmed.split(',').map(e => e.trim().replace(/^\./, '').toLowerCase()).filter(Boolean);
    if (entries.some(e => !/^[a-z0-9]{1,10}$/.test(e))) return null;
    return [...new Set(entries)];
  };

  const handleCreateApiApp = useCallback(async () => {
    const parsedExtensions = parseExtensionInput(apiAppExtensions);
    if (!parsedExtensions) {
      setApiAppError('Extensions must be comma-separated like: png,jpg,pdf');
      return;
    }

    const parsedMaxMb = Number.parseFloat(apiAppMaxMb);
    if (!Number.isFinite(parsedMaxMb) || parsedMaxMb <= 0) {
      setApiAppError('Max size must be a positive number.');
      return;
    }

    const parsedTtlDays = Number.parseInt(apiAppTtlDays, 10);
    if (!Number.isFinite(parsedTtlDays) || parsedTtlDays <= 0) {
      setApiAppError('Token TTL must be a positive number of days.');
      return;
    }

    setApiAppLoading(true);
    setApiAppError(null);
    
    try {
      const targetFolder = apiAppFolder.trim() || currentFolder;
      const res = await fetch('/api/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: apiAppName.trim() || undefined,
          folder: targetFolder,
          allowed_extensions: parsedExtensions,
          max_bytes: Math.round(parsedMaxMb * 1024 * 1024),
          expires_in_days: parsedTtlDays,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setApiAppError(errorData?.error || 'Failed to create API credential.');
        return;
      }

      const data = await res.json() as ApiAppCredential;
      setCreatedApiApp(data);
      onToast('API credential created');
    } catch (err) {
      console.error(err);
      setApiAppError('Failed to create API credential.');
    } finally {
      setApiAppLoading(false);
    }
  }, [apiAppName, apiAppFolder, apiAppExtensions, apiAppMaxMb, apiAppTtlDays, currentFolder, onToast]);

  const moveAssetToFolder = useCallback(async (assetPath: string, destinationFolder: string) => {
    setMovingAssetPath(assetPath);
    setFolderActionError(null);
    try {
      const res = await fetch('/api/assets/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: assetPath, destination_folder: destinationFolder }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        setFolderActionError(errorData?.error || 'Failed to move asset.');
        return false;
      }

      onToast('Asset moved successfully');
      await fetchAssets(currentFolder);
      return true;
    } catch (err) {
      console.error(err);
      setFolderActionError('Failed to move asset.');
      return false;
    } finally {
      setMovingAssetPath(null);
    }
  }, [currentFolder, fetchAssets, onToast]);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopying(id);
    onToast('Copied to clipboard');
    setTimeout(() => setCopying(null), 2000);
  }, [onToast]);

  const toggleAssetExpanded = useCallback((assetSha: string) => {
    setExpandedAssets(prev => ({ ...prev, [assetSha]: !prev[assetSha] }));
  }, []);

  const isImageAsset = (name: string) => /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(name);
  const isVideoAsset = (name: string) => /\.(mp4|webm|mov|avi|mkv)$/i.test(name);

  const getPreviewUrl = useCallback((asset: Asset) => {
    const attempt = imagePreviewAttempts[asset.sha] ?? 0;
    if (attempt === 0 && asset.download_url) return asset.download_url;
    if (attempt <= 1 && asset.cdn_url) return asset.cdn_url;
    return null;
  }, [imagePreviewAttempts]);

  const handlePreviewError = useCallback((asset: Asset) => {
    setImagePreviewAttempts(prev => ({
      ...prev,
      [asset.sha]: Math.min((prev[asset.sha] ?? 0) + 1, 2),
    }));
  }, []);

  const breadcrumbParts = currentFolder ? currentFolder.split('/') : [];

  // Views
  if (activeView === 'api') {
    return (
      <div className="p-4 lg:p-8 max-w-4xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#202124] dark:text-[#e8eaed]">API Access</h2>
          <p className="text-[#5f6368] dark:text-[#9aa0a6]">Generate credentials for programmatic uploads</p>
        </div>

        <Card>
          <div className="p-6 border-b border-[#dadce0] dark:border-[#5f6368]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#e8f0fe] dark:bg-[#1a73e8]/20 rounded-lg flex items-center justify-center">
                <KeyRound className="w-5 h-5 text-[#1a73e8]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#202124] dark:text-[#e8eaed]">Create API Credential</h3>
                <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">Generate a bearer token for server-to-server uploads</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-1.5">App Name</label>
                <Input value={apiAppName} onChange={setApiAppName} placeholder="My Upload App" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-1.5">Base Folder</label>
                <Input value={apiAppFolder} onChange={setApiAppFolder} placeholder={`Default: ${currentFolder || 'Root'}`} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-1.5">Allowed Extensions</label>
                <Input value={apiAppExtensions} onChange={setApiAppExtensions} placeholder="png,jpg,pdf (comma-separated)" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-1.5">Max Size (MB)</label>
                  <Input value={apiAppMaxMb} onChange={setApiAppMaxMb} type="number" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#202124] dark:text-[#e8eaed] mb-1.5">Expires (Days)</label>
                  <Input value={apiAppTtlDays} onChange={setApiAppTtlDays} type="number" />
                </div>
              </div>
            </div>

            {apiAppError && (
              <div className="p-3 bg-[#fce8e8] dark:bg-[#d93025]/20 text-[#d93025] text-sm rounded-lg">{apiAppError}</div>
            )}

            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-[#9aa0a6]">Max file size: 15 MB per upload</p>
              <Button onClick={handleCreateApiApp} loading={apiAppLoading} icon={<KeyRound className="w-4 h-4" />}>
                Create Credential
              </Button>
            </div>

            {createdApiApp && (
              <div className="mt-4 p-4 bg-[#e6f4ea] dark:bg-[#188038]/20 border border-[#188038]/20 rounded-lg space-y-3">
                <div className="flex items-center gap-2 text-[#188038] dark:text-[#81c995]">
                  <Check className="w-5 h-5" />
                  <span className="font-medium">Credential created successfully</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] uppercase">Ingest URL</label>
                    <div className="flex items-center gap-2 mt-1 p-2 bg-white dark:bg-[#202124] rounded-lg border border-[#dadce0] dark:border-[#5f6368]">
                      <code className="text-xs font-mono truncate flex-1">{createdApiApp.ingest_url}</code>
                      <button onClick={() => copyToClipboard(createdApiApp.ingest_url, 'api-url')} className="p-1.5 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded">
                        {copying === 'api-url' ? <Check className="w-4 h-4 text-[#188038]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] uppercase">Secret Token</label>
                    <div className="flex items-center gap-2 mt-1 p-2 bg-white dark:bg-[#202124] rounded-lg border border-[#dadce0] dark:border-[#5f6368]">
                      <code className="text-xs font-mono truncate flex-1">{createdApiApp.app_secret}</code>
                      <button onClick={() => copyToClipboard(createdApiApp.app_secret, 'api-secret')} className="p-1.5 hover:bg-[#f1f3f4] dark:hover:bg-[#3c4043] rounded">
                        {copying === 'api-secret' ? <Check className="w-4 h-4 text-[#188038]" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-[#b06000] mt-1">Save this secret now. It won&apos;t be shown again.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>
    );
  }

  if (activeView === 'settings') {
    return (
      <div className="p-4 lg:p-8 max-w-2xl">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold text-[#202124] dark:text-[#e8eaed]">Settings</h2>
          <p className="text-[#5f6368] dark:text-[#9aa0a6]">Manage your repository and preferences</p>
        </div>

        <Card className="mb-6">
          <div className="p-6 border-b border-[#dadce0] dark:border-[#5f6368]">
            <h3 className="font-semibold text-[#202124] dark:text-[#e8eaed]">Connected Repository</h3>
          </div>
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#f8f9fa] dark:bg-[#3c4043] rounded-lg flex items-center justify-center">
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-[#202124] dark:text-[#e8eaed]">{user.selected_repo}</p>
                  <p className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">{user.selected_branch || 'main'} branch</p>
                </div>
              </div>
              <Button variant="secondary" onClick={onChangeRepo}>Change</Button>
            </div>
          </div>
        </Card>

        <Card>
          <div className="p-6 border-b border-[#dadce0] dark:border-[#5f6368]">
            <h3 className="font-semibold text-[#202124] dark:text-[#e8eaed]">About GitCDN</h3>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">Version</span>
              <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">1.0.0</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">License</span>
              <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">MIT</span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-sm text-[#5f6368] dark:text-[#9aa0a6]">CDN Provider</span>
              <span className="text-sm font-medium text-[#202124] dark:text-[#e8eaed]">jsDelivr</span>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Default Dashboard (Assets view) - Clean single-column layout
  return (
    <div className="p-4 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-[#5f6368] dark:text-[#9aa0a6] mb-1">
            <Github className="w-4 h-4" />
            <span>{user.selected_repo}</span>
            <span className="text-[#9aa0a6]">•</span>
            <span className="text-[#9aa0a6]">{user.selected_branch || 'main'}</span>
          </div>
          <h2 className="text-2xl font-semibold text-[#202124] dark:text-[#e8eaed]">Assets</h2>
        </div>

        <div className="flex items-center gap-3">
          <Input
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search assets..."
            icon={<Search className="w-4 h-4" />}
            className="w-64"
          />
          <div className="flex items-center bg-white dark:bg-[#202124] rounded-lg border border-[#dadce0] dark:border-[#5f6368] p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'bg-[#e8eaed] dark:bg-[#3c4043] text-[#1a73e8]' : 'text-[#9aa0a6]'}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'bg-[#e8eaed] dark:bg-[#3c4043] text-[#1a73e8]' : 'text-[#9aa0a6]'}`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
          <input type="file" className="hidden" ref={fileInputRef} onChange={handleUpload} accept="image/*,video/*,audio/*,application/pdf" />
          <Button onClick={() => fileInputRef.current?.click()} loading={uploading} icon={<Plus className="w-4 h-4" />}>
            Upload
          </Button>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 mb-4 text-sm">
        <button onClick={() => openFolder('')} className="px-2 py-1 rounded hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#1a73e8]">
          Root
        </button>
        {breadcrumbParts.map((part, index) => {
          const path = breadcrumbParts.slice(0, index + 1).join('/');
          return (
            <React.Fragment key={path}>
              <ChevronRight className="w-4 h-4 text-[#9aa0a6]" />
              <button onClick={() => openFolder(path)} className="px-2 py-1 rounded hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] text-[#1a73e8]">
                {part}
              </button>
            </React.Fragment>
          );
        })}
      </div>

      {/* New Folder Input - Inline */}
      {showNewFolderInput && (
        <div className="mb-4 p-4 bg-[#e8f0fe] dark:bg-[#1a73e8]/10 border border-[#1a73e8]/20 rounded-lg flex items-center gap-3">
          <FolderPlus className="w-5 h-5 text-[#1a73e8]" />
          <Input
            value={newFolderName}
            onChange={setNewFolderName}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            placeholder="Folder name"
            className="flex-1 max-w-xs"
          />
          <Button onClick={handleCreateFolder} loading={folderActionLoading} disabled={!newFolderName.trim()} size="sm">
            Create
          </Button>
          <Button variant="ghost" onClick={() => { setShowNewFolderInput(false); setNewFolderName(''); }} size="sm">
            Cancel
          </Button>
        </div>
      )}

      {/* Alerts */}
      {uploading && (
        <div className="mb-4 p-4 bg-[#e8f0fe] dark:bg-[#1a73e8]/20 border border-[#1a73e8]/20 rounded-lg flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#1a73e8] spinner" />
          <div className="flex-1">
            <p className="text-sm font-medium text-[#174ea6] dark:text-[#8ab4f8]">Uploading {uploadingFileName}</p>
          </div>
        </div>
      )}

      {uploadError && (
        <div className="mb-4 p-4 bg-[#fce8e8] dark:bg-[#d93025]/20 text-[#d93025] rounded-lg text-sm">{uploadError}</div>
      )}

      {folderActionError && (
        <div className="mb-4 p-4 bg-[#fce8e8] dark:bg-[#d93025]/20 text-[#d93025] rounded-lg text-sm">{folderActionError}</div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-[#1a73e8] spinner" />
        </div>
      ) : filteredAssets.length === 0 && folders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Upload className="w-10 h-10" />}
            title={searchQuery ? 'No matching assets' : 'No assets yet'}
            description={searchQuery ? `No results for "${searchQuery}"` : 'Upload files or create folders to get started'}
            action={!searchQuery && (
              <div className="flex gap-3">
                <Button onClick={() => fileInputRef.current?.click()} icon={<Plus className="w-4 h-4" />}>
                  Upload First Asset
                </Button>
                <Button variant="secondary" onClick={() => setShowNewFolderInput(true)} icon={<FolderPlus className="w-4 h-4" />}>
                  New Folder
                </Button>
              </div>
            )}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Folders */}
          {folders.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-[#9aa0a6] uppercase tracking-wider">Folders</h3>
                {!showNewFolderInput && (
                  <button 
                    onClick={() => setShowNewFolderInput(true)}
                    className="text-xs text-[#1a73e8] hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    New Folder
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {folders.map(folder => (
                  <div
                    key={folder.path}
                    className="flex items-center gap-3 p-3 bg-white dark:bg-[#202124] rounded-lg border border-[#dadce0] dark:border-[#5f6368] hover:border-[#9aa0a6] dark:hover:border-[#9aa0a6] transition-all cursor-pointer group"
                  >
                    <button onClick={() => openFolder(folder.path)} className="flex items-center gap-3 flex-1 min-w-0">
                      <Folder className="w-5 h-5 text-[#1a73e8] flex-shrink-0" />
                      <span className="text-sm font-medium truncate">{folder.name}</span>
                    </button>
                    <button
                      onClick={() => handleDeleteFolder(folder.path)}
                      disabled={folderActionLoading}
                      className="p-1.5 text-[#9aa0a6] hover:text-[#d93025] hover:bg-[#fce8e8] rounded opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Assets */}
          {filteredAssets.length > 0 && (
            <div>
              <h3 className="text-xs font-medium text-[#9aa0a6] uppercase tracking-wider mb-3">Files</h3>
              
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {filteredAssets.map(asset => {
                    const isExpanded = expandedAssets[asset.sha];
                    const isMoving = movingAssetPath === asset.path;
                    return (
                      <Card key={asset.sha} className="overflow-hidden">
                        {/* Preview */}
                        <div className="aspect-video bg-[#f8f9fa] dark:bg-[#171717] relative overflow-hidden flex items-center justify-center group">
                          {isImageAsset(asset.name) && getPreviewUrl(asset) ? (
                            <img
                              src={getPreviewUrl(asset)!}
                              alt={asset.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              onError={() => handlePreviewError(asset)}
                            />
                          ) : isVideoAsset(asset.name) ? (
                            <Video className="w-10 h-10 text-[#9aa0a6]" />
                          ) : (
                            <FileText className="w-10 h-10 text-[#9aa0a6]" />
                          )}
                          
                          {/* Quick Actions Overlay */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                            <button
                              onClick={() => window.open(asset.cdn_url, '_blank')}
                              className="p-2 bg-white rounded-lg text-[#202124] hover:bg-[#f1f3f4]"
                              title="Open"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(asset)}
                              className="p-2 bg-white rounded-lg text-[#d93025] hover:bg-[#fce8e8]"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Info */}
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-sm text-[#202124] dark:text-[#e8eaed] truncate" title={asset.name}>{asset.name}</p>
                              <p className="text-xs text-[#9aa0a6]">{formatSize(asset.size)}</p>
                            </div>
                            <button
                              onClick={() => toggleAssetExpanded(asset.sha)}
                              className={`p-1 text-[#9aa0a6] hover:text-[#1a73e8] hover:bg-[#e8f0fe] rounded transition-all ${isExpanded ? 'bg-[#e8f0fe] text-[#1a73e8]' : ''}`}
                              title="Actions"
                            >
                              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            </button>
                          </div>

                          {/* URL - Always visible */}
                          <div className="flex items-center gap-2 mt-3 p-2 bg-[#f8f9fa] dark:bg-[#171717] rounded-lg">
                            <code className="text-xs font-mono truncate flex-1 text-[#5f6368]">{asset.cdn_url}</code>
                            <button
                              onClick={() => copyToClipboard(asset.cdn_url, asset.sha)}
                              className="p-1 hover:bg-white dark:hover:bg-[#202124] rounded"
                            >
                              {copying === asset.sha ? <Check className="w-3.5 h-3.5 text-[#188038]" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Expandable Actions */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-[#dadce0] dark:border-[#5f6368] space-y-3 animate-fade-in">
                              {/* Move to Folder */}
                              <div>
                                <label className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1.5 block">
                                  {isMoving ? 'Moving...' : 'Move to Folder'}
                                </label>
                                <div className="flex items-center gap-2">
                                  <select
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      if (val !== asset.folder && val !== '__placeholder') {
                                        moveAssetToFolder(asset.path, val);
                                        e.target.value = '__placeholder';
                                      }
                                    }}
                                    disabled={isMoving}
                                    className="flex-1 text-xs bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368] rounded px-2 py-1.5 disabled:opacity-50"
                                    defaultValue="__placeholder"
                                  >
                                    <option value="__placeholder" disabled>Select folder...</option>
                                    <option value="">📁 Root</option>
                                    {allFolders.map(f => (
                                      <option key={f} value={f} disabled={f === asset.folder}>
                                        {'  '.repeat(f.split('/').length)}📁 {f.split('/').pop()}
                                      </option>
                                    ))}
                                  </select>
                                  {isMoving && <Loader2 className="w-4 h-4 text-[#1a73e8] spinner" />}
                                </div>
                              </div>

                              {/* Path */}
                              <div>
                                <label className="text-xs font-medium text-[#5f6368] dark:text-[#9aa0a6] mb-1 block">Path</label>
                                <code className="text-xs text-[#9aa0a6] block">{asset.path}</code>
                              </div>
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                // List view
                <Card className="overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f8f9fa] dark:bg-[#3c4043]">
                      <tr>
                        <th className="text-left px-4 py-3 font-medium text-[#5f6368] dark:text-[#9aa0a6]">Name</th>
                        <th className="text-left px-4 py-3 font-medium text-[#5f6368] dark:text-[#9aa0a6]">Size</th>
                        <th className="text-left px-4 py-3 font-medium text-[#5f6368] dark:text-[#9aa0a6]">URL</th>
                        <th className="text-right px-4 py-3 font-medium text-[#5f6368] dark:text-[#9aa0a6]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e8eaed] dark:divide-[#3c4043]">
                      {filteredAssets.map(asset => {
                        const isMoving = movingAssetPath === asset.path;
                        return (
                          <React.Fragment key={asset.sha}>
                            <tr className="hover:bg-[#f8f9fa]/50 dark:hover:bg-[#3c4043]/50">
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  {isImageAsset(asset.name) ? <ImageIcon className="w-4 h-4 text-[#1a73e8]" /> : <File className="w-4 h-4 text-[#9aa0a6]" />}
                                  <span className="font-medium truncate max-w-[200px]" title={asset.name}>{asset.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-[#5f6368]">{formatSize(asset.size)}</td>
                              <td className="px-4 py-3">
                                <code className="text-xs font-mono text-[#5f6368] truncate max-w-[300px] block">{asset.cdn_url}</code>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => copyToClipboard(asset.cdn_url, asset.sha)}
                                    className="p-1.5 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded"
                                    title="Copy URL"
                                  >
                                    {copying === asset.sha ? <Check className="w-4 h-4 text-[#188038]" /> : <Copy className="w-4 h-4" />}
                                  </button>
                                  <button
                                    onClick={() => window.open(asset.cdn_url, '_blank')}
                                    className="p-1.5 hover:bg-[#e8eaed] dark:hover:bg-[#3c4043] rounded"
                                    title="Open"
                                  >
                                    <ExternalLink className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => toggleAssetExpanded(asset.sha)}
                                    className={`p-1.5 rounded ${expandedAssets[asset.sha] ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#e8eaed] dark:hover:bg-[#3c4043]'}`}
                                    title="More"
                                  >
                                    <ChevronRight className={`w-4 h-4 transition-transform ${expandedAssets[asset.sha] ? 'rotate-90' : ''}`} />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(asset)}
                                    className="p-1.5 hover:bg-[#fce8e8] text-[#d93025] rounded"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {expandedAssets[asset.sha] && (
                              <tr className="bg-[#f8f9fa] dark:bg-[#171717]">
                                <td colSpan={4} className="px-4 py-3 animate-fade-in">
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs text-[#5f6368]">Move to:</span>
                                    <select
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val !== asset.folder && val !== '__placeholder') {
                                          moveAssetToFolder(asset.path, val);
                                          e.target.value = '__placeholder';
                                        }
                                      }}
                                      disabled={isMoving}
                                      className="text-xs bg-white dark:bg-[#202124] border border-[#dadce0] dark:border-[#5f6368] rounded px-2 py-1 disabled:opacity-50"
                                      defaultValue="__placeholder"
                                    >
                                      <option value="__placeholder" disabled>Select folder...</option>
                                      <option value="">📁 Root</option>
                                      {allFolders.map(f => (
                                        <option key={f} value={f} disabled={f === asset.folder}>
                                          {f}
                                        </option>
                                      ))}
                                    </select>
                                    {isMoving && <Loader2 className="w-4 h-4 text-[#1a73e8] spinner" />}
                                    <span className="text-xs text-[#9aa0a6]">Path: {asset.path}</span>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* Floating New Folder Button (when no folders exist) */}
      {!showNewFolderInput && folders.length === 0 && (
        <button
          onClick={() => setShowNewFolderInput(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#1a73e8] text-white rounded-full shadow-lg hover:bg-[#1557b0] transition-all flex items-center justify-center z-30"
          title="New Folder"
        >
          <FolderPlus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
});

// --- Main App Component ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [reposLoading, setReposLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'landing' | 'repos' | 'dashboard'>('landing');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [toast, setToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  const fetchUser = useCallback(async () => {
    try {
      const res = await fetch('/api/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
        if (data.selected_repo) {
          setView('dashboard');
        } else {
          setView('repos');
          fetchRepos();
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
  }, []);

  const fetchRepos = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        fetchUser();
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [fetchUser]);

  const handleConnect = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/url');
      if (!res.ok) return;
      const { url } = await res.json();
      window.open(url, 'github_oauth', 'width=600,height=700');
    } catch (err) {
      console.error(err);
    }
  }, []);

  const handleSelectRepo = useCallback(async (repo: Repo) => {
    try {
      await fetch('/api/select-repo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repo: repo.full_name, branch: repo.default_branch })
      });
      fetchUser();
    } catch (err) {
      console.error(err);
    }
  }, [fetchUser]);

  const handleLogout = useCallback(async () => {
    await fetch('/api/logout', { method: 'POST' });
    setUser(null);
    setView('landing');
  }, []);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#171717] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#1a73e8] border-t-transparent rounded-full spinner" />
          <p className="text-[#5f6368]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa] dark:bg-[#171717] flex flex-col">
      <Header 
        user={user} 
        onLogout={handleLogout} 
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
      />
      
      <div className="flex flex-1">
        {view === 'dashboard' && user && (
          <Sidebar 
            activeView={activeView}
            onViewChange={setActiveView}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            repo={user.selected_repo}
          />
        )}
        
        <main className="flex-1 min-w-0">
          {view === 'landing' && <LandingPage onConnect={handleConnect} />}
          
          {view === 'repos' && (
            <RepoSelector 
              repos={repos} 
              onSelect={handleSelectRepo} 
              loading={reposLoading} 
            />
          )}
          
          {view === 'dashboard' && user && (
            <Dashboard 
              user={user}
              activeView={activeView}
              onChangeRepo={() => {
                setView('repos');
                fetchRepos();
              }}
              onToast={showToast}
            />
          )}
        </main>
      </div>

      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
