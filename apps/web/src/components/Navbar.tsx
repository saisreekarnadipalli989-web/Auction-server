import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Gavel,
  Bell,
  PlusCircle,
  User as UserIcon,
  LogOut,
  Shield,
  Bookmark,
  Layers,
  Search,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout, isAdmin, isSeller } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/marketplace?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 group-hover:scale-105 transition-transform">
                <Gavel className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                  BidFlow
                </span>
                <span className="block text-[10px] uppercase tracking-wider font-semibold text-emerald-600 -mt-1">
                  Campus Marketplace
                </span>
              </div>
            </Link>

            <Link
              to="/marketplace"
              className="hidden md:inline-flex items-center text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors"
            >
              Browse Auctions
            </Link>
          </div>

          {/* Search bar */}
          <form onSubmit={handleSearchSubmit} className="hidden sm:flex flex-1 max-w-md mx-6">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search textbooks, laptops, calculators, lab gear..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          </form>

          {/* Action buttons */}
          <div className="flex items-center space-x-3">
            {isAuthenticated ? (
              <>
                {(isSeller || isAdmin) && (
                  <Link
                    to="/create-listing"
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">New Listing</span>
                  </Link>
                )}

                <Link
                  to="/notifications"
                  className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-gray-50 rounded-lg relative transition-colors"
                  title="Notifications"
                >
                  <Bell className="w-5 h-5" />
                </Link>

                <Link
                  to="/watchlist"
                  className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-gray-50 rounded-lg transition-colors hidden sm:inline-flex"
                  title="Watchlist"
                >
                  <Bookmark className="w-5 h-5" />
                </Link>

                {/* Profile menu */}
                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center space-x-2 p-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <img
                      src={user?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || 'User')}`}
                      alt={user?.fullName}
                      className="w-8 h-8 rounded-full border border-gray-200 object-cover"
                    />
                    <span className="hidden md:block text-sm font-medium text-gray-800">
                      {user?.fullName?.split(' ')[0]}
                    </span>
                  </button>

                  {dropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-1.5 z-50 animate-in fade-in slide-in-from-top-2"
                      onClick={() => setDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">{user?.fullName}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                        <span className="inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-emerald-50 text-emerald-700">
                          {user?.role}
                        </span>
                      </div>

                      <Link
                        to="/buyer-dashboard"
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        <Layers className="w-4 h-4" />
                        <span>My Bids & Activity</span>
                      </Link>

                      {(isSeller || isAdmin) && (
                        <Link
                          to="/seller-dashboard"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700"
                        >
                          <Gavel className="w-4 h-4" />
                          <span>Seller Dashboard</span>
                        </Link>
                      )}

                      {isAdmin && (
                        <Link
                          to="/admin"
                          className="flex items-center space-x-2 px-4 py-2 text-sm text-amber-700 hover:bg-amber-50"
                        >
                          <Shield className="w-4 h-4" />
                          <span>Admin Moderation</span>
                        </Link>
                      )}

                      <div className="border-t border-gray-100 my-1"></div>

                      <button
                        onClick={logout}
                        className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign out</span>
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-emerald-600 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors"
                >
                  Join Campus
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
