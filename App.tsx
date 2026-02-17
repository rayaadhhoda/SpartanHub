import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Settings, Filter, Bell, ChevronDown, LogOut, Menu, Link as LinkIcon, ZoomIn, Accessibility, Type, Sun, Moon, Eye, Speaker, Clock, CheckSquare, Square, TrendingUp } from 'lucide-react';
import { Resource, ResourceType, UserRole } from './types';
import ResourceCard from './components/ResourceCard';
import SettingsModal from './components/SettingsModal';
import AIChatWidget from './components/AIChatWidget';
import ResourceViewerModal from './components/ResourceViewerModal';
import AdminConsole from './components/AdminConsole';
import { SJSU_SUBJECTS } from './constants';
import { supabase } from "./supabase"; // make sure this import exists

// Start with an empty database so the user can populate it
const INITIAL_RESOURCES: Resource[] = [];

// tmp

// Updated Storage Keys
const STORAGE_KEYS = {
  THEME: 'spartanhub_theme',
  BOOKMARKS: 'spartanhub_bookmarks_clean'
};

// Helper to load state safely
const loadState = <T,>(key: string, fallback: T): T => {
  try {
    const stored = localStorage.getItem(key);
    return stored ? JSON.parse(stored) : fallback;
  } catch (e) {
    console.warn(`Failed to load ${key} from storage`, e);
    return fallback;
  }
};

function App() {
  // Authentication State
  // Default to faculty role, no login screen needed for general access
  const [currentUser, setCurrentUser] = useState<string>('Faculty Member');
  const [userRole, setUserRole] = useState<UserRole>('faculty');

  const [view, setView] = useState<'dashboard' | 'admin'>('dashboard');

  // Persistent State: Resources
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);

  const [searchTerm, setSearchTerm] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('All');

  // Multi-select for Subjects
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  const [selectedLevel, setSelectedLevel] = useState<string>('All');
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);

  // Persistent State: Bookmarks
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(() => {
    const saved = loadState<string[]>(STORAGE_KEYS.BOOKMARKS, []);
    return new Set(saved);
  });

  // Notification State
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Magnifier / Zoom State
  const [isMagnifierActive, setIsMagnifierActive] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Accessibility State
  const [isAccessibilityOpen, setIsAccessibilityOpen] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [isScreenReaderMode, setIsScreenReaderMode] = useState(false);
  const [fontSize, setFontSize] = useState<'normal' | 'large' | 'xl'>('normal');

  // Persistent State: Dark Mode
  const [isDarkMode, setIsDarkMode] = useState(() =>
    loadState(STORAGE_KEYS.THEME, false)
  );

  // Recent History
  const [recentResourceIds, setRecentResourceIds] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    (async () => {
      try {
        const res = await fetch(`${base}/api/resources`);
        if (!res.ok) throw new Error(await res.text());
        const data = await res.json();
        setResources(data);
      } catch (e) {
        console.error("Failed to load resources from backend", e);
      }
    })();
  }, []);

  useEffect(() => {
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    const applyRoleFromSession = async () => {
      const { data } = await supabase.auth.getSession();
      const email = (data.session?.user?.email || "").toLowerCase();
      setUserRole(adminEmails.includes(email) ? "admin" : "student");
    };

    applyRoleFromSession();

    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      applyRoleFromSession();
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(Array.from(selectedResourceIds)));
  }, [selectedResourceIds]);


  // TTS Helper
  const announce = useCallback((message: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Cancel current speech
      const utterance = new SpeechSynthesisUtterance(message);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  // Toggle Dark Mode Class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Handle Accessibility Modes
  useEffect(() => {
    const root = document.documentElement;
    // Reset Font Classes
    root.classList.remove('text-base', 'text-lg', 'text-xl');

    // Apply Font Size
    if (fontSize === 'normal') root.classList.add('text-base');
    if (fontSize === 'large') root.classList.add('text-lg');
    if (fontSize === 'xl') root.classList.add('text-xl');

    // Apply High Contrast
    if (isHighContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    // Apply Screen Reader Optimization
    if (isScreenReaderMode) {
      document.body.classList.add('sr-optimized');
    } else {
      document.body.classList.remove('sr-optimized');
    }
  }, [isHighContrast, fontSize, isScreenReaderMode]);

  // Handle Keyboard Zoom & Search Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Search Shortcut (Cmd+K or Ctrl+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
        return;
      }

      if (!isMagnifierActive) return;

      if (e.key === 'ArrowUp' || e.key === 'ArrowRight') {
        e.preventDefault();
        setZoomLevel(prev => Math.min(prev + 10, 150)); // Max 150%
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowLeft') {
        e.preventDefault();
        setZoomLevel(prev => Math.max(prev - 10, 80)); // Min 80%
      } else if (e.key === 'Escape') {
        setIsMagnifierActive(false);
        setZoomLevel(100);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMagnifierActive]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (isScreenReaderMode) announce(isDarkMode ? "Light mode enabled" : "Dark mode enabled");
  };

  const toggleScreenReaderMode = () => {
    const newMode = !isScreenReaderMode;
    setIsScreenReaderMode(newMode);
    if (newMode) announce("Screen Reader Optimization Enabled. Text to speech active.");
    else announce("Screen Reader Optimization Disabled.");
  };

  // Add new resource from Admin Console
  const handleUpload = (newResource: Resource) => {
    // New resources start with 0 stats
    newResource.views = 0;
    newResource.downloads = 0;

    setResources(prev => [newResource, ...prev]);

    // General notification for all online resources
    if (newResource.status === 'online') {
      setNotifications(prev => [{
        id: Date.now(),
        text: `New ${newResource.type} in ${newResource.subject} / ${newResource.department}: ${newResource.title}`,
        isRead: false,
        timestamp: new Date()
      }, ...prev]);
      if (isScreenReaderMode) announce(`New Notification: New ${newResource.type} available in ${newResource.subject}`);
    }
  };

  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev => prev.map(r => r.id === updatedResource.id ? updatedResource : r));
  };

  const handleBatchUpdateResources = (updatedResources: Resource[]) => {
    setResources(prev => {
      const updateMap = new Map(updatedResources.map(r => [r.id, r]));
      return prev.map(r => updateMap.get(r.id) || r);
    });
  };

  const handleOverwriteDatabase = (newResources: Resource[]) => {
    setResources(newResources);
    if (isScreenReaderMode) announce("Database has been successfully updated from import.");

    // Validate bookmarks against new data
    const newIds = new Set(newResources.map(r => r.id));
    setSelectedResourceIds(prev => {
      const next = new Set<string>();
      prev.forEach(id => {
        if (newIds.has(id)) next.add(id);
      });
      return next;
    });
  };

  const handleDeleteResource = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id));
    if (selectedResourceIds.has(id)) {
      const newSet = new Set(selectedResourceIds);
      newSet.delete(id);
      setSelectedResourceIds(newSet);
    }
  };

  // Analytics Handlers
  const handleIncrementView = (id: string) => {
    setResources(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, views: (r.views || 0) + 1 };
      }
      return r;
    }));
  };

  const handleIncrementDownload = (id: string) => {
    setResources(prev => prev.map(r => {
      if (r.id === id) {
        return { ...r, downloads: (r.downloads || 0) + 1 };
      }
      return r;
    }));
  };

  // Authentication Handlers
  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
    .split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  // const handleAdminLogin = async (email: string, password: string) => {
  //   const { data, error } = await supabase.auth.signInWithPassword({
  //     email,
  //     password,
  //   });

  //   if (error || !data.user) return false;

  //   const userEmail = (data.user.email || "").toLowerCase();
  //   return adminEmails.includes(userEmail);
  // };
  const handleAdminLogin = async (email: string, password: string) => {
    const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "")
      .split(",")
      .map((s: string) => s.trim().toLowerCase())
      .filter(Boolean);

    console.log("VITE_ADMIN_EMAILS loaded:", adminEmails);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase signInWithPassword error:", error.message);
      // TEMP: show exact error to UI
      alert(error.message);
      return false;
    }

    const userEmail = (data.user?.email || "").toLowerCase();
    console.log("Signed in as:", userEmail);

    const isAdmin = adminEmails.includes(userEmail);
    console.log("Is admin?", isAdmin);

    if (isAdmin) setUserRole("admin");
    return isAdmin;
  };



  const handleLogout = () => {
    // For "logout", we just demote to faculty role since we don't have a login screen anymore
    setUserRole('faculty');
    setCurrentUser('Faculty Member');
    setView('dashboard');
    if (isScreenReaderMode) announce("Logged out of admin console.");
  };

  const toggleResourceSelection = (id: string) => {
    const newSet = new Set(selectedResourceIds);
    let action = '';
    if (newSet.has(id)) {
      newSet.delete(id);
      action = 'unselected';
    } else {
      newSet.add(id);
      action = 'selected';
    }
    setSelectedResourceIds(newSet);
    if (isScreenReaderMode) announce(`Resource ${action}`);
  };

  const handleQuickLinkAdd = async () => {
    const url = prompt("Enter the URL to quickly add to the knowledge base:");
    if (!url) return;

    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    const payload = {
      title: "Quick Link: " + url.replace(/^https?:\/\//, ''),
      description: "Auto-generated link resource.",
      type: ResourceType.LINK,
      department: "General",
      subject: "GEN",
      level: "Faculty/Admin",
      tags: ["quick-link"],
      status: "online",
      url,
    };

    try {
      const res = await fetch(`${base}/api/resources`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const saved = await res.json();

      handleUpload(saved);
    } catch (e) {
      console.error(e);
      alert("Failed to create Quick Link via backend.");
    }
  };
  const incrementViewBackend = async (id: string) => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
    try {
      await fetch(`${base}/api/resources/${id}/view`, { method: "POST" });
    } catch (e) {
      console.error("Failed to increment view (backend)", e);
    }
  };

  const incrementDownloadBackend = async (id: string) => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
    try {
      await fetch(`${base}/api/resources/${id}/download`, { method: "POST" });
    } catch (e) {
      console.error("Failed to increment download (backend)", e);
    }
  };

  // Tracking recently viewed items
  const handleResourceClick = (resource: Resource) => {
    setSelectedResource(resource);

    // optimistic UI update
    handleIncrementView(resource.id);

    // persist to backend
    incrementViewBackend(resource.id);

    setRecentResourceIds(prev => {
      const filtered = prev.filter(id => id !== resource.id);
      return [resource.id, ...filtered].slice(0, 5);
    });
  };

  // Sidebar Subject Multi-Select Logic
  const toggleSubjectFilter = (subject: string) => {
    setSelectedSubjects(prev => {
      const newSelection = prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject];

      if (isScreenReaderMode) {
        announce(newSelection.includes(subject) ? `Selected ${subject}` : `Deselected ${subject}`);
      }
      return newSelection;
    });
  };

  const clearSubjectFilter = () => {
    setSelectedSubjects([]);
    if (isScreenReaderMode) announce("Cleared all subject filters");
  };

  if (view === 'admin') {
    return (
      <AdminConsole
        onBack={() => setView('dashboard')}
        onUpload={handleUpload}
        onUpdate={handleUpdateResource}
        onBatchUpdate={handleBatchUpdateResources}
        onOverwriteDatabase={handleOverwriteDatabase}
        onDelete={handleDeleteResource}
        resources={resources}
        isScreenReaderMode={isScreenReaderMode}
        onAnnounce={announce}
      />
    );
  }

  const filteredResources = resources.filter(res => {
    // Only show online resources in dashboard
    if (res.status !== 'online') return false;

    const matchesSearch = res.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.tags.some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesType = activeFilter === 'All' || res.type === activeFilter;

    // Multi-select subject matching: If array is empty, show all. Else, must be in array.
    const matchesSubject = selectedSubjects.length === 0 || selectedSubjects.includes(res.subject);

    const matchesLevel = selectedLevel === 'All' || res.level === selectedLevel;

    return matchesSearch && matchesType && matchesSubject && matchesLevel;
  });

  const popularResources = resources
    .filter(r => r.status === 'online' && r.views > 0)
    .sort((a, b) => b.views - a.views)
    .slice(0, 4);

  const isDefaultView = !searchTerm && activeFilter === 'All' && selectedSubjects.length === 0 && selectedLevel === 'All';

  const handleTagClick = (tag: string) => {
    setSearchTerm(tag);
    if (isScreenReaderMode) announce(`Filtering by tag ${tag}`);
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const currentSubjectValue = selectedSubjects.length === 1 ? selectedSubjects[0] : (selectedSubjects.length > 1 ? 'Multiple' : 'All');

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'}`}>

      {/* Skip to Content for Accessibility */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-0 focus:left-0 focus:bg-sjsu-blue focus:text-white focus:p-4 focus:w-full text-center"
      >
        Skip to main content
      </a>

      {/* Magnifier Instructions */}
      {isAccessibilityOpen && isMagnifierActive && (
        <div className="fixed top-24 right-4 z-[60] w-72 bg-sjsu-blue text-white p-4 rounded-xl shadow-xl border border-white/20 animate-in fade-in slide-in-from-right-4">
          <div className="flex items-start gap-3">
            <div className="bg-white/20 p-2 rounded-full">
              <ZoomIn size={20} />
            </div>
            <div>
              <h4 className="font-bold text-sm">Magnifier Active</h4>
              <p className="text-xs text-blue-100 mt-1 leading-snug">
                Use <strong>Arrow Keys</strong> to pan and zoom.
              </p>
              <div className="mt-2 text-xs font-bold text-sjsu-gold">
                Current Level: {zoomLevel}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar Navigation */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-300 ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsSidebarOpen(false)}
      />
      <div className={`fixed top-0 left-0 bottom-0 w-72 bg-white dark:bg-gray-950 shadow-2xl z-50 transform transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} flex flex-col`}>
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
          <h2 className="font-serif font-bold text-xl text-sjsu-blue dark:text-sjsu-gold">Navigation</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full">
            <Settings size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">

          {/* Recently Viewed */}
          {recentResourceIds.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2 flex items-center gap-2">
                <Clock size={12} /> Recently Viewed
              </h3>
              <div className="space-y-1">
                {recentResourceIds.map(id => {
                  const res = resources.find(r => r.id === id);
                  if (!res) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        handleResourceClick(res);
                        setIsSidebarOpen(false);
                        if (isScreenReaderMode) announce(`Opening recently viewed: ${res.title}`);
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900 truncate flex items-center gap-2"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${res.type === 'VIDEO' ? 'bg-blue-400' :
                        res.type === 'PDF' ? 'bg-red-400' : 'bg-gray-400'
                        }`}></span>
                      <span className="truncate">{res.title}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Library</h3>
            <button
              onClick={() => {
                setIsSidebarOpen(false);
                if (isScreenReaderMode) announce(`You have ${selectedResourceIds.size} saved resources`);
              }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center justify-between"
            >
              Saved Resources
              <div className="bg-gray-100 dark:bg-gray-800 text-xs px-2 py-0.5 rounded-full text-gray-500">
                {selectedResourceIds.size}
              </div>
            </button>
          </div>

          {userRole === 'admin' && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Admin Tools</h3>
              <div className="space-y-1">
                <button
                  onClick={() => handleQuickLinkAdd()}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900 flex items-center gap-2"
                >
                  <div className="w-6 h-6 rounded bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600">
                    <LinkIcon size={14} />
                  </div>
                  Quick Add Link
                </button>
              </div>
            </div>
          )}

          <div className="mb-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-2">Browse by Level</h3>
            <div className="space-y-1">
              {['Undergraduate', 'Graduate', 'Faculty/Admin'].map(level => (
                <button
                  key={level}
                  onClick={() => {
                    setSelectedLevel(level === selectedLevel ? 'All' : level);
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between group ${selectedLevel === level
                    ? 'bg-sjsu-blue/10 text-sjsu-blue dark:text-blue-400'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'
                    }`}
                >
                  {level}
                  {selectedLevel === level && <div className="w-1.5 h-1.5 rounded-full bg-sjsu-blue dark:bg-blue-400"></div>}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-3 px-2">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Subjects</h3>
              {selectedSubjects.length > 0 && (
                <button
                  onClick={clearSubjectFilter}
                  className="text-[10px] text-sjsu-blue dark:text-blue-400 hover:underline font-bold"
                >
                  Clear ({selectedSubjects.length})
                </button>
              )}
            </div>

            <div className="space-y-1">
              <button
                onClick={clearSubjectFilter}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${selectedSubjects.length === 0
                  ? 'bg-sjsu-blue/10 text-sjsu-blue dark:text-blue-400 font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'
                  }`}
              >
                {selectedSubjects.length === 0 ? <CheckSquare size={16} /> : <Square size={16} />}
                All Subjects
              </button>
              {SJSU_SUBJECTS.map(subj => {
                const isSelected = selectedSubjects.includes(subj);
                return (
                  <button
                    key={subj}
                    onClick={() => toggleSubjectFilter(subj)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors ${isSelected
                      ? 'bg-sjsu-blue text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-900'
                      }`}
                  >
                    {isSelected ? <CheckSquare size={16} className="text-sjsu-gold" /> : <Square size={16} />}
                    {subj}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className={`sticky top-0 z-30 shadow-sm border-b transition-colors duration-300 ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="w-full px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">

          {/* Logo Section */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open Navigation Menu"
              className="p-2 -ml-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>
            <img
              src="spartanasset.png"
              alt="Spartan Logo"
              className="h-12 w-auto object-contain"
            />
            <div className="hidden md:block h-10 w-px bg-gray-300 mx-2 dark:bg-gray-600"></div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-sjsu-blue tracking-tight leading-none dark:text-blue-400">
                Spartan<span className="text-sjsu-gold">Hub</span>
              </h1>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-semibold dark:text-gray-400">Knowledge Base</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block relative group">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400 group-focus-within:text-sjsu-blue dark:group-focus-within:text-sjsu-gold transition-colors" />
            </div>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search courses... (Cmd + K)"
              aria-label="Search resources"
              className={`block w-full pl-10 pr-3 py-2.5 border rounded-lg leading-5 focus:outline-none focus:ring-2 focus:ring-sjsu-blue focus:border-transparent transition-all sm:text-sm shadow-inner
                ${isDarkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:bg-gray-700'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:bg-white'}`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">

            {/* Accessibility Menu */}
            <div className="relative">
              <button
                onClick={() => setIsAccessibilityOpen(!isAccessibilityOpen)}
                aria-label="Accessibility Settings"
                className={`p-2 rounded-full transition-colors relative ${isAccessibilityOpen
                  ? 'bg-sjsu-blue text-white shadow-md'
                  : isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'
                  }`}
                title="Accessibility Settings"
              >
                <Accessibility size={22} />
              </button>

              {isAccessibilityOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 animate-in fade-in slide-in-from-top-2 p-4">
                  <h3 className="text-sm font-bold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                    <Accessibility size={16} /> Accessibility
                  </h3>

                  {/* Font Size Control */}
                  <div className="mb-4">
                    <label className="text-xs text-gray-500 dark:text-gray-400 font-semibold mb-2 block">Text Size</label>
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                      <button
                        onClick={() => setFontSize('normal')}
                        className={`flex-1 py-1 text-xs font-bold rounded ${fontSize === 'normal' ? 'bg-white dark:bg-gray-600 shadow text-sjsu-blue dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        Aa
                      </button>
                      <button
                        onClick={() => setFontSize('large')}
                        className={`flex-1 py-1 text-sm font-bold rounded ${fontSize === 'large' ? 'bg-white dark:bg-gray-600 shadow text-sjsu-blue dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        Aa
                      </button>
                      <button
                        onClick={() => setFontSize('xl')}
                        className={`flex-1 py-1 text-base font-bold rounded ${fontSize === 'xl' ? 'bg-white dark:bg-gray-600 shadow text-sjsu-blue dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                      >
                        Aa
                      </button>
                    </div>
                  </div>

                  {/* High Contrast Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Eye size={16} /> High Contrast
                    </span>
                    <button
                      onClick={() => setIsHighContrast(!isHighContrast)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${isHighContrast ? 'bg-yellow-400' : 'bg-gray-300 dark:bg-gray-600'}`}
                      aria-label="Toggle High Contrast"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isHighContrast ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Screen Reader Optimization Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <Speaker size={16} /> Screen Reader
                    </span>
                    <button
                      onClick={() => toggleScreenReaderMode()}
                      className={`w-10 h-5 rounded-full relative transition-colors ${isScreenReaderMode ? 'bg-sjsu-blue' : 'bg-gray-300 dark:bg-gray-600'}`}
                      aria-label="Toggle Screen Reader Optimization"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isScreenReaderMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Magnifier Toggle */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <ZoomIn size={16} /> Magnifier
                    </span>
                    <button
                      onClick={() => setIsMagnifierActive(!isMagnifierActive)}
                      className={`w-10 h-5 rounded-full relative transition-colors ${isMagnifierActive ? 'bg-sjsu-blue' : 'bg-gray-300 dark:bg-gray-600'}`}
                      aria-label="Toggle Magnifier"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isMagnifierActive ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                  {/* Dark Mode Toggle */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      {isDarkMode ? <Moon size={16} /> : <Sun size={16} />} Dark Mode
                    </span>
                    <button
                      onClick={toggleTheme}
                      className={`w-10 h-5 rounded-full relative transition-colors ${isDarkMode ? 'bg-sjsu-blue' : 'bg-gray-300'}`}
                      aria-label="Toggle Dark Mode"
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDarkMode ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                  </div>

                </div>
              )}
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                aria-label="Notifications"
                className={`relative p-2 rounded-full transition-colors ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Bell size={22} />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-2 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-800 animate-pulse"></span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center">
                    <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Notifications</span>
                    {notifications.length > 0 && (
                      <button onClick={() => setNotifications([])} className="text-xs text-sjsu-blue dark:text-blue-400 hover:underline">Clear all</button>
                    )}
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-6 text-center text-gray-400 text-sm">No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className="p-3 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-snug">{n.text}</p>
                          <span className="text-xs text-gray-400 mt-1 block">{new Date(n.timestamp).toLocaleTimeString()}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Settings"
              className={`flex items-center gap-2 p-1.5 pr-3 rounded-full border transition-all cursor-pointer group
                ${isDarkMode
                  ? 'bg-gray-800 border-gray-700 hover:border-sjsu-gold text-gray-200'
                  : 'bg-white border-gray-200 hover:border-sjsu-gold text-gray-700 shadow-sm'}`}
            >
              <div className="bg-sjsu-blue text-white p-1.5 rounded-full">
                <Settings size={18} className="group-hover:rotate-90 transition-transform duration-500" />
              </div>
              <span className="text-sm font-semibold hidden lg:block">Settings</span>
            </button>

            {userRole === 'admin' && (
              <button
                onClick={handleLogout}
                className="ml-2 text-xs text-gray-400 hover:text-red-500 hover:underline"
              >
                Exit Admin
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content - Scalable for Magnifier */}
      <main
        id="main-content"
        className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 transition-transform duration-200 ease-out origin-top"
        style={{ zoom: `${zoomLevel}%` }}
      >

        {/* Page Header & Filters */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-8 gap-6">
          <div>
            <h2 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Dashboard</h2>
            <p className="text-gray-500 mt-1 dark:text-gray-400">
              Welcome, {currentUser}.
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${userRole === 'admin' ? 'bg-sjsu-blue text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'}`}>
                {userRole}
              </span>
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">

            {/* Filters Row */}
            <div className="flex items-center gap-3">

              {/* Subject Dropdown */}
              <div className="relative">
                <select
                  value={currentSubjectValue}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === 'All') {
                      clearSubjectFilter();
                    } else {
                      setSelectedSubjects([val]);
                      if (isScreenReaderMode) announce(`Subject filter set to ${val}`);
                    }
                  }}
                  aria-label="Filter by Subject"
                  className={`appearance-none pl-4 pr-10 py-2 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sjsu-blue cursor-pointer shadow-sm transition-all min-w-[140px] max-w-[200px]
                    ${isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-200 hover:border-sjsu-blue'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-sjsu-blue'}`}
                >
                  <option value="All">All Subjects</option>
                  {selectedSubjects.length > 1 && <option value="Multiple" disabled>Multiple ({selectedSubjects.length})</option>}
                  {SJSU_SUBJECTS.map(subj => (
                    <option key={subj} value={subj}>{subj}</option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>

              {/* Level Dropdown */}
              <div className="relative">
                <select
                  value={selectedLevel}
                  onChange={(e) => {
                    setSelectedLevel(e.target.value);
                    if (isScreenReaderMode) announce(`Level filter set to ${e.target.value}`);
                  }}
                  aria-label="Filter by Academic Level"
                  className={`appearance-none pl-4 pr-10 py-2 border rounded-lg text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sjsu-blue cursor-pointer shadow-sm transition-all min-w-[120px]
                    ${isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-200 hover:border-sjsu-blue'
                      : 'bg-white border-gray-200 text-gray-700 hover:border-sjsu-blue'}`}
                >
                  <option value="All">All Levels</option>
                  <option value="Undergraduate">Undergraduate</option>
                  <option value="Graduate">Graduate</option>
                  <option value="Faculty/Admin">Faculty/Admin</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="h-6 w-px bg-gray-300 hidden md:block dark:bg-gray-600"></div>

            {/* Type Filters */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar max-w-[calc(100vw-2rem)] md:max-w-none">
              {['All', 'PDF', 'VIDEO', 'LINK', 'DOC', 'IMAGE', 'PRESENTATION', 'SPREADSHEET', 'CODE'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => {
                    setActiveFilter(filter);
                    if (isScreenReaderMode) announce(`Type filter set to ${filter}`);
                  }}
                  aria-pressed={activeFilter === filter}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap border
                    ${activeFilter === filter
                      ? 'bg-sjsu-blue text-white shadow-md border-sjsu-blue'
                      : isDarkMode
                        ? 'bg-gray-800 text-gray-300 border-gray-700 hover:bg-gray-700'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                >
                  {filter === 'All' ? 'All Types' : filter}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Popular Resources Section */}
        {isDefaultView && popularResources.length > 0 && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h3 className="text-xl font-serif font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <div className="p-2 bg-red-100 text-red-600 rounded-lg dark:bg-red-900/30 dark:text-red-400">
                <TrendingUp size={20} />
              </div>
              Most Popular Resources
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {popularResources.map(resource => (
                <ResourceCard
                  key={`popular-${resource.id}`}
                  resource={resource}
                  onClick={handleResourceClick}
                  onTagClick={handleTagClick}
                  isSelected={selectedResourceIds.has(resource.id)}
                  onToggleSelect={() => toggleResourceSelection(resource.id)}
                  isScreenReaderMode={isScreenReaderMode}
                  onAnnounce={announce}
                  searchTerm={searchTerm}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 py-8">
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">All Resources</span>
              <div className="h-px bg-gray-200 dark:bg-gray-800 flex-1"></div>
            </div>
          </div>
        )}

        {/* Grid Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredResources.map(resource => (
            <ResourceCard
              key={resource.id}
              resource={resource}
              onClick={handleResourceClick}
              onTagClick={handleTagClick}
              isSelected={selectedResourceIds.has(resource.id)}
              onToggleSelect={() => toggleResourceSelection(resource.id)}
              isScreenReaderMode={isScreenReaderMode}
              onAnnounce={announce}
              searchTerm={searchTerm}
            />
          ))}
        </div>

        {filteredResources.length === 0 && (
          <div className={`text-center py-20 rounded-xl border border-dashed transition-colors
            ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'}`}>
            <div className="text-gray-300 mb-4 dark:text-gray-600">
              <Filter size={64} className="mx-auto opacity-50" />
            </div>
            <h3 className="text-xl font-bold text-gray-600 dark:text-gray-300">
              {resources.length === 0 ? "Knowledge Base Empty" : "No resources found"}
            </h3>
            <p className="text-gray-400 dark:text-gray-500 mt-2 max-w-sm mx-auto">
              {resources.length === 0
                ? "The database is currently empty. Login to the Admin Console to upload content."
                : "Try adjusting your subject, level, or type filters."}
            </p>
            {(searchTerm || activeFilter !== 'All' || selectedSubjects.length > 0 || selectedLevel !== 'All') && resources.length > 0 && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setActiveFilter('All');
                  clearSubjectFilter();
                  setSelectedLevel('All');
                }}
                className="mt-4 text-sjsu-blue hover:underline font-medium dark:text-blue-400"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className={`border-t mt-12 py-8 transition-colors ${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="w-full mx-auto px-4 text-center">
          <div className={`font-serif font-bold text-xl mb-2 ${isDarkMode ? 'text-gray-200' : 'text-sjsu-blue'}`}>SAN JOSÉ STATE UNIVERSITY</div>
          <p className="text-sm text-gray-500 mb-3">© 2025 San José State University. All rights reserved.</p>

          {/* Prototype Disclaimer */}
          <div className={`max-w-2xl mx-auto mt-4 p-4 rounded-lg border ${isDarkMode ? 'bg-gray-900 border-gray-700' : 'bg-gray-50 border-gray-300'}`}>
            <p className={`text-xs font-semibold mb-1 ${isDarkMode ? 'text-sjsu-gold' : 'text-sjsu-blue'}`}>
              ⚠️ PROTOTYPE VERSION
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This is a prototype version of SpartanHub currently under active development.
              Features and functionality may change without notice. Please report any issues or feedback to the development team.
            </p>
          </div>
        </div>
      </footer>

      {/* Interactive Elements */}
      <AIChatWidget
        resources={resources}
        selectedResourceIds={selectedResourceIds}
        onToggleResource={toggleResourceSelection}
        isScreenReaderMode={isScreenReaderMode}
        onAnnounce={announce}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        onOpenAdmin={() => {
          setIsSettingsOpen(false);
          setView('admin');
        }}
        userRole={userRole}
        onAdminLogin={handleAdminLogin}
      />
      <ResourceViewerModal
        resource={selectedResource}
        onClose={() => setSelectedResource(null)}
        onAnnounce={announce}
        isScreenReaderMode={isScreenReaderMode}
        allResources={resources}
        onNavigateResource={handleResourceClick}
        onDownload={(id: string) => {
          // optimistic UI update
          handleIncrementDownload(id);

          // persist to backend
          incrementDownloadBackend(id);
        }}
      />

    </div>
  );
}

export default App;