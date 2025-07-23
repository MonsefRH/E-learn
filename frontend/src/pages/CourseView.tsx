// pages/CourseView.tsx
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Chatbot } from "@/components/chatbot/Chatbot.tsx";
import AvatarPresentation from "@/components/presentation/AvatarPresentation";
import CourseExercises from "@/components/course/CourseExercises";
import CourseHeader from "@/components/course/CourseHeader";
import CourseStats from "@/components/course/CourseStats";
import CourseLessons from "@/components/course/CourseLessons";
import CourseResources from "@/components/course/CourseResources";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const CourseView = () => {
  const { courseId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();

  const [courseProgress, setCourseProgress] = useState(45);
  const [qaHistory, setQaHistory] = useState<string[]>([]);
  const [showFullHistory, setShowFullHistory] = useState(false);

  const course = {
    id: courseId,
    title: "Introduction to Java",
    description: "Learn the basics of Java ",
    instructor: "Dr. Sarah Wilson",
    duration: "2 hours",
    totalSlides: 25,
    category: "Technology",
    level: "Beginner",
    students: 1234,
    rating: 4.8,
    lessons: [
      { id: 1, title: "What is Machine Learning?", duration: "10 min", completed: true },
      { id: 2, title: "Types of ML Algorithms", duration: "15 min", completed: true },
      { id: 3, title: "Supervised Learning", duration: "20 min", completed: false },
      { id: 4, title: "Unsupervised Learning", duration: "18 min", completed: false },
    ],
  };

  const handleCourseComplete = () => {
    setCourseProgress(100);
    toast({ title: "Course Completed", description: "Congratulations on completing the course!" });
  };

  const handleQaResponse = (response: string) => {
    setQaHistory((prev) => [response, ...prev].slice(0, 10));
  };

  const MAX_HISTORY_LENGTH = 200;
  const getTruncatedText = (text: string) => text.length <= MAX_HISTORY_LENGTH ? text : text.slice(0, MAX_HISTORY_LENGTH - 3) + "...";

  return (
    <DashboardLayout title={course.title} breadcrumbs={[{ label: "Courses", href: "/courses" }, { label: course.title }]}>
      <div className="space-y-6">
        <CourseHeader course={course} courseProgress={courseProgress} />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            <Tabs defaultValue="presentation">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="presentation">Presentation</TabsTrigger>
                <TabsTrigger value="exercises">Exercises</TabsTrigger>
                <TabsTrigger value="resources">Resources</TabsTrigger>
              </TabsList>
              <TabsContent value="presentation">
                <AvatarPresentation courseId={courseId || "1"} courseTitle={course.title} onComplete={handleCourseComplete} />
              </TabsContent>
              <TabsContent value="exercises">
                <CourseExercises courseId={courseId || "1"} />
              </TabsContent>
              <TabsContent value="resources">
                <CourseResources />
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-6">
            <CourseLessons lessons={course.lessons} />
            <CourseStats courseProgress={courseProgress} />

            {/* Embedded AI Chat Assistant */}
            {user?.role === "learner" && (
              <Chatbot
                courseId={courseId}
                onResponse={handleQaResponse}
                size="lg"
                embedded={true}
              />
            )}

            {/* Q/A History moved below chat */}
            {qaHistory.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Q/A History</h3>
                <p className="text-sm text-muted-foreground">
                  {qaHistory.length > 3 ? `Showing ${showFullHistory ? qaHistory.length : 3} of ${qaHistory.length}` : "Recent interactions"}
                </p>
                {qaHistory
                  .slice(0, showFullHistory ? qaHistory.length : 3)
                  .map((item, index) => (
                    <div key={index} className="p-2 bg-muted rounded-lg border">
                      <p className="text-sm break-words">{getTruncatedText(item)}</p>
                    </div>
                  ))}
                {qaHistory.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFullHistory(!showFullHistory)}
                  >
                    {showFullHistory ? "Show Less" : "Show Full History"}
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CourseView;