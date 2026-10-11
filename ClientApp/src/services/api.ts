import { User, Artwork, Message } from "../types";

const USER_KEY = "curator_session";

export function getSessionUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setSessionUser(user: User | null) {
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  else localStorage.removeItem(USER_KEY);
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const user = getSessionUser();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(extra as Record<string, string>),
  };
  if (user?.id) headers["X-User-Id"] = user.id;
  if (user?.email) headers["X-User-Email"] = user.email;
  return headers;
}

async function parseError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    return data.error || data.title || data.detail || response.statusText;
  } catch {
    return response.statusText || "Request failed";
  }
}

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: authHeaders(options.headers),
  });
  if (!response.ok) {
    throw new Error(await parseError(response));
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  login(email: string, password: string) {
    return request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  register(email: string, password: string, name: string) {
    return request<User>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    });
  },

  demoLogin() {
    return request<User>("/api/auth/demo", { method: "POST" });
  },

  getArtworks() {
    return request<Artwork[]>("/api/artworks");
  },

  importArtwork(artwork: Partial<Artwork>) {
    return request<Artwork>("/api/artworks", {
      method: "POST",
      body: JSON.stringify(artwork),
    });
  },

  analyze(image: string) {
    return request<Artwork>("/api/analyze", {
      method: "POST",
      body: JSON.stringify({ image }),
    });
  },

  updateTags(artworkId: string, tags: string[]) {
    return request<{ tags: string[] }>(`/api/artworks/${artworkId}/tags`, {
      method: "PATCH",
      body: JSON.stringify(tags),
    });
  },

  deleteArtwork(artworkId: string) {
    return request<void>(`/api/artworks/${artworkId}`, { method: "DELETE" });
  },

  getMessages(artworkId: string) {
    return request<Message[]>(`/api/artworks/${artworkId}/messages`);
  },

  chat(artwork: Artwork, messages: Message[], newMessage: string) {
    return request<{ reply: string }>("/api/chat", {
      method: "POST",
      body: JSON.stringify({
        artwork: {
          id: artwork.id,
          title: artwork.title,
          artist: artwork.artist,
          year: artwork.year,
          style: artwork.style,
          detailedAnalysis: artwork.detailedAnalysis,
          historicalContext: artwork.historicalContext,
          stylisticInfluences: artwork.stylisticInfluences,
          interpretation: artwork.interpretation,
          categories: artwork.categories,
        },
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
        newMessage,
      }),
    });
  },

  updateProfile(name: string, avatarUrl: string | null) {
    return request<User>("/api/profile", {
      method: "PATCH",
      body: JSON.stringify({ name, avatarUrl }),
    });
  },

  changePassword(currentPassword: string, newPassword: string) {
    return request<{ message: string }>("/api/profile/password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  getAdminConfigs() {
    return request<{
      configs: Array<{
        key: string;
        value: string;
        description: string;
        updatedAt: string;
        hasValue: boolean;
      }>;
      geminiConfigured: boolean;
    }>("/api/admin/configs");
  },

  setAdminConfig(key: string, value: string, description?: string) {
    return request<{ message: string }>("/api/admin/configs", {
      method: "POST",
      body: JSON.stringify({ key, value, description }),
    });
  },
};

/** Fetch a remote image URL and return a JPEG data URL suitable for /api/analyze */
export async function imageUrlToDataUrl(url: string): Promise<string> {
  if (url.startsWith("data:")) return url;

  const response = await fetch(url);
  if (!response.ok) throw new Error("Failed to download sample image.");
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const raw = reader.result as string;
      const img = new Image();
      img.onload = () => {
        const MAX = 1200;
        let w = img.width;
        let h = img.height;
        if (w > MAX || h > MAX) {
          if (w > h) {
            h = Math.round((h * MAX) / w);
            w = MAX;
          } else {
            w = Math.round((w * MAX) / h);
            h = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(raw);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => resolve(raw);
      img.src = raw;
    };
    reader.onerror = () => reject(new Error("Failed to read image."));
    reader.readAsDataURL(blob);
  });
}
