import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatbotProps {
  locationName: string;
  availableSpecies: string[];
}

export default function WildlifeChatbot({ locationName, availableSpecies }: ChatbotProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'model',
      text: `I am your EchoGrid Intelligence AI. I am actively monitoring the acoustic streams in ${locationName}. Ask me anything about the local tracking metrics or ecological predictions.`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userText = input.trim();

    // Capture current messages BEFORE setState so we can use them synchronously
    const currentMessages = [...messages, { role: 'user' as const, text: userText }];
    setMessages(currentMessages);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('API Key missing. Set VITE_GEMINI_API_KEY in your .env file.');

      // Build history from all messages EXCEPT the very first (bot greeting),
      // since Gemini requires the first turn to be 'user'.
      // We also exclude the new user message we just added (it goes in separately).
      const historySource = currentMessages.slice(1, -1); // skip greeting + the new user msg

      // Gemini requires STRICTLY alternating user/model turns.
      // We rebuild the array ensuring correct alternation starting with 'user'.
      const validHistory: { role: string; parts: { text: string }[] }[] = [];
      let expectedRole: 'user' | 'model' = 'user';

      for (const m of historySource) {
        if (m.role === expectedRole) {
          validHistory.push({ role: m.role, parts: [{ text: m.text }] });
          expectedRole = expectedRole === 'user' ? 'model' : 'user';
        }
        // If the turn doesn't match expected, skip it to keep the alternation valid
      }

      const systemInstructionContent = `You are EchoGrid AI, a tactical wildlife, weather, and conservation expert attached to the EchoGrid dashboard.
You are currently monitoring the exact real-time region: ${locationName}.
The active species signatures we track here right now are: ${availableSpecies.length > 0 ? availableSpecies.join(', ') : 'None detected'} (Total count: ${availableSpecies.length} animals).
You HAVE full access to this real-time detection data. Use it confidently to answer questions about what is nearby or how many animals are present.
You can ALSO answer questions related to human safety, local travel feasibility, impending weather calamities, wildlife spotting, and future ecological outlook in this specific region. If you do not have exact active data for travel, estimate reasonably based on general wilderness safety logic.
If the user asks about ANYTHING completely unrelated (like writing code, historical trivia not related to the region, or off-topic chitchat), you must decline and reply with exactly: "I can't do that, sorry. My intelligence protocol is strictly restricted to ecological, weather, travel safety, and wildlife data."
Keep valid answers very brief (2-3 sentences max) to fit inside a tactical dashboard feed. Do not break character.`;

      const payload = {
        system_instruction: {
          parts: [{ text: systemInstructionContent }]
        },
        contents: [
          ...validHistory,
          { role: 'user', parts: [{ text: userText }] }
        ],
        generationConfig: {
          maxOutputTokens: 200,
          temperature: 0.8
        }
      };

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();

      // Surface Gemini API errors clearly in the console for debugging
      if (!res.ok || data.error) {
        const errorMsg = data.error?.message || `HTTP ${res.status}`;
        console.error('Gemini API Error:', errorMsg, data);
        throw new Error(errorMsg);
      }

      const reply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        'No signal received from remote databank.';

      setMessages(prev => [...prev, { role: 'model', text: reply }]);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('Chatbot error:', message);
      setMessages(prev => [
        ...prev,
        {
          role: 'model',
          text: `Error: ${message}`
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="w-full rounded-2xl overflow-hidden flex flex-col h-80 mt-6 relative z-10"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Header */}
      <div 
        className="px-4 py-3 flex items-center justify-between"
        style={{
          background: 'rgba(0,0,0,0.2)',
          borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}
      >
        <span 
          style={{
            fontSize: '11px',
            color: '#86efac',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
          }}
        >
          Target Area Intelligence Protocol
        </span>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
        <AnimatePresence initial={false}>
          {messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`max-w-[85%] text-[13px] leading-relaxed p-3 rounded-xl ${m.role === 'user'
                  ? 'self-end rounded-br-sm shadow-md'
                  : 'self-start rounded-bl-sm'
                }`}
              style={{
                backgroundColor: m.role === 'user' ? 'rgba(134, 239, 172, 0.12)' : 'rgba(255, 255, 255, 0.04)',
                border: `1px solid ${m.role === 'user' ? 'rgba(134, 239, 172, 0.25)' : 'rgba(255, 255, 255, 0.05)'}`,
                color: m.role === 'user' ? '#86efac' : 'rgba(255, 255, 255, 0.8)'
              }}
            >
              {m.text}
            </motion.div>
          ))}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="self-start text-[10px] uppercase tracking-widest mt-2 flex items-center gap-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}></span>
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: 'rgba(255,255,255,0.3)', animationDelay: '0.1s' }}
              ></span>
              <span
                className="w-1.5 h-1.5 rounded-full animate-bounce"
                style={{ backgroundColor: 'rgba(255,255,255,0.3)', animationDelay: '0.2s' }}
              ></span>
              ANALYZING
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={endRef} />
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="p-3 flex gap-2"
        style={{
           borderTop: '1px solid rgba(255,255,255,0.05)',
           background: 'rgba(0,0,0,0.2)'
        }}
      >
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Query EchoGrid AI about the sector..."
          className="flex-1 outline-none relative px-4 py-2 rounded-full text-[13px] transition-colors placeholder:text-white/30 text-white focus:bg-white/10"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
          disabled={isLoading}
        />
        <style>{`
          input:focus { border-color: rgba(134,239,172,0.4) !important; }
        `}</style>
        <button
          disabled={isLoading || !input.trim()}
          className="px-5 py-2 rounded-full text-[11px] font-semibold tracking-wider uppercase transition-colors disabled:opacity-30 cursor-pointer hover:bg-emerald-400/20"
          style={{
             background: 'rgba(134,239,172,0.15)',
             border: '1px solid rgba(134,239,172,0.3)',
             color: '#86efac'
          }}
        >
          Transmit
        </button>
      </form>
    </div>
  );
}