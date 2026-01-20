import React, { useState, useEffect, useRef } from 'react';
import { X, Download, Share2, ExternalLink, FileText, Play, Image as ImageIcon, CheckCircle, Presentation, FileSpreadsheet, Code, Volume2, Link as LinkIcon, File, Eye, Quote, Copy } from 'lucide-react';
import { Resource, ResourceType } from '../types';

interface ResourceViewerModalProps {
  resource: Resource | null;
  onClose: () => void;
  onAnnounce?: (text: string) => void;
  isScreenReaderMode?: boolean;
  allResources?: Resource[];
  onNavigateResource?: (resource: Resource) => void;
  onDownload?: (id: string) => void;
}

const ResourceViewerModal: React.FC<ResourceViewerModalProps> = ({ 
  resource, 
  onClose, 
  onAnnounce, 
  isScreenReaderMode,
  allResources = [],
  onNavigateResource,
  onDownload
}) => {
  const [notification, setNotification] = useState<string | null>(null);
  const [showCitation, setShowCitation] = useState(false);
  const [citationFormat, setCitationFormat] = useState<'APA' | 'MLA' | 'Chicago' | 'IEEE'>('APA');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const [imgError, setImgError] = useState(false);
  const [pdfError, setPdfError] = useState(false);
  // Announce when modal opens and manage focus
  useEffect(() => {
    if (resource) {
      // Focus the close button for accessibility
      setTimeout(() => {
        closeButtonRef.current?.focus();
      }, 100);

      if (isScreenReaderMode && onAnnounce) {
        onAnnounce(`Opened details for ${resource.title}. ${resource.type}.`);
      }

      // Reset preview error flags for new resource
      setImgError(false);
      setPdfError(false);
    }
  }, [resource?.id]);

  if (!resource) return null;
  console.log("resource in modal:", resource);
  console.log("external_url:", resource.external_url);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

//   const guessFilenameFromUrl = (url: string) => {
//   try {
//     const u = new URL(url);
//     const last = u.pathname.split("/").pop();
//     return last && last.includes(".") ? last : null;
//   } catch {
//     return null;
//   }
// };

  const handleDownload = async () => {
    // increment download count in your app (this hits /api/resources/:id/download via App.tsx)
    if (onDownload) onDownload(resource.id);

    if (isScreenReaderMode && onAnnounce) {
      onAnnounce(`Starting download for ${resource.title}`);
    }

    // If no URL stored, nothing to download
    if (!resource.url) {
      showNotification("No file URL found for this resource.");
      return;
    }

    // If it's a LINK type, open it instead of downloading
    if (resource.type === ResourceType.LINK) {
      window.open(resource.url, "_blank", "noopener,noreferrer");
      showNotification("Opened link in a new tab.");
      return;
    }

    try {
      // Fetch the file and download it as a blob (most reliable)
      const resp = await fetch(resource.url);
      if (!resp.ok) throw new Error(`Download failed (${resp.status})`);

      const blob = await resp.blob();
      const objectUrl = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = objectUrl;

      // Best-effort filename
      // const fromUrl = guessFilenameFromUrl(resource.url);
      // const safeTitle = resource.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      // a.download = fromUrl ?? safeTitle;
      // Force the original filename if we have it
      const safeTitle = resource.title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      const preferred =
        (resource.original_filename && resource.original_filename.trim().length > 0)
          ? resource.original_filename.trim()
          : safeTitle;

      a.download = preferred;


      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      URL.revokeObjectURL(objectUrl);
      showNotification("Download started...");
    } catch (err) {
      // Fallback: open the public URL in a new tab (works even if CORS blocks fetch)
      console.error(err);
      window.open(resource.url, "_blank", "noopener,noreferrer");
      showNotification("Opened file in a new tab (download fallback).");
    }
  };

  const handleOpenExternal = () => {
    const url = resource.external_url?.trim();
    if (!url) {
      showNotification("No external link found for this resource.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
    showNotification("Opened external link in a new tab.");
    if (isScreenReaderMode && onAnnounce) onAnnounce("Opened external link.");
  };

  const handleShare = async () => {
    // Generate a mock direct link
    const shareUrl = `${window.location.origin}/resource/${resource.id}`;
    const shareData = {
      title: resource.title,
      text: `Check out this resource on SpartanHub: ${resource.title}`,
      url: shareUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        showNotification("Shared successfully!");
      } else {
        await navigator.clipboard.writeText(`${shareData.text} \n${shareData.url}`);
        showNotification("Link copied to clipboard!");
      }
    } catch (err) {
      console.log("Share cancelled or failed", err);
    }
  };

  const handleDescriptionClick = () => {
    if (onAnnounce) {
      onAnnounce(resource.description);
    } else if ('speechSynthesis' in window) {
      // Fallback if prop not provided (though App.tsx provides it)
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(resource.description);
      window.speechSynthesis.speak(utterance);
    }
  };

  // Generate Citation Text
  const getCitation = () => {
    const today = new Date();
    const dateAccessed = today.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
    const fullDateAccessed = today.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const url = resource.url || window.location.origin + `/resource/${resource.id}`;
    
    switch(citationFormat) {
      case 'APA':
        return `${resource.department}. (${new Date().getFullYear()}). ${resource.title} [${resource.type}]. San José State University Knowledge Base. ${url}`;
      case 'MLA':
        return `${resource.department}. "${resource.title}." San José State University Knowledge Base, ${resource.dateAdded}, ${url}. Accessed ${fullDateAccessed}.`;
      case 'Chicago':
        return `${resource.department}. "${resource.title}." San José State University Knowledge Base. Last modified ${resource.dateAdded}. ${url}.`;
      case 'IEEE':
        return `[1] ${resource.department}, "${resource.title}," San José State University Knowledge Base, ${new Date().getFullYear()}. [Online]. Available: ${url}. [Accessed: ${dateAccessed}].`;
      default:
        return '';
    }
  };

  const copyCitation = () => {
    navigator.clipboard.writeText(getCitation());
    showNotification("Citation copied to clipboard!");
    if (isScreenReaderMode && onAnnounce) onAnnounce("Citation copied to clipboard");
  };

  // Find related resources
  const relatedResources = allResources.filter(r => resource.relatedResourceIds?.includes(r.id));

  const getIconForType = (type: ResourceType) => {
    switch (type) {
      case ResourceType.VIDEO: return <Play size={16} className="text-blue-500" />;
      case ResourceType.PDF: return <FileText size={16} className="text-red-500" />;
      case ResourceType.LINK: return <LinkIcon size={16} className="text-green-500" />;
      case ResourceType.PRESENTATION: return <Presentation size={16} className="text-orange-500" />;
      default: return <File size={16} className="text-gray-500" />;
    }
  };

  const isProbablyOfficeDoc = (url: string) =>
    /\.(doc|docx|ppt|pptx|xls|xlsx)$/i.test(url.split("?")[0]);

  const isPdf = (url: string) =>
    /\.pdf$/i.test(url.split("?")[0]);

  const isImage = (url: string) =>
    /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(url.split("?")[0]);

  const isVideoFile = (url: string) =>
    /\.(mp4|webm|ogg|mov|m4v)$/i.test(url.split("?")[0]);

  const isYouTubeUrl = (url: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url);

  const isVimeoUrl = (url: string) =>
    /^(https?:\/\/)?(www\.)?vimeo\.com\//i.test(url);

  const getYouTubeEmbedUrl = (url: string) => {
    try {
      const u = new URL(url);
      // youtu.be/<id>
      if (u.hostname.includes("youtu.be")) {
        const id = u.pathname.replace("/", "");
        return id ? `https://www.youtube.com/embed/${id}` : null;
      }
      // youtube.com/watch?v=<id>
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      // youtube.com/embed/<id>
      if (u.pathname.includes("/embed/")) return url;
      return null;
    } catch {
      return null;
    }
  };

  const getVimeoEmbedUrl = (url: string) => {
    try {
      const u = new URL(url);
      // vimeo.com/<id>
      const parts = u.pathname.split("/").filter(Boolean);
      const id = parts[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    } catch {
      return null;
    }
  };

  // Office Online viewer works great for docx/pptx/xlsx *if the file URL is publicly accessible*
  const getOfficeViewerUrl = (fileUrl: string) =>
    `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(fileUrl)}`;

  // Basic Google embed conversions (work only if sharing/embedding allowed)
  const getGoogleDrivePreviewUrl = (url: string) => {
    try {
      const u = new URL(url);
      // drive.google.com/file/d/<id>/view
      if (u.hostname.includes("drive.google.com") && u.pathname.includes("/file/d/")) {
        const parts = u.pathname.split("/");
        const idx = parts.findIndex(p => p === "d");
        const id = idx >= 0 ? parts[idx + 1] : null;
        return id ? `https://drive.google.com/file/d/${id}/preview` : null;
      }
      // docs.google.com/document/d/<id>/edit
      if (u.hostname.includes("docs.google.com")) {
        // For docs/slides/sheets, /preview often works if allowed
        if (u.pathname.includes("/document/d/") || u.pathname.includes("/presentation/d/") || u.pathname.includes("/spreadsheets/d/")) {
          const parts = u.pathname.split("/");
          const dIndex = parts.findIndex(p => p === "d");
          const id = dIndex >= 0 ? parts[dIndex + 1] : null;
          if (!id) return null;

          if (u.pathname.includes("/document/d/")) return `https://docs.google.com/document/d/${id}/preview`;
          if (u.pathname.includes("/presentation/d/")) return `https://docs.google.com/presentation/d/${id}/preview`;
          if (u.pathname.includes("/spreadsheets/d/")) return `https://docs.google.com/spreadsheets/d/${id}/preview`;
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const getBestPreviewUrl = (resource: Resource) => {
    const primary = (resource.url || "").trim();
    const external = (resource.external_url || "").trim();

    // Decide which link is best for preview:
    // 1) Prefer url (Supabase public) for actual uploaded files
    // 2) For videos/docs/slides that are link-only, url may be external and is still fine
    const candidate = primary || external || "";

    if (!candidate) return { kind: "none" as const, url: "" };

    // YouTube/Vimeo
    if (isYouTubeUrl(candidate)) {
      const embed = getYouTubeEmbedUrl(candidate);
      if (embed) return { kind: "iframe" as const, url: embed };
    }
    if (isVimeoUrl(candidate)) {
      const embed = getVimeoEmbedUrl(candidate);
      if (embed) return { kind: "iframe" as const, url: embed };
    }

    // Google Drive/Docs/Slides preview
    const g = getGoogleDrivePreviewUrl(candidate);
    if (g) return { kind: "iframe" as const, url: g };

    // Uploaded office docs via Supabase public URL
    if (isProbablyOfficeDoc(candidate)) {
      return { kind: "iframe" as const, url: getOfficeViewerUrl(candidate) };
    }

    // PDF direct iframe
    if (isPdf(candidate)) {
      return { kind: "pdf" as const, url: candidate };
    }

    // Image direct
    if (isImage(candidate)) {
      return { kind: "image" as const, url: candidate };
    }

    // Video file direct
    if (isVideoFile(candidate)) {
      return { kind: "video" as const, url: candidate };
    }

    // Default: just link
    return { kind: "link" as const, url: candidate };
  };

  const renderContent = () => {
    switch (resource.type) {
      case ResourceType.VIDEO: {
        const preview = getBestPreviewUrl(resource);

        // MP4 direct
        if (preview.kind === "video") {
          return (
            <div className="bg-black rounded-lg overflow-hidden shadow-lg">
              <video controls className="w-full h-auto max-h-[70vh]">
                <source src={preview.url} />
                Your browser does not support video playback.
              </video>
            </div>
          );
        }

        // YouTube/Vimeo/Google embed
        if (preview.kind === "iframe") {
          return (
            <div className="bg-black rounded-lg aspect-video overflow-hidden shadow-lg border border-gray-200 dark:border-gray-800">
              <iframe
                title={resource.title}
                src={preview.url}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          );
        }

        // Fallback
        return (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 flex flex-col items-center justify-center text-center">
            <Play size={48} className="text-sjsu-blue dark:text-blue-400 mb-3" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Video Preview Not Available</h3>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Use <strong>Open Externally</strong> (if provided) or <strong>Download</strong>.
            </p>
          </div>
        );
      }

      case ResourceType.IMAGE: {
        const preview = getBestPreviewUrl(resource);
        const imgUrl = preview.kind === "image" ? preview.url : resource.url;

        return (
          <div className="bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-2 md:p-6 flex items-center justify-center min-h-[40vh]">
            {!imgUrl ? (
              <div className="text-center text-gray-500 dark:text-gray-400">No image URL found.</div>
            ) : imgError ? (
              <div className="text-center text-gray-500 dark:text-gray-400">Image preview failed. Try downloading instead.</div>
            ) : (
              <img
                src={imgUrl}
                alt={resource.title}
                className="max-h-[65vh] w-auto max-w-full rounded-lg shadow-md object-contain bg-white"
                onError={() => setImgError(true)}
              />
            )}
          </div>
        );
      }

      case ResourceType.LINK:
        return (
          <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-12 flex flex-col items-center justify-center text-center">
             <div className="bg-white dark:bg-gray-700 p-4 rounded-full shadow-sm mb-4">
               <ExternalLink size={48} className="text-sjsu-blue dark:text-blue-400" />
             </div>
             <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">External Resource</h3>
             <p className="text-gray-600 dark:text-gray-300 max-w-md mb-6">
               This resource is hosted on an external university server or website.
             </p>
             <a 
               href={resource.url || "#"} 
               target="_blank" 
               rel="noopener noreferrer"
               className="bg-sjsu-blue text-white px-6 py-2 rounded-full font-bold hover:bg-blue-800 transition-colors flex items-center gap-2 shadow-md"
             >
               Open Link <ExternalLink size={16} />
             </a>
          </div>
        );
      case ResourceType.CODE:
        return (
          <div className="bg-gray-900 rounded-lg p-6 min-h-[50vh] overflow-x-auto border border-gray-800 font-mono text-sm text-gray-300">
             <div className="flex gap-2 mb-4">
               <div className="w-3 h-3 rounded-full bg-red-500"></div>
               <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
               <div className="w-3 h-3 rounded-full bg-green-500"></div>
             </div>
             <pre>
{`// Sample Code Preview
import React from 'react';

function SpartanAlgorithm(data) {
  // Process university data
  const processed = data.map(item => ({
    id: item.id,
    value: item.score * 1.5
  }));

  return processed.filter(p => p.value > 50);
}

export default SpartanAlgorithm;`}
             </pre>
          </div>
        );
      case ResourceType.PRESENTATION: {
        const preview = getBestPreviewUrl(resource);

        if (preview.kind === "iframe") {
          return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden h-[65vh] shadow-sm">
              <iframe
                title={resource.title}
                src={preview.url}
                className="w-full h-full"
              />
            </div>
          );
        }

        return (
          <div className="bg-orange-50 dark:bg-gray-900 border border-orange-100 dark:border-gray-800 rounded-lg p-8 h-[50vh] flex flex-col items-center justify-center text-center">
            <Presentation size={64} className="text-orange-500 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Slide Preview Not Available</h3>
            <p className="text-gray-500">Use Open Externally (if available) or Download.</p>
          </div>
        );
      }

       case ResourceType.SPREADSHEET: {
        const preview = getBestPreviewUrl(resource);

        if (preview.kind === "iframe") {
          return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden h-[65vh] shadow-sm">
              <iframe
                title={resource.title}
                src={preview.url}
                className="w-full h-full"
              />
            </div>
          );
        }

        return (
          <div className="bg-emerald-50 dark:bg-gray-900 border border-emerald-100 dark:border-gray-800 rounded-lg p-8 h-[50vh] flex flex-col items-center justify-center text-center">
            <FileSpreadsheet size={64} className="text-emerald-500 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Spreadsheet Preview Not Available</h3>
            <p className="text-gray-500">Use Open Externally (if available) or Download.</p>
          </div>
        );
      }

      case ResourceType.PDF:
        return (
          <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-2 h-[65vh] overflow-hidden">
            {!resource.url ? (
              <div className="h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                No PDF URL found.
              </div>
            ) : pdfError ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 dark:text-gray-400 gap-3">
                <div>PDF preview failed.</div>
                <button
                  onClick={handleDownload}
                  className="px-4 py-2 bg-sjsu-gold text-sjsu-blue rounded-lg font-bold"
                >
                  Download instead
                </button>
              </div>
            ) : (
              <iframe
                title={resource.title}
                src={resource.url}
                className="w-full h-full rounded-lg"
                onError={() => setPdfError(true)}
              />
            )}
          </div>
        );

      case ResourceType.DOC: {
        const preview = getBestPreviewUrl(resource);

        if (preview.kind === "iframe") {
          return (
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden h-[65vh] shadow-sm">
              <iframe
                title={resource.title}
                src={preview.url}
                className="w-full h-full"
              />
            </div>
          );
        }

        return (
          <div className="bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-8 h-[50vh] flex flex-col items-center justify-center text-center">
            <FileText size={64} className="text-gray-400 mb-4" />
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Preview not available</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">Download to view this file.</p>
            <button
              onClick={handleDownload}
              className="px-4 py-2 bg-sjsu-gold text-sjsu-blue rounded-lg font-bold"
            >
              Download
            </button>
          </div>
        );
      }
            default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {notification && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4 fade-in duration-300">
          <div className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3 rounded-full shadow-xl flex items-center gap-3 font-semibold text-sm">
            <CheckCircle size={18} className="text-green-400 dark:text-green-600" />
            {notification}
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 w-full max-w-5xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden border border-gray-200 dark:border-gray-800">
        
        {/* Header */}
        <div className="bg-sjsu-blue text-white px-6 py-4 flex justify-between items-start shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-sjsu-gold text-sjsu-blue text-xs font-bold px-2 py-0.5 rounded uppercase">
                {resource.type}
              </span>
              <span className="text-blue-200 text-sm">{resource.department}</span>
            </div>
            <h2 className="text-xl md:text-2xl font-serif font-bold leading-tight pr-8">{resource.title}</h2>
            
            {/* Stats in Header */}
            <div className="flex items-center gap-4 mt-2 text-xs text-blue-200">
               <div className="flex items-center gap-1">
                 <Eye size={12} />
                 <span>{resource.views} views</span> {/* +1 to reflect current view */}
               </div>
               <div className="flex items-center gap-1">
                 <Download size={12} />
                 <span>{resource.downloads} downloads</span>
               </div>
            </div>
          </div>
          <button 
            ref={closeButtonRef}
            onClick={onClose} 
            className="text-white/80 hover:text-white hover:bg-white/10 p-2 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-white"
            aria-label="Close details"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50 dark:bg-gray-950 relative">
          
          {/* Citation Overlay */}
          {showCitation && (
             <div className="absolute top-4 left-4 right-4 z-20 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 animate-in slide-in-from-top-2">
                <div className="flex justify-between items-center mb-3">
                   <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                     <Quote size={16} className="text-sjsu-gold" /> Generate Citation
                   </h3>
                   <button onClick={() => setShowCitation(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                </div>
                
                <div className="flex gap-2 mb-3">
                  {['APA', 'MLA', 'Chicago', 'IEEE'].map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setCitationFormat(fmt as any)}
                      className={`px-3 py-1 rounded text-xs font-bold transition-colors ${citationFormat === fmt ? 'bg-sjsu-blue text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'}`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>

                <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border border-gray-200 dark:border-gray-700 mb-3">
                   <p className="font-mono text-xs text-gray-700 dark:text-gray-300 break-words leading-relaxed">
                     {getCitation()}
                   </p>
                </div>

                <button 
                  onClick={copyCitation}
                  className="w-full flex items-center justify-center gap-2 bg-gray-800 dark:bg-white text-white dark:text-gray-900 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity"
                >
                  <Copy size={14} /> Copy to Clipboard
                </button>
             </div>
          )}

          <div 
            onClick={handleDescriptionClick}
            className="group/desc relative cursor-pointer inline-block mb-6 rounded hover:bg-gray-100 dark:hover:bg-gray-900 transition-colors p-1 -ml-1 pr-8"
            title="Click to read description aloud"
            role="button"
          >
            <p className="text-gray-600 dark:text-gray-300 font-medium">{resource.description}</p>
            <Volume2 
              size={16} 
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sjsu-blue dark:text-blue-400 opacity-0 group-hover/desc:opacity-100 transition-opacity" 
            />
          </div>

          {renderContent()}

          {/* Related Content Section */}
          {relatedResources.length > 0 && (
            <div className="mt-8 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-4 shadow-sm">
              <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <LinkIcon size={16} className="text-sjsu-blue dark:text-sjsu-gold" /> 
                Supporting Material & Related Content
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {relatedResources.map(related => (
                  <button
                    key={related.id}
                    onClick={() => {
                      if (onNavigateResource) onNavigateResource(related);
                      if (isScreenReaderMode && onAnnounce) onAnnounce(`Navigating to related content: ${related.title}`);
                    }}
                    className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-sjsu-blue/30 dark:hover:border-blue-500/30 transition-all text-left group/related"
                  >
                    <div className="shrink-0 p-2 bg-white dark:bg-gray-600 rounded-lg text-gray-500 dark:text-gray-300 group-hover/related:text-sjsu-blue dark:group-hover/related:text-blue-400 transition-colors">
                      {getIconForType(related.type)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-gray-800 dark:text-gray-200 truncate group-hover/related:text-sjsu-blue dark:group-hover/related:text-blue-300 transition-colors">
                        {related.title}
                      </div>
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {related.type} • {related.subject}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-800 p-4 bg-white dark:bg-gray-900 flex flex-col sm:flex-row justify-between items-center shrink-0 gap-4">
          <div className="flex gap-2 flex-wrap justify-center sm:justify-start">
            {resource.tags.map(tag => (
              <span key={tag} className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">#{tag}</span>
            ))}
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
             <button 
               onClick={handleShare}
               className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-semibold text-sm border border-gray-200 dark:border-gray-700"
             >
               <Share2 size={18} />
               Share
             </button>
             <button 
               onClick={() => setShowCitation(!showCitation)}
               className={`flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 rounded-lg transition-colors font-semibold text-sm border border-gray-200 dark:border-gray-700 ${showCitation ? 'bg-blue-50 dark:bg-blue-900/30 text-sjsu-blue' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
             >
               <Quote size={18} />
               Cite
             </button>

             {/* THIS BLOCK is the “Open External” patch */}
              {resource.external_url && resource.external_url.trim() && (
                <button
                  onClick={handleOpenExternal}
                  className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors font-semibold text-sm border border-gray-200 dark:border-gray-700"
                >
                  <ExternalLink size={18} />
                  Open Externally
                </button>
              )}

             <button 
               onClick={handleDownload}
               className="flex-1 sm:flex-none justify-center items-center gap-2 px-4 py-2 bg-sjsu-gold text-sjsu-blue hover:bg-yellow-400 rounded-lg transition-colors font-bold text-sm shadow-sm"
             >
               <Download size={18} />
               Download
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResourceViewerModal;