import { PaginationParams } from './api';

export type DocumentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type DocumentType = 'OFFICIAL' | 'GUIDE' | 'FAQ' | 'REFERENCE' | 'INTERNAL' | 'PRICING' | 'SERVICE';
export type DocumentAudience = 'PUBLIC' | 'INTERNAL' | 'AGENT';

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  OFFICIAL: 'Chính thức',
  GUIDE: 'Hướng dẫn',
  FAQ: 'FAQ',
  REFERENCE: 'Tham khảo',
  INTERNAL: 'Nội bộ',
  PRICING: 'Bảng giá',
  SERVICE: 'Dịch vụ',
};

export const DOCUMENT_AUDIENCE_LABELS: Record<DocumentAudience, string> = {
  PUBLIC: 'Công khai',
  INTERNAL: 'Nội bộ',
  AGENT: 'Agent/Support',
};

export interface Document {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: DocumentStatus;
  type: DocumentType;
  audience: DocumentAudience;
  priority: number;
  publishedAt?: string;
  authorId: string;
  categoryId?: string;
  currentVersion: number;
  wordCount: number;
  createdAt: string;
  updatedAt: string;
  author?: { id: string; displayName: string };
  category?: { id: string; name: string };
  tags?: { id: string; name: string; color?: string }[];
}

export interface CreateDocumentRequest {
  title: string;
  content: string;
  categoryId?: string;
  tagIds?: string[];
  excerpt?: string;
  type?: DocumentType;
  audience?: DocumentAudience;
  priority?: number;
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  categoryId?: string;
  tagIds?: string[];
  excerpt?: string;
  changeNote?: string;
  type?: DocumentType;
  audience?: DocumentAudience;
  priority?: number;
}

export interface DocumentQuery extends PaginationParams {
  status?: DocumentStatus;
  categoryId?: string;
  tagId?: string;
  search?: string;
  type?: DocumentType;
  audience?: DocumentAudience;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  version: number;
  title: string;
  content: string;
  changeNote?: string;
  createdById: string;
  createdAt: string;
}
