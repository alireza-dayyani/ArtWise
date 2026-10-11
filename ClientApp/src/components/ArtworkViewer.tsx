import React, { useState, DragEvent } from "react";
import { Artwork } from "../types";
import {
  Upload,
  Tag as TagIcon,
  BookOpen,
  Calendar,
  Sparkles,
  Award,
  History,
  Lightbulb,
  X,
  FileImage,
  Layers,
  AlertCircle,
  Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { imageUrlToDataUrl } from "../services/api";

interface ArtworkViewerProps {
  artwork: Artwork | null;
  onUpdateTags: (artworkId: string, tags: string[]) => void;
  onAnalyzeImage: (base64Image: string) => Promise<void>;
  onDeleteArtwork?: (artworkId: string) => void;
  isAnalyzing: boolean;
}

export default function ArtworkViewer({
  artwork,
  onUpdateTags,
  onAnalyzeImage,
  onDeleteArtwork,
  isAnalyzing
}: ArtworkViewerProps) {
  const [activeTab, setActiveTab] = useState<"analysis" | "interpretation" | "history" | "influences">("analysis");
  const [dragActive, setDragActive] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [loadingStep, setLoadingStep] = useState(0);

  // Progressive loading states for delightful AI feedback
  const loadingSteps = [
    "Uploading raw image canvas...",
    "Scanning pigments and composition geometry...",
    "Searching global art databases...",
    "Identifying artist stylistic signatures...",
    "Retrieving historical context and records...",
    "Synthesizing curator final insights..."
  ];

  // Rotate loading steps while analyzing
  React.useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isAnalyzing) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isAnalyzing]);

  // Handle Drag & Drop Events
  const handleDrag = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please upload a valid image file (PNG, JPG, or WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawBase64 = event.target?.result as string;
      
      // Load image to resize and compress using HTML Canvas
      const img = new window.Image();
      img.onload = async () => {
        const MAX_DIM = 1200;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Convert to JPEG with 0.85 quality for significant size reduction
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.85);
          try {
            await onAnalyzeImage(compressedBase64);
          } catch (err: any) {
            alert(err?.message || "Analysis failed. Please check your Gemini connection.");
          }
        } else {
          // Fallback if canvas context fails
          try {
            await onAnalyzeImage(rawBase64);
          } catch (err: any) {
            alert(err?.message || "Analysis failed. Please check your Gemini connection.");
          }
        }
      };

      img.onerror = async () => {
        // Fallback to original image if canvas load fails
        try {
          await onAnalyzeImage(rawBase64);
        } catch (err: any) {
          alert(err?.message || "Analysis failed. Please check your Gemini connection.");
        }
      };

      img.src = rawBase64;
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Tag modifications
  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!artwork || !tagInput.trim()) return;

    const cleanTag = tagInput.trim().toLowerCase();
    // Prevent duplicates
    if (!artwork.tags.includes(cleanTag)) {
      onUpdateTags(artwork.id, [...artwork.tags, cleanTag]);
    }
    setTagInput("");
  };

  const handleRemoveTag = (tagToRemove: string) => {
    if (!artwork) return;
    const updated = artwork.tags.filter((t) => t !== tagToRemove);
    onUpdateTags(artwork.id, updated);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-black/10 backdrop-blur-md overflow-hidden relative" id="artwork-viewer-stage">
      <AnimatePresence mode="wait">
        {isAnalyzing ? (
          /* Loading Stage */
          <motion.div
            key="analyzing-loader"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center p-8 text-center"
          >
            <div className="relative mb-6">
              <div className="w-16 h-16 rounded-full border-4 border-[#D4AF37]/25 border-t-[#D4AF37] animate-spin"></div>
              <Sparkles className="w-6 h-6 text-[#D4AF37] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
            </div>
            <motion.h3
              key={loadingStep}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="text-[#D4AF37] font-serif italic text-lg mb-2"
            >
              {loadingSteps[loadingStep]}
            </motion.h3>
            <p className="text-xs text-[#A0A0A0] max-w-sm">
              Our advanced language models are analyzing historical records, art databases, brushstroke styles, and context. This may take a few moments.
            </p>
          </motion.div>
        ) : !artwork ? (
          /* Upload State */
          <motion.div
            key="upload-prompt"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto"
          >
            <div className="max-w-xl w-full text-center">
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className="mb-6 font-serif italic text-3xl text-[#D4AF37]"
              >
                Analyze & Describe Art
              </motion.div>
              <p className="text-sm text-[#A0A0A0] mb-8 max-w-md mx-auto">
                Upload any artwork, painting, print, sketch, or photograph. CuratorAI will analyze its style, estimate origins, write rich educational insights, and organize it into your gallery.
              </p>

              {/* Drag-and-Drop Area */}
              <div
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-10 transition-all flex flex-col items-center justify-center cursor-pointer bg-white/2 ${
                  dragActive
                    ? "border-[#D4AF37] bg-[#D4AF37]/5 shadow-[0_4px_30px_rgba(212,175,55,0.1)]"
                    : "border-white/10 hover:border-white/20"
                }`}
                onClick={() => document.getElementById("hidden-file-input")?.click()}
              >
                <input
                  type="file"
                  id="hidden-file-input"
                  className="hidden"
                  onChange={handleFileSelect}
                  accept="image/*"
                />
                <div className="p-4 bg-white/5 rounded-full border border-white/8 mb-3">
                  <Upload className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <h4 className="text-sm font-medium text-[#F5F5F5] mb-1">
                  Drag and drop your image here
                </h4>
                <p className="text-xs text-[#A0A0A0] mb-3">
                  Supports PNG, JPEG, WEBP or GIF (max 10MB)
                </p>
                <span className="px-4 py-2 bg-white/5 border border-white/8 rounded-xl text-xs font-semibold text-[#F5F5F5] hover:bg-white/10 transition-colors">
                  Select Artwork File
                </span>
              </div>

              {/* Sample Masterworks Quick Start */}
              <div className="mt-8">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <h4 className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold">
                    Or try a famous masterwork
                  </h4>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    {
                      name: "Mona Lisa",
                      artist: "Leonardo da Vinci",
                      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ec/Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg/687px-Mona_Lisa%2C_by_Leonardo_da_Vinci%2C_from_C2RMF_retouched.jpg"
                    },
                    {
                      name: "Starry Night",
                      artist: "Vincent van Gogh",
                      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/e/ea/Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg/757px-Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg"
                    },
                    {
                      name: "Pearl Earring",
                      artist: "Johannes Vermeer",
                      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/1665_Girl_with_a_Pearl_Earring.jpg/600px-1665_Girl_with_a_Pearl_Earring.jpg"
                    },
                    {
                      name: "Great Wave",
                      artist: "Katsushika Hokusai",
                      url: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Tsunami_by_hokusai_19th_century.jpg/800px-Tsunami_by_hokusai_19th_century.jpg"
                    }
                  ].map((sample, i) => (
                    <button
                      key={i}
                      onClick={async (e) => {
                        e.stopPropagation();
                        try {
                          const dataUrl = await imageUrlToDataUrl(sample.url);
                          await onAnalyzeImage(dataUrl);
                        } catch (err: unknown) {
                          alert(
                            err instanceof Error
                              ? err.message
                              : "Failed to load sample image."
                          );
                        }
                      }}
                      className="group p-2 bg-white/2 hover:bg-white/5 border border-white/8 hover:border-[#D4AF37]/50 rounded-xl transition-all text-left flex flex-col cursor-pointer"
                    >
                      <div className="w-full h-24 rounded-lg overflow-hidden mb-2 bg-black/40 relative">
                        <img
                          src={sample.url}
                          alt={sample.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          crossOrigin="anonymous"
                        />
                      </div>
                      <span className="text-xs font-semibold text-[#F5F5F5] truncate group-hover:text-[#D4AF37] transition-colors">
                        {sample.name}
                      </span>
                      <span className="text-[10px] text-[#A0A0A0] truncate">
                        {sample.artist}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          /* Active Artwork details */
          <motion.div
            key={artwork.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col h-full overflow-y-auto p-6 space-y-6 scrollbar-thin"
          >
            {/* Visual Header Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Image Frame */}
              <div className="lg:col-span-5 aspect-auto flex justify-center">
                <div className="relative rounded-2xl overflow-hidden border border-white/8 shadow-2xl bg-black/40 max-h-[380px] w-full flex items-center justify-center group">
                  <img
                    src={artwork.imageUrl}
                    alt={artwork.title}
                    className="object-contain max-h-[380px] w-full transition-transform duration-500 group-hover:scale-102"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute top-3 right-3 bg-black/75 backdrop-blur-md text-[#D4AF37] px-3 py-1 rounded-full text-[10px] font-bold tracking-wider border border-[#D4AF37]/50 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI Curator Verified
                  </div>
                </div>
              </div>

              {/* Title & Metadata */}
              <div className="lg:col-span-7 space-y-4">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="text-3xl font-serif text-[#F5F5F5] tracking-tight leading-tight">
                      {artwork.title}
                    </h1>
                    {onDeleteArtwork && (
                      <button
                        onClick={() => onDeleteArtwork(artwork.id)}
                        className="shrink-0 p-2 rounded-lg border border-red-500/20 bg-red-950/20 text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                        title="Delete artwork"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#A0A0A0]">
                    <span className="flex items-center gap-1.5 text-[#D4AF37] font-semibold">
                      <Award className="w-4 h-4 text-[#D4AF37]" />
                      {artwork.artist}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      {artwork.year}
                    </span>
                    <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] bg-white/5 border border-white/8 px-2.5 py-0.5 rounded-full">
                      {artwork.style}
                    </span>
                  </div>
                </div>

                {/* Summary Box */}
                <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                  <h3 className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold mb-1.5">
                    Curator's Summary
                  </h3>
                  <p className="text-sm text-[#F5F5F5] leading-relaxed italic">
                    "{artwork.summary}"
                  </p>
                </div>

                {/* Categories */}
                <div>
                  <h3 className="text-[10px] uppercase tracking-widest text-[#A0A0A0] font-bold mb-2">
                    Classification & Genres
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {artwork.categories?.map((cat, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-white/5 border border-white/8 text-[#F5F5F5] px-3 py-1 rounded-lg flex items-center gap-1.5"
                      >
                        <Layers className="w-3 h-3 text-cyan-400" />
                        {cat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Educational Tab Panel */}
            <div className="bg-white/2 border border-white/5 rounded-2xl overflow-hidden">
              {/* Tab headers */}
              <div className="flex flex-wrap border-b border-white/5 bg-black/10">
                <button
                  onClick={() => setActiveTab("analysis")}
                  className={`flex-1 min-w-[120px] py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "analysis"
                      ? "text-[#D4AF37] border-[#D4AF37] bg-white/1"
                      : "text-[#A0A0A0] border-transparent hover:text-[#F5F5F5] hover:bg-white/1"
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Detailed Analysis
                </button>
                <button
                  onClick={() => setActiveTab("interpretation")}
                  className={`flex-1 min-w-[120px] py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "interpretation"
                      ? "text-[#D4AF37] border-[#D4AF37] bg-white/1"
                      : "text-[#A0A0A0] border-transparent hover:text-[#F5F5F5] hover:bg-white/1"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                  What the Art/Artist is Saying
                </button>
                <button
                  onClick={() => setActiveTab("history")}
                  className={`flex-1 min-w-[120px] py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "history"
                      ? "text-[#D4AF37] border-[#D4AF37] bg-white/1"
                      : "text-[#A0A0A0] border-transparent hover:text-[#F5F5F5] hover:bg-white/1"
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  Historical Context
                </button>
                <button
                  onClick={() => setActiveTab("influences")}
                  className={`flex-1 min-w-[120px] py-3 text-center text-xs font-semibold uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
                    activeTab === "influences"
                      ? "text-[#D4AF37] border-[#D4AF37] bg-white/1"
                      : "text-[#A0A0A0] border-transparent hover:text-[#F5F5F5] hover:bg-white/1"
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5" />
                  Stylistic Influences
                </button>
              </div>

              {/* Tab Contents */}
              <div className="p-6">
                <AnimatePresence mode="wait">
                  {activeTab === "analysis" && (
                    <motion.div
                      key="analysis-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <h3 className="text-sm font-serif italic text-[#D4AF37] flex items-center gap-2 mb-2">
                        Composition & Visual Analysis
                      </h3>
                      <p className="text-sm text-[#A0A0A0] leading-relaxed whitespace-pre-wrap">
                        {artwork.detailedAnalysis}
                      </p>
                    </motion.div>
                  )}

                  {activeTab === "interpretation" && (
                    <motion.div
                      key="interpretation-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <h3 className="text-sm font-serif italic text-[#D4AF37] flex items-center gap-2 mb-2">
                        Artist's Message & Symbolism Interpretation
                      </h3>
                      <p className="text-sm text-[#A0A0A0] leading-relaxed whitespace-pre-wrap">
                        {artwork.interpretation || "No interpretation details generated for this session yet. Upload a fresh artwork or ask our Curator AI in the chat to dive deeper into the artist's message."}
                      </p>
                    </motion.div>
                  )}

                  {activeTab === "history" && (
                    <motion.div
                      key="history-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <h3 className="text-sm font-serif italic text-[#D4AF37] flex items-center gap-2 mb-2">
                        Archival Records & Context
                      </h3>
                      <p className="text-sm text-[#A0A0A0] leading-relaxed whitespace-pre-wrap">
                        {artwork.historicalContext}
                      </p>
                    </motion.div>
                  )}

                  {activeTab === "influences" && (
                    <motion.div
                      key="influences-tab"
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="space-y-3"
                    >
                      <h3 className="text-sm font-serif italic text-[#D4AF37] flex items-center gap-2 mb-2">
                        Techniques & Artist Lineage
                      </h3>
                      <p className="text-sm text-[#A0A0A0] leading-relaxed whitespace-pre-wrap">
                        {artwork.stylisticInfluences}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Tag Management Panel */}
            <div className="bg-white/2 border border-white/5 rounded-2xl p-6">
              <h3 className="text-xs uppercase tracking-widest text-[#A0A0A0] font-bold mb-4 flex items-center gap-2">
                <TagIcon className="w-4 h-4 text-[#D4AF37]" />
                Interactive Tags ({artwork.tags?.length || 0})
              </h3>

              <div className="flex flex-wrap gap-2.5 mb-4">
                {artwork.tags?.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-xs bg-white/5 hover:bg-white/10 border border-white/8 text-[#D4AF37] px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all group"
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="text-white/30 group-hover:text-red-400 transition-colors cursor-pointer"
                      title={`Remove tag #${tag}`}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Tag creation form */}
              <form onSubmit={handleAddTag} className="flex gap-2 max-w-sm">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Add custom tag (e.g. oil, 17th-century)..."
                  className="flex-1 bg-white/3 border border-white/8 rounded-xl px-4 py-2.5 text-xs text-[#F5F5F5] placeholder-white/20 focus:outline-none focus:border-[#D4AF37] transition-all"
                />
                <button
                  type="submit"
                  className="bg-white/5 hover:bg-[#D4AF37]/20 border border-white/8 hover:border-[#D4AF37] text-[#F5F5F5] hover:text-[#D4AF37] px-4 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                >
                  Add
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
