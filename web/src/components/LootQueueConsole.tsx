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
  Trash2,
  Gavel,
  Users,
  X,
  PlusCircle,
  ChevronRight,
  Package
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

interface IntentToBuy {
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
  intents?: IntentToBuy[];
}

interface Auction {
  id: number;
  title: string;
  status: 'ACTIVE' | 'RESOLVED';
  auction_date: string;
  auction_items: AuctionItem[];
}

interface QueueRanking {
  id: number;
  item_id: number;
  member_id: number;
  rank: number;
  status: 'WAITING' | 'PAST_WINNER';
  last_won_at?: string;
  updated_at: string;
  member_name?: string;
  discord_id?: string;
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

type MainPage = 'auctions' | 'members' | 'items';
type AuctionSubView = 'active' | 'create' | 'queue';

interface DraftAuctionItem {
  item_id: number;
  item_name: string;
  quantity: number;
}

export const LootQueueConsole: React.FC = () => {
  // Navigation Page & SubView State
  const [activePage, setActivePage] = useState<MainPage>('auctions');
  const [auctionSubView, setAuctionSubView] = useState<AuctionSubView>('active');

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

  // Create New Item Form state & Toggle
  const [showCreateItemForm, setShowCreateItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemRepeatable, setNewItemRepeatable] = useState(true);

  // Intent Submission Tab State
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedAuctionItemId, setSelectedAuctionItemId] = useState<number | null>(null);

  // Queue & Audit Panel state
  const [selectedQueueItemId, setSelectedQueueItemId] = useState<number>(1);
  const [queueRankings, setQueueRankings] = useState<QueueRanking[]>([]);
  const [historyItems, setHistoryItems] = useState<AllocationHistoryItem[]>([]);
  const [rankHistoryItems, setRankHistoryItems] = useState<ItemRankHistoryItem[]>([]);

  // Selectable Player Highlight State for Item Rank Matrix
  const [selectedHighlightMemberId, setSelectedHighlightMemberId] = useState<number | null>(null);

  // Resolution & Rank Shift tracking state
  const [lastResolutionResult, setLastResolutionResult] = useState<ItemResolutionResult | null>(null);
  const [previousRankingsMap, setPreviousRankingsMap] = useState<{ [memberId: number]: number }>({});

  // Member List Page State
  const [memberRosterSearchQuery, setMemberRosterSearchQuery] = useState('');
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDiscord, setNewMemberDiscord] = useState('');
  const [selectedDetailMember, setSelectedDetailMember] = useState<Member | null>(null);
  const [selectedDetailMemberHistory, setSelectedDetailMemberHistory] = useState<AllocationHistoryItem[]>([]);

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
        }
      }

      if (activeAuctionRes.ok) {
        const auctionData = await activeAuctionRes.json();
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

  // Create & Launch New Raid Auction
  const handleCreateAuction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      showMsg('error', 'Auction title is required.');
      return;
    }

    if (draftAuctionItems.length === 0) {
      showMsg('error', 'Please add at least one raid item to create an auction.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/v1/auctions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          items: draftAuctionItems.map((di) => ({
            item_id: di.item_id,
            quantity: di.quantity,
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
        setSelectedQueueItemId(auctionData.auction_items[0].item_id);
      }

      setDraftAuctionItems([]);
      setAuctionSubView('active');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to launch auction');
    } finally {
      setLoading(false);
    }
  };

  // Create New Raid Catalog Item Handler
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
          description: newItemDesc.trim(),
          is_repeatable: newItemRepeatable,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create item');
      }

      const createdItem: Item = await res.json();
      setItems((prev) => [...prev, createdItem]);
      setSelectedQueueItemId(createdItem.id);
      showMsg('success', `Successfully created new raid item "${createdItem.name}"!`);
      setNewItemName('');
      setNewItemDesc('');
      setShowCreateItemForm(false);
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  // Update Item Quantity in Active Auction
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
        const err = await res.json();
        throw new Error(err.error || 'Failed to update item quantity');
      }

      showMsg('success', `Updated item drop quantity to ${newQty}!`);

      // Refresh active auction
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

  // Toggle Intent to Buy (Submit or Remove Intent)
  const handleToggleIntent = async (auctionItemId: number, memberId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auction-items/${auctionItemId}/intents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ member_id: memberId }),
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

  // Resolve Auction Item & Calculate Rank Movements
  const handleResolveItem = async (auctionItemId: number, itemId: number) => {
    setLoading(true);
    try {
      // 1. Capture current rankings before resolution
      const preQueueRes = await fetch(`/api/v1/items/${itemId}/rankings`);
      if (preQueueRes.ok) {
        const preRankings: QueueRanking[] = await preQueueRes.json();
        const prevMap: { [memberId: number]: number } = {};
        preRankings.forEach((r) => {
          prevMap[r.member_id] = r.rank;
        });
        setPreviousRankingsMap(prevMap);
      }

      // 2. Execute resolution API
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
      showMsg('error', err.message || 'Failed to resolve item');
    } finally {
      setLoading(false);
    }
  };

  // Add New Guild Member Handler
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberDiscord.trim()) {
      showMsg('error', 'Member Name and Discord Tag are required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newMemberName.trim(),
          discord_id: newMemberDiscord.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create member');
      }

      const createdMem: Member = await res.json();
      setMembers((prev) => [...prev, createdMem]);
      showMsg('success', `Added new guild member ${createdMem.name}!`);
      setNewMemberName('');
      setNewMemberDiscord('');
      setShowAddMemberModal(false);
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  // View Member Detail Profile Modal
  const handleOpenMemberDetail = async (mem: Member) => {
    setSelectedDetailMember(mem);
    try {
      const res = await fetch(`/api/v1/history/members/${mem.id}`);
      if (res.ok) {
        const hData = await res.json();
        setSelectedDetailMemberHistory(hData);
      } else {
        setSelectedDetailMemberHistory([]);
      }
    } catch {
      setSelectedDetailMemberHistory([]);
    }
  };

  // Helper function to render Rank Movement Badge
  const renderRankMovementBadge = (memberId: number, currentRank: number, isWinner: boolean) => {
    const prevRank = previousRankingsMap[memberId];

    if (isWinner) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          <Award className="w-3 h-3 text-emerald-400" />
          Rotated to Past Winner
        </span>
      );
    }

    if (prevRank === undefined) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
          <Sparkles className="w-3 h-3 text-blue-400" />
          ★ New Entry
        </span>
      );
    }

    const rankDiff = prevRank - currentRank; // Positive means moved up in rank (e.g. 3 -> 1 is +2)

    if (rankDiff > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
          <ArrowUp className="w-3 h-3 text-purple-400" />▲ Moved Up +{rankDiff} (Rank #{prevRank} → #{currentRank})
        </span>
      );
    } else if (rankDiff < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
          <ArrowDown className="w-3 h-3 text-slate-500" />▼ Rank #{prevRank} → #{currentRank}
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
          Unchanged (Rank #{currentRank})
        </span>
      );
    }
  };

  // Filter Catalog Items for Searchable Dropdown
  const filteredCatalogItems = items.filter(
    (i) =>
      i.name.toLowerCase().includes(itemSearchQuery.toLowerCase()) ||
      i.description.toLowerCase().includes(itemSearchQuery.toLowerCase())
  );

  // Filter Members for Searchable Member Selector in Intent Tab
  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      m.discord_id.toLowerCase().includes(memberSearchQuery.toLowerCase())
  );

  // Filter Members for Member List Page
  const filteredRosterMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberRosterSearchQuery.toLowerCase()) ||
      m.discord_id.toLowerCase().includes(memberRosterSearchQuery.toLowerCase())
  );

  const currentSelectedAuctionItem = activeAuction?.auction_items?.find((ai) => ai.id === selectedAuctionItemId);

  // Build Left-to-Right Chronological Matrix Columns for Page 3 (Items Page)
  const uniqueAuctionMap = new Map<number, { id: number; title: string; date: string }>();
  rankHistoryItems.forEach((rh) => {
    if (!uniqueAuctionMap.has(rh.auction_id)) {
      uniqueAuctionMap.set(rh.auction_id, {
        id: rh.auction_id,
        title: rh.auction_title,
        date: rh.recorded_at,
      });
    }
  });

  const chronologicalAuctions = Array.from(uniqueAuctionMap.values()).sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Map auctionId -> rank -> ItemRankHistoryItem for Rank-Indexed Row Matrix
  const auctionRankToItemMap: { [auctionId: number]: { [rank: number]: ItemRankHistoryItem } } = {};
  rankHistoryItems.forEach((rh) => {
    if (!auctionRankToItemMap[rh.auction_id]) {
      auctionRankToItemMap[rh.auction_id] = {};
    }
    auctionRankToItemMap[rh.auction_id][rh.rank] = rh;
  });

  // Map live queue rankings: rank -> QueueRanking
  const liveRankToItemMap: { [rank: number]: QueueRanking } = {};
  queueRankings.forEach((qr) => {
    liveRankToItemMap[qr.rank] = qr;
  });

  // Determine max rank row index (1..maxRank)
  const maxSnapshotRank = rankHistoryItems.reduce((max, r) => (r.rank > max ? r.rank : max), 0);
  const maxLiveRank = queueRankings.reduce((max, r) => (r.rank > max ? r.rank : max), 0);
  const maxRankCount = Math.max(1, maxSnapshotRank, maxLiveRank, members.length);
  const rankRowNumbers = Array.from({ length: maxRankCount }, (_, i) => i + 1);

  const selectedItemObj = items.find((i) => i.id === selectedQueueItemId);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* Top Header & 3 Main Top-Level Page Tabs */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-40 px-4 md:px-8 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-amber-500 to-purple-600 rounded-xl shadow-lg shadow-amber-500/20">
            <Crown className="w-6 h-6 text-slate-950 font-bold" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider text-slate-100 uppercase">
              Guild Loot Queue System
            </h1>
            <p className="text-xs text-slate-400 font-medium">
              Priority Roll & Intent Allocation Console
            </p>
          </div>
        </div>

        {/* Top 3 Main Pages Navigation Buttons */}
        <div className="flex flex-wrap items-center bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto gap-1">
          <button
            onClick={() => setActivePage('auctions')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activePage === 'auctions'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Gavel className="w-4 h-4" />
            1. Auctions
          </button>
          <button
            onClick={() => setActivePage('items')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activePage === 'items'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Package className="w-4 h-4" />
            2. Items ({items.length})
          </button>
          <button
            onClick={() => setActivePage('members')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
              activePage === 'members'
                ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Users className="w-4 h-4" />
            3. Member List ({members.length})
          </button>
        </div>
      </header>

      {/* Global Notifications */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 md:px-8 mt-4">
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-semibold flex items-center justify-between shadow-lg ${
              message.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-200'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-200'
            }`}
          >
            <span>{message.text}</span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* PAGE 1: AUCTIONS PAGE */}
      {activePage === 'auctions' && (
        <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6">
          {/* Sub-view Navigation Bar for Auctions Page */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Gavel className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  Raid Auction Hub
                </h2>
                <p className="text-xs text-slate-400">
                  Select an option below to manage active raid drops, create a new auction, or inspect queue ranks.
                </p>
              </div>
            </div>

            {/* Sub-view Pills */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setAuctionSubView('active')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  auctionSubView === 'active'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Swords className="w-3.5 h-3.5" />
                View Active Auction
                {activeAuction && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                )}
              </button>

              <button
                onClick={() => setAuctionSubView('create')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  auctionSubView === 'create'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <PlusCircle className="w-3.5 h-3.5" />
                Create New Auction
              </button>

              <button
                onClick={() => setAuctionSubView('queue')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  auctionSubView === 'queue'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                Priority Queue & History
              </button>
            </div>
          </div>

          {/* 1. ACTIVE AUCTION SUB-VIEW */}
          {auctionSubView === 'active' && (
            <div className="space-y-6">
              {activeAuction ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Active Auction Items & Quantities */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Active Raid Auction
                          </span>
                          <h3 className="text-lg font-black text-slate-100 mt-1">{activeAuction.title}</h3>
                          <p className="text-xs text-slate-400">
                            Launched {new Date(activeAuction.auction_date).toLocaleString()}
                          </p>
                        </div>
                      </div>

                      {/* Item Cards List */}
                      <div className="space-y-3">
                        <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                          Items in this Auction ({activeAuction.auction_items?.length || 0}):
                        </h4>

                        {activeAuction.auction_items?.map((ai) => {
                          const isSelected = selectedAuctionItemId === ai.id;
                          const isResolved = ai.status === 'RESOLVED';
                          const intentsCount = ai.intents?.length || 0;

                          return (
                            <div
                              key={ai.id}
                              className={`p-4 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-purple-950/30 border-purple-500/50 shadow-lg shadow-purple-500/10'
                                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={() => setSelectedAuctionItemId(ai.id)}
                                    className="p-2 bg-slate-900 rounded-lg border border-slate-700 text-amber-400 hover:border-purple-500 transition-colors"
                                  >
                                    <Shield className="w-5 h-5" />
                                  </button>

                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h5 className="font-bold text-slate-100 text-sm">{ai.item?.name}</h5>
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
                                    <p className="text-xs text-slate-400 line-clamp-1">{ai.item?.description}</p>
                                  </div>
                                </div>

                                {/* Post-Raid Drop Quantity Stepper */}
                                <div className="flex items-center gap-4 self-end sm:self-auto">
                                  <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                                    <span className="text-[10px] font-extrabold uppercase text-slate-400">Qty:</span>
                                    {!isResolved ? (
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick={() => handleUpdateItemQuantity(ai.id, ai.quantity - 1)}
                                          disabled={loading || ai.quantity <= 0}
                                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold disabled:opacity-30"
                                        >
                                          -
                                        </button>
                                        <span className="font-extrabold text-amber-400 text-sm px-1.5">
                                          {ai.quantity}
                                        </span>
                                        <button
                                          onClick={() => handleUpdateItemQuantity(ai.id, ai.quantity + 1)}
                                          disabled={loading}
                                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold"
                                        >
                                          +
                                        </button>
                                      </div>
                                    ) : (
                                      <span className="font-bold text-slate-200 text-xs px-1">{ai.quantity}</span>
                                    )}
                                  </div>

                                  <div className="text-right">
                                    <span className="text-[11px] font-bold text-purple-300 block">
                                      {intentsCount} Intent{intentsCount !== 1 ? 's' : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Submit Intent & Resolve Item Options */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Submit Intent Box */}
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                      <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                        <UserPlus className="w-4 h-4 text-purple-400" />
                        Submit Member Intent to Buy
                      </h3>

                      {currentSelectedAuctionItem ? (
                        <div className="space-y-3">
                          <div className="p-3 bg-purple-950/20 rounded-xl border border-purple-500/30">
                            <span className="text-[10px] font-extrabold text-purple-400 uppercase tracking-wider block">
                              Target Auction Item:
                            </span>
                            <span className="text-sm font-bold text-slate-100">
                              {currentSelectedAuctionItem.item?.name} (Qty: {currentSelectedAuctionItem.quantity})
                            </span>
                          </div>

                          {/* Member Search & Dropdown Select */}
                          <div className="space-y-2">
                            <label className="text-xs font-semibold text-slate-300 block">Select Guild Member:</label>
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                placeholder="Search member name or discord..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            <select
                              value={selectedMemberId || ''}
                              onChange={(e) => setSelectedMemberId(Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                            >
                              {filteredMembers.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.discord_id})
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Submit / Remove Intent Toggle Button */}
                          {selectedMemberId && (
                            <button
                              onClick={() => handleToggleIntent(currentSelectedAuctionItem.id, selectedMemberId)}
                              disabled={loading || currentSelectedAuctionItem.status === 'RESOLVED'}
                              className={`w-full py-2.5 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 transition-all ${
                                currentSelectedAuctionItem.intents?.some((i) => i.member_id === selectedMemberId)
                                  ? 'bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-200'
                                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-600/20'
                              } disabled:opacity-50`}
                            >
                              {currentSelectedAuctionItem.intents?.some((i) => i.member_id === selectedMemberId) ? (
                                <>
                                  <X className="w-4 h-4" />
                                  Remove Intent to Buy
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-4 h-4" />
                                  Register Intent to Buy
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic py-4 text-center">
                          Select an item on the left to submit member intent.
                        </p>
                      )}
                    </div>

                    {/* Resolve Auction Box */}
                    {currentSelectedAuctionItem && (
                      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                        <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-amber-400" />
                          Resolve Item Auction
                        </h3>

                        {currentSelectedAuctionItem.status === 'PENDING' ? (
                          <div className="space-y-3">
                            <p className="text-xs text-slate-400">
                              Resolving this item will automatically run the 3-Tier Allocation Engine for candidates with registered intents, allocate winners, rotate winners to <code className="text-purple-300">PAST_WINNER</code>, and record rank snapshots.
                            </p>
                            <button
                              onClick={() =>
                                handleResolveItem(currentSelectedAuctionItem.id, currentSelectedAuctionItem.item_id)
                              }
                              disabled={loading}
                              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                            >
                              <Play className="w-4 h-4" />
                              Execute 3-Tier Allocation & Resolve
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-950/40 rounded-xl border border-emerald-500/30 text-emerald-200 text-xs font-semibold">
                            ✓ This item auction has been RESOLVED.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* No Active Auction State - Prompt User to Create One */
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
                <p className="text-xs text-slate-400">
                  Select loot items from the catalog and specify initial drop quantities.
                </p>
              </div>

              <form onSubmit={handleCreateAuction} className="space-y-6">
                {/* Auction Title Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Raid Auction Title:
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Molten Core - Raid Night #4"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                {/* Catalog Item Picker */}
                <div className="space-y-3 p-4 bg-slate-950/60 rounded-xl border border-slate-800">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-purple-400" />
                    Select Raid Item from Catalog:
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                    <div className="sm:col-span-7 space-y-2">
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

                    <div className="sm:col-span-5 flex flex-col justify-between gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                          Initial Drop Quantity:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={initialQuantityInput}
                          onChange={(e) => setInitialQuantityInput(Number(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-400 focus:outline-none focus:border-purple-500"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddDraftItem}
                        disabled={!selectedCatalogItemId}
                        className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        Add to Draft List
                      </button>
                    </div>
                  </div>
                </div>

                {/* Staged Draft Items Table */}
                <div className="space-y-3">
                  <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Staged Auction Items ({draftAuctionItems.length}):
                  </h4>

                  {draftAuctionItems.length > 0 ? (
                    <div className="bg-slate-950/80 rounded-xl border border-slate-800 overflow-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                            <th className="py-2.5 px-4">Item Name</th>
                            <th className="py-2.5 px-4">Quantity</th>
                            <th className="py-2.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/60 text-slate-200">
                          {draftAuctionItems.map((di) => (
                            <tr key={di.item_id}>
                              <td className="py-3 px-4 font-semibold text-slate-100">{di.item_name}</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDraftQuantity(di.item_id, di.quantity - 1)}
                                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold"
                                  >
                                    -
                                  </button>
                                  <span className="font-extrabold text-amber-400 text-xs px-1">
                                    {di.quantity}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateDraftQuantity(di.item_id, di.quantity + 1)}
                                    className="w-5 h-5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-bold"
                                  >
                                    +
                                  </button>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveDraftItem(di.item_id)}
                                  className="text-rose-400 hover:text-rose-300 p-1"
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
                  disabled={loading || draftAuctionItems.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-purple-600/20 disabled:opacity-50"
                >
                  <Play className="w-4 h-4" />
                  Launch Raid Auction
                </button>
              </form>
            </div>
          )}

          {/* 3. PRIORITY QUEUE & RANK HISTORY SUB-VIEW */}
          {auctionSubView === 'queue' && (
            <div className="space-y-6">
              {/* Item Selector Pills */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                  Select Item to Inspect Priority Queue & Rank History:
                </span>
                <div className="flex flex-wrap gap-2">
                  {items.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setSelectedQueueItemId(item.id)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        selectedQueueItemId === item.id
                          ? 'bg-purple-600 text-white shadow-md'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Priority Queue Table */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-purple-400" />
                    Priority Queue Rankings (1..M)
                  </h3>

                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                          <th className="py-3 px-4">Rank</th>
                          <th className="py-3 px-4">Guild Member</th>
                          <th className="py-3 px-4">Status</th>
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

                {/* Allocation Audit Winner History */}
                <div className="lg:col-span-5 space-y-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <History className="w-4 h-4 text-indigo-400" />
                    Allocation Winner History
                  </h3>

                  <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
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
            </div>
          )}
        </main>
      )}

      {/* PAGE 2: MEMBER LIST PAGE */}
      {activePage === 'members' && (
        <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6">
          {/* Member List Header & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  Guild Roster Directory ({members.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Manage guild members, view won items history, and inspect queue standings.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Member Filter */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search member name or discord tag..."
                  value={memberRosterSearchQuery}
                  onChange={(e) => setMemberRosterSearchQuery(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 w-56 md:w-64"
                />
              </div>

              {/* Add Member Trigger Button */}
              <button
                onClick={() => setShowAddMemberModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
              >
                <UserPlus className="w-4 h-4" />
                Add Guild Member
              </button>
            </div>
          </div>

          {/* Guild Members Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRosterMembers.map((mem) => {
              const wonCount = historyItems.filter((h) => h.member_id === mem.id).length;

              return (
                <div
                  key={mem.id}
                  className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 hover:border-purple-500/40 transition-all shadow-lg flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="p-3 bg-purple-950/60 rounded-xl border border-purple-500/30 text-purple-300 font-bold text-base">
                          {mem.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="font-extrabold text-slate-100 text-sm">{mem.name}</h3>
                          <span className="text-xs text-slate-400 font-mono block">{mem.discord_id}</span>
                        </div>
                      </div>

                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        ID #{mem.id}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs pt-2">
                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase block">Items Won</span>
                          <span className="font-extrabold text-slate-200">{wonCount}</span>
                        </div>
                      </div>

                      <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-2">
                        <Shield className="w-4 h-4 text-purple-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-500 font-extrabold uppercase block">Status</span>
                          <span className="font-bold text-emerald-400">Active</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenMemberDetail(mem)}
                    className="w-full py-2 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-purple-500/40 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    View Member Profile & History
                    <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* PAGE 3: UNIFIED ITEMS & CATALOG PAGE */}
      {activePage === 'items' && (
        <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6">
          {/* Page Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  Raid Items & Rank Matrix Directory ({items.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Create raid loot items, manage catalog drops, and inspect rank progression ordered chronologically from left to right.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowCreateItemForm(!showCreateItemForm)}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <PlusCircle className="w-4 h-4" />
              {showCreateItemForm ? 'Close Add Form' : 'Create / Add New Item'}
            </button>
          </div>

          {/* Section 1: Create New Item Form (Toggleable Card) */}
          {showCreateItemForm && (
            <div className="bg-slate-900/90 rounded-2xl border border-purple-500/40 p-6 space-y-4 shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                  <PlusCircle className="w-4 h-4 text-purple-400" />
                  Create / Add New Raid Item
                </h3>
                <button onClick={() => setShowCreateItemForm(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateItem} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">Item Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. Atiesh, Greatstaff of the Guardian"
                      value={newItemName}
                      onChange={(e) => setNewItemName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">Description & Raid Notes:</label>
                    <input
                      type="text"
                      placeholder="e.g. Legendary staff forged from Medivh's power..."
                      value={newItemDesc}
                      onChange={(e) => setNewItemDesc(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="repeatable_unified"
                      checked={newItemRepeatable}
                      onChange={(e) => setNewItemRepeatable(e.target.checked)}
                      className="w-4 h-4 accent-purple-600 rounded"
                    />
                    <label htmlFor="repeatable_unified" className="text-xs font-semibold text-slate-200 cursor-pointer">
                      Is Repeatable Drop (Allows winners to re-enter waiting queue after rotation)
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-md shadow-purple-600/20"
                  >
                    Save Raid Item
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Section 2: Item Selector Pills */}
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
              Select Raid Item to Display Rank Progression Matrix:
            </span>
            <div className="flex flex-wrap gap-2">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedQueueItemId(item.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    selectedQueueItemId === item.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </div>
          </div>

          {/* Selected Item Info Banner */}
          {selectedItemObj && (
            <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  <h3 className="text-base font-black text-slate-100">{selectedItemObj.name}</h3>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {selectedItemObj.is_repeatable ? 'Repeatable Drop' : 'One-Time Drop'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{selectedItemObj.description}</p>
              </div>

              <div className="flex items-center gap-4 text-xs">
                <div className="text-center px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-extrabold block">Past Auctions</span>
                  <span className="font-black text-purple-300">{chronologicalAuctions.length}</span>
                </div>
                <div className="text-center px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-500 font-extrabold block">Total Winners</span>
                  <span className="font-black text-emerald-400">{historyItems.length}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Player Selection / Highlight Toolbar */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Select Player to Highlight Rank Progression Across Timeline:
              </span>
              {selectedHighlightMemberId && (
                <button
                  onClick={() => setSelectedHighlightMemberId(null)}
                  className="text-[11px] font-bold text-rose-400 hover:text-rose-300 flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  Clear Highlight
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {members.map((mem) => {
                const isSelected = selectedHighlightMemberId === mem.id;
                return (
                  <button
                    key={mem.id}
                    onClick={() => setSelectedHighlightMemberId(isSelected ? null : mem.id)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/30 scale-105 border border-amber-400 font-extrabold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {isSelected ? '★ ' : ''}{mem.name}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: Rank-Indexed Matrix Table (Ordered Ascendingly 1..N) */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-3">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Auction Priority Rank Matrix (Ordered Ascendingly 1..N)
              </h3>
              <span className="text-[11px] text-slate-400">
                Click any player name to highlight rank movements across all auctions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-bold uppercase">
                    <th className="py-3.5 px-4 sticky left-0 bg-slate-950 z-10 border-r border-slate-800 text-center w-24">
                      Priority Rank
                    </th>
                    {chronologicalAuctions.length > 0 ? (
                      chronologicalAuctions.map((auc) => (
                        <th key={auc.id} className="py-3.5 px-6 border-r border-slate-800 text-center min-w-[170px]">
                          <span className="text-slate-200 block truncate max-w-[160px]">{auc.title}</span>
                          <span className="text-[10px] text-purple-400 font-mono font-normal block">
                            {new Date(auc.date).toLocaleDateString()}
                          </span>
                        </th>
                      ))
                    ) : (
                      <th className="py-3.5 px-6 text-slate-500 italic font-normal">
                        No past auctions recorded yet for this item
                      </th>
                    )}
                    <th className="py-3.5 px-4 text-center bg-slate-950 min-w-[170px]">Current Live Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {rankRowNumbers.map((rankNum) => (
                    <tr key={rankNum} className="hover:bg-slate-800/40 transition-colors">
                      {/* Priority Rank Header (Sticky Left Column) */}
                      <td className="py-3.5 px-4 font-black text-amber-400 sticky left-0 bg-slate-900 border-r border-slate-800 text-center">
                        #{rankNum}
                      </td>

                      {/* Auction Snapshot Columns */}
                      {chronologicalAuctions.length > 0 ? (
                        chronologicalAuctions.map((auc) => {
                          const snapshot = auctionRankToItemMap[auc.id]?.[rankNum];
                          if (!snapshot) {
                            return (
                              <td key={auc.id} className="py-3.5 px-6 border-r border-slate-800/60 text-center text-slate-600 font-mono">
                                —
                              </td>
                            );
                          }

                          const isWinner = historyItems.some(
                            (h) => h.member_id === snapshot.member_id && h.auction_id === auc.id
                          );
                          const isHighlighted = selectedHighlightMemberId === snapshot.member_id;

                          return (
                            <td key={auc.id} className="py-2.5 px-4 border-r border-slate-800/60 text-center">
                              <button
                                onClick={() =>
                                  setSelectedHighlightMemberId(isHighlighted ? null : snapshot.member_id)
                                }
                                className={`w-full py-1.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                                  isHighlighted
                                    ? 'bg-gradient-to-r from-amber-500/30 via-purple-600/30 to-amber-500/30 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20 scale-105 ring-2 ring-amber-400/50'
                                    : isWinner
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                                    : 'bg-slate-950/80 text-slate-200 border-slate-800 hover:border-purple-500/40'
                                }`}
                              >
                                {isWinner ? (
                                  <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-mono">#{snapshot.rank}</span>
                                )}
                                <span>{snapshot.member_name}</span>
                                {isHighlighted && <Sparkles className="w-3 h-3 text-amber-400" />}
                              </button>
                            </td>
                          );
                        })
                      ) : (
                        <td colSpan={1} className="py-3.5 px-6 text-center text-slate-600">
                          —
                        </td>
                      )}

                      {/* Current Live Rank Column */}
                      {(() => {
                        const liveRanking = liveRankToItemMap[rankNum];
                        if (!liveRanking) {
                          return <td className="py-3.5 px-4 text-center text-slate-600 font-mono">—</td>;
                        }

                        const isHighlighted = selectedHighlightMemberId === liveRanking.member_id;

                        return (
                          <td className="py-2.5 px-4 text-center">
                            <button
                              onClick={() =>
                                setSelectedHighlightMemberId(isHighlighted ? null : liveRanking.member_id)
                              }
                              className={`w-full py-1.5 px-3 rounded-xl border text-xs font-extrabold flex items-center justify-center gap-1.5 transition-all ${
                                isHighlighted
                                  ? 'bg-gradient-to-r from-amber-500/30 via-purple-600/30 to-amber-500/30 border-amber-400 text-amber-200 shadow-lg shadow-amber-500/20 scale-105 ring-2 ring-amber-400/50'
                                  : liveRanking.status === 'PAST_WINNER'
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                                  : 'bg-purple-950/40 text-purple-300 border-purple-500/30 hover:border-purple-400'
                              }`}
                            >
                              <span className="text-[10px] font-mono">#{liveRanking.rank}</span>
                              <span>{liveRanking.member_name}</span>
                              {isHighlighted && <Sparkles className="w-3 h-3 text-amber-400" />}
                            </button>
                          </td>
                        );
                      })()}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 5: Raid Catalog Items List Table */}
          <div className="space-y-3 pt-6 border-t border-slate-800">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Package className="w-4 h-4 text-purple-400" />
              All Catalog Raid Items ({items.length})
            </h3>

            <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                    <th className="py-3 px-4">Item Name</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4">Repeatable Drop</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {items.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-100">{item.name}</td>
                      <td className="py-3 px-4 text-slate-400">{item.description}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.is_repeatable
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {item.is_repeatable ? 'Yes' : 'No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      )}

      {/* Add New Guild Member Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-purple-400" />
                Add New Guild Member
              </h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Member Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Thrall"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-300 block">Discord Tag / ID:</label>
                <input
                  type="text"
                  placeholder="e.g. thrall#9999"
                  value={newMemberDiscord}
                  onChange={(e) => setNewMemberDiscord(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="flex-1 py-2.5 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-600/20"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Profile Detail Modal */}
      {selectedDetailMember && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-purple-950/60 rounded-xl border border-purple-500/30 text-purple-300 font-bold text-lg">
                  {selectedDetailMember.name.substring(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-100">{selectedDetailMember.name}</h3>
                  <span className="text-xs text-slate-400 font-mono block">{selectedDetailMember.discord_id}</span>
                </div>
              </div>

              <button onClick={() => setSelectedDetailMember(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Member Loot Won History */}
            <div className="space-y-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-400" />
                Loot Items Won by {selectedDetailMember.name}:
              </h4>

              <div className="bg-slate-950/60 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                      <th className="py-2.5 px-4">Item Name</th>
                      <th className="py-2.5 px-4">Raid Auction</th>
                      <th className="py-2.5 px-4">Allocated Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {selectedDetailMemberHistory.length > 0 ? (
                      selectedDetailMemberHistory.map((h) => (
                        <tr key={h.id}>
                          <td className="py-3 px-4 font-bold text-amber-300">{h.item_name}</td>
                          <td className="py-3 px-4 text-slate-400">{h.auction_title}</td>
                          <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                            {new Date(h.allocated_at).toLocaleString()}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="py-4 text-center text-slate-500 italic">
                          No item allocations won by this member yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
