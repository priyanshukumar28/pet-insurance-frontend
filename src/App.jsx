import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminLayout from './components/Layout/AdminLayout.jsx';
import PartnerLayout from './components/Layout/PartnerLayout.jsx';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Plans from './pages/Plans.jsx';
import PlanBuilder from './pages/PlanBuilder.jsx';
import Sales from './pages/Sales.jsx';
import SaleForm from './pages/SaleForm.jsx';
import SaleView from './pages/SaleView.jsx';
import Proposals from './pages/Proposals.jsx';
import ProposalDetail from './pages/ProposalDetail.jsx';
import ApiClients from './pages/ApiClients.jsx';
import PdfTemplates from './pages/pdf/PdfTemplates.jsx';
import PdfTemplateEditor from './pages/pdf/PdfTemplateEditor.jsx';
import WebsiteContent from './pages/WebsiteContent.jsx';
import Users from './pages/Users.jsx';
import Notifications from './pages/Notifications.jsx';
import Servicing from './pages/Servicing.jsx';
import Insurers from './pages/Insurers.jsx';
import InsurerBreeds from './pages/InsurerBreeds.jsx';
import Breeds from './pages/Breeds.jsx';
import PlansMIS from './pages/mis/PlansMIS.jsx';
import PartnerOverview from './pages/partner/PartnerOverview.jsx';
import PartnerProposals from './pages/partner/PartnerProposals.jsx';
import PartnerCertificates from './pages/partner/PartnerCertificates.jsx';
import NotFound from './pages/NotFound.jsx';

const ADMIN_ROLES = ['SUPERADMIN', 'ADMIN'];

// Admin/staff shell. `roles` optionally restricts a route (others → home).
function Protected({ title, roles, children }) {
  const { admin } = useAuth();
  if (roles && admin && !roles.includes(admin.role)) return <Navigate to="/" replace />;
  return (
    <ProtectedRoute>
      <AdminLayout title={title}>{children}</AdminLayout>
    </ProtectedRoute>
  );
}

function PartnerProtected({ title, children }) {
  return (
    <ProtectedRoute>
      <PartnerLayout title={title}>{children}</PartnerLayout>
    </ProtectedRoute>
  );
}

function FullSpinner() {
  return (
    <div className="flex h-screen items-center justify-center bg-brand-bg">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blueTint border-t-brand-blue" />
    </div>
  );
}

export default function App() {
  const { admin, loading } = useAuth();
  if (loading) return <FullSpinner />;

  const isPartner = admin?.role === 'PARTNER';

  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      {isPartner ? (
        <>
          <Route path="/portal" element={<PartnerProtected title=""><PartnerOverview /></PartnerProtected>} />
          <Route path="/portal/proposals" element={<PartnerProtected title="Proposals"><PartnerProposals /></PartnerProtected>} />
          <Route path="/portal/certificates" element={<PartnerProtected title="Certificates"><PartnerCertificates /></PartnerProtected>} />
          <Route path="*" element={<Navigate to="/portal" replace />} />
        </>
      ) : (
        <>
          <Route path="/" element={<Protected title="Sales Dashboard"><Dashboard /></Protected>} />
          <Route path="/plans" element={<Protected title="Plans"><Plans /></Protected>} />
          <Route path="/plans/new" element={<Protected title="Create Plan"><PlanBuilder /></Protected>} />
          <Route path="/plans/:id/edit" element={<Protected title="Edit Plan"><PlanBuilder /></Protected>} />
          <Route path="/sales" element={<Protected title="Sales"><Sales /></Protected>} />
          <Route path="/sales/new" element={<Protected title="Record Manual Sale"><SaleForm /></Protected>} />
          <Route path="/sales/:id/edit" element={<Protected title="Edit Sale"><SaleForm /></Protected>} />
          <Route path="/sales/:id" element={<Protected title="Policy"><SaleView /></Protected>} />
          <Route path="/proposals" element={<Protected title="Proposals"><Proposals /></Protected>} />
          <Route path="/proposals/:proposalNo" element={<Protected title="Proposal"><ProposalDetail /></Protected>} />
          <Route path="/api-clients" element={<Protected title="API Clients" roles={ADMIN_ROLES}><ApiClients /></Protected>} />
          <Route path="/notifications" element={<Protected title="Notifications"><Notifications /></Protected>} />
          <Route path="/users" element={<Protected title="Users" roles={ADMIN_ROLES}><Users /></Protected>} />
          <Route path="/servicing" element={<Protected title="Policy Servicing"><Servicing /></Protected>} />
          <Route path="/pdf-templates" element={<Protected title="Policy PDFs"><PdfTemplates /></Protected>} />
          <Route path="/pdf-templates/new" element={<Protected title="New Policy PDF"><PdfTemplateEditor /></Protected>} />
          <Route path="/pdf-templates/:id" element={<Protected title="Edit Policy PDF"><PdfTemplateEditor /></Protected>} />
          <Route path="/website-content" element={<Protected title="Legal Documents"><WebsiteContent /></Protected>} />
          <Route path="/insurers" element={<Protected title="Insurers"><Insurers /></Protected>} />
          <Route path="/insurers/:id/breeds" element={<Protected title="Insurer Breeds"><InsurerBreeds /></Protected>} />
          <Route path="/breeds" element={<Protected title="Breeds"><Breeds /></Protected>} />
          <Route path="/mis/plans" element={<Protected title="MIS · Plans"><PlansMIS /></Protected>} />
          <Route path="/portal/*" element={<Navigate to="/" replace />} />
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
  );
}
