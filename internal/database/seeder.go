package database

import (
	"errors"
	"log"

	"gorm.io/gorm"

	"guild-loot-system/internal/models"
)

// SeedDatabase seeds 6 guild members and 2 repeatable raid items idempotently.
func SeedDatabase(db *gorm.DB) error {
	log.Println("Checking database seed status...")

	// 0. Seed Guild Classes with Iconic Colors
	type DefaultClass struct {
		Name  string
		Color string
	}
	defaultClasses := []DefaultClass{
		{Name: "Warrior", Color: "#C79C6E"},
		{Name: "Paladin", Color: "#F58CBA"},
		{Name: "Hunter", Color: "#ABD473"},
		{Name: "Rogue", Color: "#FFF569"},
		{Name: "Priest", Color: "#FFFFFF"},
		{Name: "Shaman", Color: "#0070DE"},
		{Name: "Mage", Color: "#69CCF0"},
		{Name: "Warlock", Color: "#9482C9"},
		{Name: "Druid", Color: "#FF7D0A"},
	}
	classMap := make(map[string]uint)
	for _, c := range defaultClasses {
		var gc models.GuildClass
		err := db.Where("name = ?", c.Name).First(&gc).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			gc = models.GuildClass{Name: c.Name, Color: c.Color}
			if err := db.Create(&gc).Error; err != nil {
				return err
			}
		} else if err != nil {
			return err
		} else {
			if gc.Color == "" || gc.Color == "#A855F7" {
				db.Model(&gc).Update("color", c.Color)
			}
		}
		classMap[c.Name] = gc.ID
	}
	log.Printf("Verified/Seeded %d default guild classes with colors.", len(defaultClasses))

	// 1. Seed Guild Members
	warrID := classMap["Warrior"]
	palID := classMap["Paladin"]
	mageID := classMap["Mage"]
	priestID := classMap["Priest"]
	rogueID := classMap["Rogue"]
	huntID := classMap["Hunter"]
	shamanID := classMap["Shaman"]
	warlockID := classMap["Warlock"]
	druidID := classMap["Druid"]

	members := []models.GuildMember{
		{Name: "Aeloria", DiscordID: "aeloria#0001", ClassID: &mageID, GvGBuild: "Frost AOE Bomb / Control"},
		{Name: "Vorn", DiscordID: "vorn#0002", ClassID: &warrID, GvGBuild: "Protection Main Tank / Frontline"},
		{Name: "Kaelen", DiscordID: "kaelen#0003", ClassID: &rogueID, GvGBuild: "Combat Daggers / Backline Assassin"},
		{Name: "Sylas", DiscordID: "sylas#0004", ClassID: &priestID, GvGBuild: "Holy Dispel / Mass Healing"},
		{Name: "Morrigan", DiscordID: "morrigan#0005", ClassID: &palID, GvGBuild: "Holy Paladin / Divine Shield Spec"},
		{Name: "Thalor", DiscordID: "thalor#0006", ClassID: &huntID, GvGBuild: "Marksman / Trueshot Aura Support"},
		{Name: "Illidan", DiscordID: "illidan#0007", ClassID: &warlockID, GvGBuild: "Demonology Meta / Chaos Flame Burst"},
		{Name: "Arthas", DiscordID: "arthas#0008", ClassID: &palID, GvGBuild: "Retribution / Frontline Burst"},
		{Name: "Jaina", DiscordID: "jaina#0009", ClassID: &mageID, GvGBuild: "Arcane Fire Blast / Spell Burst"},
		{Name: "Sylvanas", DiscordID: "sylvanas#0010", ClassID: &huntID, GvGBuild: "Sniper Burst / Viper Sting"},
		{Name: "Tyrande", DiscordID: "tyrande#0011", ClassID: &priestID, GvGBuild: "Discipline Shield / Mana Burn"},
		{Name: "Malfurion", DiscordID: "malfurion#0012", ClassID: &druidID, GvGBuild: "Restoration / HoT Support & Cyclone"},
		{Name: "Vol'jin", DiscordID: "voljin#0013", ClassID: &shamanID, GvGBuild: "Elemental Chain Lightning / Totem Support"},
		{Name: "Baine", DiscordID: "baine#0014", ClassID: &warrID, GvGBuild: "Off-Tank / War Stomp CC"},
		{Name: "Uther", DiscordID: "uther#0015", ClassID: &palID, GvGBuild: "Aura Support / Blessing of Protection"},
		{Name: "Khadgar", DiscordID: "khadgar#0016", ClassID: &mageID, GvGBuild: "Arcane Utility / Teleport Portal Support"},
	}

	for _, m := range members {
		var memberRecord models.GuildMember
		err := db.Where("discord_id = ?", m.DiscordID).First(&memberRecord).Error
		if errors.Is(err, gorm.ErrRecordNotFound) {
			if err := db.Create(&m).Error; err != nil {
				return err
			}
		} else if err == nil {
			db.Model(&memberRecord).Updates(map[string]interface{}{
				"class_id":  m.ClassID,
				"gvg_build": m.GvGBuild,
			})
		} else {
			return err
		}
	}

	// Sweep check: Ensure any existing member missing a class gets assigned a random class
	var unclassedMembers []models.GuildMember
	if err := db.Where("class_id IS NULL OR class_id = 0").Find(&unclassedMembers).Error; err == nil && len(unclassedMembers) > 0 {
		var allClasses []models.GuildClass
		if err := db.Find(&allClasses).Error; err == nil && len(allClasses) > 0 {
			for i, m := range unclassedMembers {
				cls := allClasses[i%len(allClasses)]
				db.Model(&m).Update("class_id", cls.ID)
			}
		}
	}

	log.Printf("Verified/Seeded 16 guild members with assigned class colors in roster.")

	// 2. Seed Repeatable Raid Items
	items := []models.Item{
		{
			Name:         "Traveler's Note",
			Description:  "Notes taken on the road. Used to upgrade Titles or fuse into advanced Title items.",
			IsRepeatable: true,
		},
		{
			Name:         "Adventure Fragment",
			Description:  "Precious notes from your expedictions. Used to upgrade Titles or fuse into advanced Title items. Breaks down into 4x Traveler's Note",
			IsRepeatable: true,
		},
		{
			Name:         "Adventure Journal",
			Description:  "A compilation of insights from countless journeys. Used to upgrade Titles or fuse into advanced Title items. Breaks down into 4x Adventure Fragment.",
			IsRepeatable: true,
		},
		{
			Name:         "Pioneer Certificate",
			Description:  "Pioneer Certificate",
			IsRepeatable: true,
		},
		{
			Name:         "Adv. Gem Choice Box",
			Description:  "Adv. Gem Box",
			IsRepeatable: true,
		},
		{
			Name:         "Super Gem Choice Box",
			Description:  "Super Gem Box",
			IsRepeatable: true,
		},
	}

	seededCount := 0
	for _, item := range items {
		var existing models.Item
		if err := db.Where("name = ?", item.Name).FirstOrCreate(&existing, item).Error; err != nil {
			return err
		}
		seededCount++
	}
	log.Printf("Verified/Seeded %d raid items in catalog.", seededCount)

	return nil
}
