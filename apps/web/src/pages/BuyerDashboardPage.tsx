import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Layers, Gavel, Award, Bookmark, ArrowRight, TrendingUp } from 'lucide-react';

export const BuyerDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [bids, setBids] = useState<any[]>([]);
  const [watchlist, setWatchlist] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.getMyBids(), api.getMyWatchlist()])
      .then(([bidsRes, watchlistRes]) => {
        setBids(bidsRes || []);
        setWatchlist(watchlistRes || []);
      })
      .catch((err) => {
        console.error('Failed to load buyer dashboard:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const leadingBids = bids.filter((b) => b.auction.isLeading && b.auction.status === 'ACTIVE');
  const outbidBids = bids.filter((b) => !b.auction.isLeading && b.auction.status === 'ACTIVE');
  const wonAuctions = bids.filter((b) => b.auction.isLeading && b.auction.status === 'CLOSED_WITH_WINNER');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Buyer Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">
          Track all your active bids, winning items, and bookmarked campus auctions
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{leadingBids.length}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Currently Leading</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
            <Gavel className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{outbidBids.length}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Outbid Auctions</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-200/80 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-black text-gray-900">{wonAuctions.length}</div>
            <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">Auctions Won</div>
          </div>
        </div>
      </div>

      {/* Bids List */}
      <div className="bg-white rounded-3xl border border-gray-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Recent Bidding Activity</h2>
          <span className="text-xs text-gray-500">{bids.length} Total Bids</span>
        </div>

        {bids.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {bids.map((b) => (
              <div key={b.bidId} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-xl bg-gray-100 overflow-hidden shrink-0">
                    <img
                      src={b.auction.listingImage || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=150'}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 line-clamp-1">{b.auction.listingTitle}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className="text-xs text-gray-500">
                        Your bid: <strong>${b.amount.toFixed(2)}</strong>
                      </span>
                      <span>•</span>
                      <span className="text-xs text-gray-500">
                        Highest: <strong>${b.auction.currentHighestBid.toFixed(2)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-4 self-end sm:self-center">
                  {b.auction.isLeading ? (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Highest Bidder
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                      Outbid
                    </span>
                  )}

                  <Link
                    to={`/auctions/${b.auction.id}`}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    <span>View Auction</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 text-xs">
            You haven't placed any bids yet. Explore the marketplace to find textbooks, electronics, and lab gear!
          </div>
        )}
      </div>
    </div>
  );
};
