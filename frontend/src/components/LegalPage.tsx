import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { legal } from '../config/legal';

// Shared layout for the Privacy Policy and Terms pages.
export const LegalPage = ({ title, children }: { title: string; children: ReactNode }) => {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = `${title} | ${legal.serviceName}`;
  }, [title]);

  return (
    <div className="container mx-auto px-4 py-12">
      <article className="max-w-3xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sm:p-10">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-2">{title}</h1>
        <p className="text-sm text-gray-500 mb-8">Effective {legal.effectiveDate}</p>
        <div className="space-y-8 text-gray-700 leading-relaxed">{children}</div>
        <p className="mt-10 pt-6 border-t border-gray-200 text-sm text-gray-500">
          See also our{' '}
          <Link to="/privacy" className="text-blue-600 hover:text-blue-700">Privacy Policy</Link>
          {' '}and{' '}
          <Link to="/terms" className="text-blue-600 hover:text-blue-700">Terms and Conditions</Link>.
        </p>
      </article>
    </div>
  );
};

export const LegalSection = ({ id, title, children }: { id?: string; title: string; children: ReactNode }) => (
  <section id={id} className="space-y-3">
    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
    {children}
  </section>
);

export const ContactEmail = () => (
  <a href={`mailto:${legal.contactEmail}`} className="text-blue-600 hover:text-blue-700">
    {legal.contactEmail}
  </a>
);
