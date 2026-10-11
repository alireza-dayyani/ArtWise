import React, { useState } from "react";
import { motion } from "motion/react";
import { User } from "../types";
import { api, setSessionUser } from "../services/api";
import { Eye, EyeOff, Shield, LogIn, UserPlus, Sparkles, Image, Loader2 } from "lucide-react";

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const finishLogin = (user: User) => {
    setSessionUser(user);
    onLoginSuccess(user);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await api.login(email, password);
      finishLogin(user);
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message
          ? err.message === "Unauthorized"
            ? "Invalid email or password. Try admin/admin for SuperAdmin."
            : err.message
          : "Invalid email or password. Try admin/admin for SuperAdmin."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !name) {
      setError("Please fill in all fields.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      const user = await api.register(email, password, name);
      finishLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickAccess = async () => {
    setIsLoading(true);
    setError("");
    try {
      const user = await api.demoLogin();
      finishLogin(user);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Demo login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[#050505]" />
      <div className="absolute inset-0 -z-10 opacity-60">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,#1a1a2e_0%,transparent_50%),radial-gradient(circle_at_100%_100%,#16213e_0%,transparent_50%),radial-gradient(circle_at_50%_50%,#0f3460_0%,transparent_70%)]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="inline-flex items-center justify-center p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md mb-4"
          >
            <Image className="w-8 h-8 text-[#D4AF37]" />
          </motion.div>
          <h1 className="text-4xl font-serif italic text-[#D4AF37] tracking-wider mb-2">
            ArtWise
          </h1>
          <p className="text-sm text-[#A0A0A0] max-w-xs mx-auto">
            Your private educational assistant for detailed artwork identification and deep historical insights.
          </p>
        </div>

        <div className="bg-white/3 border border-white/8 rounded-2xl backdrop-blur-2xl p-8 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] relative">
          <div className="flex items-center justify-between border-b border-white/8 pb-4 mb-6">
            <h2 className="text-lg font-medium text-[#F5F5F5] flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#D4AF37]" />
              {isRegistering ? "Create Account" : "Sign In"}
            </h2>
            <span className="text-[10px] text-[#A0A0A0] bg-white/5 px-2.5 py-1 rounded-full border border-white/5 uppercase tracking-wider">
              Server Vault
            </span>
          </div>

          <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-lg bg-red-950/40 border border-red-500/20 text-red-200 text-xs text-center"
              >
                {error}
              </motion.div>
            )}

            {isRegistering && (
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Eleanor Whistler"
                  className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-all"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Email Address / Username
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@domain.com or admin"
                className="w-full bg-white/3 border border-white/8 rounded-xl px-4 py-3 text-sm text-[#F5F5F5] placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-[#A0A0A0] font-semibold mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white/3 border border-white/8 rounded-xl pl-4 pr-10 py-3 text-sm text-[#F5F5F5] placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-[#D4AF37] hover:bg-[#c49f27] text-black font-semibold text-sm rounded-xl py-3.5 flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(212,175,55,0.2)] disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isRegistering ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Enter Gallery
                </>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/8 text-center space-y-3">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError("");
              }}
              className="text-xs text-[#A0A0A0] hover:text-[#D4AF37] transition-colors"
            >
              {isRegistering ? "Already have an account? Log in" : "New to ArtWise? Create an account"}
            </button>

            <div className="flex items-center justify-center gap-2 text-[11px] text-white/30 px-4">
              <span className="h-[1px] bg-white/8 flex-1"></span>
              <span>OR</span>
              <span className="h-[1px] bg-white/8 flex-1"></span>
            </div>

            <button
              type="button"
              disabled={isLoading}
              onClick={handleQuickAccess}
              className="w-full bg-white/5 hover:bg-white/10 text-[#F5F5F5] text-xs border border-white/10 rounded-xl py-2.5 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              Quick Demo Access
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-white/30 flex items-center justify-center gap-2">
          <Shield className="w-3 h-3 text-[#D4AF37]" />
          <span>Accounts and galleries are stored securely on the ArtWise server.</span>
        </div>
      </motion.div>
    </div>
  );
}
