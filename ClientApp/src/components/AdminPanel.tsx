import React, { useState } from "react";
import { api } from "../services/api";
import {
  X,
  Key,
  Save,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings2,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface AdminPanelProps {
  onClose: () => void;
}

export default function AdminPanel({ onClose }: AdminPanelProps) {
  const [geminiKey, setGeminiKey] = useState("");
  const [geminiConfigured, setGeminiConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    (async () => {
      try {
        const data = await api.getAdminConfigs();
        setGeminiConfigured(data.geminiConfigured);
        const existing = data.configs.find((c) => c.key === "GEMINI_API_KEY");
        if (existing?.hasValue) {
          setGeminiKey("");
        }
      } catch (err: unknown) {
        setMessage({
          type: "error",
          text: err instanceof Error ? err.message : "Failed to load admin config.",
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!geminiKey.trim()) {
      setMessage({ type: "error", text: "Enter a Gemini API key to save." });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      await api.setAdminConfig(
        "GEMINI_API_KEY",
        geminiKey.trim(),
        "Google Gemini API key for artwork analysis and chat"
      );
      setGeminiConfigured(true);
      setGeminiKey("");
      setMessage({
        type: "success",
        text: "Gemini API key saved. AI will use it on the next request.",
      });
    } catch (err: unknown) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save configuration.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="w-full max-w-lg bg-[#0a0a0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/8">
            <div className="flex items-center gap-2.5">
              <Settings2 className="w-5 h-5 text-[#D4AF37]" />
              <h2 className="text-base font-serif italic text-[#D4AF37] tracking-wide">
                SuperAdmin Panel
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
              </div>
            ) : (
              <>
                <div
                  className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                    geminiConfigured
                      ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                      : "bg-amber-500/10 border border-amber-500/20 text-amber-300"
                  }`}
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  {geminiConfigured
                    ? "Gemini is configured. Full AI analysis and chat are available."
                    : "No Gemini key found. The app is running in fallback / limited mode."}
                </div>

                {message && (
                  <div
                    className={`mb-4 p-3 rounded-xl text-xs flex items-center gap-2 ${
                      message.type === "success"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : "bg-red-500/10 border border-red-500/20 text-red-400"
                    }`}
                  >
                    {message.type === "success" ? (
                      <CheckCircle className="w-4 h-4 shrink-0" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0" />
                    )}
                    {message.text}
                  </div>
                )}

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-white/40 font-bold block mb-1.5">
                      Gemini API Key
                    </label>
                    <div className="relative">
                      <Key className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        className="w-full bg-white/3 border border-white/8 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-all"
                        placeholder={
                          geminiConfigured
                            ? "Enter a new key to replace the current one"
                            : "Paste your Google AI Studio key"
                        }
                      />
                    </div>
                    <p className="text-[10px] text-white/30 mt-1.5">
                      Stored in the database and used immediately — no restart required. Env var
                      GEMINI_API_KEY still takes priority if set.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full bg-[#D4AF37] hover:bg-[#c49f27] text-black font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {saving ? "Saving..." : "Save API Key"}
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
