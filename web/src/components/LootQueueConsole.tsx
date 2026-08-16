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
  ChevronLeft,
  Package,
  Calendar,
  Zap,
  Tag,
  Palette,
  AlertTriangle
} from 'lucide-react';

interface GuildClass {
  id: number;
  name: string;
  color?: string;
}

interface Member {
  id: number;
  name: string;
  discord_id: string;
  class_id?: number;
  class?: GuildClass;
  gvg_build?: string;
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
  quantity?: number;
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
  created_ts?: string;
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
  member?: Member;
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
  member_class?: GuildClass;
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
  member_class?: GuildClass;
  rank: number;
  status: string;
  recorded_at: string;
}

type MainPage = 'auctions' | 'members' | 'items';
type AuctionSubView = 'active' | 'create' | 'history';
type ActiveAuctionSubPage = 'edit' | 'intent' | 'allocation' | 'resolution' | 'summary' | 'finalize';
type MemberSubView = 'roster' | 'add_member' | 'add_class';
type ItemSubView = 'list' | 'rank_history' | 'priority_queue';

interface DraftAuctionItem {
  item_id: number;
  item_name: string;
  quantity: string;
}

// Preset Swatch Colors for Guild Classes
const COLOR_PRESETS = [
  { name: 'Warrior Tan', hex: '#C79C6E' },
  { name: 'Paladin Pink', hex: '#F58CBA' },
  { name: 'Hunter Green', hex: '#ABD473' },
  { name: 'Rogue Yellow', hex: '#FFF569' },
  { name: 'Priest White', hex: '#FFFFFF' },
  { name: 'Shaman Blue', hex: '#0070DE' },
  { name: 'Mage Light Blue', hex: '#69CCF0' },
  { name: 'Warlock Purple', hex: '#9482C9' },
  { name: 'Druid Orange', hex: '#FF7D0A' },
  { name: 'Emerald Teal', hex: '#10B981' },
];

export const LootQueueConsole: React.FC = () => {
  // Navigation Page & SubView State
  const [activePage, setActivePage] = useState<MainPage>('auctions');
  const [auctionSubView, setAuctionSubView] = useState<AuctionSubView>('active');
  const [activeAuctionSubPage, setActiveAuctionSubPage] = useState<ActiveAuctionSubPage>('edit');
  const [summaryItemIndex, setSummaryItemIndex] = useState<number>(0);

  // Auction History States
  const [allAuctions, setAllAuctions] = useState<Auction[]>([]);
  const [selectedHistoryAuctionId, setSelectedHistoryAuctionId] = useState<number | null>(null);
  const [historyAllocationRecords, setHistoryAllocationRecords] = useState<AllocationHistoryItem[]>([]);
  const [historyAuctionItemIndex, setHistoryAuctionItemIndex] = useState<number>(0);

  const [memberSubView, setMemberSubView] = useState<MemberSubView>('roster');
  const [itemSubView, setItemSubView] = useState<ItemSubView>('list');

  const [classes, setClasses] = useState<GuildClass[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

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
      console.error('Failed to fetch all auctions:', err);
    }
  };

  // Fetch allocation records for selected history auction
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

  // Fetch allocation records for active auction
  const [activeAuctionAllocationRecords, setActiveAuctionAllocationRecords] = useState<AllocationHistoryItem[]>([]);
  const fetchActiveAuctionHistory = async (auctionId: number) => {
    try {
      const res = await fetch(`/api/v1/history/auctions/${auctionId}`);
      if (res.ok) {
        const records: AllocationHistoryItem[] = await res.json();
        setActiveAuctionAllocationRecords(records);
      }
    } catch (err) {
      console.error('Failed to fetch active auction history records:', err);
    }
  };

  useEffect(() => {
    fetchInitialData();
    fetchAllAuctions();
  }, []);

  useEffect(() => {
    if (selectedHistoryAuctionId) {
      fetchAuctionHistoryRecords(selectedHistoryAuctionId);
      setHistoryAuctionItemIndex(0);
    }
  }, [selectedHistoryAuctionId]);

  const [items, setItems] = useState<Item[]>([]);
  const [activeAuction, setActiveAuction] = useState<Auction | null>(null);

  // Create Auction Form state & Scheduled Date Picker
  const [newTitle, setNewTitle] = useState('');
  const [newAuctionDate, setNewAuctionDate] = useState<string>('');
  
  // Searchable Item Selection for Draft Auction & Edit Auction
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [selectedCatalogItemId, setSelectedCatalogItemId] = useState<number | null>(null);
  const [editAuctionAddItemId, setEditAuctionAddItemId] = useState<number | null>(null);
  const [draftAuctionItems, setDraftAuctionItems] = useState<DraftAuctionItem[]>([]);

  // Create New Item Form state
  const [newItemName, setNewItemName] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemRepeatable, setNewItemRepeatable] = useState(true);

  // Intent Submission Tab State (Member-Centric: Member -> Item -> Quantity)
  const [memberSearchQuery, setMemberSearchQuery] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);
  const [selectedAuctionItemId, setSelectedAuctionItemId] = useState<number | null>(null);
  const [intentQuantityInput, setIntentQuantityInput] = useState<string>('1');

  // Item Allocation Sub-Page Local Quantity Inputs Map (Allows empty string state)
  const [allocationQtyInputs, setAllocationQtyInputs] = useState<{ [auctionItemId: number]: string }>({});

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

  // Member Page Section Forms
  const [memberRosterSearchQuery, setMemberRosterSearchQuery] = useState('');

  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDiscord, setNewMemberDiscord] = useState('');
  const [selectedMemberClassId, setSelectedMemberClassId] = useState<number | ''>('');
  const [memberGvGBuild, setMemberGvGBuild] = useState<string>('');

  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#A855F7');

  const [selectedDetailMember, setSelectedDetailMember] = useState<Member | null>(null);
  const [selectedDetailMemberHistory, setSelectedDetailMemberHistory] = useState<AllocationHistoryItem[]>([]);

  // Loading & Notification states
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchInitialData = async () => {
    try {
      const [classesRes, membersRes, itemsRes, activeAuctionRes] = await Promise.all([
        fetch('/api/v1/classes'),
        fetch('/api/v1/members'),
        fetch('/api/v1/items'),
        fetch('/api/v1/auctions/active'),
      ]);

      if (classesRes.ok) {
        const fetchedClasses: GuildClass[] = await classesRes.json();
        setClasses(fetchedClasses);
      }
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
          if (!editAuctionAddItemId) setEditAuctionAddItemId(fetchedItems[0].id);
          if (!selectedQueueItemId) setSelectedQueueItemId(fetchedItems[0].id);
        }
      }

      if (activeAuctionRes.ok) {
        const auctionData = await activeAuctionRes.json();
        if (auctionData && auctionData.id) {
          setActiveAuction(auctionData);
          fetchActiveAuctionHistory(auctionData.id);
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
    if (activeAuction?.id) {
      fetchActiveAuctionHistory(activeAuction.id);
    }
  }, [activeAuction?.id, activeAuctionSubPage]);

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

  // Sync intentQuantityInput with existing member intent if present
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

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Helper Function: Enclose Member Name in Class Color Badge (No separate class text)
  const renderMemberBadge = (name: string, guildClass?: GuildClass, extraSuffix?: React.ReactNode) => {
    const color = guildClass?.color || '#A855F7';
    return (
      <span
        className="px-2.5 py-0.5 rounded-lg text-xs font-extrabold border inline-flex items-center gap-1.5 shadow-sm shrink-0"
        style={{
          backgroundColor: `${color}25`,
          borderColor: `${color}60`,
          color: color === '#FFFFFF' ? '#F8FAFC' : color,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        {name}
        {extraSuffix}
      </span>
    );
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
        quantity: '0',
      },
    ]);

    showMsg('success', `Added ${itemObj.name} to auction draft list!`);
  };

  // Remove Item from Draft Auction List
  const handleRemoveDraftItem = (itemId: number) => {
    setDraftAuctionItems(draftAuctionItems.filter((di) => di.item_id !== itemId));
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

      // Refresh active auction
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

  // Delete Item from running Active Auction
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

      // Refresh active auction
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

  // Update Quantity of Item in Draft List
  const handleUpdateDraftQuantity = (itemId: number, newQtyStr: string) => {
    setDraftAuctionItems(
      draftAuctionItems.map((di) =>
        di.item_id === itemId ? { ...di, quantity: newQtyStr } : di
      )
    );
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

    // Validation for empty quantity text boxes in draft list
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
        setSelectedQueueItemId(auctionData.auction_items[0].item_id);
      }

      setDraftAuctionItems([]);
      setNewAuctionDate('');
      setAuctionSubView('active');
      setActiveAuctionSubPage('edit');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to launch auction');
    } finally {
      setLoading(false);
    }
  };

  // Create New Guild Class Handler (with Color picker support)
  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) {
      showMsg('error', 'Class Name is required.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/v1/classes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newClassName.trim(),
          color: newClassColor,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create class');
      }

      const createdClass: GuildClass = await res.json();
      setClasses((prev) => [...prev, createdClass]);
      setSelectedMemberClassId(createdClass.id);
      showMsg('success', `Created new guild class "${createdClass.name}" with custom color!`);
      setNewClassName('');
      setMemberSubView('roster');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to create class');
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
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to create item');
    } finally {
      setLoading(false);
    }
  };

  // Update Item Quantity in Active Auction (API helper)
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

      showMsg('success', `Finalized and updated item drop quantity to ${newQty}!`);

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

  // Finalize Item Allocation Quantity Handler with Non-Empty Validation
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

  // Toggle Intent to Buy (Submit or Remove Intent) with Non-Empty Validation
  const handleToggleIntent = async (auctionItemId: number, memberId: number) => {
    if (intentQuantityInput.trim() === '') {
      showMsg('error', 'Intent quantity text box cannot be empty upon finalization.');
      return;
    }
    const parsedQty = parseInt(intentQuantityInput, 10);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      showMsg('error', 'Please enter a valid positive quantity number for intent.');
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

  // Remove Intent to Buy Handler
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

  // Resolve Auction Item & Calculate Rank Movements
  const handleResolveItem = async (auctionItemId: number, itemId: number) => {
    const targetAuctionItem = activeAuction?.auction_items?.find((ai) => ai.id === auctionItemId);
    if (targetAuctionItem && targetAuctionItem.quantity <= 0) {
      showMsg('error', 'Cannot resolve item auction when current drop quantity is 0. Please set a drop quantity > 0 in Step 3 first.');
      return;
    }

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

      // Refresh active auction, allocation history & queue tables
      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
        if (updatedAuction && updatedAuction.id) {
          await fetchActiveAuctionHistory(updatedAuction.id);
        }
      }

      await fetchAllAuctions();
      fetchQueueAndHistory(itemId);
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to resolve item');
    } finally {
      setLoading(false);
    }
  };

  // Manual Finalize Raid Auction Handler
  const handleFinalizeAuction = async (auctionId: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/auctions/${auctionId}/finalize`, {
        method: 'POST',
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to finalize auction');
      }

      const activeRes = await fetch('/api/v1/auctions/active');
      if (activeRes.ok) {
        const updatedAuction = await activeRes.json();
        setActiveAuction(updatedAuction && updatedAuction.id ? updatedAuction : null);
      }

      await fetchAllAuctions();

      showMsg('success', 'Raid auction finalized and closed successfully!');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to finalize auction');
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
          class_id: selectedMemberClassId ? Number(selectedMemberClassId) : undefined,
          gvg_build: memberGvGBuild.trim(),
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
      setSelectedMemberClassId('');
      setMemberGvGBuild('');
      setMemberSubView('roster');
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

    const rankDiff = prevRank - currentRank;

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
      m.discord_id.toLowerCase().includes(memberSearchQuery.toLowerCase()) ||
      (m.class?.name && m.class.name.toLowerCase().includes(memberSearchQuery.toLowerCase())) ||
      (m.gvg_build && m.gvg_build.toLowerCase().includes(memberSearchQuery.toLowerCase()))
  );

  // Filter Members for Member List Page
  const filteredRosterMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(memberRosterSearchQuery.toLowerCase()) ||
      m.discord_id.toLowerCase().includes(memberRosterSearchQuery.toLowerCase()) ||
      (m.class?.name && m.class.name.toLowerCase().includes(memberRosterSearchQuery.toLowerCase())) ||
      (m.gvg_build && m.gvg_build.toLowerCase().includes(memberRosterSearchQuery.toLowerCase()))
  );

  const selectedMemberObj = members.find((m) => m.id === selectedMemberId);
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

  // Summary Pagination Item computation
  const summaryAuctionItems = activeAuction?.auction_items || [];
  const safeSummaryIndex = Math.max(0, Math.min(summaryItemIndex, summaryAuctionItems.length - 1));
  const currentSummaryAuctionItem = summaryAuctionItems[safeSummaryIndex];

  // History Auction Pagination & Object computation
  const selectedHistoryAuctionObj = (allAuctions && selectedHistoryAuctionId)
    ? allAuctions.find((a) => a.id === selectedHistoryAuctionId) || allAuctions[0]
    : allAuctions[0];

  const historyAuctionItems = selectedHistoryAuctionObj?.auction_items || [];
  const safeHistoryItemIndex = Math.max(0, Math.min(historyAuctionItemIndex, Math.max(0, historyAuctionItems.length - 1)));
  const currentHistoryAuctionItem = historyAuctionItems[safeHistoryItemIndex];

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
                  Select an option below to manage active raid drops or launch a new auction.
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
                2. Create New Auction
              </button>

              <button
                onClick={() => {
                  setAuctionSubView('history');
                  fetchAllAuctions();
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  auctionSubView === 'history'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <History className="w-3.5 h-3.5 text-purple-400" />
                3. Auction History
              </button>
            </div>
          </div>

          {/* 1. ACTIVE AUCTION SUB-VIEW */}
          {auctionSubView === 'active' && (
            <div className="space-y-6">
              {activeAuction ? (
                <div className="space-y-6">
                  {/* 5 SUB-PAGES NAVIGATION BAR FOR VIEWING ACTIVE AUCTION (1. Edit Items as very first tab) */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-2xl border border-slate-800 shadow-xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setActiveAuctionSubPage('edit')}
                        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all ${
                          activeAuctionSubPage === 'edit'
                            ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-slate-950 font-black shadow-md'
                            : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        1. Edit Auction Items
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

                    <div className="text-xs text-slate-400 font-bold px-2 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-purple-400" />
                      Raid Date: {new Date(activeAuction.auction_date).toLocaleDateString()}
                    </div>
                  </div>

                  {/* ACTIVE AUCTION SUB-PAGE 1: EDIT AUCTION ITEMS (VERY FIRST SUB-PAGE) */}
                  {activeAuctionSubPage === 'edit' && (
                    <div className="bg-slate-900/80 rounded-2xl border border-amber-500/30 p-6 space-y-6 shadow-xl max-w-3xl mx-auto">
                      <div className="pb-3 border-b border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Step 1: Edit Items in Running Active Auction
                        </span>
                        <h3 className="text-lg font-black text-slate-100 mt-1">
                          Manage Active Raid Drops ({activeAuction.title})
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Add new items from the catalog into this running auction or remove pending items.
                        </p>
                      </div>

                      {/* Add New Catalog Item to Running Auction */}
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

                      {/* Current Items Directory in Active Auction */}
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
                                  <div>
                                    <p className="text-xs text-slate-400 mt-0.5">{ai.item?.description}</p>
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

                  {/* ACTIVE AUCTION SUB-PAGE 2: INTENT TO BUY (MEMBER-CENTRIC WORKFLOW: MEMBER -> ITEM -> QUANTITY) */}
                  {activeAuctionSubPage === 'intent' && (
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Column: Primary Member Selection */}
                        <div className="lg:col-span-6 space-y-4">
                          <div className="bg-slate-900/80 rounded-2xl border border-purple-500/40 p-5 space-y-4 shadow-xl">
                            <div className="pb-3 border-b border-slate-800">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
                                Step 2: Member-Centric Intent
                              </span>
                              <h3 className="text-base font-black text-slate-100 mt-1">1. Select Guild Member</h3>
                              <p className="text-xs text-slate-400 mt-0.5">Search and select a member to manage their intents.</p>
                            </div>

                            {/* Member Search Input */}
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                              <input
                                type="text"
                                placeholder="Search member name, class, or discord..."
                                value={memberSearchQuery}
                                onChange={(e) => setMemberSearchQuery(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                              />
                            </div>

                            {/* Member Select Options Grid / List */}
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

                        {/* Right Column: Member's Target Item & Quantity Intent Submission */}
                        <div className="lg:col-span-6 space-y-6">
                          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl">
                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                              <UserCheck className="w-4 h-4 text-amber-400" />
                              2. Select Item & Quantity Intent
                            </h3>

                            {selectedMemberObj ? (
                              <div className="space-y-4">
                                {/* Selected Member Header Card */}
                                <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-500/40 flex items-center justify-between">
                                  <span className="text-xs font-bold text-slate-300">Selected Member:</span>
                                  {renderMemberBadge(selectedMemberObj.name, selectedMemberObj.class)}
                                </div>

                                {/* Select Item Dropdown */}
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

                                {/* Select Quantity (Allows Empty State) */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-300 block">Quantity Requested:</label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="number"
                                      min="1"
                                      placeholder="Qty"
                                      value={intentQuantityInput}
                                      onChange={(e) => setIntentQuantityInput(e.target.value)}
                                      className="w-24 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-black text-amber-400 focus:outline-none focus:border-purple-500 text-center shadow-inner"
                                    />
                                  </div>
                                </div>

                                {/* Submit / Update / Remove Intent Actions */}
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

                                {/* Registered Intents Overview for Selected Member */}
                                <div className="pt-3 border-t border-slate-800 space-y-2">
                                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">
                                    Registered Intents for {selectedMemberObj.name}:
                                  </span>
                                  <div className="space-y-1.5">
                                    {activeAuction.auction_items?.filter((ai) =>
                                      ai.intents?.some((intent) => intent.member_id === selectedMemberObj.id)
                                    ).length ? (
                                      activeAuction.auction_items
                                        ?.filter((ai) => ai.intents?.some((intent) => intent.member_id === selectedMemberObj.id))
                                        .map((ai) => {
                                          const memIntent = ai.intents?.find((i) => i.member_id === selectedMemberObj.id);
                                          const qtyNum = memIntent?.quantity !== undefined && memIntent.quantity > 0 ? memIntent.quantity : 1;
                                          return (
                                            <div
                                              key={ai.id}
                                              className="p-2.5 bg-slate-950/60 rounded-lg border border-slate-800 flex items-center justify-between text-xs"
                                            >
                                              <span className="font-bold text-slate-200">{ai.item?.name}</span>
                                              <span className="text-xs font-black text-emerald-300 bg-emerald-500/25 px-2.5 py-0.5 rounded-lg border border-emerald-500/50 shadow-sm flex items-center gap-1">
                                                <span className="text-[10px] font-extrabold uppercase text-emerald-400/80">Qty:</span>
                                                {qtyNum}
                                              </span>
                                            </div>
                                          );
                                        })
                                    ) : (
                                      <p className="text-xs text-slate-500 italic">No active intents registered yet for this member.</p>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500 italic py-6 text-center">
                                Select a guild member on the left to start setting item & quantity intents.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Summary of All Intents to Buy Per Item (Full Width Below) */}
                      <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <ListChecks className="w-5 h-5 text-purple-400" />
                            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-100">
                              Summary of All Intents to Buy Per Item ({activeAuction.auction_items?.length || 0} Items)
                            </h3>
                          </div>
                          <span className="text-xs text-slate-400">
                            Live candidate rosters and quantities per item drop
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {activeAuction.auction_items?.map((ai) => {
                            const candidates = ai.intents || [];
                            const totalUnitsRequested = candidates.reduce(
                              (sum, i) => sum + (i.quantity !== undefined && i.quantity > 0 ? i.quantity : 1),
                              0
                            );

                            return (
                              <div
                                key={ai.id}
                                className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-3 flex flex-col justify-between"
                              >
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between gap-2 flex-wrap">
                                    <h4 className="font-bold text-slate-100 text-sm flex items-center gap-1.5">
                                      <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                                      {ai.item?.name}
                                    </h4>
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm shrink-0 flex items-center gap-1">
                                        <span className="text-[10px] font-extrabold uppercase text-amber-400/80">Total:</span>
                                        {totalUnitsRequested}
                                      </span>
                                      <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                                        {candidates.length} Candidate{candidates.length !== 1 ? 's' : ''}
                                      </span>
                                    </div>
                                  </div>
                                  <p className="text-xs text-slate-400 line-clamp-1">{ai.item?.description}</p>
                                </div>

                                <div className="pt-2 border-t border-slate-800/80 space-y-2">
                                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                    Candidate Members & Requested Quantities:
                                  </span>

                                  {candidates.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                      {candidates.map((intent) => {
                                        const qtyVal = intent.quantity !== undefined && intent.quantity > 0 ? intent.quantity : 1;
                                        return (
                                          <React.Fragment key={intent.id}>
                                            {renderMemberBadge(
                                              intent.member?.name || `Member #${intent.member_id}`,
                                              intent.member?.class,
                                              <span className="text-xs font-black text-amber-300 bg-amber-500/30 px-2 py-0.5 rounded-lg border border-amber-500/60 shadow-md ml-1 inline-flex items-center">
                                                {qtyVal}
                                              </span>
                                            )}
                                          </React.Fragment>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <span className="text-xs text-slate-500 italic block py-1">
                                      No candidates registered for this item yet.
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ACTIVE AUCTION SUB-PAGE 3: ITEM ALLOCATION (QTY) WITH FINALIZE QTY BUTTON */}
                  {activeAuctionSubPage === 'allocation' && (
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl max-w-3xl mx-auto">
                      <div className="pb-3 border-b border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Step 3: Item Allocation / Drop Quantity
                        </span>
                        <h3 className="text-base font-black text-slate-100 mt-1">
                          Manage Actual Raid Drop Quantities
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Enter drop quantities (box can be cleared/empty while typing) and click <strong className="text-amber-300">Save</strong> to update.
                        </p>
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
                                <span className="text-xs font-bold text-slate-400">Drop Quantity:</span>
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

                  {/* ACTIVE AUCTION SUB-PAGE 4: ITEM AUCTION RESOLUTION */}
                  {activeAuctionSubPage === 'resolution' && (
                    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl max-w-3xl mx-auto">
                      <div className="pb-3 border-b border-slate-800">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                          Step 4: Item Auction Resolution
                        </span>
                        <h3 className="text-base font-black text-slate-100 mt-1">
                          Execute 3-Tier Priority Roll & Allocation
                        </h3>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Run the allocation algorithm to determine loot winners, update rankings, and rotate candidates to past winner status.
                        </p>
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

                  {/* ACTIVE AUCTION SUB-PAGE 5: AUCTION SUMMARY (1 ITEM = 1 PAGE PAGINATION) */}
                  {activeAuctionSubPage === 'summary' && (
                    <div className="bg-slate-900/80 rounded-2xl border border-amber-500/30 p-6 space-y-6 shadow-2xl max-w-4xl mx-auto">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Step 5: Auction Summary (1 Item = 1 Page)
                          </span>
                          <h3 className="text-lg font-black text-slate-100 mt-1">
                            Loot Winner Summary Breakdown
                          </h3>
                        </div>

                        {/* Summary Pagination Navigation Controls */}
                        {summaryAuctionItems.length > 0 && (
                          <div className="flex items-center gap-1 bg-slate-950 p-1.5 rounded-xl border border-slate-800 self-start sm:self-auto">
                            <button
                              onClick={() => setSummaryItemIndex((prev) => Math.max(0, prev - 1))}
                              disabled={safeSummaryIndex === 0}
                              className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg disabled:opacity-30 transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-extrabold text-purple-300 px-2 font-mono">
                              Item {safeSummaryIndex + 1} of {summaryAuctionItems.length}
                            </span>
                            <button
                              onClick={() => setSummaryItemIndex((prev) => Math.min(summaryAuctionItems.length - 1, prev + 1))}
                              disabled={safeSummaryIndex === summaryAuctionItems.length - 1}
                              className="p-1 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-lg disabled:opacity-30 transition-all"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Quick Item Tab Pills for Direct Jump by Name */}
                      <div className="flex flex-wrap gap-2">
                        {summaryAuctionItems.map((ai, index) => (
                          <button
                            key={ai.id}
                            onClick={() => setSummaryItemIndex(index)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                              safeSummaryIndex === index
                                ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                            }`}
                          >
                            {ai.item?.name}
                          </button>
                        ))}
                      </div>

                      {/* Single Item Full Page Card */}
                      {currentSummaryAuctionItem ? (
                        <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Trophy className="w-5 h-5 text-amber-400" />
                                <h3 className="text-xl font-black text-amber-300">{currentSummaryAuctionItem.item?.name}</h3>
                                <span
                                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                    currentSummaryAuctionItem.status === 'RESOLVED'
                                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  }`}
                                >
                                  {currentSummaryAuctionItem.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">{currentSummaryAuctionItem.item?.description}</p>
                            </div>

                            <div className="flex items-center gap-3 text-xs">
                              <div className="px-3 py-1.5 bg-slate-900 rounded-xl border border-slate-800 text-center">
                                <span className="text-[10px] font-extrabold uppercase text-slate-500 block">Total Dropped</span>
                                <span className="font-black text-amber-400 text-sm">{currentSummaryAuctionItem.quantity}</span>
                              </div>
                            </div>
                          </div>

                          {/* Winner Allocations List */}
                          <div className="space-y-3">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-2">
                              <Award className="w-4 h-4 text-emerald-400" />
                              Allocated Winner(s) for this Item:
                            </h4>

                            {(() => {
                              const itemAllocations = activeAuctionAllocationRecords.filter(
                                (h) => h.item_id === currentSummaryAuctionItem.item_id
                              );

                              if (itemAllocations.length > 0) {
                                return (
                                  <div className="bg-slate-900/80 rounded-xl border border-slate-800 overflow-hidden">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-slate-950 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                                          <th className="py-3 px-4">Winner Name</th>
                                          <th className="py-3 px-4">Discord ID</th>
                                          <th className="py-3 px-4">Qty Won</th>
                                          <th className="py-3 px-4 text-right">Allocated At</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                                        {itemAllocations.map((alloc) => (
                                          <tr key={alloc.id} className="hover:bg-slate-800/40 transition-colors">
                                            <td className="py-3 px-4">
                                              {renderMemberBadge(alloc.member_name, alloc.member_class, <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />)}
                                            </td>
                                            <td className="py-3 px-4 font-mono text-slate-400">{alloc.discord_id}</td>
                                            <td className="py-3 px-4 font-extrabold text-amber-400">{alloc.allocated_quantity}</td>
                                            <td className="py-3 px-4 font-mono text-slate-400 text-right">
                                              {new Date(alloc.allocated_at).toLocaleTimeString()}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                );
                              }

                              if (currentSummaryAuctionItem.status === 'RESOLVED' && currentSummaryAuctionItem.quantity === 0) {
                                return (
                                  <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-xs italic text-center">
                                    Item was resolved with 0 quantity drop (No winners allocated).
                                  </div>
                                );
                              }

                              return (
                                <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-slate-400 text-xs italic text-center">
                                  Pending resolution. Execute resolution on Step 4 tab to generate allocation winners.
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic p-6 text-center">
                          No items present in active auction.
                        </p>
                      )}
                    </div>
                  )}

                  {/* ACTIVE AUCTION SUB-PAGE 6: FINALIZE AUCTION */}
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
                          <p className="text-xs text-slate-400 mt-0.5">
                            Resolving each item drop allocates the item, but the overall auction remains ACTIVE until you manually finalize it here.
                          </p>
                        </div>

                        <span
                          className={`text-xs font-black px-3 py-1 rounded-full border ${
                            activeAuction.status === 'RESOLVED'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                              : 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                          }`}
                        >
                          Status: {activeAuction.status}
                        </span>
                      </div>

                      {/* Readiness Breakdown Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase text-slate-400 block">Total Items Drop</span>
                          <span className="text-lg font-black text-amber-400">
                            {activeAuction.auction_items?.length || 0} Items
                          </span>
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

                      {/* Notice & Directives */}
                      <div className="p-4 bg-slate-950/90 rounded-xl border border-slate-800 space-y-2">
                        <h4 className="text-xs font-black uppercase text-amber-400 flex items-center gap-1.5">
                          <Zap className="w-4 h-4 text-amber-400" />
                          Manual Finalization Directive:
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Clicking <strong className="text-emerald-400">"Finalize Raid Auction Now"</strong> below will officially set this raid auction to <span className="text-emerald-400 font-bold">RESOLVED</span> and archive all loot allocations. Resolving individual item auctions does not close the entire raid auction automatically.
                        </p>
                      </div>

                      {/* Finalize Action Button */}
                      {activeAuction.status !== 'RESOLVED' ? (
                        <button
                          onClick={() => handleFinalizeAuction(activeAuction.id)}
                          disabled={loading}
                          className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black rounded-xl text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all"
                        >
                          <CheckCircle2 className="w-5 h-5" />
                          Finalize Raid Auction Now
                        </button>
                      ) : (
                        <div className="p-4 bg-emerald-500/10 rounded-xl border border-emerald-500/30 text-center space-y-1">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                          <h4 className="text-sm font-black text-emerald-300">This Raid Auction is Officially Finalized!</h4>
                          <p className="text-xs text-slate-400">All item allocations are archived and logged in Auction History.</p>
                        </div>
                      )}
                    </div>
                  )}
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
                  Specify auction title, scheduled date, select loot items from catalog, and set initial drop quantities.
                </p>
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
                {/* Required Fields Notice */}
                <div className="p-3 bg-purple-500/10 rounded-xl border border-purple-500/20 text-xs text-purple-300 flex items-center justify-between shadow-sm">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                    <span>Please fill in all highlighted fields (<strong className="text-rose-400">* Required</strong>) before launching the raid auction.</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Auction Title Input */}
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

                  {/* Scheduled Auction Date Picker */}
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

                {/* Catalog Item Picker */}
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

                {/* Staged Draft Items Table */}
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
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="0"
                                  value={di.quantity}
                                  onChange={(e) => handleUpdateDraftQuantity(di.item_id, e.target.value)}
                                  className="w-20 bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-extrabold text-amber-400 focus:outline-none focus:border-purple-500 text-center"
                                />
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

          {/* 3. AUCTION HISTORY SUB-VIEW */}
          {auctionSubView === 'history' && (
            <div className="space-y-6">
              {/* Auction History Selector & Overview Banner */}
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
                    <p className="text-xs text-slate-400 mt-0.5">
                      Select any active or past resolved raid auction to inspect item drops, candidates, and allocation winners.
                    </p>
                  </div>

                  {/* Dropdown Selector for All Auctions */}
                  <div className="w-full md:w-80 space-y-1">
                    <label className="text-xs font-bold text-slate-300 block">Select Raid Auction:</label>
                    <select
                      value={selectedHistoryAuctionId || ''}
                      onChange={(e) => setSelectedHistoryAuctionId(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 font-bold focus:outline-none focus:border-purple-500 shadow-inner"
                    >
                      {allAuctions.map((auc) => (
                        <option key={auc.id} value={auc.id}>
                          {auc.title} ({new Date(auc.auction_date).toLocaleDateString()}) - [{auc.status}]
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {selectedHistoryAuctionObj ? (
                  <div className="space-y-6">
                    {/* Auction Header Stats Bar */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Raid Title</span>
                        <p className="text-sm font-black text-slate-100 truncate">{selectedHistoryAuctionObj.title}</p>
                      </div>
                      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Raid Date</span>
                        <p className="text-sm font-black text-purple-300">
                          {new Date(selectedHistoryAuctionObj.auction_date).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Auction Status</span>
                        <div>
                          <span
                            className={`text-xs font-extrabold px-2.5 py-0.5 rounded-full border ${
                              selectedHistoryAuctionObj.status === 'RESOLVED'
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                : selectedHistoryAuctionObj.status === 'ACTIVE'
                                ? 'bg-purple-500/20 text-purple-300 border-purple-500/30'
                                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            }`}
                          >
                            {selectedHistoryAuctionObj.status}
                          </span>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 space-y-1">
                        <span className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Total Items Drop</span>
                        <p className="text-sm font-black text-amber-400">
                          {selectedHistoryAuctionObj.auction_items?.length || 0} Items
                        </p>
                      </div>
                    </div>

                    {/* 1 ITEM = 1 PAGE AUCTION SUMMARY CAROUSEL VIEWER */}
                    {selectedHistoryAuctionObj.auction_items && selectedHistoryAuctionObj.auction_items.length > 0 ? (
                      <div className="space-y-4">
                        {/* Pagination Controls Header */}
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800">
                          <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5 text-amber-400" />
                            <div>
                              <h3 className="text-sm font-black uppercase text-slate-100">
                                Raid Drop Summary Page
                              </h3>
                              <p className="text-[10px] font-semibold text-slate-400">
                                1 Item per Page • Displaying Winners & Intent Breakdown
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setHistoryAuctionItemIndex((prev) => Math.max(0, prev - 1))}
                              disabled={safeHistoryItemIndex === 0}
                              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 disabled:opacity-40 transition-all"
                            >
                              <ChevronLeft className="w-4 h-4" />
                            </button>

                            <span className="text-xs font-black text-slate-300 px-3 py-1 bg-slate-900 rounded-md border border-slate-800 font-mono">
                              Item {safeHistoryItemIndex + 1} of {selectedHistoryAuctionObj.auction_items.length}
                            </span>

                            <button
                              onClick={() =>
                                setHistoryAuctionItemIndex((prev) =>
                                  Math.min((selectedHistoryAuctionObj.auction_items?.length || 1) - 1, prev + 1)
                                )
                              }
                              disabled={safeHistoryItemIndex >= selectedHistoryAuctionObj.auction_items.length - 1}
                              className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 disabled:opacity-40 transition-all"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Quick Item Tab Pills for Direct 1-Click Jump by Name */}
                        <div className="flex flex-wrap gap-2">
                          {selectedHistoryAuctionObj.auction_items.map((ai, index) => (
                            <button
                              key={ai.id}
                              onClick={() => setHistoryAuctionItemIndex(index)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                safeHistoryItemIndex === index
                                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                                  : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                              }`}
                            >
                              {ai.item?.name}
                            </button>
                          ))}
                        </div>

                        {/* Current Item Page Card */}
                        {currentHistoryAuctionItem && (
                          <div className="bg-slate-950/90 rounded-2xl border border-amber-500/30 p-6 space-y-6 shadow-2xl">
                            {/* Item Header Banner */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                              <div>
                                <span className="text-[10px] font-extrabold uppercase text-amber-400 tracking-wider">
                                  Item Drop #{safeHistoryItemIndex + 1}
                                </span>
                                <h4 className="text-lg font-black text-slate-100 flex items-center gap-2 mt-0.5">
                                  <Shield className="w-5 h-5 text-amber-400" />
                                  {currentHistoryAuctionItem.item?.name}
                                </h4>
                                <p className="text-xs text-slate-400 mt-1">{currentHistoryAuctionItem.item?.description}</p>
                              </div>

                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-black px-3 py-1 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
                                  Raid Quantity: {currentHistoryAuctionItem.quantity}
                                </span>
                                <span
                                  className={`text-xs font-black px-3 py-1 rounded-lg border ${
                                    currentHistoryAuctionItem.status === 'RESOLVED'
                                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                                      : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                  }`}
                                >
                                  {currentHistoryAuctionItem.status}
                                </span>
                              </div>
                            </div>

                            {/* Allocation Winners Section for this Item */}
                            <div className="space-y-3">
                              <h5 className="text-xs font-extrabold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                                <Award className="w-4 h-4 text-emerald-400" />
                                Allocated Winner(s) for this Item Drop:
                              </h5>

                              {historyAllocationRecords.filter((r) => r.item_id === currentHistoryAuctionItem.item_id).length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {historyAllocationRecords
                                    .filter((r) => r.item_id === currentHistoryAuctionItem.item_id)
                                    .map((winner) => (
                                      <div
                                        key={winner.id}
                                        className="p-3.5 bg-slate-900/90 rounded-xl border border-emerald-500/30 flex items-center justify-between shadow-lg"
                                      >
                                        <div className="flex items-center gap-2.5">
                                          <Crown className="w-4 h-4 text-amber-400 shrink-0" />
                                          <div>
                                            {renderMemberBadge(winner.member_name, winner.member_class)}
                                            <span className="text-[10px] text-slate-400 block mt-1">
                                              Allocated at: {new Date(winner.allocated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </span>
                                          </div>
                                        </div>
                                        <span className="text-xs font-black text-amber-300 bg-amber-500/25 px-2.5 py-1 rounded-lg border border-amber-500/40">
                                          Qty: {winner.allocated_quantity}
                                        </span>
                                      </div>
                                    ))}
                                </div>
                              ) : (
                                <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-center">
                                  <p className="text-xs text-slate-500 italic">No allocation winner recorded yet for this item drop.</p>
                                </div>
                              )}
                            </div>

                            {/* Candidates & Intents Section for this Item */}
                            <div className="pt-4 border-t border-slate-800 space-y-3">
                              <h5 className="text-xs font-extrabold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-purple-400" />
                                Candidate Intents Registered ({currentHistoryAuctionItem.intents?.length || 0}):
                              </h5>

                              {currentHistoryAuctionItem.intents && currentHistoryAuctionItem.intents.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {currentHistoryAuctionItem.intents.map((intent) => {
                                    const qVal = intent.quantity !== undefined && intent.quantity > 0 ? intent.quantity : 1;
                                    return (
                                      <React.Fragment key={intent.id}>
                                        {renderMemberBadge(
                                          intent.member?.name || `Member #${intent.member_id}`,
                                          intent.member?.class,
                                          <span className="text-xs font-black text-amber-300 bg-amber-500/30 px-2 py-0.5 rounded-lg border border-amber-500/60 shadow-md ml-1 inline-flex items-center">
                                            {qVal}
                                          </span>
                                        )}
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p className="text-xs text-slate-500 italic">No intents registered for this item during this auction.</p>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Page Selector Thumbnail Dots */}
                        <div className="flex items-center justify-center gap-1.5 pt-2">
                          {selectedHistoryAuctionObj.auction_items.map((ai, index) => (
                            <button
                              key={ai.id}
                              onClick={() => setHistoryAuctionItemIndex(index)}
                              className={`h-2.5 rounded-full transition-all ${
                                index === safeHistoryItemIndex
                                  ? 'w-8 bg-purple-500'
                                  : 'w-2.5 bg-slate-800 hover:bg-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center bg-slate-950/60 rounded-xl border border-slate-800 text-slate-500 italic">
                        No item drops found in this auction.
                      </div>
                    )}

                    {/* Full Allocation Table for Selected History Auction */}
                    <div className="pt-6 border-t border-slate-800 space-y-3">
                      <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <ListChecks className="w-4 h-4 text-purple-400" />
                        Complete Allocation History Log for {selectedHistoryAuctionObj.title}:
                      </h4>

                      {historyAllocationRecords.length > 0 ? (
                        <div className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-left text-xs text-slate-300">
                            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-extrabold">
                              <tr>
                                <th className="px-4 py-3">Item Name</th>
                                <th className="px-4 py-3">Winner Guild Member</th>
                                <th className="px-4 py-3 text-center">Allocated Qty</th>
                                <th className="px-4 py-3 text-right">Allocated Timestamp</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
                              {historyAllocationRecords.map((rec) => (
                                <tr key={rec.id} className="hover:bg-slate-800/30">
                                  <td className="px-4 py-3 font-bold text-slate-100 flex items-center gap-1.5">
                                    <Shield className="w-3.5 h-3.5 text-amber-400" />
                                    {rec.item_name}
                                  </td>
                                  <td className="px-4 py-3">
                                    {renderMemberBadge(rec.member_name, rec.member_class)}
                                  </td>
                                  <td className="px-4 py-3 text-center">
                                    <span className="font-black text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                                      {rec.allocated_quantity}
                                    </span>
                                  </td>
                                  <td className="px-4 py-3 text-right text-slate-400 text-[11px]">
                                    {new Date(rec.allocated_at).toLocaleString()}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-500 italic">No allocation logs recorded yet for this auction.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500 italic">
                    No raid auctions available in history yet.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      )}

      {/* PAGE 2: MEMBER LIST PAGE (3 DISTINCT SUB-PAGES: Member List, Add Member, Add Class) */}
      {activePage === 'members' && (
        <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6">
          {/* Sub-view Navigation Bar for Member Management Page */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  Guild Roster & Class Management Hub ({members.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Select a sub-page below to view member roster, add a new guild member, or create a character class.
                </p>
              </div>
            </div>

            {/* 3 Sub-View Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setMemberSubView('roster')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  memberSubView === 'roster'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                1. Member List ({members.length})
              </button>

              <button
                onClick={() => setMemberSubView('add_member')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  memberSubView === 'add_member'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                2. Add Member
              </button>

              <button
                onClick={() => setMemberSubView('add_class')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  memberSubView === 'add_class'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                3. Add Class ({classes.length})
              </button>
            </div>
          </div>

          {/* SUB-PAGE 1: MEMBER LIST DIRECTORY */}
          {memberSubView === 'roster' && (
            <section className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/80 p-4 rounded-2xl border border-slate-800">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-purple-400" />
                  Guild Member Directory ({members.length})
                </h3>

                {/* Search Member Filter */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search member, class, build..."
                    value={memberRosterSearchQuery}
                    onChange={(e) => setMemberRosterSearchQuery(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500 w-full sm:w-64"
                  />
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
                              <div className="flex items-center gap-2 flex-wrap">
                                {renderMemberBadge(mem.name, mem.class)}
                              </div>
                              <span className="text-xs text-slate-400 font-mono block mt-1">{mem.discord_id}</span>
                            </div>
                          </div>

                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400 shrink-0">
                            ID #{mem.id}
                          </span>
                        </div>

                        {/* GvG Build Spec Tag */}
                        {mem.gvg_build && (
                          <div className="p-2 bg-slate-950/60 rounded-xl border border-slate-800 flex items-center gap-2">
                            <Zap className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <div className="overflow-hidden">
                              <span className="text-[10px] text-slate-500 font-extrabold uppercase block">GvG Build Spec</span>
                              <span className="font-bold text-amber-300 text-xs truncate block">{mem.gvg_build}</span>
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-2 text-xs pt-1">
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
            </section>
          )}

          {/* SUB-PAGE 2: ADD MEMBER FORM */}
          {memberSubView === 'add_member' && (
            <section className="max-w-2xl mx-auto bg-slate-900/90 rounded-2xl border border-purple-500/30 p-6 space-y-6 shadow-2xl">
              <div className="pb-3 border-b border-slate-800">
                <h3 className="text-base font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-purple-400" />
                  Add New Guild Member
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Register a player into the guild roster, select their character class, and input their GvG build spec.
                </p>
              </div>

              <form onSubmit={handleCreateMember} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">Member Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. Thrall"
                      value={newMemberName}
                      onChange={(e) => setNewMemberName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
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
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  {/* Guild Class Selector */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 block">Guild Class:</label>
                      <button
                        type="button"
                        onClick={() => setMemberSubView('add_class')}
                        className="text-[11px] font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1"
                      >
                        + Create New Class
                      </button>
                    </div>
                    <select
                      value={selectedMemberClassId}
                      onChange={(e) => setSelectedMemberClassId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    >
                      <option value="">-- Select Character Class --</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* GvG Build Field */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 block">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      GvG Build Spec Note:
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Arms Mortal Strike / Frontline Bruiser"
                      value={memberGvGBuild}
                      onChange={(e) => setMemberGvGBuild(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMemberSubView('roster')}
                    className="px-5 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-purple-600/20 flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" />
                    Save Guild Member
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* SUB-PAGE 3: ADD CLASS FORM WITH COLOR PICKER */}
          {memberSubView === 'add_class' && (
            <section className="max-w-2xl mx-auto bg-slate-900/90 rounded-2xl border border-amber-500/30 p-6 space-y-6 shadow-2xl">
              <div className="pb-3 border-b border-slate-800">
                <h3 className="text-base font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-amber-400" />
                  Create New Guild Class
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Define a new character class for your guild and assign a unique color theme.
                </p>
              </div>

              <form onSubmit={handleCreateClass} className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 block">Class Name:</label>
                    <input
                      type="text"
                      placeholder="e.g. Death Knight, Monk, Demon Hunter"
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      required
                    />
                  </div>

                  {/* Class Color Picker & Swatches */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5 block">
                      <Palette className="w-3.5 h-3.5 text-purple-400" />
                      Class Color Theme:
                    </label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={newClassColor}
                        onChange={(e) => setNewClassColor(e.target.value)}
                        className="w-10 h-9 bg-slate-950 border border-slate-800 rounded-lg cursor-pointer p-0.5"
                      />
                      <input
                        type="text"
                        value={newClassColor}
                        onChange={(e) => setNewClassColor(e.target.value)}
                        className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-slate-200 focus:outline-none focus:border-purple-500 uppercase"
                      />
                    </div>
                  </div>
                </div>

                {/* Preset Color Swatches */}
                <div className="space-y-2">
                  <label className="text-[11px] font-extrabold uppercase text-slate-400 block">
                    Preset Swatches:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {COLOR_PRESETS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        onClick={() => setNewClassColor(preset.hex)}
                        className="px-2.5 py-1 rounded-lg text-[10px] font-extrabold border flex items-center gap-1.5 transition-all hover:scale-105"
                        style={{
                          backgroundColor: `${preset.hex}20`,
                          borderColor: `${preset.hex}60`,
                          color: preset.hex === '#FFFFFF' ? '#F8FAFC' : preset.hex,
                        }}
                      >
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.hex }} />
                        {preset.name}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setMemberSubView('roster')}
                    className="px-5 py-2.5 bg-slate-950 border border-slate-800 hover:bg-slate-800 text-slate-400 text-xs font-bold rounded-xl"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Save Guild Class
                  </button>
                </div>
              </form>

              {/* Existing Classes Directory Grid */}
              <div className="space-y-3 pt-4 border-t border-slate-800">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                  Existing Guild Classes in Registry ({classes.length}):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {classes.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl border flex items-center justify-between"
                      style={{
                        backgroundColor: `${c.color || '#A855F7'}15`,
                        borderColor: `${c.color || '#A855F7'}40`,
                      }}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color || '#A855F7' }} />
                        <span className="font-extrabold text-xs truncate" style={{ color: c.color === '#FFFFFF' ? '#F8FAFC' : c.color || '#A855F7' }}>
                          {c.name}
                        </span>
                      </div>
                      <span className="font-mono text-[9px] text-slate-500 uppercase">{c.color || '#A855F7'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </main>
      )}

      {/* PAGE 3: ITEMS HUB (3 DISTINCT SUB-PAGES: 1. Item List & Add Form, 2. Rank History, 3. Priority Queue) */}
      {activePage === 'items' && (
        <main className="max-w-7xl mx-auto px-4 md:px-8 mt-6 space-y-6">
          {/* Sub-view Navigation Bar for Items Page */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3">
              <Package className="w-5 h-5 text-purple-400 shrink-0" />
              <div>
                <h2 className="text-sm font-extrabold text-slate-100 uppercase tracking-wider">
                  Raid Items & Priority Console ({items.length})
                </h2>
                <p className="text-xs text-slate-400">
                  Select a sub-page below to view/add catalog items, inspect rank history matrices, or check live queue standings.
                </p>
              </div>
            </div>

            {/* 3 Sub-View Navigation Buttons */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                onClick={() => setItemSubView('list')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  itemSubView === 'list'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Package className="w-3.5 h-3.5" />
                1. Item List ({items.length})
              </button>

              <button
                onClick={() => setItemSubView('rank_history')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  itemSubView === 'rank_history'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                2. Rank History
              </button>

              <button
                onClick={() => setItemSubView('priority_queue')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-extrabold transition-all ${
                  itemSubView === 'priority_queue'
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <ListChecks className="w-3.5 h-3.5" />
                3. Priority Queue
              </button>
            </div>
          </div>

          {/* SUB-PAGE 1: ITEM LIST & CREATE / ADD NEW ITEM */}
          {itemSubView === 'list' && (
            <div className="space-y-6">
              {/* Create / Add Item Section */}
              <section className="bg-slate-900/90 rounded-2xl border border-purple-500/40 p-6 space-y-4 shadow-2xl">
                <div className="pb-3 border-b border-slate-800">
                  <h3 className="text-sm font-black text-slate-100 flex items-center gap-2">
                    <PlusCircle className="w-4 h-4 text-purple-400" />
                    Create / Add New Raid Item to Catalog
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Register a new raid drop into the global catalog so it can be added to auctions and queued by members.
                  </p>
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
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
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="repeatable_subpage"
                        checked={newItemRepeatable}
                        onChange={(e) => setNewItemRepeatable(e.target.checked)}
                        className="w-4 h-4 accent-purple-600 rounded"
                      />
                      <label htmlFor="repeatable_subpage" className="text-xs font-semibold text-slate-200 cursor-pointer">
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
              </section>

              {/* All Catalog Raid Items Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Package className="w-4 h-4 text-purple-400" />
                  Raid Items Directory ({items.length})
                </h3>

                <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4">Description</th>
                        <th className="py-3 px-4">Repeatable Drop</th>
                        <th className="py-3.5 px-4 text-right">Quick Actions</th>
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
                          <td className="py-3 px-4 text-right space-x-2">
                            <button
                              onClick={() => {
                                setSelectedQueueItemId(item.id);
                                setItemSubView('rank_history');
                              }}
                              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-purple-300 rounded-lg text-[11px] font-semibold"
                            >
                              Rank History
                            </button>
                            <button
                              onClick={() => {
                                setSelectedQueueItemId(item.id);
                                setItemSubView('priority_queue');
                              }}
                              className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-amber-300 rounded-lg text-[11px] font-semibold"
                            >
                              Priority Queue
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUB-PAGE 2: RANK HISTORY MATRIX */}
          {itemSubView === 'rank_history' && (
            <div className="space-y-6">
              {/* Item Selector Pills */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                  Select Raid Item to View Rank History Timeline Matrix:
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

              {/* RANK HISTORY MATRIX SECTION */}
              <section className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                    <Layers className="w-4.5 h-4.5 text-purple-400" />
                    Rank History Matrix (Ordered Ascendingly 1..N)
                  </h3>
                </div>

                {/* Player Selection / Highlight Toolbar */}
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
                  <div className="flex flex-wrap gap-2">
                    {members.map((mem) => {
                      const isSelected = selectedHighlightMemberId === mem.id;
                      return (
                        <button
                          key={mem.id}
                          onClick={() => setSelectedHighlightMemberId(isSelected ? null : mem.id)}
                          className="transition-all hover:scale-105"
                        >
                          {renderMemberBadge(
                            mem.name,
                            mem.class,
                            isSelected ? <Sparkles className="w-3 h-3 text-amber-400" /> : undefined
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Rank-Indexed Matrix Table (Ordered Ascendingly 1..N) */}
                <div className="bg-slate-900/80 rounded-2xl border border-slate-800 overflow-hidden shadow-xl space-y-3">
                  <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-purple-400" />
                      Chronological Auction Timeline (Left → Right)
                    </h4>
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
                              <th key={auc.id} className="py-3.5 px-6 border-r border-slate-800 text-center min-w-[200px]">
                                <span className="text-slate-200 block truncate max-w-[190px]">{auc.title}</span>
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
                          <th className="py-3.5 px-4 text-center bg-slate-950 min-w-[200px]">Current Live Rank</th>
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
                                      className="transition-all hover:scale-105"
                                    >
                                      {renderMemberBadge(
                                        snapshot.member_name,
                                        snapshot.member_class,
                                        isWinner ? <Trophy className="w-3 h-3 text-amber-400 shrink-0" /> : undefined
                                      )}
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
                                    className="transition-all hover:scale-105"
                                  >
                                    {renderMemberBadge(
                                      liveRanking.member_name || `Member #${liveRanking.member_id}`,
                                      liveRanking.member?.class,
                                      <span className="text-[10px] font-mono text-slate-400">#{liveRanking.rank}</span>
                                    )}
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
              </section>
            </div>
          )}

          {/* SUB-PAGE 3: PRIORITY QUEUE & WINNER HISTORY */}
          {itemSubView === 'priority_queue' && (
            <div className="space-y-6">
              {/* Item Selector Pills */}
              <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 space-y-3">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 block">
                  Select Raid Item to View Live Priority Queue Standings:
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

              {/* PRIORITY QUEUE SECTION */}
              <section className="space-y-4">
                <h3 className="text-sm font-black uppercase tracking-wider text-slate-100 flex items-center gap-2">
                  <ListChecks className="w-4.5 h-4.5 text-purple-400" />
                  Live Priority Queue & Winner Allocations
                </h3>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Live Priority Queue Rankings Table */}
                  <div className="lg:col-span-7 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <ListChecks className="w-4 h-4 text-purple-400" />
                      Live Priority Queue Rankings (1..M)
                    </h4>

                    <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
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
                                    <div className="flex items-center gap-2 flex-wrap">
                                      {renderMemberBadge(r.member_name || `Member #${r.member_id}`, r.member?.class)}
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">{r.discord_id}</span>
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

                  {/* Allocation Winner History */}
                  <div className="lg:col-span-5 space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-400" />
                      Allocation Winner History
                    </h4>

                    <div className="bg-slate-900/60 rounded-xl border border-slate-800 overflow-hidden shadow-xl">
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
                                <td className="py-3 px-4">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {renderMemberBadge(h.member_name, h.member_class, <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />)}
                                  </div>
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
              </section>
            </div>
          )}
        </main>
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
                  <div className="flex items-center gap-2">
                    {renderMemberBadge(selectedDetailMember.name, selectedDetailMember.class)}
                  </div>
                  <span className="text-xs text-slate-400 font-mono block mt-1">{selectedDetailMember.discord_id}</span>
                </div>
              </div>

              <button onClick={() => setSelectedDetailMember(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* GvG Build Details */}
            {selectedDetailMember.gvg_build && (
              <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[10px] font-extrabold uppercase text-amber-400 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> GvG Build Spec Note
                </span>
                <p className="text-xs font-semibold text-amber-200">{selectedDetailMember.gvg_build}</p>
              </div>
            )}

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
