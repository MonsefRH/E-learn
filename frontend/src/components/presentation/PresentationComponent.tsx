import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@radix-ui/react-progress";
import { SkipBack, SkipForward, Play, Pause, Volume2, VolumeX } from "lucide-react";

interface SlideWithAudio {
  id: number;
  title: string;
  slide: string;
  audio: string;
}

interface PresentationComponentProps {
  slidesWithAudio: SlideWithAudio[];
  currentSlide: number;
  setCurrentSlide: (index: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  progress: number;
  setProgress: (progress: number) => void;
  isAvatarSpeaking: boolean;
  setIsAvatarSpeaking: (speaking: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
  isMuted: boolean;
  setIsMuted: (muted: boolean) => void;
  audioError: boolean;
  setAudioError: (error: boolean) => void;
  audioLoading: boolean;
  setAudioLoading: (loading: boolean) => void;
  courses: any[];
  selectedSession: any;
}

const PresentationComponent = ({
  slidesWithAudio,
  currentSlide,
  setCurrentSlide,
  isPlaying,
  setIsPlaying,
  progress,
  setProgress,
  isAvatarSpeaking,
  setIsAvatarSpeaking,
  volume,
  setVolume,
  isMuted,
  setIsMuted,
  audioError,
  setAudioError,
  audioLoading,
  setAudioLoading,
  courses,
  selectedSession,
}: PresentationComponentProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

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
    </div>
  );
};

export default PresentationComponent;