import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './App.css'
import { AdventurerPortrait, IconCoin, IconFullscreen, IconXpSpark, ShopIcon } from './components/GameIcons'
import {
  COMBAT_GEAR_SLOT_ORDER,
  describeEquipBlock,
  EQUIPMENT_SLOT_LABELS,
  formatRequirements,
  GEAR_BY_ID,
  GEAR_CATALOG,
  merchantBuyPrice,
  getCombatSkillEntries,
  playerMeetsStatRequirements,
  tryEquipFromBag,
  tryUnequipSlot,
} from './game/gear'
import {
  PLACES,
  SHOP_CONSUMABLES,
  SHOP_UPGRADES,
  STARTER_FREE_KIT,
  buildPlayer,
  rollEncounterForPlace,
  spawnEnemyFromRoll,
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
  tryBuyUpgrade,
  trySellGearFromBag,
  trySellSalvageStack,
  tryUseHealthPotion,
  tryUseManaDraught,
  tryUseStaminaBrew,
} from './game/progression'
import { rollBattleLoot } from './game/loot'
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
  Phase,
  PlaceDef,
  PlayerState,
  ShopConsumableId,
  ShopUpgradeId,
} from './game/types'

type Screen = 'menu' | 'game'

type ShopStockFilter = 'all' | 'consumables' | 'upgrades' | EquipmentSlotId

function isGearSlotStockFilter(f: ShopStockFilter): f is EquipmentSlotId {
  return f !== 'all' && f !== 'consumables' && f !== 'upgrades'
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

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => [...prev, line])
    queueMicrotask(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
    })
  }, [])

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
    setPhase('name')
    setPlayerNameInput('')
    setPlayer(null)
    setEnemy(null)
    setBattle(null)
    setLogLines(["Unknown Entity: What's your name, human?"])
  }, [saveSlotIndex])

  const goToMenu = useCallback(() => {
    setEnemy(null)
    setBattle(null)
    setPlayer(null)
    setPhase('name')
    setPlayerNameInput('')
    setLogLines([])
    setSaveSlotIndex(null)
    setScreen('menu')
    setHasSave(hasSavedGame())
  }, [])

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
  }, [])

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
          setLogLines(["Unknown Entity: What's your name, human?"])
          setGameBooting(false)
        })
      })
    })
  }, [])

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
    setPhase('adventure')
  }, [appendLog, playerNameInput])

  const beginEncounterAt = useCallback(
    (place: PlaceDef) => {
      if (!player) return
      const p = applyMaxCaps(player)
      setPlayer(p)
      if (p.level < place.levelMin) {
        appendLog(
          `⚠ ${place.name} is harsh for level ${p.level} (recommended ${place.levelRecommended}). You were warned.`,
        )
      }
      appendLog(`You travel to ${place.name}…`)
      const mobId = rollEncounterForPlace(place)
      const e = spawnEnemyFromRoll(mobId)
      setEnemy(e)
      setBattle({ enemyHp: e.hp, playerHp: p.hp })
      appendLog(
        `In ${place.shortName}, a ${e.name} appears! (~${e.goldReward} gold · ~${e.xpReward} XP)`,
      )
      setPhase('battle_menu')
    },
    [appendLog, player],
  )

  const runFromBattle = useCallback(() => {
    appendLog('You fled from combat.')
    appendLog('Pick another destination when you are ready.')
    setEnemy(null)
    setBattle(null)
    setPhase('adventure')
  }, [appendLog])

  const restAtInn = useCallback(() => {
    if (!player) return
    const m = getMaxStats(player)
    const hpFull = player.hp >= m.maxHp
    const mpFull = player.mana >= m.maxMana
    const staFull = player.stamina >= m.maxStamina
    if (hpFull && mpFull && staFull) {
      appendLog('You relax at the inn. HP, MP, and STA are already topped off.')
      return
    }
    setPlayer(applyMaxCaps({ ...player, hp: m.maxHp, mana: m.maxMana, stamina: m.maxStamina }))
    appendLog('You rest at the inn. HP, MP, and STA are fully restored.')
  }, [appendLog, player])

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
      setPlayer(nextPlayer)

      const b = { ...battle }
      b.enemyHp -= dmg
      const skillLine =
        entry.kind === 'gear' && entry.gearId
          ? `${sk.name} (${GEAR_BY_ID[entry.gearId]?.name ?? 'gear'})`
          : sk.name
      appendLog(`You use ${skillLine} — deals ${dmg} damage.`)

      if (b.enemyHp <= 0) {
        appendLog('You won!')
        let won: PlayerState = { ...nextPlayer, hp: b.playerHp }
        won.gold += enemy.goldReward
        appendLog(`Loot: +${enemy.goldReward} gold.`)

        const dropId = rollBattleLoot(enemy.id)
        if (dropId) {
          won = { ...won, gearOwned: [...won.gearOwned, dropId] }
          const dropName = GEAR_BY_ID[dropId]?.name ?? dropId
          appendLog(`Salvage drop: ${dropName} — sent to your pack (sell at the shop or equip under Equipment).`)
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
        appendLog('Where to next? Choose a region below.')
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
    [appendLog, battle, enemy, player, saveSlotIndex],
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
    (gearId: string) => {
      if (!player) return
      const result = trySellGearFromBag(player, gearId)
      if (!result) return
      const label = GEAR_BY_ID[gearId]?.name ?? gearId
      setPlayer(result.player)
      appendLog(`Sold ${label} to the merchant for ${result.goldGained} gold.`)
    },
    [appendLog, player],
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
    (itemId: string) => {
      if (!player) return
      const why = describeEquipBlock(player, itemId)
      if (why) {
        appendLog(why)
        return
      }
      const next = tryEquipFromBag(player, itemId)
      if (!next) return
      setPlayer(next)
      appendLog(`Equipped ${GEAR_BY_ID[itemId]?.name ?? itemId}.`)
    },
    [appendLog, player],
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
    if (phase === 'gear') return 'gear'
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
          <div className="rpg-actions">
            <button type="button" onClick={() => setPhase('shop')}>
              Open shop
            </button>
            <button type="button" onClick={() => setPhase('gear')}>
              Equipment
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
        <div className="rpg-actions">
          {combatSkills.map((ent, idx) => {
            const eff = getEffectiveSkillDamage(player, ent.skill)
            const mc = getEffectiveManaCost(player, ent.skill)
            const sc = getEffectiveStaminaCost(player, ent.skill)
            const costBits = [
              mc > 1e-9 ? `${fmt(mc)} MP` : null,
              sc > 1e-9 ? `${fmt(sc)} STA` : null,
            ].filter(Boolean)
            const costStr = costBits.length ? costBits.join(' · ') : 'Free'
            return (
              <button key={`${ent.label}-${idx}`} type="button" onClick={() => resolveTurn(idx)}>
                {idx + 1}. {ent.label} ({eff} · {costStr})
              </button>
            )
          })}
          <button type="button" onClick={() => setPhase('battle_menu')}>
            Back
          </button>
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

  const filteredShopGear = useMemo(() => {
    return GEAR_CATALOG.filter((g) => {
      if (shopStockFilter !== 'all') {
        if (!isGearSlotStockFilter(shopStockFilter)) return false
        if (g.slot !== shopStockFilter) return false
      }
      return shopTextMatches(
        shopSearchQuery,
        g.name,
        g.description,
        EQUIPMENT_SLOT_LABELS[g.slot],
        g.skill.name,
      )
    })
  }, [shopStockFilter, shopSearchQuery])

  const showShopConsumables = shopStockFilter === 'all' || shopStockFilter === 'consumables'
  const showShopUpgrades = shopStockFilter === 'all' || shopStockFilter === 'upgrades'
  const showShopGear = shopStockFilter === 'all' || isGearSlotStockFilter(shopStockFilter)

  const shopHasBuyStock =
    (showShopConsumables && filteredShopConsumables.length > 0) ||
    (showShopUpgrades && filteredShopUpgrades.length > 0) ||
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
          {player && maxStats ? (
            <section
              className={`rpg-panel rpg-dashboard rpg-dashboard-mood--${playMood}`}
              aria-label="Character"
            >
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
                  {(phase === 'shop' || phase === 'gear') && (
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
                  title="Innate gifts that award STR/AGI/INT count for gear requirements and are included here."
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
          ) : (
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
            <aside className="rpg-log-column rpg-log-column--immersive" aria-label="Adventure journal">
              <div className="rpg-panel rpg-log-panel">
                <div className="rpg-log-heading">Journal</div>
                <div className="rpg-log" ref={logRef}>
                  {logLines.join('\n')}
                </div>
              </div>
            </aside>

            <div className="rpg-controls-column rpg-controls-column--immersive">
              <div className="rpg-controls-scroll">
                {enemy && battle && phase !== 'adventure' && phase !== 'name' && phase !== 'shop' && (
                  <div className="rpg-panel rpg-enemy">
                    <div className="rpg-statline">
                      <span>
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
                      Spend gold on tonics, upgrades, and gear. Battle junk stacks here; armor drops sell at ~40% of list price.
                    </p>
                    <div className="rpg-shop-filters" role="search">
                      <label className="rpg-shop-filter-field">
                        <span className="rpg-shop-filter-label">Search</span>
                        <input
                          type="search"
                          className="rpg-shop-search"
                          placeholder="Name, skill, slot…"
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
                          <option value="upgrades">Stat upgrades</option>
                          <optgroup label="Gear by slot">
                            {COMBAT_GEAR_SLOT_ORDER.map((slot) => (
                              <option key={slot} value={slot}>
                                {EQUIPMENT_SLOT_LABELS[slot]}
                              </option>
                            ))}
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
                          {player.gearOwned.map((gid, idx) => {
                            const g = GEAR_BY_ID[gid]
                            if (!g) return null
                            const buy = merchantBuyPrice(g)
                            return (
                              <li key={`sell-${gid}-${idx}`} className="rpg-shop-sell-row">
                                <span className="rpg-shop-sell-name">{g.name}</span>
                                <span className="rpg-shop-sell-meta">
                                  {EQUIPMENT_SLOT_LABELS[g.slot]} · +{buy} <IconCoin size={14} />
                                </span>
                                <button type="button" className="rpg-tiny" onClick={() => sellGearFromPack(gid)}>
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
                        return (
                          <div key={slot} className="rpg-gear-slot-row">
                            <span className="rpg-gear-slot-label">{EQUIPMENT_SLOT_LABELS[slot]}</span>
                            <span className="rpg-gear-slot-item">
                              {piece ? (
                                <>
                                  {piece.name}
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
                        {player.gearOwned.map((gid, idx) => {
                          const g = GEAR_BY_ID[gid]
                          if (!g) return null
                          const offBlocked =
                            g.slot === 'offHand' &&
                            player.equipment.mainHand &&
                            GEAR_BY_ID[player.equipment.mainHand]?.twoHanded
                          const statBlocked = !playerMeetsStatRequirements(player, g)
                          return (
                            <li key={`${gid}-${idx}`} className="rpg-gear-pack-row">
                              <div className="rpg-gear-pack-main">
                                <strong>{g.name}</strong>
                                <span className="rpg-gear-slot-pill">
                                  {EQUIPMENT_SLOT_LABELS[g.slot]}
                                  {g.twoHanded ? ' · 2H' : ''}
                                </span>
                              </div>
                              <span className="rpg-gear-pack-skill">{g.skill.name}</span>
                              <button
                                type="button"
                                className="rpg-tiny"
                                disabled={!!offBlocked || statBlocked}
                                title={
                                  offBlocked
                                    ? 'Two-handed weapon uses both hands'
                                    : statBlocked
                                      ? `Requires ${formatRequirements(g)}`
                                      : 'Wear this piece'
                                }
                                onClick={() => equipFromBag(gid)}
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
