
import React from 'react';
import { Resource, ResourceType } from '../types';
import { FileText, PlayCircle, Link as LinkIcon, File, GraduationCap, Image as ImageIcon, Check, Presentation, FileSpreadsheet, Code, Eye, Download, ExternalLink } from 'lucide-react';

interface ResourceCardProps {
  resource: Resource;
  onClick: (resource: Resource) => void;
  onTagClick: (tag: string) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  isScreenReaderMode?: boolean;
  onAnnounce?: (text: string) => void;
  searchTerm?: string;
}

const HighlightedText = ({ text, term }: { text: string, term?: string }) => {
  if (!term || !term.trim()) return <>{text}</>;

  // Split text by the search term (case-insensitive)
  const parts = text.split(new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));

  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === term.toLowerCase() ? (
          <span key={i} className="bg-yellow-200 dark:bg-yellow-500/30 text-gray-900 dark:text-yellow-100 rounded-[2px] px-0.5 box-decoration-clone font-semibold">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};

const ResourceCard: React.FC<ResourceCardProps> = ({ resource, onClick, onTagClick, isSelected, onToggleSelect, isScreenReaderMode, onAnnounce, searchTerm }) => {
  const getIcon = () => {
    switch (resource.type) {
      case ResourceType.PDF: return <FileText size={32} className="text-red-500 dark:text-red-400" />;
      case ResourceType.VIDEO: return <PlayCircle size={32} className="text-sjsu-blue dark:text-blue-400" />;
      case ResourceType.LINK: return <LinkIcon size={32} className="text-green-600 dark:text-green-400" />;
      case ResourceType.DOC: return <FileText size={32} className="text-blue-500 dark:text-blue-400" />;
      case ResourceType.IMAGE: return <ImageIcon size={32} className="text-purple-500 dark:text-purple-400" />;
      case ResourceType.PRESENTATION: return <Presentation size={32} className="text-orange-500 dark:text-orange-400" />;
      case ResourceType.SPREADSHEET: return <FileSpreadsheet size={32} className="text-emerald-600 dark:text-emerald-400" />;
      case ResourceType.CODE: return <Code size={32} className="text-slate-600 dark:text-slate-300" />;
      default: return <File size={32} className="text-gray-500 dark:text-gray-400" />;
    }
  };

  const getBgColor = () => {
    switch (resource.type) {
      case ResourceType.PDF: return 'bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30';
      case ResourceType.VIDEO: return 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30';
      case ResourceType.LINK: return 'bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/30';
      case ResourceType.DOC: return 'bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/30';
      case ResourceType.IMAGE: return 'bg-purple-50 hover:bg-purple-100 dark:bg-purple-900/20 dark:hover:bg-purple-900/30';
      case ResourceType.PRESENTATION: return 'bg-orange-50 hover:bg-orange-100 dark:bg-orange-900/20 dark:hover:bg-orange-900/30';
      case ResourceType.SPREADSHEET: return 'bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/30';
      case ResourceType.CODE: return 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700';
      default: return 'bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700';
    }
  };

  const handleTagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation(); // Prevent the card click event from firing
    onTagClick(tag);
  };

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSelect();
  };

  const handleClick = (e: React.MouseEvent | React.KeyboardEvent) => {
    if (isScreenReaderMode && onAnnounce) {
      onAnnounce(`Selected ${resource.title}. Type: ${resource.type}. Department: ${resource.department}. Opening details.`);
    }
    onClick(resource);
  };

  const formatCount = (num: number) => {
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return num.toString();
  };

  return (
    <div
      role="article"
      aria-label={`Resource: ${resource.title}, Type: ${resource.type}`}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick(e);
        }
      }}
      tabIndex={0}
      className={`group bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-all duration-200 border overflow-hidden flex flex-col h-full cursor-pointer relative focus:outline-none focus:ring-4 focus:ring-sjsu-blue/50
        ${isSelected
          ? 'border-sjsu-blue ring-1 ring-sjsu-blue dark:border-blue-500 dark:ring-blue-500'
          : 'border-gray-100 dark:border-gray-700'
        }`}
      onFocus={() => {
        if (isScreenReaderMode && onAnnounce) {
          onAnnounce(`${resource.title}, ${resource.type}`);
        }
      }}
    >
      {/* Top Left Checkbox Selection */}
      <div
        role="checkbox"
        aria-checked={isSelected}
        aria-label={`Select ${resource.title}`}
        onClick={handleToggle}
        className="absolute top-3 left-3 z-10 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer group/checkbox focus:outline-none focus:ring-2 focus:ring-sjsu-blue"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            onToggleSelect();
          }
        }}
      >
        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all duration-200 
          ${isSelected
            ? 'bg-sjsu-blue border-sjsu-blue text-white shadow-sm scale-110'
            : 'bg-white/80 dark:bg-gray-700 dark:border-gray-500 border-gray-300 text-transparent group-hover/checkbox:border-sjsu-blue dark:group-hover/checkbox:border-blue-400'
          }`}
        >
          <Check size={12} strokeWidth={4} />
        </div>
      </div>

      <div className={`h-24 ${getBgColor()} flex items-center justify-center transition-colors relative`}>
        {getIcon()}
        <span className="absolute top-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-gray-500 dark:text-gray-400 shadow-sm border border-gray-100 dark:border-gray-700">
          {resource.subject}
        </span>
        {resource.external_url && resource.type !== ResourceType.LINK && (
          <span className="absolute bottom-3 right-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold text-sjsu-blue dark:text-blue-300 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-1">
            <ExternalLink size={12} />
            External
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-sjsu-gray dark:text-gray-400 uppercase tracking-wider">{resource.type}</span>
          <span className="text-xs text-gray-400 dark:text-gray-500">{resource.dateAdded}</span>
        </div>

        {/* Level Badge */}
        <div className="flex items-center gap-1 mb-2">
          <GraduationCap size={12} className="text-sjsu-gold" />
          <span className="text-[10px] font-semibold text-sjsu-blue dark:text-blue-300 uppercase tracking-wide">
            {resource.level}
          </span>
        </div>

        <h3 className="font-serif font-bold text-lg text-gray-800 dark:text-gray-100 leading-snug mb-2 group-hover:text-sjsu-blue dark:group-hover:text-blue-400 transition-colors">
          <HighlightedText text={resource.title} term={searchTerm} />
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-4 flex-1">
          <HighlightedText text={resource.description} term={searchTerm} />
        </p>

        {/* Views & Downloads Footer */}
        <div className="flex items-center gap-4 mb-3 text-xs text-gray-400 dark:text-gray-500">
          <div className="flex items-center gap-1" title={`${resource.views} Views`}>
            <Eye size={12} />
            <span>{formatCount(resource.views)}</span>
          </div>
          <div className="flex items-center gap-1" title={`${resource.downloads} Downloads`}>
            <Download size={12} />
            <span>{formatCount(resource.downloads)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-auto pt-2 border-t border-gray-100 dark:border-gray-700">
          {resource.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              role="button"
              aria-label={`Filter by tag ${tag}`}
              onClick={(e) => handleTagClick(e, tag)}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTagClick(e as any, tag);
              }}
              className="px-2 py-1 bg-gray-100 dark:bg-gray-700 hover:bg-sjsu-blue hover:text-white dark:hover:bg-sjsu-blue dark:hover:text-white transition-colors text-gray-600 dark:text-gray-300 text-xs rounded-full border border-gray-200 dark:border-gray-600 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sjsu-blue"
            >
              #{tag}
            </span>
          ))}
          {resource.tags.length > 3 && (
            <span className="text-xs text-gray-400 px-1 py-1">+{resource.tags.length - 3}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResourceCard;
