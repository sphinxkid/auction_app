import React, { useState, useEffect } from 'react';
import {
  Swords,
  CheckCircle2,
  Plus,
  Play,
  Sparkles,
  Trophy,
  History,
  Search,
  UserPlus,
  ListChecks,
  PlusCircle,
  ChevronRight,
  ChevronLeft,
  Package,
  Calendar,
  Zap,
  Trash2,
  X,
  UserCheck,
  Shield,
  AlertTriangle,
  Clock
} from 'lucide-react';
import {
  Auction,
  AuctionItem,
  Member,
  Item,
  AuctionSubView,
  ActiveAuctionSubPage,
  DraftAuctionItem,
  ItemResolutionResult,
  AllocationHistoryItem,
  QueueRanking,
  GuildClass
} from '../types';

interface AuctionsConsoleProps {
  activeAuction: Auction | null;
  setActiveAuction: (auction: Auction | null) => void;
  items: Item[];
  members: Member[];
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMsg: (type: 'success' | 'error', text: string) => void;
  renderMemberBadge: (name: string, guildClass?: GuildClass, extraSuffix?: React.ReactNode) => React.ReactNode;
}

export const AuctionsConsole: React.FC<AuctionsConsoleProps> = ({
  activeAuction,
  setActiveAuction,
  items,
  members,
  loading,
  setLoading,
  showMsg,
  renderMemberBadge,
}) => {
  const [auctionSubView, setAuctionSubView] = useState<AuctionSubView>('active');
  const [activeAuctionSubPage, setActiveAuctionSubPage] = useState<ActiveAuctionSubPage>('edit');

  // Sub-Page 1 & 2 Intent Selection State
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedAuctionItemId, setSelectedAuctionItemId] = useState<number | null>(null);
  const [intentQuantityInput, setIntentQuantityInput] = useState<string>('1');

  // Sub-Page 3 Item Allocation State
  const [allocationQtyInputs, setAllocationQtyInputs] = useState<{ [auctionItemId: number]: string }>({});

  // Sub-Page 4 Resolution State
  const [previousRankingsMap, setPreviousRankingsMap] = useState<{ [memberId: number]: number }>({});
  const [lastResolutionResult, setLastResolutionResult] = useState<ItemResolutionResult | null>(null);

  // Sub-Page 5 Auction Summary State
  const [summaryItemIndex, setSummaryItemIndex] = useState<number>(0);
  const [activeAuctionAllocationRecords, setActiveAuctionAllocationRecords] = useState<AllocationHistoryItem[]>([]);

  // Create Auction Form State
  const [newTitle, setNewTitle] = useState('');
  const [newAuctionDate, setNewAuctionDate] = useState('');
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<number | null>(null);
  const [editAuctionAddItemId, setEditAuctionAddItemId] = useState<number | null>(null);
  const [draftAuctionItems, setDraftAuctionItems] = useState<DraftAuctionItem[]>([]);

  // Auction History States
  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [selectedHistoryAuctionId, setSelectedHistoryAuctionId] = useState<number | null>(null);
  const [historyAllocationRecords, setHistoryAllocationRecords] = useState<AllocationHistoryItem[]>([]);
  const [historyAuctionItemIndex, setHistoryAuctionItemIndex] = useState<number>(0);

  // Fetch all auctions for Auction History page
  const fetchAllAuctions = async () => {
    try {
      const res = await fetch('/api/v1/auctions');
      if (res.ok) {
        const data: Auction[] = await res.json();
        setAllAuctions(data);
        if (data && data.length > 0 && selectedHistoryAuctionId === null) {
          setSelectedHistoryAuctionId(data[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to fetch auctions:', err);
    }
  };

  // Fetch allocation records for Active Auction Summary
  const fetchActiveAuctionHistory = async (auctionId: number) => {
    try {
      const res = await fetch(`/api/v1/history/auctions/${auctionId}`);
      if (res.ok) {
        const records: AllocationHistoryItem[] = await res.json();
        setActiveAuctionAllocationRecords(records);
      }
    } catch (err) {
      console.error('Failed to fetch active auction history:', err);
    }
  };

  // Fetch allocation records for selected historical auction
  const fetchAuctionHistoryRecords = async (auctionId: number) => {
    try {
      const res = await fetch(`/api/v1/history/auctions/${auctionId}`);
      if (res.ok) {
        const records: AllocationHistoryItem[] = await res.json();
        setHistoryAllocationRecords(records);
      }
    } catch (err) {
      console.error('Failed to fetch auction history records:', err);
    }
  };

  useEffect(() => {
    fetchAllAuctions();
  }, []);

  useEffect(() => {
    if (selectedHistoryAuctionId) {
      fetchAuctionHistoryRecords(selectedHistoryAuctionId);
      setHistoryAuctionItemIndex(0);
    }
  }, [selectedHistoryAuctionId]);

  useEffect(() => {
    if (activeAuction && activeAuction.id) {
      fetchActiveAuctionHistory(activeAuction.id);
    }
  }, [activeAuction?.id]);

  useEffect(() => {
    if (items.length > 0 && selectedCatalogItemId === null) {
      setSelectedCatalogItemId(items[0].id);
    }
    if (items.length > 0 && editAuctionAddItemId === null) {
      setEditAuctionAddItemId(items[0].id);
    }
  }, [items]);

  useEffect(() => {
    if (members.length > 0 && selectedMemberId === null) {
      setSelectedMemberId(members[0].id);
    }
  }, [members]);

  useEffect(() => {
    if (activeAuction?.auction_items && activeAuction.auction_items.length > 0) {
      if (!selectedAuctionItemId || !activeAuction.auction_items.some(ai => ai.id === selectedAuctionItemId)) {
        setSelectedAuctionItemId(activeAuction.auction_items[0].id);
      }
    }
  }, [activeAuction]);

  useEffect(() => {
    if (selectedMemberId && selectedAuctionItemId && activeAuction?.auction_items) {
      const ai = activeAuction.auction_items.find((item) => item.id === selectedAuctionItemId);
      const existingIntent = ai?.intents?.find((intent) => intent.member_id === selectedMemberId);
      if (existingIntent && existingIntent.quantity !== undefined && existingIntent.quantity > 0) {
        setIntentQuantityInput(String(existingIntent.quantity));
      } else {
        setIntentQuantityInput('1');
      }
    }
  }, [selectedMemberId, selectedAuctionItemId, activeAuction]);

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.discord_id.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      (m.class?.name && m.class.name.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  const selectedMemberObj = members.find((m) => m.id === selectedMemberId);
  const currentSelectedAuctionItem = activeAuction?.auction_items?.find((item) => item.id === selectedAuctionItemId);
  const filteredCatalogItems = items.filter((i) =>
    i.name.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

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
        quantity: '0',
      },
    ]);

    showMsg('success', `Added ${itemObj.name} to auction draft list!`);
  };

  const handleRemoveDraftItem = (itemId: number) => {
    setDraftAuctionItems(draftAuctionItems.filter((di) => di.item_id !== itemId));
  };

  const handleDraftQuantityChange = (itemId: number, newQtyStr: string) => {
    setDraftAuctionItems(
      draftAuctionItems.map((di) =>
        di.item_id === itemId ? { ...di, quantity: newQtyStr } : di
      )
    );
  };

  // Add Item directly to running Active Auction
  const handleAddActiveAuctionItem = async () => {
    if (!activeAuction || !editAuctionAddItemId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auctions/${activeAuction.id}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item_id: editAuctionAddItemId, quantity: 0 }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to add item to active auction');
      }

      showMsg('success', 'Item successfully added to running active auction!');

      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to add item to auction');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteActiveAuctionItem = async (auctionItemId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to delete item from auction');
      }

      showMsg('success', 'Removed item from active auction.');

      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to remove item');
    } finally {
      setLoading(false);
    }
  };

  // Create & Launch New Raid Auction
  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showMsg('error', 'Raid Auction Title text box cannot be empty upon creation.');
      return;
    }

    if (!newAuctionDate.trim()) {
      showMsg('error', 'Scheduled Auction Date cannot be empty upon creation.');
      return;
    }

    if (activeAuction && activeAuction.status === 'ACTIVE') {
      showMsg('error', 'Cannot create a new auction while an active auction is running. Please finalize the current active auction first.');
      return;
    }

    if (draftAuctionItems.length === 0) {
      showMsg('error', 'Please add at least one raid item to create an auction.');
      return;
    }

    for (const di of draftAuctionItems) {
      if (di.quantity.trim() === '') {
        showMsg('error', `Quantity text box cannot be empty for item "${di.item_name}".`);
        return;
      }
      const parsed = parseInt(di.quantity, 10);
      if (isNaN(parsed) || parsed < 0) {
        showMsg('error', `Please enter a valid non-negative quantity for item "${di.item_name}".`);
        return;
      }
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          auction_date: newAuctionDate ? newAuctionDate : undefined,
          items: draftAuctionItems.map((di) => ({
            item_id: di.item_id,
            quantity: parseInt(di.quantity, 10),
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create auction');
      }

      const auctionData: Auction = await res.json();
      setActiveAuction(auctionData);
      showMsg('success', `Raid Auction "${auctionData.title}" launched successfully!`);

      if (auctionData.auction_items && auctionData.auction_items.length > 0) {
        setSelectedAuctionItemId(auctionData.auction_items[0].id);
      }

      setDraftAuctionItems([]);
      setNewAuctionDate('');
      setNewTitle('');
      setAuctionSubView('active');
      setActiveAuctionSubPage('edit');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to launch auction');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateItemQuantity = async (auctionItemId: number, newQty: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/quantity`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newQty }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update item quantity');
      }

      showMsg('success', `Finalized and updated item drop quantity to ${newQty}!`);

      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to update quantity');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeAllocationQuantity = async (auctionItemId: number, itemName: string, currentQty: number) => {
    const rawVal = allocationQtyInputs[auctionItemId] !== undefined ? allocationQtyInputs[auctionItemId] : String(currentQty);
    if (rawVal === undefined || rawVal.trim() === '') {
      showMsg('error', `Quantity text box cannot be empty upon finalization for "${itemName}".`);
      return;
    }

    const parsed = parseInt(rawVal, 10);
    if (isNaN(parsed) || parsed < 0) {
      showMsg('error', `Please enter a valid drop quantity number for "${itemName}".`);
      return;
    }

    await handleUpdateItemQuantity(auctionItemId, parsed);
  };

  const handleToggleIntent = async (auctionItemId: number, memberId: number) => {
    if (intentQuantityInput.trim() === '') {
      showMsg('error', 'Intent quantity text box cannot be empty upon finalization.');
      return;
    }
    const parsedQty = parseInt(intentQuantityInput, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      showMsg('error', 'Please enter a valid intent quantity greater than 0.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId, quantity: parsedQty }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to submit intent');
      }

      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
      }

      showMsg('success', 'Intent to Buy updated successfully!');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to update intent');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveIntent = async (auctionItemId: number, memberId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/intents/${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to remove intent');
      }

      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
      }

      showMsg('success', 'Intent removed successfully!');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to remove intent');
    } finally {
      setLoading(false);
    }
  };

  const handleResolveItem = async (auctionItemId: number, itemId: number) => {
    const targetAuctionItem = activeAuction?.auction_items?.find((ai) => ai.id === auctionItemId);
    if (targetAuctionItem && targetAuctionItem.quantity <= 0) {
      showMsg('error', 'Cannot resolve item auction when current drop quantity is 0. Please set a drop quantity > 0 in Step 3 first.');
      return;
    }

    setLoading(true);
    try {
      const preQueueRes = await fetch(`/api/v1/items/${itemId}/rankings`);
      if (preQueueRes.ok) {
        const preRankings: QueueRanking[] = await preQueueRes.json();
        const prevMap: { [memberId: number]: number } = {};
        preRankings.forEach((r) => {
          prevMap[r.member_id] = r.rank;
        });
        setPreviousRankingsMap(prevMap);
      }

      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to resolve item auction');
      }

      const result: ItemResolutionResult = await res.json();
      setLastResolutionResult(result);

      const winnerNames = (result.allocations || [])
        .map((a) => {
          const m = members.find((mem) => mem.id === a.member_id);
          return m ? m.name : `Member #${a.member_id}`;
        })
        .join(', ');

      showMsg(
        'success',
        winnerNames
          ? `Auction item resolved! Winners allocated: ${winnerNames}`
          : 'Auction item resolved! No candidates were allocated.'
      );

      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
        if (updatedAuction && updatedAuction.id) {
          fetchActiveAuctionHistory(updatedAuction.id);
        }
      }
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to resolve item auction');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeAuction = async () => {
    if (!activeAuction) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auctions/${activeAuction.id}/finalize`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to finalize auction');
      }

      showMsg('success', `Raid Auction "${activeAuction.title}" has been manually finalized and archived!`);
      setActiveAuction(null);
      fetchAllAuctions();
      setAuctionSubView('history');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to finalize auction');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* AUCTIONS SUB-NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAuctionSubView('active')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              auctionSubView === 'active'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Swords className="w-4 h-4" />
            1. View Active Auction
            {activeAuction && activeAuction.status === 'ACTIVE' && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-1" />
            )}
          </button>

          <button
            onClick={() => setAuctionSubView('create')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              auctionSubView === 'create'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            2. Create New Auction
          </button>

          <button
            onClick={() => {
              setAuctionSubView('history');
              fetchAllAuctions();
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              auctionSubView === 'history'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            3. Auction History
          </button>
        </div>
      </div>

      {/* 1. VIEW ACTIVE AUCTION SUB-VIEW */}
      {auctionSubView === 'active' && (
        <div className="space-y-6">
          {activeAuction ? (
            <div className="space-y-6">
              {/* Active Auction Header Info Banner */}
              <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      Active Raid Auction
                    </span>
                    <span className="text-xs text-slate-500 font-mono">#{activeAuction.id}</span>
                  </div>
                  <h2 className="text-2xl font-black text-slate-100 mt-1 flex items-center gap-2">
                    <Swords className="w-6 h-6 text-purple-400" />
                    {activeAuction.title}
                  </h2>
                </div>

                {/* ACTIVE AUCTION 6 SUB-PAGES NAVIGATION PILLS */}
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveAuctionSubPage('edit')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeAuctionSubPage === 'edit'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    1. Edit Items
                  </button>

                  <button
                    onClick={() => setActiveAuctionSubPage('intent')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeAuctionSubPage === 'intent'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    2. Intent to Buy
                  </button>

                  <button
                    onClick={() => setActiveAuctionSubPage('allocation')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeAuctionSubPage === 'allocation'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Package className="w-3.5 h-3.5" />
                    3. Item Allocation (Qty)
                  </button>

                  <button
                    onClick={() => setActiveAuctionSubPage('resolution')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeAuctionSubPage === 'resolution'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 text-emerald-400" />
                    4. Auction Resolution
                  </button>

                  <button
                    onClick={() => setActiveAuctionSubPage('summary')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeAuctionSubPage === 'summary'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    5. Auction Summary
                  </button>

                  <button
                    onClick={() => setActiveAuctionSubPage('finalize')}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                      activeAuctionSubPage === 'finalize'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    6. Finalize Auction
                  </button>
                </div>
              </div>

              {/* SUB-PAGE 1: EDIT ACTIVE AUCTION ITEMS */}
              {activeAuctionSubPage === 'edit' && (
                <div className="bg-slate-900/80 rounded-2xl border border-amber-500/30 p-6 space-y-6 shadow-xl max-w-3xl mx-auto">
                  <div className="pb-3 border-b border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Step 1: Edit Items in Running Active Auction
                    </span>
                    <h3 className="text-lg font-black text-slate-100 mt-1">
                      Manage Active Raid Drops ({activeAuction.title})
                    </h3>
                  </div>

                  <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                      <PlusCircle className="w-4 h-4 text-purple-400" />
                      Add Catalog Item to Running Active Auction:
                    </h4>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <select
                        value={editAuctionAddItemId || ''}
                        onChange={(e) => setEditAuctionAddItemId(Number(e.target.value))}
                        className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      >
                        {items.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={handleAddActiveAuctionItem}
                        disabled={loading || !editAuctionAddItemId}
                        className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20 disabled:opacity-50 shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        Add Item to Active Auction
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Current Items in Active Auction ({activeAuction.auction_items?.length || 0}):
                    </h4>

                    <div className="space-y-3">
                      {activeAuction.auction_items?.map((ai) => {
                        const isResolved = ai.status === 'RESOLVED';
                        return (
                          <div
                            key={ai.id}
                            className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between gap-4"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-amber-400">
                                <Package className="w-5 h-5" />
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <h4 className="font-bold text-slate-100 text-sm">{ai.item?.name}</h4>
                                <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/40 shadow-sm flex items-center gap-1">
                                  <span className="text-[10px] font-extrabold uppercase text-amber-400/80">Current drop:</span>
                                  {ai.quantity}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    isResolved
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {ai.status}
                                </span>
                              </div>
                            </div>

                            <div>
                              {!isResolved ? (
                                <button
                                  onClick={() => handleDeleteActiveAuctionItem(ai.id)}
                                  disabled={loading}
                                  className="p-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                                >
                                  <Trash2 className="w-4 h-4" />
                                  Remove Item
                                </button>
                              ) : (
                                <span className="text-xs font-bold text-emerald-400">Resolved</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-PAGE 2: INTENT TO BUY */}
              {activeAuctionSubPage === 'intent' && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-6 space-y-4">
                      <div className="bg-slate-900/80 rounded-2xl border border-purple-500/40 p-5 space-y-4 shadow-xl">
                        <div className="pb-3 border-b border-slate-800">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                            Step 2: Member-Centric Intent
                          </span>
                          <h3 className="text-base font-black text-slate-100 mt-1">1. Select Guild Member</h3>
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                          <input
                            type="text"
                            placeholder="Search member name..."
                            value={memberSearchQuery}
                            onChange={(e) => setMemberSearchQuery(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                          />
                        </div>

                        <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                          {filteredMembers.map((m) => {
                            const isSelected = selectedMemberId === m.id;
                            return (
                              <button
                                key={m.id}
                                onClick={() => setSelectedMemberId(m.id)}
                                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                  isSelected
                                    ? 'bg-purple-950/40 border-purple-500 text-white shadow-md'
                                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 text-slate-300'
                                }`}
                              >
                                <div className="flex items-center gap-2.5">
                                  {renderMemberBadge(m.name, m.class)}
                                  <span className="text-xs text-slate-400 font-mono">({m.discord_id})</span>
                                </div>
                                {isSelected && <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-6 space-y-6">
                      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                          <UserCheck className="w-4 h-4 text-amber-400" />
                          2. Select Item & Quantity Intent
                        </h3>

                        {selectedMemberObj ? (
                          <div className="space-y-4">
                            <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-500/40 flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-300">Selected Member:</span>
                              {renderMemberBadge(selectedMemberObj.name, selectedMemberObj.class)}
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-300 block">Select Auction Item:</label>
                              <select
                                value={selectedAuctionItemId || ''}
                                onChange={(e) => setSelectedAuctionItemId(Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                              >
                                {activeAuction.auction_items?.map((ai) => (
                                  <option key={ai.id} value={ai.id}>
                                    {ai.item?.name} (Status: {ai.status})
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-xs font-bold text-slate-300 block">Quantity Requested:</label>
                              <input
                                type="number"
                                min="1"
                                placeholder="Qty"
                                value={intentQuantityInput}
                                onChange={(e) => setIntentQuantityInput(e.target.value)}
                                className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-amber-400 focus:outline-none focus:border-purple-500 text-center"
                              />
                            </div>

                            {currentSelectedAuctionItem && (
                              <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                  onClick={() => handleToggleIntent(currentSelectedAuctionItem.id, selectedMemberObj.id)}
                                  disabled={loading || currentSelectedAuctionItem.status === 'RESOLVED'}
                                  className="flex-1 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                                >
                                  <UserCheck className="w-4 h-4" />
                                  {currentSelectedAuctionItem.intents?.some((i) => i.member_id === selectedMemberObj.id)
                                    ? `Update Quantity (${intentQuantityInput || '0'})`
                                    : `Register Intent to Buy (${intentQuantityInput || '0'})`}
                                </button>

                                {currentSelectedAuctionItem.intents?.some((i) => i.member_id === selectedMemberObj.id) && (
                                  <button
                                    onClick={() => handleRemoveIntent(currentSelectedAuctionItem.id, selectedMemberObj.id)}
                                    disabled={loading || currentSelectedAuctionItem.status === 'RESOLVED'}
                                    className="px-4 py-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
                                  >
                                    <X className="w-4 h-4" />
                                    Remove Intent
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic py-6 text-center">
                            Select a guild member on the left to start setting item & quantity intents.
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-PAGE 3: ITEM ALLOCATION (QTY) */}
              {activeAuctionSubPage === 'allocation' && (
                <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl max-w-3xl mx-auto">
                  <div className="pb-3 border-b border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Step 3: Item Allocation / Drop Quantity
                    </span>
                    <h3 className="text-base font-black text-slate-100 mt-1">
                      Manage Actual Raid Drop Quantities
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {activeAuction.auction_items?.map((ai) => {
                      const isResolved = ai.status === 'RESOLVED';
                      const typedVal = allocationQtyInputs[ai.id] !== undefined ? allocationQtyInputs[ai.id] : String(ai.quantity);

                      return (
                        <div
                          key={ai.id}
                          className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-700 text-amber-400">
                              <Package className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h4 className="font-bold text-slate-100 text-sm">{ai.item?.name}</h4>
                                <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/40 shadow-sm flex items-center gap-1">
                                  <span className="text-[10px] font-extrabold uppercase text-amber-400/80">Current drop:</span>
                                  {ai.quantity}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">{ai.item?.description}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            {!isResolved ? (
                              <div className="flex items-center gap-2">
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Qty"
                                  value={typedVal}
                                  onChange={(e) => setAllocationQtyInputs({ ...allocationQtyInputs, [ai.id]: e.target.value })}
                                  className="w-20 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-black text-amber-400 focus:outline-none focus:border-purple-500 text-center"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleFinalizeAllocationQuantity(ai.id, ai.item?.name || 'item', ai.quantity)}
                                  disabled={loading}
                                  className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black flex items-center gap-1.5 shadow-md shadow-amber-500/20 disabled:opacity-50"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Save
                                </button>
                              </div>
                            ) : (
                              <span className="font-bold text-emerald-400 text-sm px-3 py-1 bg-emerald-950/40 rounded-lg border border-emerald-500/30">
                                {ai.quantity} (Resolved)
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB-PAGE 4: ITEM AUCTION RESOLUTION */}
              {activeAuctionSubPage === 'resolution' && (
                <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl max-w-3xl mx-auto">
                  <div className="pb-3 border-b border-slate-800">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      Step 4: Item Auction Resolution
                    </span>
                    <h3 className="text-base font-black text-slate-100 mt-1">
                      Execute 3-Tier Priority Roll & Allocation
                    </h3>
                  </div>

                  <div className="space-y-4">
                    {activeAuction.auction_items?.map((ai) => {
                      const isResolved = ai.status === 'RESOLVED';
                      const intentsCount = ai.intents?.length || 0;

                      return (
                        <div
                          key={ai.id}
                          className="p-5 bg-slate-950/80 rounded-xl border border-slate-800 space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                              <div className="flex items-center gap-2.5 flex-wrap">
                                <h4 className="font-bold text-slate-100 text-sm">{ai.item?.name}</h4>
                                <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-0.5 rounded-lg border border-amber-500/40 shadow-sm flex items-center gap-1">
                                  <span className="text-[10px] font-extrabold uppercase text-amber-400/80">Current drop:</span>
                                  {ai.quantity}
                                </span>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    isResolved
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {ai.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 mt-0.5">
                                Candidate Intents: <strong className="text-purple-300">{intentsCount}</strong>
                              </p>
                            </div>

                            {!isResolved ? (
                              <div className="flex flex-col items-end gap-1">
                                <button
                                  onClick={() => handleResolveItem(ai.id, ai.item_id)}
                                  disabled={loading || ai.quantity <= 0}
                                  className={`px-5 py-2.5 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all ${
                                    ai.quantity <= 0
                                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700 opacity-60 shadow-none'
                                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-600/20'
                                  }`}
                                >
                                  <Play className="w-4 h-4" />
                                  Execute Resolution
                                </button>
                                {ai.quantity <= 0 && (
                                  <span className="text-[10px] text-amber-400 font-bold">
                                    Drop qty is 0. Set drop qty &gt; 0 in Step 3 to resolve.
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                Resolved
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SUB-PAGE 5: AUCTION SUMMARY */}
              {activeAuctionSubPage === 'summary' && (
                <div className="bg-slate-900/80 rounded-2xl border border-amber-500/30 p-6 space-y-6 shadow-2xl max-w-4xl mx-auto">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        Step 5: Active Auction Summary
                      </span>
                      <h3 className="text-lg font-black text-slate-100 mt-1 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-amber-400" />
                        Summary for {activeAuction.title}
                      </h3>
                    </div>
                  </div>

                  {activeAuction.auction_items && activeAuction.auction_items.length > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-800/60">
                        <span className="text-xs font-bold text-slate-400 mr-1">Select Item:</span>
                        {activeAuction.auction_items.map((item, idx) => (
                          <button
                            key={item.id}
                            onClick={() => setSummaryItemIndex(idx)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                              summaryItemIndex === idx
                                ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                                : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                            }`}
                          >
                            <Shield className="w-3.5 h-3.5" />
                            {item.item?.name}
                          </button>
                        ))}
                      </div>

                      {(() => {
                        const currentAi = activeAuction.auction_items[summaryItemIndex] || activeAuction.auction_items[0];
                        const winners = activeAuctionAllocationRecords.filter((rec) => rec.item_id === currentAi.item_id);

                        return (
                          <div className="p-6 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                              <div>
                                <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                                  Item #{summaryItemIndex + 1} of {activeAuction.auction_items.length}
                                </span>
                                <h4 className="text-xl font-black text-amber-300 mt-0.5">{currentAi.item?.name}</h4>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                                  Quantity: {currentAi.quantity}
                                </span>
                                <span className="text-xs font-bold px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full">
                                  Status: {currentAi.status}
                                </span>
                              </div>
                            </div>

                            <div className="space-y-3">
                              <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" />
                                Winners Allocated ({winners.length}):
                              </h5>

                              {winners.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {winners.map((win) => (
                                    <div
                                      key={win.id}
                                      className="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/30 flex items-center justify-between"
                                    >
                                      {renderMemberBadge(win.member_name, win.member_class)}
                                      <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/40">
                                        Allocated: {win.allocated_quantity}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-center">
                                  No winners allocated for this item drop yet.
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : null}
                </div>
              )}

              {/* SUB-PAGE 6: FINALIZE AUCTION */}
              {activeAuctionSubPage === 'finalize' && (
                <div className="bg-slate-900/80 rounded-2xl border border-emerald-500/30 p-6 space-y-6 shadow-2xl max-w-3xl mx-auto">
                  <div className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        Step 6: Finalize & Close Raid Auction
                      </span>
                      <h3 className="text-lg font-black text-slate-100 mt-1 flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        Finalize Raid Auction ({activeAuction.title})
                      </h3>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Items Drop</span>
                      <span className="text-lg font-black text-amber-400">{activeAuction.auction_items?.length || 0} Items</span>
                    </div>

                    <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Resolved Items</span>
                      <span className="text-lg font-black text-emerald-400">
                        {activeAuction.auction_items?.filter((ai) => ai.status === 'RESOLVED').length || 0} / {activeAuction.auction_items?.length || 0}
                      </span>
                    </div>

                    <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                      <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Pending Items</span>
                      <span className="text-lg font-black text-purple-300">
                        {activeAuction.auction_items?.filter((ai) => ai.status === 'PENDING').length || 0} Pending
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
                    <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-amber-400" />
                      Manual Finalization Directive:
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Clicking <strong className="text-emerald-400">"Finalize Raid Auction Now"</strong> below will officially set this raid auction to <span className="text-emerald-400 font-bold">RESOLVED</span> and archive all loot allocations.
                    </p>
                  </div>

                  <button
                    onClick={handleFinalizeAuction}
                    disabled={loading}
                    className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-5 h-5 text-slate-950" />
                    Finalize Raid Auction Now
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xl">
              <div className="p-4 bg-purple-500/10 rounded-2xl border border-purple-500/20 w-16 h-16 mx-auto flex items-center justify-center text-purple-400">
                <Swords className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-100">No Active Raid Auction Running</h3>
                <p className="text-xs text-slate-400 mt-1">
                  There is currently no active auction in progress. Create a new raid auction to start collecting member intents and allocating loot drops.
                </p>
              </div>
              <button
                onClick={() => setAuctionSubView('create')}
                className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-600/20 inline-flex items-center gap-2"
              >
                <PlusCircle className="w-4 h-4" />
                Create New Raid Auction
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. CREATE AUCTION SUB-VIEW */}
      {auctionSubView === 'create' && (
        <div className="max-w-3xl mx-auto bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-2xl">
          <div>
            <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-purple-400" />
              Create New Raid Auction
            </h3>
          </div>

          {activeAuction && activeAuction.status === 'ACTIVE' && (
            <div className="p-4 bg-amber-500/10 rounded-xl border border-amber-500/30 text-amber-300 text-xs space-y-1.5 shadow-md">
              <div className="flex items-center gap-2 font-black uppercase text-amber-400">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                Active Auction Currently Running!
              </div>
              <p className="leading-relaxed">
                An active raid auction (<strong className="text-amber-200">{activeAuction.title}</strong>) is currently in progress. You must finalize the active auction before creating a new one.
              </p>
              <button
                type="button"
                onClick={() => {
                  setAuctionSubView('active');
                  setActiveAuctionSubPage('finalize');
                }}
                className="mt-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs inline-flex items-center gap-1.5 transition-all shadow-md"
              >
                Go to Finalize Active Auction
              </button>
            </div>
          )}

          <form onSubmit={handleCreateAuction} className="space-y-6">
            <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                <span>Please fill in all highlighted fields (<strong className="text-rose-400">* Required</strong>) before launching the raid auction.</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span>Raid Auction Title:</span>
                  <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-widest">* Required</span>
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Molten Core - Raid Night #4"
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none transition-all ${
                    !newTitle.trim()
                      ? 'border-rose-500/60 ring-1 ring-rose-500/30 shadow-sm shadow-rose-500/10 focus:border-rose-400'
                      : 'border-emerald-500/60 ring-1 ring-emerald-500/20 focus:border-emerald-400'
                  }`}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-purple-400" />
                    Scheduled Auction Date:
                  </span>
                  <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-widest">* Required</span>
                </label>
                <input
                  type="date"
                  value={newAuctionDate}
                  onChange={(e) => setNewAuctionDate(e.target.value)}
                  className={`w-full bg-slate-950 border rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none transition-all ${
                    !newAuctionDate.trim()
                      ? 'border-rose-500/60 ring-1 ring-rose-500/30 shadow-sm shadow-rose-500/10 focus:border-rose-400'
                      : 'border-emerald-500/60 ring-1 ring-emerald-500/20 focus:border-emerald-400'
                  }`}
                />
              </div>
            </div>

            <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-purple-400" />
                  Select Raid Item from Catalog:
                </span>
                <span className="text-[10px] font-extrabold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 uppercase tracking-widest">* Min 1 Item Required</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                <div className="sm:col-span-8 space-y-2">
                  <input
                    type="text"
                    placeholder="Search catalog items..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  />

                  <select
                    value={selectedCatalogItemId || ''}
                    onChange={(e) => setSelectedCatalogItemId(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  >
                    {filteredCatalogItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-4">
                  <button
                    type="button"
                    onClick={handleAddDraftItem}
                    disabled={!selectedCatalogItemId}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item to Draft List
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Staged Auction Items ({draftAuctionItems.length}):
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded border uppercase tracking-widest ${
                    draftAuctionItems.length === 0
                      ? 'text-rose-400 bg-rose-500/10 border-rose-500/20'
                      : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                  }`}>
                    {draftAuctionItems.length === 0 ? '* Required (0/1 Item Added)' : '✓ Validated'}
                  </span>
                </span>
              </h4>

              {draftAuctionItems.length > 0 ? (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-slate-400 uppercase font-semibold border-b border-slate-800">
                        <th className="py-2.5 px-4">Item Name</th>
                        <th className="py-2.5 px-4 text-center">Initial Quantity (Editable Text Box)</th>
                        <th className="py-2.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {draftAuctionItems.map((item) => (
                        <tr key={item.item_id} className="hover:bg-slate-900/40">
                          <td className="py-2.5 px-4 font-bold text-amber-300">{item.item_name}</td>
                          <td className="py-2.5 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <input
                                type="text"
                                value={item.quantity}
                                onChange={(e) => handleDraftQuantityChange(item.item_id, e.target.value)}
                                placeholder="Qty"
                                className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-black text-amber-300 text-center focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </td>
                          <td className="py-2.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveDraftItem(item.item_id)}
                              className="p-1 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                              title="Remove item from draft"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-4 text-center border border-dashed border-slate-800 rounded-xl">
                  No items staged yet. Select an item above to add to draft.
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || draftAuctionItems.length === 0 || (!!activeAuction && activeAuction.status === 'ACTIVE')}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
            >
              <Play className="w-4 h-4" />
              Launch Raid Auction
            </button>
          </form>
        </div>
      )}

      {/* 3. AUCTION HISTORY SUB-VIEW */}
      {auctionSubView === 'history' && (
        <div className="space-y-6">
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                  Raid Auction History Log
                </span>
                <h2 className="text-xl font-black text-slate-100 mt-1 flex items-center gap-2">
                  <History className="w-5 h-5 text-purple-400" />
                  Auction History & Resolved Raid Summaries
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">Select Raid Auction:</span>
                <select
                  value={selectedHistoryAuctionId || ''}
                  onChange={(e) => setSelectedHistoryAuctionId(Number(e.target.value))}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-4 py-2 text-xs font-extrabold text-amber-300 focus:outline-none focus:border-purple-500"
                >
                  {allAuctions.map((auc) => (
                    <option key={auc.id} value={auc.id}>
                      {auc.title} ({new Date(auc.auction_date).toLocaleDateString()}) - [{auc.status}]
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {(() => {
              const selectedHistoryAuctionObj = allAuctions.find((a) => a.id === selectedHistoryAuctionId);
              if (!selectedHistoryAuctionObj) {
                return (
                  <p className="text-xs text-slate-500 italic p-6 text-center">
                    No historical auctions found.
                  </p>
                );
              }

              const historyItems = selectedHistoryAuctionObj.auction_items || [];
              const currentHistoryItem = historyItems[historyAuctionItemIndex] || historyItems[0];
              const historyItemWinners = currentHistoryItem
                ? historyAllocationRecords.filter((rec) => rec.item_id === currentHistoryItem.item_id)
                : [];

              return (
                <div className="space-y-6">
                  {historyItems.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap pb-3 border-b border-slate-800/60">
                      <span className="text-xs font-bold text-slate-400 mr-1">Select Item:</span>
                      {historyItems.map((item, idx) => (
                        <button
                          key={item.id}
                          onClick={() => setHistoryAuctionItemIndex(idx)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                            historyAuctionItemIndex === idx
                              ? 'bg-purple-600 text-white font-black shadow-md shadow-purple-600/30'
                              : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
                          }`}
                        >
                          <Shield className="w-3.5 h-3.5" />
                          {item.item?.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentHistoryItem ? (
                    <div className="p-6 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-6 shadow-xl">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                            Item #{historyAuctionItemIndex + 1} of {historyItems.length}
                          </span>
                          <h4 className="text-xl font-black text-amber-300 mt-0.5">{currentHistoryItem.item?.name}</h4>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-full">
                            Quantity: {currentHistoryItem.quantity}
                          </span>
                          <span className="text-xs font-bold px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/40 rounded-full">
                            Status: {currentHistoryItem.status}
                          </span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <h5 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          Winners Allocated ({historyItemWinners.length}):
                        </h5>

                        {historyItemWinners.length > 0 ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {historyItemWinners.map((win) => (
                              <div
                                key={win.id}
                                className="p-3 bg-slate-900/90 rounded-xl border border-emerald-500/30 flex items-center justify-between"
                              >
                                {renderMemberBadge(win.member_name, win.member_class)}
                                <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/40">
                                  Allocated: {win.allocated_quantity}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic p-4 bg-slate-900/40 rounded-xl border border-dashed border-slate-800 text-center">
                            No winners recorded for this item drop.
                          </p>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
