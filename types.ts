
export enum ResourceType {
  PDF = 'PDF',
  VIDEO = 'VIDEO',
  LINK = 'LINK',
  DOC = 'DOC',
  IMAGE = 'IMAGE',
  PRESENTATION = 'PRESENTATION',
  SPREADSHEET = 'SPREADSHEET',
  CODE = 'CODE',
  ARTICLE = 'ARTICLE'
}

export type AcademicLevel = 'Undergraduate' | 'Graduate' | 'Faculty/Admin';

export type UserRole = 'admin' | 'faculty' | 'student' | 'guest';

export interface Resource {
  id: string;
  title: string;
  description: string;
  type: ResourceType;
  department: string;
  subject: string;
  level: AcademicLevel;
  dateAdded: string;
  url?: string;
  external_url?: string | null;
  tags: string[];
  status: 'online' | 'offline';
  relatedResourceIds?: string[]; // IDs of supporting material
  views: number;
  downloads: number;
  original_filename?: string | null;
  source?: string | null;       // e.g. "Stanford University" — absent means SJSU
  sourceUrl?: string | null;    // Link to the institution's AI use case page
}

export interface StatData {
  name: string;
  value: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface UploadFormData {
  title: string;
  description: string;
  type: ResourceType;
  tags: string;
  file: File | null;
}
