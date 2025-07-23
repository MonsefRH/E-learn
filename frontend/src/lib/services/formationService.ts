import { Category, Course, Lesson } from "@/models.ts";
import axios, { AxiosError } from "axios";
import api from "@/lib/api";

const formationService = {
  // Categories
  getCategories: async (): Promise<Category[]> => {
    try {
      const response = await api.get(`/admin/categories/`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch categories");
    }
  },
  createCategory: async (category: { name: string; description: string; parent_id?: number }): Promise<Category> => {
    try {
      const response = await api.post(`/admin/categories/`, category);
      return response.data;
    } catch (error) {
      throw new Error("Failed to create category");
    }
  },
  updateCategory: async (id: number, category: { name?: string; description?: string; parent_id?: number }): Promise<Category> => {
    try {
      const response = await api.put(`/admin/categories/${id}`, category);
      return response.data;
    } catch (error) {
      throw new Error("Failed to update category");
    }
  },
  deleteCategory: async (id: number): Promise<void> => {
    try {
      await api.delete(`/admin/categories/${id}`);
    } catch (error) {
      throw new Error("Failed to delete category");
    }
  },

  // Courses
  getCourses: async (): Promise<Course[]> => {
    try {
      const response = await api.get(`/admin/courses/`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch courses");
    }
  },
  createCourse: async (course: {
    title: string;
    description: string;
    category_id: number;
    deadline?: string;
    is_active: boolean;
  }): Promise<Course> => {
    try {
      const response = await api.post(`/admin/courses/`, course);
      return response.data;
    } catch (error) {
      throw new Error("Failed to create course");
    }
  },
  updateCourse: async (
    id: number,
    course: {
      title?: string;
      description?: string;
      category_id?: number;
      deadline?: string;
      is_active?: boolean;
    }
  ): Promise<Course> => {
    try {
      const response = await api.put(`/admin/courses/${id}`, course);
      return response.data;
    } catch (error) {
      throw new Error("Failed to update course");
    }
  },
  deleteCourse: async (id: number): Promise<void> => {
    try {
      await api.delete(`/admin/courses/${id}`);
    } catch (error) {
      throw new Error("Failed to delete course");
    }
  },

  // Lessons
  getLessons: async (): Promise<Lesson[]> => {
    try {
      const response = await api.get(`/admin/lessons/`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch lessons");
    }
  },
  createLesson: async (lesson: { title: string; description: string; course_id: number }): Promise<Lesson> => {
    try {
      const response = await api.post(`/admin/lessons/`, lesson);
      return response.data;
    } catch (error) {
      throw new Error("Failed to create lesson");
    }
  },
  updateLesson: async (id: number, lesson: { title?: string; description?: string; course_id?: number }): Promise<Lesson> => {
    try {
      const response = await api.put(`/admin/lessons/${id}`, lesson);
      return response.data;
    } catch (error) {
      throw new Error("Failed to update lesson");
    }
  },
  deleteLesson: async (id: number): Promise<void> => {
    try {
      await api.delete(`/admin/lessons/${id}`);
    } catch (error) {
      throw new Error("Failed to delete lesson");
    }
  },
};

export default formationService;