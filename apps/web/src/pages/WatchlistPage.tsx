import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { Auction } from '../types';
import { AuctionCard } from '../components/AuctionCard';
import { Bookmark, Layers } from 'lucide-react';

export const WatchlistPage: React.FC = () => {
  const [watchlist, setWatchlist] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getMyWatchlist()
      .then((res) => {
        setWatchlist(res || []);
      })
      .catch((err) => {
        console.error('Failed to load watchlist:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <Bookmark className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Saved Watchlist</h1>
          <p className="text-sm text-gray-500">Track and jump directly into your bookmarked auctions</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : watchlist.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
          {watchlist.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-200/80 shadow-sm max-w-lg mx-auto">
          <Bookmark className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">Your watchlist is empty</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Click the bookmark icon on any auction detail page to keep track of its countdown here.
          </p>
        </div>
      )}
    </div>
  );
};
