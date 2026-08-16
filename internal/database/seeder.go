package database

import (
	"log"

	"gorm.io/gorm"

	"guild-loot-system/internal/models"
)

// SeedDatabase seeds 6 guild members and 2 repeatable raid items idempotently.
func SeedDatabase(db *gorm.DB) error {
	log.Println("Checking database seed status...")

	// 1. Seed Guild Members
	var memberCount int64
	if err := db.Model(&models.GuildMember{}).Count(&memberCount).Error; err != nil {
		return err
	}

	if memberCount == 0 {
		members := []models.GuildMember{
			{Name: "Aeloria", DiscordID: "aeloria#0001"},
			{Name: "Vorn", DiscordID: "vorn#0002"},
			{Name: "Kaelen", DiscordID: "kaelen#0003"},
			{Name: "Sylas", DiscordID: "sylas#0004"},
			{Name: "Morrigan", DiscordID: "morrigan#0005"},
			{Name: "Thalor", DiscordID: "thalor#0006"},
		}

		if err := db.Create(&members).Error; err != nil {
			return err
		}
		log.Printf("Seeded %d guild members.", len(members))
	} else {
		log.Printf("Skipped member seeding: %d members already exist.", memberCount)
	}

	// 2. Seed Repeatable Raid Items
	items := []models.Item{
		{
			Name:         "Primordial Essence",
			Description:  "Concentrated elemental reagent used for crafting legendary raid gear.",
			IsRepeatable: true,
		},
		{
			Name:         "Dragon Scale",
			Description:  "Hardened scale harvested from ancient drake bosses, ideal for plate & mail armor.",
			IsRepeatable: true,
		},
		{
			Name:         "Thunderfury, Blessed Blade of the Windseeker",
			Description:  "Legendary sword imbued with tempest lightning power.",
			IsRepeatable: true,
		},
		{
			Name:         "Sulfuras, Hand of Ragnaros",
			Description:  "Mighty elemental hammer forged in molten magma core.",
			IsRepeatable: true,
		},
		{
			Name:         "Ashkandi, Greatsword of the Red Dragonflight",
			Description:  "Massive greatsword adorned with dragon head pommel.",
			IsRepeatable: true,
		},
		{
			Name:         "Drake Fang Talisman",
			Description:  "Ancient talisman granting immense physical combat prowess.",
			IsRepeatable: true,
		},
		{
			Name:         "Netherwind Crown",
			Description:  "Arcane tiara pulsating with ethereal nether energy.",
			IsRepeatable: true,
		},
		{
			Name:         "Staff of Domination",
			Description:  "High sorcerer staff amplifying elemental spell power.",
			IsRepeatable: true,
		},
		{
			Name:         "Judgement Breastplate",
			Description:  "Holy paladin armor radiating divine aura.",
			IsRepeatable: true,
		},
		{
			Name:         "Band of Accuria",
			Description:  "Precision ring enhancing hit accuracy and critical striking.",
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
