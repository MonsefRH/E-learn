import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Course, Group, Session, User } from "@/models";

interface SessionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isAddMode: boolean;
  session: { course_id: string; teacher_id: string; group_ids: string[]; start_date: string; status: string } | Session | null;
  setSession: (session: { course_id: string; teacher_id: string; group_ids: string[]; start_date: string; status: string } | Session | null) => void;
  courses: Course[];
  users: User[];
  groups: Group[];
  onSave: () => Promise<void>;
  loading: boolean;
  error: string | null;
  setError: (error: string | null) => void;
}

const SessionDialog = ({
  open,
  onOpenChange,
  isAddMode,
  session,
  setSession,
  courses,
  users,
  groups,
  onSave,
  loading,
  error,
  setError,
}: SessionDialogProps) => {
  const newSession = isAddMode
    ? (session as { course_id: string; teacher_id: string; group_ids: string[]; start_date: string; status: string })
    : null;
  const editSession = isAddMode ? null : (session as Session | null);

  if (!isAddMode && !editSession) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-white z-50">
          <div className="p-4 text-center text-red-600">
            Error: No session selected for editing
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Function to get selected group names for display
  const getSelectedGroupNames = (selectedIds: string[]) => {
    return selectedIds
      .map((id) => groups.find((group) => group.id === Number(id))?.name)
      .filter(Boolean)
      .join(", ");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white z-50">
        <DialogHeader>
          <DialogTitle>{isAddMode ? "Start New Session" : "Edit Session"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <Select
            onValueChange={(value) => {
              if (isAddMode) setSession({ ...newSession, course_id: value });
              else if (editSession) setSession({ ...editSession, course_id: Number(value) });
            }}
            value={isAddMode ? newSession.course_id : editSession?.course_id ? String(editSession.course_id) : ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={String(course.id)}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            onValueChange={(value) => {
              if (isAddMode) setSession({ ...newSession, teacher_id: value });
              else if (editSession) setSession({ ...editSession, teacher_id: Number(value) });
            }}
            value={isAddMode ? newSession.teacher_id : editSession?.teacher_id ? String(editSession.teacher_id) : ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Teacher" />
            </SelectTrigger>
            <SelectContent>
              {users.filter(u => u.role === "trainer").map((user) => (
                <SelectItem key={user.id} value={String(user.id)}>
                  {user.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            multiple
            onValueChange={(values) => {
              if (isAddMode) setSession({ ...newSession, group_ids: Array.isArray(values) ? values : [values] });
              else if (editSession) setSession({ ...editSession, group_ids: Array.isArray(values) ? values : [values] });
            }}
            value={isAddMode ? newSession.group_ids : editSession?.group_ids.map(String) || []}
          >
            <SelectTrigger>
              <SelectValue>
                {getSelectedGroupNames(isAddMode ? newSession.group_ids : editSession?.group_ids.map(String) || [])
                  ? getSelectedGroupNames(isAddMode ? newSession.group_ids : editSession?.group_ids.map(String) || [])
                  : "Select Group"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {groups.map((group) => (
                <SelectItem key={group.id} value={String(group.id)}>
                  {group.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant={"outline"}
                className={`w-full justify-start text-left font-normal ${(!isAddMode && !editSession?.start_date) || (isAddMode && !newSession.start_date) && "text-muted-foreground"}`}
              >
                {(isAddMode && newSession.start_date) || (!isAddMode && editSession?.start_date)
                  ? format(new Date((isAddMode ? newSession.start_date : editSession?.start_date) || ""), "PPP")
                  : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={(isAddMode ? newSession.start_date : editSession?.start_date) ? new Date(isAddMode ? newSession.start_date : editSession?.start_date || "") : undefined}
                onSelect={(date) => {
                  if (date) {
                    if (isAddMode) setSession({ ...newSession, start_date: date.toISOString().split("T")[0] });
                    else if (editSession) setSession({ ...editSession, start_date: date.toISOString().split("T")[0] });
                  }
                }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          {!isAddMode && editSession && (
            <Select
              onValueChange={(value) => editSession && setSession({ ...editSession, status: value as "PENDING" | "VALIDATED" | "AVAILABLE" })}
              value={editSession.status}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="VALIDATED">Validated</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={
              (isAddMode && (!newSession.course_id || !newSession.teacher_id || !newSession.group_ids.length || !newSession.start_date)) ||
              (!isAddMode && (!editSession?.course_id || !editSession.teacher_id || !editSession.group_ids.length || !editSession.start_date))
            }
          >
            {loading ? (isAddMode ? "Creating..." : "Saving...") : isAddMode ? "Start" : "Update"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionDialog;