import { Shield, BookOpen } from "lucide-react";
import { motion } from "framer-motion";

const RIGHTS = [
  {
    article: "Article 20(3)",
    title: "Right Against Self-Incrimination",
    description:
      "No person accused of any offence shall be compelled to be a witness against himself.",
    critical: true,
  },
  {
    article: "Article 22(1)",
    title: "Right to Legal Counsel",
    description:
      "Every arrested person has the right to consult and be defended by a legal practitioner of their choice.",
    critical: true,
  },
  {
    article: "Section 41D CrPC",
    title: "Right to Meet Advocate",
    description:
      "When arrested, you are entitled to meet an advocate of your choice during interrogation.",
    critical: false,
  },
  {
    article: "D.K. Basu Guidelines",
    title: "Right to Inform",
    description:
      "You have the right to have a friend, relative, or well-wisher informed about your arrest.",
    critical: false,
  },
  {
    article: "Section 50 CrPC",
    title: "Right to Know Grounds",
    description:
      "Every officer arresting without warrant must communicate the grounds of arrest and the right to bail.",
    critical: false,
  },
  {
    article: "Article 21",
    title: "Right to Dignity",
    description:
      "No person shall be subjected to torture or cruel, inhuman, or degrading treatment during custody.",
    critical: true,
  },
];

const RightsPanel = () => {
  return (
    <div className="h-full">
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-4 pb-3 border-b border-border/50">
        <Shield className="w-4 h-4 text-primary" />
        <h2 className="font-heading font-semibold text-sm text-foreground tracking-tight">
          Know Your Rights
        </h2>
      </div>

      <div className="space-y-2.5">
        {RIGHTS.map((right, i) => (
          <motion.div
            key={right.article}
            initial={{ opacity: 0, x: 12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06, duration: 0.25 }}
            className={`rounded-xl border p-3.5 ${
              right.critical
                ? "border-primary/20 bg-primary/5"
                : "border-border bg-card"
            }`}
          >
            <div className="flex items-start gap-2.5">
              <BookOpen
                className={`w-3.5 h-3.5 shrink-0 mt-0.5 ${
                  right.critical ? "text-primary" : "text-muted-foreground/50"
                }`}
              />
              <div>
                {/* Article reference badge */}
                <span
                  className={`inline-block text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    right.critical ? "text-primary" : "text-muted-foreground/50"
                  }`}
                >
                  {right.article}
                </span>
                <h3 className="font-heading font-semibold text-xs text-foreground mb-1 leading-snug">
                  {right.title}
                </h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {right.description}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RightsPanel;
