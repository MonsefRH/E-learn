import { useAuth } from "@/hooks/useAuth";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  BookOpen,
  Users,
  GraduationCap,
  BarChart3,
  Settings,
  Home,
  PlusCircle,
  Library,
  Award,
  MessageCircle,
  LogOut,
  Play,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

export function AppSidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const managerItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "Courses", url: "/admin/courses", icon: BookOpen },
    { title: "Sessions", url: "/admin/sessions", icon: Play },
    { title: "Users", url: "/users", icon: Users },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const trainerItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "My Sessions", url: "/sessions", icon: Play }, // Updated to "My Sessions" with Play icon
    { title: "My Courses", url: "/courses", icon: BookOpen },
    { title: "Create Course", url: "/create-course", icon: PlusCircle },
    { title: "Content Library", url: "/library", icon: Library },
    { title: "Analytics", url: "/analytics", icon: BarChart3 },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const learnerItems = [
    { title: "Dashboard", url: "/dashboard", icon: Home },
    { title: "My Courses", url: "/my-courses", icon: BookOpen },
    { title: "Browse Courses", url: "/browse", icon: Library },
    { title: "Achievements", url: "/achievements", icon: Award },
    { title: "Help & Support", url: "/support", icon: MessageCircle },
    { title: "Settings", url: "/settings", icon: Settings },
  ];

  const getMenuItems = () => {
    switch (user?.role) {
      case "manager":
        return managerItems;
      case "trainer":
        return trainerItems;
      case "learner":
        return learnerItems;
      default:
        return [];
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  return (
    <Sidebar className="border-r border-gray-200">
      <SidebarHeader className="border-b border-gray-200 p-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-lg flex items-center justify-center">
            <GraduationCap className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">EduAI</h2>
            <p className="text-sm text-gray-500">Learning Platform</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-4">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-gray-500 px-3 mb-2">
            {user?.role === "manager" ? "Management" : user?.role === "trainer" ? "Teaching" : "Learning"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {getMenuItems().map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="w-full justify-start px-3 py-2 text-sm font-medium transition-colors rounded-lg"
                    >
                      <button onClick={() => navigate(item.url)} className="flex items-center space-x-3">
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </button>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-gray-200 p-4">
        <div className="space-y-3">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
              <span className="text-sm font-medium text-gray-700">{user?.username?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.username}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Log Out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}