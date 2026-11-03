/**
 * Frontend domain types.
 *
 * Naming convention (CQ-016):
 * - All MongoDB document IDs use `_id: string` (canonical MongoDB field name).
 * - `id` aliases are removed to eliminate the dual id/_id confusion.
 * - The API consistently returns `_id` from the server.
 */

export type Role = 'Student' | 'Faculty' | 'Admin';

export interface User {
  _id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  phoneNumber?: string;
  completionPercentage?: number;
  // Student-specific
  rollNo?: string;
  batch?: string;
  semester?: string;
  section?: string;
  // Faculty/Admin-specific
  department?: string;
  employeeId?: string;
  designation?: string;
  officeLocation?: string;
}

export interface Class {
  _id: string;
  subjectName?: string;
  subjectCode?: string;
  name?: string;
  code?: string;
  facultyId: string | User;
  studentCount?: number;
  department: string;
  semester: string;
  section?: string;
  academicYear: string;
  joinCode: string;
  isActive: boolean;
  avatarUrl?: string;
  maxMarks?: {
    internal: number;
    midSem: number;
    endSem: number;
    lab: number;
  };
}

export interface StudyMaterial {
  _id: string;
  classId: string | Class;
  title: string;
  description?: string;
  gDriveUrl: string;
  gDriveFileId?: string;
  fileSize: string;
  fileType: 'PDF' | 'DOC' | 'PPT' | 'ZIP' | 'Code';
  tags: string[];
  facultyId?: string | User;
  createdAt: string;
}

export interface Assignment {
  _id: string;
  classId: string | Class;
  facultyId?: string | User;
  title: string;
  description: string;
  instructions?: string;
  submissionType: 'Online' | 'Offline' | 'PDF';
  dueDate: string;
  totalMarks?: number;
  maxMarks?: number;
  iconName?: string;
  iconColor?: string;
  createdAt?: string;
}

export interface Submission {
  _id: string;
  assignmentId: string;
  studentId: string | User;
  gDriveUrl?: string;
  submittedAt: string;
  status: 'Pending' | 'Submitted' | 'Evaluated' | 'Late';
  marksObtained?: number;
  feedback?: string;
  evaluatedAt?: string;
}

export interface Quiz {
  _id: string;
  classId: string | Class;
  facultyId?: string | User;
  title: string;
  subject?: string;
  instructions?: string;
  status: 'Draft' | 'Scheduled' | 'Active' | 'Closed';
  startTime: string;
  endTime: string;
  durationMinutes: number;
  totalMarks: number;
  shuffleQuestions?: boolean;
  shuffleOptions?: boolean;
  iconName?: string;
  iconColor?: string;
}

export interface QuizQuestion {
  _id: string;
  quizId: string;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
  marks: number;
}

export interface QuizAttempt {
  _id: string;
  quizId: string | Quiz;
  studentId: string | User;
  status: 'In-Progress' | 'Completed' | 'Unattempted';
  startedAt?: string;
  completedAt?: string;
  answers: Record<string, number>; // questionId → selected option index
  score?: number;
  totalPossibleMarks?: number;
}

export interface MarkRecord {
  _id: string;
  studentId: string;
  classId: string;
  type: 'Internal' | 'Mid-Sem' | 'End-Sem' | 'Lab';
  marksObtained?: number;
  maxMarks: number;
  status: 'Entered' | 'Pending';
  updatedAt?: string;
}

export interface PublishedResult {
  _id: string;
  classId: string | Class;
  semester: string;
  publishedAt: string;
  publishedBy: string | User;
  isPublished?: boolean;
  isMidSemPublished?: boolean;
  isEndSemPublished?: boolean;
}

export interface Notice {
  _id: string;
  classId?: string | Class;
  title: string;
  content: string;
  facultyId?: string | User;
  createdAt: string;
  isGlobal?: boolean;
}

export interface PYQ {
  _id: string;
  department: string;
  semester: string;
  subjectName: string;
  subjectCode: string;
  academicYear: string;
  examType: 'Mid Semester' | 'End Semester' | 'Internal' | 'Other';
  facultyId?: string | User;
  description?: string;
  gDriveUrl: string;
  fileType: 'PDF' | 'DOC' | 'ZIP' | 'Other';
  createdAt: string;
}

export interface SupportTicket {
  _id: string;
  userId: string | User;
  category: string;
  description: string;
  status: 'pending' | 'in-progress' | 'resolved';
  createdAt: string;
  updatedAt: string;
}
