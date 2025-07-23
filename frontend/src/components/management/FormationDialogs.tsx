import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Category, Course, Lesson, User } from "@/models";

interface FormationDialogsProps {
  dialogOpen: {
    addCategory: boolean;
    editCategory: boolean;
    addCourse: boolean;
    editCourse: boolean;
    addLesson: boolean;
    editLesson: boolean;
  };
  setDialogOpen: React.Dispatch<
    React.SetStateAction<{
      addCategory: boolean;
      editCategory: boolean;
      addCourse: boolean;
      editCourse: boolean;
      addLesson: boolean;
      editLesson: boolean;
    }>
  >;
  newCategory: { name: string; description: string; parent_id: string };
  setNewCategory: React.Dispatch<React.SetStateAction<{ name: string; description: string; parent_id: string }>>;
  editCategory: Category | null;
  setEditCategory: React.Dispatch<React.SetStateAction<Category | null>>;
  newCourse: {
    title: string;
    description: string;
    category_id: string;
    deadline: string;
    is_active: boolean;
  };
  setNewCourse: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      category_id: string;
      deadline: string;
      is_active: boolean;
    }>
  >;
  editCourse: Course | null;
  setEditCourse: React.Dispatch<React.SetStateAction<Course | null>>;
  newLesson: { title: string; description: string; course_id: string };
  setNewLesson: React.Dispatch<React.SetStateAction<{ title: string; description: string; course_id: string }>>;
  editLesson: Lesson | null;
  setEditLesson: React.Dispatch<React.SetStateAction<Lesson | null>>;
  categories: Category[];
  users: User[];
  handleCreateCategory: () => void;
  handleUpdateCategory: () => void;
  handleCreateCourse: () => void;
  handleUpdateCourse: () => void;
  handleCreateLesson: () => void;
  handleUpdateLesson: () => void;
}

const FormationDialogs: React.FC<FormationDialogsProps> = ({
  dialogOpen,
  setDialogOpen,
  newCategory,
  setNewCategory,
  editCategory,
  setEditCategory,
  newCourse,
  setNewCourse,
  editCourse,
  setEditCourse,
  newLesson,
  setNewLesson,
  editLesson,
  setEditLesson,
  categories,
  users,
  handleCreateCategory,
  handleUpdateCategory,
  handleCreateCourse,
  handleUpdateCourse,
  handleCreateLesson,
  handleUpdateLesson,
}) => {
  return (
    <>
      {/* Add Category Dialog */}
      <Dialog
        open={dialogOpen.addCategory}
        onOpenChange={(open) => {
          setDialogOpen({ ...dialogOpen, addCategory: open });
          if (!open) setNewCategory({ name: "", description: "", parent_id: "" });
        }}
      >
        <DialogContent className="bg-white z-50">
          <DialogHeader>
            <DialogTitle>Add Category/Subcategory</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Name"
              value={newCategory.name}
              onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newCategory.description}
              onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
            />
            <Select
              onValueChange={(value) => setNewCategory({ ...newCategory, parent_id: value })}
              value={newCategory.parent_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Parent Category (Optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {categories
                  .filter((cat) => !cat.parent_id)
                  .map((category) => (
                    <SelectItem key={category.id} value={String(category.id)}>
                      {category.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen({ ...dialogOpen, addCategory: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCategory}
              disabled={!newCategory.name || !newCategory.description}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Category Dialog */}
      <Dialog
        open={dialogOpen.editCategory && !!editCategory}
        onOpenChange={(open) => {
          setDialogOpen({ ...dialogOpen, editCategory: open });
          if (!open) setEditCategory(null);
        }}
      >
        <DialogContent className="bg-white z-50">
          {editCategory ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit Category/Subcategory</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  placeholder="Name"
                  value={editCategory.name || ""}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, name: e.target.value })
                  }
                />
                <Input
                  placeholder="Description"
                  value={editCategory.description || ""}
                  onChange={(e) =>
                    setEditCategory({ ...editCategory, description: e.target.value })
                  }
                />
                <Select
                  onValueChange={(value) =>
                    setEditCategory({
                      ...editCategory,
                      parent_id: value !== "none" ? Number(value) : undefined,
                    })
                  }
                  value={editCategory.parent_id ? String(editCategory.parent_id) : "none"}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Parent Category (Optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories
                      .filter((cat) => !cat.parent_id && cat.id !== editCategory.id)
                      .map((category) => (
                        <SelectItem key={category.id} value={String(category.id)}>
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen({ ...dialogOpen, editCategory: false })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateCategory}
                  disabled={!editCategory.name || !editCategory.description}
                >
                  Update
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="p-4 text-center text-red-600">
              Error: No category selected for editing
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Course Dialog */}
      <Dialog
        open={dialogOpen.addCourse}
        onOpenChange={(open) => {
          setDialogOpen({ ...dialogOpen, addCourse: open });
          if (!open)
            setNewCourse({
              title: "",
              description: "",
              category_id: "",
              deadline: "",
              is_active: false,
            });
        }}
      >
        <DialogContent className="bg-white z-50">
          <DialogHeader>
            <DialogTitle>Add Course</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Course Title"
              value={newCourse.title}
              onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newCourse.description}
              onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
            />
            <Select
              onValueChange={(value) => setNewCourse({ ...newCourse, category_id: value })}
              value={newCourse.category_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={String(category.id)}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Deadline (YYYY-MM-DD)"
              value={newCourse.deadline}
              onChange={(e) => setNewCourse({ ...newCourse, deadline: e.target.value })}
            />
            <Select
              onValueChange={(value) => setNewCourse({ ...newCourse, is_active: value === "true" })}
              value={String(newCourse.is_active)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Active</SelectItem>
                <SelectItem value="false">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen({ ...dialogOpen, addCourse: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateCourse}
              disabled={!newCourse.title || !newCourse.description || !newCourse.category_id}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Dialog */}
      <Dialog
        open={dialogOpen.editCourse && !!editCourse}
        onOpenChange={(open) => {
          setDialogOpen({ ...dialogOpen, editCourse: open });
          if (!open) setEditCourse(null);
        }}
      >
        <DialogContent className="bg-white z-50">
          {editCourse ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit Course</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  placeholder="Course Title"
                  value={editCourse.title || ""}
                  onChange={(e) =>
                    setEditCourse({ ...editCourse, title: e.target.value })
                  }
                />
                <Input
                  placeholder="Description"
                  value={editCourse.description || ""}
                  onChange={(e) =>
                    setEditCourse({ ...editCourse, description: e.target.value })
                  }
                />
                <Select
                  onValueChange={(value) =>
                    setEditCourse({ ...editCourse, category_id: Number(value) })
                  }
                  value={editCourse.category_id ? String(editCourse.category_id) : ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={String(category.id)}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  placeholder="Deadline (YYYY-MM-DD)"
                  value={editCourse.deadline || ""}
                  onChange={(e) =>
                    setEditCourse({ ...editCourse, deadline: e.target.value || undefined })
                  }
                />
                <Select
                  onValueChange={(value) =>
                    setEditCourse({ ...editCourse, is_active: value === "true" })
                  }
                  value={String(editCourse.is_active)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen({ ...dialogOpen, editCourse: false })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateCourse}
                  disabled={!editCourse.title || !editCourse.description || !editCourse.category_id}
                >
                  Update
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="p-4 text-center text-red-600">
              Error: No course selected for editing
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Add Lesson Dialog */}
      <Dialog
        open={dialogOpen.addLesson}
        onOpenChange={(open) => {
          setDialogOpen({ ...dialogOpen, addLesson: open });
          if (!open) setNewLesson({ title: "", description: "", course_id: "" });
        }}
      >
        <DialogContent className="bg-white z-50">
          <DialogHeader>
            <DialogTitle>Add Lesson</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <Input
              placeholder="Lesson Title"
              value={newLesson.title}
              onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
            />
            <Input
              placeholder="Description"
              value={newLesson.description}
              onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })}
            />
            <Select
              onValueChange={(value) => setNewLesson({ ...newLesson, course_id: value })}
              value={newLesson.course_id}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Course" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => [
                  ...category.courses.map((course) => (
                    <SelectItem key={course.id} value={String(course.id)}>
                      {category.name} / {course.title}
                    </SelectItem>
                  )),
                  ...category.subcategories.flatMap((subcategory) =>
                    subcategory.courses.map((course) => (
                      <SelectItem key={course.id} value={String(course.id)}>
                        {category.name} / {subcategory.name} / {course.title}
                      </SelectItem>
                    ))
                  ),
                ])}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen({ ...dialogOpen, addLesson: false })}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateLesson}
              disabled={!newLesson.title || !newLesson.description || !newLesson.course_id}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Lesson Dialog */}
      <Dialog
        open={dialogOpen.editLesson && !!editLesson}
        onOpenChange={(open) => {
          setDialogOpen({ ...dialogOpen, editLesson: open });
          if (!open) setEditLesson(null);
        }}
      >
        <DialogContent className="bg-white z-50">
          {editLesson ? (
            <>
              <DialogHeader>
                <DialogTitle>Edit Lesson</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <Input
                  placeholder="Lesson Title"
                  value={editLesson.title || ""}
                  onChange={(e) =>
                    setEditLesson({ ...editLesson, title: e.target.value })
                  }
                />
                <Input
                  placeholder="Description"
                  value={editLesson.description || ""}
                  onChange={(e) =>
                    setEditLesson({ ...editLesson, description: e.target.value })
                  }
                />
                <Select
                  onValueChange={(value) =>
                    setEditLesson({ ...editLesson, course_id: Number(value) })
                  }
                  value={editLesson.course_id ? String(editLesson.course_id) : ""}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Course" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => [
                      ...category.courses.map((course) => (
                        <SelectItem key={course.id} value={String(course.id)}>
                          {category.name} / {course.title}
                        </SelectItem>
                      )),
                      ...category.subcategories.flatMap((subcategory) =>
                        subcategory.courses.map((course) => (
                          <SelectItem key={course.id} value={String(course.id)}>
                            {category.name} / {subcategory.name} / {course.title}
                          </SelectItem>
                        ))
                      ),
                    ])}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen({ ...dialogOpen, editLesson: false })}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateLesson}
                  disabled={!editLesson.title || !editLesson.description || !editLesson.course_id}
                >
                  Update
                </Button>
              </DialogFooter>
            </>
          ) : (
            <div className="p-4 text-center text-red-600">
              Error: No lesson selected for editing
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FormationDialogs;