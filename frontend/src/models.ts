interface User {
  id: number;
  name: string;
  email: string;
  role: "manager" | "trainer" | "learner";
  created_at: string;
}

interface Lesson {
  id: number;
  title: string;
  description: string;
  course_id: number;
}

interface Course {
  id: number;
  title: string;
  description: string;
  category_id: number;
  is_active: boolean;
  deadline?: string;
  lessons: Lesson[];
}

interface Category {
  id: number;
  name: string;
  description: string;
  created_at: string;
  parent_id?: number;
  subcategories: Category[];
  courses: Course[];
}

interface Group {
  id: number;
  name: string;
  description?: string;
  user_ids: number[];
  created_at: string;
}

interface Session {
  id: number;
  course_id: number;
  teacher_id: number;
  group_ids: number[];
  start_time: string;
  is_active: boolean;
}

export type { User, Category, Course, Lesson, Group, Session };