import { createContext, useContext, useEffect, useRef, useState } from "react";

const backendUrl = "http://localhost:3000";
const MIN_AUDIO_BYTES = 1024;

const SpeechContext = createContext();

export const SpeechProvider = ({ children }) => {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState();
  const [loading, setLoading] = useState(false);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);

  const sendAudioData = async (audioBlob, fileExtension) => {
    if (!audioBlob || audioBlob.size === 0) {
      throw new Error("Recorded audio is empty.");
    }
    if (audioBlob.size < MIN_AUDIO_BYTES) {
      throw new Error("Recorded audio is too short. Please record a bit longer.");
    }
    const formData = new FormData();
    formData.append("audio", audioBlob, `audio.${fileExtension}`);
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/sts`, {
        method: "POST",
        body: formData,
      });
      const response = (await data.json()).messages;
      setMessages((messages) => [...messages, ...response]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const setupMediaRecorder = async () => {
    if (mediaRecorder) {
      return mediaRecorder;
    }
    if (typeof window === "undefined") {
      return null;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;
    const preferredMimeTypes = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/ogg",
      "audio/mp4",
    ];
    const supportedMimeType = preferredMimeTypes.find((type) => MediaRecorder.isTypeSupported(type));
    const newMediaRecorder = supportedMimeType
      ? new MediaRecorder(stream, { mimeType: supportedMimeType })
      : new MediaRecorder(stream);
    newMediaRecorder.onstart = () => {
      chunksRef.current = [];
    };
    newMediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };
    newMediaRecorder.onstop = async () => {
      const mimeType = supportedMimeType || "audio/webm";
      const audioBlob = new Blob(chunksRef.current, { type: mimeType });
      if (audioBlob.size < MIN_AUDIO_BYTES) {
        alert("Recording is too short. Please try again.");
        return;
      }
      const fileExtension = mimeType.includes("ogg")
        ? "ogg"
        : mimeType.includes("mp4")
          ? "mp4"
          : "webm";
      try {
        await sendAudioData(audioBlob, fileExtension);
      } catch (error) {
        console.error(error);
        alert(error.message);
      }
    };
    setMediaRecorder(newMediaRecorder);
    return newMediaRecorder;
  };

  useEffect(() => {
    return () => {
      if (mediaRecorder?.state === "recording") {
        mediaRecorder.stop();
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [mediaRecorder]);

  const startRecording = async () => {
    try {
      const recorder = await setupMediaRecorder();
      if (!recorder) {
        return;
      }
      if (recorder.state !== "recording") {
        recorder.start(250);
        setRecording(true);
      }
    } catch (err) {
      console.error("Error accessing microphone:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder?.state === "recording") {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  const tts = async (message) => {
    setLoading(true);
    try {
      const data = await fetch(`${backendUrl}/tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message }),
      });
      const response = (await data.json()).messages;
      setMessages((messages) => [...messages, ...response]);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const onMessagePlayed = () => {
    setMessages((messages) => messages.slice(1));
  };

  useEffect(() => {
    if (messages.length > 0) {
      setMessage(messages[0]);
    } else {
      setMessage(null);
    }
  }, [messages]);

  return (
    <SpeechContext.Provider
      value={{
        startRecording,
        stopRecording,
        recording,
        tts,
        message,
        onMessagePlayed,
        loading,
      }}
    >
      {children}
    </SpeechContext.Provider>
  );
};

export const useSpeech = () => {
  const context = useContext(SpeechContext);
  if (!context) {
    throw new Error("useSpeech must be used within a SpeechProvider");
  }
  return context;
};
