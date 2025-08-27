import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { BookOpen, Play, Award, Clock, Star, TrendingUp, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import sessionService from "@/lib/services/sessionService";
import userService from "@/lib/services/userService";
import { Session } from "@/models";

const LearnerDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [enrolledSessions, setEnrolledSessions] = useState<Session[]>([]);
  const [availableSessions, setAvailableSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch all sessions
        const allSessions = await sessionService.getSessions();

        // Fetch user's groups
        const groups = await userService.getGroups();
        const userGroups = groups.filter((group) =>
          group.user_ids?.includes(user.id)
        );

        // Filter sessions where the user is a member of at least one group
        const userGroupIds = userGroups.map((group) => group.id);
        const filteredSessions = allSessions.filter((session) =>
          session.group_ids.some((groupId) => userGroupIds.includes(groupId))
        );

        // Separate into enrolled (in progress) and available sessions
        const enrolled = filteredSessions.filter(
          (session) => session.status === "VALIDATED"
        );
        const available = filteredSessions.filter(
          (session) => session.status === "AVAILABLE"
        );

        setEnrolledSessions(enrolled);
        setAvailableSessions(available);
      } catch (err) {
        setError("Failed to fetch sessions or groups");
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [user?.id]);

  const handleStartSession = (sessionId: number) => {
    navigate(`/mysession/${sessionId}`);
  };

  return (
    <DashboardLayout
      title="My Learning Dashboard"
      breadcrumbs={[{ label: "Dashboard" }]}
    >
      {loading && <div className="text-center py-4">Loading...</div>}
      {error && <div className="text-center py-4 text-red-500">{error}</div>}

      {!loading && !error && (
        <>
          {/* Learning Progress Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Sessions in Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{enrolledSessions.length}</div>
                <p className="text-sm text-muted-foreground">Keep learning!</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Average Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {enrolledSessions.length > 0
                    ? Math.round(
                        enrolledSessions.reduce((acc, session) => acc + (session.progress || 0), 0) /
                        enrolledSessions.length
                      )
                    : 0}
                  %
                </div>
                <p className="text-sm text-muted-foreground">Across all sessions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Lessons Completed</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {enrolledSessions.reduce((acc, session) => acc + (session.completedLessons || 0), 0)}
                </div>
                <p className="text-sm text-muted-foreground">Total lessons finished</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="current" className="space-y-4">
            <TabsList>
              <TabsTrigger value="current">Current Sessions</TabsTrigger>
              <TabsTrigger value="discover">Discover</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
            </TabsList>

            <TabsContent value="current" className="space-y-4">
              <div className="grid gap-6">
                {enrolledSessions.map((session) => (
                  <Card key={session.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-xl">{session.topic || "Untitled Session"}</CardTitle>
                          <CardDescription>Instructor: {session.teacher_id ? `Teacher ${session.teacher_id}` : "Unknown"}</CardDescription>
                        </div>
                        <Badge variant="secondary">
                          {session.completedLessons || 0}/{session.totalLessons || 0} lessons
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <div className="flex justify-between text-sm mb-2">
                          <span>Progress</span>
                          <span>{session.progress || 0}%</span>
                        </div>
                        <Progress value={session.progress || 0} className="h-2" />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">Next: {session.nextLesson || "Start Session"}</p>
                          <p className="text-sm text-muted-foreground">Continue where you left off</p>
                        </div>
                        <div className="flex space-x-2">
                          <Button onClick={() => handleStartSession(session.id)}>
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
                  <CardTitle>Recommended Sessions</CardTitle>
                  <CardDescription>Sessions you can join based on your groups</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {availableSessions.map((session) => (
                      <Card key={session.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">{session.topic || "Untitled Session"}</CardTitle>
                          <CardDescription>by Teacher {session.teacher_id}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span>{session.rating || 4.5}</span> {/* Default rating if not set */}
                            </div>
                            <span className="text-muted-foreground">{session.students || 0} students</span>
                          </div>
                          <Button className="w-full" onClick={() => handleStartSession(session.id)}>
                            <BookOpen className="mr-2 h-4 w-4" />
                            Join Now
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
                      <h4 className="font-semibold">First Session</h4>
                      <p className="text-xs text-muted-foreground">Completed your first session</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg">
                      <div className="text-2xl mb-2">⚡</div>
                      <h4 className="font-semibold">Quick Learner</h4>
                      <p className="text-xs text-muted-foreground">5 lessons in one day</p>
                    </div>
                    <div className="text-center p-4 border rounded-lg opacity-50">
                      <div className="text-2xl mb-2">🎯</div>
                      <h4 className="font-semibold">Focused</h4>
                      <p className="text-xs text-muted-foreground">Complete 3 sessions</p>
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
        </>
      )}
    </DashboardLayout>
  );
};

export default LearnerDashboard;