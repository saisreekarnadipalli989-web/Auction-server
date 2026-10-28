import React from 'react';
import { Link } from 'react-router-dom';
import { CountdownTimer } from './CountdownTimer';
import { Auction, AuctionStatus } from '../types';
import { Gavel, User, Sparkles } from 'lucide-react';

interface AuctionCardProps {
  auction: Auction;
}

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction }) => {
  const listing = auction.listing;
  const primaryImage = listing?.images?.find((img) => img.isPrimary)?.url || listing?.images?.[0]?.url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600';
  const currentBid = auction.currentHighestBid ? Number(auction.currentHighestBid) : Number(listing?.startingPrice || 0);

  const isClosed = auction.status === AuctionStatus.CLOSED_WITH_WINNER || auction.status === AuctionStatus.CLOSED_WITHOUT_BIDS;
  const isScheduled = auction.status === AuctionStatus.SCHEDULED;

  return (
    <div className="bg-white rounded-2xl border border-gray-200/80 hover:border-emerald-500/50 hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300 flex flex-col overflow-hidden group">
      {/* Product Image Container */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        <img
          src={primaryImage}
          alt={listing?.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />

        {/* Floating Category Pill */}
        <div className="absolute top-3 left-3 flex items-center space-x-1.5">
          <span className="px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase bg-black/60 backdrop-blur-md text-white rounded-full">
            {listing?.category?.replace('_', ' ')}
          </span>
          <span className="px-2 py-0.5 text-[10px] font-semibold bg-white/80 backdrop-blur-md text-gray-800 rounded-full">
            {listing?.condition?.replace('_', ' ')}
          </span>
        </div>

        {/* Floating Status / Timer Badge */}
        <div className="absolute top-3 right-3">
          {isClosed ? (
            <span className="px-2.5 py-1 text-xs font-semibold bg-gray-900/80 backdrop-blur-md text-white rounded-full">
              {auction.status === AuctionStatus.CLOSED_WITH_WINNER ? 'Sold' : 'Ended'}
            </span>
          ) : isScheduled ? (
            <span className="px-2.5 py-1 text-xs font-semibold bg-blue-600/90 backdrop-blur-md text-white rounded-full">
              Starts Soon
            </span>
          ) : (
            <CountdownTimer
              endTime={auction.endTime}
              isExtended={auction.extensionCount > 0}
              className="shadow-sm backdrop-blur-md"
            />
          )}
        </div>
      </div>

      {/* Card Content */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm leading-snug group-hover:text-emerald-600 transition-colors">
            {listing?.title}
          </h3>

          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-2">
            <User className="w-3.5 h-3.5" />
            <span>{listing?.seller?.fullName || 'Campus Seller'}</span>
          </div>
        </div>

        {/* Price & Bids Row */}
        <div className="mt-4 pt-3 border-t border-gray-100 flex items-end justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold block">
              {auction.bidCount > 0 ? 'Current Bid' : 'Starting Price'}
            </span>
            <div className="flex items-baseline space-x-1">
              <span className="text-lg font-bold text-gray-900">
                ${currentBid.toFixed(2)}
              </span>
              {auction.bidCount > 0 && (
                <span className="text-[11px] text-gray-500 font-medium">
                  ({auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'})
                </span>
              )}
            </div>
          </div>

          <Link
            to={`/auctions/${auction.id}`}
            className="inline-flex items-center space-x-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-600 hover:text-white rounded-lg transition-colors"
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>{isClosed ? 'View Result' : 'Place Bid'}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
