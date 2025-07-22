import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, MessageCircle } from "lucide-react";
import {contentService} from "@/lib/services/contentService.ts";
import {API_URL} from "@/lib/api.ts";

interface Slide {
    id: number;
    title: string;
    script: string;
}

interface AvatarPresentationProps {
    courseId: string;
    courseTitle: string;
    onComplete?: () => void;
}

const AvatarPresentation = ({ courseId, courseTitle, onComplete }: AvatarPresentationProps) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isAvatarSpeaking, setIsAvatarSpeaking] = useState(false);
    const [currentSlideHtml, setCurrentSlideHtml] = useState<string>("");
    const [slides, setSlides] = useState<Slide[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [audioError, setAudioError] = useState(false);
    const [audioLoading, setAudioLoading] = useState(false);

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Load slides data from API
    useEffect(() => {
        const loadPresentationData = async () => {
            try {
                setIsLoading(true);
                console.log('Loading presentation data for course:', courseId);

                const slidesUrl = `${API_URL}/slides/api/presentations/1/slides`;
                console.log('Fetching slides from:', slidesUrl);

                const slidesResponse = await fetch(slidesUrl);
                console.log('Slides response status:', slidesResponse.status);

                if (slidesResponse.ok) {
                    const slidesData = await slidesResponse.json();
                    console.log('Slides data received:', slidesData);

                    // Handle different JSON structures
                    const slidesArray = Array.isArray(slidesData.slides?.slides)
                        ? slidesData.slides.slides
                        : Array.isArray(slidesData.slides)
                            ? slidesData.slides
                            : Array.isArray(slidesData)
                                ? slidesData
                                : [];

                    console.log('Processed slides array:', slidesArray);
                    setSlides(slidesArray);

                    if (slidesArray.length === 0) {
                        console.warn('No slides found in the response');
                    }
                } else {
                    const errorText = await slidesResponse.text();
                    console.error('Failed to load slides data. Status:', slidesResponse.status);
                    console.error('Error response:', errorText);
                    setSlides([]);
                }
            } catch (error) {
                console.error('Error loading presentation data:', error);
                setSlides([]);
            } finally {
                setIsLoading(false);
            }
        };

        loadPresentationData();
    }, [courseId]);

    // Initialize chatbot element
    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
        }

        const audio = audioRef.current;
        audio.volume = volume;
        audio.muted = isMuted;

        const handleLoadStart = () => {
            console.log('Audio loading started');
            setAudioLoading(true);
            setAudioError(false);
        };

        const handleCanPlay = () => {
            console.log('Audio can play');
            setAudioLoading(false);
            setAudioError(false);
        };

        const handlePlay = () => {
            setIsAvatarSpeaking(true);
            setIsPlaying(true);
        };

        const handlePause = () => {
            setIsAvatarSpeaking(false);
            setIsPlaying(false);
        };

        const handleEnded = () => {
            setIsAvatarSpeaking(false);
            setIsPlaying(false);
            setProgress(100);

            // Auto-advance to next slide after a short delay
            setTimeout(() => {
                if (currentSlide < slides.length - 1) {
                    setCurrentSlide(prev => prev + 1);
                    setProgress(0);
                    // Auto-play next slide after a brief delay to allow chatbot loading
                    setTimeout(() => {
                        if (audioRef.current && !audioError && !audioLoading) {
                            audioRef.current.play().catch(error => {
                                console.error('Auto-play failed:', error);
                            });
                        }
                    }, 500);
                } else {
                    onComplete?.();
                }
            }, 1000);
        };

        const handleTimeUpdate = () => {
            if (audio.duration && audio.currentTime) {
                const progressPercent = (audio.currentTime / audio.duration) * 100;
                setProgress(progressPercent);
            }
        };

        const handleError = () => {
            console.error('Audio playback error');
            setAudioError(true);
            setAudioLoading(false);
            setIsAvatarSpeaking(false);
            setIsPlaying(false);
        };

        const handleLoadedData = () => {
            console.log('Audio data loaded');
            setAudioLoading(false);
        };

        // Add event listeners
        audio.addEventListener('loadstart', handleLoadStart);
        audio.addEventListener('canplay', handleCanPlay);
        audio.addEventListener('play', handlePlay);
        audio.addEventListener('pause', handlePause);
        audio.addEventListener('ended', handleEnded);
        audio.addEventListener('timeupdate', handleTimeUpdate);
        audio.addEventListener('error', handleError);
        audio.addEventListener('loadeddata', handleLoadedData);

        return () => {
            // Cleanup event listeners
            audio.removeEventListener('loadstart', handleLoadStart);
            audio.removeEventListener('canplay', handleCanPlay);
            audio.removeEventListener('play', handlePlay);
            audio.removeEventListener('pause', handlePause);
            audio.removeEventListener('ended', handleEnded);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('error', handleError);
            audio.removeEventListener('loadeddata', handleLoadedData);
        };
    }, [currentSlide, slides.length, volume, isMuted, onComplete]);

    // Load chatbot for current slide
    // Load chatbot for current slide
    useEffect(() => {
        const loadSlideAudio = async () => {
            if (slides.length === 0 || !audioRef.current) return;

            try {
                setAudioLoading(true);
                setAudioError(false);

                const slideNumber = currentSlide + 1;
                const audioUrl = `${API_URL}/slides/api/presentations/${courseId}/audio/${slideNumber}`;
                console.log('Loading chatbot from:', audioUrl);

                // Clean up previous blob URL if it exists
                if (audioRef.current.src && audioRef.current.src.startsWith('blob:')) {
                    URL.revokeObjectURL(audioRef.current.src);
                }

                // Set the chatbot source directly to the API endpoint
                audioRef.current.src = audioUrl;

                // Preload the chatbot
                audioRef.current.load();

                console.log('Audio URL set for slide', slideNumber);
            } catch (error) {
                console.error('Error setting chatbot source:', error);
                setAudioError(true);
                setAudioLoading(false);
            }
        };

        // Reset progress when slide changes
        setProgress(0);

        // Stop current chatbot if playing
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }

        loadSlideAudio();

        // Cleanup function to revoke blob URLs (only if they exist)
        return () => {
            if (audioRef.current?.src && audioRef.current.src.startsWith('blob:')) {
                URL.revokeObjectURL(audioRef.current.src);
            }
        };
    }, [courseId, currentSlide, slides.length]);

    // Update chatbot volume and mute state
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
            audioRef.current.muted = isMuted;
        }
    }, [volume, isMuted]);

    // Load HTML content for current slide
    useEffect(() => {
        const loadSlideHtml = async () => {
            if (slides.length === 0) return;

            try {
                const slideNumber = currentSlide + 1;

                const html = await contentService.getSlideHtml(courseId, slideNumber);
                setCurrentSlideHtml(html);
            } catch (error) {
                console.error('Error loading slide HTML:', error);
                setCurrentSlideHtml("");
            }
        };


        loadSlideHtml();
    }, [courseId, currentSlide, slides.length]);

    const handlePlay = async () => {
        if (!audioRef.current || audioError || audioLoading) {
            console.error('Audio not available for this slide');
            return;
        }

        try {
            await audioRef.current.play();
            console.log('Audio playback started');
        } catch (error) {
            console.error('Audio playback failed:', error);
            setAudioError(true);
            setIsPlaying(false);
        }
    };

    const handlePause = () => {
        if (audioRef.current) {
            audioRef.current.pause();
        }
    };

    const handleNext = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        } else {
            onComplete?.();
        }
    };

    const handlePrevious = () => {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    };

    const handleSlideNavigation = (index: number) => {
        setCurrentSlide(index);
    };

    const handleVolumeToggle = () => {
        setIsMuted(!isMuted);
    };

    const handleVolumeChange = (newVolume: number) => {
        setVolume(newVolume);
        if (newVolume > 0) {
            setIsMuted(false);
        }
    };

    const currentSlideData = slides[currentSlide];

    // Get chatbot status for display
    const getAudioStatus = () => {
        if (audioLoading) return { text: "Loading chatbot...", color: "text-yellow-600", icon: "⏳" };
        if (audioError) return { text: "Audio unavailable", color: "text-red-500", icon: "⚠" };
        return { text: "Audio ready", color: "text-green-600", icon: "🔊" };
    };

    const audioStatus = getAudioStatus();

    if (isLoading) {
        return (
            <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p>Loading presentation...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-6xl mx-auto space-y-6">
                {/* Header */}
                <Card>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-2xl">{courseTitle}</CardTitle>
                                <p className="text-muted-foreground">
                                    Slide {currentSlide + 1} of {slides.length}
                                    {audioError && " • Audio unavailable"}
                                    {audioLoading && " • Loading chatbot..."}
                                </p>
                            </div>
                            <Badge variant="outline">AI Avatar Presentation</Badge>
                        </div>
                    </CardHeader>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main Presentation Area */}
                    <div className="lg:col-span-2 space-y-4">
                        {/* HTML Presentation Display */}
                        <Card className="h-[700px] lg:h-[85vh] xl:h-[80vh]">
                            <CardContent className="p-0 h-full relative overflow-hidden">
                                {currentSlideHtml ? (
                                    <iframe
                                        key={currentSlide}
                                        ref={iframeRef}
                                        srcDoc={currentSlideHtml}
                                        className="w-full h-full rounded-lg border-0"
                                        title={`Slide ${currentSlide + 1}`}
                                        sandbox="allow-scripts allow-same-origin"
                                        style={{
                                            minHeight: '650px',
                                            backgroundColor: 'transparent',
                                            transform: 'scale(0.95)', // Légère réduction pour s'adapter
                                            transformOrigin: 'top left'
                                        }}
                                    />
                                ) : (
                                    <div className="h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center">
                                        <div className="text-center">
                                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                                            <p className="text-gray-500">Loading slide content...</p>
                                        </div>
                                    </div>
                                )}

                                {/* Avatar Overlay */}
                                <div className="absolute top-4 right-4 z-10">
                                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-sm font-bold transition-all duration-300 shadow-lg ${
                                        isAvatarSpeaking ? 'scale-110 animate-pulse shadow-blue-500/50' : 'scale-100'
                                    }`}>
                                        <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 7V9C15 11.8 12.8 14 10 14V16H14V22H10V16H6V14C3.2 14 1 11.8 1 9V7H3V9C3 10.7 4.3 12 6 12S9 10.7 9 12V9H21Z"/>
                                        </svg>
                                    </div>

                                    {/* Speaking Animation */}
                                    {isAvatarSpeaking && (
                                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce shadow-sm"></div>
                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce shadow-sm" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    )}
                                </div>

                                {/* Progress Bar */}
                                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/20 to-transparent">
                                    <Progress value={progress} className="h-2 bg-white/20" />
                                    <div className="flex justify-between text-xs text-white/80 mt-2 font-medium">
                        <span className="bg-black/30 px-2 py-1 rounded">
                            {Math.round(progress)}%
                        </span>
                                        <span className="bg-black/30 px-2 py-1 rounded">
                            {audioRef.current?.duration
                                ? `${Math.floor(audioRef.current.currentTime || 0)}s / ${Math.floor(audioRef.current.duration)}s`
                                : '0s / 0s'
                            }
                        </span>
                                    </div>
                                </div>

                                {/* Fullscreen Button */}
                                <button
                                    onClick={() => {
                                        if (iframeRef.current) {
                                            iframeRef.current.requestFullscreen?.();
                                        }
                                    }}
                                    className="absolute top-4 left-4 z-10 bg-black/20 hover:bg-black/40 text-white p-2 rounded-lg transition-colors"
                                    title="Fullscreen"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                                    </svg>
                                </button>
                            </CardContent>
                        </Card>
                        {/* Controls */}
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-center space-x-4">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handlePrevious}
                                        disabled={currentSlide === 0}
                                    >
                                        <SkipBack className="h-4 w-4" />
                                    </Button>

                                    {!isPlaying ? (
                                        <Button
                                            onClick={handlePlay}
                                            size="lg"
                                            disabled={!currentSlideData || audioError || audioLoading}
                                        >
                                            <Play className="h-5 w-5 mr-2" />
                                            {audioLoading ? 'Loading...' : 'Play'}
                                        </Button>
                                    ) : (
                                        <Button onClick={handlePause} size="lg" variant="outline">
                                            <Pause className="h-5 w-5 mr-2" />
                                            Pause
                                        </Button>
                                    )}

                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleNext}
                                        disabled={currentSlide === slides.length - 1}
                                    >
                                        <SkipForward className="h-4 w-4" />
                                    </Button>

                                    <Button variant="outline" size="icon" onClick={handleVolumeToggle}>
                                        {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                                    </Button>

                                    {/* Volume Slider */}
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
                                        <span className="text-xs text-gray-500">
                                            {Math.round((isMuted ? 0 : volume) * 100)}%
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Slide Content */}
                    <div className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">{currentSlideData?.title || 'No Title'}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Script Preview */}
                                <div className="bg-gray-50 p-3 rounded-lg">
                                    <h4 className="font-semibold text-sm mb-2">Script:</h4>
                                    <p className="text-xs text-gray-600 italic max-h-32 overflow-y-auto">
                                        "{currentSlideData?.script || 'No script available'}"
                                    </p>
                                </div>

                                {/* Audio Status */}
                                <div className="mt-3 text-xs">
                                    <span className={audioStatus.color}>
                                        {audioStatus.icon} {audioStatus.text}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Ask Question */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center">
                                    <MessageCircle className="h-5 w-5 mr-2" />
                                    Ask AI
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <Button className="w-full" variant="outline">
                                    Ask Question About This Slide
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Slide Navigation */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Slides</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-2 max-h-64 overflow-y-auto">
                                    {slides.map((slide, index) => (
                                        <button
                                            key={slide.id}
                                            onClick={() => handleSlideNavigation(index)}
                                            className={`w-full text-left p-2 rounded text-sm transition-colors ${
                                                index === currentSlide
                                                    ? 'bg-primary text-primary-foreground'
                                                    : 'hover:bg-gray-100'
                                            }`}
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
        </div>
    );
};

export default AvatarPresentation;