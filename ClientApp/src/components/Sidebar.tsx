import React, { useRef, useState } from "react";
import { User, Artwork } from "../types";
import {
  LogOut,
  FolderOpen,
  Plus,
  Moon,
  Sun,
  Download,
  Upload,
  Globe,
  Wifi,
  WifiOff,
  User as UserIcon,
  Search,
  BookOpen,
  Settings,
  Shield
} from "lucide-react";

interface SidebarProps {
  user: User;
  onLogout: () => void;
  artworks: Artwork[];
  selectedArtworkId: string | null;
  onSelectArtwork: (id: string) => void;
  onUploadClick: () => void;
  isDarkMode: boolean;
  onToggleTheme: () => void;
  onImportGallery: (imported: Artwork[]) => void;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
  isLoading?: boolean;
}

export default function Sidebar({
  user,
  onLogout,
  artworks,
  selectedArtworkId,
  onSelectArtwork,
  onUploadClick,
  isDarkMode,
  onToggleTheme,
  onImportGallery,
  onOpenSettings,
  onOpenAdmin,
  isLoading
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter artworks by title, artist, style, or tag
  const filteredArtworks = artworks.filter((art) => {
    const query = searchQuery.toLowerCase();
    return (
      art.title.toLowerCase().includes(query) ||
      art.artist.toLowerCase().includes(query) ||
      art.style.toLowerCase().includes(query) ||
      art.tags.some((t) => t.toLowerCase().includes(query)) ||
      art.categories.some((c) => c.toLowerCase().includes(query))
    );
  });

  // Export gallery as JSON file
  const handleExportGallery = () => {
    if (artworks.length === 0) {
      alert("No artworks in your gallery to export yet! Upload and analyze some first.");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(artworks, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `ArtWise_Gallery_${user.name.replace(/\s+/g, "_")}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import previously saved gallery JSON
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          // Rudimentary validation
          const isValid = parsed.every(
            (item) => item.title && item.imageUrl && item.detailedAnalysis
          );
          if (isValid) {
            onImportGallery(parsed);
          } else {
            alert("Invalid file format. Ensure it is a valid ArtWise JSON Export.");
          }
        } else {
          alert("Invalid file format. File must contain an array of artworks.");
        }
      } catch (err) {
        alert("Error parsing file. Ensure it is a valid JSON document.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <aside className="w-full md:w-80 border-r border-white/8 bg-black/20 backdrop-blur-3xl flex flex-col h-full overflow-hidden shrink-0">
      {/* Top Brand & Theme Control */}
      <div className="p-5 border-b border-white/8 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <BookOpen className="w-5 h-5 text-[#D4AF37]" />
          <h2 className="font-serif italic text-xl text-[#D4AF37] tracking-wider select-none">
            ArtWise
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenAdmin && (
            <button
              onClick={onOpenAdmin}
              className="p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/8 text-[#A0A0A0] hover:text-[#D4AF37] transition-all cursor-pointer"
              title="SuperAdmin Panel"
            >
              <Shield className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onOpenSettings}
            className="p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/8 text-[#A0A0A0] hover:text-[#F5F5F5] transition-all cursor-pointer"
            title="Account Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/8 text-[#A0A0A0] hover:text-[#F5F5F5] transition-all cursor-pointer"
            title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={onLogout}
            className="p-2 rounded-lg hover:bg-red-950/20 hover:text-red-400 border border-transparent hover:border-red-500/10 text-[#A0A0A0] transition-all cursor-pointer"
            title="Secure Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* User Status Card */}
      <div className="px-5 py-4 border-b border-white/5 bg-white/1">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSettings}
            className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#D4AF37] to-amber-200 flex items-center justify-center text-black font-semibold text-sm shadow-[0_2px_10px_rgba(212,175,55,0.15)] overflow-hidden cursor-pointer"
            title="Account Settings"
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              user.name.split(" ").map((n) => n[0]).join("") || "U"
            )}
          </button>
          <div className="flex-1 overflow-hidden">
            <h4 className="text-sm font-medium text-[#F5F5F5] truncate">{user.name}</h4>
            <p className="text-[11px] text-[#A0A0A0] truncate">{user.email}</p>
          </div>
        </div>

        {/* Action button cluster */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <button
            onClick={handleExportGallery}
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium bg-white/5 hover:bg-white/10 text-[#F5F5F5] border border-white/8 py-2 rounded-lg transition-all cursor-pointer"
          >
            <Download className="w-3 h-3 text-[#D4AF37]" />
            Export Gallery
          </button>
          <button
            onClick={handleImportClick}
            className="flex items-center justify-center gap-1.5 text-[11px] font-medium bg-white/5 hover:bg-white/10 text-[#F5F5F5] border border-white/8 py-2 rounded-lg transition-all cursor-pointer"
          >
            <Upload className="w-3 h-3 text-cyan-400" />
            Import Gallery
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* Search Input */}
      <div className="p-4 border-b border-white/5">
        <div className="relative">
          <Search className="w-4 h-4 text-white/30 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, artist, style..."
            className="w-full bg-white/3 border border-white/8 rounded-xl pl-10 pr-4 py-2 text-xs text-[#F5F5F5] placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-all"
          />
        </div>
      </div>

      {/* Art Collection Threads list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-thin">
        <div className="flex items-center justify-between px-1 mb-2">
          <h3 className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold">
            Project Threads ({filteredArtworks.length})
          </h3>
          <span className="text-[9px] text-[#D4AF37] px-2 py-0.5 rounded-full bg-white/5 border border-white/5 font-semibold">
            SECURE
          </span>
        </div>

        {/* New collection upload trigger */}
        <button
          onClick={onUploadClick}
          className="w-full flex items-center justify-center gap-2 border border-dashed border-white/15 hover:border-[#D4AF37]/50 bg-white/2 hover:bg-[#D4AF37]/5 text-xs text-[#F5F5F5] font-medium py-3 rounded-xl transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#D4AF37]" />
          New Art Analysis
        </button>

        {/* Thread list items */}
        {isLoading ? (
          <div className="text-center py-8 px-4 text-xs text-[#A0A0A0] opacity-60">
            Loading gallery...
          </div>
        ) : filteredArtworks.length === 0 ? (
          <div className="text-center py-8 px-4 text-xs text-[#A0A0A0] opacity-60">
            {searchQuery ? "No matching artwork threads found." : "Your digital gallery is empty. Upload an artwork to begin!"}
          </div>
        ) : (
          filteredArtworks.map((art) => {
            const isActive = selectedArtworkId === art.id;
            return (
              <button
                key={art.id}
                onClick={() => onSelectArtwork(art.id)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 block cursor-pointer group ${
                  isActive
                    ? "bg-[#D4AF37]/10 border-[#D4AF37] shadow-[0_2px_12px_rgba(212,175,55,0.1)]"
                    : "bg-white/2 border-white/5 hover:bg-white/5 hover:border-white/10"
                }`}
              >
                <div className="flex gap-3">
                  <div className="w-11 h-11 rounded-lg overflow-hidden border border-white/8 bg-black/40 flex-shrink-0 relative">
                    <img
                      src={art.imageUrl}
                      alt={art.title}
                      className="w-full h-full object-cover transition-transform group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-semibold text-[#F5F5F5] truncate group-hover:text-[#D4AF37] transition-colors">
                      {art.title}
                    </h4>
                    <p className="text-[10px] text-[#A0A0A0] truncate mt-0.5">
                      {art.artist} ({art.year})
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[9px] bg-white/5 border border-white/5 px-1.5 py-0.5 rounded text-[#D4AF37] truncate max-w-[120px]">
                        {art.style}
                      </span>
                      {art.tags.length > 0 && (
                        <span className="text-[9px] text-[#A0A0A0] truncate">
                          • {art.tags.length} tags
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="p-3 bg-black/40 border-t border-white/5 text-[10px] text-[#A0A0A0] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Wifi className="w-3.5 h-3.5 text-emerald-400" />
          <span>Server sync active</span>
        </div>
        <span className="text-[9px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded font-medium">
          SQL Server
        </span>
      </div>
    </aside>
  );
}
