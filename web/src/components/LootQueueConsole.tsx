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
  Sparkles,
  Trophy,
  History,
  Layers,
  Search,
  UserPlus,
  ListChecks,
  User,
  ArrowUp,
  ArrowDown,
  Award,
  Edit3,
  Trash2
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

interface ItemResolutionResult {
  auction_id: number;
  auction_item_id: number;
  item_id: number;
  allocated_quantity: number;
  auction_item_status: string;
  auction_status: string;
  is_auction_fully_resolved: boolean;
  allocations: AllocationHistoryItem[];
  updated_rankings: QueueRanking[];
}

interface ItemRankHistoryItem {
  id: number;
  auction_id: number;
  auction_title: string;
  auction_item_id: number;
  item_id: number;
  item_name: string;
  member_id: number;
  member_name: string;
  discord_id: string;
  rank: number;
  status: string;
  recorded_at: string;
}

type TabType = 'create' | 'intent' | 'resolution' | 'queue';

interface DraftAuctionItem {
  item_id: number;
  item_name: string;
  quantity: number;
}

export const LootQueueConsole: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('create');

  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeAuction, setActiveAuction] = useState<Auction | null>(null);

  // Create Auction Form state
  const [newTitle, setNewTitle] = useState('Raid Night - Molten Core');
  
  // Searchable Item Selection for Draft Auction
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<number | null>(null);
  const [initialQuantityInput, setInitialQuantityInput] = useState<number>(0);
  const [draftAuctionItems, setDraftAuctionItems] = useState<DraftAuctionItem[]>([]);

  // Intent Submission Tab State
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedAuctionItemId, setSelectedAuctionItemId] = useState<number | null>(null);

  // Queue & Audit Panel state
  const [selectedQueueItemId, setSelectedQueueItemId] = useState<number>(1);
  const [queueRankings, setQueueRankings] = useState<QueueRanking[]>([]);
  const [historyItems, setHistoryItems] = useState<AllocationHistoryItem[]>([]);
  const [rankHistoryItems, setRankHistoryItems] = useState<ItemRankHistoryItem[]>([]);
  const [rankHistoryFilterMemberId, setRankHistoryFilterMemberId] = useState<number | 'ALL'>('ALL');

  // Resolution & Rank Shift tracking state
  const [lastResolutionResult, setLastResolutionResult] = useState<ItemResolutionResult | null>(null);
  const [previousRankingsMap, setPreviousRankingsMap] = useState<{ [memberId: number]: number }>({});

  // Loading & Notification states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInitialData = async () => {
    try {
      const [membersRes, itemsRes, activeAuctionRes] = await Promise.all([
        fetch('/api/v1/members'),
        fetch('/api/v1/items'),
        fetch('/api/v1/auctions/active'),
      ]);

      if (membersRes.ok) {
        const fetchedMembers: Member[] = await membersRes.json();
        setMembers(fetchedMembers);
        if (fetchedMembers.length > 0 && !selectedMemberId) {
          setSelectedMemberId(fetchedMembers[0].id);
        }
      }

      if (itemsRes.ok) {
        const fetchedItems: Item[] = await itemsRes.json();
        setItems(fetchedItems);
        if (fetchedItems.length > 0) {
          if (!selectedCatalogItemId) setSelectedCatalogItemId(fetchedItems[0].id);
          if (!selectedQueueItemId) setSelectedQueueItemId(fetchedItems[0].id);
          
          // Seed default draft list if empty
          if (draftAuctionItems.length === 0) {
            setDraftAuctionItems(
              fetchedItems.slice(0, 3).map((item) => ({
                item_id: item.id,
                item_name: item.name,
                quantity: 0, // default initial quantity 0
              }))
            );
          }
        }
      }

      if (activeAuctionRes.ok) {
        const auctionData: Auction = await activeAuctionRes.json();
        if (auctionData && auctionData.id) {
          setActiveAuction(auctionData);
          if (auctionData.auction_items && auctionData.auction_items.length > 0) {
            setSelectedAuctionItemId(auctionData.auction_items[0].id);
          }
        } else {
          setActiveAuction(null);
        }
      }
    } catch (err) {
      console.error('Failed to fetch initial data:', err);
    }
  };

  const fetchQueueAndHistory = async (itemId: number) => {
    if (!itemId) return;
    try {
      const [queueRes, historyRes, rankHistoryRes] = await Promise.all([
        fetch(`/api/v1/items/${itemId}/rankings`),
        fetch(`/api/v1/history/items/${itemId}`),
        fetch(`/api/v1/history/ranks/items/${itemId}`),
      ]);
      if (queueRes.ok) {
        const rankingsData: QueueRanking[] = await queueRes.json();
        setQueueRankings(rankingsData);
      }
      if (historyRes.ok) setHistoryItems(await historyRes.json());
      if (rankHistoryRes.ok) setRankHistoryItems(await rankHistoryRes.json());
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

  // Set default selected auction item if active auction changes
  useEffect(() => {
    if (activeAuction?.auction_items && activeAuction.auction_items.length > 0) {
      if (!selectedAuctionItemId || !activeAuction.auction_items.some(ai => ai.id === selectedAuctionItemId)) {
        setSelectedAuctionItemId(activeAuction.auction_items[0].id);
      }
    }
  }, [activeAuction]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Add Item to Draft Auction List
  const handleAddDraftItem = () => {
    if (!selectedCatalogItemId) return;
    const itemObj = items.find((i) => i.id === selectedCatalogItemId);
    if (!itemObj) return;

    if (draftAuctionItems.some((di) => di.item_id === itemObj.id)) {
      showMsg('error', `${itemObj.name} is already in the draft auction item list.`);
      return;
    }

    setDraftAuctionItems([
      ...draftAuctionItems,
      {
        item_id: itemObj.id,
        item_name: itemObj.name,
        quantity: Math.max(0, initialQuantityInput),
      },
    ]);

    showMsg('success', `Added ${itemObj.name} to auction draft list!`);
  };

  // Remove Item from Draft Auction List
  const handleRemoveDraftItem = (itemId: number) => {
    setDraftAuctionItems(draftAuctionItems.filter((di) => di.item_id !== itemId));
  };

  // Update Quantity of Item in Draft List
  const handleUpdateDraftQuantity = (itemId: number, newQty: number) => {
    setDraftAuctionItems(
      draftAuctionItems.map((di) =>
        di.item_id === itemId ? { ...di, quantity: Math.max(0, newQty) } : di
      )
    );
  };

  // Handle Create Auction
  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (draftAuctionItems.length === 0) {
      showMsg('error', 'Please add at least one item to the auction draft list.');
      setLoading(false);
      return;
    }

    const itemsToSubmit = draftAuctionItems.map((di) => ({
      item_id: di.item_id,
      quantity: Math.max(0, di.quantity),
    }));

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
      setLastResolutionResult(null); // reset last resolution
      showMsg('success', `Auction "${auctionData.title}" launched successfully! Quantities can be updated post-raid.`);
      
      if (auctionData.auction_items && auctionData.auction_items.length > 0) {
        setSelectedAuctionItemId(auctionData.auction_items[0].id);
        setSelectedQueueItemId(auctionData.auction_items[0].item_id);
      }

      // Automatically switch to the Submit Intent tab
      setActiveTab('intent');
    } catch (err: any) {
      showMsg('error', err.message || 'Error creating auction');
    } finally {
      setLoading(false);
    }
  };

  // Handle Update Auction Item Quantity Post-Creation
  const handleUpdateItemQuantity = async (auctionItemId: number, newQty: number) => {
    if (newQty < 0) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to update quantity');
      }

      // Refresh active auction state
      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction);
      }
      showMsg('success', `Auction item quantity updated to ${newQty}!`);
    } catch (err: any) {
      showMsg('error', err.message || 'Error updating quantity');
    } finally {
      setLoading(false);
    }
  };

  // Handle Submit / Toggle Intent to Buy
  const handleToggleIntent = async (auctionItemId: number, memberId: number) => {
    setLoading(true);
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
      showMsg('success', 'Intent to buy registered successfully!');
    } catch (err: any) {
      showMsg('error', err.message || 'Error updating intent');
    } finally {
      setLoading(false);
    }
  };

  // Handle Resolve Item & Track Rank Movement
  const handleResolveItem = async (auctionItemId: number, itemId: number) => {
    setLoading(true);

    // Snapshot current rankings for comparison
    const rankMap: { [memberId: number]: number } = {};
    queueRankings.forEach((r) => {
      rankMap[r.member_id] = r.rank;
    });
    setPreviousRankingsMap(rankMap);

    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/resolve`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to resolve item');
      }

      const result: ItemResolutionResult = await res.json();
      setLastResolutionResult(result);

      // Extract winner names for notification message
      const winnerNames = (result.allocations || [])
        .map((a) => {
          const m = members.find((mem) => mem.id === a.member_id);
          return m ? m.name : `Member #${a.member_id}`;
        })
        .join(', ');

      if (result.allocated_quantity === 0) {
        showMsg('success', `Item resolved with 0 quantity. Status updated to RESOLVED!`);
      } else {
        showMsg('success', `Resolved item! Winner(s): ${winnerNames || 'None'}. Rankings updated!`);
      }

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

  // Filter members by name or Discord ID
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.discord_id.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // Filter catalog items by search query
  const filteredCatalogItems = items.filter(
    (item) =>
      item.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  // Compute progress tracker
  const totalItems = activeAuction?.auction_items?.length || 0;
  const resolvedItems = activeAuction?.auction_items?.filter((i: AuctionItem) => i.status === 'RESOLVED').length || 0;

  const currentSelectedMember = members.find((m) => m.id === selectedMemberId);
  const currentSelectedAuctionItem = activeAuction?.auction_items?.find((ai) => ai.id === selectedAuctionItemId);

  const isCurrentMemberIntentSubmitted = currentSelectedAuctionItem?.intents?.some(
    (intent) => intent.member_id === selectedMemberId
  );

  // Helper to render rank movement badge for a member
  const renderRankMovementBadge = (memberId: number, newRank: number, isWinner: boolean) => {
    const prevRank = previousRankingsMap[memberId];

    if (isWinner) {
      return (
        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded text-[10px] font-extrabold">
          <Award className="w-3 h-3 text-amber-400" />
          Rotated to Past Winner (#{newRank})
        </span>
      );
    }

    if (prevRank === undefined) {
      return (
        <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded text-[10px] font-extrabold">
          <Sparkles className="w-3 h-3 text-purple-400" />
          New Entry (#{newRank})
        </span>
      );
    }

    if (newRank < prevRank) {
      const diff = prevRank - newRank;
      return (
        <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-0.5 rounded text-[10px] font-extrabold">
          <ArrowUp className="w-3 h-3" />
          Moved Up +{diff} (Rank #{prevRank} → #{newRank})
        </span>
      );
    }

    if (newRank > prevRank) {
      const diff = newRank - prevRank;
      return (
        <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
          <ArrowDown className="w-3 h-3" />
          Shifted -{diff} (Rank #{prevRank} → #{newRank})
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 bg-slate-800 text-slate-400 border border-slate-700 px-2 py-0.5 rounded text-[10px] font-medium">
        Unchanged (#{newRank})
      </span>
    );
  };

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

      {/* Main Navigation Tabs */}
      <nav className="flex flex-wrap items-center gap-2 bg-slate-900/80 p-2 rounded-2xl border border-slate-800 shadow-lg">
        <button
          onClick={() => setActiveTab('create')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'create'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Plus className="w-4 h-4" />
          1. Create Auction
        </button>

        <button
          onClick={() => setActiveTab('intent')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all relative ${
            activeTab === 'intent'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <UserPlus className="w-4 h-4" />
          2. Submit Intent
          {activeAuction && activeAuction.status === 'ACTIVE' && (
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('resolution')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'resolution'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          3. Auction Resolution
          {activeAuction && (
            <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-extrabold border border-purple-500/30">
              {resolvedItems}/{totalItems}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-xs sm:text-sm transition-all ${
            activeTab === 'queue'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
          }`}
        >
          <Layers className="w-4 h-4" />
          4. Priority Queue & History
        </button>
      </nav>

      {/* TAB CONTENT AREAS */}

      {/* TAB 1: CREATE AUCTION WITH SEARCHABLE ITEM PICKER */}
      {activeTab === 'create' && (
        <section className="glass-panel p-6 sm:p-8 rounded-2xl space-y-6 max-w-4xl mx-auto shadow-2xl border-purple-500/20">
          <div className="flex items-center gap-3 text-purple-400 font-bold border-b border-slate-800 pb-4">
            <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl text-white">Create New Raid Auction</h2>
              <p className="text-xs text-slate-400 font-normal">
                Search the loot catalog to select auction items. Quantities can be set to 0 initially and updated post-raid!
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateAuction} className="space-y-6">
            {/* Auction Title Input */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                Auction Title
              </label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Raid Night - Molten Core"
                className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-all shadow-inner"
                required
              />
            </div>

            {/* SEARCHABLE ITEM SELECTION & DROPDOWN BOX */}
            <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 space-y-4">
              <span className="block text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Search className="w-4 h-4" />
                Search & Add Items from Raid Loot Catalog ({items.length} items available)
              </span>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                {/* Search Filter & Dropdown */}
                <div className="md:col-span-7 space-y-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={itemSearchQuery}
                      onChange={(e) => setItemSearchQuery(e.target.value)}
                      placeholder="Search raid items by name or description..."
                      className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg pl-9 pr-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedCatalogItemId || ''}
                    onChange={(e) => setSelectedCatalogItemId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500 rounded-lg px-3 py-2 text-xs font-semibold text-white focus:outline-none"
                  >
                    {filteredCatalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.description.slice(0, 45)}...
                      </option>
                    ))}
                  </select>
                </div>

                {/* Initial Quantity Input */}
                <div className="md:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Initial Quantity (Can be 0):
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    value={initialQuantityInput}
                    onChange={(e) => setInitialQuantityInput(parseInt(e.target.value, 10) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-center text-xs font-extrabold text-amber-400 focus:outline-none"
                  />
                </div>

                {/* Add Button */}
                <div className="md:col-span-2">
                  <button
                    type="button"
                    onClick={handleAddDraftItem}
                    className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-1 transition-all shadow"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
              </div>
            </div>

            {/* DRAFT AUCTION ITEMS TABLE */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Selected Auction Items List ({draftAuctionItems.length} items)
              </label>

              {draftAuctionItems.length > 0 ? (
                <div className="space-y-2">
                  {draftAuctionItems.map((di) => (
                    <div
                      key={di.item_id}
                      className="flex items-center justify-between bg-slate-900/60 p-3 rounded-xl border border-slate-800"
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <h4 className="text-xs font-bold text-slate-100">{di.item_name}</h4>
                          <span className="text-[10px] text-slate-400">
                            Quantity: <strong className="text-amber-400">{di.quantity}</strong>{' '}
                            {di.quantity === 0 && '(Pending Post-Raid Drop Update)'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-slate-950 px-2 py-1 rounded-lg border border-slate-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateDraftQuantity(di.item_id, di.quantity - 1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                          >
                            -
                          </button>
                          <span className="w-6 text-center text-xs font-bold text-amber-400">
                            {di.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateDraftQuantity(di.item_id, di.quantity + 1)}
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveDraftItem(di.item_id)}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                          title="Remove item from draft"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 rounded-xl border border-slate-800 text-center text-slate-500 text-xs italic">
                  No items added to auction list yet. Use the loot search box above to add items.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || draftAuctionItems.length === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold py-3.5 px-6 rounded-xl shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 text-sm uppercase tracking-wider"
            >
              <Sparkles className="w-5 h-5 text-amber-300" />
              {loading ? 'Creating Auction...' : 'Launch Raid Auction & Proceed to Intent Submission'}
            </button>
          </form>
        </section>
      )}

      {/* TAB 2: SUBMIT INTENT TO BUY */}
      {activeTab === 'intent' && (
        <section className="space-y-8">
          {activeAuction && activeAuction.status === 'ACTIVE' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Left Column: Member Search & Item Selector Form */}
              <div className="lg:col-span-5 glass-panel p-6 rounded-2xl space-y-6 border-purple-500/20 shadow-xl">
                <div className="flex items-center gap-3 text-purple-400 font-bold border-b border-slate-800 pb-4">
                  <div className="p-2 bg-purple-600/20 rounded-lg border border-purple-500/30">
                    <UserPlus className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg text-white">Register Intent to Buy</h2>
                    <p className="text-xs text-slate-400 font-normal">
                      Search for a guild member and select an auction item to record intent.
                    </p>
                  </div>
                </div>

                <div className="space-y-5">
                  {/* Member Search & Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      1. Search & Select Guild Member
                    </label>
                    <div className="relative mb-2">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        value={memberSearchQuery}
                        onChange={(e) => setMemberSearchQuery(e.target.value)}
                        placeholder="Search member name or Discord ID..."
                        className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white focus:outline-none transition-all"
                      />
                    </div>

                    <select
                      value={selectedMemberId || ''}
                      onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 focus:border-purple-500 rounded-xl px-4 py-3 text-sm font-semibold text-white focus:outline-none transition-all"
                    >
                      {filteredMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.discord_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Auction Item Selector */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      2. Select Item in Active Auction
                    </label>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {activeAuction.auction_items?.map((ai) => {
                        const isSelected = selectedAuctionItemId === ai.id;
                        const isResolved = ai.status === 'RESOLVED';
                        return (
                          <div
                            key={ai.id}
                            onClick={() => !isResolved && setSelectedAuctionItemId(ai.id)}
                            className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-purple-600/20 border-purple-500 shadow-md'
                                : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                            } ${isResolved ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                              <div>
                                <h4 className="text-xs font-bold text-white">{ai.item?.name}</h4>
                                <span className="text-[10px] text-slate-400">
                                  Qty: <strong className="text-amber-300">{ai.quantity}</strong>{' '}
                                  {ai.quantity === 0 && '(Post-Raid Drop Pending)'}
                                </span>
                              </div>
                            </div>

                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                                isResolved ? 'bg-emerald-500/20 text-emerald-400' : 'bg-purple-500/20 text-purple-300'
                              }`}
                            >
                              {ai.intents?.length || 0} Intents
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Register Action Button */}
                  <button
                    disabled={!selectedMemberId || !selectedAuctionItemId || loading}
                    onClick={() => {
                      if (selectedAuctionItemId && selectedMemberId) {
                        handleToggleIntent(selectedAuctionItemId, selectedMemberId);
                      }
                    }}
                    className={`w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all shadow-lg ${
                      isCurrentMemberIntentSubmitted
                        ? 'bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40'
                        : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-500/25'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {isCurrentMemberIntentSubmitted ? (
                      <>
                        <UserCheck className="w-4 h-4 text-rose-400" />
                        Remove Intent for {currentSelectedMember?.name}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-4 h-4 text-amber-300" />
                        Register Intent for {currentSelectedMember?.name}
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Right Column: Registered Intents & Quantity Manager */}
              <div className="lg:col-span-7 glass-panel p-6 rounded-2xl space-y-6 border-slate-800 shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold">
                    <ListChecks className="w-5 h-5" />
                    <h3 className="text-lg text-white">Current Registered Intents</h3>
                  </div>
                  <span className="text-xs text-slate-400">
                    Auction: <strong className="text-purple-300">{activeAuction.title}</strong>
                  </span>
                </div>

                <div className="space-y-6">
                  {activeAuction.auction_items?.map((ai) => {
                    const intentList = ai.intents || [];
                    const isResolved = ai.status === 'RESOLVED';

                    return (
                      <div key={ai.id} className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-4">
                        {/* Header with Item Name & Interactive Quantity Manager */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div>
                            <h4 className="font-bold text-sm text-amber-300 flex items-center gap-2">
                              <Shield className="w-4 h-4 text-amber-400" />
                              {ai.item?.name}
                            </h4>
                            <span className="text-[11px] text-slate-400">
                              Registered Intents: <strong className="text-purple-300">{intentList.length}</strong>
                            </span>
                          </div>

                          {/* POST-RAID DROP QUANTITY ADJUSTER */}
                          <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
                              <Edit3 className="w-3 h-3 text-purple-400" />
                              Drop Qty:
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                disabled={isResolved || ai.quantity <= 0 || loading}
                                onClick={() => handleUpdateItemQuantity(ai.id, ai.quantity - 1)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold flex items-center justify-center text-xs"
                                title="Decrease drop quantity"
                              >
                                -
                              </button>
                              <span className="w-7 text-center text-sm font-extrabold text-amber-400">
                                {ai.quantity}
                              </span>
                              <button
                                disabled={isResolved || loading}
                                onClick={() => handleUpdateItemQuantity(ai.id, ai.quantity + 1)}
                                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold flex items-center justify-center text-xs"
                                title="Increase drop quantity"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Member Intent Chips */}
                        <div className="flex flex-wrap gap-2 pt-1">
                          {intentList.length > 0 ? (
                            intentList.map((intent) => {
                              const memberName = intent.member?.name || members.find((m) => m.id === intent.member_id)?.name || `Member #${intent.member_id}`;
                              return (
                                <div
                                  key={intent.id}
                                  className="flex items-center gap-2 bg-purple-900/30 border border-purple-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold text-purple-200"
                                >
                                  <User className="w-3.5 h-3.5 text-purple-400" />
                                  <span>{memberName}</span>
                                  <button
                                    disabled={isResolved}
                                    onClick={() => handleToggleIntent(ai.id, intent.member_id)}
                                    className="text-purple-400 hover:text-rose-400 transition-colors ml-1 font-bold"
                                    title="Remove intent"
                                  >
                                    ×
                                  </button>
                                </div>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-500 italic">No intents registered for this item yet.</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl border-slate-800 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-600">
                <Swords className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-300">No Active Raid Auction Found</h3>
              <p className="text-sm text-slate-500">
                Please go to the <strong>"1. Create Auction"</strong> tab first to launch a raid auction.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20"
              >
                Go to Create Auction
              </button>
            </div>
          )}
        </section>
      )}

      {/* TAB 3: AUCTION RESOLUTION */}
      {activeTab === 'resolution' && (
        <section className="space-y-6">
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
                  const isResolved = ai.status === 'RESOLVED';
                  const intentCount = ai.intents?.length || 0;

                  // Find allocations for this item if available in history or last result
                  const itemAllocations = historyItems.filter((h) => h.item_id === ai.item_id && h.auction_id === ai.auction_id);
                  const isLastResolvedThisItem = lastResolutionResult?.auction_item_id === ai.id;

                  return (
                    <div
                      key={ai.id}
                      className={`glass-card p-5 rounded-2xl border transition-all space-y-4 ${
                        isResolved
                          ? 'border-slate-800 opacity-90'
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

                      {/* Quantity & Interactive Drop Adjustment Bar */}
                      <div className="flex items-center justify-between text-xs text-slate-300 bg-slate-900/80 px-3 py-2.5 rounded-xl border border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-400">Post-Raid Drop Qty:</span>
                          <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-800">
                            <button
                              disabled={isResolved || ai.quantity <= 0 || loading}
                              onClick={() => handleUpdateItemQuantity(ai.id, ai.quantity - 1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold flex items-center justify-center text-xs"
                              title="Decrease quantity"
                            >
                              -
                            </button>
                            <span className="w-6 text-center font-extrabold text-amber-400">{ai.quantity}</span>
                            <button
                              disabled={isResolved || loading}
                              onClick={() => handleUpdateItemQuantity(ai.id, ai.quantity + 1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 font-bold flex items-center justify-center text-xs"
                              title="Increase quantity"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <span>Intents: <strong className="text-purple-400">{intentCount}</strong></span>
                      </div>

                      {/* Registered Intent Members Badge List */}
                      <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                          Registered Intents ({intentCount})
                        </span>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
                          {intentCount > 0 ? (
                            ai.intents?.map((intent) => {
                              const memberName = intent.member?.name || members.find((m) => m.id === intent.member_id)?.name || `Member #${intent.member_id}`;
                              return (
                                <span
                                  key={intent.id}
                                  className="bg-purple-900/40 border border-purple-500/30 text-purple-200 text-xs px-2.5 py-1 rounded-lg flex items-center gap-1"
                                >
                                  <UserCheck className="w-3 h-3 text-purple-400" />
                                  {memberName}
                                </span>
                              );
                            })
                          ) : (
                            <p className="text-xs text-slate-500 italic">No intents registered yet.</p>
                          )}
                        </div>
                      </div>

                      {/* WINNERS & RANK MOVEMENT DISPLAY SECTION (If Item is Resolved) */}
                      {isResolved && (
                        <div className="bg-gradient-to-br from-purple-950/40 to-slate-900 p-4 rounded-xl border border-purple-500/30 space-y-3">
                          <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                            <h4 className="text-xs font-bold text-amber-300 flex items-center gap-1.5 uppercase tracking-wider">
                              <Trophy className="w-4 h-4 text-amber-400" />
                              Auction Winner(s) & Ranking Shift
                            </h4>
                            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-extrabold px-2 py-0.5 rounded border border-emerald-500/30">
                              RESOLVED
                            </span>
                          </div>

                          {/* Winners List */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                              Winner(s) Allocated:
                            </span>
                            {itemAllocations.length > 0 ? (
                              itemAllocations.map((alloc) => (
                                <div
                                  key={alloc.id}
                                  className="flex items-center justify-between bg-amber-500/10 border border-amber-500/30 p-2 rounded-lg text-xs"
                                >
                                  <div className="flex items-center gap-2">
                                    <Crown className="w-4 h-4 text-amber-400" />
                                    <span className="font-extrabold text-amber-200">{alloc.member_name}</span>
                                    <span className="text-[10px] text-slate-400">({alloc.discord_id})</span>
                                  </div>
                                  <span className="text-[10px] font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded">
                                    1x Allocated
                                  </span>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-slate-400 italic">
                                {ai.quantity === 0
                                  ? '0 Items dropped. Item marked as RESOLVED with 0 allocations.'
                                  : 'Winners allocated successfully.'}
                              </p>
                            )}
                          </div>

                          {/* Mini Rank Movement List if this was the last item resolved */}
                          {isLastResolvedThisItem && lastResolutionResult?.updated_rankings && (
                            <div className="space-y-2 pt-2 border-t border-purple-500/20">
                              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Queue Rank Movement After Resolution:
                              </span>
                              <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                {(lastResolutionResult.updated_rankings || []).map((r) => {
                                  const isWinner = (lastResolutionResult.allocations || []).some(a => a.member_id === r.member_id);
                                  return (
                                    <div
                                      key={r.id}
                                      className="flex items-center justify-between text-xs bg-slate-900/80 px-2.5 py-1.5 rounded-lg border border-slate-800"
                                    >
                                      <span className="font-semibold text-slate-200">{r.member_name}</span>
                                      {renderRankMovementBadge(r.member_id, r.rank, isWinner)}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Action Button: Resolve Item */}
                      <button
                        disabled={isResolved || loading}
                        onClick={() => handleResolveItem(ai.id, ai.item_id)}
                        className={`w-full py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                          isResolved
                            ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                            : 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                        }`}
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        {isResolved ? 'Item Resolved' : ai.quantity === 0 ? 'Resolve 0-Qty Item' : 'Resolve This Item'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl border-slate-800 text-center space-y-4 max-w-xl mx-auto">
              <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto text-slate-600">
                <Swords className="w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold text-slate-300">No Active Raid Auction</h3>
              <p className="text-sm text-slate-500">
                Create a raid auction in Tab 1 to manage resolutions.
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-500/20"
              >
                Go to Create Auction
              </button>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: PRIORITY QUEUE & ALLOCATION HISTORY */}
      {activeTab === 'queue' && (
        <section className="glass-panel p-6 rounded-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 text-indigo-400 font-semibold">
              <Layers className="w-5 h-5" />
              <h2 className="text-lg text-white">Live Priority Queue & Allocation Audit</h2>
            </div>

            {/* Item Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 max-w-full overflow-x-auto">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedQueueItemId(item.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
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

          {/* AUCTION WINNERS & RANK SHIFT VISUALIZER BANNER */}
          {historyItems.length > 0 && (
            <div className="bg-gradient-to-r from-amber-950/30 via-slate-900 to-purple-950/30 p-5 rounded-xl border border-amber-500/30 shadow-lg space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-extrabold text-white">
                    Latest Allocation Winners & Placement Overview
                  </h3>
                </div>
                <span className="text-xs text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  Item: {items.find((i) => i.id === selectedQueueItemId)?.name}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {historyItems.slice(0, 3).map((h) => (
                  <div key={h.id} className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Winner</span>
                      <span className="text-xs font-extrabold text-amber-300">{h.member_name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Auction</span>
                      <span className="text-[11px] text-purple-300 font-semibold truncate max-w-[100px] block">{h.auction_title}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tables Grid: Queue Ranking (Left) & Allocation History (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Live Queue Ranking Table with Rank Shift Indicators */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  Sequential Priority Queue Placement (1..M)
                </h3>
                <span className="text-[11px] text-slate-400">
                  Showing placement after resolution
                </span>
              </div>

              <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Rank</th>
                      <th className="py-3 px-4">Guild Member</th>
                      <th className="py-3 px-4">Queue Status</th>
                      <th className="py-3 px-4">Rank Movement</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {queueRankings.length > 0 ? (
                      queueRankings.map((r) => {
                        const isWinner = historyItems.some((h) => h.member_id === r.member_id && h.item_id === r.item_id);
                        return (
                          <tr key={r.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="py-3 px-4 font-extrabold text-amber-400">#{r.rank}</td>
                            <td className="py-3 px-4">
                              <span className="font-semibold text-slate-100 block">{r.member_name}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{r.discord_id}</span>
                            </td>
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
                            <td className="py-3 px-4">
                              {renderRankMovementBadge(r.member_id, r.rank, isWinner && r.status === 'PAST_WINNER')}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-500">
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
                Allocation Winner History
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
                          <td className="py-3 px-4 font-semibold text-amber-300 flex items-center gap-1.5">
                            <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            {h.member_name}
                          </td>
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

          {/* Member Rank History Across Auctions Section */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Member Rank History Across Auctions
              </h3>

              {/* Member Filter Dropdown */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Filter Member:</span>
                <select
                  value={rankHistoryFilterMemberId}
                  onChange={(e) =>
                    setRankHistoryFilterMemberId(
                      e.target.value === 'ALL' ? 'ALL' : Number(e.target.value)
                    )
                  }
                  className="bg-slate-900 border border-slate-700 text-slate-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-purple-500"
                >
                  <option value="ALL">All Guild Members</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-3 px-4">Raid Auction</th>
                    <th className="py-3 px-4">Guild Member</th>
                    <th className="py-3 px-4">Historical Rank</th>
                    <th className="py-3 px-4">Queue Status</th>
                    <th className="py-3 px-4">Recorded Date/Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {rankHistoryItems.length > 0 ? (
                    rankHistoryItems
                      .filter((rh) =>
                        rankHistoryFilterMemberId === 'ALL'
                          ? true
                          : rh.member_id === rankHistoryFilterMemberId
                      )
                      .map((rh) => (
                        <tr key={rh.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-slate-200 font-semibold">{rh.auction_title}</td>
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-100 block">{rh.member_name}</span>
                            <span className="text-[10px] text-slate-500 font-mono">{rh.discord_id}</span>
                          </td>
                          <td className="py-3 px-4 font-extrabold text-amber-400">#{rh.rank}</td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                rh.status === 'WAITING'
                                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              }`}
                            >
                              {rh.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {new Date(rh.recorded_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No historical rank snapshots recorded for this item yet. Rank snapshots are saved automatically when item auctions resolve.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
