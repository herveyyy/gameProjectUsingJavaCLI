import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './App.css'
import { AdventurerPortrait, IconCoin, IconFullscreen, IconXpSpark, ShopIcon } from './components/GameIcons'
import {
  COMBAT_GEAR_SLOT_ORDER,
  describeEquipBlock,
  EQUIPMENT_SLOT_LABELS,
  GEAR_ARCHETYPE_LABELS,
  GEAR_ARCHETYPE_ORDER,
  formatDurabilityLine,
  formatRequirements,
  GEAR_BY_ID,
  GEAR_CATALOG,
  getCombatSkillEntries,
  getSlotDurability,
  isBossDropGear,
  merchantBuyPrice,
  newGearStack,
  normalizeGearStack,
  playerMeetsStatRequirements,
  repairCostForStack,
  tryEquipFromBag,
  tryUnequipSlot,
  wearGearSlot,
  wearPerAttackUse,
} from './game/gear'
import {
  MAX_PLAYER_STAT,
  PLACES,
  SHOP_CONSUMABLES,
  SHOP_STAT_TOMES,
  SHOP_UPGRADES,
  STARTER_FREE_KIT,
  buildPlayer,
  rollEncounterForPlace,
  spawnEnemyFromRoll,
  statTomePrice,
  upgradePrice,
} from './game/constants'
import { enemyAttackHits, formatInnateShort, getEffectiveStats, INNATE_BY_ID } from './game/innates'
import {
  addXp,
  applyMaxCaps,
  formatSkillResourceDef,
  getEffectiveManaCost,
  getEffectiveSkillDamage,
  getEffectiveStaminaCost,
  getMaxStats,
  tryBuyConsumable,
  tryBuyGear,
  tryBuyStatTome,
  tryBuyUpgrade,
  tryRepairEquippedSlot,
  tryRepairGearInBag,
  trySellGearFromBag,
  trySellSalvageStack,
  tryUseHealthPotion,
  tryUseManaDraught,
  tryUseStaminaBrew,
} from './game/progression'
import { rollBattleLoot, rollBossExclusiveGear } from './game/loot'
import { SALVAGE_BY_ID, addSalvageStacks, rollSalvageLoot } from './game/salvage'
import {
  clearProgress,
  getAnySavedPlayer,
  hasSavedGame,
  listSlotSummaries,
  loadProgress,
  saveProgress,
} from './game/storage'
import { warmGameCaches } from './game/warmup'
import type {
  BattleState,
  EnemyState,
  EquipmentSlotId,
  GearArchetypeId,
  Phase,
  PlaceDef,
  PlayerState,
  ShopConsumableId,
  ShopStatTomeId,
  ShopUpgradeId,
} from './game/types'

type Screen = 'menu' | 'game'

type ShopStockFilter = 'all' | 'consumables' | 'upgrades' | 'stat_tomes' | EquipmentSlotId | GearArchetypeId

function isGearArchetypeStockFilter(f: ShopStockFilter): f is GearArchetypeId {
  return (
    f === 'warrior' ||
    f === 'rogue' ||
    f === 'mage' ||
    f === 'hybrid' ||
    f === 'mystic' ||
    f === 'legend'
  )
}

function isGearSlotStockFilter(f: ShopStockFilter): f is EquipmentSlotId {
  if (f === 'all' || f === 'consumables' || f === 'upgrades' || f === 'stat_tomes') return false
  if (isGearArchetypeStockFilter(f)) return false
  return true
}

function shopTextMatches(query: string, ...texts: string[]): boolean {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  return texts.some((t) => t.toLowerCase().includes(needle))
}

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [hasSave, setHasSave] = useState(() => hasSavedGame())
  const [phase, setPhase] = useState<Phase>('name')
  const [playerNameInput, setPlayerNameInput] = useState('')
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [enemy, setEnemy] = useState<EnemyState | null>(null)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [browserFullscreen, setBrowserFullscreen] = useState(
    () => typeof document !== 'undefined' && !!document.fullscreenElement,
  )
  const [logLines, setLogLines] = useState<string[]>([
    "Unknown Entity: What's your name, human?",
  ])
  const [splashPhase, setSplashPhase] = useState<'enter' | 'leaving' | 'gone'>('enter')
  const [shopStockFilter, setShopStockFilter] = useState<ShopStockFilter>('all')
  const [shopSearchQuery, setShopSearchQuery] = useState('')
  const [gameBooting, setGameBooting] = useState(false)
  /** Which save slot (0-based) is active while playing; null on main menu. */
  const [saveSlotIndex, setSaveSlotIndex] = useState<number | null>(null)
  /** Region locked for this expedition until inn / home / menu — pick map once per outing. */
  const [committedPlace, setCommittedPlace] = useState<PlaceDef | null>(null)
  /** Wins since map was chosen (boss odds ramp up, esp. Obsidian Depths). */
  const [expeditionFightCount, setExpeditionFightCount] = useState(0)

  const playerRef = useRef<PlayerState | null>(null)
  playerRef.current = player

  const resetExpedition = useCallback(() => {
    setCommittedPlace(null)
    setExpeditionFightCount(0)
  }, [])

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => [...prev, line])
  }, [])

  useLayoutEffect(() => {
    const el = logRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [logLines])

  useEffect(() => {
    if (screen === 'game' && player && saveSlotIndex !== null) {
      saveProgress(saveSlotIndex, player)
      setHasSave(true)
    }
  }, [player, screen, saveSlotIndex])

  useEffect(() => {
    const sync = () => setBrowserFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => document.removeEventListener('fullscreenchange', sync)
  }, [])

  useEffect(() => {
    const tLeave = window.setTimeout(() => setSplashPhase('leaving'), 1850)
    const tGone = window.setTimeout(() => setSplashPhase('gone'), 2520)
    return () => {
      clearTimeout(tLeave)
      clearTimeout(tGone)
    }
  }, [])

  useEffect(() => {
    if (splashPhase !== 'gone') return
    let idle: ReturnType<typeof requestIdleCallback> | undefined
    let timer: number | undefined
    const run = () => warmGameCaches(getAnySavedPlayer())
    if (typeof requestIdleCallback !== 'undefined') {
      idle = requestIdleCallback(run, { timeout: 3200 })
    } else {
      timer = window.setTimeout(run, 400)
    }
    return () => {
      if (idle !== undefined && typeof cancelIdleCallback !== 'undefined') cancelIdleCallback(idle)
      if (timer !== undefined) window.clearTimeout(timer)
    }
  }, [splashPhase])

  const toggleBrowserFullscreen = useCallback(() => {
    const go = async () => {
      try {
        if (document.fullscreenElement) {
          await document.exitFullscreen()
        } else {
          await document.documentElement.requestFullscreen()
        }
      } catch {
        /* user gesture / unsupported */
      }
    }
    void go()
  }, [])

  const resetToName = useCallback(() => {
    if (saveSlotIndex !== null) clearProgress(saveSlotIndex)
    setHasSave(hasSavedGame())
    resetExpedition()
    setPhase('name')
    setPlayerNameInput('')
    setPlayer(null)
    setEnemy(null)
    setBattle(null)
    setLogLines(["Unknown Entity: What's your name, human?"])
  }, [resetExpedition, saveSlotIndex])

  const goToMenu = useCallback(() => {
    resetExpedition()
    setEnemy(null)
    setBattle(null)
    setPlayer(null)
    setPhase('name')
    setPlayerNameInput('')
    setLogLines([])
    setSaveSlotIndex(null)
    setScreen('menu')
    setHasSave(hasSavedGame())
  }, [resetExpedition])

  const exitToMenu = useCallback(() => {
    if (player && saveSlotIndex !== null) saveProgress(saveSlotIndex, player)
    setHasSave(hasSavedGame())
    goToMenu()
  }, [goToMenu, player, saveSlotIndex])

  const handleContinueSlot = useCallback((slotIndex: number) => {
    flushSync(() => setGameBooting(true))
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const saved = loadProgress(slotIndex)
        warmGameCaches(saved)
        flushSync(() => {
          setSaveSlotIndex(slotIndex)
          setScreen('game')
          if (saved) {
            setPlayer(saved)
            setPlayerNameInput(saved.name)
            setPhase('adventure')
            setEnemy(null)
            setBattle(null)
            resetExpedition()
            setLogLines([
              `Welcome back, ${saved.name}!`,
              `Loaded save slot ${slotIndex + 1} from this browser.`,
              'Choose a destination — each region shows recommended levels.',
            ])
          } else {
            setPlayer(null)
            setPlayerNameInput('')
            setPhase('name')
            setEnemy(null)
            setBattle(null)
            setLogLines(["Unknown Entity: What's your name, human?"])
          }
          setGameBooting(false)
        })
      })
    })
  }, [resetExpedition])

  const handleNewCharacterSlot = useCallback((slotIndex: number) => {
    const occupied = loadProgress(slotIndex)
    if (occupied) {
      const ok = window.confirm(
        `Replace the save in slot ${slotIndex + 1} (${occupied.name}, level ${occupied.level})? This cannot be undone.`,
      )
      if (!ok) return
    }
    flushSync(() => setGameBooting(true))
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        clearProgress(slotIndex)
        warmGameCaches(null)
        flushSync(() => {
          setSaveSlotIndex(slotIndex)
          setHasSave(hasSavedGame())
          setScreen('game')
          setPlayer(null)
          setPlayerNameInput('')
          setEnemy(null)
          setBattle(null)
          setPhase('name')
          resetExpedition()
          setLogLines(["Unknown Entity: What's your name, human?"])
          setGameBooting(false)
        })
      })
    })
  }, [resetExpedition])

  const handleDeleteSlot = useCallback((slotIndex: number) => {
    const p = loadProgress(slotIndex)
    if (!p) return
    const ok = window.confirm(`Delete ${p.name} (level ${p.level}) from this device?`)
    if (!ok) return
    clearProgress(slotIndex)
    setHasSave(hasSavedGame())
  }, [])

  const beginAdventure = useCallback(() => {
    const n = playerNameInput.trim()
    if (!n) return
    const p = applyMaxCaps(buildPlayer(n))
    setPlayer(p)
    appendLog(
      `You wake with a free traveler's kit (${Object.keys(STARTER_FREE_KIT).length} pieces already equipped — earrings, gorget, cloak, leggings, boots).`,
    )
    appendLog(`Hi ${n}. Combat techniques come from gear — stats + innate gifts decide what you can wear.`)
    for (const id of p.innates) {
      const inn = INNATE_BY_ID[id]
      appendLog(
        inn ? `Innate gift [${inn.rank}]: ${inn.name} — ${inn.description}` : `Innate gift: ${id}`,
      )
    }
    if (p.innates.length > 1) {
      appendLog('The stars aligned: a second innate awakened with you (≈0.001% chance).')
    }
    appendLog('Gold and XP drop from fights; monsters leave junk and sometimes armor salvage — sell spares at the merchant.')
    appendLog('Open the shop for more arms and armor; manage slots under Equipment.')
    appendLog(
      'Each outing: pick one region, then chain fights there. Gear loses durability when you strike with its skill — repair at the blacksmith when it breaks (Obsidian Depths: boss odds climb with wins).',
    )
    resetExpedition()
    setPhase('adventure')
  }, [appendLog, playerNameInput, resetExpedition])

  const beginEncounterAt = useCallback(
    (place: PlaceDef) => {
      if (!player) return
      if (committedPlace && committedPlace.id !== place.id) {
        appendLog('You are already exploring another region — rest at the inn or go home to travel elsewhere.')
        return
      }
      const p = applyMaxCaps(player)
      setPlayer(p)
      if (p.level < place.levelMin) {
        appendLog(
          `⚠ ${place.name} is harsh for level ${p.level} (recommended ${place.levelRecommended}). You were warned.`,
        )
      }
      if (!committedPlace || committedPlace.id !== place.id) {
        appendLog(`You travel to ${place.name}…`)
      } else {
        appendLog(`You press deeper into ${place.shortName}…`)
      }
      const mobId = rollEncounterForPlace(place, expeditionFightCount)
      const e = spawnEnemyFromRoll(mobId)
      setEnemy(e)
      setBattle({ enemyHp: e.hp, playerHp: p.hp })
      setCommittedPlace(place)
      appendLog(
        e.isBoss
          ? `BOSS FIGHT: ${e.name} tears through ${place.shortName}! (~${e.goldReward} gold · ~${e.xpReward} XP)`
          : `In ${place.shortName}, a ${e.name} appears! (~${e.goldReward} gold · ~${e.xpReward} XP)`,
      )
      setPhase('battle_menu')
    },
    [appendLog, committedPlace, expeditionFightCount, player],
  )

  const runFromBattle = useCallback(() => {
    appendLog(
      committedPlace
        ? `You fled. You can fight again in ${committedPlace.name}, or rest at the inn / go home to choose a new region.`
        : 'You fled from combat.',
    )
    setEnemy(null)
    setBattle(null)
    setPhase('adventure')
  }, [appendLog, committedPlace])

  const restAtInn = useCallback(() => {
    if (!player) return
    resetExpedition()
    const m = getMaxStats(player)
    const needsHeal = player.hp < m.maxHp || player.mana < m.maxMana || player.stamina < m.maxStamina
    if (needsHeal) {
      setPlayer(applyMaxCaps({ ...player, hp: m.maxHp, mana: m.maxMana, stamina: m.maxStamina }))
      appendLog('You rest at the inn. Vitals restored — open the map to choose a new region.')
    } else {
      appendLog('You rest at the inn. Open the map to choose a new region.')
    }
  }, [appendLog, player, resetExpedition])

  const confirmGoHome = useCallback(() => {
    appendLog('Go home and restart the expedition?')
    setPhase('confirm_home')
  }, [appendLog])

  const resolveTurn = useCallback(
    (skillIndex: number) => {
      if (!player || !enemy || !battle) return
      const entries = getCombatSkillEntries(player)
      const entry = entries[skillIndex]
      if (!entry) return
      const sk = entry.skill
      const mpCost = getEffectiveManaCost(player, sk)
      const staCost = getEffectiveStaminaCost(player, sk)
      const dmg = getEffectiveSkillDamage(player, sk)

      if (mpCost > player.mana + 1e-6) {
        appendLog(`Not enough mana for ${sk.name} (needs ${fmt(mpCost)}).`)
        setPhase('battle_menu')
        return
      }
      if (staCost > player.stamina + 1e-6) {
        appendLog(`Not enough stamina for ${sk.name} (needs ${fmt(staCost)}).`)
        setPhase('battle_menu')
        return
      }

      let nextPlayer: PlayerState = applyMaxCaps({
        ...player,
        mana: player.mana - mpCost,
        stamina: player.stamina - staCost,
      })
      let gearJustBroke = false
      if (entry.kind === 'gear' && entry.slot) {
        const slot = entry.slot
        const before = getSlotDurability(player, slot)
        nextPlayer = wearGearSlot(nextPlayer, slot, wearPerAttackUse(sk))
        gearJustBroke = before > 0 && getSlotDurability(nextPlayer, slot) <= 0
      }

      const b = { ...battle }
      b.enemyHp -= dmg
      const skillLine =
        entry.kind === 'gear' && entry.gearId
          ? `${sk.name} (${GEAR_BY_ID[entry.gearId]?.name ?? 'gear'})`
          : sk.name
      appendLog(`You use ${skillLine} — deals ${dmg} damage.`)
      if (gearJustBroke && entry.kind === 'gear' && entry.gearId) {
        appendLog(
          `${GEAR_BY_ID[entry.gearId]?.name ?? 'Your gear'} breaks — repair at the blacksmith to use that skill again.`,
        )
      }

      if (b.enemyHp <= 0) {
        appendLog('You won!')
        let won: PlayerState = { ...nextPlayer, hp: b.playerHp }
        won.gold += enemy.goldReward
        appendLog(`Loot: +${enemy.goldReward} gold.`)

        const dropId = enemy.isBoss ? rollBossExclusiveGear() : rollBattleLoot(enemy.id)
        if (dropId) {
          won = { ...won, gearOwned: [...won.gearOwned, newGearStack(dropId)] }
          const dropDef = GEAR_BY_ID[dropId]
          const dropName = dropDef?.name ?? dropId
          const bossRelic = dropDef ? isBossDropGear(dropDef) : false
          appendLog(
            bossRelic
              ? `Boss relic: ${dropName} (Mystic or Legend) — stowed in your pack.`
              : `Salvage drop: ${dropName} — sent to your pack (sell at the shop or equip under Equipment).`,
          )
        }

        const junkId = rollSalvageLoot(enemy.id)
        if (junkId) {
          won = addSalvageStacks(won, junkId, 1)
          const junkName = SALVAGE_BY_ID[junkId]?.name ?? junkId
          appendLog(`Loot: ${junkName} — junk stacks in salvage (sell at the merchant).`)
        }

        const xpGain = addXp(won, enemy.xpReward)
        won = xpGain.player
        appendLog(`Experience: +${enemy.xpReward} XP.`)
        xpGain.messages.forEach((m) => appendLog(m))

        setPlayer(won)
        setExpeditionFightCount((c) => c + 1)
        appendLog(
          'Victory — use “Next encounter” to stay in this region, or rest at the inn / go home for a new map. Boss odds rise with each win (Obsidian Depths).',
        )
        setEnemy(null)
        setBattle(null)
        setPhase('adventure')
        return
      }

      if (!enemyAttackHits(nextPlayer)) {
        appendLog(`${enemy.name} tries ${enemy.skill} — you slip aside!`)
      } else {
        appendLog(`${enemy.name} uses ${enemy.skill} — deals ${enemy.damage} damage.`)
        b.playerHp -= enemy.damage
      }

      if (b.playerHp <= 0) {
        appendLog('You died.')
        if (saveSlotIndex !== null) clearProgress(saveSlotIndex)
        setHasSave(hasSavedGame())
        resetExpedition()
        setBattle(null)
        setEnemy(null)
        setPhase('done')
        return
      }

      nextPlayer = { ...nextPlayer, hp: b.playerHp }
      setPlayer(nextPlayer)
      setBattle(b)
      setPhase('battle_menu')
    },
    [appendLog, battle, enemy, player, resetExpedition, saveSlotIndex],
  )

  const buyConsumable = useCallback(
    (id: ShopConsumableId) => {
      if (!player) return
      const next = tryBuyConsumable(player, id)
      if (!next) {
        appendLog('Not enough gold.')
        return
      }
      const label = SHOP_CONSUMABLES.find((c) => c.id === id)?.name ?? id
      setPlayer(next)
      appendLog(`Bought ${label}.`)
    },
    [appendLog, player],
  )

  const buyUpgrade = useCallback(
    (id: ShopUpgradeId) => {
      if (!player) return
      const next = tryBuyUpgrade(player, id)
      if (!next) {
        appendLog('Not enough gold.')
        return
      }
      const label = SHOP_UPGRADES.find((u) => u.id === id)?.name ?? id
      setPlayer(next)
      appendLog(`Upgraded ${label}.`)
    },
    [appendLog, player],
  )

  const buyStatTome = useCallback(
    (id: ShopStatTomeId) => {
      if (!player) return
      const def = SHOP_STAT_TOMES.find((t) => t.id === id)
      const curBefore = def ? player.stats[def.stat] : 0
      const next = tryBuyStatTome(player, id)
      if (!next) {
        if (def && curBefore >= MAX_PLAYER_STAT) appendLog(`${def.name}: ${def.stat.toUpperCase()} is already max (${MAX_PLAYER_STAT}).`)
        else appendLog('Not enough gold for this tome.')
        return
      }
      const label = def?.name ?? id
      const abbr = def?.stat === 'strength' ? 'STR' : def?.stat === 'agility' ? 'AGI' : 'INT'
      const v = def ? next.stats[def.stat] : 0
      setPlayer(next)
      appendLog(`You study ${label} — ${abbr} +1 (now ${v}/${MAX_PLAYER_STAT}).`)
    },
    [appendLog, player],
  )

  const buyGear = useCallback(
    (gearId: string) => {
      if (!player) return
      const next = tryBuyGear(player, gearId)
      if (!next) {
        appendLog('Not enough gold.')
        return
      }
      const label = GEAR_BY_ID[gearId]?.name ?? gearId
      setPlayer(next)
      appendLog(`Purchased ${label}. It is in your pack — equip it from Equipment.`)
    },
    [appendLog, player],
  )

  const sellGearFromPack = useCallback(
    (packIndex: number) => {
      const p = playerRef.current
      if (!p) return
      const stack = normalizeGearStack(p.gearOwned[packIndex])
      if (!stack) return
      const result = trySellGearFromBag(p, packIndex)
      if (!result) return
      const label = GEAR_BY_ID[stack.gearId]?.name ?? stack.gearId
      setPlayer(result.player)
      appendLog(`Sold ${label} to the merchant for ${result.goldGained} gold.`)
    },
    [appendLog],
  )

  const sellSalvageStack = useCallback(
    (salvageId: string) => {
      if (!player) return
      const result = trySellSalvageStack(player, salvageId)
      if (!result) return
      const label = SALVAGE_BY_ID[salvageId]?.name ?? salvageId
      setPlayer(result.player)
      appendLog(`Sold 1× ${label} for ${result.goldGained} gold.`)
    },
    [appendLog, player],
  )

  const equipFromBag = useCallback(
    (packIndex: number) => {
      const p = playerRef.current
      if (!p) return
      const why = describeEquipBlock(p, packIndex)
      if (why) {
        appendLog(why)
        return
      }
      const stack = normalizeGearStack(p.gearOwned[packIndex])
      const next = tryEquipFromBag(p, packIndex)
      if (!next) return
      setPlayer(next)
      appendLog(`Equipped ${stack ? GEAR_BY_ID[stack.gearId]?.name ?? stack.gearId : 'gear'}.`)
    },
    [appendLog],
  )

  const repairPackRow = useCallback(
    (packIndex: number) => {
      const p = playerRef.current
      if (!p) return
      const stack = normalizeGearStack(p.gearOwned[packIndex])
      if (!stack) return
      const cost = repairCostForStack(stack)
      const next = tryRepairGearInBag(p, packIndex)
      if (!next) {
        appendLog(cost <= 0 ? 'Already at full durability.' : 'Not enough gold to repair.')
        return
      }
      setPlayer(next)
      const name = GEAR_BY_ID[stack.gearId]?.name ?? stack.gearId
      appendLog(`Blacksmith restores ${name} (${cost} gold).`)
    },
    [appendLog],
  )

  const repairEquippedSlot = useCallback(
    (slot: EquipmentSlotId) => {
      const p = playerRef.current
      if (!p) return
      const id = p.equipment[slot]
      if (!id) return
      const cost = repairCostForStack({ gearId: id, durability: getSlotDurability(p, slot) })
      const next = tryRepairEquippedSlot(p, slot)
      if (!next) {
        appendLog(cost <= 0 ? 'Already at full durability.' : 'Not enough gold to repair.')
        return
      }
      setPlayer(next)
      appendLog(`Blacksmith restores ${GEAR_BY_ID[id]?.name ?? id} (${cost} gold).`)
    },
    [appendLog],
  )

  const unequipSlot = useCallback(
    (slot: EquipmentSlotId) => {
      if (!player) return
      const next = tryUnequipSlot(player, slot)
      if (!next) return
      setPlayer(next)
      appendLog(`Removed ${EQUIPMENT_SLOT_LABELS[slot]} piece to your pack.`)
    },
    [appendLog, player],
  )

  const usePotionAdventure = useCallback(
    (kind: 'hp' | 'mana' | 'sta') => {
      if (!player) return
      let next: PlayerState | null = null
      if (kind === 'hp') next = tryUseHealthPotion(player)
      else if (kind === 'mana') next = tryUseManaDraught(player)
      else next = tryUseStaminaBrew(player)
      if (!next) return
      setPlayer(next)
      appendLog(kind === 'hp' ? 'You drink a Red Tonic.' : kind === 'mana' ? 'You drink a Blue Tonic.' : 'You drink a Green Tonic.')
    },
    [appendLog, player],
  )

  const maxStats = player ? getMaxStats(player) : null
  const effStats = player ? getEffectiveStats(player) : null
  const xpPct = player && player.xpToNext > 0 ? Math.min(100, (player.xp / player.xpToNext) * 100) : 0

  const playMood = useMemo((): 'adventure' | 'shop' | 'gear' | 'battle' => {
    if (phase === 'shop') return 'shop'
    if (phase === 'gear' || phase === 'blacksmith') return 'gear'
    if (
      phase === 'battle_menu' ||
      phase === 'pick_skill' ||
      phase === 'use_item_battle' ||
      phase === 'confirm_home'
    ) {
      return 'battle'
    }
    return 'adventure'
  }, [phase])

  const actions = useMemo(() => {
    if (phase === 'name') {
      return (
        <div className="rpg-actions">
          <input
            className="rpg-input"
            type="text"
            placeholder="Your name"
            value={playerNameInput}
            onChange={(e) => setPlayerNameInput(e.target.value)}
            aria-label="Player name"
          />
          <button type="button" onClick={beginAdventure}>
            Continue
          </button>
        </div>
      )
    }
    if (phase === 'adventure') {
      return (
        <>
          {committedPlace ? (
            <div className="rpg-expedition-panel">
              <h3 className="rpg-places-heading">Expedition · {committedPlace.name}</h3>
              <p className="rpg-expedition-meta">
                Wins this outing: <strong>{expeditionFightCount}</strong>
              </p>
              <p className="rpg-expedition-hint">
                Gear wears when you use its skill in combat — blacksmith repairs for gold. Boss odds climb with each win
                in Obsidian Depths.
              </p>
              <div className="rpg-actions">
                <button type="button" onClick={() => beginEncounterAt(committedPlace)}>
                  Next encounter
                </button>
              </div>
            </div>
          ) : (
            <div className="rpg-places-section rpg-places-section--immersive">
              <h3 className="rpg-places-heading">Choose a destination</h3>
              <div className="rpg-places-scroll">
                <div className="rpg-places-grid">
                  {PLACES.map((place, idx) => {
                    const risky = player ? player.level < place.levelMin : false
                    const ideal =
                      player && player.level >= place.levelMin && player.level <= place.levelMax
                    return (
                      <button
                        type="button"
                        key={place.id}
                        className={`rpg-place-card${risky ? ' rpg-place-risky' : ''}${ideal ? ' rpg-place-ideal' : ''}`}
                        style={{ animationDelay: `${idx * 42}ms` }}
                        onClick={() => beginEncounterAt(place)}
                      >
                        <span className="rpg-place-name">{place.name}</span>
                        <span className="rpg-place-rec">Rec. Lv {place.levelRecommended}</span>
                        <span className="rpg-place-desc">{place.description}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          <div className="rpg-actions">
            <button type="button" onClick={() => setPhase('shop')}>
              Open shop
            </button>
            <button type="button" onClick={() => setPhase('gear')}>
              Equipment
            </button>
            <button type="button" onClick={() => setPhase('blacksmith')}>
              Blacksmith
            </button>
            <button type="button" onClick={restAtInn}>
              Rest at inn
            </button>
            <button type="button" onClick={exitToMenu}>
              Save &amp; menu
            </button>
          </div>
          {player && (player.inventory.healthPotion > 0 || player.inventory.manaDraught > 0 || player.inventory.staminaBrew > 0) && (
            <div className="rpg-adventure-inventory">
              <div className="rpg-inventory-actions">
                <span className="rpg-inventory-label">Tonics</span>
                {player.inventory.healthPotion > 0 && (
                  <button type="button" className="rpg-tiny" onClick={() => usePotionAdventure('hp')}>
                    Red ×{player.inventory.healthPotion}
                  </button>
                )}
                {player.inventory.manaDraught > 0 && (
                  <button type="button" className="rpg-tiny" onClick={() => usePotionAdventure('mana')}>
                    Blue ×{player.inventory.manaDraught}
                  </button>
                )}
                {player.inventory.staminaBrew > 0 && (
                  <button type="button" className="rpg-tiny" onClick={() => usePotionAdventure('sta')}>
                    Green ×{player.inventory.staminaBrew}
                  </button>
                )}
              </div>
            </div>
          )}
        </>
      )
    }
    if (phase === 'shop' && player) {
      return (
        <div className="rpg-actions">
          <button type="button" onClick={() => setPhase('adventure')}>
            Leave shop
          </button>
        </div>
      )
    }
    if (phase === 'gear' && player) {
      return (
        <div className="rpg-actions">
          <button type="button" onClick={() => setPhase('adventure')}>
            Back to journey
          </button>
        </div>
      )
    }
    if (phase === 'blacksmith' && player) {
      return (
        <div className="rpg-actions">
          <button type="button" onClick={() => setPhase('adventure')}>
            Back to journey
          </button>
        </div>
      )
    }
    if (phase === 'battle_menu') {
      return (
        <div className="rpg-actions">
          <button
            type="button"
            onClick={() => {
              appendLog('Pick a skill:')
              setPhase('pick_skill')
            }}
          >
            Attack
          </button>
          <button
            type="button"
            onClick={() => {
              if (
                player &&
                (player.inventory.healthPotion > 0 ||
                  player.inventory.manaDraught > 0 ||
                  player.inventory.staminaBrew > 0)
              ) {
                setPhase('use_item_battle')
              } else appendLog('No tonics in your pack.')
            }}
          >
            Items
          </button>
          <button type="button" onClick={runFromBattle}>
            Run
          </button>
          <button type="button" onClick={confirmGoHome}>
            Go home
          </button>
        </div>
      )
    }
    if (phase === 'confirm_home') {
      return (
        <div className="rpg-actions">
          <button
            type="button"
            onClick={() => {
              appendLog('Choose where to travel next.')
              resetExpedition()
              setEnemy(null)
              setBattle(null)
              setPhase('adventure')
            }}
          >
            Yes
          </button>
          <button type="button" onClick={() => setPhase('battle_menu')}>
            No
          </button>
        </div>
      )
    }
    if (phase === 'pick_skill' && player && enemy) {
      const combatSkills = getCombatSkillEntries(player)
      return (
        <div className="rpg-actions rpg-skill-picker">
          <p className="rpg-skill-picker__hint">Choose a technique</p>
          <div className="rpg-skill-picker__grid" role="list">
            {combatSkills.map((ent, idx) => {
              const eff = getEffectiveSkillDamage(player, ent.skill)
              const mc = getEffectiveManaCost(player, ent.skill)
              const sc = getEffectiveStaminaCost(player, ent.skill)
              const wear = ent.kind === 'gear' ? wearPerAttackUse(ent.skill) : null
              const gearName =
                ent.kind === 'gear' && ent.gearId ? GEAR_BY_ID[ent.gearId]?.name ?? null : null
              const accent =
                mc > 1e-9 && sc > 1e-9 ? 'mixed' : mc > 1e-9 ? 'mp' : sc > 1e-9 ? 'sta' : 'free'
              const ariaGear = gearName ? ` from ${gearName}` : ''
              return (
                <button
                  key={`${ent.label}-${idx}`}
                  type="button"
                  role="listitem"
                  className="rpg-skill-card"
                  data-accent={accent}
                  data-kind={ent.kind}
                  aria-label={`${idx + 1}. ${ent.skill.name}${ariaGear}, ${eff} damage`}
                  onClick={() => resolveTurn(idx)}
                >
                  <span className="rpg-skill-card__idx" aria-hidden>
                    {idx + 1}
                  </span>
                  <span className="rpg-skill-card__main">
                    <span className="rpg-skill-card__skill">{ent.skill.name}</span>
                    {gearName ? (
                      <span className="rpg-skill-card__gear">{gearName}</span>
                    ) : (
                      <span className="rpg-skill-card__gear rpg-skill-card__gear--muted">
                        Intrinsic — no gear wear
                      </span>
                    )}
                    <span className="rpg-skill-card__row">
                      <span className="rpg-skill-pill rpg-skill-pill--dmg">{eff} dmg</span>
                      {mc > 1e-9 && (
                        <span className="rpg-skill-pill rpg-skill-pill--mp">{fmt(mc)} MP</span>
                      )}
                      {sc > 1e-9 && (
                        <span className="rpg-skill-pill rpg-skill-pill--sta">{fmt(sc)} STA</span>
                      )}
                      {wear != null && (
                        <span
                          className="rpg-skill-pill rpg-skill-pill--wear"
                          title="Durability lost on this attack"
                        >
                          −{wear} wear
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <div className="rpg-skill-picker__footer">
            <button type="button" className="rpg-skill-back" onClick={() => setPhase('battle_menu')}>
              ← Back
            </button>
          </div>
        </div>
      )
    }
    if (phase === 'use_item_battle' && player) {
      return (
        <div className="rpg-actions">
          {player.inventory.healthPotion > 0 && (
            <button
              type="button"
              onClick={() => {
                const next = tryUseHealthPotion(player)
                if (next) {
                  setPlayer(next)
                  appendLog('You drink a Red Tonic (+40 HP).')
                  setBattle((prev) => (prev ? { ...prev, playerHp: next.hp } : prev))
                  setPhase('battle_menu')
                }
              }}
            >
              Red tonic ×{player.inventory.healthPotion}
            </button>
          )}
          {player.inventory.manaDraught > 0 && (
            <button
              type="button"
              onClick={() => {
                const next = tryUseManaDraught(player)
                if (next) {
                  setPlayer(next)
                  appendLog('You drink a Blue Tonic (+35 MP).')
                  setPhase('battle_menu')
                }
              }}
            >
              Blue tonic ×{player.inventory.manaDraught}
            </button>
          )}
          {player.inventory.staminaBrew > 0 && (
            <button
              type="button"
              onClick={() => {
                const next = tryUseStaminaBrew(player)
                if (next) {
                  setPlayer(next)
                  appendLog('You drink a Green Tonic (+30 STA).')
                  setPhase('battle_menu')
                }
              }}
            >
              Green tonic ×{player.inventory.staminaBrew}
            </button>
          )}
          <button type="button" onClick={() => setPhase('battle_menu')}>
            Back
          </button>
        </div>
      )
    }
    if (phase === 'done') {
      return (
        <div className="rpg-actions">
          <button type="button" onClick={resetToName}>
            New character
          </button>
          <button type="button" onClick={goToMenu}>
            Menu
          </button>
        </div>
      )
    }
    return null
  }, [
    appendLog,
    beginAdventure,
    beginEncounterAt,
    buyGear,
    sellGearFromPack,
    confirmGoHome,
    enemy,
    equipFromBag,
    phase,
    player,
    playerNameInput,
    resolveTurn,
    exitToMenu,
    goToMenu,
    resetToName,
    runFromBattle,
    unequipSlot,
    usePotionAdventure,
    committedPlace,
    expeditionFightCount,
    resetExpedition,
  ])

  const filteredShopConsumables = useMemo(() => {
    return SHOP_CONSUMABLES.filter((c) => {
      if (shopStockFilter !== 'all' && shopStockFilter !== 'consumables') return false
      return shopTextMatches(shopSearchQuery, c.name, c.description)
    })
  }, [shopStockFilter, shopSearchQuery])

  const filteredShopUpgrades = useMemo(() => {
    return SHOP_UPGRADES.filter((u) => {
      if (shopStockFilter !== 'all' && shopStockFilter !== 'upgrades') return false
      return shopTextMatches(shopSearchQuery, u.name, u.description)
    })
  }, [shopStockFilter, shopSearchQuery])

  const filteredShopStatTomes = useMemo(() => {
    return SHOP_STAT_TOMES.filter((t) => {
      if (shopStockFilter !== 'all' && shopStockFilter !== 'stat_tomes') return false
      return shopTextMatches(shopSearchQuery, t.name, t.description)
    })
  }, [shopStockFilter, shopSearchQuery])

  const filteredShopGear = useMemo(() => {
    return GEAR_CATALOG.filter((g) => {
      if (isBossDropGear(g)) return false
      if (shopStockFilter !== 'all') {
        if (isGearSlotStockFilter(shopStockFilter)) {
          if (g.slot !== shopStockFilter) return false
        } else if (isGearArchetypeStockFilter(shopStockFilter)) {
          if (g.archetype !== shopStockFilter) return false
        } else {
          return false
        }
      }
      return shopTextMatches(
        shopSearchQuery,
        g.name,
        g.description,
        EQUIPMENT_SLOT_LABELS[g.slot],
        GEAR_ARCHETYPE_LABELS[g.archetype],
        g.skill.name,
      )
    })
  }, [shopStockFilter, shopSearchQuery])

  const showShopConsumables = shopStockFilter === 'all' || shopStockFilter === 'consumables'
  const showShopUpgrades = shopStockFilter === 'all' || shopStockFilter === 'upgrades'
  const showShopStatTomes = shopStockFilter === 'all' || shopStockFilter === 'stat_tomes'
  const showShopGear =
    shopStockFilter === 'all' ||
    isGearSlotStockFilter(shopStockFilter) ||
    isGearArchetypeStockFilter(shopStockFilter)

  const shopHasBuyStock =
    (showShopConsumables && filteredShopConsumables.length > 0) ||
    (showShopUpgrades && filteredShopUpgrades.length > 0) ||
    (showShopStatTomes && filteredShopStatTomes.length > 0) ||
    (showShopGear && filteredShopGear.length > 0)

  const splashOverlay =
    splashPhase !== 'gone' ? (
      <div
        className={`rpg-splash ${splashPhase === 'leaving' ? 'rpg-splash--out' : ''}`}
        aria-live="polite"
      >
        <div className="rpg-splash__frame">
          <p className="rpg-splash__eyebrow">Wela RPG</p>
          <h2 className="rpg-splash__title">Frappe Text Adventure RPG</h2>
          <p className="rpg-splash__tagline">Sharpening verbs… waxing the journal…</p>
          <div className="rpg-splash__track" aria-hidden>
            <div className="rpg-splash__track-fill" />
          </div>
        </div>
      </div>
    ) : null

  if (screen === 'menu') {
    return (
      <>
        {splashOverlay}
        {gameBooting && (
          <div className="rpg-game-boot-overlay" role="status" aria-live="polite">
            <div className="rpg-game-boot-card">
              <p className="rpg-game-boot-title">Preparing your journey…</p>
              <p className="rpg-game-boot-sub">Warming caches — gear, shop, and save data.</p>
            </div>
          </div>
        )}
        <div
          className={`app-root app-root--fullscreen${splashPhase === 'gone' ? ' rpg-app-reveal' : ''}`}
        >
          <div className="rpg-shell rpg-shell--fullscreen rpg-menu-shell">
            <button
              type="button"
              className="rpg-fs-btn"
              title={browserFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={browserFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={toggleBrowserFullscreen}
              disabled={gameBooting}
            >
              <IconFullscreen expanded={browserFullscreen} size={20} />
            </button>
            <h1 className="rpg-menu-title">Frappe Text Adventure RPG</h1>
            <p className="rpg-menu-lead">
              Pick a save slot — each adventurer keeps their own progress in this browser.
            </p>
            {hasSave && <p className="rpg-menu-save">You have one or more heroes saved on this device.</p>}
            <div className="rpg-menu-slots" aria-label="Character save slots">
              {listSlotSummaries().map(({ index, player: slotPlayer }) => (
                <div
                  key={index}
                  className={`rpg-menu-slot${slotPlayer ? ' rpg-menu-slot--filled' : ' rpg-menu-slot--empty'}`}
                >
                  <div className="rpg-menu-slot-head">
                    <span className="rpg-menu-slot-label">Adventurer {index + 1}</span>
                  </div>
                  {slotPlayer ? (
                    <>
                      <p className="rpg-menu-slot-summary">
                        <strong>{slotPlayer.name}</strong>
                        <span className="rpg-menu-slot-meta">
                          {' '}
                          · Level {slotPlayer.level} · {slotPlayer.gold} gold
                        </span>
                      </p>
                      <div className="rpg-menu-slot-actions">
                        <button
                          type="button"
                          className="rpg-menu-play"
                          onClick={() => handleContinueSlot(index)}
                          disabled={gameBooting}
                        >
                          Continue
                        </button>
                        <button
                          type="button"
                          className="rpg-menu-secondary"
                          onClick={() => handleNewCharacterSlot(index)}
                          disabled={gameBooting}
                        >
                          New character
                        </button>
                        <button
                          type="button"
                          className="rpg-menu-delete"
                          onClick={() => handleDeleteSlot(index)}
                          disabled={gameBooting}
                        >
                          Delete save
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="rpg-menu-slot-actions rpg-menu-slot-actions--single">
                      <button
                        type="button"
                        className="rpg-menu-play"
                        onClick={() => handleNewCharacterSlot(index)}
                        disabled={gameBooting}
                      >
                        New character
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <p className="rpg-meta">Uses localStorage — clearing site data removes saves.</p>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      {splashOverlay}
      <div
        className={`app-root app-root--fullscreen${splashPhase === 'gone' ? ' rpg-app-reveal' : ''}`}
      >
        <div className="rpg-shell rpg-shell--fullscreen">
          <button
            type="button"
            className="rpg-fs-btn"
            title={browserFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            aria-label={browserFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
            onClick={toggleBrowserFullscreen}
          >
            <IconFullscreen expanded={browserFullscreen} size={20} />
          </button>
          {!(player && maxStats) && (
            <header className="rpg-hud rpg-hud-minimal">
              <div className="rpg-hud-title">
                <h1>Frappe Text Adventure RPG</h1>
              </div>
            </header>
          )}

          {!player && phase === 'name' && (
            <div className="rpg-panel rpg-player">
              <div>
                Enter your name to begin
                {saveSlotIndex !== null ? ` (save slot ${saveSlotIndex + 1}).` : '.'}
              </div>
            </div>
          )}

          <div className={`rpg-play-layout rpg-play-mood--${playMood}`}>
            {player && maxStats ? (
              <aside className="rpg-sidebar-column" aria-label="Character and journal">
                <section className={`rpg-panel rpg-dashboard rpg-dashboard-mood--${playMood}`}>
                  <div className="rpg-dashboard-top">
                    <div className="rpg-dashboard-identity">
                      <AdventurerPortrait size={48} />
                      <div className="rpg-hud-id">
                        <span className="rpg-hud-name">{player.name}</span>
                        <span className="rpg-hud-class">
                          {saveSlotIndex !== null ? `Save slot ${saveSlotIndex + 1} · ` : ''}
                          Gear defines your kit
                        </span>
                      </div>
                    </div>
                    <div className="rpg-dashboard-lv-gold">
                      {(phase === 'shop' || phase === 'gear' || phase === 'blacksmith') && (
                        <button
                          type="button"
                          className="rpg-dashboard-back"
                          title="Return to the world map"
                          onClick={() => setPhase('adventure')}
                        >
                          Back
                        </button>
                      )}
                      <span className="rpg-hud-badge">
                        Lv <strong>{player.level}</strong>
                      </span>
                      <span className="rpg-hud-gold" title="Gold">
                        <IconCoin /> <strong>{player.gold}</strong>
                      </span>
                    </div>
                  </div>
                  <div className="rpg-dashboard-xp" title="Experience">
                    <IconXpSpark />
                    <div className="rpg-xp-bar">
                      <div className="rpg-xp-fill" style={{ width: `${xpPct}%` }} />
                    </div>
                    <span className="rpg-xp-text">
                      {player.xp}/{player.xpToNext} XP
                    </span>
                  </div>
                  <div
                    className="rpg-dashboard-kit"
                    title="Using a gear skill in combat wears that piece; at 0 durability the skill is unavailable until you repair at the blacksmith."
                  >
                    <span className="rpg-kit-label">Gear</span>
                    <span className="rpg-kit-text" style={{ flex: 1, textAlign: 'right' }}>
                      Per-piece durability · repair at Blacksmith
                    </span>
                  </div>
                  {committedPlace && (
                    <div className="rpg-expedition-pin">
                      Expedition: <strong>{committedPlace.name}</strong> · {expeditionFightCount} win(s)
                    </div>
                  )}
                  <div className="rpg-dashboard-stats">
                    <div className="rpg-statline">
                      <span>
                        HP <strong>{fmt(player.hp)}</strong> / {fmt(maxStats.maxHp)}
                      </span>
                      <span>
                        STA <strong>{fmt(player.stamina)}</strong> / {fmt(maxStats.maxStamina)}
                      </span>
                      <span>
                        MP <strong>{fmt(player.mana)}</strong> / {fmt(maxStats.maxMana)}
                      </span>
                    </div>
                    <div
                      className="rpg-statline"
                      style={{ marginTop: '0.35rem' }}
                      title={`Base stats max ${MAX_PLAYER_STAT} each (level-ups & tomes). Innates stack on top for gear checks.`}
                    >
                      <span>
                        STR <strong>{effStats?.strength ?? player.stats.strength}</strong>
                      </span>
                      <span>
                        AGI <strong>{effStats?.agility ?? player.stats.agility}</strong>
                      </span>
                      <span>
                        INT <strong>{effStats?.intelligence ?? player.stats.intelligence}</strong>
                      </span>
                    </div>
                    {player.innates.length > 0 && (
                      <div className="rpg-innates-row" title="Rolled once at birth; second gift has 0.001% odds.">
                        Innate{player.innates.length > 1 ? 's' : ''}:{' '}
                        {player.innates.map((id) => (
                          <span key={id} className="rpg-innate-pill" title={INNATE_BY_ID[id]?.description ?? id}>
                            {formatInnateShort(id)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="rpg-skill-tier-row">
                      <div className="rpg-skill-tier" title="Attack menu lists one skill per equipped piece; stats unlock heavier gear.">
                        Combat skills · from equipped gear (see Equipment)
                      </div>
                    </div>
                    <div className="rpg-upgrades" title="Permanent upgrades">
                      <span>VIT {player.upgrades.vitality}</span>
                      <span>STR↑ {player.upgrades.striking}</span>
                      <span>ARC {player.upgrades.arcana}</span>
                      <span>END {player.upgrades.endurance}</span>
                    </div>
                    {(player.inventory.healthPotion > 0 ||
                      player.inventory.manaDraught > 0 ||
                      player.inventory.staminaBrew > 0 ||
                      Object.keys(player.salvageLoot).length > 0) && (
                        <div className="rpg-pack">
                          Pack: Red ×{player.inventory.healthPotion} · Blue ×{player.inventory.manaDraught} · Green ×
                          {player.inventory.staminaBrew}
                          {Object.keys(player.salvageLoot).length > 0 && (
                            <>
                              {' '}
                              · Salvage stacks:{' '}
                              <strong>
                                {Object.values(player.salvageLoot).reduce((a, n) => a + n, 0)}
                              </strong>
                            </>
                          )}
                        </div>
                      )}
                  </div>
                </section>
                <div className="rpg-log-column rpg-log-column--immersive rpg-sidebar-journal">
                  <div className="rpg-panel rpg-log-panel">
                    <div className="rpg-log-heading">Journal</div>
                    <div className="rpg-log" ref={logRef}>
                      {logLines.join('\n')}
                    </div>
                  </div>
                </div>
              </aside>
            ) : (
              <aside className="rpg-log-column rpg-log-column--immersive" aria-label="Adventure journal">
                <div className="rpg-panel rpg-log-panel">
                  <div className="rpg-log-heading">Journal</div>
                  <div className="rpg-log" ref={logRef}>
                    {logLines.join('\n')}
                  </div>
                </div>
              </aside>
            )}

            <div className="rpg-controls-column rpg-controls-column--immersive">
              <div className="rpg-controls-scroll">
                {enemy &&
                  battle &&
                  phase !== 'adventure' &&
                  phase !== 'name' &&
                  phase !== 'shop' &&
                  phase !== 'gear' &&
                  phase !== 'blacksmith' && (
                  <div className={`rpg-panel rpg-enemy${enemy.isBoss ? ' rpg-enemy--boss' : ''}`}>
                    <div className="rpg-statline">
                      <span>
                        {enemy.isBoss && <span className="rpg-enemy-boss-tag">Boss</span>}
                        <strong>{enemy.name}</strong>
                      </span>
                      <span className="rpg-loot-tag">
                        +{enemy.goldReward} <IconCoin size={16} /> · +{enemy.xpReward} XP
                      </span>
                    </div>
                    <div className="rpg-enemy-hp" style={{ marginTop: '0.4rem' }}>
                      <div className="rpg-enemy-hp-head">
                        <span className="rpg-enemy-hp-title">HP</span>
                        <span className="rpg-enemy-hp-values">
                          <strong>{fmt(battle.enemyHp)}</strong>
                          <span className="rpg-enemy-hp-sep">/</span>
                          {fmt(enemy.maxHp)}
                        </span>
                      </div>
                      <div
                        className="rpg-hpbar"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={enemy.maxHp}
                        aria-valuenow={battle.enemyHp}
                        aria-label={`${enemy.name} hit points`}
                      >
                        <div
                          className={`rpg-hpbar__fill rpg-hpbar__fill--${enemy.maxHp <= 0
                            ? 'mid'
                            : battle.enemyHp / enemy.maxHp > 0.66
                              ? 'high'
                              : battle.enemyHp / enemy.maxHp > 0.33
                                ? 'mid'
                                : 'low'
                            }`}
                          style={{
                            width: `${enemy.maxHp > 0 ? Math.max(0, Math.min(100, (battle.enemyHp / enemy.maxHp) * 100)) : 0}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="rpg-statline" style={{ marginTop: '0.35rem' }}>
                      <span />
                      <span>
                        Skill: <strong>{enemy.skill}</strong>
                      </span>
                    </div>
                  </div>
                )}

                {phase === 'shop' && player && (
                  <div className="rpg-shop rpg-shop--immersive">
                    <h2 className="rpg-shop-heading">Traveling merchant</h2>
                    <p className="rpg-shop-lead">
                      Spend gold on tonics, trainings, attribute tomes (+1 STR / AGI / INT to {MAX_PLAYER_STAT} each), and gear.
                      Battle junk stacks here; armor drops sell at ~40% of list price.
                    </p>
                    <div className="rpg-shop-filters" role="search">
                      <label className="rpg-shop-filter-field">
                        <span className="rpg-shop-filter-label">Search</span>
                        <input
                          type="search"
                          className="rpg-shop-search"
                          placeholder="Name, skill, slot, kit…"
                          value={shopSearchQuery}
                          onChange={(e) => setShopSearchQuery(e.target.value)}
                          autoComplete="off"
                        />
                      </label>
                      <label className="rpg-shop-filter-field">
                        <span className="rpg-shop-filter-label">Show</span>
                        <select
                          className="rpg-shop-select"
                          value={shopStockFilter}
                          onChange={(e) => setShopStockFilter(e.target.value as ShopStockFilter)}
                        >
                          <option value="all">All stock</option>
                          <option value="consumables">Tonics only</option>
                          <option value="upgrades">Vitality · Striking · Arcana · Endurance</option>
                          <option value="stat_tomes">Attribute tomes (STR · AGI · INT)</option>
                          <optgroup label="Gear by slot">
                            {COMBAT_GEAR_SLOT_ORDER.map((slot) => (
                              <option key={slot} value={slot}>
                                {EQUIPMENT_SLOT_LABELS[slot]}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Gear by kit (merchant)">
                            {GEAR_ARCHETYPE_ORDER.filter((a) => a !== 'mystic' && a !== 'legend').map(
                              (arch) => (
                                <option key={arch} value={arch}>
                                  {GEAR_ARCHETYPE_LABELS[arch]}
                                </option>
                              ),
                            )}
                          </optgroup>
                        </select>
                      </label>
                    </div>
                    {Object.keys(player.salvageLoot).some((id) => (player.salvageLoot[id] ?? 0) > 0) && (
                      <>
                        <h3 className="rpg-shop-subheading">Sell junk &amp; salvage</h3>
                        <p className="rpg-shop-lead rpg-shop-lead--tight">
                          Mob bits and clutter — one sale per click.
                        </p>
                        <ul className="rpg-shop-sell-list">
                          {Object.entries(player.salvageLoot)
                            .filter(([, count]) => count > 0)
                            .map(([sid]) => {
                              const s = SALVAGE_BY_ID[sid]
                              if (!s) return null
                              const n = player.salvageLoot[sid] ?? 0
                              return (
                                <li key={`salvage-${sid}`} className="rpg-shop-sell-row">
                                  <span className="rpg-shop-sell-name">
                                    {s.name} ×{n}
                                  </span>
                                  <span className="rpg-shop-sell-meta">
                                    +{s.sellPrice} <IconCoin size={14} /> each
                                  </span>
                                  <button type="button" className="rpg-tiny" onClick={() => sellSalvageStack(sid)}>
                                    Sell 1
                                  </button>
                                </li>
                              )
                            })}
                        </ul>
                      </>
                    )}
                    {player.gearOwned.length > 0 && (
                      <>
                        <h3 className="rpg-shop-subheading">Sell from pack</h3>
                        <p className="rpg-shop-lead rpg-shop-lead--tight">Only items in your pack (not worn). Each row sells one copy.</p>
                        <ul className="rpg-shop-sell-list">
                          {player.gearOwned.map((raw, idx) => {
                            const stack = normalizeGearStack(raw)
                            if (!stack) return null
                            const g = GEAR_BY_ID[stack.gearId]
                            if (!g) return null
                            const buy = merchantBuyPrice(g)
                            return (
                              <li key={`sell-${stack.gearId}-${idx}`} className="rpg-shop-sell-row">
                                <span className="rpg-shop-sell-name">{g.name}</span>
                                <span className="rpg-shop-sell-meta">
                                  {EQUIPMENT_SLOT_LABELS[g.slot]} · {formatDurabilityLine(stack)} · +{buy}{' '}
                                  <IconCoin size={14} />
                                </span>
                                <button type="button" className="rpg-tiny" onClick={() => sellGearFromPack(idx)}>
                                  Sell
                                </button>
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    )}
                    {showShopConsumables && filteredShopConsumables.length > 0 && (
                      <>
                        {shopStockFilter === 'all' && (
                          <h3 className="rpg-shop-subheading">Tonics &amp; draughts</h3>
                        )}
                        <div className="rpg-shop-grid">
                          {filteredShopConsumables.map((c) => (
                            <div key={c.id} className="rpg-shop-card rpg-motion-card">
                              <ShopIcon kind={c.icon} />
                              <div className="rpg-shop-card-body">
                                <strong>{c.name}</strong>
                                <p>{c.description}</p>
                                <button type="button" onClick={() => buyConsumable(c.id)}>
                                  Buy — {c.price} gold
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                    {showShopUpgrades && filteredShopUpgrades.length > 0 && (
                      <>
                        {shopStockFilter === 'all' && (
                          <h3 className="rpg-shop-subheading">Permanent upgrades</h3>
                        )}
                        <div className="rpg-shop-grid">
                          {filteredShopUpgrades.map((u) => {
                            const rank = player.upgrades[u.id]
                            const price = upgradePrice(u.basePrice, rank)
                            return (
                              <div key={u.id} className="rpg-shop-card rpg-shop-card-wide rpg-motion-card">
                                <ShopIcon kind={u.icon} />
                                <div className="rpg-shop-card-body">
                                  <strong>
                                    {u.name} <span className="rpg-rank">rank {rank}</span>
                                  </strong>
                                  <p>{u.description}</p>
                                  <button type="button" onClick={() => buyUpgrade(u.id)}>
                                    Upgrade — {price} gold
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                    {showShopStatTomes && filteredShopStatTomes.length > 0 && (
                      <>
                        {shopStockFilter === 'all' && (
                          <h3 className="rpg-shop-subheading">Attribute tomes</h3>
                        )}
                        <p className="rpg-shop-lead rpg-shop-lead--tight">
                          Elden-style scaling: each purchase raises one base stat by +1. Cost grows with your current STR /
                          AGI / INT. Innates still apply on top of these bases.
                        </p>
                        <div className="rpg-shop-grid">
                          {filteredShopStatTomes.map((t) => {
                            const cur = player.stats[t.stat]
                            const price = statTomePrice(cur)
                            const maxed = cur >= MAX_PLAYER_STAT
                            const affordable = player.gold >= price && Number.isFinite(price)
                            const shortStat = t.stat === 'strength' ? 'STR' : t.stat === 'agility' ? 'AGI' : 'INT'
                            return (
                              <div key={t.id} className="rpg-shop-card rpg-shop-card-wide rpg-motion-card">
                                <ShopIcon kind={t.icon} />
                                <div className="rpg-shop-card-body">
                                  <strong>{t.name}</strong>
                                  <p>{t.description}</p>
                                  <p className="rpg-gear-req-line">
                                    {shortStat} now <strong>{cur}</strong> / {MAX_PLAYER_STAT}
                                    {!maxed && (
                                      <>
                                        {' '}
                                        · next <strong>{price}</strong> <IconCoin size={14} />
                                      </>
                                    )}
                                  </p>
                                  <button
                                    type="button"
                                    disabled={maxed || !affordable}
                                    onClick={() => buyStatTome(t.id)}
                                  >
                                    {maxed ? `Max ${shortStat} (${MAX_PLAYER_STAT})` : `Study — ${price} gold`}
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}
                    {!shopHasBuyStock && (
                      <p className="rpg-shop-empty">
                        Nothing matches this filter or search — try “All stock” or clear the search box.
                      </p>
                    )}
                    {showShopGear && filteredShopGear.length > 0 && (
                      <>
                        <h3 className="rpg-shop-subheading">Arms &amp; armor</h3>
                        <p className="rpg-shop-lead rpg-shop-lead--tight">
                          Each piece grants one combat skill when worn. Mix slots to shape your kit — main hand and off-hand respect two-handed weapons.
                        </p>
                        <div className="rpg-shop-grid rpg-shop-grid--gear">
                          {filteredShopGear.map((g) => (
                            <div key={g.id} className="rpg-shop-card rpg-shop-card--gear rpg-motion-card">
                              <div className="rpg-shop-card-body">
                                <strong>{g.name}</strong>
                                <span className="rpg-gear-slot-pill">
                                  {EQUIPMENT_SLOT_LABELS[g.slot]}
                                  {g.twoHanded ? ' · Two-handed' : ''}
                                </span>
                                <span className="rpg-gear-archetype-pill" title="Gear kit">
                                  {GEAR_ARCHETYPE_LABELS[g.archetype]}
                                </span>
                                <p>{g.description}</p>
                                <p className="rpg-gear-req-line">Requires: {formatRequirements(g)}</p>
                                <p className="rpg-gear-skill-line">
                                  Skill: <strong>{g.skill.name}</strong> ({fmt(g.skill.damage)} ·{' '}
                                  {formatSkillResourceDef(g.skill)})
                                </p>
                                <button type="button" onClick={() => buyGear(g.id)}>
                                  Buy — {g.price} gold
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {phase === 'blacksmith' && player && (
                  <div className="rpg-gear rpg-gear--immersive">
                    <h2 className="rpg-shop-heading">Blacksmith</h2>
                    <p className="rpg-shop-lead">
                      Restore durability for gold. Broken gear cannot be worn until repaired — skills tied to that slot stay offline until then.
                    </p>
                    <h3 className="rpg-shop-subheading">Worn</h3>
                    {!COMBAT_GEAR_SLOT_ORDER.some((s) => player.equipment[s]) ? (
                      <p className="rpg-gear-pack-empty">Nothing worn.</p>
                    ) : (
                      <ul className="rpg-gear-pack-list">
                        {COMBAT_GEAR_SLOT_ORDER.filter((s) => player.equipment[s]).map((slot) => {
                          const id = player.equipment[slot]!
                          const g = GEAR_BY_ID[id]
                          if (!g) return null
                          const st = { gearId: id, durability: getSlotDurability(player, slot) }
                          const cost = repairCostForStack(st)
                          const needs = cost > 0
                          return (
                            <li key={`repair-slot-${slot}`} className="rpg-gear-pack-row">
                              <div className="rpg-gear-pack-main">
                                <strong>{g.name}</strong>
                                <span className="rpg-gear-slot-pill">{EQUIPMENT_SLOT_LABELS[slot]}</span>
                                <span className="rpg-gear-pack-dur">
                                  {' '}
                                  · {formatDurabilityLine(st)}
                                </span>
                              </div>
                              <span className="rpg-gear-pack-skill">{needs ? `${cost} gold` : 'Full'}</span>
                              <button
                                type="button"
                                className="rpg-tiny"
                                disabled={!needs}
                                onClick={() => repairEquippedSlot(slot)}
                              >
                                Repair
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                    <h3 className="rpg-shop-subheading">Pack</h3>
                    {player.gearOwned.length === 0 ? (
                      <p className="rpg-gear-pack-empty">Nothing in your pack.</p>
                    ) : (
                      <ul className="rpg-gear-pack-list">
                        {player.gearOwned.map((raw, idx) => {
                          const stack = normalizeGearStack(raw)
                          if (!stack) return null
                          const g = GEAR_BY_ID[stack.gearId]
                          if (!g) return null
                          const cost = repairCostForStack(stack)
                          const needs = cost > 0
                          return (
                            <li key={`repair-pack-${idx}`} className="rpg-gear-pack-row">
                              <div className="rpg-gear-pack-main">
                                <strong>{g.name}</strong>
                                <span className="rpg-gear-slot-pill">{EQUIPMENT_SLOT_LABELS[g.slot]}</span>
                                <span className="rpg-gear-pack-dur">
                                  {' '}
                                  · {formatDurabilityLine(stack)}
                                </span>
                              </div>
                              <span className="rpg-gear-pack-skill">{needs ? `${cost} gold` : 'Full'}</span>
                              <button
                                type="button"
                                className="rpg-tiny"
                                disabled={!needs}
                                onClick={() => repairPackRow(idx)}
                              >
                                Repair
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {phase === 'gear' && player && (
                  <div className="rpg-gear rpg-gear--immersive">
                    <h2 className="rpg-shop-heading">Equipment</h2>
                    <p className="rpg-shop-lead">
                      Dress each slot — earrings to sabatons. Each worn piece adds its skill to your Attack menu (stat gates apply).
                    </p>
                    {player.equipment.mainHand && GEAR_BY_ID[player.equipment.mainHand]?.twoHanded && (
                      <p className="rpg-gear-note">Two-handed weapon readied — off-hand is locked until you remove it.</p>
                    )}
                    <div className="rpg-gear-slots">
                      <div className="rpg-gear-slots-head">
                        <span>Slot</span>
                        <span>Worn</span>
                        <span />
                      </div>
                      {COMBAT_GEAR_SLOT_ORDER.map((slot) => {
                        const id = player.equipment[slot]
                        const piece = id ? GEAR_BY_ID[id] : null
                        const dur =
                          id && piece != null ? (
                            <span className="rpg-gear-dur">
                              {' '}
                              ({formatDurabilityLine({ gearId: id, durability: getSlotDurability(player, slot) })})
                            </span>
                          ) : null
                        return (
                          <div key={slot} className="rpg-gear-slot-row">
                            <span className="rpg-gear-slot-label">{EQUIPMENT_SLOT_LABELS[slot]}</span>
                            <span className="rpg-gear-slot-item">
                              {piece ? (
                                <>
                                  {piece.name}
                                  {dur}
                                  <span className="rpg-gear-slot-skill"> · {piece.skill.name}</span>
                                </>
                              ) : (
                                <span className="rpg-gear-slot-empty">Empty</span>
                              )}
                            </span>
                            {piece ? (
                              <button type="button" className="rpg-tiny" onClick={() => unequipSlot(slot)}>
                                Stow
                              </button>
                            ) : (
                              <span />
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <h3 className="rpg-shop-subheading">In your pack</h3>
                    {player.gearOwned.length === 0 ? (
                      <p className="rpg-gear-pack-empty">
                        Nothing here yet — buy gear or wait for drops; junk stacks as salvage (merchant). Sell spares in the shop.
                      </p>
                    ) : (
                      <ul className="rpg-gear-pack-list">
                        {player.gearOwned.map((raw, idx) => {
                          const stack = normalizeGearStack(raw)
                          if (!stack) return null
                          const g = GEAR_BY_ID[stack.gearId]
                          if (!g) return null
                          const broken = stack.durability <= 0
                          const offBlocked =
                            g.slot === 'offHand' &&
                            player.equipment.mainHand &&
                            GEAR_BY_ID[player.equipment.mainHand]?.twoHanded
                          const statBlocked = !playerMeetsStatRequirements(player, g)
                          return (
                            <li key={`${stack.gearId}-${idx}`} className="rpg-gear-pack-row">
                              <div className="rpg-gear-pack-main">
                                <strong>{g.name}</strong>
                                <span className="rpg-gear-slot-pill">
                                  {EQUIPMENT_SLOT_LABELS[g.slot]}
                                  {g.twoHanded ? ' · 2H' : ''}
                                </span>
                                <span className="rpg-gear-archetype-pill" title="Gear kit">
                                  {GEAR_ARCHETYPE_LABELS[g.archetype]}
                                </span>
                                <span className="rpg-gear-pack-dur" title="Durability">
                                  {' '}
                                  · {formatDurabilityLine(stack)}
                                </span>
                              </div>
                              <span className="rpg-gear-pack-skill">{g.skill.name}</span>
                              <button
                                type="button"
                                className="rpg-tiny"
                                disabled={!!offBlocked || statBlocked || broken}
                                title={
                                  broken
                                    ? 'Broken — repair at the blacksmith before wearing'
                                    : offBlocked
                                      ? 'Two-handed weapon uses both hands'
                                      : statBlocked
                                        ? `Requires ${formatRequirements(g)}`
                                        : 'Wear this piece'
                                }
                                onClick={() => equipFromBag(idx)}
                              >
                                Equip
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )}

                <div className="rpg-controls-body">{actions}</div>
              </div>
            </div>
          </div>

          <p className="rpg-meta">Browser RPG — progression auto-saves while you play.</p>
        </div>
      </div>
    </>
  )
}
