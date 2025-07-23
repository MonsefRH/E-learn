import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { qaService } from "@/lib/services/qaService";

interface Message {
  text: string;
  sender: "user" | "bot";
  timestamp: string;
}

interface AudioCaptureProps {
  className?: string;
  courseId?: string;
  onResponse?: (response: string) => void;
  size?: "sm" | "md" | "lg";
  embedded?: boolean;
}

// Enhanced parser for advanced markdown-like formatting
const parseText = (text: string) => {
  const lines = text.split("\n");
  const elements = [];
  let inCodeBlock = false;
  let codeLanguage = "";
  let codeLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();

    if (line.startsWith("```")) {
      if (inCodeBlock) {
        elements.push(
          <pre key={elements.length} className="bg-gray-100 p-3 rounded-lg mt-2 overflow-x-auto text-sm">
            <code className={`language-${codeLanguage}`}>
              {codeLines.join("\n")}
            </code>
          </pre>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        codeLanguage = line.replace("```", "").trim() || "text";
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (line.startsWith("# ")) {
      elements.push(<h4 key={elements.length} className="text-xl font-bold mt-3 mb-1">{line.substring(2)}</h4>);
    } else if (line.startsWith("## ")) {
      elements.push(<h5 key={elements.length} className="text-lg font-semibold mt-3 mb-1">{line.substring(3)}</h5>);
    } else if (line.startsWith("**") && line.endsWith("**")) {
      const boldText = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
      elements.push(<p key={elements.length} className="font-medium" dangerouslySetInnerHTML={{ __html: boldText }} />);
    } else if (line.startsWith("* ")) {
      elements.push(<li key={elements.length} className="ml-6 list-disc">{line.substring(2)}</li>);
    } else if (line.match(/`[^`]+`/)) {
      const inlineCode = line.replace(/`([^`]+)`/g, "<code>$1</code>");
      elements.push(<p key={elements.length} className="inline" dangerouslySetInnerHTML={{ __html: inlineCode }} />);
    } else if (line.trim()) {
      elements.push(<p key={elements.length} className="mb-2">{line}</p>);
    }
  }

  if (inCodeBlock && codeLines.length > 0) {
    elements.push(
      <pre key={elements.length} className="bg-gray-100 p-3 rounded-lg mt-2 overflow-x-auto text-sm">
        <code className={`language-${codeLanguage}`}>
          {codeLines.join("\n")}
        </code>
      </pre>
    );
  }

  return elements;
};

export const Chatbot = ({
  className,
  courseId,
  onResponse,
  size = "md",
  embedded = false,
}: AudioCaptureProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [textInput, setTextInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();
  const isMounted = useRef(true);
  const wsInitialized = useRef(false);

  useEffect(() => {
    if (!wsInitialized.current && isMounted.current && !qaService.isConnected()) {
      qaService.connect(courseId, (data) => {
        console.log("Received response:", data);
        if (data.type === "transcription_ready") {
          if (data.transcribed_text && data.transcribed_text !== "Transcription failed") {
            setTextInput(data.transcribed_text);
            setMessages((prev) => [
              ...prev,
              { text: data.transcribed_text, sender: "user", timestamp: new Date().toLocaleTimeString() },
            ]);
            toast({ title: "Transcription Received", description: `Your question: ${data.transcribed_text}` });
          } else {
            toast({ title: "Error", description: "Failed to transcribe audio", variant: "destructive" });
          }
        } else if (data.type === "text_response") {
          setMessages((prev) => [
            ...prev,
            { text: data.text || "No response", sender: "bot", timestamp: new Date().toLocaleTimeString() },
          ]);
          if (onResponse) onResponse(data.text || "");
        } else if (data.type === "error") {
          setMessages((prev) => [
            ...prev,
            { text: data.message || "Unknown error", sender: "bot", timestamp: new Date().toLocaleTimeString() },
          ]);
          toast({ title: "Error", description: data.message, variant: "destructive" });
        }
      });
      wsInitialized.current = true;
    }

    return () => {
      isMounted.current = false;
      if (!document.querySelectorAll("[data-component='Chatbot']").length) {
        window.addEventListener("unload", () => {
          qaService.close();
          console.log("WebSocket closed on page unload");
        }, { once: true });
      }
    };
  }, [courseId, onResponse, toast]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 },
      });

      const supportedTypes = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ];
      let mimeType = supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) || "audio/webm";

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast({ title: "Recording Started", description: "Please speak your question clearly." });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast({
        title: "Recording Failed",
        description: "Unable to access microphone or unsupported format. Please check permissions or browser support.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast({ title: "Recording Stopped", description: "Review and send your question." });
    }
  }, [isRecording, toast]);

  const clearRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setIsDialogOpen(false); // Close dialog when clearing recording
  }, [audioUrl]);

  const submitAudio = useCallback(async () => {
    if (!audioBlob) {
      toast({ title: "Error", description: "No audio recorded", variant: "destructive" });
      setIsDialogOpen(false);
      return;
    }

    if (audioBlob.size < 1000) {
      toast({ title: "Error", description: "Audio file is too small", variant: "destructive" });
      clearRecording();
      return;
    }

    try {
      const transcribedText = await qaService.transcribeAudio(audioBlob, courseId);
      if (transcribedText && transcribedText !== "Transcription failed") {
        setTextInput(transcribedText);
        toast({ title: "Transcription Received", description: `Your question: ${transcribedText}` });
      } else {
        toast({ title: "Error", description: "Failed to transcribe audio", variant: "destructive" });
      }
      clearRecording();
    } catch (error) {
      console.error("Error submitting audio:", error);
      toast({
        title: "Submission Failed",
        description: "Unable to process audio. Please try again.",
        variant: "destructive",
      });
      clearRecording();
    }
  }, [audioBlob, toast, courseId, clearRecording]);

  const submitText = useCallback(async () => {
    if (!textInput.trim()) {
      toast({ title: "Error", description: "Question cannot be empty", variant: "destructive" });
      return;
    }

    try {
      setMessages((prev) => [
        ...prev,
        { text: textInput, sender: "user", timestamp: new Date().toLocaleTimeString() },
      ]);
      await qaService.sendMessage({
        type: "text_question",
        question: textInput,
        course_id: courseId,
      }).catch((error) => console.error("Send text error:", error));
      toast({ title: "Text Sent", description: "Processing your text question..." });
      setTextInput("");
    } catch (error) {
      console.error("Error submitting text:", error);
      toast({
        title: "Submission Failed",
        description: "Unable to process text. Please try again.",
        variant: "destructive",
      });
    }
  }, [textInput, toast, courseId]);

  const sizeClasses = {
    sm: "w-full max-w-sm",
    md: "w-full max-w-md",
    lg: "w-full",
  };

  // Embedded mode layout
  if (embedded) {
    return (
      <Card className={`${className} ${sizeClasses[size]} h-[500px] flex flex-col`}>
        <CardHeader className="pb-2 border-b">
          <CardTitle className="text-lg flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Chat with AI Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <p>Start a conversation with the AI assistant</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`p-3 rounded-lg max-w-[80%] border border-gray-200 ${
                    msg.sender === "user" ? "bg-blue-500 text-white" : "bg-white text-gray-800 shadow-sm"
                  }`}
                >
                  <span className="text-xs opacity-70 block mb-1">{msg.timestamp}</span>
                  {msg.sender === "bot" ? (
                    <div className="space-y-2">{parseText(msg.text)}</div>
                  ) : (
                    <p>{msg.text}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
        <div className="p-4 border-t flex gap-2 items-center">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="Type your message or transcribe audio..."
            className="flex-1"
            onKeyPress={(e) => e.key === "Enter" && submitText()}
          />
          <Button onClick={submitText} disabled={!textInput.trim()}>
            <Send className="h-4 w-4" />
          </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                size="icon"
                className="rounded-full bg-blue-500 hover:bg-blue-600 text-white"
                disabled={!!audioBlob}
              >
                <Mic className="h-6 w-6" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Audio Recording</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex justify-center">
                  {!isRecording ? (
                    <Button
                      onClick={startRecording}
                      size="lg"
                      className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                    >
                      <Mic className="h-6 w-6" />
                    </Button>
                  ) : (
                    <Button
                      onClick={stopRecording}
                      size="lg"
                      className="rounded-full w-16 h-16 bg-gray-500 hover:bg-gray-600 animate-pulse"
                    >
                      <MicOff className="h-6 w-6" />
                    </Button>
                  )}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  {isRecording ? (
                    <span className="text-red-500 font-medium">Recording... Click to stop</span>
                  ) : audioBlob ? (
                    "Recording ready to send"
                  ) : (
                    "Click the microphone to start recording"
                  )}
                </div>
                {audioBlob && audioUrl && (
                  <div className="space-y-3">
                    <audio controls src={audioUrl} className="w-full" preload="metadata" />
                    <div className="flex gap-2 justify-center">
                      <Button onClick={submitAudio} className="flex-1">
                        <Send className="h-4 w-4 mr-2" />
                        Send Question
                      </Button>
                      <Button onClick={clearRecording} variant="outline" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    );
  }

  // Fixed mode layout
  return (
    <Card className={`${className} ${sizeClasses[size]} flex flex-col fixed bottom-0 left-0 right-0 z-10 shadow-lg`}>
      <CardHeader className="pb-2 border-b">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Chat with AI Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 max-h-[400px]">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <p>Start a conversation with the AI assistant</p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`p-3 rounded-lg max-w-[80%] border border-gray-200 ${
                  msg.sender === "user" ? "bg-blue-500 text-white" : "bg-white text-gray-800 shadow-sm"
                }`}
              >
                <span className="text-xs opacity-70 block mb-1">{msg.timestamp}</span>
                {msg.sender === "bot" ? (
                  <div className="space-y-2">{parseText(msg.text)}</div>
                ) : (
                  <p>{msg.text}</p>
                )}
              </div>
            </div>
          ))
        )}
      </CardContent>
      <div className="p-4 border-t flex gap-2 items-center">
        <Input
          value={textInput}
          onChange={(e) => setTextInput(e.target.value)}
          placeholder="Type your message or transcribe audio..."
          className="flex-1"
          onKeyPress={(e) => e.key === "Enter" && submitText()}
        />
        <Button onClick={submitText} disabled={!textInput.trim()}>
          <Send className="h-4 w-4" />
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button
              size="icon"
              className="rounded-full bg-blue-500 hover:bg-blue-600 text-white"
              disabled={!!audioBlob}
            >
              <Mic className="h-6 w-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Audio Recording</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex justify-center">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    size="lg"
                    className="rounded-full w-16 h-16 bg-red-500 hover:bg-red-600"
                  >
                    <Mic className="h-6 w-6" />
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    size="lg"
                    className="rounded-full w-16 h-16 bg-gray-500 hover:bg-gray-600 animate-pulse"
                    >
                      <MicOff className="h-6 w-6" />
                    </Button>
                  )}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  {isRecording ? (
                    <span className="text-red-500 font-medium">Recording... Click to stop</span>
                  ) : audioBlob ? (
                    "Recording ready to send"
                  ) : (
                    "Click the microphone to start recording"
                  )}
                </div>
                {audioBlob && audioUrl && (
                  <div className="space-y-3">
                    <audio controls src={audioUrl} className="w-full" preload="metadata" />
                    <div className="flex gap-2 justify-center">
                      <Button onClick={submitAudio} className="flex-1">
                        <Send className="h-4 w-4 mr-2" />
                        Send Question
                      </Button>
                      <Button onClick={clearRecording} variant="outline" size="icon">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Card>
    );
  };