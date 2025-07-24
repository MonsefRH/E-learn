import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Edit, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Session, Course, Group } from "@/models";
import sessionService from "@/lib/services/sessionService";
import formationService from "@/lib/services/formationService";
import { AxiosError } from "axios";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
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
import { Progress } from "@radix-ui/react-progress";

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
  if (currentStep === 4 && selectedSession) {
    const sessionId = selectedSession.id.toString();
    const loadSlides = async () => {
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
            contentService.getSlideHtml(sessionId, slideNumber).catch(err => {
              return `<p>Error loading Slide ${slideNumber} Content</p>`;
            }),
            contentService.getSlideAudio(sessionId, slideNumber).catch(err => {
              return "";
            })
          ]).then(([slideHtml, audioUrl]) => ({
            id: slideNumber,
            title: slide.title || `Slide ${slideNumber}`,
            slide: slideHtml,
            audio: audioUrl || ""
          }));
        });

        const slideAudioPairs = await Promise.all(slidePromises);
        setSlidesWithAudio(slideAudioPairs.filter(slide => slide.slide !== `<p>Error loading Slide ${slide.id} Content</p>`));
      } catch (error) {
        setError("Failed to load presentation data, falling back to individual slides");
        const maxSlides = 10; // Adjust this based on your platform's maximum slide limit
        const fallbackSlides = await Promise.all(
          Array.from({ length: maxSlides }, (_, index) => {
            const slideNumber = index + 1;
            return Promise.all([
              contentService.getSlideHtml(sessionId, slideNumber).catch(err => {
                return slideNumber > 2 ? null : `<p>Error loading Slide ${slideNumber} Content</p>`; // Stop after 2 errors
              }),
              contentService.getSlideAudio(sessionId, slideNumber).catch(err => "")
            ]).then(([slideHtml, audioUrl]) => {
              if (slideHtml && slideHtml !== `<p>Error loading Slide ${slideNumber} Content</p>`) {
                return {
                  id: slideNumber,
                  title: `Slide ${slideNumber}`,
                  slide: slideHtml,
                  audio: audioUrl || ""
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
    loadSlides();
  }
}, [currentStep, selectedSession]);

  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    const audio = audioRef.current;
    audio.volume = volume;
    audio.muted = isMuted;

    const handleLoadStart = () => { setAudioLoading(true); setAudioError(false); };
    const handleCanPlay = () => { setAudioLoading(false); setAudioError(false); };
    const handlePlay = () => { setIsAvatarSpeaking(true); setIsPlaying(true); };
    const handlePause = () => { setIsAvatarSpeaking(false); setIsPlaying(false); };
    const handleEnded = () => {
      setIsAvatarSpeaking(false);
      setIsPlaying(false);
      setProgress(100);
      if (currentSlide < slidesWithAudio.length - 1) {
        setTimeout(() => {
          setCurrentSlide(prev => prev + 1);
          setProgress(0);
          if (audioRef.current && !audioError && !audioLoading) {
            audioRef.current.play().catch(() => {});
          }
        }, 1000);
      }
    };
    const handleTimeUpdate = () => {
      if (audio.duration && audio.currentTime) {
        setProgress((audio.currentTime / audio.duration) * 100);
      }
    };
    const handleError = () => { setAudioError(true); setAudioLoading(false); setIsAvatarSpeaking(false); setIsPlaying(false); };

    audio.addEventListener("loadstart", handleLoadStart);
    audio.addEventListener("canplay", handleCanPlay);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("error", handleError);

    return () => {
      audio.removeEventListener("loadstart", handleLoadStart);
      audio.removeEventListener("canplay", handleCanPlay);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("error", handleError);
    };
  }, [currentSlide, slidesWithAudio.length, volume, isMuted]);

  useEffect(() => {
    if (slidesWithAudio.length > 0 && !audioError && !audioLoading) {
      setAudioLoading(true);
      setAudioError(false);
      if (audioRef.current) {
        if (audioRef.current.src && audioRef.current.src.startsWith("blob:")) {
          URL.revokeObjectURL(audioRef.current.src);
        }
        audioRef.current.src = slidesWithAudio[currentSlide].audio || "";
        audioRef.current.load();
      }
    }
  }, [currentSlide, slidesWithAudio]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  const handlePlay = async () => {
    if (!audioRef.current || audioError || audioLoading) return;
    try {
      await audioRef.current.play();
    } catch {
      setAudioError(true);
      setIsPlaying(false);
    }
  };

  const handlePause = () => {
    if (audioRef.current) audioRef.current.pause();
  };

  const handleNext = () => {
    if (currentSlide < slidesWithAudio.length - 1) setCurrentSlide(currentSlide + 1);
  };

  const handlePrevious = () => {
    if (currentSlide > 0) setCurrentSlide(currentSlide - 1);
  };

  const handleSlideNavigation = (index: number) => {
    setCurrentSlide(index);
  };

  const handleVolumeToggle = () => setIsMuted(!isMuted);
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (newVolume > 0) setIsMuted(false);
  };

  const getAudioStatus = () => {
    if (audioLoading) return { text: "Loading audio...", color: "text-yellow-600", icon: "⏳" };
    if (audioError) return { text: "Audio unavailable", color: "text-red-500", icon: "⚠" };
    return { text: "Audio ready", color: "text-green-600", icon: "🔊" };
  };

  const audioStatus = getAudioStatus();

  return (
    <DashboardLayout title="My Sessions" breadcrumbs={[{ label: "Dashboard" }, { label: "My Sessions" }]}>
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
                        .filter((s) => s.status === "VALIDATED")
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
                                <Play className="h-4 w-4 mr-2" />
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

        {selectedSession && (
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

        {selectedSession && (
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
              <div className="max-w-6xl mx-auto space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle className="text-2xl">{courses.find((c) => c.id === selectedSession.course_id)?.title}</CardTitle>
                        <p className="text-muted-foreground">
                          Slide {currentSlide + 1} of {slidesWithAudio.length}
                          {audioError && " • Audio unavailable"}
                          {audioLoading && " • Loading audio..."}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                    <Card className="h-[700px] lg:h-[85vh] xl:h-[80vh]">
                      <CardContent className="p-0 h-full relative overflow-hidden">
                        {slidesWithAudio.length > 0 ? (
                          <iframe
                            key={currentSlide}
                            ref={iframeRef}
                            srcDoc={slidesWithAudio[currentSlide].slide}
                            className="w-full h-full rounded-lg border-0"
                            title={`Slide ${currentSlide + 1}`}
                            sandbox="allow-scripts allow-same-origin"
                            style={{ minHeight: "650px", backgroundColor: "transparent", transform: "scale(0.95)", transformOrigin: "top left" }}
                          />
                        ) : (
                          <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                            <div className="text-center">
                              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                              <p className="text-gray-500">Loading slide content...</p>
                            </div>
                          </div>
                        )}
                        <div className="absolute top-4 right-4 z-10">
                          <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold transition-all duration-300 shadow-lg ${isAvatarSpeaking ? "scale-110 animate-pulse shadow-blue-500/50" : "scale-100"}`}>
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7V9C15 11.8 12.8 14 10 14V16H14V22H10V16H6V14C3.2 14 1 11.8 1 9V7H3V9C3 10.7 4.3 12 6 12S9 10.7 9 12V9H21Z"/>
                            </svg>
                          </div>
                          {isAvatarSpeaking && (
                            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce shadow-sm"></div>
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: "0.1s" }}></div>
                              <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: "0.2s" }}></div>
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/20 to-transparent">
                          <Progress value={progress} className="h-2 bg-white/20" />
                          <div className="flex justify-between text-xs text-white/80 mt-2 font-medium">
                            <span className="bg-black/30 px-2 py-1 rounded">{Math.round(progress)}%</span>
                            <span className="bg-black/30 px-2 py-1 rounded">
                              {audioRef.current?.duration
                                ? `${Math.floor(audioRef.current.currentTime || 0)}s / ${Math.floor(audioRef.current.duration)}s`
                                : "0s / 0s"}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => iframeRef.current?.requestFullscreen?.()}
                          className="absolute top-4 left-4 z-10 bg-black/20 hover:bg-black/40 text-white p-2 rounded-lg transition-colors"
                          title="Fullscreen"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                          </svg>
                        </button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-center space-x-4">
                          <Button variant="outline" size="icon" onClick={handlePrevious} disabled={currentSlide === 0}>
                            <SkipBack className="h-4 w-4" />
                          </Button>
                          {!isPlaying ? (
                            <Button onClick={handlePlay} size="lg" disabled={!slidesWithAudio[currentSlide] || audioError || audioLoading}>
                              <Play className="h-5 w-5 mr-2" />
                              {audioLoading ? "Loading..." : "Play"}
                            </Button>
                          ) : (
                            <Button onClick={handlePause} size="lg" variant="outline">
                              <Pause className="h-5 w-5 mr-2" />
                              Pause
                            </Button>
                          )}
                          <Button variant="outline" size="icon" onClick={handleNext} disabled={currentSlide === slidesWithAudio.length - 1}>
                            <SkipForward className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" onClick={handleVolumeToggle}>
                            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                          </Button>
                          <div className="flex items-center space-x-2">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.1"
                              value={isMuted ? 0 : volume}
                              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                              className="w-20"
                            />
                            <span className="text-xs text-gray-500">{Math.round((isMuted ? 0 : volume) * 100)}%</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  <div className="space-y-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">{slidesWithAudio[currentSlide]?.title || "No Title"}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <h4 className="font-semibold text-sm mb-2">Audio Status:</h4>
                          <p className="text-xs text-gray-600 italic"><span className={audioStatus.color}>{audioStatus.icon}</span> {audioStatus.text}</p>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">Slides</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {slidesWithAudio.map((slide, index) => (
                            <button
                              key={slide.id}
                              onClick={() => handleSlideNavigation(index)}
                              className={`w-full text-left p-2 rounded text-sm transition-colors ${index === currentSlide ? "bg-primary text-primary-foreground" : "hover:bg-gray-100"}`}
                            >
                              {index + 1}. {slide.title}
                            </button>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
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
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TrainerSessionManagement;