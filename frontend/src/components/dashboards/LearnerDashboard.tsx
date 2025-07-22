
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BookOpen, Play, Award, Clock, Star, TrendingUp, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const LearnerDashboard = () => {
  const navigate = useNavigate();

  const [enrolledCourses] = useState([
    {
      id: 1,
      title: "Introduction to Java",
      instructor: "Dr. Sarah Wilson",
      progress: 75,
      nextLesson: "Neural Networks Basics",
      totalLessons: 12,
      completedLessons: 9
    },
    {
      id: 2,
      title: "Python Programming Fundamentals",
      instructor: "Prof. Mike Johnson",
      progress: 45,
      nextLesson: "Object-Oriented Programming",
      totalLessons: 8,
      completedLessons: 4
    },
    {
      id: 3,
      title: "Data Science Essentials",
      instructor: "Dr. Emily Chen",
      progress: 20,
      nextLesson: "Data Cleaning Techniques",
      totalLessons: 15,
      completedLessons: 3
    },
  ]);

  const [availableCourses] = useState([
    { id: 4, title: "Web Development Bootcamp", instructor: "John Doe", rating: 4.8, students: 1234 },
    { id: 5, title: "Mobile App Development", instructor: "Jane Smith", rating: 4.6, students: 890 },
    { id: 6, title: "Cloud Computing Basics", instructor: "Alex Brown", rating: 4.9, students: 567 },
  ]);

  const handleStartCourse = (courseId: number) => {
    navigate(`/course/${courseId}`);
  };

  return (
    <DashboardLayout
      title="My Learning Dashboard"
      breadcrumbs={[{ label: "Dashboard" }]}
    >

        {/* Learning Progress Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Courses in Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">{enrolledCourses.length}</div>
              <p className="text-sm text-muted-foreground">Keep learning!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Average Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {Math.round(enrolledCourses.reduce((acc, course) => acc + course.progress, 0) / enrolledCourses.length)}%
              </div>
              <p className="text-sm text-muted-foreground">Across all courses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Lessons Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {enrolledCourses.reduce((acc, course) => acc + course.completedLessons, 0)}
              </div>
              <p className="text-sm text-muted-foreground">Total lessons finished</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="current" className="space-y-4">
          <TabsList>
            <TabsTrigger value="current">Current Courses</TabsTrigger>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="achievements">Achievements</TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-4">
            <div className="grid gap-6">
              {enrolledCourses.map((course) => (
                <Card key={course.id} className="overflow-hidden">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-xl">{course.title}</CardTitle>
                        <CardDescription>Instructor: {course.instructor}</CardDescription>
                      </div>
                      <Badge variant="secondary">
                        {course.completedLessons}/{course.totalLessons} lessons
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span>Progress</span>
                        <span>{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Next: {course.nextLesson}</p>
                        <p className="text-sm text-muted-foreground">Continue where you left off</p>
                      </div>
                      <div className="flex space-x-2">
                        <Button onClick={() => handleStartCourse(course.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Continue
                        </Button>
                        <Button variant="outline" size="icon">
                          <MessageCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="discover" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recommended for You</CardTitle>
                <CardDescription>Courses that match your interests and skill level</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {availableCourses.map((course) => (
                    <Card key={course.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg">{course.title}</CardTitle>
                        <CardDescription>by {course.instructor}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span>{course.rating}</span>
                          </div>
                          <span className="text-muted-foreground">{course.students} students</span>
                        </div>
                        <Button className="w-full">
                          <BookOpen className="mr-2 h-4 w-4" />
                          Enroll Now
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="achievements" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Your Achievements</CardTitle>
                <CardDescription>Celebrate your learning milestones</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl mb-2">🏆</div>
                    <h4 className="font-semibold">First Course</h4>
                    <p className="text-xs text-muted-foreground">Completed your first course</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl mb-2">⚡</div>
                    <h4 className="font-semibold">Quick Learner</h4>
                    <p className="text-xs text-muted-foreground">5 lessons in one day</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg opacity-50">
                    <div className="text-2xl mb-2">🎯</div>
                    <h4 className="font-semibold">Focused</h4>
                    <p className="text-xs text-muted-foreground">Complete 3 courses</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg opacity-50">
                    <div className="text-2xl mb-2">🌟</div>
                    <h4 className="font-semibold">Expert</h4>
                    <p className="text-xs text-muted-foreground">Master level achieved</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
    </DashboardLayout>
  );
};

export default LearnerDashboard;
