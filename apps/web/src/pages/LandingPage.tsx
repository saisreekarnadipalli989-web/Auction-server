import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Auction } from '../types';
import { AuctionCard } from '../components/AuctionCard';
import {
  Gavel,
  ShieldCheck,
  Zap,
  ArrowRight,
  BookOpen,
  Laptop,
  Cpu,
  Calculator,
  Flame,
  Clock,
  Sparkles,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const [activeAuctions, setActiveAuctions] = useState<Auction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    api
      .getAuctions({ limit: 4, sort: 'endingSoon' })
      .then((res) => {
        setActiveAuctions(res.items || []);
      })
      .catch((err) => {
        console.error('Failed to fetch landing auctions:', err);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const categories = [
    { name: 'Textbooks', key: 'TEXTBOOKS', icon: BookOpen, count: '14 active', color: 'from-amber-500/20 to-orange-500/10 text-amber-700' },
    { name: 'Laptops & Devices', key: 'ELECTRONICS', icon: Laptop, count: '8 active', color: 'from-blue-500/20 to-indigo-500/10 text-blue-700' },
    { name: 'Graphing Calculators', key: 'CALCULATORS', icon: Calculator, count: '6 active', color: 'from-emerald-500/20 to-teal-500/10 text-emerald-700' },
    { name: 'Lab Gear & Kits', key: 'LAB_EQUIPMENT', icon: Cpu, count: '5 active', color: 'from-purple-500/20 to-pink-500/10 text-purple-700' },
  ];

  return (
    <div className="space-y-16 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-emerald-50/50 via-white to-gray-50 border-b border-gray-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-emerald-100/80 text-emerald-800 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>The Fair Campus Marketplace with Concurrency Guarantees</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 tracking-tight leading-[1.15]">
                Real-Time Auctions for <br />
                <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                  Campus Gear & Textbooks.
                </span>
              </h1>

              <p className="text-lg text-gray-600 max-w-xl leading-relaxed">
                Never lose a bid to race conditions. BidFlow combines PostgreSQL row-level locks, post-commit Socket.IO events, and soft-close anti-sniping protection to power university student peer-to-peer commerce.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  to="/marketplace"
                  className="inline-flex items-center space-x-2 px-6 py-3 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-lg shadow-emerald-600/20 transition-all hover:translate-y-[-1px]"
                >
                  <Gavel className="w-5 h-5" />
                  <span>Explore Live Auctions</span>
                  <ArrowRight className="w-4 h-4 ml-1" />
                </Link>

                <Link
                  to="/create-listing"
                  className="inline-flex items-center space-x-2 px-6 py-3 text-base font-semibold text-gray-800 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-sm transition-all"
                >
                  <span>List An Item</span>
                </Link>
              </div>

              {/* Metric Highlights */}
              <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-200/80 max-w-lg">
                <div>
                  <div className="text-2xl font-black text-gray-900">&lt;50ms</div>
                  <div className="text-xs font-medium text-gray-500">Atomic Lock Latency</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-emerald-600">100%</div>
                  <div className="text-xs font-medium text-gray-500">ACID Serializability</div>
                </div>
                <div>
                  <div className="text-2xl font-black text-teal-600">+120s</div>
                  <div className="text-xs font-medium text-gray-500">Anti-Sniping Soft Close</div>
                </div>
              </div>
            </div>

            {/* Hero Visual Card / Live Preview */}
            <div className="lg:col-span-5 relative">
              <div className="bg-white rounded-3xl p-6 shadow-2xl shadow-emerald-500/10 border border-gray-200/80 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
                      Live Auction Stream
                    </span>
                  </div>
                  <span className="text-xs font-medium text-gray-400">PostgreSQL TX Locked</span>
                </div>

                <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100">
                  <img
                    src="https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=600"
                    alt="Textbook"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-3 left-3 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full text-white text-xs font-semibold">
                    CLRS 4th Edition (Algorithms)
                  </div>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 space-y-2 border border-gray-100">
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-gray-500 font-medium">Leading Bidder:</span>
                    <span className="text-sm font-semibold text-gray-900">Rahul Sharma (Sophomore)</span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-xs text-gray-500 font-medium">Current Highest Bid:</span>
                    <span className="text-2xl font-black text-emerald-600">$65.00</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Live Verified State:
                  </div>
                  <div className="flex items-center justify-between text-xs py-1.5 px-3 bg-emerald-50/80 text-emerald-800 rounded-lg">
                    <span className="flex items-center">
                      <ShieldCheck className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                      Row Lock: GRANTED
                    </span>
                    <span className="font-mono font-semibold">ISO LEVEL: SERIALIZABLE</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Campus Categories</h2>
            <p className="text-sm text-gray-500">Find exactly what you need for this semester</p>
          </div>
          <Link
            to="/marketplace"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center"
          >
            All categories <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.key}
                to={`/marketplace?category=${cat.key}`}
                className="p-5 rounded-2xl bg-white border border-gray-200/80 hover:border-emerald-500/50 hover:shadow-lg transition-all group flex items-start space-x-4"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 group-hover:text-emerald-600 transition-colors">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">{cat.count}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Ending Soon Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center">
              <Flame className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Ending Soon</h2>
              <p className="text-sm text-gray-500">Live auctions approaching their final deadlines</p>
            </div>
          </div>

          <Link
            to="/marketplace?sort=endingSoon"
            className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 flex items-center"
          >
            View all ending soon <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 bg-gray-100 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : activeAuctions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {activeAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No active auctions ending soon.</p>
          </div>
        )}
      </section>

      {/* Technical Engineering Highlights */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10">
        <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 rounded-3xl p-8 sm:p-12 text-white border border-gray-700 shadow-xl">
          <div className="max-w-3xl space-y-4">
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              System Engineering Architecture
            </span>
            <h2 className="text-3xl font-extrabold tracking-tight">
              Why BidFlow Handles High Concurrency Reliably
            </h2>
            <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
              Unlike typical portfolio CRUD apps that use naive memory stores or un-isolated SQL statements, BidFlow enforces strict database serializability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-8 border-t border-gray-800">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Pessimistic Row-Level Locks</span>
              </div>
              <p className="text-xs text-gray-400">
                PostgreSQL <code className="text-emerald-300">SELECT ... FOR UPDATE</code> locks serialize concurrent bids per auction. Impossible to generate lost updates or double-spend race conditions.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-teal-400 font-bold text-sm">
                <Zap className="w-5 h-5" />
                <span>Anti-Sniping Soft Close</span>
              </div>
              <p className="text-xs text-gray-400">
                If a valid bid lands in the final 30 seconds, the deadline automatically extends by 2 minutes, preventing bot sniping and ensuring fair human competition.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
                <Gavel className="w-5 h-5" />
                <span>SKIP LOCKED Worker</span>
              </div>
              <p className="text-xs text-gray-400">
                Scheduled background worker resolves expired auctions exactly once using PostgreSQL row skips. Survives process crashes with zero duplicate winners.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
