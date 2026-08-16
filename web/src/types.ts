export interface GuildClass {
  id: number;
  name: string;
  color?: string;
}

export interface Member {
  id: number;
  name: string;
  discord_id: string;
  class_id?: number;
  class?: GuildClass;
  gvg_build?: string;
  created_at: string;
}

export interface Item {
  id: number;
  name: string;
  description: string;
  is_repeatable: boolean;
}

export interface IntentToBuy {
  id: number;
  auction_item_id: number;
  member_id: number;
  quantity?: number;
  submitted_at: string;
  member?: Member;
}

export interface AuctionItem {
  id: number;
  auction_id: number;
  item_id: number;
  quantity: number;
  status: 'PENDING' | 'RESOLVED';
  resolved_at?: string;
  item?: Item;
  intents?: IntentToBuy[];
}

export interface Auction {
  id: number;
  title: string;
  status: 'ACTIVE' | 'RESOLVED';
  auction_date: string;
  created_ts?: string;
  auction_items: AuctionItem[];
}

export interface QueueRanking {
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

export interface AllocationHistoryItem {
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

export interface ItemResolutionResult {
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

export interface ItemRankHistoryItem {
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

export type MainPage = 'auctions' | 'members' | 'items';
export type AuctionSubView = 'active' | 'create' | 'history';
export type ActiveAuctionSubPage = 'edit' | 'intent' | 'allocation' | 'resolution' | 'summary' | 'finalize';
export type MemberSubView = 'roster' | 'add_member' | 'add_class';
export type ItemSubView = 'list' | 'rank_history' | 'priority_queue';

export interface DraftAuctionItem {
  item_id: number;
  item_name: string;
  quantity: string;
}

export const COLOR_PRESETS = [
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
