import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import api, { setAccessToken, registerLogoutHandler } from '../api/axios.js';

const AuthContext = createContext(null);

// Sign the user out after this long with no interaction. While active, the
// access token is refreshed transparently by the axios interceptor, so the
// session lasts indefinitely — it only ends on inactivity or explicit logout.
const IDLE_LIMIT_MS = 15 * 60 * 1000;
const ACTIVITY_KEY = 'aa_last_activity'; // shared across tabs via localStorage
const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'wheel'];
const WRITE_THROTTLE_MS = 15 * 1000;
const CHECK_INTERVAL_MS = 20 * 1000;

function readLastActivity() {
  try {
    const v = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
}
function writeLastActivity(ts) {
  try {
    localStorage.setItem(ACTIVITY_KEY, String(ts));
  } catch {
    /* private mode / storage disabled — idle logout just won't cross tabs */
  }
}
function clearLastActivity() {
  try {
    localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true); // true while we check for an existing session
  const intervalRef = useRef(null);
  const bootstrappedRef = useRef(false); // guard StrictMode's double effect run

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setAdmin(null);
    clearLastActivity();
  }, []);

  useEffect(() => {
    registerLogoutHandler(clearSession);
  }, [clearSession]);

  // Explicit / idle sign-out: revoke the refresh token server-side too.
  const endSession = useCallback(
    async ({ idle = false } = {}) => {
      try {
        await api.post('/auth/logout');
      } catch {
        /* offline or already gone — clear locally regardless */
      }
      clearSession();
      if (idle) toast('Signed out after 15 minutes of inactivity', { icon: '🔒' });
    },
    [clearSession]
  );

  // On first load, restore the session from the refresh cookie — unless the
  // last recorded activity is already older than the idle limit.
  useEffect(() => {
    if (bootstrappedRef.current) return;
    bootstrappedRef.current = true;
    (async () => {
      const last = readLastActivity();
      if (last && Date.now() - last > IDLE_LIMIT_MS) {
        await endSession({ idle: false });
        setLoading(false);
        return;
      }
      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.data.accessToken);
        setAdmin(data.data.admin);
        writeLastActivity(Date.now());
      } catch {
        clearSession();
      } finally {
        setLoading(false);
      }
    })();
  }, [clearSession, endSession]);

  // Idle tracking — mounted only while signed in.
  useEffect(() => {
    if (!admin) return undefined;

    let lastWrite = 0;
    const bump = () => {
      const now = Date.now();
      if (now - lastWrite > WRITE_THROTTLE_MS) {
        lastWrite = now;
        writeLastActivity(now);
      }
    };
    const check = () => {
      const last = readLastActivity() ?? 0;
      if (Date.now() - last > IDLE_LIMIT_MS) endSession({ idle: true });
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    // Another tab signed out (removed the key) — follow it here.
    const onStorage = (e) => {
      if (e.key === ACTIVITY_KEY && e.newValue === null) clearSession();
    };

    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, bump, { passive: true }));
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('storage', onStorage);
    intervalRef.current = setInterval(check, CHECK_INTERVAL_MS);
    writeLastActivity(Date.now());

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, bump));
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('storage', onStorage);
      clearInterval(intervalRef.current);
    };
  }, [admin, endSession, clearSession]);

  async function login(email, password) {
    const { data } = await api.post('/auth/login', { email, password });
    setAccessToken(data.data.accessToken);
    setAdmin(data.data.admin);
    writeLastActivity(Date.now());
    return data.data.admin;
  }

  async function logout() {
    await endSession({ idle: false });
  }

  return (
    <AuthContext.Provider value={{ admin, loading, login, logout, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
