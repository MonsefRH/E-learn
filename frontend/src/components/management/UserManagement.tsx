import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Search, UserPlus, Filter, MoreHorizontal, Check, X, Plus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import userService from "@/lib/services/userService";

interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  level?: string;
  lastLogin?: string;
  created_at: string;
}

interface Group {
  id: number;
  name: string;
  description?: string;
  created_at: string;
  user_ids: number[] | null;
}

const EditableCell = ({ value, isEditing, onChange, onSave, onCancel }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  if (isEditing) {
    return (
      <div className="flex items-center">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-8 py-1"
        />
        <Button variant="ghost" size="sm" onClick={onSave} className="ml-1 h-8 w-8 p-0">
          <Check className="h-4 w-4 text-green-600" />
        </Button>
        <Button variant="ghost" size="sm" onClick={onCancel} className="h-8 w-8 p-0">
          <X className="h-4 w-4 text-red-600" />
        </Button>
      </div>
    );
  }

  return (
    <span className="cursor-pointer hover:text-blue-600" onClick={onSave}>
      {value}
    </span>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [filteredGroups, setFilteredGroups] = useState<Group[]>([]);
  const [displayedUsers, setDisplayedUsers] = useState<User[]>([]);
  const [displayedGroups, setDisplayedGroups] = useState<Group[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentTab, setCurrentTab] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const [isAddGroupDialogOpen, setIsAddGroupDialogOpen] = useState(false);
  const [isEditGroupDialogOpen, setIsEditGroupDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [groupPage, setGroupPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [groupTotalPages, setGroupTotalPages] = useState(1);
  const usersPerPage = 10;
  const groupsPerPage = 10;

  const [editingState, setEditingState] = useState<{
    id: number | null;
    field: string | null;
    value: string;
    isUser: boolean;
  }>({
    id: null,
    field: null,
    value: "",
    isUser: true,
  });

  const [newUser, setNewUser] = useState({
    username: "",
    email: "",
    password: "",
    role: "learner",
    level: "beginner",
  });

  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    user_ids: [] as number[],
  });

  const [editGroup, setEditGroup] = useState({
    id: null as number | null,
    name: "",
    description: "",
    user_ids: [] as number[],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [fetchedUsers, fetchedGroups] = await Promise.all([
          userService.getAllUsers(),
          userService.getGroups(),
        ]);
        const normalizedGroups = fetchedGroups.map((group) => ({
          ...group,
          user_ids: group.user_ids || [],
        }));
        setUsers(fetchedUsers);
        setGroups(normalizedGroups);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    let resultUsers = [...users];
    let resultGroups = [...groups];

    if (currentTab === "all" || currentTab === "groups") {
    } else {
      resultUsers = resultUsers.filter((user) => user.role === currentTab);
    }

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      resultUsers = resultUsers.filter(
        (user) =>
          user.username.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term)
      );
      resultGroups = resultGroups.filter(
        (group) =>
          group.name.toLowerCase().includes(term) ||
          (group.description && group.description.toLowerCase().includes(term))
      );
    }

    if (sortBy === "newest") {
      resultUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      resultGroups.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortBy === "oldest") {
      resultUsers.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      resultGroups.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortBy === "az") {
      resultUsers.sort((a, b) => a.username.localeCompare(b.username));
      resultGroups.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sortBy === "za") {
      resultUsers.sort((a, b) => b.username.localeCompare(a.username));
      resultGroups.sort((a, b) => b.name.localeCompare(a.name));
    }

    setFilteredUsers(resultUsers);
    setFilteredGroups(resultGroups);
    setTotalPages(Math.ceil(resultUsers.length / usersPerPage));
    setGroupTotalPages(Math.ceil(resultGroups.length / groupsPerPage));
    setCurrentPage(1);
    setGroupPage(1);
  }, [currentTab, searchTerm, users, groups, sortBy]);

  useEffect(() => {
    const indexOfLastUser = currentPage * usersPerPage;
    const indexOfFirstUser = indexOfLastUser - usersPerPage;
    setDisplayedUsers(filteredUsers.slice(indexOfFirstUser, indexOfLastUser));

    const indexOfLastGroup = groupPage * groupsPerPage;
    const indexOfFirstGroup = indexOfLastGroup - groupsPerPage;
    setDisplayedGroups(filteredGroups.slice(indexOfFirstGroup, indexOfLastGroup));
  }, [filteredUsers, filteredGroups, currentPage, groupPage]);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await userService.createUser(newUser);
      const updatedUsers = await userService.getAllUsers();
      setUsers(updatedUsers);
      setIsAddUserDialogOpen(false);
      setNewUser({
        username: "",
        email: "",
        password: "",
        role: "learner",
        level: "beginner",
      });
    } catch (error) {
      console.error("Failed to create user:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      await userService.createGroup(newGroup.name, newGroup.description, newGroup.user_ids);
      const updatedGroups = await userService.getGroups();
      const normalizedGroups = updatedGroups.map((group) => ({
        ...group,
        user_ids: group.user_ids || [],
      }));
      setGroups(normalizedGroups);
      setIsAddGroupDialogOpen(false);
      setNewGroup({
        name: "",
        description: "",
        user_ids: [],
      });
    } catch (error) {
      console.error("Failed to create group:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editGroup.id) {
      try {
        setIsLoading(true);
        await userService.updateGroup(editGroup.id, editGroup.name, editGroup.description, editGroup.user_ids);
        const updatedGroups = await userService.getGroups();
        const normalizedGroups = updatedGroups.map((group) => ({
          ...group,
          user_ids: group.user_ids || [],
        }));
        setGroups(normalizedGroups);
        setIsEditGroupDialogOpen(false);
        setEditGroup({
          id: null,
          name: "",
          description: "",
          user_ids: [],
        });
      } catch (error) {
        console.error("Failed to update group:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        setIsLoading(true);
        await userService.deleteUser(userId);
        const updatedUsers = await userService.getAllUsers();
        setUsers(updatedUsers);
      } catch (error) {
        console.error("Failed to delete user:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (window.confirm("Are you sure you want to delete this group?")) {
      try {
        setIsLoading(true);
        await userService.deleteGroup(groupId);
        const updatedGroups = await userService.getGroups();
        const normalizedGroups = updatedGroups.map((group) => ({
          ...group,
          user_ids: group.user_ids || [],
        }));
        setGroups(normalizedGroups);
      } catch (error) {
        console.error("Failed to delete group:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const startEditing = (id: number, field: string, value: string, isUser: boolean) => {
    setEditingState({
      id,
      field,
      value,
      isUser,
    });
  };

  const cancelEditing = () => {
    setEditingState({
      id: null,
      field: null,
      value: "",
      isUser: true,
    });
  };

  const saveEditing = async (id: number, field: string, originalValue: string, isUser: boolean) => {
    if (editingState.id === id && editingState.field === field) {
      try {
        setIsLoading(true);
        if (isUser) {
          await userService.updateUser(
            id,
            field === "username" ? editingState.value : undefined,
            field === "email" ? editingState.value : undefined,
            field === "level" ? editingState.value : undefined
          );
          setUsers((prevUsers) =>
            prevUsers.map((user) =>
              user.id === id ? { ...user, [field]: editingState.value } : user
            )
          );
        } else {
          await userService.updateGroup(
            id,
            field === "name" ? editingState.value : undefined,
            field === "description" ? editingState.value : undefined
          );
          setGroups((prevGroups) =>
            prevGroups.map((group) =>
              group.id === id ? { ...group, [field]: editingState.value } : group
            )
          );
        }
        cancelEditing();
      } catch (error) {
        console.error(`Failed to update ${isUser ? "user" : "group"} ${field}:`, error);
        const fetchedData = isUser ? await userService.getAllUsers() : await userService.getGroups();
        const normalizedData = !isUser ? fetchedData.map((group) => ({
          ...group,
          user_ids: group.user_ids || [],
        })) : fetchedData;
        if (isUser) setUsers(normalizedData);
        else setGroups(normalizedData);
      } finally {
        setIsLoading(false);
      }
    } else {
      startEditing(id, field, originalValue, isUser);
    }
  };

  return (
    <DashboardLayout
      title="User Management"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "User Management" }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Manage all system users and groups</CardDescription>
              </div>
              <div>
                <Button onClick={() => setIsAddUserDialogOpen(true)} className="mr-2">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
                <Button onClick={() => setIsAddGroupDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Group
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0 mb-6">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search users or groups..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  <Filter className="h-3.5 w-3.5 mr-1" />
                  Filter
                </Button>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">Newest First</SelectItem>
                    <SelectItem value="oldest">Oldest First</SelectItem>
                    <SelectItem value="az">A-Z</SelectItem>
                    <SelectItem value="za">Z-A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Tabs value={currentTab} onValueChange={setCurrentTab} className="space-y-4">
              <TabsList className="grid grid-cols-5 mb-4">
                <TabsTrigger value="all">All Users</TabsTrigger>
                <TabsTrigger value="manager">Managers</TabsTrigger>
                <TabsTrigger value="trainer">Trainers</TabsTrigger>
                <TabsTrigger value="learner">Learners</TabsTrigger>
                <TabsTrigger value="groups">Groups</TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading users...</p>
                  </div>
                ) : filteredUsers.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="py-3 px-4 text-left font-medium">Username</th>
                          <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Email</th>
                          <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Role</th>
                          <th className="py-3 px-4 text-left font-medium hidden lg:table-cell">Created</th>
                          <th className="py-3 px-4 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {displayedUsers.map((user) => (
                          <tr key={user.id} className="bg-white hover:bg-muted/30">
                            <td className="py-3 px-4 font-medium">
                              <EditableCell
                                value={
                                  editingState.id === user.id && editingState.field === "username" && editingState.isUser
                                    ? editingState.value
                                    : user.username
                                }
                                isEditing={editingState.id === user.id && editingState.field === "username" && editingState.isUser}
                                onChange={(value) => setEditingState({ ...editingState, value })}
                                onSave={() => saveEditing(user.id, "username", user.username, true)}
                                onCancel={cancelEditing}
                              />
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <EditableCell
                                value={
                                  editingState.id === user.id && editingState.field === "email" && editingState.isUser
                                    ? editingState.value
                                    : user.email
                                }
                                isEditing={editingState.id === user.id && editingState.field === "email" && editingState.isUser}
                                onChange={(value) => setEditingState({ ...editingState, value })}
                                onSave={() => saveEditing(user.id, "email", user.email, true)}
                                onCancel={cancelEditing}
                              />
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <Badge
                                variant="outline"
                                className={
                                  user.role === "manager"
                                    ? "bg-purple-50 text-purple-700 border-purple-200"
                                    : user.role === "trainer"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-green-50 text-green-700 border-green-200"
                                }
                              >
                                {user.role}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                              {new Date(user.created_at).toLocaleString("fr-FR")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteUser(user.id)}
                                  >
                                    Delete user
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">No users found</p>
                    {searchTerm && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your search or filters
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {displayedUsers.length} of {filteredUsers.length} users
                    {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages || totalPages === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="groups" className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading groups...</p>
                  </div>
                ) : filteredGroups.length > 0 ? (
                  <div className="rounded-md border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="py-3 px-4 text-left font-medium">Name</th>
                          <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Description</th>
                          <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Members</th>
                          <th className="py-3 px-4 text-left font-medium hidden lg:table-cell">Created</th>
                          <th className="py-3 px-4 text-right font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {displayedGroups.map((group) => (
                          <tr key={group.id} className="bg-white hover:bg-muted/30">
                            <td className="py-3 px-4 font-medium">
                              <EditableCell
                                value={
                                  editingState.id === group.id && editingState.field === "name" && !editingState.isUser
                                    ? editingState.value
                                    : group.name
                                }
                                isEditing={editingState.id === group.id && editingState.field === "name" && !editingState.isUser}
                                onChange={(value) => setEditingState({ ...editingState, value })}
                                onSave={() => saveEditing(group.id, "name", group.name, false)}
                                onCancel={cancelEditing}
                              />
                            </td>
                            <td className="py-3 px-4 hidden md:table-cell">
                              <EditableCell
                                value={
                                  editingState.id === group.id && editingState.field === "description" && !editingState.isUser
                                    ? editingState.value
                                    : group.description || ""
                                }
                                isEditing={editingState.id === group.id && editingState.field === "description" && !editingState.isUser}
                                onChange={(value) => setEditingState({ ...editingState, value })}
                                onSave={() => saveEditing(group.id, "description", group.description || "", false)}
                                onCancel={cancelEditing}
                              />
                            </td>
                            <td
                              className="py-3 px-4 hidden md:table-cell cursor-pointer relative"
                              onMouseEnter={(e) => {
                                const usernames = group.user_ids
                                  ?.map((id) => users.find((u) => u.id === id)?.username)
                                  .filter((u): u is string => u !== undefined)
                                  .join(", ") || "No members";
                                e.currentTarget.title = usernames;
                              }}
                              onClick={(e) => {
                                const usernames = group.user_ids
                                  ?.map((id) => users.find((u) => u.id === id)?.username)
                                  .filter((u): u is string => u !== undefined)
                                  .join(", ") || "No members";
                                alert(usernames);
                              }}
                            >
                              {(group.user_ids || []).length}
                            </td>
                            <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                              {new Date(group.created_at).toLocaleString("fr-FR")}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      const groupToEdit = groups.find((g) => g.id === group.id);
                                      if (groupToEdit) {
                                        setEditGroup({
                                          id: groupToEdit.id,
                                          name: groupToEdit.name,
                                          description: groupToEdit.description || "",
                                          user_ids: groupToEdit.user_ids || [],
                                        });
                                        setIsEditGroupDialogOpen(true);
                                      }
                                    }}
                                  >
                                    Edit group
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={() => handleDeleteGroup(group.id)}
                                  >
                                    Delete group
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg">
                    <p className="text-muted-foreground">No groups found</p>
                    {searchTerm && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Try adjusting your search or filters
                      </p>
                    )}
                  </div>
                )}
                <div className="flex justify-between items-center mt-4">
                  <p className="text-sm text-muted-foreground">
                    Showing {displayedGroups.length} of {filteredGroups.length} groups
                    {groupTotalPages > 1 && ` (Page ${groupPage} of ${groupTotalPages})`}
                  </p>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGroupPage((prev) => Math.max(prev - 1, 1))}
                      disabled={groupPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setGroupPage((prev) => Math.min(prev + 1, groupTotalPages))}
                      disabled={groupPage === groupTotalPages || groupTotalPages === 0}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {["manager", "trainer", "learner"].map((role) => (
                <TabsContent key={role} value={role} className="space-y-4">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">Loading {role}s...</p>
                    </div>
                  ) : filteredUsers.length > 0 ? (
                    <div className="rounded-md border overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-muted/50">
                            <th className="py-3 px-4 text-left font-medium">Username</th>
                            <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Email</th>
                            <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Role</th>
                            {role === "learner" && (
                              <th className="py-3 px-4 text-left font-medium hidden md:table-cell">Level</th>
                            )}
                            <th className="py-3 px-4 text-left font-medium hidden lg:table-cell">Created</th>
                            <th className="py-3 px-4 text-right font-medium">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {displayedUsers.map((user) => (
                            <tr key={user.id} className="bg-white hover:bg-muted/30">
                              <td className="py-3 px-4 font-medium">
                                <EditableCell
                                  value={
                                    editingState.id === user.id && editingState.field === "username" && editingState.isUser
                                      ? editingState.value
                                      : user.username
                                  }
                                  isEditing={editingState.id === user.id && editingState.field === "username" && editingState.isUser}
                                  onChange={(value) => setEditingState({ ...editingState, value })}
                                  onSave={() => saveEditing(user.id, "username", user.username, true)}
                                  onCancel={cancelEditing}
                                />
                              </td>
                              <td className="py-3 px-4 hidden md:table-cell">
                                <EditableCell
                                  value={
                                    editingState.id === user.id && editingState.field === "email" && editingState.isUser
                                      ? editingState.value
                                      : user.email
                                  }
                                  isEditing={editingState.id === user.id && editingState.field === "email" && editingState.isUser}
                                  onChange={(value) => setEditingState({ ...editingState, value })}
                                  onSave={() => saveEditing(user.id, "email", user.email, true)}
                                  onCancel={cancelEditing}
                                />
                              </td>
                              <td className="py-3 px-4 hidden md:table-cell">
                                <Badge
                                  variant="outline"
                                  className={
                                    user.role === "manager"
                                      ? "bg-purple-50 text-purple-700 border-purple-200"
                                      : user.role === "trainer"
                                      ? "bg-blue-50 text-blue-700 border-blue-200"
                                      : "bg-green-50 text-green-700 border-green-200"
                                  }
                                >
                                  {user.role}
                                </Badge>
                              </td>
                              {role === "learner" && (
                                <td className="py-3 px-4 hidden md:table-cell">
                                  <EditableCell
                                    value={
                                      editingState.id === user.id && editingState.field === "level" && editingState.isUser
                                        ? editingState.value
                                        : user.level || "beginner"
                                    }
                                    isEditing={editingState.id === user.id && editingState.field === "level" && editingState.isUser}
                                    onChange={(value) => setEditingState({ ...editingState, value })}
                                    onSave={() => saveEditing(user.id, "level", user.level || "beginner", true)}
                                    onCancel={cancelEditing}
                                  />
                                </td>
                              )}
                              <td className="py-3 px-4 hidden lg:table-cell text-muted-foreground">
                                {new Date(user.created_at).toLocaleString("fr-FR")}
                              </td>
                              <td className="py-3 px-4 text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-red-600"
                                      onClick={() => handleDeleteUser(user.id)}
                                    >
                                      Delete user
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-8 border rounded-lg">
                      <p className="text-muted-foreground">No {role}s found</p>
                      {searchTerm && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Try adjusting your search or filters
                        </p>
                      )}
                    </div>
                  )}
                  <div className="flex justify-between items-center mt-4">
                    <p className="text-sm text-muted-foreground">
                      Showing {displayedUsers.length} of {filteredUsers.length} {role}s
                      {totalPages > 1 && ` (Page ${currentPage} of ${totalPages})`}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages || totalPages === 0}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              Create a new user account with the appropriate role.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <Select
                value={newUser.role}
                onValueChange={(value) =>
                  setNewUser({
                    ...newUser,
                    role: value,
                    level: value === "learner" ? newUser.level || "beginner" : "",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="learner">Learner</SelectItem>
                  <SelectItem value="trainer">Trainer</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newUser.role === "learner" && (
              <div className="space-y-2">
                <Label htmlFor="level">Level</Label>
                <Select
                  value={newUser.level || ""}
                  onValueChange={(value) => setNewUser({ ...newUser, level: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddUserDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Group Dialog */}
      <Dialog open={isAddGroupDialogOpen} onOpenChange={setIsAddGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Group</DialogTitle>
            <DialogDescription>
              Create a new group and assign users to it.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="group-name">Name</Label>
              <Input
                id="group-name"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-description">Description</Label>
              <Input
                id="group-description"
                value={newGroup.description}
                onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="group-users">Users</Label>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id={`user-${user.id}`}
                      checked={newGroup.user_ids.includes(user.id)}
                      onChange={(e) => {
                        const updatedUserIds = e.target.checked
                          ? [...newGroup.user_ids, user.id]
                          : newGroup.user_ids.filter((id) => id !== user.id);
                        setNewGroup({ ...newGroup, user_ids: updatedUserIds });
                      }}
                    />
                    <Label htmlFor={`user-${user.id}`}>{user.username}</Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsAddGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Creating..." : "Create Group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Group Dialog */}
      <Dialog open={isEditGroupDialogOpen} onOpenChange={setIsEditGroupDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Group</DialogTitle>
            <DialogDescription>
              Modify the group details and assigned users.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditGroup} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-group-name">Name</Label>
              <Input
                id="edit-group-name"
                value={editGroup.name}
                onChange={(e) => setEditGroup({ ...editGroup, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group-description">Description</Label>
              <Input
                id="edit-group-description"
                value={editGroup.description}
                onChange={(e) => setEditGroup({ ...editGroup, description: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-group-users">Users</Label>
              <div className="border rounded-md p-2 max-h-40 overflow-y-auto">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2 py-1">
                    <input
                      type="checkbox"
                      id={`edit-user-${user.id}`}
                      checked={editGroup.user_ids.includes(user.id)}
                      onChange={(e) => {
                        const updatedUserIds = e.target.checked
                          ? [...editGroup.user_ids, user.id]
                          : editGroup.user_ids.filter((id) => id !== user.id);
                        setEditGroup({ ...editGroup, user_ids: updatedUserIds });
                      }}
                    />
                    <Label htmlFor={`edit-user-${user.id}`}>{user.username}</Label>
                  </div>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditGroupDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default UserManagement;