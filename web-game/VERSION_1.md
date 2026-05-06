# Wela RPG — Version 1

**Frappe Text Adventure RPG** is a browser-first RPG you play in a single tab: a journal-style adventure with gear-driven combat, shops, regions to explore, and optional duels against another player.

Version 1 is the full first slice of that vision — deep enough to sink into, honest about what’s still growing, and built for people who like numbers that matter, loot that stacks, and one more fight before resting at the inn.

---

## Why play Version 1?

- **Your kit is your build.** There are no fixed classes. Each piece of gear teaches you one combat technique. Stats and innate gifts decide what you’re allowed to wear — grow stronger to unlock heavier kits.
- **Regions, not menus.** Pick an expedition region and chain fights there. Boss odds climb as you rack up wins (especially in the deeper zones). Rest at the inn or go home when you want a fresh map.
- **Loot feels like loot.** Gold and XP drop from fights; monsters drop salvage and sometimes armor. Sell junk at the merchant, repair broken gear at the blacksmith, and chase boss relics in the hardest areas.
- **Combat has consequences.** Skills cost mana and stamina; striking with a piece wears its durability. Status effects matter: burns and poisons tick down over turns, shields absorb blows, stuns can steal your turn — for you *and* for your foes.

---

## Getting started

1. Open the game in a modern browser (Chrome, Firefox, Edge, Safari).
2. Choose a **save slot** — each adventurer keeps their own progress on this device.
3. Name your hero and step into the world.

Your character wakes with a **free traveler’s kit** (several slots already filled) so you can fight immediately. Read the journal messages as you go; they explain shops, equipment, and expedition rules.

---

## What you’ll do in Version 1

| Activity | What it’s about |
|----------|------------------|
| **World map & expeditions** | Travel to a region, fight encounters, earn gold and XP. Commit to one region per outing until you rest or return home. |
| **Combat** | Pick techniques from equipped gear. Manage HP, mana, stamina, and watch **status effects** on you and the enemy. |
| **Shop** | Buy tonics, permanent upgrades (vitality, striking, arcana, endurance), stat tomes (+STR / AGI / INT), and new gear. |
| **Equipment** | Equip from your pack, meet stat requirements, and watch durability when you use a skill tied to that piece. |
| **Blacksmith** | Repair worn gear so those skills stay available. |
| **Salvage** | Stack mob junk and gear spares; sell what you don’t need. |
| **Multiplayer hub** | Host or join with a **room code**, then duel in **PvP**: each exchange starts with **Rock–Paper–Scissors**; on a **tie**, a **coin flip** decides who may strike. Winner picks a gear technique; **first to the low HP threshold loses** (rubber-band duel — no running). |

---

## Tips for enjoying Version 1

- Read **recommended levels** on regions before diving in — harsh zones warn you, but brave (or foolish) heroes can still try.
- **Repair before critical fights** if your main-hand skill is tied to a fragile piece.
- **Tonics** (red / blue / green) matter in longer expeditions — stock up at the merchant.
- **Status effects** appear on your HUD during fights (“On you” / “On foe”). Learn which monsters apply what — it changes how aggressive you can be.
- **PvP duels:** You’ll **clash** with R–P–S every exchange before anyone attacks; ties go to a coin flip (resolved on the host’s machine and synced to both players). Shields, buffs, debuffs, and **stun** still apply in the duel — win the clash, then strike. Both players need the **PeerJS / signaling** setup the host uses (see development docs). PvP is optional; the solo game is complete without it.

---

## Version 1 scope (honest snapshot)

**Included:** Solo progression, multiple regions, gear catalog and shops, durability and repair, salvage economy, boss-flavored drops, save slots, journal UI, combat with buffs/debuffs and turn-loss stuns, **peer-based PvP** with **Rock–Paper–Scissors + coin-flip** clash rounds and clash/hit feedback when networking is available.

**Not promised in this doc:** Balance patches, new regions or classes, cloud saves, or mobile-native layouts — unless a future version says so.

---

## Thank you for playing

Version 1 exists so you can **read** the story in the journal, **like** how your build comes together from gear and stats, and **play** one more encounter before calling it a night.

Feedback and bug reports help shape what comes next — enjoy the road to the next boss, and good luck under the Obsidian sky.
