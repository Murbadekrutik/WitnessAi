import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import RecordingInterface from "@/components/RecordingInterface";
import LegalChatPage from "@/components/LegalChatPage";

type View = "landing" | "recording" | "chat";

const Index = () => {
  const [view, setView] = useState<View>("landing");

  if (view === "recording") {
    return <RecordingInterface onBack={() => setView("landing")} />;
  }

  if (view === "chat") {
    return <LegalChatPage onBack={() => setView("landing")} />;
  }

  return (
    <div className="min-h-screen">
      <HeroSection
        onStartRecording={() => setView("recording")}
        onKnowYourRights={() => setView("chat")}
      />
    </div>
  );
};

export default Index;
