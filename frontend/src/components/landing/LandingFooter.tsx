'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Shield, Github, Twitter, Linkedin, Send } from 'lucide-react';

const footerLinks = {
  Product: [
    { label: 'Features', href: '#features' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'AI Agents', href: '#ai-agents' },
    { label: 'Integrations', href: '#integrations' },
    { label: 'Security', href: '#security' },
    { label: 'Pricing', href: '#pricing' },
  ],
  'Use Cases': [
    { label: 'Video Platforms', href: '#use-cases' },
    { label: 'EdTech', href: '#use-cases' },
    { label: 'Social Media', href: '#use-cases' },
    { label: 'Surveillance', href: '#use-cases' },
  ],
  Developers: [
    { label: 'API Reference', href: '#integrations' },
    { label: 'Webhooks Guide', href: '#integrations' },
    { label: 'SDK Documentation', href: '#integrations' },
    { label: 'Integration Guide', href: '#integrations' },
    { label: 'Developer Portal', href: '/register' },
  ],
  Company: [
    { label: 'About', href: '#' },
    { label: 'Contact Us', href: '#' },
    { label: 'Support', href: '#' },
    { label: 'FAQ', href: '#faq' },
  ],
};

const teamMembers = [
  'Sudhanshu',
  'Anu L Sasidharan',
  'Abhrajit Pal',
  'Manish Mishra',
  'Naveen Srikakolapu',
  'Prodip Sarkar',
  'Rajiv Ranjan',
  'Ruthvik Kumar',
];

export function LandingFooter() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  return (
    <footer className="bg-slate-950 border-t border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Newsletter strip */}
        <div className="py-10 border-b border-slate-800/60">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <div className="text-white font-bold text-lg mb-1">Stay in the loop</div>
              <p className="text-slate-400 text-sm">
                Product updates, AI moderation insights, and platform news — no spam.
              </p>
            </div>
            {subscribed ? (
              <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                <div className="w-5 h-5 rounded-full bg-green-400/15 border border-green-500/30 flex items-center justify-center">
                  <span className="text-xs">✓</span>
                </div>
                You&apos;re subscribed — thanks!
              </div>
            ) : (
              <form
                onSubmit={handleSubscribe}
                className="flex gap-2 w-full md:w-auto"
              >
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                  className="flex-1 md:w-64 bg-slate-800 border border-slate-700/60 text-white placeholder-slate-500 text-sm px-4 py-2.5 rounded-xl outline-none focus:border-blue-500/60 transition-colors"
                />
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-colors"
                >
                  <Send size={14} />
                  Subscribe
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Main footer grid */}
        <div className="py-14 grid grid-cols-2 md:grid-cols-6 gap-10">
          {/* Brand column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield size={16} className="text-white" />
              </div>
              <span className="text-white font-bold text-lg">
                VidShield <span className="text-blue-400">AI</span>
              </span>
            </Link>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Enterprise-grade AI Video Intelligence & Content Moderation Platform.
              Fully autonomous. Zero human intervention required.
            </p>

            {/* Social links */}
            <div className="flex items-center gap-3 mb-6">
              {[
                { icon: Github, href: '#', label: 'GitHub' },
                { icon: Twitter, href: '#', label: 'Twitter / X' },
                { icon: Linkedin, href: '#', label: 'LinkedIn' },
              ].map(({ icon: Icon, href, label }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 bg-slate-800 hover:bg-slate-700 border border-slate-700/60 rounded-lg flex items-center justify-center transition-colors"
                >
                  <Icon size={15} className="text-slate-400" />
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <div className="text-white font-semibold text-sm mb-4">{category}</div>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-slate-500 hover:text-slate-300 text-sm transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Team credits */}
        <div className="py-8 border-t border-slate-800/60">
          <div className="text-slate-500 text-xs font-medium uppercase tracking-wider mb-4">
            Built by the Team
          </div>
          <div className="flex flex-wrap gap-2">
            {teamMembers.map((name) => (
              <span
                key={name}
                className="text-xs px-3 py-1.5 bg-slate-800/80 border border-slate-700/50 text-slate-300 rounded-full font-medium"
              >
                {name}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom bar — legal + copyright */}
        <div className="py-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-600 text-sm">
            © {new Date().getFullYear()} VidShield AI. All rights reserved.
          </p>

          {/* Legal links */}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
            {[
              { label: 'Privacy Policy', href: '#' },
              { label: 'Terms & Conditions', href: '#' },
              { label: 'Cookie Policy', href: '#' },
              { label: 'GDPR Compliance', href: '#security' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-slate-600 hover:text-slate-400 text-xs transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* System status */}
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-slate-500 text-xs">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
