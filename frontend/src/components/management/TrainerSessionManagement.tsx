import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Edit, Trash2, Eye } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Session, Course, Group } from "@/models";
import sessionService from "@/lib/services/sessionService";
import formationService from "@/lib/services/formationService";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate, useParams } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { contentService } from "@/lib/services/contentService";
import PresentationComponent from "@/components/presentation/PresentationComponent";

interface CourseContent {
  language: string;
  topic: string;
  level: string;
  axes: string[];
}

interface SlideWithAudio {
  id: number;
  title: string;
  slide: string;
  audio: string;
}

interface SortableItemProps {
  id: string;
  value: string;
}

const SortableItem = ({ id, value }: SortableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className="flex items-center justify-between bg-gray-100 p-2 mb-2 rounded-md"
    >
      <span>{value}</span>
      <Button
        variant="ghost"
        size="sm"
        disabled
      >
        <Trash2 className="h-4 w-4 text-red-500" />
      </Button>
    </div>
  );
};

const TrainerSessionManagement = () => {
  const { user, logout, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams<{ id?: string }>(); // For handling /presentation/:id route
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [courseContent, setCourseContent] = useState<CourseContent>({
    language: "en",
    topic: "",
    level: "beginner",
    axes: [],
  });
  const [newAxis, setNewAxis] = useState("");
  const [isPreparing, setIsPreparing] = useState(false);
  const [preparationTime, setPreparationTime] = useState<number | null>(null);
  const [slidesWithAudio, setSlidesWithAudio] = useState<SlideWithAudio[]>([]);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [activeTab, setActiveTab] = useState("pending");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      const [sessionsData, coursesData, groupsData] = await Promise.all([
        sessionService.getSessions(),
        formationService.getCourses(),
        sessionService.getGroups(),
      ]);
      const trainerSessions = sessionsData.filter((s) => s.teacher_id === user?.id);
      setSessions(trainerSessions);
      setCourses(coursesData);
      setGroups(groupsData);
      setError(null);
    } catch (err: unknown) {
      const axiosError = err as AxiosError<{ detail?: string | { type: string; msg: string }[] }>;
      const errorMessage =
        typeof axiosError.response?.data?.detail === "string"
          ? axiosError.response.data.detail
          : axiosError.response?.data?.detail?.map((d) => d.msg).join(", ") ||
            axiosError.message ||
            "Failed to fetch data";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role !== "trainer") {
      setError("Access denied: Trainer role required");
      setLoading(false);
      navigate("/");
      return;
    }
    refreshData();
  }, [user, authLoading, logout, navigate, refreshData]);

  useEffect(() => {
    if (id) {
      // Load presentation for validated session
      const session = sessions.find((s) => s.id === Number(id));
      if (session) {
        setSelectedSession(session);
        loadSlides(session.id.toString());
      } else {
        navigate("/sessions"); // Redirect if session not found
      }
    }
  }, [id, sessions, navigate]);

  const loadSlides = async (sessionId: string) => {
    setAudioLoading(true);
    setAudioError(false);
    try {
      const slidesResponse = await contentService.getPresentationData(sessionId);
      const slidesArray = slidesResponse.slides?.slides || [];
      if (!slidesArray.length) {
        throw new Error("No slides found in presentation data");
      }

      const slidePromises = slidesArray.map((slide: any, index: number) => {
        const slideNumber = index + 1;
        return Promise.all([
          contentService.getSlideHtml(sessionId, slideNumber).catch(err => `<p>Error loading Slide ${slideNumber} Content</p>`),
          contentService.getSlideAudio(sessionId, slideNumber).catch(err => ""),
        ]).then(([slideHtml, audioUrl]) => ({
          id: slideNumber,
          title: slide.title || `Slide ${slideNumber}`,
          slide: slideHtml,
          audio: audioUrl || "",
        }));
      });

      const slideAudioPairs = await Promise.all(slidePromises);
      setSlidesWithAudio(slideAudioPairs.filter(slide => slide.slide !== `<p>Error loading Slide ${slide.id} Content</p>`));
    } catch (error) {
      console.log("Failed to load presentation data, falling back to individual slides");
      const maxSlides = 10;
      const fallbackSlides = await Promise.all(
        Array.from({ length: maxSlides }, (_, index) => {
          const slideNumber = index + 1;
          return Promise.all([
            contentService.getSlideHtml(sessionId, slideNumber).catch(err => slideNumber > 2 ? null : `<p>Error loading Slide ${slideNumber} Content</p>`),
            contentService.getSlideAudio(sessionId, slideNumber).catch(err => ""),
          ]).then(([slideHtml, audioUrl]) => {
            if (slideHtml && slideHtml !== `<p>Error loading Slide ${slideNumber} Content</p>`) {
              return {
                id: slideNumber,
                title: `Slide ${slideNumber}`,
                slide: slideHtml,
                audio: audioUrl || "",
              };
            }
            return null;
          });
        })
      );
      setSlidesWithAudio(fallbackSlides.filter(slide => slide !== null));
    } finally {
      setAudioLoading(false);
    }
  };

  const handleSelectSession = (session: Session) => {
    const course = courses.find((c) => c.id === session.course_id);
    setSelectedSession(session);
    setCourseContent({
      language: session.language || "en",
      topic: course?.title || session.topic || "",
      level: session.level || "beginner",
      axes: session.axes || [],
    });
    setNewAxis("");
    setSlidesWithAudio([]);
    setCurrentSlide(0);
    setIsPlaying(false);
    setProgress(0);
    setIsAvatarSpeaking(false);
    setVolume(1);
    setIsMuted(false);
    setAudioError(false);
    setAudioLoading(false);
    setCurrentStep(2);
    setActiveTab("pending");
  };

  const handlePrepareContent = async () => {
    if (!courseContent.topic || courseContent.axes.length === 0) {
      setError("Please select a topic and at least one axis");
      return;
    }
    setIsPreparing(true);
    setPreparationTime(30);
    setError(null);

    const timer = setInterval(() => {
      setPreparationTime((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    setTimeout(async () => {
      clearInterval(timer);
      setIsPreparing(false);
      setPreparationTime(null);

      if (selectedSession) {
        await sessionService.updateSession(selectedSession.id, {
          ...selectedSession,
          level: courseContent.level,
          topic: courseContent.topic,
          axes: courseContent.axes,
          content_generated: true,
          language: courseContent.language,
        });

        try {
          await contentService.generatePresentation(selectedSession.id.toString(), {
            language: courseContent.language,
            topic: courseContent.topic,
            level: courseContent.level,
            axes: courseContent.axes,
          });
        } catch (error) {
          setError("Failed to trigger content generation");
        }
      }
      setCurrentStep(4);
    }, 30000);
  };

  const handleValidateContent = () => {
    if (slidesWithAudio.length > 0) {
      selectedSession &&
        sessionService.updateSession(selectedSession.id, {
          ...selectedSession,
          status: "VALIDATED",
          content_generated: true,
          level: courseContent.level,
          topic: courseContent.topic,
          axes: courseContent.axes,
          language: courseContent.language,
        });
      setSelectedSession(null);
      setCurrentStep(1);
      setActiveTab("validated");
      refreshData();
    } else {
      setError("Content preparation is not complete");
    }
  };

  const handleCancelContent = () => {
    if (selectedSession) {
      const course = courses.find((c) => c.id === selectedSession.course_id);
      setCourseContent({
        language: selectedSession.language || "en",
        topic: course?.title || selectedSession.topic || "",
        level: selectedSession.level || "beginner",
        axes: selectedSession.axes || [],
      });
    } else {
      setCourseContent({ language: "en", topic: "", level: "beginner", axes: [] });
    }
    setNewAxis("");
    setSlidesWithAudio([]);
    setCurrentSlide(0);
    setIsPlaying(false);
    setProgress(0);
    setIsAvatarSpeaking(false);
    setVolume(1);
    setIsMuted(false);
    setAudioError(false);
    setAudioLoading(false);
    setCurrentStep(1);
    setActiveTab("pending");
    setError(null);
  };

  const handleNextStep = () => {
    if (currentStep === 2 && (!courseContent.topic || courseContent.axes.length === 0)) {
      setError("Please complete all fields before proceeding");
      return;
    }
    if (currentStep === 2) setCurrentStep(3);
    if (currentStep === 3) handlePrepareContent();
  };

  const handleBackStep = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else navigate("/sessions"); // Back to sessions list from presentation view
  };

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setCourseContent((prev) => {
        const oldIndex = prev.axes.findIndex((axis) => axis === active.id);
        const newIndex = prev.axes.findIndex((axis) => axis === over.id);
        return {
          ...prev,
          axes: arrayMove(prev.axes, oldIndex, newIndex),
        };
      });
    }
  };

  useEffect(() => {
    if (currentStep === 4 && selectedSession && !id) {
      const sessionId = selectedSession.id.toString();
      loadSlides(sessionId);
    }
  }, [currentStep, selectedSession, id]);

  return (
    <DashboardLayout title={id ? `${courses.find((c) => c.id === selectedSession?.course_id)?.title || "Presentation"}` : "My Sessions"} breadcrumbs={id ? [{ label: "Dashboard" }, { label: `${courses.find((c) => c.id === selectedSession?.course_id)?.title || "Presentation"}` }] : [{ label: "Dashboard" }, { label: "My Sessions" }]}>
      {!id && (
        <div className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList>
              <TabsTrigger value="pending">Pending Sessions</TabsTrigger>
              <TabsTrigger value="validated">Validated Sessions</TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Pending Sessions</CardTitle>
                    <CardDescription>Select a session to prepare content</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {!loading && !error && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sessions
                          .filter((s) => s.status === "PENDING")
                          .map((session) => (
                            <Card key={session.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader>
                                <CardTitle>{courses.find((c) => c.id === session.course_id)?.title || "Unknown Course"}</CardTitle>
                                <CardDescription>Start Date: {new Date(session.start_date).toLocaleDateString()}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-600">Groups: {session.group_ids.map((id) => groups.find((g) => g.id === Number(id))?.name).join(", ") || "None"}</p>
                                <p className="text-sm text-gray-600">Level: {session.level || "Not set"}</p>
                                <p className="text-sm text-gray-600">Topic: {session.topic || "Not set"}</p>
                                <p className="text-sm text-gray-600">Axes: {session.axes?.join(", ") || "None"}</p>
                                <p className="text-sm text-gray-600">Language: {session.language || "en"}</p>
                                <p className="text-sm text-gray-600">Content Generated: {session.content_generated ? "Yes" : "No"}</p>
                                <Button
                                  size="sm"
                                  className="mt-4 w-full"
                                  onClick={() => handleSelectSession(session)}
                                  disabled={!!selectedSession}
                                >
                                  <Play className="h-4 w-4 mr-2" />
                                  Select
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="validated">
              {currentStep === 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Validated Sessions</CardTitle>
                    <CardDescription>Review your completed sessions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading && <Loader2 className="h-6 w-6 animate-spin mx-auto" />}
                    {error && (
                      <Alert variant="destructive" className="mb-4">
                        <AlertDescription>{error}</AlertDescription>
                      </Alert>
                    )}
                    {!loading && !error && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sessions
                          .filter((s) => s.status === "VALIDATED" || s.status ==="AVAILABLE")
                          .map((session) => (
                            <Card key={session.id} className="hover:shadow-lg transition-shadow">
                              <CardHeader>
                                <CardTitle>{courses.find((c) => c.id === session.course_id)?.title || "Unknown Course"}</CardTitle>
                                <CardDescription>Start Date: {new Date(session.start_date).toLocaleDateString()}</CardDescription>
                              </CardHeader>
                              <CardContent>
                                <p className="text-sm text-gray-600">Groups: {session.group_ids.map((id) => groups.find((g) => g.id === Number(id))?.name).join(", ") || "None"}</p>
                                <p className="text-sm text-gray-600">Level: {session.level || "Not set"}</p>
                                <p className="text-sm text-gray-600">Topic: {session.topic || "Not set"}</p>
                                <p className="text-sm text-gray-600">Axes: {session.axes?.join(", ") || "None"}</p>
                                <p className="text-sm text-gray-600">Language: {session.language || "en"}</p>
                                <p className="text-sm text-gray-600">Content Generated: {session.content_generated ? "Yes" : "No"}</p>
                                <Button
                                  size="sm"
                                  className="mt-4 w-full"
                                  onClick={() => navigate(`/presentation/${session.id}`)}
                                  disabled={!session.id}
                                >
                                  <Eye className="h-4 w-4 mr-2" />
                                  View
                                </Button>
                              </CardContent>
                            </Card>
                          ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {!id && selectedSession && (
            <div className="flex justify-between items-center mb-6">
              <div className="flex-1 h-1 bg-gray-200 rounded-full">
                <div
                  className="h-1 bg-blue-600 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep - 1) / 3) * 100}%` }}
                ></div>
              </div>
              <div className="flex space-x-4 ml-4">
                <div className={`flex flex-col items-center ${currentStep === 1 ? "text-blue-600" : "text-gray-500"}`}>
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                    {currentStep > 1 ? <span className="text-white text-sm">✓</span> : <span className="text-sm">1</span>}
                  </div>
                  <span className="text-xs mt-1">Select Session</span>
                </div>
                <div className={`flex flex-col items-center ${currentStep === 2 ? "text-blue-600" : "text-gray-500"}`}>
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                    {currentStep > 2 ? <span className="text-white text-sm">✓</span> : <span className="text-sm">2</span>}
                  </div>
                  <span className="text-xs mt-1">Define Content</span>
                </div>
                <div className={`flex flex-col items-center ${currentStep === 3 ? "text-blue-600" : "text-gray-500"}`}>
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                    {currentStep > 3 ? <span className="text-white text-sm">✓</span> : <span className="text-sm">3</span>}
                  </div>
                  <span className="text-xs mt-1">Prepare Content</span>
                </div>
                <div className={`flex flex-col items-center ${currentStep === 4 ? "text-blue-600" : "text-gray-500"}`}>
                  <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
                    {currentStep > 4 ? <span className="text-white text-sm">✓</span> : <span className="text-sm">4</span>}
                  </div>
                  <span className="text-xs mt-1">Validate & Play</span>
                </div>
              </div>
            </div>
          )}

          {!id && selectedSession && (
            <>
              {currentStep === 2 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Define Content for {courses.find((c) => c.id === selectedSession.course_id)?.title}</CardTitle>
                    <CardDescription>Specify the course structure</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid gap-4">
                      <div>
                        <Label htmlFor="language">Language</Label>
                        <Select
                          value={courseContent.language}
                          onValueChange={(value) => setCourseContent({ ...courseContent, language: value })}
                        >
                          <SelectTrigger id="language">
                            <SelectValue placeholder="Select Language" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="es">Spanish</SelectItem>
                            <SelectItem value="it">Italian</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="topic">Topic</Label>
                        <Input
                          id="topic"
                          value={courseContent.topic}
                          onChange={(e) => setCourseContent({ ...courseContent, topic: e.target.value })}
                          placeholder="e.g., Java"
                        />
                      </div>
                      <div>
                        <Label htmlFor="level">Level</Label>
                        <Select
                          value={courseContent.level}
                          onValueChange={(value) => setCourseContent({ ...courseContent, level: value })}
                        >
                          <SelectTrigger id="level">
                            <SelectValue placeholder="Select Level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="beginner">Beginner</SelectItem>
                            <SelectItem value="intermediate">Intermediate</SelectItem>
                            <SelectItem value="advanced">Advanced</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="axes">Axes</Label>
                        <DndContext
                          sensors={sensors}
                          collisionDetection={closestCenter}
                          onDragEnd={handleDragEnd}
                          modifiers={[restrictToVerticalAxis]}
                        >
                          <SortableContext items={courseContent.axes}>
                            <div className="space-y-2">
                              {courseContent.axes.map((axis) => (
                                <SortableItem key={axis} id={axis} value={axis} />
                              ))}
                            </div>
                          </SortableContext>
                        </DndContext>
                        <Input
                          id="newAxis"
                          value={newAxis}
                          onChange={(e) => setNewAxis(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && newAxis.trim()) {
                              e.preventDefault();
                              setCourseContent({
                                ...courseContent,
                                axes: [...courseContent.axes, newAxis.trim()],
                              });
                              setNewAxis("");
                            }
                          }}
                          placeholder="Type and press Enter to add a new axis"
                          className="mt-2"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handleBackStep} disabled={currentStep === 1}>
                        Back
                      </Button>
                      <Button onClick={handleNextStep} disabled={isPreparing}>
                        Next
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 3 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Prepare Content for {courses.find((c) => c.id === selectedSession.course_id)?.title}</CardTitle>
                    <CardDescription>Generating course materials</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6 text-center">
                    {isPreparing ? (
                      <>
                        <Loader2 className="h-12 w-12 animate-spin mx-auto" />
                        <p>Preparing content... {preparationTime}s remaining</p>
                      </>
                    ) : (
                      <p>Content preparation is complete. Ready to review.</p>
                    )}
                    <div className="flex justify-between">
                      <Button variant="outline" onClick={handleBackStep}>
                        Back
                      </Button>
                      <Button onClick={handleNextStep} disabled={isPreparing}>
                        Next
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentStep === 4 && (
                <>
                  <PresentationComponent
                    slidesWithAudio={slidesWithAudio}
                    currentSlide={currentSlide}
                    setCurrentSlide={setCurrentSlide}
                    isPlaying={isPlaying}
                    setIsPlaying={setIsPlaying}
                    progress={progress}
                    setProgress={setProgress}
                    isAvatarSpeaking={isAvatarSpeaking}
                    setIsAvatarSpeaking={setIsAvatarSpeaking}
                    volume={volume}
                    setVolume={setVolume}
                    isMuted={isMuted}
                    setIsMuted={setIsMuted}
                    audioError={audioError}
                    setAudioError={setAudioError}
                    audioLoading={audioLoading}
                    setAudioLoading={setAudioLoading}
                    courses={courses}
                    selectedSession={selectedSession}
                  />
                  <div className="flex justify-between mt-4">
                    <Button variant="outline" onClick={handleBackStep}>
                      Back
                    </Button>
                    <div className="space-x-4">
                      <Button variant="destructive" onClick={handleCancelContent}>
                        <Edit className="h-4 w-4 mr-2" />
                        Cancel & Recustomize
                      </Button>
                      <Button onClick={handleValidateContent}>
                        <Play className="h-4 w-4 mr-2" />
                        Validate & Play
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}

      {id && selectedSession && (
        <>
          <PresentationComponent
            slidesWithAudio={slidesWithAudio}
            currentSlide={currentSlide}
            setCurrentSlide={setCurrentSlide}
            isPlaying={isPlaying}
            setIsPlaying={setIsPlaying}
            progress={progress}
            setProgress={setProgress}
            isAvatarSpeaking={isAvatarSpeaking}
            setIsAvatarSpeaking={setIsAvatarSpeaking}
            volume={volume}
            setVolume={setVolume}
            isMuted={isMuted}
            setIsMuted={setIsMuted}
            audioError={audioError}
            setAudioError={setAudioError}
            audioLoading={audioLoading}
            setAudioLoading={setAudioLoading}
            courses={courses}
            selectedSession={selectedSession}
          />
          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => navigate("/sessions")}>
              Back
            </Button>
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default TrainerSessionManagement;