import { Shield, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

const RightsPanel = () => {
  return (
    <div className="space-y-3 max-h-[calc(100vh-200px)] overflow-y-auto pr-2">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h2 className="font-heading font-semibold text-foreground">Your Rights</h2>
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
  );
};

export default RightsPanel;
