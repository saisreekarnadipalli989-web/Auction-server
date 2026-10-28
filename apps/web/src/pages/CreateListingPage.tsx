import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { ListingCategory, ListingCondition } from '../types';
import { PlusCircle, Image as ImageIcon, AlertTriangle, ArrowLeft } from 'lucide-react';

export const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<ListingCategory>(ListingCategory.TEXTBOOKS);
  const [condition, setCondition] = useState<ListingCondition>(ListingCondition.LIKE_NEW);
  const [startingPrice, setStartingPrice] = useState('25.00');
  const [minIncrement, setMinIncrement] = useState('2.00');
  const [imageUrl, setImageUrl] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const price = parseFloat(startingPrice);
    const inc = parseFloat(minIncrement);
    const hours = parseInt(durationHours, 10);

    if (isNaN(price) || price <= 0) {
      setError('Starting price must be greater than zero');
      return;
    }

    if (!imageUrl.trim()) {
      setError('Please provide at least one image URL for your item');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await api.createListing({
        title,
        description,
        category,
        condition,
        startingPrice: price,
        minIncrement: inc,
        imageUrls: [imageUrl.trim()],
        scheduleAuction: true,
        durationHours: hours,
      });

      const auctionId = res.auction?.id;
      if (auctionId) {
        navigate(`/auctions/${auctionId}`);
      } else {
        navigate('/marketplace');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create listing');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center space-x-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back</span>
      </button>

      <div className="bg-white rounded-3xl border border-gray-200/80 p-8 shadow-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">List an Item for Campus Auction</h1>
          <p className="text-sm text-gray-500 mt-1">
            Fill in the details below. An auction will be automatically scheduled for your listing.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-red-50 text-red-700 text-xs rounded-2xl border border-red-200 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Item Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to Algorithms 4th Edition (CLRS)"
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ListingCategory)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value={ListingCategory.TEXTBOOKS}>Textbooks</option>
                <option value={ListingCategory.ELECTRONICS}>Electronics & Laptops</option>
                <option value={ListingCategory.CALCULATORS}>Calculators</option>
                <option value={ListingCategory.LAB_EQUIPMENT}>Lab Equipment</option>
                <option value={ListingCategory.OTHER}>Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Condition
              </label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as ListingCondition)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value={ListingCondition.BRAND_NEW}>Brand New</option>
                <option value={ListingCondition.LIKE_NEW}>Like New (Mint)</option>
                <option value={ListingCondition.GOOD}>Good (Light wear)</option>
                <option value={ListingCondition.FAIR}>Fair (Usable)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Detailed Description
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe condition, course relevance (e.g. used in CS301), included accessories, notes..."
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Starting Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                value={startingPrice}
                onChange={(e) => setStartingPrice(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Min Increment ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                value={minIncrement}
                onChange={(e) => setMinIncrement(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
                Duration (Hours)
              </label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="1">1 Hour (Quick Test)</option>
                <option value="6">6 Hours</option>
                <option value="24">24 Hours (1 Day)</option>
                <option value="72">72 Hours (3 Days)</option>
                <option value="168">7 Days</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-2">
              Primary Image URL
            </label>
            <div className="relative">
              <ImageIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://images.unsplash.com/..."
                className="w-full pl-11 pr-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                required
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Paste an image link from Unsplash, Imgur, or direct campus photo host.
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center space-x-2"
          >
            <PlusCircle className="w-5 h-5" />
            <span>{isSubmitting ? 'Publishing & Scheduling...' : 'Publish Listing & Schedule Auction'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
