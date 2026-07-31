'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAccount, useDisconnect } from 'wagmi';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { 
  Search, 
  Menu, 
  X, 
  Video, 
  TrendingUp, 
  Upload, 
  Wallet,
  LayoutDashboard,
  User,
  LogOut,
  ChevronDown,
  Bell,
  Settings
} from 'lucide-react';
import { truncateAddress } from '@/lib/utils';
import styles from './Header.module.css';

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { address, isConnected } = useAccount();
  const { disconnect } = useDisconnect();

  const navLinks = [
    { href: '/', label: 'Home', icon: Video },
    { href: '/discover', label: 'Discover', icon: Search },
    { href: '/trending', label: 'Trending', icon: TrendingUp },
    { href: '/upload', label: 'Upload', icon: Upload },
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/search?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        {/* Logo */}
        <Link href="/" className={styles.logo}>
          <div className={styles.logoIcon}>
            <Video className="w-6 h-6" />
          </div>
          <span className={styles.logoText}>NexaStream</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className={styles.nav}>
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className={styles.navLink}>
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className={styles.searchForm}>
          <div className={styles.searchContainer}>
            <Search className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search videos, creators, topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>
        </form>

        {/* Right Side Actions */}
        <div className={styles.actions}>
          {/* Wallet Connection */}
          <ConnectButton 
            chainStatus="icon"
            accountStatus="avatar"
            showBalance={false}
          />

          {/* Notifications */}
          {isConnected && (
            <button className={styles.iconButton}>
              <Bell className="w-5 h-5" />
              <span className={styles.notificationBadge}>3</span>
            </button>
          )}

          {/* User Menu */}
          {isConnected && address ? (
            <div className={styles.userMenu}>
              <button className={styles.userButton}>
                <div className={styles.userAvatar}>
                  {address.slice(2, 4).toUpperCase()}
                </div>
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <p className={styles.dropdownAddress}>
                    {truncateAddress(address)}
                  </p>
                </div>
                <Link href="/dashboard" className={styles.dropdownItem}>
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
                <Link href="/wallet" className={styles.dropdownItem}>
                  <Wallet className="w-4 h-4" />
                  Wallet
                </Link>
                <Link href="/profile" className={styles.dropdownItem}>
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link href="/settings" className={styles.dropdownItem}>
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <hr className={styles.dropdownDivider} />
                <button 
                  onClick={() => disconnect()}
                  className={styles.dropdownItem}
                >
                  <LogOut className="w-4 h-4" />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <Link href="/login" className={styles.loginButton}>
              Sign In
            </Link>
          )}

          {/* Mobile Menu Toggle */}
          <button 
            className={styles.menuToggle}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className={styles.mobileMenu}>
          <form onSubmit={handleSearch} className={styles.mobileSearch}>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.mobileSearchInput}
            />
          </form>
          <nav className={styles.mobileNav}>
            {navLinks.map((link) => (
              <Link 
                key={link.href} 
                href={link.href} 
                className={styles.mobileNavLink}
                onClick={() => setIsMenuOpen(false)}
              >
                <link.icon className="w-5 h-5" />
                {link.label}
              </Link>
            ))}
            {isConnected && (
              <>
                <Link href="/dashboard" className={styles.mobileNavLink}>
                  <LayoutDashboard className="w-5 h-5" />
                  Dashboard
                </Link>
                <Link href="/wallet" className={styles.mobileNavLink}>
                  <Wallet className="w-5 h-5" />
                  Wallet
                </Link>
                <Link href="/profile" className={styles.mobileNavLink}>
                  <User className="w-5 h-5" />
                  Profile
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
