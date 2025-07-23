import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import CourseView from "./pages/CourseView";
import CourseEditor from "./components/course/CourseEditor";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import UserManagement from "@/components/management/UserManagement";
import CourseManagement from "@/components/management/CourseManagement.tsx";
import SessionManagement from "@/components/management/SessionManagement";

const queryClient = new QueryClient();

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
              <Route path="/users" element={<UserManagement/>}/>
              <Route path="/admin/courses" element={<CourseManagement/>}/>
              <Route path="/admin/sessions" element={<SessionManagement/>}/>
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