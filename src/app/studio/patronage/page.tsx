'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { API } from '../../../lib/api';
import {
  getTiersByCreator,
  createTier,
  updateTier,
  deleteTier,
  getPatronsByCreator,
  getCreatorPatronageRevenue,
  PatronageTier,
  Patron,
  BENEFIT_TYPES,
  BADGE_TYPES,
  formatCurrency
} from '../../../lib/patronage';

interface TierFormData {
  name: string;
  description: string;
  monthlyPriceUsd: number;
  benefits: Array<{
    type: string;
    badgeType?: string;
    badgeName?: string;
    name?: string;
    roleName?: string;
  }>;
  maxPatrons: number;
  isActive: boolean;
}

const BENEFIT_OPTIONS = [
  { value: BENEFIT_TYPES.BADGE, label: 'Badge' },
  { value: BENEFIT_TYPES.EARLY_ACCESS, label: 'Early Access' },
  { value: BENEFIT_TYPES.COMMUNITY_ROLE, label: 'Community Role' },
  { value: BENEFIT_TYPES.EXCLUSIVE_CONTENT, label: 'Exclusive Content' },
  { value: BENEFIT_TYPES.LIVE_CHAT_ACCESS, label: 'Live Chat Access' },
  { value: BENEFIT_TYPES.CUSTOM_EMOJI, label: 'Custom Emoji' },
  { value: BENEFIT_TYPES.CREDITS, label: 'Credits' },
  { value: BENEFIT_TYPES.DISCOUNT, label: 'Discount' }
];

const BADGE_TYPE_OPTIONS = [
  { value: BADGE_TYPES.PATRON, label: 'Patron' },
  { value: BADGE_TYPES.SUPPORTER, label: 'Supporter' },
  { value: BADGE_TYPES.VIP, label: 'VIP' },
  { value: BADGE_TYPES.FOUNDER, label: 'Founder' },
  { value: BADGE_TYPES.SPONSOR, label: 'Sponsor' }
];

export default function PatronagePage() {
  const { user, token } = useAuth();
  const [tiers, setTiers] = useState<PatronageTier[]>([]);
  const [patrons, setPatrons] = useState<Patron[]>([]);
  const [revenue, setRevenue] = useState({
    totalRevenue: 0,
    totalPatrons: 0,
    uniquePatrons: 0,
    averagePatronage: 0,
    platformShare: 0,
    creatorShare: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'tiers' | 'patrons' | 'analytics'>('tiers');

  // Tier management state
  const [editingTier, setEditingTier] = useState<PatronageTier | null>(null);
  const [showTierModal, setShowTierModal] = useState(false);
  const [tierForm, setTierForm] = useState<TierFormData>({
    name: '',
    description: '',
    monthlyPriceUsd: 5,
    benefits: [],
    maxPatrons: 0,
    isActive: true
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Load tiers
      const tiersData = await getTiersByCreator(user.username);
      setTiers(tiersData);
      
      // Load patrons
      const patronsData = await getPatronsByCreator(user.username);
      setPatrons(patronsData);
      
      // Load revenue
      const revenueData = await getCreatorPatronageRevenue(user.username);
      setRevenue({
        totalRevenue: revenueData.totalRevenue || 0,
        totalPatrons: revenueData.totalPatrons || 0,
        uniquePatrons: revenueData.uniquePatrons || 0,
        averagePatronage: revenueData.averagePatronage || 0,
        platformShare: revenueData.totalRevenue ? Math.round(revenueData.totalRevenue * 0.50 * 100) / 100 : 0,
        creatorShare: revenueData.totalRevenue ? Math.round(revenueData.totalRevenue * 0.50 * 100) / 100 : 0
      });
    } catch (e) {
      console.error('Failed to load patronage data:', e);
    } finally {
      setLoading(false);
    }
  }

  function openTierModal(tier: PatronageTier | null = null) {
    if (tier) {
      setEditingTier(tier);
      setTierForm({
        name: tier.name,
        description: tier.description || '',
        monthlyPriceUsd: tier.monthlyPriceUsd,
        benefits: tier.benefits || [],
        maxPatrons: tier.maxPatrons || 0,
        isActive: tier.isActive
      });
    } else {
      setEditingTier(null);
      setTierForm({
        name: '',
        description: '',
        monthlyPriceUsd: 5,
        benefits: [],
        maxPatrons: 0,
        isActive: true
      });
    }
    setShowTierModal(true);
    setError(null);
  }

  function closeTierModal() {
    setShowTierModal(false);
    setEditingTier(null);
  }

  function handleTierFormChange(field: string, value: any) {
    setTierForm(prev => ({ ...prev, [field]: value }));
  }

  function addBenefit() {
    setTierForm(prev => ({
      ...prev,
      benefits: [...prev.benefits, { type: BENEFIT_TYPES.BADGE, badgeType: BADGE_TYPES.PATRON }]
    }));
  }

  function removeBenefit(index: number) {
    setTierForm(prev => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index)
    }));
  }

  function updateBenefit(index: number, field: string, value: any) {
    setTierForm(prev => ({
      ...prev,
      benefits: prev.benefits.map((b, i) => 
        i === index ? { ...b, [field]: value } : b
      )
    }));
  }

  async function saveTier() {
    if (!user || !tierForm.name || tierForm.monthlyPriceUsd <= 0) {
      setError('Please fill all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const tierData = {
        creatorId: user.username,
        name: tierForm.name,
        description: tierForm.description,
        monthlyPriceUsd: tierForm.monthlyPriceUsd,
        benefits: tierForm.benefits,
        maxPatrons: tierForm.maxPatrons
      };

      let result;
      if (editingTier) {
        result = await updateTier(editingTier.id, { ...tierData, isActive: tierForm.isActive });
      } else {
        result = await createTier(tierData);
      }

      if (result && (result as any).error) {
        setError((result as any).error);
        return;
      }

      setSuccess(editingTier ? 'Tier updated successfully!' : 'Tier created successfully!');
      closeTierModal();
      loadData();
    } catch (e) {
      setError('Failed to save tier');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteTier(tierId: string) {
    if (!confirm('Are you sure you want to delete this tier? This cannot be undone.')) return;

    try {
      const result = await deleteTier(tierId, user.username);
      if (result && (result as any).error) {
        setError((result as any).error);
        return;
      }
      setSuccess('Tier deleted successfully!');
      loadData();
    } catch (e) {
      setError('Failed to delete tier');
    }
  }

  if (loading) {
    return (
      <main className="p-6 max-w-6xl mx-auto">
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="p-6 max-w-6xl mx-auto text-center py-20">
        <div className="w-20 h-20 rounded-full bg-gray-800 flex items-center justify-center text-3xl mx-auto mb-4">
          
        </div>
        <h1 className="text-2xl font-bold mb-2">Creator Patronage</h1>
        <p className="text-gray-400 mb-6">Please sign in to manage your patronage settings.</p>
        <a href="/login" className="px-6 py-3 rounded-full bg-indigo-600 font-semibold">Sign In</a>
      </main>
    );
  }

  const TABS = [
    { key: 'tiers' as const, label: 'Subscription Tiers', icon: '🏆' },
    { key: 'patrons' as const, label: 'My Patrons', icon: '👥' },
    { key: 'analytics' as const, label: 'Analytics', icon: '📊' }
  ];

  return (
    <main className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white mb-2">Creator Patronage</h1>
        <p className="text-gray-400">
          Manage your patronage program, create subscription tiers, and track your supporters.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Revenue</div>
          <div className="text-3xl font-bold text-indigo-400">
            {formatCurrency(revenue.totalRevenue)}
          </div>
          <div className="text-gray-500 text-xs mt-2">
            50% to you, 50% to platform owner wallet
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Active Patrons</div>
          <div className="text-3xl font-bold text-green-400">
            {revenue.uniquePatrons}
          </div>
          <div className="text-gray-500 text-xs mt-2">
            Unique supporters
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Subscription Tiers</div>
          <div className="text-3xl font-bold text-purple-400">
            {tiers.length}
          </div>
          <div className="text-gray-500 text-xs mt-2">
            Active tiers
          </div>
        </div>
        
        <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Avg. Patronage</div>
          <div className="text-3xl font-bold text-orange-400">
            {formatCurrency(revenue.averagePatronage)}
          </div>
          <div className="text-gray-500 text-xs mt-2">
            Per patron per month
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm transition-colors ${
              activeTab === tab.key
                ? 'bg-gray-700 text-white border-b-2 border-indigo-500'
                : 'text-gray-400 hover:text-gray-300'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'tiers' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Subscription Tiers</h2>
            <button
              onClick={() => openTierModal()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium text-sm text-white"
            >
              + Create Tier
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-500/20 border border-red-500 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-4 bg-green-500/20 border border-green-500 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}

          {tiers.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <div className="text-4xl mb-4">🎁</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Tiers Yet</h3>
              <p className="text-gray-400 mb-4">
                Create your first patronage tier to start accepting supporters.
              </p>
              <button
                onClick={() => openTierModal()}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium"
              >
                Create Your First Tier
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="bg-gray-800 rounded-xl p-5 border border-gray-700 hover:border-gray-600 transition-colors"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-white">{tier.name}</h3>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        tier.isActive
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-gray-600/20 text-gray-400'
                      }`}
                    >
                      {tier.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  
                  <p className="text-gray-400 text-sm mb-3 line-clamp-2">{tier.description}</p>
                  
                  <div className="mb-4">
                    <div className="text-2xl font-bold text-indigo-400">
                      {formatCurrency(tier.monthlyPriceUsd)}
                    </div>
                    <div className="text-gray-500 text-xs">/ month</div>
                  </div>

                  <div className="mb-4">
                    <div className="text-gray-400 text-sm mb-2">Benefits</div>
                    <div className="flex flex-wrap gap-1">
                      {tier.benefits && tier.benefits.length > 0 ? (
                        tier.benefits.slice(0, 3).map((benefit, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-gray-700 rounded text-xs text-gray-300"
                          >
                            {benefit.name || benefit.type}
                          </span>
                        ))
                      ) : (
                        <span className="text-gray-500 text-xs">No benefits defined</span>
                      )}
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="text-gray-400 text-sm">Patrons</div>
                    <div className="text-lg font-semibold text-white">
                      {tier.currentPatrons || 0} / {tier.maxPatrons > 0 ? tier.maxPatrons : '∞'}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openTierModal(tier)}
                      className="flex-1 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium text-white"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteTier(tier.id)}
                      className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 rounded-lg text-sm font-medium text-red-400"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'patrons' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">My Patrons</h2>
          
          {patrons.length === 0 ? (
            <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-semibold text-white mb-2">No Patrons Yet</h3>
              <p className="text-gray-400">
                Share your patronage link to start gaining supporters.
              </p>
            </div>
          ) : (
            <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="px-6 py-3 text-left text-gray-400 text-sm font-medium">Patron</th>
                    <th className="px-6 py-3 text-left text-gray-400 text-sm font-medium">Tier</th>
                    <th className="px-6 py-3 text-left text-gray-400 text-sm font-medium">Amount</th>
                    <th className="px-6 py-3 text-left text-gray-400 text-sm font-medium">Since</th>
                    <th className="px-6 py-3 text-left text-gray-400 text-sm font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {patrons.map((patron) => (
                    <tr key={patron.id} className="border-b border-gray-700/50 hover:bg-gray-700/50">
                      <td className="px-6 py-4">
                        <div className="text-white font-medium">
                          {patron.username || 'Anonymous'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-gray-700 rounded text-sm text-gray-300">
                          {patron.tier?.name || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-indigo-400">
                        {formatCurrency(patron.amountUsd)}
                      </td>
                      <td className="px-6 py-4 text-gray-400 text-sm">
                        {new Date(patron.startDate).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            patron.status === 'active'
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-gray-600/20 text-gray-400'
                          }`}
                        >
                          {patron.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white mb-4">Analytics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Revenue Over Time</h3>
              <p className="text-gray-400 text-sm">
                Coming soon: Detailed revenue charts and analytics.
              </p>
            </div>
            
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4">Patron Growth</h3>
              <p className="text-gray-400 text-sm">
                Coming soon: Track your patron growth over time.
              </p>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-4">Patronage Settings</h3>
            <p className="text-gray-400 text-sm mb-4">
              Configure your patronage program settings.
            </p>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-white font-medium">Platform Fee</div>
                  <div className="text-gray-400 text-sm">Percentage taken by NexaStream</div>
                </div>
                <div className="text-2xl font-bold text-orange-400">50%</div>
              </div>
              <div className="text-gray-500 text-sm">
                MANDATORY for nexastream.org: 50% to platform owner wallet, 50% to creators.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tier Modal */}
      {showTierModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto border border-gray-700">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-white">
                {editingTier ? 'Edit Tier' : 'Create New Tier'}
              </h2>
              <button
                onClick={closeTierModal}
                className="text-gray-400 hover:text-white text-2xl"
              >
                &times;
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); saveTier(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tier Name *
                </label>
                <input
                  type="text"
                  value={tierForm.name}
                  onChange={(e) => handleTierFormChange('name', e.target.value)}
                  placeholder="e.g., Gold Supporter"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={tierForm.description}
                  onChange={(e) => handleTierFormChange('description', e.target.value)}
                  placeholder="Describe what patrons get at this tier..."
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Monthly Price (USD) *
                </label>
                <input
                  type="number"
                  value={tierForm.monthlyPriceUsd}
                  onChange={(e) => handleTierFormChange('monthlyPriceUsd', parseFloat(e.target.value) || 0)}
                  min="0.99"
                  step="0.01"
                  placeholder="5.00"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Max Patrons (0 = Unlimited)
                </label>
                <input
                  type="number"
                  value={tierForm.maxPatrons}
                  onChange={(e) => handleTierFormChange('maxPatrons', parseInt(e.target.value) || 0)}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Active
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={tierForm.isActive}
                    onChange={(e) => handleTierFormChange('isActive', e.target.checked)}
                    className="w-4 h-4 text-indigo-600 bg-gray-700 border-gray-600 rounded focus:ring-indigo-500"
                  />
                  <span className="text-gray-300">
                    {tierForm.isActive ? 'Active - patrons can subscribe' : 'Inactive - no new subscriptions'}
                  </span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Benefits
                </label>
                <p className="text-gray-500 text-xs mb-2">
                  Define what patrons get at this tier
                </p>
                
                {tierForm.benefits.map((benefit, index) => (
                  <div key={index} className="mb-3 p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                    <div className="flex gap-2 mb-2">
                      <select
                        value={benefit.type}
                        onChange={(e) => updateBenefit(index, 'type', e.target.value)}
                        className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white"
                      >
                        {BENEFIT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                      
                      {benefit.type === BENEFIT_TYPES.BADGE && (
                        <>
                          <select
                            value={benefit.badgeType || BADGE_TYPES.PATRON}
                            onChange={(e) => updateBenefit(index, 'badgeType', e.target.value)}
                            className="px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white"
                          >
                            {BADGE_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={benefit.badgeName || ''}
                            onChange={(e) => updateBenefit(index, 'badgeName', e.target.value)}
                            placeholder="Badge name"
                            className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white placeholder-gray-400"
                          />
                        </>
                      )}
                      
                      {benefit.type === BENEFIT_TYPES.COMMUNITY_ROLE && (
                        <input
                          type="text"
                          value={benefit.roleName || ''}
                          onChange={(e) => updateBenefit(index, 'roleName', e.target.value)}
                          placeholder="Role name"
                          className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white placeholder-gray-400"
                        />
                      )}
                      
                      {benefit.type === BENEFIT_TYPES.EARLY_ACCESS && (
                        <input
                          type="text"
                          value={benefit.name || ''}
                          onChange={(e) => updateBenefit(index, 'name', e.target.value)}
                          placeholder="Early access description"
                          className="flex-1 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-sm text-white placeholder-gray-400"
                        />
                      )}
                      
                      <button
                        type="button"
                        onClick={() => removeBenefit(index)}
                        className="text-red-400 hover:text-red-300 text-xl leading-none"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addBenefit}
                  className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm text-white"
                >
                  + Add Benefit
                </button>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeTierModal}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg font-medium text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-400 disabled:cursor-not-allowed rounded-lg font-medium text-white"
                >
                  {submitting ? 'Saving...' : editingTier ? 'Update Tier' : 'Create Tier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
