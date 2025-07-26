import { Session, Group } from "@/models";
import axios, { AxiosError } from "axios";
import api from "@/lib/api";

const sessionService = {
  getUsers: async (): Promise<any[]> => {
    try {
      const response = await api.get(`/users/get-all`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch users");
    }
  },

  getGroups: async (): Promise<Group[]> => {
    try {
      const response = await api.get(`/admin/groups/`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch groups");
    }
  },

  getSessions: async (): Promise<Session[]> => {
    try {
      const response = await api.get(`/admin/sessions/`);
      return response.data;
    } catch (error) {
      throw new Error("Failed to fetch sessions");
    }
  },
  createSession: async (session: {
    course_id: number;
    teacher_id: number;
    group_ids: number[];
    start_date: string;
    status: "PENDING" | "VALIDATED" | "AVAILABLE";
  }): Promise<Session> => {
    try {
      const response = await api.post(`/admin/sessions/`, session);
      return response.data;
    } catch (error) {
      throw new Error("Failed to create session");
    }
  },
  updateSession: async (
    id: number,
    session: {
      course_id?: number;
      teacher_id?: number;
      group_ids?: number[];
      start_date?: string;
      status?: "PENDING" | "VALIDATED" | "AVAILABLE";
      level?: string;
      topic?: string;
      axes?: string[];
      content_generated?: boolean;
    }
  ): Promise<Session> => {
    try {
      const response = await api.put(`/admin/sessions/${id}`, session);
      return response.data;
    } catch (error) {
      throw new Error("Failed to update session");
    }
  },
  deleteSession: async (id: number): Promise<void> => {
    try {
      await api.delete(`/admin/sessions/${id}`);
    } catch (error) {
      throw new Error("Failed to delete session");
    }
  },
};

export default sessionService;