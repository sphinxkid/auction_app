import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Palette,
  Search,
  Plus,
  Shield,
  Clock,
  Sparkles,
  Edit3,
  X,
  CheckCircle2,
  Trophy,
  Package,
  History,
  Calendar
} from 'lucide-react';
import {
  Member,
  GuildClass,
  MemberSubView,
  AllocationHistoryItem,
  COLOR_PRESETS
} from '../types';

interface GuildRosterConsoleProps {
  members: Member[];
  classes: GuildClass[];
  fetchMembers: () => Promise<void>;
  fetchClasses: () => Promise<void>;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showMsg: (type: 'success' | 'error', text: string) => void;
  renderMemberBadge: (name: string, guildClass?: GuildClass, extraSuffix?: React.ReactNode) => React.ReactNode;
}

export const GuildRosterConsole: React.FC<GuildRosterConsoleProps> = ({
  members,
  classes,
  fetchMembers,
  fetchClasses,
  loading,
  setLoading,
  showMsg,
  renderMemberBadge,
}) => {
  const [memberSubView, setMemberSubView] = useState<MemberSubView>('roster');
  const [rosterSearchQuery, setRosterSearchQuery] = useState('');

  // Items Won History State per Member
  const [memberHistories, setMemberHistories] = useState<{ [memberId: number]: AllocationHistoryItem[] }>({});
  const [viewingHistoryMember, setViewingHistoryMember] = useState<Member | null>(null);

  // New Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDiscord, setNewMemberDiscord] = useState('');
  const [newMemberClassId, setNewMemberClassId] = useState<number | null>(null);
  const [newMemberBuild, setNewMemberBuild] = useState('');

  // Edit Member Modal State
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberDiscord, setEditMemberDiscord] = useState('');
  const [editMemberClassId, setEditMemberClassId] = useState<number | null>(null);
  const [editMemberBuild, setEditMemberBuild] = useState('');

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#C79C6E');

  // Edit Class Modal State
  const [editingClass, setEditingClass] = useState<GuildClass | null>(null);
  const [editClassName, setEditClassName] = useState('');
  const [editClassColor, setEditClassColor] = useState('#A855F7');

  // Fetch items won history for all members
  const fetchAllMembersHistory = async () => {
    if (!members || members.length === 0) return;
    try {
      const historyPromises = members.map(async (m) => {
        const res = await fetch(`/api/v1/history/members/${m.id}`);
        if (res.ok) {
          const records: AllocationHistoryItem[] = await res.json();
          return { memberId: m.id, records };
        }
        return { memberId: m.id, records: [] };
      });

      const results = await Promise.all(historyPromises);
      const historyMap: { [memberId: number]: AllocationHistoryItem[] } = {};
      results.forEach((r) => {
        historyMap[r.memberId] = r.records;
      });
      setMemberHistories(historyMap);
    } catch (err) {
      console.error('Failed to fetch members allocation history:', err);
    }
  };

  useEffect(() => {
    fetchAllMembersHistory();
  }, [members]);

  const filteredRosterMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(rosterSearchQuery.toLowerCase()) ||
      m.discord_id.toLowerCase().includes(rosterSearchQuery.toLowerCase()) ||
      (m.class?.name && m.class.name.toLowerCase().includes(rosterSearchQuery.toLowerCase())) ||
      (m.gvg_build && m.gvg_build.toLowerCase().includes(rosterSearchQuery.toLowerCase()))
  );

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberDiscord.trim()) {
      showMsg('error', 'Name and Discord ID are required.');
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
          class_id: newMemberClassId ? newMemberClassId : undefined,
          gvg_build: newMemberBuild.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create member');
      }

      showMsg('success', `Guild Member "${newMemberName}" registered successfully!`);
      setNewMemberName('');
      setNewMemberDiscord('');
      setNewMemberBuild('');
      await fetchMembers();
      setMemberSubView('roster');
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to register member');
    } finally {
      setLoading(false);
    }
  };

  const openEditMemberModal = (m: Member) => {
    setEditingMember(m);
    setEditMemberName(m.name);
    setEditMemberDiscord(m.discord_id);
    setEditMemberClassId(m.class_id || null);
    setEditMemberBuild(m.gvg_build || '');
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;
    if (!editMemberName.trim() || !editMemberDiscord.trim()) {
      showMsg('error', 'Name and Discord ID are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/members/${editingMember.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editMemberName.trim(),
          discord_id: editMemberDiscord.trim(),
          class_id: editMemberClassId ? editMemberClassId : undefined,
          gvg_build: editMemberBuild.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update member');
      }

      showMsg('success', `Guild Member "${editMemberName}" updated successfully!`);
      setEditingMember(null);
      await fetchMembers();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to update member');
    } finally {
      setLoading(false);
    }
  };

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

      showMsg('success', `Guild Class "${newClassName}" registered with color ${newClassColor}!`);
      setNewClassName('');
      await fetchClasses();
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const openEditClassModal = (cls: GuildClass) => {
    setEditingClass(cls);
    setEditClassName(cls.name);
    setEditClassColor(cls.color || '#A855F7');
  };

  const handleUpdateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClass) return;
    if (!editClassName.trim()) {
      showMsg('error', 'Class Name is required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/v1/classes/${editingClass.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editClassName.trim(),
          color: editClassColor,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update class');
      }

      showMsg('success', `Guild Class "${editClassName}" updated successfully!`);
      setEditingClass(null);
      await Promise.all([fetchClasses(), fetchMembers()]);
    } catch (err: any) {
      showMsg('error', err.message || 'Failed to update class');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* GUILD ROSTER SUB-NAVIGATION BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-900/60 rounded-2xl border border-slate-800 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMemberSubView('roster')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              memberSubView === 'roster'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            1. Guild Roster Members ({members.length})
          </button>

          <button
            onClick={() => setMemberSubView('add_member')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              memberSubView === 'add_member'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <UserPlus className="w-4 h-4 text-emerald-400" />
            2. Register Member
          </button>

          <button
            onClick={() => setMemberSubView('add_class')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
              memberSubView === 'add_class'
                ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Palette className="w-4 h-4 text-amber-400" />
            3. Classes & Swatches ({classes.length})
          </button>
        </div>
      </div>

      {/* 1. GUILD ROSTER MEMBERS SUB-VIEW */}
      {memberSubView === 'roster' && (
        <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20">
                Guild Roster
              </span>
              <h2 className="text-xl font-black text-slate-100 mt-1 flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-400" />
                Guild Roster Members Directory
              </h2>
            </div>

            <div className="relative w-full md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search roster..."
                value={rosterSearchQuery}
                onChange={(e) => setRosterSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredRosterMembers.map((m) => {
              const wonRecords = memberHistories[m.id] || [];
              const totalQuantityWon = wonRecords.reduce((sum, r) => sum + r.allocated_quantity, 0);

              return (
                <div
                  key={m.id}
                  className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      {renderMemberBadge(m.name, m.class)}
                      <span className="text-xs text-slate-400 font-mono">#{m.id}</span>
                    </div>

                    <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
                      <span className="text-slate-500">Discord:</span> {m.discord_id}
                    </p>

                    {m.gvg_build && (
                      <div className="p-2 bg-slate-900/60 rounded-lg border border-slate-800 text-[11px] text-purple-300">
                        <strong className="text-slate-400 block text-[10px] uppercase">GvG Build:</strong>
                        {m.gvg_build}
                      </div>
                    )}

                    {/* ITEMS WON HISTORY SUMMARY ON MEMBER CARD */}
                    <div className="p-3 bg-slate-900/90 rounded-xl border border-amber-500/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <Trophy className="w-3.5 h-3.5 text-amber-400" />
                          Items Won ({wonRecords.length})
                        </span>
                        <span className="text-[10px] font-black text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          Total Qty: {totalQuantityWon}
                        </span>
                      </div>

                      {wonRecords.length > 0 ? (
                        <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                          {wonRecords.slice(0, 3).map((rec) => (
                            <div
                              key={rec.id}
                              className="p-1.5 bg-slate-950 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]"
                            >
                              <span className="font-bold text-slate-200 truncate max-w-[130px]" title={rec.item_name}>
                                {rec.item_name}
                              </span>
                              <span className="font-mono text-amber-300 text-[10px]">
                                x{rec.allocated_quantity}
                              </span>
                            </div>
                          ))}
                          {wonRecords.length > 3 && (
                            <button
                              onClick={() => setViewingHistoryMember(m)}
                              className="w-full text-center text-[10px] font-bold text-purple-400 hover:text-purple-300 pt-0.5"
                            >
                              + {wonRecords.length - 3} more item(s)...
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">No loot items won yet.</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <button
                      onClick={() => setViewingHistoryMember(m)}
                      className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Trophy className="w-3.5 h-3.5 text-amber-400" />
                      View Won Items ({wonRecords.length})
                    </button>

                    <button
                      onClick={() => openEditMemberModal(m)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-purple-300 border border-purple-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-purple-400" />
                      Edit Member
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. REGISTER MEMBER SUB-VIEW */}
      {memberSubView === 'add_member' && (
        <div className="max-w-2xl mx-auto bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Register Member
            </span>
            <h2 className="text-xl font-black text-slate-100 mt-1 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-400" />
              Register New Guild Member
            </h2>
          </div>

          <form onSubmit={handleCreateMember} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Member Name:
              </label>
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="e.g. Arthas"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Discord Tag:
              </label>
              <input
                type="text"
                value={newMemberDiscord}
                onChange={(e) => setNewMemberDiscord(e.target.value)}
                placeholder="e.g. arthas#0008"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Assigned Guild Class:
              </label>
              <select
                value={newMemberClassId || ''}
                onChange={(e) => setNewMemberClassId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              >
                <option value="">-- Select Class --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                GvG / Spec Build Description:
              </label>
              <input
                type="text"
                value={newMemberBuild}
                onChange={(e) => setNewMemberBuild(e.target.value)}
                placeholder="e.g. Retribution / Frontline Burst"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20"
            >
              Register Guild Member
            </button>
          </form>
        </div>
      )}

      {/* 3. CLASSES & SWATCHES SUB-VIEW */}
      {memberSubView === 'add_class' && (
        <div className="space-y-6 max-w-3xl mx-auto">
          {/* Create New Class Form */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <Palette className="w-5 h-5 text-amber-400" />
              Register New Guild Class & Swatch Color
            </h3>

            <form onSubmit={handleCreateClass} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    Class Name:
                  </label>
                  <input
                    type="text"
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="e.g. Death Knight"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                    HEX Color Code:
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={newClassColor}
                      onChange={(e) => setNewClassColor(e.target.value)}
                      className="w-10 h-9 bg-slate-950 border border-slate-800 rounded-lg p-0.5 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={newClassColor}
                      onChange={(e) => setNewClassColor(e.target.value)}
                      className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                    />
                  </div>
                </div>
              </div>

              {/* Color Presets Picker */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Preset Class Color Swatches:
                </span>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setNewClassColor(preset.hex)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${preset.hex}25`,
                        borderColor: preset.hex,
                        color: preset.hex,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.hex }} />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20"
              >
                Register Guild Class
              </button>
            </form>
          </div>

          {/* Registered Classes Directory */}
          <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-extrabold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-400" />
              Registered Guild Classes ({classes.length})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {classes.map((cls) => {
                const color = cls.color || '#A855F7';
                return (
                  <div
                    key={cls.id}
                    className="p-3.5 rounded-xl border flex items-center justify-between shadow-sm"
                    style={{
                      backgroundColor: `${color}20`,
                      borderColor: `${color}60`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                      <span className="font-extrabold text-xs" style={{ color: color }}>
                        {cls.name}
                      </span>
                    </div>

                    <button
                      onClick={() => openEditClassModal(cls)}
                      className="px-2.5 py-1 bg-slate-950/80 hover:bg-slate-900 text-slate-200 border border-slate-700/80 rounded-lg text-[10px] font-extrabold flex items-center gap-1 transition-all"
                    >
                      <Edit3 className="w-3 h-3 text-amber-400" />
                      Edit
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ITEMS WON HISTORY MODAL PER MEMBER */}
      {viewingHistoryMember && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-2xl w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-slate-100">
                  Loot Won History for {viewingHistoryMember.name}
                </h3>
              </div>
              <button
                onClick={() => setViewingHistoryMember(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div className="flex items-center gap-2">
                  {renderMemberBadge(viewingHistoryMember.name, viewingHistoryMember.class)}
                  <span className="text-xs text-slate-400 font-mono">({viewingHistoryMember.discord_id})</span>
                </div>
                <span className="text-xs font-black text-amber-300 bg-amber-500/20 px-3 py-1 rounded-full border border-amber-500/40">
                  Total Items Won: {(memberHistories[viewingHistoryMember.id] || []).length}
                </span>
              </div>

              {(memberHistories[viewingHistoryMember.id] || []).length > 0 ? (
                <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden max-h-80 overflow-y-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-slate-400 font-semibold uppercase">
                        <th className="py-3 px-4">Item Name</th>
                        <th className="py-3 px-4 text-center">Allocated Qty</th>
                        <th className="py-3 px-4">Raid Auction</th>
                        <th className="py-3 px-4 text-right">Date Won</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 text-slate-200">
                      {(memberHistories[viewingHistoryMember.id] || []).map((rec) => (
                        <tr key={rec.id} className="hover:bg-slate-900/40">
                          <td className="py-3 px-4 font-bold text-amber-300 flex items-center gap-2">
                            <Package className="w-4 h-4 text-amber-400 shrink-0" />
                            {rec.item_name}
                          </td>
                          <td className="py-3 px-4 text-center font-black text-purple-300">
                            x{rec.allocated_quantity}
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-medium">
                            {rec.auction_title}
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-400 text-[11px]">
                            {new Date(rec.allocated_at).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-8 text-center border border-dashed border-slate-800 rounded-xl">
                  This guild member has not won any loot items yet.
                </p>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setViewingHistoryMember(null)}
                className="px-5 py-2 bg-slate-950 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MEMBER MODAL */}
      {editingMember && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-lg font-black text-slate-100">
                  Edit Guild Member ({editingMember.name})
                </h3>
              </div>
              <button
                onClick={() => setEditingMember(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Member Name:
                </label>
                <input
                  type="text"
                  value={editMemberName}
                  onChange={(e) => setEditMemberName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Discord Tag:
                </label>
                <input
                  type="text"
                  value={editMemberDiscord}
                  onChange={(e) => setEditMemberDiscord(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Assigned Guild Class:
                </label>
                <select
                  value={editMemberClassId || ''}
                  onChange={(e) => setEditMemberClassId(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select Class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  GvG / Spec Build Description:
                </label>
                <input
                  type="text"
                  value={editMemberBuild}
                  onChange={(e) => setEditMemberBuild(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMember(null)}
                  className="px-4 py-2.5 bg-slate-950 text-slate-400 hover:text-white rounded-xl text-xs font-bold border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-purple-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Save Member Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CLASS MODAL */}
      {editingClass && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-lg w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-amber-400" />
                <h3 className="text-lg font-black text-slate-100">
                  Edit Guild Class ({editingClass.name})
                </h3>
              </div>
              <button
                onClick={() => setEditingClass(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateClass} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  Class Name:
                </label>
                <input
                  type="text"
                  value={editClassName}
                  onChange={(e) => setEditClassName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                  HEX Color Code:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={editClassColor}
                    onChange={(e) => setEditClassColor(e.target.value)}
                    className="w-10 h-9 bg-slate-950 border border-slate-800 rounded-lg p-0.5 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={editClassColor}
                    onChange={(e) => setEditClassColor(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Color Presets Picker */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Preset Class Color Swatches:
                </span>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.hex}
                      type="button"
                      onClick={() => setEditClassColor(preset.hex)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold border transition-all flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${preset.hex}25`,
                        borderColor: preset.hex,
                        color: preset.hex,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: preset.hex }} />
                      {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingClass(null)}
                  className="px-4 py-2.5 bg-slate-950 text-slate-400 hover:text-white rounded-xl text-xs font-bold border border-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-slate-950" />
                  Save Class Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
