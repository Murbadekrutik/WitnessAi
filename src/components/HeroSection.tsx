import { Shield, Mic, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import shieldHero from "@/assets/shield-hero.jpg";

interface HeroSectionProps {
  onStartRecording: () => void;
}

const HeroSection = ({ onStartRecording }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/5 mb-8">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">Your Constitutional Shield</span>
          </div>

          <h1 className="font-heading text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="text-foreground">Your Silent</span>
            <br />
            <span className="text-gradient-gold">AI Lawyer</span>
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-4 font-body">
            Real-time legal protection during police questioning. Know your rights.
            Record everything. Stay protected.
          </p>

          <p className="text-sm text-muted-foreground/70 max-w-xl mx-auto mb-10">
            Article 20(3) of the Indian Constitution protects you from self-incrimination.
            WitnessAI helps you exercise this right.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button variant="hero" size="lg" className="text-base px-8 py-6" onClick={onStartRecording}>
              <Mic className="w-5 h-5" />
              Start Recording Session
            </Button>
            <Button variant="outline" size="lg" className="text-base px-8 py-6 border-muted-foreground/20">
              <FileText className="w-5 h-5" />
              Know Your Rights
            </Button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            {
              icon: <Mic className="w-6 h-6 text-primary" />,
              title: "Live Transcription",
              desc: "Real-time speech-to-text in Hindi and English",
            },
            {
              icon: <Shield className="w-6 h-6 text-primary" />,
              title: "Rights Alerts",
              desc: "Silent alerts when you don't have to answer",
            },
            {
              icon: <FileText className="w-6 h-6 text-primary" />,
              title: "Legal Record",
              desc: "Timestamped, encrypted transcript of everything",
            },
          ].map((feature, i) => (
            <div key={i} className="bg-card border border-border rounded-lg p-6 text-left">
              <div className="mb-3">{feature.icon}</div>
              <h3 className="font-heading font-semibold text-foreground mb-1">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
