import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { Auction, Bid, AuctionStatus } from '../types';
import { CountdownTimer } from '../components/CountdownTimer';
import {
  Gavel,
  ShieldCheck,
  Zap,
  Bookmark,
  Share2,
  Clock,
  User,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Award,
} from 'lucide-react';

export const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isAuthenticated } = useAuth();
  const { socket, isConnected, joinAuction, leaveAuction } = useSocket();

  const [auction, setAuction] = useState<Auction | null>(null);
  const [bids, setBids] = useState<Bid[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [bidAmount, setBidAmount] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [extensionNotice, setExtensionNotice] = useState<string | null>(null);

  // 1. Initial Data Fetch
  useEffect(() => {
    if (!id) return;
    setIsLoading(true);

    api
      .getAuction(id)
      .then((data) => {
        setAuction(data);
        setBids(data.bids || []);
        setBidAmount(String(data.nextMinBid || data.listing.startingPrice));
      })
      .catch((err) => {
        setErrorMessage('Failed to load auction details');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [id]);

  // 2. Real-Time Socket.IO Subscription
  useEffect(() => {
    if (!id || !socket || !isConnected) return;

    joinAuction(id);

    const onBidAccepted = (payload: any) => {
      if (payload.auctionId === id) {
        setAuction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            currentHighestBid: payload.amount,
            currentHighestBidderId: payload.bidderId,
            currentHighestBidder: {
              id: payload.bidderId,
              fullName: payload.bidderName,
            },
            bidCount: payload.bidCount,
            nextMinBid: payload.nextMinBid,
          };
        });

        const newBid: Bid = {
          id: payload.bidId,
          auctionId: id,
          amount: payload.amount,
          bidderId: payload.bidderId,
          bidder: {
            id: payload.bidderId,
            fullName: payload.bidderName,
          },
          createdAt: payload.createdAt,
          status: 'ACCEPTED',
        };

        setBids((prev) => [newBid, ...prev]);
        setBidAmount(String(payload.nextMinBid));
      }
    };

    const onAuctionExtended = (payload: any) => {
      if (payload.auctionId === id) {
        setAuction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            endTime: payload.newEndTime,
            extensionCount: payload.extensionCount,
          };
        });
        setExtensionNotice(payload.reason || 'Auction extended by anti-sniping soft close!');
        setTimeout(() => setExtensionNotice(null), 8000);
      }
    };

    const onAuctionClosed = (payload: any) => {
      if (payload.auctionId === id) {
        setAuction((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: payload.status,
            closedAt: payload.closedAt,
            winningBid: payload.winnerId
              ? {
                  id: 'win',
                  auctionId: id,
                  amount: payload.winningAmount,
                  bidderId: payload.winnerId,
                  bidder: { id: payload.winnerId, fullName: payload.winningBidderName },
                  createdAt: payload.closedAt,
                  status: 'ACCEPTED',
                }
              : undefined,
          };
        });
      }
    };

    socket.on('bid:accepted', onBidAccepted);
    socket.on('auction:extended', onAuctionExtended);
    socket.on('auction:closed', onAuctionClosed);

    return () => {
      leaveAuction(id);
      socket.off('bid:accepted', onBidAccepted);
      socket.off('auction:extended', onAuctionExtended);
      socket.off('auction:closed', onAuctionClosed);
    };
  }, [id, socket, isConnected]);

  // 3. Bid Placement Submission
  const handlePlaceBid = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !auction) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    const numericAmount = parseFloat(bidAmount);
    if (isNaN(numericAmount) || numericAmount < auction.nextMinBid) {
      setErrorMessage(`Bid must be at least $${auction.nextMinBid.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    // Generate fresh UUIDv4 Idempotency-Key
    const idempotencyKey = crypto.randomUUID ? crypto.randomUUID() : `idemp-${Date.now()}-${Math.random()}`;

    try {
      const res = await api.placeBid(id, numericAmount, idempotencyKey);
      setSuccessMessage(`Bid of $${numericAmount.toFixed(2)} accepted! You are currently the highest bidder.`);
      setBidAmount(String(res.auction.nextMinBid));
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to place bid. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickIncrement = (inc: number) => {
    if (!auction) return;
    const currentNext = auction.nextMinBid || Number(auction.currentHighestBid || 0) + 1;
    setBidAmount(String((currentNext + inc).toFixed(2)));
  };

  const handleToggleWatchlist = async () => {
    if (!id || !isAuthenticated) return;
    try {
      const res = await api.toggleWatchlist(id);
      setIsWatchlisted(res.isWatchlisted);
    } catch (err) {
      console.error('Watchlist toggle error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 h-96 bg-gray-100 rounded-3xl animate-pulse"></div>
          <div className="lg:col-span-5 h-96 bg-gray-100 rounded-3xl animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!auction) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-gray-900">Auction not found</h2>
        <Link to="/marketplace" className="text-emerald-600 text-sm font-semibold mt-2 inline-block">
          Return to Marketplace
        </Link>
      </div>
    );
  }

  const listing = auction.listing;
  const isSeller = user?.id === listing.sellerId;
  const isClosed = auction.status === AuctionStatus.CLOSED_WITH_WINNER || auction.status === AuctionStatus.CLOSED_WITHOUT_BIDS;
  const isWinner = isClosed && auction.currentHighestBidderId === user?.id;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Soft-close / Anti-sniping notification banner */}
      {extensionNotice && (
        <div className="bg-amber-500 text-white px-4 py-3 rounded-2xl shadow-lg flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center space-x-2 text-sm font-semibold">
            <Zap className="w-5 h-5 animate-bounce" />
            <span>{extensionNotice}</span>
          </div>
          <span className="text-xs font-mono uppercase bg-amber-600 px-2 py-0.5 rounded">Soft Close</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Images & Product Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* Main Image Gallery */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-4 shadow-sm overflow-hidden space-y-4">
            <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-gray-50 flex items-center justify-center">
              <img
                src={listing.images[selectedImageIndex]?.url || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600'}
                alt={listing.title}
                className="w-full h-full object-cover"
              />
            </div>

            {listing.images.length > 1 && (
              <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                {listing.images.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                      selectedImageIndex === idx ? 'border-emerald-600 ring-2 ring-emerald-500/20' : 'border-gray-200'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Description & Details */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm space-y-4">
            <h2 className="text-lg font-bold text-gray-900">Item Specifications</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold block">Condition</span>
                <span className="text-sm font-bold text-gray-900">{listing.condition.replace('_', ' ')}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold block">Category</span>
                <span className="text-sm font-bold text-gray-900">{listing.category.replace('_', ' ')}</span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                <span className="text-[11px] uppercase tracking-wide text-gray-400 font-semibold block">Min Increment</span>
                <span className="text-sm font-bold text-gray-900">${Number(listing.minIncrement).toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-bold text-gray-900 mb-2">Description</h3>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{listing.description}</p>
            </div>
          </div>

          {/* Seller Campus Profile Card */}
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-sm flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src={listing.seller.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(listing.seller.fullName)}`}
                alt={listing.seller.fullName}
                className="w-12 h-12 rounded-full border border-gray-200 object-cover"
              />
              <div>
                <h4 className="text-sm font-bold text-gray-900">{listing.seller.fullName}</h4>
                <p className="text-xs text-gray-500">{listing.seller.bio || 'Verified University Campus Seller'}</p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>98% Trust Score</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Bidding Console */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-gray-200/80 p-6 shadow-xl space-y-6 sticky top-24">
            {/* Title & Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
                  {listing.category.replace('_', ' ')}
                </span>
                <button
                  onClick={handleToggleWatchlist}
                  className={`p-2 rounded-xl border transition-colors ${
                    isWatchlisted
                      ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                      : 'text-gray-400 hover:text-emerald-600 border-gray-200'
                  }`}
                  title="Add to Watchlist"
                >
                  <Bookmark className="w-4 h-4" />
                </button>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug">{listing.title}</h1>
            </div>

            {/* Countdown Box */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-xs text-gray-500 font-medium block">
                  {isClosed ? 'Final Status' : 'Auction Time Left'}
                </span>
                <div className="mt-1">
                  <CountdownTimer
                    endTime={auction.endTime}
                    isExtended={auction.extensionCount > 0}
                    className="text-sm"
                  />
                </div>
              </div>

              {auction.extensionCount > 0 && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {auction.extensionCount}x Soft-Close Extended
                  </span>
                </div>
              )}
            </div>

            {/* Current Price Display */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 to-teal-50/40 border border-emerald-100">
              <span className="text-xs uppercase tracking-wide text-emerald-800 font-semibold block">
                {auction.bidCount > 0 ? 'Current Leading Bid' : 'Starting Price'}
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-3xl sm:text-4xl font-black text-gray-900">
                  ${(auction.currentHighestBid ? Number(auction.currentHighestBid) : Number(listing.startingPrice)).toFixed(2)}
                </span>
                <span className="text-xs text-gray-500 font-medium">
                  ({auction.bidCount} {auction.bidCount === 1 ? 'bid' : 'bids'} total)
                </span>
              </div>

              {auction.currentHighestBidder && (
                <div className="mt-3 flex items-center space-x-2 text-xs text-emerald-900 font-medium">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span>
                    Highest Bidder: <strong className="font-semibold">{auction.currentHighestBidder.fullName}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Closed State Banner */}
            {isClosed ? (
              <div className={`p-5 rounded-2xl border text-center space-y-2 ${
                isWinner
                  ? 'bg-emerald-500 text-white border-emerald-600'
                  : 'bg-gray-100 text-gray-800 border-gray-200'
              }`}>
                {isWinner ? (
                  <>
                    <Award className="w-8 h-8 mx-auto" />
                    <h3 className="text-lg font-bold">You Won This Auction!</h3>
                    <p className="text-xs opacity-90">Winning bid of ${Number(auction.currentHighestBid).toFixed(2)} confirmed.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-bold">Auction Concluded</h3>
                    <p className="text-xs text-gray-600">
                      {auction.status === AuctionStatus.CLOSED_WITH_WINNER
                        ? `Sold to ${auction.currentHighestBidder?.fullName} for $${Number(auction.currentHighestBid).toFixed(2)}.`
                        : 'Auction closed without bids placed.'}
                    </p>
                  </>
                )}
              </div>
            ) : isSeller ? (
              /* Seller View Alert */
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs space-y-1">
                <p className="font-bold flex items-center">
                  <AlertTriangle className="w-4 h-4 mr-1 text-amber-600" />
                  You are the seller of this auction
                </p>
                <p className="opacity-90">
                  System security prevents sellers from bidding on their own listings to maintain marketplace trust.
                </p>
              </div>
            ) : (
              /* Bid Placement Form */
              <form onSubmit={handlePlaceBid} className="space-y-4">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-gray-700">Your Bid Amount ($USD)</span>
                    <span className="text-gray-500">
                      Min next bid: <strong>${auction.nextMinBid.toFixed(2)}</strong>
                    </span>
                  </div>

                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                    <input
                      type="number"
                      step="0.01"
                      min={auction.nextMinBid}
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value)}
                      placeholder={auction.nextMinBid.toFixed(2)}
                      className="w-full pl-8 pr-4 py-3 text-lg font-bold bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                      required
                    />
                  </div>
                </div>

                {/* Quick Bid Increment Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => handleQuickIncrement(1)}
                    className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg transition-colors"
                  >
                    +$1.00
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickIncrement(5)}
                    className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg transition-colors"
                  >
                    +$5.00
                  </button>
                  <button
                    type="button"
                    onClick={() => handleQuickIncrement(10)}
                    className="flex-1 py-1.5 text-xs font-semibold bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 text-gray-700 rounded-lg transition-colors"
                  >
                    +$10.00
                  </button>
                </div>

                {/* Error & Success Messages */}
                {errorMessage && (
                  <div className="p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-start space-x-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {successMessage && (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs rounded-xl border border-emerald-200 flex items-start space-x-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
                    <span>{successMessage}</span>
                  </div>
                )}

                {isAuthenticated ? (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
                  >
                    <Gavel className="w-4 h-4" />
                    <span>{isSubmitting ? 'Acquiring Lock & Validating...' : 'Submit Real-Time Bid'}</span>
                  </button>
                ) : (
                  <Link
                    to="/login"
                    className="w-full py-3.5 px-4 bg-gray-900 hover:bg-black text-white font-bold text-sm rounded-xl text-center block transition-colors"
                  >
                    Log In to Place Bids
                  </Link>
                )}

                <div className="text-[11px] text-gray-500 text-center flex items-center justify-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Protected by PostgreSQL Row Locking & Soft-Close</span>
                </div>
              </form>
            )}

            {/* Live Bid History Feed */}
            <div className="pt-4 border-t border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                  Live Bid Activity ({bids.length})
                </h3>
                <span className="flex items-center space-x-1 text-[11px] text-emerald-600 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                  <span>Live Stream</span>
                </span>
              </div>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {bids.length > 0 ? (
                  bids.map((b, idx) => (
                    <div
                      key={b.id || idx}
                      className={`flex items-center justify-between p-2.5 rounded-xl text-xs transition-colors ${
                        idx === 0 ? 'bg-emerald-50/80 border border-emerald-200' : 'bg-gray-50 border border-gray-100'
                      }`}
                    >
                      <div className="flex items-center space-x-2">
                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-700">
                          {b.bidder.fullName.charAt(0)}
                        </div>
                        <span className="font-semibold text-gray-800">{b.bidder.fullName}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-gray-900 block">${Number(b.amount).toFixed(2)}</span>
                        <span className="text-[10px] text-gray-400">
                          {new Date(b.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-400 text-center py-4">No bids placed yet. Be the first!</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
