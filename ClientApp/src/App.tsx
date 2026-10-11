import React, { useState, useEffect, useMemo } from "react";
import { User, Artwork, Message } from "./types";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import ArtworkViewer from "./components/ArtworkViewer";
import ChatThread from "./components/ChatThread";
import SettingsModal from "./components/SettingsModal";
import AdminPanel from "./components/AdminPanel";
import { api, setSessionUser, getSessionUser } from "./services/api";
import { ShieldCheck } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [selectedArtworkId, setSelectedArtworkId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isGeneratingChat, setIsGeneratingChat] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isLoadingGallery, setIsLoadingGallery] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  useEffect(() => {
    try {
      const saved = getSessionUser();
      // Drop legacy client-only sessions (non-GUID ids)
      if (saved && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id)) {
        setSessionUser(null);
      } else if (saved) {
        setCurrentUser(saved);
      }

      const savedTheme = localStorage.getItem("curator_theme");
      if (savedTheme) setIsDarkMode(savedTheme === "dark");
    } catch (e) {
      console.error("Session restore error:", e);
    }
  }, []);

  useEffect(() => {
    if (!currentUser) {
      setArtworks([]);
      setSelectedArtworkId(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setIsLoadingGallery(true);
      try {
        const list = await api.getArtworks();
        if (cancelled) return;
        setArtworks(list);
        if (list.length > 0) {
          setSelectedArtworkId((prev) =>
            prev && list.some((a) => a.id === prev) ? prev : list[0].id
          );
        } else {
          setSelectedArtworkId(null);
        }
      } catch (e) {
        console.error("Failed to load artworks:", e);
      } finally {
        if (!cancelled) setIsLoadingGallery(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  useEffect(() => {
    if (!selectedArtworkId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const list = await api.getMessages(selectedArtworkId);
        if (cancelled) return;
        setMessages(
          list.map((m) => ({
            ...m,
            threadId: m.threadId || (m as Message & { artworkId?: string }).artworkId || selectedArtworkId,
          }))
        );
      } catch (e) {
        console.error("Failed to load messages:", e);
        if (!cancelled) setMessages([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedArtworkId]);

  const activeArtwork = useMemo(
    () => artworks.find((art) => art.id === selectedArtworkId) || null,
    [artworks, selectedArtworkId]
  );

  const handleLoginSuccess = (user: User) => {
    setSessionUser(user);
    setCurrentUser(user);
  };

  const handleLogout = () => {
    setSessionUser(null);
    setCurrentUser(null);
  };

  const handleUpdateUser = (updated: User) => {
    setSessionUser(updated);
    setCurrentUser(updated);
  };

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    localStorage.setItem("curator_theme", nextMode ? "dark" : "light");
  };

  const handleAnalyzeImage = async (base64Image: string) => {
    if (!currentUser) return;
    setIsAnalyzing(true);
    try {
      const newArtwork = await api.analyze(base64Image);
      setArtworks((prev) => [newArtwork, ...prev]);
      setSelectedArtworkId(newArtwork.id);
    } catch (err: unknown) {
      console.error("Analysis Error:", err);
      throw err;
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateTags = async (artworkId: string, updatedTags: string[]) => {
    setArtworks((prev) =>
      prev.map((art) => (art.id === artworkId ? { ...art, tags: updatedTags } : art))
    );
    try {
      await api.updateTags(artworkId, updatedTags);
    } catch (e) {
      console.error("Error saving tags:", e);
    }
  };

  const handleDeleteArtwork = async (artworkId: string) => {
    if (!confirm("Delete this artwork and its chat history?")) return;
    try {
      await api.deleteArtwork(artworkId);
      setArtworks((prev) => {
        const next = prev.filter((a) => a.id !== artworkId);
        setSelectedArtworkId(next[0]?.id ?? null);
        return next;
      });
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : "Failed to delete artwork.");
    }
  };

  const handleImportGallery = async (importedArtworks: Artwork[]) => {
    if (!currentUser) return;
    try {
      let imported = 0;
      for (const art of importedArtworks) {
        const exists = artworks.some(
          (existing) => existing.title === art.title && existing.artist === art.artist
        );
        if (exists) continue;
        const created = await api.importArtwork({
          title: art.title,
          imageUrl: art.imageUrl,
          artist: art.artist,
          year: art.year,
          style: art.style,
          summary: art.summary,
          detailedAnalysis: art.detailedAnalysis,
          historicalContext: art.historicalContext,
          stylisticInfluences: art.stylisticInfluences,
          interpretation: art.interpretation,
          categories: art.categories,
          tags: art.tags,
        });
        setArtworks((prev) => [created, ...prev]);
        if (imported === 0) setSelectedArtworkId(created.id);
        imported++;
      }
      if (imported > 0) {
        alert(`Successfully imported ${imported} artwork records into your gallery!`);
      } else {
        alert("Imported artworks already exist in your gallery.");
      }
    } catch {
      alert("Failed to import gallery file.");
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!currentUser || !activeArtwork) return;

    const userMessage: Message = {
      id: "msg_pending_" + Date.now(),
      threadId: activeArtwork.id,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    const history = [...messages];
    setMessages([...history, userMessage]);
    setIsGeneratingChat(true);

    try {
      const data = await api.chat(activeArtwork, history, content);
      const assistantMessage: Message = {
        id: "msg_reply_" + Date.now(),
        threadId: activeArtwork.id,
        role: "assistant",
        content: data.reply || "I apologize, I could not generate insights for this query.",
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: unknown) {
      console.error("Chat Error:", err);
      const errorMessage: Message = {
        id: "msg_err_" + Date.now(),
        threadId: activeArtwork.id,
        role: "assistant",
        content: `Connection issue: ${err instanceof Error ? err.message : "Failed to contact ArtWise AI."}`,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGeneratingChat(false);
    }
  };

  if (!currentUser) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  const themeStyles = isDarkMode
    ? ({
        "--glass": "rgba(255, 255, 255, 0.03)",
        "--glass-border": "rgba(255, 255, 255, 0.08)",
        "--accent": "#D4AF37",
        "--text-main": "#F5F5F5",
        "--text-dim": "#A0A0A0",
        "--bg": "#050505",
      } as React.CSSProperties)
    : ({
        "--glass": "rgba(0, 0, 0, 0.03)",
        "--glass-border": "rgba(0, 0, 0, 0.08)",
        "--accent": "#B8860B",
        "--text-main": "#1A1A1A",
        "--text-dim": "#555555",
        "--bg": "#F5F6F8",
      } as React.CSSProperties);

  return (
    <div
      style={themeStyles}
      className="min-h-screen w-full flex flex-col font-sans transition-all duration-300 relative text-[var(--text-main)] bg-[var(--bg)] overflow-hidden"
    >
      <div className="absolute inset-0 -z-10 pointer-events-none">
        {isDarkMode ? (
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,#1a1a2e_0%,transparent_50%),radial-gradient(circle_at_100%_100%,#16213e_0%,transparent_50%),radial-gradient(circle_at_50%_50%,#0f3460_0%,transparent_70%)] opacity-85" />
        ) : (
          <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_0%_0%,#e0e5ec_0%,transparent_50%),radial-gradient(circle_at_100%_100%,#d4dae6_0%,transparent_50%),radial-gradient(circle_at_50%_50%,#c1c9d6_0%,transparent_70%)] opacity-75" />
        )}
      </div>

      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <Sidebar
          user={currentUser}
          onLogout={handleLogout}
          artworks={artworks}
          selectedArtworkId={selectedArtworkId}
          onSelectArtwork={setSelectedArtworkId}
          onUploadClick={() => setSelectedArtworkId(null)}
          isDarkMode={isDarkMode}
          onToggleTheme={toggleTheme}
          onImportGallery={handleImportGallery}
          onOpenSettings={() => setShowSettings(true)}
          onOpenAdmin={currentUser.isAdmin ? () => setShowAdmin(true) : undefined}
          isLoading={isLoadingGallery}
        />

        <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          <header className="h-14 px-6 border-b border-white/8 flex items-center justify-between bg-black/10 backdrop-blur-md z-10">
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[var(--text-dim)] font-semibold">
                Active study:
              </span>
              <span className="text-xs font-semibold text-[var(--text-main)] truncate max-w-[200px] md:max-w-md">
                {activeArtwork ? activeArtwork.title : "New Artwork Analysis"}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-[10px] uppercase tracking-wider text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                Synced Vault
              </div>
            </div>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
            <ArtworkViewer
              artwork={activeArtwork}
              onUpdateTags={handleUpdateTags}
              onAnalyzeImage={handleAnalyzeImage}
              onDeleteArtwork={handleDeleteArtwork}
              isAnalyzing={isAnalyzing}
            />

            <ChatThread
              artwork={activeArtwork}
              messages={messages}
              onSendMessage={handleSendMessage}
              isGeneratingChat={isGeneratingChat}
            />
          </div>
        </main>
      </div>

      {showSettings && (
        <SettingsModal
          user={currentUser}
          onClose={() => setShowSettings(false)}
          onUpdateUser={handleUpdateUser}
        />
      )}

      {showAdmin && currentUser.isAdmin && (
        <AdminPanel onClose={() => setShowAdmin(false)} />
      )}
    </div>
  );
}
