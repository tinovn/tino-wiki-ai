import { PaginationParams } from './api';

export type DocumentStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';

export interface Document {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt?: string;
  status: DocumentStatus;
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
}

export interface UpdateDocumentRequest {
  title?: string;
  content?: string;
  categoryId?: string;
  tagIds?: string[];
  excerpt?: string;
  changeNote?: string;
}

export interface DocumentQuery extends PaginationParams {
  status?: DocumentStatus;
  categoryId?: string;
  tagId?: string;
  search?: string;
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
