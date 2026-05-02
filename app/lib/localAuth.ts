'use client';

const KEY = 'auth_session_v1';

export type LocalSession = {
  user: {
    id: string;
    email?: string;
  };
  expires_at?: number;
};

type SupabaseSession = {
  user: {
    id: string;
    email?: string;
  };
  expires_at?: number;
};

// ============================================================
// 💾 SALVAR SESSÃO
// ============================================================
export function saveLocalSession(session: SupabaseSession) {
  if (!session?.user) return;

  const data: LocalSession = {
    user: {
      id: session.user.id,
      email: session.user.email,
    },
    expires_at: session.expires_at,
  };

  localStorage.setItem(KEY, JSON.stringify(data));
}

// ============================================================
// 📥 LER SESSÃO
// ============================================================
export function getLocalSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);

    // 🔥 valida expiração (se existir)
    if (parsed.expires_at && Date.now() / 1000 > parsed.expires_at) {
      localStorage.removeItem(KEY);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

// ============================================================
// 🧹 LIMPAR
// ============================================================
export function clearLocalSession() {
  localStorage.removeItem(KEY);
}