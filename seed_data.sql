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
(1, 'Primordial Essence', 'Concentrated elemental reagent used for crafting legendary raid gear.', 1),
(2, 'Dragon Scale', 'Hardened scale harvested from ancient drake bosses, ideal for plate & mail armor.', 1),
(3, 'Thunderfury, Blessed Blade of the Windseeker', 'Legendary sword imbued with tempest lightning power.', 1),
(4, 'Sulfuras, Hand of Ragnaros', 'Mighty elemental hammer forged in molten magma core.', 1),
(5, 'Ashkandi, Greatsword of the Red Dragonflight', 'Massive greatsword adorned with dragon head pommel.', 1),
(6, 'Drake Fang Talisman', 'Ancient talisman granting immense physical combat prowess.', 1),
(7, 'Netherwind Crown', 'Arcane tiara pulsating with ethereal nether energy.', 1),
(8, 'Staff of Domination', 'High sorcerer staff amplifying elemental spell power.', 1),
(9, 'Judgement Breastplate', 'Holy paladin armor radiating divine aura.', 1),
(10, 'Band of Accuria', 'Precision ring enhancing hit accuracy and critical striking.', 1);
