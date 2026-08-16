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
	var itemCount int64
	if err := db.Model(&models.Item{}).Count(&itemCount).Error; err != nil {
		return err
	}

	if itemCount == 0 {
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
		}

		if err := db.Create(&items).Error; err != nil {
			return err
		}
		log.Printf("Seeded %d repeatable raid items.", len(items))
	} else {
		log.Printf("Skipped item seeding: %d items already exist.", itemCount)
	}

	return nil
}
