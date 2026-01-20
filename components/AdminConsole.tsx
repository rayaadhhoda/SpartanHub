import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, Upload, FileText, LayoutDashboard, 
  BarChart2, Save, X, CheckCircle, Tag, Eye, EyeOff, Link as LinkIcon, List, Trash2, Edit2, Check, ExternalLink, Download, Trophy, RotateCcw, Database
} from 'lucide-react';
import { Resource, ResourceType, AcademicLevel } from '../types';
import { SJSU_SUBJECTS, SJSU_DEPARTMENTS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { supabase } from "../supabase";

interface AdminConsoleProps {
  onBack: () => void;
  onUpload: (newResource: Resource) => void;
  onUpdate: (updatedResource: Resource) => void;
  onDelete: (id: string) => void;
  resources: Resource[];
  onBatchUpdate: (updatedResources: Resource[]) => void;
  onOverwriteDatabase?: (resources: Resource[]) => void;
  isScreenReaderMode?: boolean;
  onAnnounce?: (message: string) => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ 
  onBack, 
  onUpload, 
  onUpdate, 
  onDelete, 
  resources, 
  onBatchUpdate,
  onOverwriteDatabase, 
  isScreenReaderMode = false,
  onAnnounce
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manage' | 'stats' | 'system'>('upload');
  const [manageView, setManageView] = useState<'resources' | 'tags'>('resources');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  
  // Edit Mode State
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  
  // Tag Management State
  const [editingTag, setEditingTag] = useState<{ original: string, current: string } | null>(null);
  const [tagDeleteConfirm, setTagDeleteConfirm] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: ResourceType.PDF,
    department: SJSU_DEPARTMENTS[0], // Default to first (Generic) instead of specific 'CS'
    subject: SJSU_SUBJECTS[0], // Default to first (Generic)
    level: 'Undergraduate' as AcademicLevel,
    tags: '',
    status: 'online' as 'online' | 'offline',
    url: '',
    external_url: '',
    relatedIds: [] as string[]
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Get unique existing tags for dropdown and tag manager
  const rawTags: string[] = resources.reduce((acc, r) => acc.concat(r.tags), [] as string[]);
  const uniqueTags = Array.from(new Set(rawTags)).sort();
  
  // Calculate tag counts
  const tagCounts = rawTags.reduce<Record<string, number>>((acc, tag) => {
    acc[tag] = (acc[tag] || 0) + 1;
    return acc;
  }, {});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddTag = (tag: string) => {
    if (!tag) return;
    const currentTags = formData.tags.split(',').map(t => t.trim()).filter(Boolean);
    
    if (!currentTags.includes(tag)) {
       setFormData(prev => ({ 
         ...prev, 
         tags: prev.tags ? `${prev.tags}, ${tag}` : tag 
       }));
    }
  };

  const toggleStatus = () => {
    setFormData(prev => ({
      ...prev,
      status: prev.status === 'online' ? 'offline' : 'online'
    }));
  };

  const handleRelatedToggle = (id: string) => {
    setFormData(prev => {
      const isSelected = prev.relatedIds.includes(id);
      return {
        ...prev,
        relatedIds: isSelected 
          ? prev.relatedIds.filter(rid => rid !== id) 
          : [...prev.relatedIds, id]
      };
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleEditClick = (resource: Resource) => {
    setEditingResourceId(resource.id);
    setFormData({
        title: resource.title,
        description: resource.description,
        type: resource.type,
        department: resource.department,
        subject: resource.subject,
        level: resource.level,
        tags: resource.tags.join(', '),
        status: resource.status,
        url: resource.url || '',
        external_url: resource.external_url || '',
        relatedIds: resource.relatedResourceIds || []
    });
    // Switch to the form view
    setActiveTab('upload');
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingResourceId(null);
    setFormData(prev => ({
      ...prev, // Keep the previous Level, Department, Subject for easier batch uploading
      title: '',
      description: '',
      type: ResourceType.PDF, // Reset type or keep? Usually nicer to reset type to PDF as default.
      tags: '',
      status: 'online',
      url: '',
      external_url: '',
      relatedIds: []
    }));
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const STORAGE_BUCKET = "resources"; // must match Supabase bucket name

  const sanitizeFileName = (name: string) => name.replace(/[^\w.\-]+/g, "_");

  const uploadToSupabasePublic = async (file: File) => {
    const safeName = sanitizeFileName(file.name);
    // const filePath = `uploads/${crypto.randomUUID()}_${safeName}`;
    const id =
      (typeof crypto !== "undefined" && "randomUUID" in crypto)
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(16).slice(2)}`;

    const filePath = `uploads/${id}_${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) throw new Error(uploadError.message);

      const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);

    const publicUrl =
      (data as any)?.publicUrl ?? (data as any)?.publicURL ?? null;

    if (!publicUrl) {
      throw new Error(
        `Supabase upload succeeded but getPublicUrl returned empty for path: ${filePath}. ` +
        `Check VITE_SUPABASE_URL, bucket name (${STORAGE_BUCKET}), and bucket public access.`
      );
    }

    return publicUrl;
  };

  const getAccessToken = async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw new Error(error.message);
    const token = data.session?.access_token;
    if (!token) throw new Error("Not logged in. Please sign in.");
    return token;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const processedTags = formData.tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    try {
      const existing = editingResourceId
        ? resources.find((r) => r.id === editingResourceId)
        : null;
      
      // const originalFilename =
      //   selectedFile?.name ??
      //   (editingResourceId ? (existing as any)?.original_filename ?? null : null);
      
      // 1) Determine URL
      let urlToSave: string | null = null;

      // LINK type: must have URL
      if (formData.type === ResourceType.LINK) {
        urlToSave = formData.url?.trim() || null;
      }

      // Non-LINK types: upload OR link
      else {
        if (selectedFile) {
          urlToSave = await uploadToSupabasePublic(selectedFile);
        } else if (formData.url?.trim()) {
          // link-only non-LINK resource (YouTube, Google Doc, etc.)
          urlToSave = formData.url.trim();
        } else if (existing?.url) {
          // editing existing resource without changes
          urlToSave = existing.url;
        } else {
          throw new Error("Please upload a file or provide a link.");
        }
      }

      const originalFilename =
        selectedFile?.name ??
        (editingResourceId ? existing?.original_filename ?? null : null);

      // 2) Payload AFTER url is ready
      const payload = {
      title: formData.title,
      description: formData.description,
      type: formData.type,
      department: formData.department,
      subject: formData.subject,
      level: formData.level,
      tags: processedTags.length > 0 ? processedTags : ["uncategorized"],
      status: formData.status,
      url: urlToSave,
      // external_url: formData.type === ResourceType.LINK ? null : (formData.external_url?.trim() || null),
      external_url: formData.type === ResourceType.LINK
        ? null
        : (formData.external_url?.trim() || null),
      original_filename: originalFilename,
    };


      // 3) Save metadata to backend
      if (editingResourceId) {
        const token = await getAccessToken();
        const res = await fetch(`${base}/api/resources/${editingResourceId}`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const saved = await res.json();
        onUpdate(saved);

        // relations
        const relRes = await fetch(`${base}/api/resources/${editingResourceId}/related`, {
          method: "PUT",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ relatedIds: formData.relatedIds }),
        });
        if (!relRes.ok) throw new Error(await relRes.text());

        // refresh UI
        const r = await fetch(`${base}/api/resources`);
        if (!r.ok) throw new Error(await r.text());
        const all = await r.json();
        onOverwriteDatabase?.(all);

        setNotification({ type: "success", message: `Resource '${payload.title}' updated successfully.` });
      } else {
        const token = await getAccessToken();
        const res = await fetch(`${base}/api/resources`, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error(await res.text());
        const saved = await res.json();
        onUpload(saved);

        const relRes = await fetch(`${base}/api/resources/${saved.id}/related`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,
          },
          body: JSON.stringify({ relatedIds: formData.relatedIds }),
        });
        if (!relRes.ok) throw new Error(await relRes.text());

        const r = await fetch(`${base}/api/resources`);
        if (!r.ok) throw new Error(await r.text());
        const all = await r.json();
        onOverwriteDatabase?.(all);

        setNotification({ type: "success", message: `Resource successfully indexed and is currently ${payload.status}.` });
      }

      if (isScreenReaderMode && onAnnounce) onAnnounce("Saved.");
      resetForm();
    } catch (err) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Failed to save resource to backend.";
      setNotification({ type: "error", message: msg });
      if (isScreenReaderMode && onAnnounce) onAnnounce("Failed to save.");
    }
  };
  const requiresUrlOnly = (t: ResourceType) => t === ResourceType.LINK;

  const allowsUploadOrLink = (t: ResourceType) =>
    t === ResourceType.VIDEO || t === ResourceType.DOC || t === ResourceType.PRESENTATION;

  const canUploadFile = (t: ResourceType) =>
    t === ResourceType.PDF || allowsUploadOrLink(t);

  const showsPrimaryUrlField = (t: ResourceType) =>
    t === ResourceType.LINK || allowsUploadOrLink(t);

  const primaryUrlLabel = (t: ResourceType) =>
    t === ResourceType.LINK ? "External Resource URL" : "Link (optional if uploading)";

  const primaryUrlPlaceholder = (t: ResourceType) => {
    if (t === ResourceType.VIDEO) return "YouTube / Drive / direct MP4 URL";
    if (t === ResourceType.DOC) return "Google Doc / direct DOCX URL";
    if (t === ResourceType.PRESENTATION) return "Google Slides / direct PPTX URL";
    return "https://...";
  };

  const handleRenameTag = () => {
    if (!editingTag || !editingTag.current.trim() || editingTag.current === editingTag.original) {
      setEditingTag(null);
      return;
    }

    const newTagName = editingTag.current.trim();
    const oldTagName = editingTag.original;

    // Find all resources that need updating
    const updates: Resource[] = [];
    resources.forEach(resource => {
      if (resource.tags.includes(oldTagName)) {
        const updatedTags = resource.tags.map(t => t === oldTagName ? newTagName : t);
        const uniqueUpdatedTags = Array.from(new Set(updatedTags));
        updates.push({ ...resource, tags: uniqueUpdatedTags });
      }
    });

    if (updates.length > 0) {
      onBatchUpdate(updates);
    }

    // setNotification(`Updated tag '${oldTagName}' to '${newTagName}' on ${updates.length} resources.`);
    setNotification({ type: "success", message: `Updated tag '${oldTagName}' to '${newTagName}' on ${updates.length} resources.` });
    if (isScreenReaderMode && onAnnounce) onAnnounce(`Updated tag '${oldTagName}' to '${newTagName}'.`);
    setEditingTag(null);
  };

  const handleDeleteTag = (tagToDelete: string) => {
    const updates: Resource[] = [];
    resources.forEach(resource => {
      if (resource.tags.includes(tagToDelete)) {
        const updatedTags = resource.tags.filter(t => t !== tagToDelete);
        updates.push({ ...resource, tags: updatedTags });
      }
    });

    if (updates.length > 0) {
       onBatchUpdate(updates);
    }
    // setNotification(`Deleted tag '${tagToDelete}' from ${updates.length} resources.`);
    setNotification({ type: "success", message: `Deleted tag '${tagToDelete}' from ${updates.length} resources.` });
    if (isScreenReaderMode && onAnnounce) onAnnounce(`Deleted tag '${tagToDelete}'.`);
    setTagDeleteConfirm(null);
  };

  // --- Import / Export Handlers ---
  const handleExportData = () => {
    const dataStr = JSON.stringify(resources, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `spartanhub_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    // setNotification("Database exported successfully.");
    setNotification({ type: "success", message: "Database exported successfully." });
    if (isScreenReaderMode && onAnnounce) onAnnounce("Database exported successfully.");
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (Array.isArray(json)) {
          // Basic validation check if items look like Resources
          const isValid = json.every(item => item.id && item.title && item.type);
          if (isValid) {
            if (onOverwriteDatabase) onOverwriteDatabase(json);
            // setNotification(`Successfully imported ${json.length} resources.`);
            setNotification({ type: "success", message: `Successfully imported ${json.length} resources.` });
          } else {
            // setNotification("Error: Invalid file format. JSON structure mismatch.");
            setNotification({ type: "error", message: "Error: Invalid file format. JSON structure mismatch." });
          }
        } else {
          // setNotification("Error: Invalid JSON format. Expected an array.");
          setNotification({ type: "error", message: "Error: Invalid JSON format. Expected an array." });
        }
      } catch (err) {
        // setNotification("Error: Could not parse file.");
        setNotification({ type: "error", message: "Error: Could not parse file." });
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // Reset input
  };

  // Clear notification after 4 seconds
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Stats Data Logic
  const typeDistribution: { name: string; value: number }[] = [
    { name: 'PDF', value: resources.filter(r => r.type === ResourceType.PDF).length },
    { name: 'Video', value: resources.filter(r => r.type === ResourceType.VIDEO).length },
    { name: 'Link', value: resources.filter(r => r.type === ResourceType.LINK).length },
    { name: 'Doc', value: resources.filter(r => r.type === ResourceType.DOC).length },
    { name: 'Image', value: resources.filter(r => r.type === ResourceType.IMAGE).length },
    { name: 'Slides', value: resources.filter(r => r.type === ResourceType.PRESENTATION).length },
    { name: 'Code', value: resources.filter(r => r.type === ResourceType.CODE).length },
    { name: 'Sheet', value: resources.filter(r => r.type === ResourceType.SPREADSHEET).length },
  ].filter(d => d.value > 0);
  
  const COLORS: string[] = ['#0055A2', '#E5A823', '#10B981', '#6366F1', '#A855F7', '#F97316', '#64748B', '#059669'];

  const subjectDistribution: { name: string; value: number }[] = Object.entries(
    resources.reduce((acc, curr) => {
      const subj = curr.subject;
      acc[subj] = (acc[subj] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value: value as number })).sort((a, b) => b.value - a.value).slice(0, 5);

  // Top Performing Logic
  const topViewed = [...resources]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 5)
    .map(r => ({ name: r.title.length > 20 ? r.title.substring(0, 20) + '...' : r.title, views: r.views || 0 }));

  const topDownloaded = [...resources]
    .sort((a, b) => (b.downloads || 0) - (a.downloads || 0))
    .slice(0, 5)
    .map(r => ({ name: r.title.length > 20 ? r.title.substring(0, 20) + '...' : r.title, downloads: r.downloads || 0 }));


  // Helper for upload file accept string
  const getAcceptString = () => {
    switch(formData.type) {
      case ResourceType.PDF: return ".pdf";
      case ResourceType.IMAGE: return "image/*";
      case ResourceType.VIDEO: return "video/*";
      case ResourceType.DOC: return ".doc,.docx,.txt";
      case ResourceType.PRESENTATION: return ".ppt,.pptx,.key,.pdf";
      case ResourceType.SPREADSHEET: return ".xls,.xlsx,.csv";
      case ResourceType.CODE: return ".js,.py,.cpp,.java,.html,.css,.ts,.sql";
      default: return "*/*";
    }
  };

  const handleDeleteResource = async (id: string) => {
    const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

    try {
      const token = await getAccessToken();
      const res = await fetch(`${base}/api/resources/${id}`, { 
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` },
      });

      if (!res.ok) throw new Error(await res.text());

      onDelete(id); // update UI after backend succeeds
      // setNotification("Resource deleted.");
      setNotification({ type: "success", message: "Resource deleted." });
      if (isScreenReaderMode && onAnnounce) onAnnounce("Resource deleted.");
    } catch (e) {
      console.error(e);
      // setNotification("Failed to delete resource.");
      setNotification({ type: "error", message: "Failed to delete resource." });
      if (isScreenReaderMode && onAnnounce) onAnnounce("Failed to delete resource.");
    }
  };

  // const handleDelete = async (id: string) => {
  //   const base = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

  //   try {
  //     const res = await fetch(`${base}/api/resources/${id}`, { method: "DELETE" });
  //     if (!res.ok) throw new Error(await res.text());

  //     // Update UI state in parent (App.tsx)
  //     handleDeleteResource(resource.id);

  //     setNotification("Resource deleted.");
  //     if (isScreenReaderMode && onAnnounce) onAnnounce("Resource deleted.");
  //   } catch (e) {
  //     console.error(e);
  //     setNotification("Failed to delete resource.");
  //     if (isScreenReaderMode && onAnnounce) onAnnounce("Failed to delete resource.");
  //   }
  // };

  const getUploadHelperText = () => {
    switch(formData.type) {
       case ResourceType.PRESENTATION: return "PPTX, KEY, PDF";
       case ResourceType.SPREADSHEET: return "XLSX, CSV";
       case ResourceType.CODE: return "JS, PY, CPP, JAVA, etc.";
       case ResourceType.PDF: return "PDF";
       case ResourceType.IMAGE: return "JPG, PNG, GIF";
       case ResourceType.VIDEO: return "MP4, MOV";
       default: return "DOCX, TXT, RTF";
    }
  };

  // const base = import.meta.env.VITE_API_BASE_URL || "";

  // const res = await fetch(`${base}/api/resources`, {
  //   method: "POST",
  //   headers: { "Content-Type": "application/json" },
  //   body: JSON.stringify(newResource),
  // });

  // if (!res.ok) throw new Error("Failed to save resource");
  // const saved = await res.json();

  // // Then update local UI state with what Supabase returns
  // handleUpload(saved);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex flex-col font-sans transition-colors duration-300">
      
      {/* Toast Notification (Fixed Position) */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
          <div
            className={`bg-white dark:bg-gray-800 border-l-4 shadow-2xl rounded-lg p-4 flex items-start gap-4 max-w-md
              ${notification.type === "success" ? "border-green-500" : "border-red-500"}`}
          >
            <div
              className={`p-2 rounded-full shrink-0
                ${notification.type === "success"
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-red-100 dark:bg-red-900/30"}`}
            >
              <CheckCircle
                size={24}
                className={
                  notification.type === "success"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }
              />
            </div>

            <div className="flex-1 pt-1">
              <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                {notification.type === "success" ? "Success!" : "Error"}
              </h4>
              <p className="text-gray-600 dark:text-gray-300 text-sm mt-1 leading-snug">
                {notification.message}
              </p>
            </div>

            <button
              onClick={() => setNotification(null)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}
      
      {/* Admin Header */}
      <header className="bg-sjsu-blue dark:bg-gray-900 text-white shadow-lg z-10">
        <div className="w-full px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white/10 rounded-full transition-colors flex items-center gap-2 group"
            >
              <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-sm font-bold hidden sm:block">Back to Dashboard</span>
            </button>
            <div className="h-6 w-px bg-blue-400/30 mx-2"></div>
            <h1 className="font-serif font-bold text-xl flex items-center gap-2">
              <CheckCircle size={20} className="text-sjsu-gold" />
              Admin Console
            </h1>
          </div>
          <div className="text-xs font-mono text-blue-200 bg-blue-900/50 px-3 py-1 rounded-full border border-blue-500/30">
            SYSTEM_ACCESS_LEVEL_5
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 w-full p-6 lg:p-8 flex flex-col lg:flex-row gap-8">
        
        {/* Sidebar Navigation */}
        <aside className="w-full lg:w-64 flex flex-col gap-2 shrink-0">
          <button 
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'upload' 
                ? 'bg-white dark:bg-gray-800 text-sjsu-blue dark:text-sjsu-gold shadow-md border border-gray-100 dark:border-gray-700' 
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800/50'
            }`}
          >
            <Upload size={18} /> 
            {editingResourceId ? 'Edit Resource' : 'Upload Material'}
          </button>
          <button 
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'manage' 
                ? 'bg-white dark:bg-gray-800 text-sjsu-blue dark:text-sjsu-gold shadow-md border border-gray-100 dark:border-gray-700' 
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800/50'
            }`}
          >
            <List size={18} /> Manage Content
          </button>
          <button 
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'stats' 
                ? 'bg-white dark:bg-gray-800 text-sjsu-blue dark:text-sjsu-gold shadow-md border border-gray-100 dark:border-gray-700' 
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800/50'
            }`}
          >
            <LayoutDashboard size={18} /> System Statistics
          </button>
          <div className="h-px bg-gray-200 dark:bg-gray-800 my-2"></div>
           <button 
            onClick={() => setActiveTab('system')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-semibold ${
              activeTab === 'system' 
                ? 'bg-white dark:bg-gray-800 text-sjsu-blue dark:text-sjsu-gold shadow-md border border-gray-100 dark:border-gray-700' 
                : 'text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-800/50'
            }`}
          >
            <Database size={18} /> System & Data
          </button>
        </aside>

        {/* Content Area */}
        <div className="flex-1">
          
          {activeTab === 'upload' && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-serif font-bold text-gray-800 dark:text-gray-100">
                    {editingResourceId ? 'Edit Resource' : 'Upload Resource'}
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
                    {editingResourceId ? 'Modify details and connections.' : 'Add new materials to the university knowledge base.'}
                  </p>
                </div>
                
                {/* Online/Offline Toggle */}
                <div 
                  className="flex items-center gap-3 bg-white dark:bg-gray-800 p-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:border-sjsu-blue transition-colors group"
                  onClick={toggleStatus}
                >
                  <span className={`text-sm font-bold ${formData.status === 'online' ? 'text-green-600' : 'text-gray-400'}`}>
                    {formData.status === 'online' ? 'Online' : 'Offline'}
                  </span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors duration-200 ${formData.status === 'online' ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
                    <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-200 ${formData.status === 'online' ? 'translate-x-5' : 'translate-x-0'}`} />
                  </div>
                </div>
              </div>
              
              <form onSubmit={handleSubmit} className="p-6 lg:p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Title */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Resource Title</label>
                  <input 
                    required
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    type="text" 
                    placeholder="e.g., CS 146 Advanced Algorithms Syllabus"
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white"
                  />
                </div>

                {/* Description */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Description</label>
                  <textarea 
                    required
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={3}
                    placeholder="Brief summary of the content..."
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white resize-none"
                  />
                </div>

                {/* Subject */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Subject / Course Code</label>
                  <select 
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white appearance-none"
                  >
                    {SJSU_SUBJECTS.map(subj => (
                      <option key={subj} value={subj}>{subj}</option>
                    ))}
                  </select>
                </div>

                 {/* Department */}
                 <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Department</label>
                  <select 
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white appearance-none"
                  >
                    {SJSU_DEPARTMENTS.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                {/* Academic Level */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Academic Level</label>
                  <select 
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white appearance-none"
                  >
                    <option value="Undergraduate">Undergraduate</option>
                    <option value="Graduate">Graduate</option>
                    <option value="Faculty/Admin">Faculty/Admin</option>
                  </select>
                </div>

                {/* Resource Type */}
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Type</label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      ResourceType.PDF, ResourceType.DOC, ResourceType.PRESENTATION, ResourceType.SPREADSHEET,
                      ResourceType.VIDEO, ResourceType.IMAGE, ResourceType.CODE, ResourceType.LINK
                    ].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            type,

                            // avoid stale fields carrying between LINK vs non-LINK
                            url: type === ResourceType.LINK ? prev.url : "",
                            external_url: type === ResourceType.LINK ? "" : prev.external_url,
                          }));

                          setSelectedFile(null);
                        }}

                        className={`py-2 text-[10px] sm:text-xs font-bold rounded-lg border transition-all truncate px-1 ${
                          formData.type === type
                            ? 'bg-sjsu-blue text-white border-sjsu-blue'
                            : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tags */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <Tag size={16} /> Tags
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                      <input 
                        name="tags"
                        value={formData.tags}
                        onChange={handleInputChange}
                        type="text" 
                        placeholder="syllabus, exam-prep, 2025, fall (comma separated)"
                        className="w-full px-4 py-3 bg-white dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all"
                      />
                    </div>
                    <div className="relative min-w-[200px]">
                      <select
                        onChange={(e) => {
                          handleAddTag(e.target.value);
                          e.target.value = '';
                        }}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white appearance-none cursor-pointer"
                      >
                        <option value="">+ Add Existing Tag</option>
                        {uniqueTags.map(tag => (
                          <option key={tag} value={tag}>{tag}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 pl-1">Separate multiple tags with commas or select from list.</p>
                </div>
                
                {/* Related Content */}
                <div className="md:col-span-2 space-y-2 mt-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <LinkIcon size={16} /> Related Content
                  </label>

                  <p className="text-xs text-gray-400 pl-1">
                    Select resources to link as “Supporting Material & Related Content”.
                  </p>

                  <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 bg-gray-50 dark:bg-gray-800/30 max-h-72 overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {resources
                        .filter(r => r.id !== editingResourceId) // avoid self-link
                        .map(r => {
                          const checked = formData.relatedIds.includes(r.id);
                          return (
                            <label
                              key={r.id}
                              className={`flex items-start gap-2 p-2 rounded-xl cursor-pointer transition-colors
                                ${checked ? "bg-blue-50 dark:bg-blue-900/20" : "hover:bg-white dark:hover:bg-gray-800"}`}
                            >
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={checked}
                                onChange={() => handleRelatedToggle(r.id)}
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 truncate">
                                  {r.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {r.subject} • {r.type}
                                </div>
                              </div>
                            </label>
                          );
                        })}
                    </div>

                    {resources.length === 0 && (
                      <div className="text-sm text-gray-400 text-center py-6">
                        No resources available yet to link.
                      </div>
                    )}
                  </div>

                  {formData.relatedIds.length > 0 && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Selected: <span className="font-bold">{formData.relatedIds.length}</span>
                    </div>
                  )}
                </div>


                {/* File Upload OR URL Input */}
                <div className="md:col-span-2 mt-4 space-y-4">

                  {/* Primary URL field for LINK OR (VIDEO/DOC/SLIDES) */}
                  {showsPrimaryUrlField(formData.type) && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <LinkIcon size={16} /> {primaryUrlLabel(formData.type)}
                      </label>
                      <input
                        name="url"
                        value={formData.url}
                        onChange={handleInputChange}
                        type="url"
                        placeholder={primaryUrlPlaceholder(formData.type)}
                        required={formData.type === ResourceType.LINK}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white"
                      />

                      {formData.type !== ResourceType.LINK && (
                        <p className="text-xs text-gray-400 pl-1">
                          For {formData.type}, you can either upload a file below <strong>or</strong> paste a link here.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Upload area for types that support upload */}
                  {canUploadFile(formData.type) && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileChange}
                        accept={getAcceptString()}
                      />

                      <div
                        onClick={handleUploadClick}
                        className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer group relative
                          ${selectedFile
                            ? 'border-sjsu-blue bg-blue-50/50 dark:bg-blue-900/10'
                            : 'border-gray-300 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 hover:border-sjsu-blue dark:hover:border-sjsu-blue'
                          }`}
                      >
                        {selectedFile ? (
                          <div className="animate-in fade-in zoom-in-95">
                            <div className="p-4 bg-sjsu-blue text-white rounded-full mb-4 mx-auto w-16 h-16 flex items-center justify-center shadow-lg shadow-blue-900/20">
                              <FileText size={32} />
                            </div>
                            <p className="font-bold text-sjsu-blue dark:text-blue-400">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500 mt-1">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            <div className="absolute top-2 right-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-sm text-green-500">
                              <CheckCircle size={20} />
                            </div>
                          </div>
                        ) : (
                          <>
                            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                              <Upload size={32} className="text-sjsu-blue dark:text-blue-400" />
                            </div>
                            <p className="font-bold text-gray-700 dark:text-gray-300">
                              {editingResourceId ? 'Click to replace file (optional)' : 'Click to upload or drag and drop'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                              {getUploadHelperText()} (Max 50MB)
                            </p>
                          </>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Optional external link for any NON-LINK type */}
                {formData.type !== ResourceType.LINK && (
                  <div className="md:col-span-2 space-y-2 mt-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                      <LinkIcon size={16} /> Optional External Link (Google Drive, YouTube, etc.)
                    </label>
                    <input
                      name="external_url"
                      value={formData.external_url}
                      onChange={handleInputChange}
                      type="url"
                      placeholder="https://drive.google.com/... or https://youtu.be/..."
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-sjsu-blue focus:border-transparent outline-none transition-all dark:text-white"
                    />
                    <p className="text-xs text-gray-400 pl-1">
                      Optional: used as an “Open externally” button alongside the uploaded file.
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="md:col-span-2 flex justify-end gap-4 mt-4">
                  <button 
                    type="button" 
                    onClick={resetForm}
                    className="px-6 py-3 text-gray-600 dark:text-gray-400 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors flex items-center gap-2"
                  >
                    {editingResourceId ? (
                      <>
                        <RotateCcw size={16} /> Cancel Edit
                      </>
                    ) : (
                      'Reset'
                    )}
                  </button>
                  <button 
                    type="submit"
                    disabled={(() => {
                      const hasUrl = !!formData.url?.trim();

                      if (formData.type === ResourceType.LINK) {
                        return !hasUrl;
                      }

                      if (allowsUploadOrLink(formData.type)) {
                        // allow link-only OR upload
                        return !selectedFile && !hasUrl && !editingResourceId;
                      }

                      // upload-only types
                      return !selectedFile && !editingResourceId;
                    })()}

                    className={`px-8 py-3 font-bold rounded-xl shadow-lg transition-all flex items-center gap-2
                      ${(() => {
                        const hasUrl = !!formData.url?.trim();
                        if (formData.type === ResourceType.LINK) return !hasUrl;
                        if (allowsUploadOrLink(formData.type)) return !selectedFile && !hasUrl && !editingResourceId;
                        return !selectedFile && !editingResourceId;
                      })()
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed shadow-none'
                        : 'bg-sjsu-blue hover:bg-blue-800 text-white shadow-blue-900/20'
                      }`}
                  >
                    <Save size={18} />
                    {editingResourceId ? 'Update Resource' : 'Upload Resource'}
                  </button>
                </div>

              </form>
            </div>
          )}

          {activeTab === 'manage' && (
             <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100">Manage Content</h2>
                    <p className="text-sm text-gray-500">Edit or remove existing content and tags.</p>
                  </div>
                  
                  {/* View Toggle */}
                  <div className="flex bg-gray-200 dark:bg-gray-800 rounded-lg p-1">
                    <button
                      onClick={() => setManageView('resources')}
                      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                        manageView === 'resources' 
                          ? 'bg-white dark:bg-gray-700 text-sjsu-blue dark:text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Resources
                    </button>
                    <button
                      onClick={() => setManageView('tags')}
                      className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all ${
                        manageView === 'tags' 
                          ? 'bg-white dark:bg-gray-700 text-sjsu-blue dark:text-white shadow-sm' 
                          : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                      }`}
                    >
                      Tags
                    </button>
                  </div>
                </div>
                
                <div className="overflow-x-auto">
                  {manageView === 'resources' ? (
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Resource Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Date Added</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {resources.map((resource) => (
                          <tr key={resource.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              <div className="font-bold text-gray-800 dark:text-gray-200">{resource.title}</div>
                              <div className="text-xs text-gray-500">{resource.subject} • {resource.department}</div>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300">
                                {resource.type}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                              {resource.dateAdded}
                            </td>
                            <td className="px-6 py-4 text-right">
                               {deleteConfirmId === resource.id ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      // onClick={async () => {
                                      //   <button onClick={() => handleDeleteResource(resource.id)}>Delete</button>
                                      //   setDeleteConfirmId(null);
                                      //   if (isScreenReaderMode && onAnnounce) onAnnounce(`Deleted resource ${resource.title}.`);
                                      // }}
                                      onClick={async () => {
                                        await handleDeleteResource(resource.id);
                                        setDeleteConfirmId(null);
                                        if (isScreenReaderMode && onAnnounce) onAnnounce(`Deleted resource ${resource.title}.`);
                                      }}
                                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                      title="Confirm Delete"
                                    >
                                      <span className="text-xs font-bold px-1">Confirm</span>
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={18} />
                                    </button>
                                  </div>
                               ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handleEditClick(resource)}
                                      className="p-2 text-sjsu-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                      title="Edit Resource"
                                    >
                                      <Edit2 size={18} />
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirmId(resource.id)}
                                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      title="Delete Resource"
                                    >
                                      <Trash2 size={18} />
                                    </button>
                                  </div>
                               )}
                            </td>
                          </tr>
                        ))}
                        {resources.length === 0 && (
                          <tr>
                            <td colSpan={4} className="px-6 py-8 text-center text-gray-400">
                              No resources found. Use the Upload tab to add content.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                        <tr>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Tag Name</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Usage Count</th>
                          <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                        {uniqueTags.map((tag) => (
                          <tr key={tag} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                            <td className="px-6 py-4">
                              {editingTag?.original === tag ? (
                                <div className="flex items-center gap-2">
                                  <input 
                                    type="text" 
                                    value={editingTag.current}
                                    onChange={(e) => setEditingTag({ ...editingTag, current: e.target.value })}
                                    className="px-2 py-1 border rounded text-sm w-40 bg-white dark:bg-gray-700 dark:border-gray-600 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sjsu-blue"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleRenameTag();
                                      if (e.key === 'Escape') setEditingTag(null);
                                    }}
                                  />
                                  <button onClick={handleRenameTag} className="p-1 text-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 rounded">
                                    <Check size={16} />
                                  </button>
                                  <button onClick={() => setEditingTag(null)} className="p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
                                    <X size={16} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Tag size={14} className="text-gray-400" />
                                  <span className="font-bold text-gray-700 dark:text-gray-300">{tag}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-xs font-bold text-sjsu-blue dark:text-blue-400">
                                {tagCounts[tag]} resources
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                               {tagDeleteConfirm === tag ? (
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => handleDeleteTag(tag)}
                                      className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
                                      title="Confirm Delete Tag"
                                    >
                                      <span className="text-xs font-bold px-1">Confirm</span>
                                    </button>
                                    <button 
                                      onClick={() => setTagDeleteConfirm(null)}
                                      className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={18} />
                                    </button>
                                  </div>
                               ) : (
                                  <div className="flex items-center justify-end gap-2">
                                    <button 
                                      onClick={() => setEditingTag({ original: tag, current: tag })}
                                      className="p-2 text-sjsu-blue hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                                      title="Rename Tag"
                                      disabled={!!editingTag}
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button 
                                      onClick={() => setTagDeleteConfirm(tag)}
                                      className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                      title="Delete Tag"
                                      disabled={!!editingTag}
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </div>
                               )}
                            </td>
                          </tr>
                        ))}
                        {uniqueTags.length === 0 && (
                          <tr>
                            <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                              No tags found in the system.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  )}
                </div>
             </div>
          )}

          {activeTab === 'stats' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
              
              {/* Screen Reader Optimized Table View for Stats */}
              {isScreenReaderMode ? (
                <>
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="font-serif font-bold text-lg text-gray-800 dark:text-white mb-6">Resources by Type (Table View)</h3>
                    {resources.length === 0 ? (
                       <p className="text-gray-500">No data available to display.</p>
                    ) : (
                      <table className="w-full text-left">
                         <thead className="border-b dark:border-gray-700">
                           <tr>
                             <th className="py-2">Type</th>
                             <th className="py-2">Count</th>
                           </tr>
                         </thead>
                         <tbody>
                           {typeDistribution.map((item) => (
                             <tr key={item.name} className="border-b border-gray-100 dark:border-gray-800">
                               <td className="py-2 text-gray-700 dark:text-gray-300">{item.name}</td>
                               <td className="py-2 font-bold">{item.value}</td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                    )}
                  </div>
                </>
              ) : (
                <>
                  {/* Visual Chart 1: Distribution */}
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="font-serif font-bold text-lg text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                      <BarChart2 size={20} className="text-sjsu-gold" />
                      Resources by Type
                    </h3>
                    <div className="h-64 flex items-center justify-center">
                      {resources.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                data={typeDistribution}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {typeDistribution.map((entry, index: number) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip 
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-gray-400 dark:text-gray-600 flex flex-col items-center">
                           <BarChart2 size={40} className="mb-2 opacity-50" />
                           <span>No data available yet</span>
                        </div>
                      )}
                    </div>
                    {resources.length > 0 && (
                      <div className="flex justify-center gap-4 mt-4 flex-wrap">
                        {typeDistribution.map((entry, index: number) => (
                          <div key={entry.name} className="flex items-center gap-1.5">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">{entry.name} ({entry.value})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Visual Chart 2: Top Views */}
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="font-serif font-bold text-lg text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                      <Eye size={20} className="text-sjsu-blue dark:text-blue-400" />
                      Top 5 Viewed Resources
                    </h3>
                    <div className="h-64 flex items-center justify-center">
                      {resources.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topViewed} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                              <XAxis type="number" hide />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120} 
                                tick={{ fontSize: 11, fontWeight: 600, fill: '#6B7280' }} 
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              />
                              <Bar dataKey="views" fill="#0055A2" radius={[0, 4, 4, 0]} barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-gray-400 dark:text-gray-600 flex flex-col items-center">
                           <Eye size={40} className="mb-2 opacity-50" />
                           <span>No viewing history</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Visual Chart 3: Top Downloads */}
                  <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800">
                    <h3 className="font-serif font-bold text-lg text-gray-800 dark:text-white mb-6 flex items-center gap-2">
                      <Download size={20} className="text-green-500" />
                      Top 5 Downloaded Resources
                    </h3>
                    <div className="h-64 flex items-center justify-center">
                      {resources.length > 0 ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={topDownloaded} layout="vertical">
                              <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                              <XAxis type="number" hide />
                              <YAxis 
                                dataKey="name" 
                                type="category" 
                                width={120} 
                                tick={{ fontSize: 11, fontWeight: 600, fill: '#6B7280' }} 
                                axisLine={false}
                                tickLine={false}
                              />
                              <Tooltip 
                                cursor={{fill: 'transparent'}}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              />
                              <Bar dataKey="downloads" fill="#10B981" radius={[0, 4, 4, 0]} barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="text-gray-400 dark:text-gray-600 flex flex-col items-center">
                           <Download size={40} className="mb-2 opacity-50" />
                           <span>No downloads yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Stat Cards - Consolidated */}
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-6">
                 <div className="bg-gradient-to-br from-sjsu-blue to-blue-700 rounded-xl p-6 text-white shadow-lg">
                    <div className="text-blue-200 text-sm font-semibold mb-1">Total Assets</div>
                    <div className="text-4xl font-bold font-serif">{resources.length}</div>
                    <div className="text-xs text-blue-100 mt-2 opacity-80">
                      {resources.length === 0 ? "Upload resources to begin" : "+1 from last upload"}
                    </div>
                 </div>
                 <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-1">Highest Engagement</div>
                    <div className="text-lg font-bold font-serif text-gray-800 dark:text-white truncate">
                      {resources.length > 0 ? topViewed[0].name : "N/A"}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-sjsu-blue dark:text-blue-400 font-bold">
                       <Trophy size={14} className="text-sjsu-gold" />
                       Most Viewed Asset
                    </div>
                 </div>
                 <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="text-gray-500 dark:text-gray-400 text-sm font-semibold mb-1">System Status</div>
                    <div className="flex items-center gap-2 mt-1">
                       <span className="relative flex h-3 w-3">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                        </span>
                        <span className="font-bold text-green-600 dark:text-green-400">Online</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-2">Uptime: 99.9%</div>
                 </div>
              </div>

            </div>
          )}

          {activeTab === 'system' && (
             <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
               <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-gray-900">
                  <div>
                    <h2 className="text-xl font-serif font-bold text-gray-800 dark:text-gray-100">System & Data Management</h2>
                    <p className="text-sm text-gray-500">Backup, restore, and system maintenance.</p>
                  </div>
               </div>

               <div className="p-8 space-y-8">
                  
                  {/* Backup Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                       <div className="flex items-center gap-3 mb-4">
                         <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-sjsu-blue dark:text-blue-400">
                           <Download size={24} />
                         </div>
                         <h3 className="text-lg font-bold text-gray-800 dark:text-white">Backup Database</h3>
                       </div>
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                         Download a complete JSON export of the current knowledge base. This includes all resource metadata, tags, and stats.
                       </p>
                       <button 
                         onClick={handleExportData}
                         className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                       >
                         <Download size={18} /> Export JSON
                       </button>
                    </div>

                    <div className="p-6 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                       <div className="flex items-center gap-3 mb-4">
                         <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-green-600 dark:text-green-400">
                           <Upload size={24} />
                         </div>
                         <h3 className="text-lg font-bold text-gray-800 dark:text-white">Import Database</h3>
                       </div>
                       <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                         Restore the knowledge base from a previously exported JSON file. <strong className="text-red-500">Warning: This overwrites current data.</strong>
                       </p>
                       <input 
                          type="file" 
                          ref={importInputRef}
                          className="hidden" 
                          accept=".json"
                          onChange={handleImportData}
                       />
                       <button 
                         onClick={() => importInputRef.current?.click()}
                         className="w-full py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                       >
                         <Upload size={18} /> Select Backup File
                       </button>
                    </div>
                  </div>
               </div>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminConsole;