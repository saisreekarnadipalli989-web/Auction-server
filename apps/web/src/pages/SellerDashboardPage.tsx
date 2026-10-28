import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Gavel, PlusCircle, ArrowRight, CheckCircle2, Clock } from 'lucide-react';

export const SellerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [auctions, setAuctions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getMyAuctions()
      .then((res) => {
        setAuctions(res || []);
      })
      .catch((err) => {
        console.error('Failed to load seller auctions:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const totalBidsReceived = auctions.reduce((acc, a) => acc + (a.bidCount || 0), 0);
  const activeAuctions = auctions.filter((a) => a.status === 'ACTIVE');
  const soldAuctions = auctions.filter((a) => a.status === 'CLOSED_WITH_WINNER');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Seller Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your created listings, monitor incoming bids, and inspect completed sales
          </p>
        </div>

        <Link
          to="/create-listing"
          className="inline-flex items-center space-x-2 px-5 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Auction Listing</span>
        </Link>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Active Auctions</div>
          <div className="text-3xl font-black text-gray-900">{activeAuctions.length}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Total Bids Received</div>
          <div className="text-3xl font-black text-emerald-600">{totalBidsReceived}</div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1">Completed Sales</div>
          <div className="text-3xl font-black text-blue-600">{soldAuctions.length}</div>
        </div>
      </div>

      {/* My Listings Table */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Your Listings & Auctions</h2>
          <span className="text-xs text-gray-500">{auctions.length} Total</span>
        </div>

        {auctions.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {auctions.map((a) => (
              <div key={a.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src={a.listing?.images?.[0]?.url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{a.listing?.title}</h3>
                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                      <span>Starting: ${Number(a.listing?.startingPrice).toFixed(2)}</span>
                      <span>•</span>
                      <span>Highest: <strong>${(a.currentHighestBid ? Number(a.currentHighestBid) : Number(a.listing?.startingPrice)).toFixed(2)}</strong></span>
                      <span>•</span>
                      <span>{a.bidCount} Bids</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3 self-end sm:self-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    a.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : a.status === 'CLOSED_WITH_WINNER'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {a.status.replace('_', ' ')}
                  </span>

                  <Link
                    to={`/auctions/${a.id}`}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <span>Inspect</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 text-xs">
            You haven't created any listings yet. Click <strong>New Auction Listing</strong> to get started!
          </div>
        )}
      </div>
    </div>
  );
};
