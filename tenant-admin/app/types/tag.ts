export interface Tag {
  id: string;
  name: string;
  slug: string;
  color?: string;
  _count?: { documents: number };
  createdAt: string;
}

export interface CreateTagRequest {
  name: string;
  color?: string;
}
