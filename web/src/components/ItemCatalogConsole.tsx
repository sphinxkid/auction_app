import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Crown,
  History,
  Shield,
  Sparkles,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Layers,
  UserCheck,
  List
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

type RankHistoryMode = 'rank_as_key' | 'member_as_key';

export const ItemCatalogConsole: React.FC<ItemCatalogConsoleProps> = ({
  items,
  fetchItems,
  loading,
  setLoading,
  showMsg,
  renderMemberBadge,
}) => {
  const [itemSubView, setItemSubView] = useState<ItemSubView>('list');
  const [rankHistoryMode, setRankHistoryMode] = useState<RankHistoryMode>('rank_as_key');

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

  // Process Item Rank History chronologically from Left (Oldest) to Right (Latest)
  const processRankHistoryMatrix = () => {
    if (!queueRankHistory || queueRankHistory.length === 0) {
      return { events: [], membersMap: new Map(), distinctRanks: [], ranksMap: new Map() };
    }

    // 1. Group unique events (Auction Resolution Events)
    const eventsMap = new Map<string, { key: string; auctionId: number; auctionTitle: string; recordedAt: string }>();
    queueRankHistory.forEach((r) => {
      const key = `${r.auction_id}_${r.recorded_at}`;
      if (!eventsMap.has(key)) {
        eventsMap.set(key, {
          key,
          auctionId: r.auction_id,
          auctionTitle: r.auction_title,
          recordedAt: r.recorded_at,
        });
      }
    });

    // Sort events chronologically ASCENDING (Left = Oldest, Right = Latest)
    const sortedEvents = Array.from(eventsMap.values()).sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );

    // 2. Map of MemberID -> Member Info & Ranks by Event Key (Member as Key)
    const membersMap = new Map<
      number,
      {
        memberId: number;
        memberName: string;
        memberClass?: GuildClass;
        ranksByEvent: Map<string, ItemRankHistoryItem>;
      }
    >();

    // 3. Map of RankNumber -> Map of EventKey -> ItemRankHistoryItem (Rank as Key)
    const ranksMap = new Map<number, Map<string, ItemRankHistoryItem>>();
    const distinctRanksSet = new Set<number>();

    queueRankHistory.forEach((r) => {
      const eventKey = `${r.auction_id}_${r.recorded_at}`;
      distinctRanksSet.add(r.rank);

      // Populate Members Map
      if (!membersMap.has(r.member_id)) {
        membersMap.set(r.member_id, {
          memberId: r.member_id,
          memberName: r.member_name,
          memberClass: r.member_class,
          ranksByEvent: new Map(),
        });
      }
      membersMap.get(r.member_id)!.ranksByEvent.set(eventKey, r);

      // Populate Ranks Map
      if (!ranksMap.has(r.rank)) {
        ranksMap.set(r.rank, new Map());
      }
      ranksMap.get(r.rank)!.set(eventKey, r);
    });

    const sortedDistinctRanks = Array.from(distinctRanksSet).sort((a, b) => a - b);

    return { events: sortedEvents, membersMap, distinctRanks: sortedDistinctRanks, ranksMap };
  };

  const {
    events: historyEvents,
    membersMap: historyMembersMap,
    distinctRanks: historyDistinctRanks,
    ranksMap: historyRanksMap,
  } = processRankHistoryMatrix();

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
            3. Item Rank History
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
                    placeholder="e.g. Traveler's Note"
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
                    placeholder="e.g. Notes taken on the road. Used to upgrade Titles."
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

      {/* 3. ITEM RANK HISTORY SUB-VIEW */}
      {itemSubView === 'rank_history' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                  Left-to-Right Historical Timeline
                </span>
                <h2 className="text-xl font-black text-slate-100 mt-1 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Item Rank History for {selectedQueueItemObj?.name}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Chronological progression per item from <strong>Left (Oldest)</strong> to <strong>Right (Latest)</strong>.
                </p>
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

            {/* DUAL SUB-TABS: 1. RANK POSITION VIEW (RANK AS KEY) vs 2. MEMBER PROGRESSION VIEW (MEMBER AS KEY) */}
            <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-950/80 rounded-xl border border-slate-800 w-fit">
              <button
                onClick={() => setRankHistoryMode('rank_as_key')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  rankHistoryMode === 'rank_as_key'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                1. Rank Position View (Rank as Key)
              </button>

              <button
                onClick={() => setRankHistoryMode('member_as_key')}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  rankHistoryMode === 'member_as_key'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserCheck className="w-3.5 h-3.5" />
                2. Member Progression View (Member as Key)
              </button>
            </div>

            {historyEvents.length > 0 ? (
              <div className="space-y-8">
                {/* TAB 1: RANK POSITION VIEW (RANK AS KEY) */}
                {rankHistoryMode === 'rank_as_key' && (
                  <div className="space-y-3">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      Rank Position Matrix (Rows = Ranks, Columns = Left Oldest → Right Latest)
                    </h3>

                    <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                            <th className="py-3.5 px-4 min-w-[120px] sticky left-0 bg-slate-900 z-10 text-center">
                              Rank Position
                            </th>
                            {historyEvents.map((evt, idx) => {
                              const isLatest = idx === historyEvents.length - 1;
                              return (
                                <th
                                  key={evt.key}
                                  className={`py-3.5 px-4 text-center border-l border-slate-800/80 min-w-[150px] ${
                                    isLatest ? 'bg-purple-950/40 text-purple-200' : ''
                                  }`}
                                >
                                  <div className="flex flex-col items-center gap-0.5">
                                    <span className="font-extrabold text-slate-200 text-xs">
                                      {evt.auctionTitle}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-mono">
                                      {new Date(evt.recordedAt).toLocaleDateString()}
                                    </span>
                                    {isLatest && (
                                      <span className="mt-0.5 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-2 py-0.2 rounded-full border border-emerald-500/40">
                                        Latest
                                      </span>
                                    )}
                                  </div>
                                </th>
                              );
                            })}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                          {historyDistinctRanks.map((rankNum) => (
                            <tr key={rankNum} className="hover:bg-slate-900/40">
                              <td className="py-3.5 px-4 font-black text-amber-400 text-center sticky left-0 bg-slate-950/90 z-10 border-r border-slate-800 text-sm">
                                Rank #{rankNum}
                              </td>

                              {historyEvents.map((evt, idx) => {
                                const isLatest = idx === historyEvents.length - 1;
                                const rec = historyRanksMap.get(rankNum)?.get(evt.key);

                                return (
                                  <td
                                    key={evt.key}
                                    className={`py-3 px-4 text-center border-l border-slate-800/60 ${
                                      isLatest ? 'bg-purple-950/20' : ''
                                    }`}
                                  >
                                    {rec ? (
                                      <div className="flex flex-col items-center gap-1">
                                        {renderMemberBadge(rec.member_name, rec.member_class)}
                                        {rec.status === 'PAST_WINNER' ? (
                                          <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 shadow-sm">
                                            Past Winner
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-slate-500">
                                            Waiting
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-slate-600 text-xs">-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* TAB 2: MEMBER PROGRESSION VIEW (MEMBER AS KEY) */}
                {rankHistoryMode === 'member_as_key' && (
                  <div className="space-y-8">
                    <div className="space-y-3">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-purple-400" />
                        Member Rank Progression Matrix (Rows = Members, Columns = Left Oldest → Right Latest)
                      </h3>

                      <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse min-w-[700px]">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                              <th className="py-3.5 px-4 min-w-[180px] sticky left-0 bg-slate-900 z-10">
                                Guild Member
                              </th>
                              {historyEvents.map((evt, idx) => {
                                const isLatest = idx === historyEvents.length - 1;
                                return (
                                  <th
                                    key={evt.key}
                                    className={`py-3.5 px-4 text-center border-l border-slate-800/80 min-w-[140px] ${
                                      isLatest ? 'bg-purple-950/40 text-purple-200' : ''
                                    }`}
                                  >
                                    <div className="flex flex-col items-center gap-0.5">
                                      <span className="font-extrabold text-slate-200 text-xs">
                                        {evt.auctionTitle}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        {new Date(evt.recordedAt).toLocaleDateString()}
                                      </span>
                                      {isLatest && (
                                        <span className="mt-0.5 text-[9px] font-black uppercase text-emerald-400 bg-emerald-500/20 px-2 py-0.2 rounded-full border border-emerald-500/40">
                                          Latest
                                        </span>
                                      )}
                                    </div>
                                  </th>
                                );
                              })}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60 text-slate-200">
                            {Array.from(historyMembersMap.values()).map((memInfo) => (
                              <tr key={memInfo.memberId} className="hover:bg-slate-900/40">
                                <td className="py-3 px-4 font-bold sticky left-0 bg-slate-950/90 z-10 border-r border-slate-800">
                                  {renderMemberBadge(memInfo.memberName, memInfo.memberClass)}
                                </td>

                                {historyEvents.map((evt, idx) => {
                                  const isLatest = idx === historyEvents.length - 1;
                                  const currentRec = memInfo.ranksByEvent.get(evt.key);
                                  const prevEvt = idx > 0 ? historyEvents[idx - 1] : null;
                                  const prevRec = prevEvt ? memInfo.ranksByEvent.get(prevEvt.key) : null;

                                  let rankChange: 'up' | 'down' | 'same' | null = null;
                                  if (currentRec && prevRec) {
                                    if (currentRec.rank < prevRec.rank) {
                                      rankChange = 'up';
                                    } else if (currentRec.rank > prevRec.rank) {
                                      rankChange = 'down';
                                    } else {
                                      rankChange = 'same';
                                    }
                                  }

                                  return (
                                    <td
                                      key={evt.key}
                                      className={`py-3 px-4 text-center border-l border-slate-800/60 ${
                                        isLatest ? 'bg-purple-950/20' : ''
                                      }`}
                                    >
                                      {currentRec ? (
                                        <div className="flex flex-col items-center gap-1">
                                          <div className="flex items-center gap-1">
                                            <span className="font-black text-amber-300 text-sm">
                                              #{currentRec.rank}
                                            </span>
                                            {rankChange === 'up' && (
                                              <span title="Rank improved">
                                                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                                              </span>
                                            )}
                                            {rankChange === 'down' && (
                                              <span title="Rank moved down">
                                                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
                                              </span>
                                            )}
                                          </div>

                                          {currentRec.status === 'PAST_WINNER' ? (
                                            <span className="text-[9px] font-black uppercase text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded-full border border-amber-500/40 shadow-sm">
                                              Past Winner
                                            </span>
                                          ) : (
                                            <span className="text-[9px] font-bold text-slate-400">
                                              Waiting
                                            </span>
                                          )}
                                        </div>
                                      ) : (
                                        <span className="text-slate-600 text-xs">-</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* INDIVIDUAL MEMBER TIMELINE TRAIL CARDS */}
                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-300 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Member Rank History Progression Trails
                      </h3>

                      <div className="grid grid-cols-1 gap-4">
                        {Array.from(historyMembersMap.values()).map((memInfo) => {
                          const memberRecords = historyEvents
                            .map((evt) => memInfo.ranksByEvent.get(evt.key))
                            .filter((r): r is ItemRankHistoryItem => r !== undefined);

                          if (memberRecords.length === 0) return null;

                          return (
                            <div
                              key={memInfo.memberId}
                              className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3"
                            >
                              <div className="flex items-center justify-between">
                                {renderMemberBadge(memInfo.memberName, memInfo.memberClass)}
                                <span className="text-[10px] font-mono text-slate-500 uppercase">
                                  History Snapshots: {memberRecords.length}
                                </span>
                              </div>

                              {/* Chronological Left to Right Trail */}
                              <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1">
                                {memberRecords.map((rec, rIdx) => {
                                  const isLatest = rIdx === memberRecords.length - 1;
                                  const isWinner = rec.status === 'PAST_WINNER';

                                  return (
                                    <React.Fragment key={rec.id}>
                                      <div
                                        className={`p-2.5 rounded-xl border flex flex-col items-center gap-1 shrink-0 transition-all ${
                                          isLatest
                                            ? 'bg-purple-950/60 border-purple-500 shadow-md'
                                            : isWinner
                                            ? 'bg-amber-950/40 border-amber-500/50'
                                            : 'bg-slate-900/60 border-slate-800'
                                        }`}
                                      >
                                        <span className="text-[10px] font-bold text-slate-400 max-w-[100px] truncate">
                                          {rec.auction_title}
                                        </span>
                                        <span className="text-xs font-black text-amber-300">
                                          Rank #{rec.rank}
                                        </span>
                                        <span
                                          className={`text-[9px] font-bold px-2 py-0.2 rounded-full ${
                                            isWinner
                                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                              : 'bg-slate-800 text-slate-400'
                                          }`}
                                        >
                                          {isWinner ? 'Winner' : 'Waiting'}
                                        </span>
                                        {isLatest && (
                                          <span className="text-[8px] font-black uppercase tracking-wider text-emerald-400">
                                            (Latest)
                                          </span>
                                        )}
                                      </div>

                                      {rIdx < memberRecords.length - 1 && (
                                        <ChevronRight className="w-4 h-4 text-purple-400/60 shrink-0" />
                                      )}
                                    </React.Fragment>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 italic p-12 text-center border border-dashed border-slate-800 rounded-xl">
                No rank history records found for {selectedQueueItemObj?.name} yet. Item rank history is automatically recorded whenever an item auction resolves.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
