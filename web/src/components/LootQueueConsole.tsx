import React, { useState, useEffect } from 'react';
import {
  Shield,
  Swords,
  Crown,
  Users,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import {
  GuildClass,
  Member,
  Item,
  Auction,
  MainPage
} from '../types';
import { AuctionsConsole } from './AuctionsConsole';
import { ItemCatalogConsole } from './ItemCatalogConsole';
import { GuildRosterConsole } from './GuildRosterConsole';

export const LootQueueConsole: React.FC = () => {
  // Navigation Page State
  const [activePage, setActivePage] = useState<MainPage>('auctions');

  // Shared Data States
  const [classes, setClasses] = useState<GuildClass[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activeAuction, setActiveAuction] = useState<Auction | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
          color: color,
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {name}
        {extraSuffix}
      </span>
    );
  };

  const fetchClasses = async () => {
    try {
      const res = await fetch('/api/v1/classes');
      if (res.ok) {
        const data = await res.json();
        setClasses(data);
      }
    } catch (err) {
      console.error('Failed to fetch classes:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch('/api/v1/members');
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await fetch('/api/v1/items');
      if (res.ok) {
        const data = await res.json();
        setItems(data);
      }
    } catch (err) {
      console.error('Failed to fetch items:', err);
    }
  };

  const fetchActiveAuction = async () => {
    try {
      const res = await fetch('/api/v1/auctions/active');
      if (res.ok) {
        const data = await res.json();
        setActiveAuction(data && data.id ? data : null);
      } else {
        setActiveAuction(null);
      }
    } catch (err) {
      console.error('Failed to fetch active auction:', err);
      setActiveAuction(null);
    }
  };

  const fetchInitialData = async () => {
    setLoading(true);
    await Promise.all([fetchClasses(), fetchMembers(), fetchItems(), fetchActiveAuction()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 selection:bg-purple-500 selection:text-white font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* HEADER BRANDING BANNER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-xl shadow-lg shadow-purple-500/20 text-white">
                <Crown className="w-6 h-6" />
              </span>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-purple-400 via-amber-200 to-indigo-300 bg-clip-text text-transparent">
                  Guild Loot Queue & Priority Console
                </h1>
                <p className="text-xs text-slate-400 font-medium">
                  3-Tier Priority Queue, Live Auction Allocation, Intent Registry & Roster Management
                </p>
              </div>
            </div>
          </div>

          {/* MAIN PAGE NAVIGATION TABS */}
          <div className="flex items-center gap-2 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800 backdrop-blur-md shadow-xl">
            <button
              onClick={() => setActivePage('auctions')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activePage === 'auctions'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Swords className="w-4 h-4" />
              1. Raid Auctions
              {activeAuction && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse ml-0.5" />
              )}
            </button>

            <button
              onClick={() => setActivePage('items')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activePage === 'items'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Package className="w-4 h-4" />
              2. Priority Queue & Items
            </button>

            <button
              onClick={() => setActivePage('members')}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                activePage === 'members'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Users className="w-4 h-4" />
              3. Guild Roster & Classes
            </button>
          </div>
        </div>

        {/* NOTIFICATION MESSAGE TOAST */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-xs font-extrabold flex items-center justify-between shadow-xl transition-all ${
              message.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
                : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{message.text}</span>
            </div>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white ml-4 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* PAGE CONTENT SWITCHER */}
        {activePage === 'auctions' && (
          <AuctionsConsole
            activeAuction={activeAuction}
            setActiveAuction={setActiveAuction}
            items={items}
            members={members}
            loading={loading}
            setLoading={setLoading}
            showMsg={showMsg}
            renderMemberBadge={renderMemberBadge}
          />
        )}

        {activePage === 'items' && (
          <ItemCatalogConsole
            items={items}
            fetchItems={fetchItems}
            loading={loading}
            setLoading={setLoading}
            showMsg={showMsg}
            renderMemberBadge={renderMemberBadge}
          />
        )}

        {activePage === 'members' && (
          <GuildRosterConsole
            members={members}
            classes={classes}
            fetchMembers={fetchMembers}
            fetchClasses={fetchClasses}
            loading={loading}
            setLoading={setLoading}
            showMsg={showMsg}
            renderMemberBadge={renderMemberBadge}
          />
        )}
      </div>
    </div>
  );
};
