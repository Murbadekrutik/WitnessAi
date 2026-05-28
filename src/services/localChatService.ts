/**
 * localChatService.ts — Offline legal knowledge base for Indian constitutional rights
 *
 * Provides high-quality, pre-authored answers to the most common questions
 * about Indian legal rights. Used as a fallback when the Gemini API is
 * unavailable or rate-limited.
 *
 * Matching strategy: keyword scoring — pick the highest-scoring rule,
 * fall back to a generic helpful response if nothing matches well.
 */

import type { ChatMessage } from "./chatService";

interface KnowledgeEntry {
  /** Keywords that trigger this entry (case-insensitive) */
  triggers: string[];
  /** The pre-authored response */
  answer: string;
}

const KB: KnowledgeEntry[] = [
  {
    triggers: ["police", "stop", "question", "detain", "detained", "arrest", "stopped"],
    answer: `Yes — you have the right to know why you are being stopped or detained.

Under **Article 22** of the Constitution, police must tell you the grounds of arrest at the time of arrest. If you are just being questioned (not arrested), you are generally free to leave unless they formally detain you.

A few things worth keeping in mind:

- You can calmly ask: *"Am I being detained or am I free to go?"*
- If you are not formally arrested, you are not legally required to answer questions
- If you are arrested, you have the right to be informed of the charges (**Section 50 CrPC**)
- You have the right to contact a lawyer and a family member (**Article 22(1)**, **D.K. Basu guidelines**)

Here's what I'd suggest: stay calm, speak politely, and clearly assert your rights. Asking whether you are free to leave is not obstruction — it is your right.

Try to stay calm — keeping the situation calm protects you.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
  {
    triggers: ["phone", "search", "warrant", "search my", "check my", "look through"],
    answer: `No — police generally cannot search your phone without a warrant.

Under **Article 21** of the Constitution, you have the right to privacy, which the Supreme Court confirmed includes your digital data in *K.S. Puttaswamy v. Union of India (2017)*. A phone search requires either a warrant or your voluntary consent.

A few things worth keeping in mind:

- You can politely ask: *"Do you have a warrant for this search?"*
- You are not required to unlock your phone or give your password
- If they insist, stay calm and say: *"I do not consent to this search"*
- Any evidence obtained through an unlawful search can be challenged in court

Here's what I'd suggest: do not physically resist, but clearly state you do not consent. Note the officer's name and badge number if possible.

Try to stay calm — keeping the situation calm protects you.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
  {
    triggers: ["article 21", "right to life", "personal liberty", "life and liberty"],
    answer: `**Article 21** is one of the most powerful rights in the Indian Constitution — it guarantees every person the right to life and personal liberty.

The Supreme Court has expanded Article 21 far beyond just physical survival. It now protects:

- The right to privacy (*K.S. Puttaswamy, 2017*)
- The right to a fair trial and legal aid
- The right to live with dignity
- The right to health and a clean environment
- Protection from arbitrary arrest and detention

In practice, Article 21 means that any restriction on your freedom must follow a fair and just legal procedure — not just any procedure the state chooses. If the police act arbitrarily or deny you due process, Article 21 is the constitutional ground on which you can challenge that.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
  {
    triggers: ["fir", "file", "register", "complaint", "refuse", "first information"],
    answer: `You have the right to have your FIR registered — and police cannot legally refuse.

Under **Section 154 CrPC**, registering an FIR for a cognisable offence is a mandatory duty of the police. They cannot demand an investigation first or refuse because they think your complaint is weak.

A few things worth keeping in mind:

- You can insist that the officer register your FIR — it is not optional for them
- If the local station refuses, you can send your complaint in writing by post to the Superintendent of Police (**Section 154(3) CrPC**)
- You can also file a complaint directly before the Magistrate under **Section 156(3) CrPC**, who can then direct the police to register the FIR
- Once registered, you are entitled to a free copy of the FIR

Here's what I'd suggest: put your complaint in writing, get a receipt if possible, and escalate to the SP or Magistrate if the local station refuses.

Try to stay calm — keeping the situation calm protects you.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
  {
    triggers: ["bail", "custody", "bailable", "non-bailable", "remand", "magistrate"],
    answer: `Your right to bail depends on the type of offence, but you always have the right to apply.

For **bailable offences**, bail is a right — the police or magistrate must grant it (**Section 436 CrPC**). For **non-bailable offences**, bail is at the discretion of the court (**Section 437 CrPC**), but you still have the right to apply and must be heard.

A few things worth keeping in mind:

- You must be produced before a Magistrate within **24 hours** of arrest (**Article 22(2)**, **Section 57 CrPC**)
- You have the right to legal aid if you cannot afford a lawyer (**Article 39A**)
- The police cannot keep you in custody beyond 24 hours without a Magistrate's order
- Anticipatory bail (**Section 438 CrPC**) can be obtained before arrest if you reasonably apprehend one

Here's what I'd suggest: immediately contact a lawyer or legal aid helpline. The 24-hour rule is critical — if it is violated, the detention itself becomes illegal.

Try to stay calm — keeping the situation calm protects you.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
  {
    triggers: ["dk basu", "d.k. basu", "dk basu", "arrest guideline", "custody guideline"],
    answer: `The **D.K. Basu v. State of West Bengal (1996)** guidelines are Supreme Court-mandated rules that every police officer must follow when making an arrest.

These guidelines were created because of widespread custodial abuse. The key ones are:

- The arresting officer must carry a visible, accurate identification tag
- A **memo of arrest** must be prepared at the time of arrest, signed by a witness, and given to the arrested person
- You must be informed of your right to notify a family member or friend
- A family member or friend must be informed of your arrest and the place of custody
- You must be examined by a doctor within 48 hours
- You have the right to meet your lawyer during interrogation
- All arrests and detentions must be entered in a register at the police station

These are not optional courtesies — they are legally binding directions of the Supreme Court. If any of these are violated, the violation itself can be grounds for legal action against the officers.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
  {
    triggers: ["confess", "confession", "sign", "statement", "self-incrimination", "article 20"],
    answer: `No — you cannot be compelled to confess or sign a statement against yourself.

**Article 20(3)** of the Constitution gives every accused person the right against self-incrimination. This means no one can be forced to be a witness against themselves.

A few things worth keeping in mind:

- You are never required to answer questions that could incriminate you
- A confession made to a police officer is generally not admissible in court (**Section 25, Indian Evidence Act**)
- A confession made under threat, inducement, or promise is inadmissible (**Section 24, Indian Evidence Act**)
- You have the right to read any document fully before signing and to have a lawyer present
- Refusing to sign or speak is not obstruction — it is a constitutional right

Here's what I'd suggest: calmly say *"I'd prefer not to answer without speaking to a lawyer first."* You do not need to justify this to anyone.

Try to stay calm — keeping the situation calm protects you.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
  {
    triggers: ["lawyer", "advocate", "legal counsel", "legal aid", "attorney", "right to counsel"],
    answer: `Yes — you have the right to a lawyer from the moment of arrest, and no one can take that away.

**Article 22(1)** guarantees the right to consult and be defended by a lawyer of your choice. The **D.K. Basu guidelines** further require police to allow you to meet your lawyer during interrogation.

A few things worth keeping in mind:

- You can ask for a lawyer before answering any questions
- If you cannot afford a lawyer, the state must provide one free of cost under **Article 39A** (right to free legal aid)
- You can contact the **District Legal Services Authority (DLSA)** in your district for free legal aid
- The National Legal Services Authority (NALSA) helpline is **15100**
- Police cannot deny you access to legal counsel — this is a constitutional right

Here's what I'd suggest: as soon as you are in custody, clearly state *"I want to speak to a lawyer before I say anything."* This is not suspicious — it is your right.

Try to stay calm — keeping the situation calm protects you.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
  {
    triggers: ["silent", "silence", "right to remain silent", "not speak", "not answer"],
    answer: `Yes — you have the right to remain silent, and this right is constitutionally protected.

**Article 20(3)** protects you from being compelled to be a witness against yourself. In practice, this means you cannot be forced to speak, confess, or provide information that could incriminate you.

A few things worth keeping in mind:

- You do not have to answer questions during interrogation without a lawyer present
- Saying *"I would like to speak to a lawyer before answering"* is a clear, lawful invocation of your rights
- Silence cannot be used as evidence of guilt in India
- A statement made under pressure or coercion is not legally valid

Here's what I'd suggest: calmly and clearly say you are exercising your right to remain silent and would like a lawyer. You do not need to repeat yourself or argue — state it once, clearly.

Try to stay calm — keeping the situation calm protects you.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`,
  },
];

const FALLBACK_RESPONSE = `That's a good question, and I want to give you an accurate answer.

While I may not have the specific details on that topic in my current knowledge base, here are the key principles that apply to most situations involving your rights in India:

- **Article 21** guarantees your right to life and personal liberty — any restriction must follow fair legal procedure
- **Article 20(3)** protects you from being forced to incriminate yourself
- **Article 22** gives you the right to know why you are being detained and the right to a lawyer
- You always have the right to legal counsel, and free legal aid is available through the National Legal Services Authority (NALSA) at helpline **15100**

For this specific situation, I'd strongly suggest speaking with a lawyer who can give you advice tailored to your exact circumstances.

*This is general legal information based on Indian law, not legal advice. Please consult a licensed advocate for your specific situation.*`;

/**
 * Score how well a knowledge entry matches the query.
 * Returns the number of trigger words found in the query text.
 */
function scoreEntry(query: string, entry: KnowledgeEntry): number {
  const q = query.toLowerCase();
  return entry.triggers.filter((t) => q.includes(t.toLowerCase())).length;
}

/**
 * Answer a question using the local knowledge base.
 * Returns null if the question has no reasonable match (caller should use Gemini).
 */
export function answerLocally(messages: ChatMessage[]): string | null {
  // Get the last user message
  const lastUser = [...messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return null;

  const query = lastUser.content;

  // Score all entries
  const scored = KB.map((entry) => ({ entry, score: scoreEntry(query, entry) }));
  const best   = scored.reduce((a, b) => (b.score > a.score ? b : a));

  // Only use local answer if at least one keyword matched
  if (best.score === 0) return FALLBACK_RESPONSE;
  return best.entry.answer;
}
