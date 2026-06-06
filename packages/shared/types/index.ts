// ─── User ────────────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// ─── Notes ───────────────────────────────────────────────────────────────────

export type NoteType = "typed" | "canvas";

export interface Note {
  id: string;
  userId: string;
  title: string;
  type: NoteType;
  content: string | null;       // JSON string for typed editor
  canvasData: string | null;    // tldraw snapshot JSON
  subjectId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NoteChunk {
  id: string;
  noteId: string;
  chunkIndex: number;
  content: string;
  tokenCount: number;
  metadata: ChunkMetadata;
}

// ─── Documents (PDFs) ────────────────────────────────────────────────────────

export type DocumentStatus = "pending" | "processing" | "ready" | "failed";

export interface Document {
  id: string;
  userId: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  pageCount: number | null;
  status: DocumentStatus;
  subjectId: string | null;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// ─── Assignments / PYQs ──────────────────────────────────────────────────────

export type AssignmentType = "assignment" | "pyq" | "practice";

export interface Assignment {
  id: string;
  userId: string;
  title: string;
  type: AssignmentType;
  documentId: string;
  subjectId: string | null;
  year: number | null;
  tags: string[];
  createdAt: string;
}

// ─── Subjects ────────────────────────────────────────────────────────────────

export interface Subject {
  id: string;
  userId: string;
  name: string;
  color: string;
  createdAt: string;
}

// ─── Chat / Tutor ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  citations: Citation[];
  createdAt: string;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  subjectId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Search ──────────────────────────────────────────────────────────────────

export type SearchScope = "all" | "notes" | "documents" | "assignments";

export interface SearchResult {
  id: string;
  sourceType: "note" | "document" | "assignment";
  sourceId: string;
  title: string;
  excerpt: string;
  score: number;
  citations: Citation[];
  metadata: ChunkMetadata;
}

// ─── RAG / Retrieval ─────────────────────────────────────────────────────────

export interface Citation {
  sourceId: string;
  sourceType: "note" | "document" | "assignment";
  title: string;
  excerpt: string;
  page: number | null;
  chunkIndex: number;
}

export interface ChunkMetadata {
  sourceId: string;
  sourceType: "note" | "document" | "assignment";
  subjectId: string | null;
  title: string;
  page: number | null;
  chunkIndex: number;
  tokenCount: number;
  tags: string[];
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface StudySession {
  id: string;
  userId: string;
  subjectId: string | null;
  durationMinutes: number;
  activityType: "notes" | "canvas" | "chat" | "search" | "review";
  createdAt: string;
}

export interface AnalyticsSummary {
  totalStudyMinutes: number;
  totalNotes: number;
  totalDocuments: number;
  totalChatMessages: number;
  subjectBreakdown: SubjectStat[];
  weeklyActivity: DailyActivity[];
}

export interface SubjectStat {
  subjectId: string;
  subjectName: string;
  studyMinutes: number;
  noteCount: number;
}

export interface DailyActivity {
  date: string;
  minutes: number;
}

// ─── Knowledge Graph ─────────────────────────────────────────────────────────

export interface GraphNode {
  id: string;
  label: string;
  type: "concept" | "note" | "document" | "subject";
  subjectId: string | null;
  weight: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number;
  relation: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── API Response Wrappers ───────────────────────────────────────────────────

export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}
