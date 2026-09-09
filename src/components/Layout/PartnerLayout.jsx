import { NavLink } from 'react-router-dom';
import { LayoutGrid, ClipboardList, FileCheck2, PawPrint } from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext.jsx';
import Topbar from './Topbar.jsx';

const nav = [
  { to: '/portal', label: 'Overview', icon: LayoutGrid, end: true },
  { to: '/portal/proposals', label: 'Proposals', icon: ClipboardList },
  { to: '/portal/certificates', label: 'Certificates', icon: FileCheck2 },
];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-blue text-white shadow-card' : 'text-brand-slate hover:bg-brand-blueTint hover:text-brand-blue'
  }`;

export default function PartnerLayout({ title, children }) {
  const { admin } = useAuth();

  return (
    <div className="min-h-screen bg-brand-bg">
      <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-brand-line bg-white">
        <div className="flex items-center gap-3 border-b border-brand-line px-6 py-5">
          <img src={logo} alt="Across Assist" className="h-9 w-9 object-contain" />
          <div className="leading-tight">
            <p className="text-sm font-bold text-brand-ink">Across Assist</p>
            <p className="text-[11px] font-medium tracking-wide text-brand-slate">PARTNER PORTAL</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-5">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="mx-3 mb-5 rounded-xl bg-brand-blueTint p-4">
          <div className="flex items-center gap-2 text-brand-blue">
            <PawPrint size={16} />
            <p className="text-xs font-semibold">{admin?.apiClientName || 'Your account'}</p>
          </div>
          <p className="mt-1 text-[11px] leading-snug text-brand-slate">
            Business shown here is scoped to your API integration.
          </p>
        </div>
      </aside>

      <div className="pl-64">
        <Topbar title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
