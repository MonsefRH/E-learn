import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Plus, Trash2, Edit2, ChevronDown, ChevronRight } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Category, Course, Lesson } from "@/models";
import formationService from "@/lib/services/formationService";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import FormationDialogs from "@/components/dialogs/FormationDialogs.tsx";

const CourseManagement = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: "", description: "", parent_id: "" });
  const [editCategory, setEditCategory] = useState<Category | null>(null);
  const [newCourse, setNewCourse] = useState({
    title: "",
    description: "",
    category_id: "",
    deadline: "",
    is_active: false,
  });
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [newLesson, setNewLesson] = useState({ title: "", description: "", course_id: "" });
  const [editLesson, setEditLesson] = useState<Lesson | null>(null);
  const [openNodes, setOpenNodes] = useState<Record<number, boolean>>({});
  const [dialogOpen, setDialogOpen] = useState({
    addCategory: false,
    editCategory: false,
    addCourse: false,
    editCourse: false,
    addLesson: false,
    editLesson: false,
  });

  const refreshCategories = useCallback(async () => {
    try {
      setLoading(true);
      const [categoriesData, coursesData, lessonsData] = await Promise.all([
        formationService.getCategories(),
        formationService.getCourses(),
        formationService.getLessons(),
      ]);
      setCategories(
        categoriesData.map((cat) => ({
          ...cat,
          subcategories: categoriesData.filter((sub) => sub.parent_id === cat.id),
          courses: coursesData
            .filter((course) => course.category_id === cat.id)
            .map((course) => ({
              ...course,
              lessons: lessonsData.filter((lesson) => lesson.course_id === course.id),
            })),
        }))
      );
      setCourses(coursesData);
      setLessons(lessonsData);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      const errorMessage =
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
            axiosError.message ||
            "Failed to fetch data from the backend";
      console.error("refreshCategories error:", axiosError, axiosError.response?.data);
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
      setError("Please log in to access course management");
      setLoading(false);
      navigate("/");
      return;
    }
    const fetchData = async () => {
      try {
        setLoading(true);
        const [categoriesData, coursesData, lessonsData] = await Promise.all<
          [Category[], Course[], Lesson[]]
        >([
          formationService.getCategories(),
          formationService.getCourses(),
          formationService.getLessons(),
        ]);
        setCategories(
          categoriesData.map((cat) => ({
            ...cat,
            subcategories: categoriesData.filter((sub) => sub.parent_id === cat.id),
            courses: coursesData
              .filter((course) => course.category_id === cat.id)
              .map((course) => ({
                ...course,
                lessons: lessonsData.filter((lesson) => lesson.course_id === course.id),
              })),
          }))
        );
        setCourses(coursesData);
        setLessons(lessonsData);
        setError(null);
      } catch (err: unknown) {
        const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
        console.error("fetchData error:", axiosError, axiosError.response?.data);
        if (axiosError.response?.status === 401) {
          logout();
          navigate("/");
        }
        setError(
          typeof axiosError.response?.data?.detail === "string"
            ? axiosError.response.data.detail
            : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
                axiosError.message ||
                "Failed to fetch data from the backend"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user, authLoading, logout, navigate]);

  const toggleNode = (id: number) => {
    setOpenNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateCategory = async () => {
    if (!newCategory.name || !newCategory.description) {
      setError("Category name and description are required");
      return;
    }
    try {
      setLoading(true);
      await formationService.createCategory({
        name: newCategory.name,
        description: newCategory.description,
        parent_id: newCategory.parent_id && newCategory.parent_id !== "none" ? Number(newCategory.parent_id) : undefined,
      });
      setNewCategory({ name: "", description: "", parent_id: "" });
      setDialogOpen({ ...dialogOpen, addCategory: false });
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      console.error("handleCreateCategory error:", axiosError, axiosError.response?.data);
      setError(
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
              axiosError.message ||
              "Failed to create category"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditCategory(category);
    setDialogOpen({ ...dialogOpen, editCategory: true });
  };

  const handleUpdateCategory = async () => {
    if (!editCategory || !editCategory.name || !editCategory.description) {
      setError("Category name and description are required");
      return;
    }
    try {
      setLoading(true);
      await formationService.updateCategory(editCategory.id, {
        name: editCategory.name,
        description: editCategory.description,
        parent_id: editCategory.parent_id && editCategory.parent_id !== "none" ? Number(editCategory.parent_id) : undefined,
      });
      setEditCategory(null);
      setDialogOpen({ ...dialogOpen, editCategory: false });
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      console.error("handleUpdateCategory error:", axiosError, axiosError.response?.data);
      setError(
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
              axiosError.message ||
              "Failed to update category"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCategory = async (categoryId: number) => {
    try {
      setLoading(true);
      await formationService.deleteCategory(categoryId);
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      console.error("handleDeleteCategory error:", axiosError, axiosError.response?.data);
      setError(
        axiosError.response?.data?.detail ||
          axiosError.message ||
          "Failed to delete category"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCourse = async () => {
    if (!newCourse.title || !newCourse.description || !newCourse.category_id) {
      setError("Course title, description, and category are required");
      return;
    }
    try {
      setLoading(true);
      await formationService.createCourse({
        title: newCourse.title,
        description: newCourse.description,
        category_id: Number(newCourse.category_id),
        deadline: newCourse.deadline || undefined,
        is_active: newCourse.is_active,
      });
      setNewCourse({
        title: "",
        description: "",
        category_id: "",
        deadline: "",
        is_active: false,
      });
      setDialogOpen({ ...dialogOpen, addCourse: false });
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      console.error("handleCreateCourse error:", axiosError, axiosError.response?.data);
      setError(
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
              axiosError.message ||
              "Failed to create course"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditCourse = (course: Course) => {
    setEditCourse(course);
    setDialogOpen({ ...dialogOpen, editCourse: true });
  };

  const handleUpdateCourse = async () => {
    if (!editCourse || !editCourse.title || !editCourse.description || !editCourse.category_id) {
      setError("Course title, description, and category are required");
      return;
    }
    try {
      setLoading(true);
      await formationService.updateCourse(editCourse.id, {
        title: editCourse.title,
        description: editCourse.description,
        category_id: Number(editCourse.category_id),
        deadline: editCourse.deadline || undefined,
        is_active: editCourse.is_active,
      });
      setEditCourse(null);
      setDialogOpen({ ...dialogOpen, editCourse: false });
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      console.error("handleUpdateCourse error:", axiosError, axiosError.response?.data);
      setError(
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
              axiosError.message ||
              "Failed to update course"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: number) => {
    try {
      setLoading(true);
      await formationService.deleteCourse(courseId);
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      console.error("handleDeleteCourse error:", axiosError, axiosError.response?.data);
      setError(
        axiosError.response?.data?.detail ||
          axiosError.message ||
          "Failed to delete course"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLesson = async () => {
    if (!newLesson.title || !newLesson.description || !newLesson.course_id) {
      setError("Lesson title, description, and course are required");
      return;
    }
    try {
      setLoading(true);
      await formationService.createLesson({
        title: newLesson.title,
        description: newLesson.description,
        course_id: Number(newLesson.course_id),
      });
      setNewLesson({ title: "", description: "", course_id: "" });
      setDialogOpen({ ...dialogOpen, addLesson: false });
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      console.error("handleCreateLesson error:", axiosError, axiosError.response?.data);
      setError(
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
              axiosError.message ||
              "Failed to create lesson"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEditLesson = (lesson: Lesson) => {
    setEditLesson(lesson);
    setDialogOpen({ ...dialogOpen, editLesson: true });
  };

  const handleUpdateLesson = async () => {
    if (!editLesson || !editLesson.title || !editLesson.description || !editLesson.course_id) {
      setError("Lesson title, description, and course are required");
      return;
    }
    try {
      setLoading(true);
      await formationService.updateLesson(editLesson.id, {
        title: editLesson.title,
        description: editLesson.description,
        course_id: Number(editLesson.course_id),
      });
      setEditLesson(null);
      setDialogOpen({ ...dialogOpen, editLesson: false });
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      console.error("handleUpdateLesson error:", axiosError, axiosError.response?.data);
      setError(
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
              axiosError.message ||
              "Failed to update lesson"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: number) => {
    try {
      setLoading(true);
      await formationService.deleteLesson(lessonId);
      await refreshCategories();
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string }>;
      console.error("handleDeleteLesson error:", axiosError, axiosError.response?.data);
      setError(
        axiosError.response?.data?.detail ||
          axiosError.message ||
          "Failed to delete lesson"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout
      title="Course Management"
      breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Courses", href: "/admin/courses" }]}
    >
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Course Management</CardTitle>
            <CardDescription>Manage categories, courses, and lessons in a tree structure</CardDescription>
            <div className="flex space-x-2">
              <Button onClick={() => setDialogOpen({ ...dialogOpen, addCategory: true })}>
                <Plus className="mr-2 h-4 w-4" /> Add Category/Subcategory
              </Button>
              <Button onClick={() => setDialogOpen({ ...dialogOpen, addCourse: true })}>
                <Plus className="mr-2 h-4 w-4" /> Add Course
              </Button>
              <Button onClick={() => setDialogOpen({ ...dialogOpen, addLesson: true })}>
                <Plus className="mr-2 h-4 w-4" /> Add Lesson
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
                <h3 className="font-semibold">Knowledge Tree</h3>
                <ul className="ml-4">
                  {categories
                    .filter((cat) => !cat.parent_id)
                    .map((category) => (
                      <li key={category.id} className="mb-2">
                        <Collapsible open={openNodes[category.id]} onOpenChange={() => toggleNode(category.id)}>
                          <CollapsibleTrigger className="flex items-center justify-between w-full">
                            <div className="flex items-center space-x-2">
                              {openNodes[category.id] ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                              <span className="font-medium hover:text-blue-600">{category.name}</span>
                            </div>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditCategory(category);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteCategory(category.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <ul className="ml-6 mt-2">
                              {category.courses.map((course) => (
                                <li key={course.id} className="mb-2">
                                  <Collapsible
                                    open={openNodes[course.id]}
                                    onOpenChange={() => toggleNode(course.id)}
                                  >
                                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                                      <div className="flex items-center space-x-2">
                                        {openNodes[course.id] ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                        <span className="hover:text-blue-600">
                                          {course.title} {course.is_active ? "(Active)" : "(Inactive)"}
                                        </span>
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditCourse(course);
                                          }}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCourse(course.id);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <ul className="ml-6 mt-2">
                                        {course.lessons.map((lesson) => (
                                          <li key={lesson.id} className="flex items-center justify-between">
                                            <span className="hover:text-blue-600">{lesson.title}</span>
                                            <div className="flex space-x-2">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleEditLesson(lesson)}
                                              >
                                                <Edit2 className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                variant="destructive"
                                                size="sm"
                                                onClick={() => handleDeleteLesson(lesson.id)}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </li>
                              ))}
                              {category.subcategories.map((subcategory) => (
                                <li key={subcategory.id} className="mb-2">
                                  <Collapsible
                                    open={openNodes[subcategory.id]}
                                    onOpenChange={() => toggleNode(subcategory.id)}
                                  >
                                    <CollapsibleTrigger className="flex items-center justify-between w-full">
                                      <div className="flex items-center space-x-2">
                                        {openNodes[subcategory.id] ? (
                                          <ChevronDown className="h-4 w-4" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4" />
                                        )}
                                        <span className="hover:text-blue-600">{subcategory.name}</span>
                                      </div>
                                      <div className="flex space-x-2">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleEditCategory(subcategory);
                                          }}
                                        >
                                          <Edit2 className="h-4 w-4" />
                                        </Button>
                                        <Button
                                          variant="destructive"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCategory(subcategory.id);
                                          }}
                                        >
                                          <Trash2 className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent>
                                      <ul className="ml-6 mt-2">
                                        {subcategory.courses.map((course) => (
                                          <li key={course.id} className="mb-2">
                                            <Collapsible
                                              open={openNodes[course.id]}
                                              onOpenChange={() => toggleNode(course.id)}
                                            >
                                              <CollapsibleTrigger className="flex items-center justify-between w-full">
                                                <div className="flex items-center space-x-2">
                                                  {openNodes[course.id] ? (
                                                    <ChevronDown className="h-4 w-4" />
                                                  ) : (
                                                    <ChevronRight className="h-4 w-4" />
                                                  )}
                                                  <span className="hover:text-blue-600">
                                                    {course.title} {course.is_active ? "(Active)" : "(Inactive)"}
                                                  </span>
                                                </div>
                                                <div className="flex space-x-2">
                                                  <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleEditCourse(course);
                                                    }}
                                                  >
                                                    <Edit2 className="h-4 w-4" />
                                                  </Button>
                                                  <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                      handleDeleteCourse(course.id);
                                                    }}
                                                  >
                                                    <Trash2 className="h-4 w-4" />
                                                  </Button>
                                                </div>
                                              </CollapsibleTrigger>
                                              <CollapsibleContent>
                                                <ul className="ml-6 mt-2">
                                                  {course.lessons.map((lesson) => (
                                                    <li key={lesson.id} className="flex items-center justify-between">
                                                      <span className="hover:text-blue-600">{lesson.title}</span>
                                                      <div className="flex space-x-2">
                                                        <Button
                                                          variant="outline"
                                                          size="sm"
                                                          onClick={() => handleEditLesson(lesson)}
                                                        >
                                                          <Edit2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                          variant="destructive"
                                                          size="sm"
                                                          onClick={() => handleDeleteLesson(lesson.id)}
                                                        >
                                                          <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                      </div>
                                                    </li>
                                                  ))}
                                                </ul>
                                              </CollapsibleContent>
                                            </Collapsible>
                                          </li>
                                        ))}
                                      </ul>
                                    </CollapsibleContent>
                                  </Collapsible>
                                </li>
                              ))}
                            </ul>
                          </CollapsibleContent>
                        </Collapsible>
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
        <FormationDialogs
          dialogOpen={dialogOpen}
          setDialogOpen={setDialogOpen}
          newCategory={newCategory}
          setNewCategory={setNewCategory}
          editCategory={editCategory}
          setEditCategory={setEditCategory}
          newCourse={newCourse}
          setNewCourse={setNewCourse}
          editCourse={editCourse}
          setEditCourse={setEditCourse}
          newLesson={newLesson}
          setNewLesson={setNewLesson}
          editLesson={editLesson}
          setEditLesson={setEditLesson}
          categories={categories}
          users={[]}
          handleCreateCategory={handleCreateCategory}
          handleUpdateCategory={handleUpdateCategory}
          handleCreateCourse={handleCreateCourse}
          handleUpdateCourse={handleUpdateCourse}
          handleCreateLesson={handleCreateLesson}
          handleUpdateLesson={handleUpdateLesson}
        />
      </div>
    </DashboardLayout>
  );
};

export default CourseManagement;