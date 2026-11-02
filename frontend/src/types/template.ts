export type TemplateStatus = "Aktif" | "Nonaktif";

export interface ChecklistTask {
  id: string;
  text: string;
  requirePhoto: boolean;
  priority?: "High" | "Medium" | "Low";
  order?: number;
}

export interface TemplateCategoryGroup {
  id: string;
  name: string;
  tasks: ChecklistTask[];
  isExpanded?: boolean;
}

export interface ChecklistItem {
  id: string;
  question: string;
  category?: string;
  required?: boolean;
  requirePhoto?: boolean;
  priority?: "High" | "Medium" | "Low";
}

export interface TemplateItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  categories?: TemplateCategoryGroup[];
  lastRevision: string;
  archivedDate?: string;
  createdBy: string;
  creatorRole: string;
  status: TemplateStatus;
  itemsCount?: number;
  items?: ChecklistItem[];
  createdAt: string;
}

export interface TemplateStats {
  total: number;
  active: number;
  inactive: number;
  activePercentage: number;
}
