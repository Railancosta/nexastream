import Link from 'next/link';
import { Video, Twitter, Github, MessageCircle, Mail, ExternalLink } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  const footerLinks = {
    platform: [
      { label: 'About', href: '/about' },
      { label: 'Creators', href: '/creators' },
      { label: 'Advertise', href: '/advertise' },
      { label: 'Careers', href: '/careers' },
    ],
    resources: [
      { label: 'Help Center', href: '/help' },
      { label: 'Creator Academy', href: '/academy' },
      { label: 'Blog', href: '/blog' },
      { label: 'Community', href: '/community' },
    ],
    legal: [
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Cookie Policy', href: '/cookies' },
      { label: 'DMCA', href: '/dmca' },
    ],
  };

  const socialLinks = [
    { icon: Twitter, href: 'https://twitter.com/nexastream', label: 'Twitter' },
    { icon: Github, href: 'https://github.com/nexastream', label: 'GitHub' },
    { icon: MessageCircle, href: 'https://discord.gg/nexastream', label: 'Discord' },
  ];

  return (
    <footer className="bg-dark-200 border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-lg flex items-center justify-center">
                <Video className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">NexaStream</span>
            </Link>
            <p className="text-gray-400 mb-6 max-w-sm">
              The world's first democratic video platform. Earn from day one with instant USDC payouts 
              and transparent blockchain-powered algorithms.
            </p>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 text-gray-400 hover:text-primary transition-colors"
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Platform</h4>
            <ul className="space-y-2">
              {footerLinks.platform.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Resources</h4>
            <ul className="space-y-2">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              © {currentYear} NexaStream. All rights reserved.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <span>Built on</span>
              <span className="px-2 py-1 bg-primary/20 text-primary rounded text-xs font-semibold">
                Ethereum
              </span>
              <span>with</span>
              <span className="px-2 py-1 bg-accent/20 text-accent rounded text-xs font-semibold">
                USDC
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
