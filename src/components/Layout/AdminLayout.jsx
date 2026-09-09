import Sidebar from './Sidebar.jsx';
import Topbar from './Topbar.jsx';

export default function AdminLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-brand-bg">
      <Sidebar />
      <div className="pl-64">
        <Topbar title={title} />
        <main className="p-8">{children}</main>
      </div>
    </div>
  );
}
