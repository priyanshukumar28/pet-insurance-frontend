import { useState, useRef, useEffect } from 'react';
import { LogOut, ChevronDown, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Topbar({ title }) {
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  async function handleLogout() {
    await logout();
    toast.success('Logged out');
  }

  const initials = admin?.name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-brand-line bg-white/80 px-8 backdrop-blur">
      <h1 className="text-lg font-semibold text-brand-ink">{title}</h1>

      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-brand-bg"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-blue text-sm font-semibold text-white">
            {initials || <User size={16} />}
          </span>
          <span className="text-left">
            <span className="block text-sm font-medium text-brand-ink">{admin?.name}</span>
            <span className="block text-xs text-brand-slate">{admin?.role?.replace('_', ' ')}</span>
          </span>
          <ChevronDown size={16} className="text-brand-slate" />
        </button>

        {open && (
          <div className="absolute right-0 mt-2 w-48 rounded-xl border border-brand-line bg-white p-1.5 shadow-panel">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <LogOut size={16} />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
