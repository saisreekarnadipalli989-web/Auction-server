import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../services/api';
import { Auction, ListingCategory, ListingCondition, AuctionStatus } from '../types';
import { AuctionCard } from '../components/AuctionCard';
import { Search, Filter, SlidersHorizontal, ArrowUpDown, X, Layers } from 'lucide-react';

export const MarketplacePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const search = searchParams.get('search') || '';
  const category = (searchParams.get('category') as ListingCategory) || '';
  const condition = (searchParams.get('condition') as ListingCondition) || '';
  const status = (searchParams.get('status') as AuctionStatus) || '';
  const sort = searchParams.get('sort') || 'endingSoon';

  useEffect(() => {
    setIsLoading(true);
    const params: any = { sort };
    if (search) params.search = search;
    if (category) params.category = category;
    if (condition) params.condition = condition;
    if (status) params.status = status;

    api
      .getAuctions(params)
      .then((res) => {
        setAuctions(res.items || []);
        setTotalCount(res.pagination?.total || 0);
      })
      .catch((err) => {
        console.error('Failed to load marketplace auctions:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [search, category, condition, status, sort]);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) {
      next.set(key, value);
    } else {
      next.delete(key);
    }
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams(new URLSearchParams());
  };

  const categoryOptions = [
    { label: 'All Categories', value: '' },
    { label: 'Textbooks', value: ListingCategory.TEXTBOOKS },
    { label: 'Electronics', value: ListingCategory.ELECTRONICS },
    { label: 'Lab Equipment', value: ListingCategory.LAB_EQUIPMENT },
    { label: 'Calculators', value: ListingCategory.CALCULATORS },
    { label: 'Other', value: ListingCategory.OTHER },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-200">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Campus Marketplace</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse verified auctions from students, lab TAs, and campus seniors
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Sort Selector */}
          <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-700">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              value={sort}
              onChange={(e) => updateParam('sort', e.target.value)}
              className="bg-transparent focus:outline-none cursor-pointer"
            >
              <option value="endingSoon">Ending Soon</option>
              <option value="newest">Recently Listed</option>
              <option value="highestBid">Highest Bid</option>
              <option value="mostBids">Most Bids</option>
            </select>
          </div>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {categoryOptions.map((cat) => {
          const isActive = category === cat.value;
          return (
            <button
              key={cat.label}
              onClick={() => updateParam('category', cat.value)}
              className={`px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white text-gray-700 border border-gray-200 hover:border-emerald-500'
              }`}
            >
              {cat.label}
            </button>
          );
        })}

        {(category || condition || status || search) && (
          <button
            onClick={clearAllFilters}
            className="inline-flex items-center space-x-1 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-full transition-colors ml-auto"
          >
            <X className="w-3.5 h-3.5" />
            <span>Reset Filters</span>
          </button>
        )}
      </div>

      {/* Auctions Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="h-80 bg-gray-100 rounded-2xl animate-pulse"></div>
          ))}
        </div>
      ) : auctions.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pt-4">
          {auctions.map((auction) => (
            <AuctionCard key={auction.id} auction={auction} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-200/80 shadow-sm max-w-lg mx-auto">
          <Layers className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-gray-900">No auctions found</h3>
          <p className="text-xs text-gray-500 mt-1 max-w-xs mx-auto">
            Try adjusting your search criteria or resetting filters to discover more items.
          </p>
          <button
            onClick={clearAllFilters}
            className="mt-4 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition-colors"
          >
            Clear all filters
          </button>
        </div>
      )}
    </div>
  );
};
