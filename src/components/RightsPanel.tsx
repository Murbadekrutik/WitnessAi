import { useState } from "react";
import { Shield, AlertTriangle, MessageCircle, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LegalChatbot from "./LegalChatbot";

const RIGHTS = [
  {
    article: "Article 20(3)",
    title: "Right Against Self-Incrimination",
    description: "No person accused of any offence shall be compelled to be a witness against himself.",
    critical: true,
  },
  {
    article: "Article 22(1)",
    title: "Right to Legal Counsel",
    description: "Every arrested person has the right to consult and be defended by a legal practitioner of their choice.",
    critical: true,
  },
  {
    article: "Section 41D CrPC",
    title: "Right to Meet Advocate",
    description: "When any person is arrested, they shall be entitled to meet an advocate of their choice during interrogation.",
    critical: false,
  },
  {
    article: "D.K. Basu Guidelines",
    title: "Right to Inform",
    description: "The arrested person has the right to have a friend, relative or well-wisher informed about the arrest.",
    critical: false,
  },
  {
    article: "Section 50 CrPC",
    title: "Right to Know Grounds",
    description: "Every police officer arresting without warrant must communicate the grounds of arrest and the right to bail.",
    critical: false,
  },
  {
    article: "Article 21",
    title: "Right to Dignity",
    description: "No person shall be subjected to torture or cruel, inhuman or degrading treatment during custody.",
    critical: true,
  },
];

type Tab = "rights" | "chat";

const RightsPanel = () => {
  const [activeTab, setActiveTab] = useState<Tab>("rights");

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-200px)]">
      {/* Tab switcher */}
      <div className="flex gap-1 mb-3 p-1 rounded-lg bg-muted/30 shrink-0">
        <button
          onClick={() => setActiveTab("rights")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "rights"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <BookOpen className="w-3.5 h-3.5" />
          Your Rights
        </button>
        <button
          onClick={() => setActiveTab("chat")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            activeTab === "chat"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Ask AI
        </button>
      </div>

      {/* Content */}
      {activeTab === "rights" ? (
        <div className="space-y-3 overflow-y-auto pr-1 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-primary" />
            <h2 className="font-heading font-semibold text-foreground">Know Your Rights</h2>
          </div>
          <AnimatePresence>
            {RIGHTS.map((right, i) => (
              <motion.div
                key={right.article}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`p-4 rounded-lg border ${
                  right.critical
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <div className="flex items-start gap-2">
                  {right.critical && (
                    <AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  )}
                  <div>
                    <span className="text-xs font-medium text-primary">{right.article}</span>
                    <h3 className="font-heading font-semibold text-sm text-foreground mt-0.5">
                      {right.title}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">{right.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex-1 min-h-0">
          <LegalChatbot />
        </div>
      )}
    </div>
  );
};

export default RightsPanel;
