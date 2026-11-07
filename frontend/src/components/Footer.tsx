import { Link } from 'react-router-dom';
import { Logo } from './Header';
import { legal } from '../config/legal';

const links = [
  { name: 'How it works', to: '/#how-it-works' },
  { name: 'Pricing', to: '/pricing' },
  { name: 'Privacy Policy', to: '/privacy' },
  { name: 'Terms and Conditions', to: '/terms' },
];

const Footer = () => (
  <footer className="border-t border-line bg-canvas">
    <div className="mx-auto flex max-w-content flex-col gap-10 px-4 py-12 sm:px-6 md:flex-row md:items-start md:justify-between">
      <div className="max-w-sm">
        <Logo />
        <p className="mt-4 text-sm leading-relaxed text-muted">
          AI mock interviews with questions tailored to your role and scored feedback on every session.
        </p>
      </div>
      <nav className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm" aria-label="Footer">
        {links.map((link) => (
          <Link key={link.name} to={link.to} className="text-muted transition-colors hover:text-ink">
            {link.name}
          </Link>
        ))}
      </nav>
    </div>
    <div className="border-t border-line">
      <div className="mx-auto flex max-w-content flex-col gap-2 px-4 py-6 text-sm text-soft sm:flex-row sm:justify-between sm:px-6">
        <p>© {new Date().getFullYear()} {legal.operator}. All rights reserved.</p>
        <a href={`mailto:${legal.contactEmail}`} className="hover:text-ink">{legal.contactEmail}</a>
      </div>
    </div>
  </footer>
);

export default Footer;
