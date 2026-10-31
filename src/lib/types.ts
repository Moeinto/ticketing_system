import type { Role } from "@/lib/constants";

export type Me = {
  id: string;
  name: string;
  email: string;
  role: Role;
  teamId: string | null;
  teamName: string | null;
};

export type TicketListItem = {
  id: string;
  number: number;
  title: string;
  type: string;
  status: string;
  priority: string | null;
  impact: string;
  serviceName: string;
  requester: { id: string; name: string };
  assignee: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  commentCount: number;
  attachmentCount: number;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  closedAt: string | null;
};

export type TicketListResponse = {
  tickets: TicketListItem[];
  total: number;
  page: number;
  pageSize: number;
  openCount: number;
  newCount: number;
};

export type CommentItem = {
  id: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
  author: { id: string; name: string; role: string };
};

export type AttachmentItem = {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  createdAt: string;
  uploader: { id: string; name: string };
};

export type EventItem = {
  id: string;
  type: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  description: string | null;
  createdAt: string;
  actor: { id: string; name: string };
};

export type BugDetail = {
  environment: string;
  reproducible: boolean;
  steps: string | null;
  expected: string;
  actual: string;
  occurrenceTime: string | null;
  relatedRecord: string | null;
};

export type TicketDetailData = {
  id: string;
  number: number;
  title: string;
  description: string;
  type: string;
  impact: string;
  status: string;
  priority: string | null;
  reopenCount: number;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  updatedAt: string;
  service: { id: string; name: string };
  requester: { id: string; name: string; email: string };
  assignee: { id: string; name: string } | null;
  team: { id: string; name: string } | null;
  bugDetail: BugDetail | null;
  comments: CommentItem[];
  attachments: AttachmentItem[];
  assignments: {
    id: string;
    reason: string;
    createdAt: string;
    assignee: { id: string; name: string } | null;
    team: { id: string; name: string } | null;
    by: { id: string; name: string };
  }[];
  events: EventItem[];
};

export type TicketPermissions = {
  canManage: boolean;
  isRequester: boolean;
  showInternal: boolean;
};

export type Meta = {
  services: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  agents: { id: string; name: string; role: string; teamId: string | null; teamName: string | null }[];
};

export type ReportsData = {
  total: number;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
  byTeam: Record<string, number>;
  byAgent: Record<string, number>;
  openByPriority: Record<string, number>;
  unassignedOpen: number;
  avgFirstResponseMinutes: number | null;
  avgResolutionMinutes: number | null;
  reopenRate: number | null;
};

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  team?: { id: string; name: string } | null;
  createdAt: string;
};

export type View =
  | "dashboard"
  | "my-tickets"
  | "queue"
  | "new"
  | "ticket"
  | "reports"
  | "admin";
