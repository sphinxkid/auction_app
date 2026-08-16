import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  ArrowUp,
  ArrowDown,
  Award,
  Crown,
  History,
  Shield,
  Clock,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  Item,
  QueueRanking,
  ItemRankHistoryItem,
  ItemSubView,
  GuildClass
} from '../types';

interface ItemCatalogConsoleProps {
  items: Item[];
  fetchItems: () => Promise<void>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMsg: (type: 'success' | 'error', text: string) => void;
  renderMemberBadge: (name: string, guildClass?: GuildClass, extraSuffix?: React.ReactNode) => React.ReactNode;
}

export const ItemCatalogConsole: React.FC<ItemCatalogConsoleProps> = ({
  items,
  fetchItems,
  loading,
  setLoading,
  showMsg,
  renderMemberBadge,
}) => {
  const [itemSubView, setItemSubView] = useState<ItemSubView>('list');

  // New Catalog Item Form State
  const [newItemName, setNewItemName] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [newItemIsRepeatable, setNewItemIsRepeatable] = useState(true);

  // Priority Queue Rankings State
  const [selectedQueueItemId, setSelectedQueueItemId] = useState<number | null>(null);
  const [queueRankings, setQueueRankings] = useState<QueueRanking[]>([]);
  const [queueRankHistory, setQueueRankHistory] = useState<ItemRankHistoryItem[]>([]);

  useEffect(() => {
    if (items.length > 0 && selectedQueueItemId === null) {
      setSelectedQueueItemId(items[0].id);
    }
  }, [items]);

  const fetchQueueAndHistory = async (itemId: number) => {
    try {
      const qRes = await fetch(`/api/v1/items/${itemId}/rankings`);
      if (qRes.ok) {
        const qData: QueueRanking[] = await qRes.json();
        setQueueRankings(qData);
      }

      const hRes = await fetch(`/api/v1/history/ranks/items/${itemId}`);
      if (hRes.ok) {
        const hData: ItemRankHistoryItem[] = await hRes.json();
        setQueueRankHistory(hData);
      }
    } catch (err) {
      console.error('Failed to fetch queue rankings & history:', err);
    }
  };

  useEffect(() => {
    if (selectedQueueItemId) {
      fetchQueueAndHistory(selectedQueueItemId);
    }
  }, [selectedQueueItemId]);

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) {
      showMsg('error', 'Item Name is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newItemName.trim(),
          description: newItemDescription.trim(),
          is_repeatable: newItemIsRepeatable,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create raid item');
      }

      showMsg('success', `Raid Item "${newItemName}" added to catalog successfully!`);
      setNewItemName('');
      setNewItemDescription('');
      setNewItemIsRepeatable(true);
      await fetchItems();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  const selectedQueueItemObj = items.find((i) => i.id === selectedQueueItemId);

  return (
    <div className="space-y-6">
      {/* ITEM CATALOG SUB-NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setItemSubView('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              itemSubView === 'list'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            1. Items Catalog
          </button>

          <button
            onClick={() => setItemSubView('priority_queue')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              itemSubView === 'priority_queue'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Crown className="w-4 h-4 text-amber-400" />
            2. Item Priority Queue
          </button>

          <button
            onClick={() => setItemSubView('rank_history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              itemSubView === 'rank_history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            3. Item Rank History Log
          </button>
        </div>
      </div>

      {/* 1. ITEMS CATALOG SUB-VIEW */}
      {itemSubView === 'list' && (
        <div className="space-y-6">
          {/* Create New Item Form */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <Plus className="w-5 h-5 text-purple-400" />
              Add New Raid Item to Catalog
            </h3>

            <form onSubmit={handleCreateItem} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Item Name:
                  </label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    placeholder="e.g. Thunderfury, Blessed Blade"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Description / Reagent Info:
                  </label>
                  <input
                    type="text"
                    value={newItemDescription}
                    onChange={(e) => setNewItemDescription(e.target.value)}
                    placeholder="e.g. Legendary elemental sword."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newItemIsRepeatable}
                    onChange={(e) => setNewItemIsRepeatable(e.target.checked)}
                    className="rounded border-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs text-slate-300 font-bold">
                    Repeatable Item (Can be dropped multiple times across raid nights)
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Save Item to Catalog
                </button>
              </div>
            </form>
          </div>

          {/* Items Catalog List */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              Registered Raid Items Catalog ({items.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="font-extrabold text-amber-300 text-sm flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                        {item.name}
                      </h4>
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                          item.is_repeatable
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {item.is_repeatable ? 'Repeatable' : 'One-time'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 2. ITEM PRIORITY QUEUE SUB-VIEW */}
      {itemSubView === 'priority_queue' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                  Item Allocation Queue
                </span>
                <h2 className="text-xl font-black text-slate-100 mt-1 flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-400" />
                  Priority Queue Rankings Per Item
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Select Item:</span>
                <select
                  value={selectedQueueItemId || ''}
                  onChange={(e) => setSelectedQueueItemId(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs font-extrabold text-amber-300 focus:outline-none focus:border-purple-500"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedQueueItemObj && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20 text-amber-400">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-100 text-sm">{selectedQueueItemObj.name}</h3>
                      <p className="text-xs text-slate-400">{selectedQueueItemObj.description}</p>
                    </div>
                  </div>
                  <span className="text-xs font-black text-purple-300 bg-purple-500/20 px-3 py-1 rounded-full border border-purple-500/30">
                    Queue Members: {queueRankings.length}
                  </span>
                </div>

                <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4 text-center w-16">Rank</th>
                        <th className="py-3 px-4">Guild Member</th>
                        <th className="py-3 px-4 text-center">Status</th>
                        <th className="py-3 px-4 text-right">Last Won At</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {queueRankings.map((rk) => {
                        const memberObj = rk.member;
                        const memberName = rk.member_name || memberObj?.name || `Member #${rk.member_id}`;
                        const isPastWinner = rk.status === 'PAST_WINNER';

                        return (
                          <tr key={rk.id} className="hover:bg-slate-900/40">
                            <td className="py-3 px-4 text-center font-black text-amber-400">#{rk.rank}</td>
                            <td className="py-3 px-4 font-bold">
                              {renderMemberBadge(memberName, memberObj?.class)}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                  isPastWinner
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {isPastWinner ? 'Past Winner' : 'Waiting'}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                              {rk.last_won_at ? new Date(rk.last_won_at).toLocaleDateString() : 'Never'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. ITEM RANK HISTORY LOG SUB-VIEW */}
      {itemSubView === 'rank_history' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                  Historical Queue Logs
                </span>
                <h2 className="text-xl font-black text-slate-100 mt-1 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Item Queue Snapshot Logs
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Select Item:</span>
                <select
                  value={selectedQueueItemId || ''}
                  onChange={(e) => setSelectedQueueItemId(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs font-extrabold text-amber-300 focus:outline-none focus:border-purple-500"
                >
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="py-3 px-4">Recorded At</th>
                    <th className="py-3 px-4">Raid Auction</th>
                    <th className="py-3 px-4 text-center">Rank</th>
                    <th className="py-3 px-4">Member</th>
                    <th className="py-3 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {queueRankHistory.map((h) => (
                    <tr key={h.id} className="hover:bg-slate-900/40">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {new Date(h.recorded_at).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-purple-300">{h.auction_title}</td>
                      <td className="py-3 px-4 text-center font-black text-amber-400">#{h.rank}</td>
                      <td className="py-3 px-4 font-bold">
                        {renderMemberBadge(h.member_name, h.member_class)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-slate-300">{h.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
