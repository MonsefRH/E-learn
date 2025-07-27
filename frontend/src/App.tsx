import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import Index from "./pages/Index";
import CourseView from "./pages/CourseView";
import CourseEditor from "./components/course/CourseEditor";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import UserManagement from "@/components/management/UserManagement";
import CourseManagement from "@/components/management/CourseManagement.tsx";
import SessionManagement from "@/components/management/SessionManagement";
import TrainerSessionManagement from "@/components/management/TrainerSessionManagement"; // New import

const queryClient = new QueryClient();

// Protected Route Component to handle role-based access
const ProtectedRoute = ({ children, allowedRoles }: { children: JSX.Element; allowedRoles: string[] }) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>; // Placeholder for loading state
  }

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<Index />} />
            <Route
              path="/users"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/courses"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <CourseManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/sessions"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <SessionManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="/sessions"
              element={
                <ProtectedRoute allowedRoles={["trainer"]}>
                  <TrainerSessionManagement />
                </ProtectedRoute>
              }
            />
            <Route path="/course/:courseId" element={<CourseView />} />
            <Route path="/course/:courseId/edit" element={<CourseEditor />} />
            <Route path="/course/new/edit" element={<CourseEditor />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;