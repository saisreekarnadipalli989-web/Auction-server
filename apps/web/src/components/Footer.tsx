import React from 'react';
import { Gavel, ShieldCheck, Zap, Database } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-400 text-sm mt-20 border-t border-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 text-white mb-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white">
                <Gavel className="w-4 h-4" />
              </div>
              <span className="text-lg font-bold">BidFlow</span>
            </div>
            <p className="text-gray-400 text-sm max-w-sm mb-4">
              Real-time campus auction marketplace engineered with PostgreSQL row-level locks, post-commit Socket.IO broadcasts, and transactional anti-sniping protection.
            </p>
            <div className="flex items-center space-x-3 text-xs text-gray-500">
              <span className="inline-flex items-center text-emerald-400">
                <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Concurrency Safe
              </span>
              <span>•</span>
              <span className="inline-flex items-center text-teal-400">
                <Zap className="w-3.5 h-3.5 mr-1" /> Real-Time Bidding
              </span>
              <span>•</span>
              <span className="inline-flex items-center text-sky-400">
                <Database className="w-3.5 h-3.5 mr-1" /> ACID Certified
              </span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Popular Categories</h4>
            <ul className="space-y-2 text-xs">
              <li><a href="/marketplace?category=TEXTBOOKS" className="hover:text-emerald-400">CS & Core Textbooks</a></li>
              <li><a href="/marketplace?category=ELECTRONICS" className="hover:text-emerald-400">Laptops & Hardware</a></li>
              <li><a href="/marketplace?category=CALCULATORS" className="hover:text-emerald-400">Graphing Calculators</a></li>
              <li><a href="/marketplace?category=LAB_EQUIPMENT" className="hover:text-emerald-400">Lab Equipment & Sensors</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-3">Architecture & Stack</h4>
            <ul className="space-y-2 text-xs">
              <li>React 18 + Vite + Tailwind</li>
              <li>NestJS + Modular TypeScript</li>
              <li>PostgreSQL 16 + Row Locking</li>
              <li>Socket.IO Dual-Way Events</li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500">
          <p>© {new Date().getFullYear()} BidFlow. Engineered for Computer Science Capstone & Enterprise Portfolios.</p>
          <p className="mt-2 sm:mt-0">Production Portfolio System</p>
        </div>
      </div>
    </footer>
  );
};
