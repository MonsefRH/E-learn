import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Trash2, Edit2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { User, Session, Course, Group } from "@/models";
import sessionService from "@/lib/services/sessionService";
import formationService from "@/lib/services/formationService";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import SessionDialog from "@/components/dialogs/SessionDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SessionManagementProps {}

const SessionManagement = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newSession, setNewSession] = useState({
    course_id: "",
    teacher_id: "",
    group_ids: [] as string[],
    start_date: "",
    status: "PENDING" as "PENDING" | "VALIDATED" | "AVAILABLE",
  });
  const [editSession, setEditSession] = useState<Session | null>(null);
  const [dialogOpen, setDialogOpen] = useState({ addSession: false, editSession: false });
  const [filter, setFilter] = useState({
    sortBy: "teacher" as "teacher" | "course" | "group" | "status" | "start_date",
    statusFilter: "all" as "all" | "PENDING" | "VALIDATED" | "AVAILABLE",
    sortDirection: "asc" as "asc" | "desc",
  });

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersData, groupsData, sessionsData, coursesData] = await Promise.all([
        sessionService.getUsers(),
        sessionService.getGroups(),
        sessionService.getSessions(),
        formationService.getCourses(),
      ]);
      setUsers(usersData);
      setGroups(groupsData);
      setSessions(sessionsData);
      setCourses(coursesData);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      const errorMessage =
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
            axiosError.message ||
            "Failed to fetch data from the backend";
      console.error("refreshData error:", axiosError, axiosError.response?.data);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;

    if (!user || user.role !== "manager") {
      setError("Access denied: Manager role required");
      setLoading(false);
      navigate("/");
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      setError("Please log in to access session management");
      setLoading(false);
      navigate("/");
      return;
    }
    refreshData();
  }, [user, authLoading, logout, navigate, refreshData]);

  const handleCreateSession = async () => {
    if (!newSession.course_id || !newSession.teacher_id || !newSession.group_ids.length || !newSession.start_date) {
      setError("Course, teacher, group, and start date are required");
      return;
    }
    try {
      setLoading(true);
      const groupIds = Array.isArray(newSession.group_ids) ? newSession.group_ids.map(id => Number(id)) : [Number(newSession.group_ids)];
      await sessionService.createSession({
        course_id: Number(newSession.course_id),
        teacher_id: Number(newSession.teacher_id),
        group_ids: groupIds,
        start_date: new Date(newSession.start_date).toISOString().split("T")[0],
        status: "PENDING",
      });
      setNewSession({
        course_id: "",
        teacher_id: "",
        group_ids: [],
        start_date: "",
        status: "PENDING",
      });
      setDialogOpen({ ...dialogOpen, addSession: false });
      await refreshData();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      console.error("handleCreateSession error:", axiosError, axiosError.response?.data);
      setError(
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
            axiosError.message ||
            "Failed to create session"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSession = async () => {
    if (!editSession || !editSession.course_id || !editSession.teacher_id || !editSession.group_ids.length || !editSession.start_date) {
      setError("Course, teacher, group, and start date are required");
      return;
    }
    try {
      setLoading(true);
      const groupIds = Array.isArray(editSession.group_ids) ? editSession.group_ids.map(id => Number(id)) : [Number(editSession.group_ids)];
      await sessionService.updateSession(editSession.id, {
        course_id: Number(editSession.course_id),
        teacher_id: Number(editSession.teacher_id),
        group_ids: groupIds,
        start_date: new Date(editSession.start_date).toISOString().split("T")[0],
        status: editSession.status,
      });
      setEditSession(null);
      setDialogOpen({ ...dialogOpen, editSession: false });
      await refreshData();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      console.error("handleUpdateSession error:", axiosError, axiosError.response?.data);
      setError(
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
            axiosError.message ||
            "Failed to update session"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: number) => {
    try {
      setLoading(true);
      await sessionService.deleteSession(sessionId);
      await refreshData();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      console.error("handleDeleteSession error:", axiosError, axiosError.response?.data);
      setError(
        axiosError.response?.data?.detail ||
          axiosError.message ||
          "Failed to delete session"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (column: "teacher" | "course" | "group" | "start_date" | "status") => {
    setFilter((prev) => ({
      ...prev,
      sortBy: column,
      sortDirection: prev.sortBy === column && prev.sortDirection === "asc" ? "desc" : "asc",
    }));
  };

  const filteredSessions = [...sessions].filter(session => {
    if (filter.statusFilter === "PENDING") return session.status === "PENDING";
    if (filter.statusFilter === "VALIDATED") return session.status === "VALIDATED";
    if (filter.statusFilter === "AVAILABLE") return session.status === "AVAILABLE";
    return true;
  }).sort((a, b) => {
    const teacherA = users.find(u => u.id === a.teacher_id)?.username || "";
    const teacherB = users.find(u => u.id === b.teacher_id)?.username || "";
    const courseA = courses.find(c => c.id === a.course_id)?.title || "";
    const courseB = courses.find(c => c.id === b.course_id)?.title || "";
    const groupA = a.group_ids.map(id => groups.find(g => g.id === Number(id))?.name).join(", ") || "";
    const groupB = b.group_ids.map(id => groups.find(g => g.id === Number(id))?.name).join(", ") || "";
    const startDateA = new Date(a.start_date).getTime();
    const startDateB = new Date(b.start_date).getTime();

    let comparison = 0;
    switch (filter.sortBy) {
      case "teacher":
        comparison = teacherA.localeCompare(teacherB);
        break;
      case "course":
        comparison = courseA.localeCompare(courseB);
        break;
      case "group":
        comparison = groupA.localeCompare(groupB);
        break;
      case "start_date":
        comparison = startDateA - startDateB;
        break;
      case "status":
        comparison = (a.status === b.status ? 0 : a.status === "PENDING" ? -1 : b.status === "PENDING" ? 1 : a.status === "VALIDATED" ? -1 : 1);
        break;
      default:
        comparison = 0;
    }

    return filter.sortDirection === "asc" ? comparison : -comparison;
  });

  return (
    <DashboardLayout
      title="Session Management"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Sessions", href: "/admin/sessions" }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Session Management</CardTitle>
            <CardDescription>Manage sessions with designated teachers and groups</CardDescription>
            <div className="flex space-x-2">
              <Button onClick={() => setDialogOpen({ ...dialogOpen, addSession: true })}>
                <Plus className="mr-2 h-4 w-4" /> Start Session
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading && (
              <div className="flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            )}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!loading && !error && (
              <div className="space-y-4">
                <div className="flex space-x-4 mb-4">
                  <Select
                    onValueChange={(value) => setFilter({ ...filter, sortBy: value as "teacher" | "course" | "group" | "status" | "start_date" })}
                    value={filter.sortBy}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="teacher">Teacher</SelectItem>
                      <SelectItem value="course">Course</SelectItem>
                      <SelectItem value="group">Group</SelectItem>
                      <SelectItem value="start_date">Start Date</SelectItem>
                      <SelectItem value="status">Status</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    onValueChange={(value) => setFilter({ ...filter, statusFilter: value as "all" | "PENDING" | "VALIDATED" | "AVAILABLE" })}
                    value={filter.statusFilter}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="VALIDATED">Validated</SelectItem>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead onClick={() => handleSort("teacher")}>
                          Teacher {filter.sortBy === "teacher" && (filter.sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead onClick={() => handleSort("course")}>
                          Course {filter.sortBy === "course" && (filter.sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead onClick={() => handleSort("group")}>
                          Group {filter.sortBy === "group" && (filter.sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead onClick={() => handleSort("start_date")}>
                          Start Date {filter.sortBy === "start_date" && (filter.sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead onClick={() => handleSort("status")}>
                          Status {filter.sortBy === "status" && (filter.sortDirection === "asc" ? "↑" : "↓")}
                        </TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredSessions.map((session) => (
                        <TableRow key={session.id}>
                          <TableCell>{users.find(u => u.id === session.teacher_id)?.username || "Unknown Teacher"}</TableCell>
                          <TableCell>{courses.find(c => c.id === session.course_id)?.title || "Unknown Course"}</TableCell>
                          <TableCell>{session.group_ids.map(id => groups.find(g => g.id === Number(id))?.name).join(", ") || "None"}</TableCell>
                          <TableCell>{new Date(session.start_date).toLocaleDateString()}</TableCell>
                          <TableCell>{session.status}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditSession(session);
                                  setDialogOpen({ ...dialogOpen, editSession: true });
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={() => handleDeleteSession(session.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        <SessionDialog
          open={dialogOpen.addSession}
          onOpenChange={(open) => {
            setDialogOpen({ ...dialogOpen, addSession: open });
            if (!open) setNewSession({ course_id: "", teacher_id: "", group_ids: [], start_date: "", status: "PENDING" });
          }}
          isAddMode={true}
          session={newSession}
          setSession={setNewSession}
          courses={courses}
          users={users}
          groups={groups}
          onSave={handleCreateSession}
          loading={loading}
          error={error}
          setError={setError}
        />
        <SessionDialog
          open={dialogOpen.editSession && !!editSession}
          onOpenChange={(open) => {
            setDialogOpen({ ...dialogOpen, editSession: open });
            if (!open) setEditSession(null);
          }}
          isAddMode={false}
          session={editSession}
          setSession={setEditSession}
          courses={courses}
          users={users}
          groups={groups}
          onSave={handleUpdateSession}
          loading={loading}
          error={error}
          setError={setError}
        />
      </div>
    </DashboardLayout>
  );
};

export default SessionManagement;