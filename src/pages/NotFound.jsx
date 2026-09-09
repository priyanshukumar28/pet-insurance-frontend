import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-brand-bg text-center">
      <p className="text-sm font-semibold text-brand-orange">404</p>
      <h1 className="mt-2 text-2xl font-bold text-brand-ink">Page not found</h1>
      <Link to="/" className="mt-5 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white">
        Back to dashboard
      </Link>
    </div>
  );
}
