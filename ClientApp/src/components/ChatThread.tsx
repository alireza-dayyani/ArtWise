import React, { useState, useRef, useEffect } from "react";
import { Artwork, Message } from "../types";
import { Send, Sparkles, MessageSquare, Bot, User as UserIcon, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ChatThreadProps {
  artwork: Artwork | null;
  messages: Message[];
  onSendMessage: (content: string) => Promise<void>;
  isGeneratingChat: boolean;
}

export default function ChatThread({
  artwork,
  messages,
  onSendMessage,
  isGeneratingChat
}: ChatThreadProps) {
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom of the conversation when new messages appear
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGeneratingChat]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isGeneratingChat) return;

    onSendMessage(inputValue.trim());
    setInputValue("");
  };

  if (!artwork) {
    return (
      <div className="w-full md:w-96 border-l border-white/8 bg-black/10 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center text-xs text-[#A0A0A0]">
        <MessageSquare className="w-8 h-8 text-white/20 mb-3" />
        <p className="max-w-xs leading-relaxed">
          Select or upload an artwork to open a conversational thread and unlock deeper educational insights.
        </p>
      </div>
    );
  }

  return (
    <aside className="w-full md:w-96 border-l border-white/8 bg-black/10 backdrop-blur-3xl flex flex-col h-full overflow-hidden shrink-0">
      {/* Thread Header */}
      <div className="p-4 border-b border-white/8 flex items-center gap-3 bg-black/20">
        <div className="p-2 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg">
          <MessageSquare className="w-4 h-4 text-[#D4AF37]" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-xs font-semibold text-[#F5F5F5] truncate">
            {artwork.title} Discussion
          </h3>
          <p className="text-[10px] text-[#A0A0A0] truncate">
            Powered by Curator AI Assistant
          </p>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.length === 0 ? (
          /* Empty Chat / Introduction */
          <div className="space-y-4 py-4">
            <div className="p-4 bg-white/2 border border-white/5 rounded-xl text-xs space-y-2.5">
              <div className="flex items-center gap-2 text-[#D4AF37] font-semibold font-serif italic">
                <Sparkles className="w-4 h-4" />
                Curator AI Greetings
              </div>
              <p className="text-[#A0A0A0] leading-relaxed">
                Welcome! This conversational thread is completely isolated to maintain study organization for <strong className="text-white">"{artwork.title}"</strong>.
              </p>
              <p className="text-[#A0A0A0] leading-relaxed">
                Ask me questions regarding:
              </p>
              <ul className="list-disc pl-4 space-y-1 text-[#A0A0A0] leading-relaxed">
                <li>Specific symbols and visual items in the picture.</li>
                <li>The historical timeline surrounding {artwork.artist}.</li>
                <li>Artistic techniques (light, shadow, depth, pigments).</li>
                <li>Stylistic similarities with other renaissance or modern artists.</li>
              </ul>
            </div>
          </div>
        ) : (
          /* Render Messages */
          messages.map((msg) => {
            const isBot = msg.role === "assistant";
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isBot ? "justify-start" : "justify-end"}`}
              >
                {isBot && (
                  <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-[#D4AF37]" />
                  </div>
                )}
                <div
                  className={`max-w-[82%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    isBot
                      ? "bg-white/3 border border-white/8 text-[#F5F5F5]"
                      : "bg-[#D4AF37] text-black font-medium rounded-tr-none shadow-[0_2px_10px_rgba(212,175,55,0.15)]"
                  }`}
                >
                  {/* Handle line-breaks gracefully in plain text markdown */}
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                </div>
                {!isBot && (
                  <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/8 flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-4 h-4 text-white/50" />
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Loading Bubble */}
        {isGeneratingChat && (
          <div className="flex gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center shrink-0 mt-0.5">
              <Bot className="w-4 h-4 text-[#D4AF37]" />
            </div>
            <div className="bg-white/3 border border-white/8 rounded-2xl px-4 py-3 text-xs text-[#A0A0A0] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
              Formulating curator insights...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/8 bg-black/20 flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Ask about ${artwork.title}...`}
          disabled={isGeneratingChat}
          className="flex-1 bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-xs text-[#F5F5F5] placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-all disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!inputValue.trim() || isGeneratingChat}
          className="p-3 rounded-xl bg-[#D4AF37] hover:bg-[#c49f27] text-black transition-colors disabled:opacity-40 disabled:hover:bg-[#D4AF37] flex items-center justify-center cursor-pointer flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </aside>
  );
}
