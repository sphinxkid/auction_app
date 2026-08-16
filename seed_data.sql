-- Guild Loot Queue System - Seed Test Data
-- Includes ONLY: Guild Classes, Guild Members, and Raid Items Catalog.

-- ============================================================================
-- 1. GUILD CLASSES
-- ============================================================================
INSERT INTO guild_classes (id, name, color) VALUES
(1, 'Warrior', '#C79C6E'),
(2, 'Paladin', '#F58CBA'),
(3, 'Hunter', '#ABD473'),
(4, 'Rogue', '#FFF569'),
(5, 'Priest', '#FFFFFF'),
(6, 'Shaman', '#0070DE'),
(7, 'Mage', '#69CCF0'),
(8, 'Warlock', '#9482C9'),
(9, 'Druid', '#FF7D0A');

-- ============================================================================
-- 2. GUILD MEMBERS ROSTER
-- ============================================================================
INSERT INTO guild_members (id, name, discord_id, class_id, gvg_build) VALUES
(1, 'Aeloria', 'aeloria#0001', 7, 'Frost AOE Bomb / Control'),
(2, 'Vorn', 'vorn#0002', 1, 'Protection Main Tank / Frontline'),
(3, 'Kaelen', 'kaelen#0003', 4, 'Combat Daggers / Backline Assassin'),
(4, 'Sylas', 'sylas#0004', 5, 'Holy Dispel / Mass Healing'),
(5, 'Morrigan', 'morrigan#0005', 2, 'Holy Paladin / Divine Shield Spec'),
(6, 'Thalor', 'thalor#0006', 3, 'Marksman / Trueshot Aura Support'),
(7, 'Illidan', 'illidan#0007', 8, 'Demonology Meta / Chaos Flame Burst'),
(8, 'Arthas', 'arthas#0008', 2, 'Retribution / Frontline Burst'),
(9, 'Jaina', 'jaina#0009', 7, 'Arcane Fire Blast / Spell Burst'),
(10, 'Sylvanas', 'sylvanas#0010', 3, 'Sniper Burst / Viper Sting'),
(11, 'Tyrande', 'tyrande#0011', 5, 'Discipline Shield / Mana Burn'),
(12, 'Malfurion', 'malfurion#0012', 9, 'Restoration / HoT Support & Cyclone'),
(13, 'Vol''jin', 'voljin#0013', 6, 'Elemental Chain Lightning / Totem Support'),
(14, 'Baine', 'baine#0014', 1, 'Off-Tank / War Stomp CC'),
(15, 'Uther', 'uther#0015', 2, 'Aura Support / Blessing of Protection'),
(16, 'Khadgar', 'khadgar#0016', 7, 'Arcane Utility / Teleport Portal Support');

-- ============================================================================
-- 3. ITEMS CATALOG
-- ============================================================================
INSERT INTO items (id, name, description, is_repeatable) VALUES
(1, "Traveler's Note", 'Notes taken on the road. Used to upgrade Titles or fuse into advanced Title items.', 1),
(2, 'Adventure Fragment', "Precious notes from your expedictions. Used to upgrade Titles or fuse into advanced Title items. Breaks down into 4x Traveler's Note", 1),
(3, 'Adventure Journal', 'A compilation of insights from countless journeys. Used to upgrade Titles or fuse into advanced Title items. Breaks down into 4x Adventure Fragment.', 1),
(4, 'Pioneer Certificate', 'Pioneer Certificate', 1),
(5, 'Adv. Gem Choice Box', 'Adv. Gem Box', 1),
(6, 'Super Gem Choice Box', 'Super Gem Box', 1);
