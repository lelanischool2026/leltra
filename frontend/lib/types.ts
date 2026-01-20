export type UserRole = "teacher" | "headteacher" | "director" | "admin";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface Class {
  id: string;
  grade: string;
  stream: string;
  active: boolean;
  created_at: string;
}

export interface TeacherClass {
  id: string;
  teacher_id: string;
  class_id: string;
  created_at: string;
}

export interface DailyReport {
  id: string;
  report_date: string;
  class_id: string;
  teacher_id: string;
  total_learners: number;
  present_learners: number;
  absentees: string | null;
  health_incident: boolean;
  health_details: string | null;
  feeding_status: string | null;
  lessons_covered: boolean;
  literacy_topic: string | null;
  discipline_issue: boolean;
  discipline_details: string | null;
  parent_communication: boolean;
  parent_details: string | null;
  challenges: string | null;
  created_at: string;
}

export interface HeadComment {
  id: string;
  report_id: string;
  headteacher_id: string;
  comment: string;
  created_at: string;
}
