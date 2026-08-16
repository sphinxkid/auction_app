package database

import (
	"log"

	"gorm.io/gorm"

	"guild-loot-system/internal/models"
)

// SeedDatabase seeds 5 guild members and 3 repeatable raid items idempotently.
func SeedDatabase(db *gorm.DB) error {
	log.Println("Checking database seed status...")

	// 1. Seed Guild Members
	var memberCount int64
	if err := db.Model(&models.GuildMember{}).Count(&memberCount).Error; err != nil {
		return err
	}

	if memberCount == 0 {
		members := []models.GuildMember{
			{Name: "Aegis Shieldwall", DiscordID: "aegis#0001"},
			{Name: "Nyx Shadowstep", DiscordID: "nyx#0002"},
			{Name: "Ignis Spellweaver", DiscordID: "ignis#0003"},
			{Name: "Valaria Lightbringer", DiscordID: "valaria#0004"},
			{Name: "Thoradin Ironfist", DiscordID: "thoradin#0005"},
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
				Name:         "Warcrown of the Fallen King",
				Description:  "Legendary plate helm forged in dragonflame with high strength and critical strike.",
				IsRepeatable: true,
			},
			{
				Name:         "Tome of Arcane Secrets",
				Description:  "Ancient grimoire infusing spellcasters with immense intellect and spell power.",
				IsRepeatable: true,
			},
			{
				Name:         "Shadowblade Dagger",
				Description:  "Agile swiftblade inflicting deadly venom and armor penetration.",
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
