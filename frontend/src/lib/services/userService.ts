import axios, { AxiosError } from "axios";
import api from "@/lib/api";

interface IUserService {
  changePassword(currentPassword: string, newPassword: string): Promise<boolean>;
  updateUserInfo(username?: string, email?: string): Promise<boolean>;
  getAllUsers(): Promise<any[]>;
  updateUser(id: number, username?: string, email?: string, level?: string): Promise<boolean>;
  deleteUser(id: number): Promise<boolean>;
  getGroups(): Promise<any[]>;
  createGroup(name: string, description?: string, user_ids?: number[]): Promise<boolean>;
  updateGroup(id: number, name?: string, description?: string, user_ids?: number[]): Promise<boolean>;
  deleteGroup(id: number): Promise<boolean>;
}

export interface RegisterInput {
  username: string;
  email: string;
  password: string;
  role: string;
  level?: string;
}

class UserService implements IUserService {
  async createUser(registerInput: RegisterInput): Promise<boolean> {
    try {
      const response = await api.post(`/users/create`, registerInput);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to create user:", axiosError.response?.data || axiosError.message);
      return false;
    }
  }

  async getAllUsers(): Promise<any[]> {
    try {
      const response = await api.get("/users/get-all");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to fetch users:", axiosError.response?.data || axiosError.message);
      return [];
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<boolean> {
    if (currentPassword && newPassword) {
      try {
        const response = await api.put(`/users/change-password`, {
          current_password: currentPassword,
          new_password: newPassword,
        });
        if (response.data.access_token) {
          localStorage.setItem("token", response.data.access_token);
        }
        return response.status >= 200 && response.status < 300;
      } catch (error) {
        const axiosError = error as AxiosError;
        console.error("Failed to change password:", axiosError.response?.data || axiosError.message);
        return false;
      }
    }
  }

  async updateUserInfo(username?: string, email?: string): Promise<boolean> {
    try {
      const response = await api.put(`/users/update-account`, { username, email });
      if (response.data.access_token) {
        localStorage.setItem("token", response.data.access_token);
      }
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to update user info:", axiosError.response?.data || axiosError.message);
      return false;
    }
  }

  async updateUser(id: number, username?: string, email?: string, level?: string): Promise<boolean> {
    try {
      const response = await api.put(`/users/update`, { id, username, email, level });
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to update user info:", axiosError.response?.data || axiosError.message);
      return false;
    }
  }

  async deleteUser(id: number): Promise<boolean> {
    try {
      const response = await api.delete(`/users/delete/${id}`);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to delete user:", axiosError.response?.data || axiosError.message);
      return false;
    }
  }

  async getGroups(): Promise<any[]> {
    try {
      const response = await api.get("/admin/groups/");
      return response.data;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to fetch groups:", axiosError.response?.data || axiosError.message);
      return [];
    }
  }

  async createGroup(name: string, description?: string, user_ids?: number[]): Promise<boolean> {
    try {
      const response = await api.post(`/admin/groups/`, { name, description, user_ids });
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to create group:", axiosError.response?.data || axiosError.message);
      return false;
    }
  }

  async updateGroup(id: number, name?: string, description?: string, user_ids?: number[]): Promise<boolean> {
    try {
      const response = await api.put(`/admin/groups/${id}`, { name, description, user_ids });
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to update group:", axiosError.response?.data || axiosError.message);
      return false;
    }
  }

  async deleteGroup(id: number): Promise<boolean> {
    try {
      const response = await api.delete(`/admin/groups/${id}`);
      return response.status >= 200 && response.status < 300;
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error("Failed to delete group:", axiosError.response?.data || axiosError.message);
      return false;
    }
  }
}

const userService = new UserService();
export default userService;