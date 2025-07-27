import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BookOpen, Plus, Users, Video, Edit, Eye, BarChart3, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";

const TrainerDashboard = () => {
  const navigate = useNavigate();

  const [myCourses] = useState([
    {
      id: 1,
      title: "Introduction to Machine Learning",
      enrollments: 45,
      modules: 8,
      status: "published",
      completionRate: 78
    },
    {
      id: 2,
      title: "Python Programming Basics",
      enrollments: 32,
      modules: 6,
      status: "draft",
      completionRate: 0
    },
    {
      id: 3,
      title: "Data Visualization",
      enrollments: 28,
      modules: 5,
      status: "published",
      completionRate: 65
    },
  ]);

  const [recentActivity] = useState([
    { type: "enrollment", message: "5 new students enrolled in Machine Learning", time: "2 hours ago" },
    { type: "completion", message: "Sarah completed Python Programming module 3", time: "4 hours ago" },
    { type: "question", message: "New Q&A question in Data Visualization", time: "6 hours ago" },
  ]);

  return (
    <DashboardLayout
      title="Trainer Dashboard"
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-8 w-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-blue-900">{myCourses.length}</p>
                  <p className="text-sm text-blue-700">Active Courses</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-8 w-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-green-900">
                    {myCourses.reduce((sum, course) => sum + course.enrollments, 0)}
                  </p>
                  <p className="text-sm text-green-700">Total Students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Video className="h-8 w-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-purple-900">
                    {myCourses.reduce((sum, course) => sum + course.modules, 0)}
                  </p>
                  <p className="text-sm text-purple-700">Total Modules</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <BarChart3 className="h-8 w-8 text-orange-600" />
                <div>
                  <p className="text-2xl font-bold text-orange-900">
                    {Math.round(myCourses.reduce((sum, course) => sum + course.completionRate, 0) / myCourses.length)}%
                  </p>
                  <p className="text-sm text-orange-700">Avg Completion</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="sessions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="sessions">My Sessions</TabsTrigger>
            <TabsTrigger value="content">Content Library</TabsTrigger>
            <TabsTrigger value="analytics">Student Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>My Sessions</CardTitle>
                    <CardDescription>Manage and prepare your teaching sessions</CardDescription>
                  </div>
                  <Button onClick={() => navigate('/sessions')}>
                    <Play className="mr-2 h-4 w-4" />
                    View Sessions
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {myCourses.map((course) => (
                    <Card key={course.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h4 className="font-semibold text-lg text-gray-900">{course.title}</h4>
                            <p className="text-sm text-gray-600">
                              {course.modules} modules • {course.enrollments} students
                            </p>
                          </div>
                          <Badge
                            variant={course.status === "published" ? "default" : "secondary"}
                            className={course.status === "published" ? "bg-green-100 text-green-800" : ""}
                          >
                            {course.status}
                          </Badge>
                        </div>

                        {course.status === "published" && (
                          <div className="mb-4">
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-600">Completion Rate</span>
                              <span className="font-medium">{course.completionRate}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${course.completionRate}%` }}
                              ></div>
                            </div>
                          </div>
                        )}

                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            onClick={() => navigate(`/course/${course.id}/edit`)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/course/${course.id}`)}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline">
                            <BarChart3 className="h-3 w-3 mr-1" />
                            Analytics
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Content Library</CardTitle>
                <CardDescription>Upload and manage your teaching materials</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-dashed border-2 border-gray-300 hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload Video</span>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed border-2 border-gray-300 hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Upload PDF</span>
                    </CardContent>
                  </Card>

                  <Card className="border-dashed border-2 border-gray-300 hover:border-primary transition-colors cursor-pointer">
                    <CardContent className="flex flex-col items-center justify-center h-32 space-y-2">
                      <Plus className="h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Create Text Lesson</span>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Student Performance</CardTitle>
                <CardDescription>Track how your students are progressing</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div key={index} className="flex items-center space-x-3 p-3 border rounded-lg">
                      <div className={`w-2 h-2 rounded-full ${
                        activity.type === 'enrollment' ? 'bg-green-500' :
                        activity.type === 'completion' ? 'bg-blue-500' : 'bg-yellow-500'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default TrainerDashboard;