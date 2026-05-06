/**
 * Maps free-form journal strings to a CSS modifier on `.rpg-log-line` so the
 * adventure log can show color / border cues without tagging every call site.
 */
export function journalLineModifier(line: string): string {
  const t = line.trim()
  if (!t) return 'rpg-log-line--empty'

  if (/^LEVEL UP!/i.test(t)) return 'rpg-log-line--level'
  if (/^You won/i.test(t)) return 'rpg-log-line--win'
  if (/^You lose/i.test(t)) return 'rpg-log-line--loss'
  if (/^You died/i.test(t)) return 'rpg-log-line--death'

  if (/^Loot:/i.test(t)) return 'rpg-log-line--loot'
  if (/^Salvage drop:/i.test(t)) return 'rpg-log-line--loot'
  if (/^Experience:/i.test(t)) return 'rpg-log-line--xp'

  if (/^Victory —/i.test(t)) return 'rpg-log-line--tip'

  if (/^Blacksmith /i.test(t)) return 'rpg-log-line--vendor'
  if (/^Sold .+ for \d+ gold/i.test(t)) return 'rpg-log-line--gold'
  if (/^Sold 1× /i.test(t)) return 'rpg-log-line--gold'
  if (/^Bought /i.test(t)) return 'rpg-log-line--vendor'
  if (/^Purchased /i.test(t)) return 'rpg-log-line--vendor'
  if (/^Upgraded /i.test(t)) return 'rpg-log-line--vendor'

  if (/slip aside/i.test(t)) return 'rpg-log-line--evade'

  if (/^You use /i.test(t) && /deals \d+ damage/i.test(t)) return 'rpg-log-line--you-hit'
  if (/^You pass the turn/i.test(t)) return 'rpg-log-line--stun'

  if (/^Pick a skill:/i.test(t) || /^Pick a technique:/i.test(t)) return 'rpg-log-line--prompt'

  if (/ appears!/i.test(t)) return 'rpg-log-line--foe'

  if (/^You travel to /i.test(t) || /^You press deeper/i.test(t)) return 'rpg-log-line--travel'

  if (/^PvP /i.test(t) || /^Clash:/i.test(t)) return 'rpg-log-line--pvp'
  if (/^PvP hit:/i.test(t)) return 'rpg-log-line--pvp-hit'

  if (/^Unknown Entity:/i.test(t)) return 'rpg-log-line--voice'

  if (/^Hi .+\.$/i.test(t) && t.length < 160) return 'rpg-log-line--greet'

  if (/^You wake /i.test(t)) return 'rpg-log-line--intro'
  if (/^Innate gift /i.test(t)) return 'rpg-log-line--gift'
  if (/The stars aligned/i.test(t)) return 'rpg-log-line--rare'

  if (/^You rest /i.test(t)) return 'rpg-log-line--rest'
  if (/^Not enough /i.test(t)) return 'rpg-log-line--warn'
  if (/^Could not send/i.test(t)) return 'rpg-log-line--warn'
  if (/^Go home and/i.test(t)) return 'rpg-log-line--prompt'

  if (/ — deals \d+ damage/i.test(t)) return 'rpg-log-line--foe-hit'

  if (/^You drink /i.test(t)) return 'rpg-log-line--item'

  if (/^Equipped /i.test(t) || /^Removed /i.test(t)) return 'rpg-log-line--gear'
  if (/^You study /i.test(t)) return 'rpg-log-line--study'

  if (/^You chose /i.test(t)) return 'rpg-log-line--pvp'

  if (/^You are /i.test(t) && /stunn/i.test(t)) return 'rpg-log-line--stun'
  if (/^You cannot use/i.test(t)) return 'rpg-log-line--warn'

  if (/^PvP rules:/i.test(t)) return 'rpg-log-line--tip'

  // "Name: speech" — avoid matching meta lines like "Loot:" (handled earlier)
  if (/^[^\n:]+:[^\n]/.test(t) && !/^Loot:/i.test(t) && !/^Experience:/i.test(t)) {
    return 'rpg-log-line--voice'
  }

  return 'rpg-log-line--narration'
}
