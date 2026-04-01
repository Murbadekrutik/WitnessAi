import { useState } from "react";
import HeroSection from "@/components/HeroSection";
import RecordingInterface from "@/components/RecordingInterface";

const Index = () => {
  const [view, setView] = useState<"landing" | "recording">("landing");

  if (view === "recording") {
    return <RecordingInterface onBack={() => setView("landing")} />;
  }

  return (
    <div className="min-h-screen">
      <HeroSection onStartRecording={() => setView("recording")} />
    </div>
  );
};

export default Index;
