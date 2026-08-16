import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Palette,
  Search,
  Plus,
  Shield,
  Clock,
  Sparkles
} from 'lucide-react';
import {
  Member,
  GuildClass,
  MemberSubView,
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

  // New Member Form State
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberDiscord, setNewMemberDiscord] = useState('');
  const [newMemberClassId, setNewMemberClassId] = useState<number | null>(null);
  const [newMemberBuild, setNewMemberBuild] = useState('');

  // New Class Form State
  const [newClassName, setNewClassName] = useState('');
  const [newClassColor, setNewClassColor] = useState('#C79C6E');

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
            {filteredRosterMembers.map((m) => (
              <div
                key={m.id}
                className="p-4 bg-slate-950/80 rounded-xl border border-slate-800/80 space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-2">
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
                </div>
              </div>
            ))}
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

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {classes.map((cls) => {
                const color = cls.color || '#A855F7';
                return (
                  <div
                    key={cls.id}
                    className="p-3 rounded-xl border flex items-center justify-between shadow-sm"
                    style={{
                      backgroundColor: `${color}20`,
                      borderColor: `${color}60`,
                    }}
                  >
                    <span className="font-extrabold text-xs" style={{ color: color }}>
                      {cls.name}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950/60 text-slate-300">
                      {color}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
