import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  Swords, 
  Crown, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Plus, 
  Play, 
  RotateCcw, 
  Sparkles,
  Trophy,
  History,
  Layers
} from 'lucide-react';

interface Member {
  id: number;
  name: string;
  discord_id: string;
  created_at: string;
}

interface Item {
  id: number;
  name: string;
  description: string;
  is_repeatable: boolean;
}

interface Intent {
  id: number;
  auction_item_id: number;
  member_id: number;
  submitted_at: string;
  member?: Member;
}

interface AuctionItem {
  id: number;
  auction_id: number;
  item_id: number;
  quantity: number;
  status: 'PENDING' | 'RESOLVED';
  resolved_at?: string;
  item?: Item;
  intents?: Intent[];
}

interface Auction {
  id: number;
  title: string;
  status: 'DRAFT' | 'ACTIVE' | 'RESOLVED';
  auction_date: string;
  auction_items?: AuctionItem[];
}

interface QueueRanking {
  id: number;
  item_id: number;
  item_name: string;
  member_id: number;
  member_name: string;
  discord_id: string;
  rank: number;
  status: 'WAITING' | 'PAST_WINNER';
  last_won_at?: string;
  updated_at: string;
}

interface AllocationHistoryItem {
  id: number;
  auction_id: number;
  auction_title: string;
  item_id: number;
  item_name: string;
  member_id: number;
  member_name: string;
  discord_id: string;
  allocated_quantity: number;
  allocated_at: string;
}

export const LootQueueConsole: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeAuction, setActiveAuction] = useState<Auction | null>(null);
  
  // Create Auction Form state
  const [newTitle, setNewTitle] = useState('Raid Night - Molten Core');
  const [selectedItemQuantities, setSelectedItemQuantities] = useState<{ [itemId: number]: number }>({
    1: 2, // Primordial Essence Qty 2
    2: 1, // Dragon Scale Qty 1
  });

  // Selected item for Queue & Audit Panel
  const [selectedQueueItemId, setSelectedQueueItemId] = useState<number>(1);
  const [queueRankings, setQueueRankings] = useState<QueueRanking[]>([]);
  const [historyItems, setHistoryItems] = useState<AllocationHistoryItem[]>([]);

  // Loading & Error states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInitialData = async () => {
    try {
      const [membersRes, itemsRes, activeAuctionRes] = await Promise.all([
        fetch('/api/v1/members'),
        fetch('/api/v1/items'),
        fetch('/api/v1/auctions/active'),
      ]);

      if (membersRes.ok) setMembers(await membersRes.json());
      if (itemsRes.ok) {
        const fetchedItems: Item[] = await itemsRes.json();
        setItems(fetchedItems);
        if (fetchedItems.length > 0 && !selectedQueueItemId) {
          setSelectedQueueItemId(fetchedItems[0].id);
        }
      }
      if (activeAuctionRes.ok) {
        const auctionData = await activeAuctionRes.json();
        setActiveAuction(auctionData && auctionData.id ? auctionData : null);
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  const fetchQueueAndHistory = async (itemId: number) => {
    if (!itemId) return;
    try {
      const [queueRes, historyRes] = await Promise.all([
        fetch(`/api/v1/items/${itemId}/rankings`),
        fetch(`/api/v1/history/items/${itemId}`),
      ]);
      if (queueRes.ok) setQueueRankings(await queueRes.json());
      if (historyRes.ok) setHistoryItems(await historyRes.json());
    } catch (err) {
      console.error('Failed to fetch queue or history:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedQueueItemId) {
      fetchQueueAndHistory(selectedQueueItemId);
    }
  }, [selectedQueueItemId]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  // Handle Create Auction
  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const itemsToSubmit = Object.entries(selectedItemQuantities)
      .filter(([_key, qty]: [string, number]) => qty > 0)
      .map(([itemIdStr, qty]: [string, number]) => ({
        item_id: parseInt(itemIdStr, 10),
        quantity: qty,
      }));

    if (itemsToSubmit.length === 0) {
      showMsg('error', 'Please select at least one item with quantity > 0.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/v1/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle,
          items: itemsToSubmit,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to create auction');
      }

      const auctionData: Auction = await res.json();
      setActiveAuction(auctionData);
      showMsg('success', `Created auction "${auctionData.title}" successfully!`);
      if (auctionData.auction_items && auctionData.auction_items.length > 0) {
        setSelectedQueueItemId(auctionData.auction_items[0].item_id);
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Error creating auction');
    } finally {
      setLoading(false);
    }
  };

  // Handle Submit / Toggle Intent to Buy
  const handleToggleIntent = async (auctionItemId: number, memberId: number) => {
    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update intent');
      }

      // Refresh active auction state
      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction);
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Error updating intent');
    }
  };

  // Handle Resolve Item
  const handleResolveItem = async (auctionItemId: number, itemId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/resolve`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to resolve item');
      }

      const result = await res.json();
      showMsg(
        'success', 
        `Resolved item! ${result.allocated_quantity} allocation(s) made. ${
          result.is_auction_fully_resolved ? 'Parent Auction FULLY RESOLVED 🎉' : 'Auction remains ACTIVE.'
        }`
      );

      // Refresh active auction & queue tables
      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
      }

      fetchQueueAndHistory(itemId);
    } catch (err: any) {
      showMsg('error', err.message || 'Error resolving item');
    } finally {
      setLoading(false);
    }
  };

  // Compute progress tracker
  const totalItems = activeAuction?.auction_items?.length || 0;
  const resolvedItems = activeAuction?.auction_items?.filter((i: AuctionItem) => i.status === 'RESOLVED').length || 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Top Banner Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl border-purple-500/20 shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/30">
            <Crown className="w-8 h-8 text-amber-300" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-purple-300 bg-clip-text text-transparent">
              Guild Loot Queue Console
            </h1>
            <p className="text-sm text-slate-400 font-medium">
              Granular Item Resolution & 3-Tier Priority Queue System
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`px-4 py-2.5 rounded-xl font-medium text-sm border flex items-center gap-2 animate-fade-in ${
              message.type === 'success'
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            {message.text}
          </div>
        )}
      </header>

      {/* Grid Layout: Setup Panel (Left) & Active Auction (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Panel 1: Auction Setup Panel */}
        <section className="lg:col-span-4 glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 text-purple-400 font-semibold border-b border-slate-800 pb-3">
            <Plus className="w-5 h-5" />
            <h2 className="text-lg">Create New Raid Auction</h2>
          </div>

          <form onSubmit={handleCreateAuction} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Auction Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Molten Core - Raid Night"
                className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Items & Quantities
              </label>
              <div className="space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-sm font-semibold text-slate-200">{item.name}</p>
                      <p className="text-xs text-slate-400 line-clamp-1">{item.description}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Qty:</span>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={selectedItemQuantities[item.id] || 0}
                        onChange={(e) =>
                          setSelectedItemQuantities({
                            ...selectedItemQuantities,
                            [item.id]: parseInt(e.target.value, 10) || 0,
                          })
                        }
                        className="w-16 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-center text-sm font-semibold text-amber-400 focus:outline-none"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              {loading ? 'Creating Auction...' : 'Launch Raid Auction'}
            </button>
          </form>
        </section>

        {/* Panel 2: Active Auction Header & Item Cards */}
        <section className="lg:col-span-8 space-y-6">
          {activeAuction ? (
            <div className="space-y-6">
              {/* Global Auction Header Card */}
              <div className="glass-panel p-6 rounded-2xl border-purple-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-white">{activeAuction.title}</h2>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider ${
                        activeAuction.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      }`}
                    >
                      {activeAuction.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Auction Date: {new Date(activeAuction.auction_date).toLocaleString()}
                  </p>
                </div>

                {/* Progress Tracker Badge */}
                <div className="bg-slate-900/80 px-4 py-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
                  <div className="text-right">
                    <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Progress
                    </span>
                    <span className="text-sm font-bold text-amber-400">
                      {resolvedItems} / {totalItems} Items Resolved
                    </span>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-xs font-extrabold text-purple-300">
                    {Math.round((resolvedItems / (totalItems || 1)) * 100)}%
                  </div>
                </div>
              </div>

              {/* Item Auction Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {activeAuction.auction_items?.map((ai) => {
                  const intentSubmitterIDs = new Set(ai.intents?.map((i) => i.member_id) || []);
                  const isResolved = ai.status === 'RESOLVED';
                  const intentCount = ai.intents?.length || 0;

                  return (
                    <div
                      key={ai.id}
                      className={`glass-card p-5 rounded-2xl border transition-all space-y-4 ${
                        isResolved
                          ? 'border-slate-800 opacity-85'
                          : 'border-purple-500/30 hover:border-purple-500/60 shadow-lg shadow-purple-500/5'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
                        <div>
                          <h3 className="font-bold text-base text-amber-300 flex items-center gap-1.5">
                            <Shield className="w-4 h-4 text-amber-400" />
                            {ai.item?.name}
                          </h3>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{ai.item?.description}</p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${
                            isResolved
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                          }`}
                        >
                          {ai.status}
                        </span>
                      </div>

                      {/* Quantity & Stats */}
                      <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/60 px-3 py-2 rounded-lg border border-slate-800">
                        <span>Quantity Available: <strong className="text-amber-400">{ai.quantity}</strong></span>
                        <span>Intents Submitted: <strong className="text-purple-400">{intentCount}</strong></span>
                      </div>

                      {/* Member Intent Grid */}
                      <div>
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Submit Member Intent
                        </span>
                        <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                          {members.map((m) => {
                            const isSubmitted = intentSubmitterIDs.has(m.id);
                            return (
                              <button
                                key={m.id}
                                disabled={isResolved}
                                onClick={() => handleToggleIntent(ai.id, m.id)}
                                className={`p-2 rounded-xl border text-left transition-all flex items-center justify-between gap-1 text-xs ${
                                  isSubmitted
                                    ? 'bg-purple-600/20 border-purple-500 text-purple-200'
                                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                                } ${isResolved ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span className="font-semibold truncate">{m.name}</span>
                                {isSubmitted && <UserCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Action Button: Resolve Item */}
                      <button
                        disabled={isResolved || intentCount === 0 || loading}
                        onClick={() => handleResolveItem(ai.id, ai.item_id)}
                        className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          isResolved
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : intentCount === 0
                            ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {isResolved ? 'Item Resolved' : intentCount === 0 ? 'No Intents Submitted' : 'Resolve This Item'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl border-slate-800 text-center space-y-4">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-600">
                <Swords className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-300">No Active Raid Auction</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                Use the setup panel on the left to launch a new raid auction with raid loot items.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* Panel 3: Live Queue & Audit Panel */}
      <section className="glass-panel p-6 rounded-2xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2 text-indigo-400 font-semibold">
            <Layers className="w-5 h-5" />
            <h2 className="text-lg">Live Priority Queue & Allocation Audit</h2>
          </div>

          {/* Item Selector Tabs */}
          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
            {items.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedQueueItemId(item.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedQueueItemId === item.id
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {item.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tables Grid: Queue Ranking (Left) & Allocation History (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Live Queue Ranking Table */}
          <div className="lg:col-span-7 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              Sequential Priority Queue Ranks (1..M)
            </h3>

            <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Rank</th>
                    <th className="py-3 px-4">Guild Member</th>
                    <th className="py-3 px-4">Discord ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Last Won</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {queueRankings.length > 0 ? (
                    queueRankings.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-extrabold text-amber-400">#{r.rank}</td>
                        <td className="py-3 px-4 font-semibold text-slate-100">{r.member_name}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{r.discord_id}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.status === 'WAITING'
                                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400 text-[11px]">
                          {r.last_won_at ? new Date(r.last_won_at).toLocaleTimeString() : 'Never'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No active queue rankings recorded for this item yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Allocation Audit Log Table */}
          <div className="lg:col-span-5 space-y-3">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Allocation Audit History
            </h3>

            <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Winner</th>
                    <th className="py-3 px-4">Auction</th>
                    <th className="py-3 px-4">Allocated At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {historyItems.length > 0 ? (
                    historyItems.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4 font-semibold text-amber-300">{h.member_name}</td>
                        <td className="py-3 px-4 text-slate-400 truncate max-w-[120px]">{h.auction_title}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                          {new Date(h.allocated_at).toLocaleTimeString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-6 text-center text-slate-500">
                        No resolved allocations for this item yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
