import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutGrid,
  ShieldCheck,
  LifeBuoy,
  Building2,
  PawPrint,
  BarChart3,
  ChevronDown,
  Receipt,
  FileText,
  Globe,
  ClipboardList,
  KeyRound,
  Users2,
} from 'lucide-react';
import logo from '../../assets/logo.png';
import { useAuth } from '../../context/AuthContext.jsx';

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN'];

const navItems = [
  { to: '/', label: 'Sales Dashboard', icon: LayoutGrid, end: true },
  { to: '/proposals', label: 'Proposals', icon: ClipboardList },
  { to: '/sales', label: 'Sales', icon: Receipt },
  { to: '/plans', label: 'Plans', icon: ShieldCheck },
  { to: '/pdf-templates', label: 'Policy PDFs', icon: FileText },
  { to: '/website-content', label: 'Legal Documents', icon: Globe },
  { to: '/servicing', label: 'Policy Servicing', icon: LifeBuoy },
  { to: '/insurers', label: 'Insurers', icon: Building2 },
  { to: '/users', label: 'Users', icon: Users2, adminOnly: true },
  { to: '/api-clients', label: 'API Clients', icon: KeyRound, adminOnly: true },
];

// Collapsible group — more MIS reports get added here as they ship.
const misChildren = [{ to: '/mis/plans', label: 'Plans MIS' }];

const linkClass = ({ isActive }) =>
  `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
    isActive ? 'bg-brand-blue text-white shadow-card' : 'text-brand-slate hover:bg-brand-blueTint hover:text-brand-blue'
  }`;

export default function Sidebar() {
  const { pathname } = useLocation();
  const { admin } = useAuth();
  const isAdmin = ADMIN_ROLES.includes(admin?.role);
  const [misOpen, setMisOpen] = useState(pathname.startsWith('/mis'));

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-brand-line bg-white">
      <div className="flex items-center gap-3 border-b border-brand-line px-6 py-5">
        <img src={logo} alt="Across Assist" className="h-9 w-9 object-contain" />
        <div className="leading-tight">
          <p className="text-sm font-bold text-brand-ink">Across Assist</p>
          <p className="text-[11px] font-medium tracking-wide text-brand-slate">PET INSURANCE ADMIN</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-5">
        {navItems
          .filter((it) => !it.adminOnly || isAdmin)
          .map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={linkClass}>
              <Icon size={18} strokeWidth={2} />
              {label}
            </NavLink>
          ))}

        <div>
          <button
            onClick={() => setMisOpen((v) => !v)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              pathname.startsWith('/mis')
                ? 'text-brand-blue'
                : 'text-brand-slate hover:bg-brand-blueTint hover:text-brand-blue'
            }`}
          >
            <BarChart3 size={18} strokeWidth={2} />
            MIS
            <ChevronDown
              size={15}
              className={`ml-auto transition-transform ${misOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {misOpen && (
            <div className="mt-1 space-y-1 pl-6">
              {misChildren.map((c) => (
                <NavLink
                  key={c.to}
                  to={c.to}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-card'
                        : 'text-brand-slate hover:bg-brand-blueTint hover:text-brand-blue'
                    }`
                  }
                >
                  {c.label}
                </NavLink>
              ))}
            </div>
          )}
        </div>
      </nav>

      <div className="mx-3 mb-5 rounded-xl bg-brand-orangeTint p-4">
        <div className="flex items-center gap-2 text-brand-orangeDark">
          <PawPrint size={16} />
          <p className="text-xs font-semibold">Trust | Care | Protect</p>
        </div>
        <p className="mt-1 text-[11px] leading-snug text-brand-slate">
          More modules — quotes, policy issuance — roll out here as they ship.
        </p>
      </div>
    </aside>
  );
}
