import { Shield, Mic, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import shieldHero from "@/assets/shield-hero.jpg";

interface HeroSectionProps {
  onStartRecording: () => void;
  onKnowYourRights: () => void;
}

const FEATURES = [
  {
    icon: <Mic className="w-4 h-4 text-primary" />,
    title: "Live Transcription",
    desc: "Real-time speech-to-text in Hindi and English. Every word recorded and timestamped.",
  },
  {
    icon: <Shield className="w-4 h-4 text-primary" />,
    title: "Rights Alerts",
    desc: "Silent alerts when you don't have to answer. Identifies coercive questioning instantly.",
  },
  {
    icon: <FileText className="w-4 h-4 text-primary" />,
    title: "Legal Record",
    desc: "Secure, timestamped transcript of everything said. Your evidence, protected.",
  },
];

const HeroSection = ({ onStartRecording, onKnowYourRights }: HeroSectionProps) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 sm:px-6 overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <img
          src={shieldHero}
          alt=""
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] opacity-[0.07] blur-sm"
          width={1280}
          height={720}
        />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[500px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto text-center w-full">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {/* Trust badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-10 select-none">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-semibold text-primary tracking-widest uppercase">
              Constitutional Rights Protection
            </span>
          </div>

          <h1 className="font-heading text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-5 leading-[1.05]">
            <span className="text-foreground">Your Silent</span>
            <br />
            <span className="text-gradient-gold">AI Lawyer</span>
          </h1>

          <p className="text-base sm:text-lg text-muted-foreground max-w-xl mx-auto mb-3 leading-relaxed">
            Real-time rights protection during police questioning. Know your rights,
            record everything, stay protected.
          </p>
          <p className="text-sm text-muted-foreground/55 max-w-md mx-auto mb-10 leading-relaxed">
            Powered by Article&nbsp;20(3) of the Indian Constitution — your right against self-incrimination.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
            <Button
              variant="hero"
              size="lg"
              className="h-12 sm:h-14 px-8 text-sm sm:text-base font-semibold tracking-wide"
              onClick={onStartRecording}
            >
              <Mic className="w-4 h-4" />
              Start Recording Session
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 sm:h-14 px-8 text-sm sm:text-base border-border/50 hover:border-primary/30 hover:bg-primary/5 transition-colors duration-200"
              onClick={onKnowYourRights}
            >
              <FileText className="w-4 h-4" />
              Know Your Rights
            </Button>
          </div>
        </motion.div>

        {/* Legal disclaimer */}
        <p className="text-[11px] text-muted-foreground/40 mb-12 leading-relaxed">
          General legal information based on Indian law
          &nbsp;·&nbsp;
          Not a substitute for legal advice
        </p>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4"
        >
          {FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-card border border-border hover:border-primary/20 rounded-xl p-5 text-left transition-colors duration-200"
            >
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                {feature.icon}
              </div>
              <h3 className="font-heading font-semibold text-sm text-foreground mb-1.5">
                {feature.title}
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
