import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import './App.css'
import './theme-silk.css'
import './theme-grimoire.css'
import { AdventurerPortrait, IconCoin, IconFullscreen, IconXpSpark, ShopIcon } from './components/GameIcons'
import {
  COMBAT_GEAR_SLOT_ORDER,
  describeEquipBlock,
  EQUIPMENT_SLOT_LABELS,
  GEAR_ARCHETYPE_LABELS,
  GEAR_ARCHETYPE_ORDER,
  formatDurabilityLine,
  formatMitigationSummary,
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
import {
  aggregateLifeStealPercent,
  aggregateSanctuaryTakenMul,
  aggregateThornReflectPercent,
  applySurgeToOutgoingDamage,
  enemyAttackHits,
  formatInnateShort,
  getEffectiveStats,
  INNATE_BY_ID,
} from './game/innates'
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
  tryConsumeCleanseScroll,
  tryConsumeImmuneElixir,
  tryConsumeImmunePhilter,
  tryConsumeMightDraught,
  tryConsumePrismaticDraught,
  tryConsumeApexMightDraught,
  tryConsumeVeilPhilter,
  tryConsumeChampionCordial,
  tryRepairEquippedSlot,
  tryRepairGearInBag,
  trySellGearFromBag,
  trySellSalvageStack,
  getHealthPotionHeal,
  getManaDraughtRestore,
  getStaminaBrewRestore,
  getSunriseCordialRestore,
  tryUseHealthPotion,
  tryUseManaDraught,
  tryUseStaminaBrew,
  tryUseSunriseCordial,
} from './game/progression'
import { rollBattleLoot, rollBossExclusiveGear } from './game/loot'
import { SALVAGE_BY_ID, addSalvageStacks, rollSalvageLoot } from './game/salvage'
import {
  absorbDamageWithShield,
  cleanseAllStatuses,
  consumeEmpoweredBonus,
  consumeStunSkip,
  formatStatusLine,
  hasStun,
  mergeStatuses,
  splitSkillStatuses,
  tickBattleStatuses,
} from './game/statusEffects'
import {
  clearProgress,
  getAnySavedPlayer,
  hasSavedGame,
  listSlotSummaries,
  loadProgress,
  saveProgress,
} from './game/storage'
import {
  defaultSkillDamageKind,
  describeOutgoingAffinity,
  enemyTakenMultiplier,
  filterStunApplies,
  resolveIncomingDamageFromEnemy,
} from './game/combatMitigation'
import { filterIncomingPlayerApplies } from './game/incomingStatuses'
import { formatEquippedFacetRuntimeSummary, tryConsumeReviveFacet } from './game/facets'
import { warmGameCaches } from './game/warmup'
import { journalLineModifier } from './utils/journalLineClass'
import { PVP_HP_LOSS_THRESHOLD } from './game/pvpResolve'
import {
  applyStrikeFromSnapshot,
  buildInitialSnapshot,
  clonePlayer,
  passStunnedFromSnapshot,
  pvpOutcomeForRole,
  resolveContestToStrike,
} from './multiplayer/pvpCombatState'
import { computePvpGoldDelta } from './multiplayer/pvpSettlement'
import type { PvpCombatSnapshot, PvpLastContest } from './multiplayer/pvpProtocol'
import type { RpsChoice } from './multiplayer/pvpRps'
import { RPS_LABELS } from './multiplayer/pvpRps'
import { PvpSession } from './multiplayer/pvpSession'
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
import {
  THEME_IDS,
  applyThemeToDocument,
  readStoredTheme,
  themeShortLabel,
  writeStoredTheme,
  type ThemeId,
} from './theme'

type Screen = 'menu' | 'game' | 'settings'

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

function pvpRpsEmoji(c: RpsChoice) {
  return c === 'rock' ? '✊' : c === 'paper' ? '✋' : '✌️'
}

function ThemeSettings({
  themeId,
  onChange,
  variant = 'default',
}: {
  themeId: ThemeId
  onChange: (id: ThemeId) => void
  variant?: 'default' | 'ios'
}) {
  const isIos = variant === 'ios'
  const legendId = isIos ? 'rpg-theme-legend-ios' : 'rpg-theme-legend'
  return (
    <div
      className={isIos ? 'rpg-ios-appearance' : 'rpg-theme-settings'}
      role="group"
      aria-labelledby={legendId}
    >
      <span id={legendId} className={isIos ? 'rpg-ios-appearance__label' : 'rpg-theme-settings__legend'}>
        {isIos ? 'Interface style' : 'Theme'}
      </span>
      <div className={isIos ? 'rpg-ios-segment rpg-ios-segment--triple' : 'rpg-theme-settings__options'}>
        {THEME_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={
              isIos
                ? `rpg-ios-segment__btn${themeId === id ? ' rpg-ios-segment__btn--pressed' : ''}`
                : `rpg-theme-option${themeId === id ? ' rpg-theme-option--active' : ''}`
            }
            onClick={() => onChange(id)}
            aria-pressed={themeId === id}
          >
            {themeShortLabel(id)}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [settingsBackTarget, setSettingsBackTarget] = useState<'menu' | 'game'>('menu')
  const [themeId, setThemeId] = useState<ThemeId>(() => readStoredTheme())
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

  const pvpSessionRef = useRef<PvpSession | null>(null)
  const pvpRemoteProfileRef = useRef<PlayerState | null>(null)
  const pvpSentProfileRef = useRef(false)
  const pvpSyncedRef = useRef(false)
  const pvpCombatRef = useRef<PvpCombatSnapshot | null>(null)
  const [pvpRoomCode, setPvpRoomCode] = useState<string | null>(null)
  const [pvpJoinInput, setPvpJoinInput] = useState('')
  /** Host-configured wager before creating a room (guest sees rules from host). */
  const [pvpDuelBetInput, setPvpDuelBetInput] = useState('0')
  const [pvpStripeLoser, setPvpStripeLoser] = useState(false)
  const [pvpCombat, setPvpCombat] = useState<PvpCombatSnapshot | null>(null)
  const [pvpRole, setPvpRole] = useState<'host' | 'guest' | null>(null)
  const [pvpBusy, setPvpBusy] = useState(false)
  const [pvpErr, setPvpErr] = useState<string | null>(null)
  const pvpHostRpsRef = useRef<RpsChoice | null>(null)
  const pvpGuestRpsRef = useRef<RpsChoice | null>(null)
  const [pvpClashAnim, setPvpClashAnim] = useState<PvpLastContest | null>(null)
  const [pvpHitFlash, setPvpHitFlash] = useState(false)
  pvpCombatRef.current = pvpCombat

  const pvpHostDuelOptsRef = useRef<{ betGold: number; stripeLoser: boolean }>({
    betGold: 0,
    stripeLoser: false,
  })
  const pvpGuestDuelRulesRef = useRef<{ betGold: number; stripeLoser: boolean }>({
    betGold: 0,
    stripeLoser: false,
  })

  const resetExpedition = useCallback(() => {
    setCommittedPlace(null)
    setExpeditionFightCount(0)
  }, [])

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => [...prev, line])
  }, [])

  const teardownPvp = useCallback(() => {
    pvpSyncedRef.current = false
    pvpSessionRef.current?.disconnect()
    pvpSessionRef.current = null
    pvpRemoteProfileRef.current = null
    pvpSentProfileRef.current = false
    setPvpRoomCode(null)
    setPvpCombat(null)
    setPvpRole(null)
    setPvpErr(null)
    pvpHostRpsRef.current = null
    pvpGuestRpsRef.current = null
    setPvpClashAnim(null)
    setPvpHitFlash(false)
    pvpGuestDuelRulesRef.current = { betGold: 0, stripeLoser: false }
  }, [])

  const endPvpWithDelay = useCallback(() => {
    window.setTimeout(() => {
      teardownPvp()
      setPhase('multiplayer_hub')
    }, 120)
  }, [teardownPvp])

  const finishPvpWithOutcome = useCallback(
    (outcome: 'win' | 'loss') => {
      appendLog(outcome === 'win' ? 'You win the duel.' : 'You lose the duel.')
      const sess = pvpSessionRef.current
      const role = sess?.getRole()
      const snap = pvpCombatRef.current
      if (role && snap) {
        const delta = computePvpGoldDelta(snap, role, outcome)
        if (delta !== 0) {
          setPlayer((prev) => {
            if (!prev) return prev
            return { ...prev, gold: Math.max(0, prev.gold + delta) }
          })
          appendLog(
            delta > 0
              ? `You collect ${delta} gold from the wager.`
              : `You pay ${-delta} gold on the wager.`,
          )
        }
      }
      endPvpWithDelay()
    },
    [appendLog, endPvpWithDelay],
  )

  const applyPvpPhaseFromSnapshot = useCallback((snap: PvpCombatSnapshot) => {
    const sess = pvpSessionRef.current
    const role = sess?.getRole()
    if (!role) return
    if (pvpOutcomeForRole(snap, role)) return
    if (snap.pvpPhase === 'rps') {
      setPhase('pvp_rps')
      return
    }
    if (snap.pvpPhase === 'strike' && snap.attackerIsHost !== null) {
      const iAttack =
        (role === 'host' && snap.attackerIsHost) || (role === 'guest' && !snap.attackerIsHost)
      setPhase(iAttack ? 'pvp_pick_skill' : 'pvp_battle_menu')
    }
  }, [])

  const tryResolveRpsAsHost = useCallback(() => {
    const sess = pvpSessionRef.current
    const snap = pvpCombatRef.current
    if (!sess || sess.getRole() !== 'host' || !snap || snap.pvpPhase !== 'rps') return
    const hChoice = pvpHostRpsRef.current
    const gChoice = pvpGuestRpsRef.current
    if (!hChoice || !gChoice) return
    const next = resolveContestToStrike(snap, hChoice, gChoice)
    if (!next || next.attackerIsHost === null || !next.lastContest) return
    pvpHostRpsRef.current = null
    pvpGuestRpsRef.current = null
    setPvpCombat(next)
    sess.sendGame({ type: 'turn', snapshot: next })
    const role = sess.getRole()
    if (!role) return
    const strikerName = next.attackerIsHost ? snap.hostProfile.name : snap.guestProfile.name
    appendLog(
      next.lastContest.usedCoinFlip
        ? `Clash: ${next.lastContest.hostChoice} vs ${next.lastContest.guestChoice} — tie! Coin flip → ${strikerName} strikes.`
        : `Clash: ${next.lastContest.hostChoice} vs ${next.lastContest.guestChoice} — ${strikerName} wins the clash and strikes.`,
    )
    const outcome = pvpOutcomeForRole(next, role)
    if (outcome === 'win') {
      finishPvpWithOutcome('win')
    } else if (outcome === 'loss') {
      finishPvpWithOutcome('loss')
    } else {
      applyPvpPhaseFromSnapshot(next)
    }
  }, [applyPvpPhaseFromSnapshot, finishPvpWithOutcome])

  const hostSelectRps = useCallback(
    (choice: RpsChoice) => {
      const sess = pvpSessionRef.current
      const snap = pvpCombatRef.current
      if (!sess || sess.getRole() !== 'host' || !snap || snap.pvpPhase !== 'rps') return
      pvpHostRpsRef.current = choice
      appendLog(`You chose ${RPS_LABELS[choice]}.`)
      tryResolveRpsAsHost()
    },
    [appendLog, tryResolveRpsAsHost],
  )

  const guestSelectRps = useCallback(
    (choice: RpsChoice) => {
      const sess = pvpSessionRef.current
      const snap = pvpCombatRef.current
      if (!sess || sess.getRole() !== 'guest' || !snap || snap.pvpPhase !== 'rps') return
      const ok = sess.sendGame({ type: 'rps_pick', choice, contestSeq: snap.contestSeq })
      if (!ok) {
        appendLog('Could not send choice — connection lost.')
        return
      }
      appendLog(`You chose ${RPS_LABELS[choice]} — waiting for host to resolve the clash.`)
    },
    [appendLog],
  )

  const trySyncPvpBattle = useCallback(() => {
    const sess = pvpSessionRef.current
    const remote = pvpRemoteProfileRef.current
    const p = playerRef.current
    if (!sess || !remote || !p || !pvpSentProfileRef.current || pvpSyncedRef.current) return
    const role = sess.getRole()
    if (!role) return

    let duelBetGold = 0
    let stripeLoserMode = false
    if (role === 'host') {
      duelBetGold = pvpHostDuelOptsRef.current.betGold
      stripeLoserMode = pvpHostDuelOptsRef.current.stripeLoser
    } else {
      duelBetGold = pvpGuestDuelRulesRef.current.betGold
      stripeLoserMode = pvpGuestDuelRulesRef.current.stripeLoser
    }

    const hostP = role === 'host' ? p : remote
    const guestP = role === 'guest' ? p : remote

    if (duelBetGold > 0 && (hostP.gold < duelBetGold || guestP.gold < duelBetGold)) {
      appendLog(`Duel cancelled: both fighters need at least ${duelBetGold} gold for this wager.`)
      teardownPvp()
      setPhase('multiplayer_hub')
      return
    }

    const snap = buildInitialSnapshot(hostP, guestP, { duelBetGold, stripeLoserMode })
    pvpSyncedRef.current = true
    setPvpRole(role)
    setPvpCombat(snap)
    appendLog(`PvP rules: at ${PVP_HP_LOSS_THRESHOLD} HP or below you lose — no running away.`)
    appendLog(
      'Each exchange: Rock–Paper–Scissors; on a tie, a coin flip decides who strikes. Win the clash to attack.',
    )
    if (stripeLoserMode && duelBetGold > 0) {
      appendLog(
        `Wager: ante ${duelBetGold} gold each · Stripe loser — the defeated forfeits every coin they brought into the duel.`,
      )
    } else if (stripeLoserMode) {
      appendLog(`Wager: Stripe loser — the defeated forfeits every coin they brought into the duel.`)
    } else if (duelBetGold > 0) {
      appendLog(
        `Wager: ${duelBetGold} gold from loser to winner (both fighters needed at least ${duelBetGold} gold to begin).`,
      )
    }
    applyPvpPhaseFromSnapshot(snap)
  }, [appendLog, applyPvpPhaseFromSnapshot, setPhase, teardownPvp])

  const createPvpSessionInstance = useCallback(() => {
    return new PvpSession({
      onDataOpen: () => {
        const p = playerRef.current
        const sess = pvpSessionRef.current
        if (!p || !sess) return
        pvpSentProfileRef.current = true
        const role = sess.getRole()
        if (role === 'host') {
          const opts = pvpHostDuelOptsRef.current
          sess.sendGame({
            type: 'host_ready',
            profile: clonePlayer(p),
            duelBetGold: opts.betGold,
            stripeLoserMode: opts.stripeLoser,
          })
        } else {
          sess.sendGame({ type: 'profile', profile: clonePlayer(p) })
        }
        trySyncPvpBattle()
      },
      onGameMessage: (msg) => {
        if (msg.type === 'host_ready') {
          const loc = playerRef.current
          if (msg.duelBetGold > 0 && loc && loc.gold < msg.duelBetGold) {
            appendLog(
              `Cannot join: host wager requires ${msg.duelBetGold} gold but you only have ${loc.gold}.`,
            )
            teardownPvp()
            setPhase('multiplayer_hub')
            return
          }
          pvpGuestDuelRulesRef.current = {
            betGold: msg.duelBetGold,
            stripeLoser: msg.stripeLoserMode,
          }
          pvpRemoteProfileRef.current = msg.profile
          trySyncPvpBattle()
        }
        if (msg.type === 'profile') {
          pvpRemoteProfileRef.current = msg.profile
          trySyncPvpBattle()
        }
        if (msg.type === 'rps_pick') {
          const sess = pvpSessionRef.current
          if (!sess || sess.getRole() !== 'host') return
          const snap = pvpCombatRef.current
          if (!snap || msg.contestSeq !== snap.contestSeq || snap.pvpPhase !== 'rps') return
          pvpGuestRpsRef.current = msg.choice
          tryResolveRpsAsHost()
        }
        if (msg.type === 'turn') {
          setPvpCombat(msg.snapshot)
          if (msg.damage != null && msg.damage > 0) {
            appendLog(`PvP hit: ${msg.damage} damage.`)
            setPvpHitFlash(true)
            window.setTimeout(() => setPvpHitFlash(false), 450)
          }
          const sess = pvpSessionRef.current
          const role = sess?.getRole()
          if (!role) return
          const outcome = pvpOutcomeForRole(msg.snapshot, role)
          if (outcome === 'win') {
            finishPvpWithOutcome('win')
          } else if (outcome === 'loss') {
            finishPvpWithOutcome('loss')
          } else {
            applyPvpPhaseFromSnapshot(msg.snapshot)
          }
        }
      },
      onPeerGone: () => {
        appendLog('PvP link closed.')
        teardownPvp()
        setPhase('multiplayer_hub')
      },
      onSignalError: (m) => setPvpErr(m),
    })
  }, [
    appendLog,
    applyPvpPhaseFromSnapshot,
    finishPvpWithOutcome,
    setPhase,
    teardownPvp,
    tryResolveRpsAsHost,
    trySyncPvpBattle,
  ])

  const startPvpHost = useCallback(async () => {
    if (!player) return
    const parsedBet = Math.max(0, Math.floor(Number(pvpDuelBetInput) || 0))
    if (parsedBet > 0 && player.gold < parsedBet) {
      setPvpErr(`You need at least ${parsedBet} gold to post this wager.`)
      return
    }
    pvpHostDuelOptsRef.current = { betGold: parsedBet, stripeLoser: pvpStripeLoser }
    setPvpBusy(true)
    setPvpErr(null)
    teardownPvp()
    try {
      const session = createPvpSessionInstance()
      pvpSessionRef.current = session
      const code = await session.startHost()
      setPvpRoomCode(code)
      setPhase('pvp_host_wait')
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setPvpErr(msg)
      teardownPvp()
      setPhase('multiplayer_hub')
    } finally {
      setPvpBusy(false)
    }
  }, [player, createPvpSessionInstance, pvpDuelBetInput, pvpStripeLoser, teardownPvp])

  const joinPvpGuest = useCallback(async () => {
    if (!player) return
    setPvpBusy(true)
    setPvpErr(null)
    teardownPvp()
    try {
      const session = createPvpSessionInstance()
      pvpSessionRef.current = session
      await session.joinGuest(pvpJoinInput)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setPvpErr(msg)
      teardownPvp()
    } finally {
      setPvpBusy(false)
    }
  }, [player, createPvpSessionInstance, teardownPvp, pvpJoinInput])

  const resolvePvpStunnedPass = useCallback(() => {
    const sess = pvpSessionRef.current
    const snap = pvpCombatRef.current
    const role = sess?.getRole()
    if (!sess || !snap || !role) return
    const iAmHost = role === 'host'
    if (snap.attackerIsHost !== iAmHost) return

    const result = passStunnedFromSnapshot(snap)
    if (!result) {
      appendLog('You are not stunned — pick a technique.')
      applyPvpPhaseFromSnapshot(snap)
      return
    }

    setPvpCombat(result.next)
    sess.sendGame({ type: 'turn', snapshot: result.next, damage: result.damage })
    appendLog('You pass the turn (stunned).')

    const outcome = pvpOutcomeForRole(result.next, role)
    if (outcome === 'win') {
      finishPvpWithOutcome('win')
    } else if (outcome === 'loss') {
      finishPvpWithOutcome('loss')
    } else {
      applyPvpPhaseFromSnapshot(result.next)
    }
  }, [applyPvpPhaseFromSnapshot, finishPvpWithOutcome])

  const resolvePvpTurn = useCallback(
    (skillIndex: number) => {
      const sess = pvpSessionRef.current
      const snap = pvpCombatRef.current
      const role = sess?.getRole()
      if (!sess || !snap || !role) return
      const strikerIsHost = role === 'host'
      if (snap.attackerIsHost !== strikerIsHost) return

      const result = applyStrikeFromSnapshot(snap, skillIndex, strikerIsHost)
      if (!result) {
        appendLog('You cannot use that technique right now.')
        applyPvpPhaseFromSnapshot(snap)
        return
      }

      setPvpCombat(result.next)
      sess.sendGame({ type: 'turn', snapshot: result.next, damage: result.damage })
      if (result.damage > 0) appendLog(`PvP hit: ${result.damage} damage.`)

      const outcome = pvpOutcomeForRole(result.next, role)
      if (outcome === 'win') {
        finishPvpWithOutcome('win')
      } else if (outcome === 'loss') {
        finishPvpWithOutcome('loss')
      } else {
        applyPvpPhaseFromSnapshot(result.next)
      }
    },
    [appendLog, applyPvpPhaseFromSnapshot, finishPvpWithOutcome],
  )

  useEffect(() => {
    pvpHostRpsRef.current = null
    pvpGuestRpsRef.current = null
  }, [pvpCombat?.contestSeq])

  useEffect(() => {
    const lc = pvpCombat?.lastContest
    if (!lc) {
      setPvpClashAnim(null)
      return
    }
    setPvpClashAnim(lc)
    const t = window.setTimeout(() => setPvpClashAnim(null), 2800)
    return () => clearTimeout(t)
  }, [pvpCombat?.lastContest, pvpCombat?.seq])

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

  const onThemeChange = useCallback((id: ThemeId) => {
    setThemeId(id)
    writeStoredTheme(id)
    applyThemeToDocument(id)
  }, [])

  const openSettings = useCallback((from: 'menu' | 'game') => {
    setSettingsBackTarget(from)
    setScreen('settings')
  }, [])

  const closeSettings = useCallback(() => {
    setScreen(settingsBackTarget)
  }, [settingsBackTarget])

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
      setBattle({ enemyHp: e.hp, playerHp: p.hp, playerStatuses: [], enemyStatuses: [] })
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

  const grantPvEVictory = useCallback(
    (wonBase: PlayerState, enemyRef: EnemyState, prelude?: string) => {
      if (prelude) appendLog(prelude)
      appendLog('You won!')
      let won: PlayerState = wonBase
      won.gold += enemyRef.goldReward
      appendLog(`Loot: +${enemyRef.goldReward} gold.`)

      const dropId = enemyRef.isBoss ? rollBossExclusiveGear() : rollBattleLoot(enemyRef.id)
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

      const junkId = rollSalvageLoot(enemyRef.id)
      if (junkId) {
        won = addSalvageStacks(won, junkId, 1)
        const junkName = SALVAGE_BY_ID[junkId]?.name ?? junkId
        appendLog(`Loot: ${junkName} — junk stacks in salvage (sell at the merchant).`)
      }

      const xpGain = addXp(won, enemyRef.xpReward)
      won = xpGain.player
      appendLog(`Experience: +${enemyRef.xpReward} XP.`)
      xpGain.messages.forEach((m) => appendLog(m))

      setPlayer(won)
      setExpeditionFightCount((c) => c + 1)
      appendLog(
        'Victory — use “Next encounter” to stay in this region, or rest at the inn / go home for a new map. Boss odds rise with each win (Obsidian Depths).',
      )
      setEnemy(null)
      setBattle(null)
      setPhase('adventure')
    },
    [appendLog],
  )

  const resolveStunnedSkip = useCallback(() => {
    if (!player || !enemy || !battle) return

    const ticked = tickBattleStatuses(battle)
    let b = ticked.battle
    ticked.lines.forEach((line) => appendLog(line))

    if (b.playerHp <= 0) {
      const snap = applyMaxCaps({ ...player, hp: b.playerHp })
      const rev = tryConsumeReviveFacet(snap, getMaxStats(snap).maxHp)
      if (rev) {
        appendLog('A facet of revival shatters — you stagger up at half health!')
        const revived = applyMaxCaps({ ...rev.player, hp: rev.hp })
        setPlayer(revived)
        setBattle({
          enemyHp: b.enemyHp,
          playerHp: rev.hp,
          playerStatuses: b.playerStatuses,
          enemyStatuses: b.enemyStatuses,
        })
        setPhase('battle_menu')
        return
      }
      appendLog('You died.')
      if (saveSlotIndex !== null) clearProgress(saveSlotIndex)
      setHasSave(hasSavedGame())
      resetExpedition()
      setBattle(null)
      setEnemy(null)
      setPhase('done')
      return
    }

    if (b.enemyHp <= 0) {
      grantPvEVictory(applyMaxCaps({ ...player, hp: b.playerHp }), enemy, 'The foe succumbs to lingering effects!')
      return
    }

    let playerStatuses = consumeStunSkip(b.playerStatuses)
    appendLog('You are stunned and lose your turn.')

    let nextPlayer = applyMaxCaps({ ...player, hp: b.playerHp })

    if (!enemyAttackHits(nextPlayer)) {
      appendLog(`${enemy.name} tries ${enemy.skill} — you slip aside!`)
    } else {
      const incoming = resolveIncomingDamageFromEnemy(enemy, nextPlayer)
      const ctrl = filterIncomingPlayerApplies(
        nextPlayer,
        playerStatuses,
        enemy.playerStatusesOnHit ?? [],
      )
      nextPlayer = ctrl.player
      ctrl.logs.forEach((ln) => appendLog(ln))

      const abs = absorbDamageWithShield(playerStatuses, incoming.grossDamage)
      b.playerHp = Math.max(0, b.playerHp - abs.damageToHp)
      playerStatuses = mergeStatuses(abs.statuses, ctrl.applies)
      const soaked = incoming.grossDamage - abs.damageToHp
      const note = incoming.affinityNote
      appendLog(
        soaked > 0
          ? `${enemy.name} uses ${enemy.skill} (${incoming.atkKind}) — ${fmt(soaked)} absorbed by shield; you take ${fmt(abs.damageToHp)} to HP${note ? ` (${note})` : ''}.`
          : `${enemy.name} uses ${enemy.skill} — deals ${fmt(incoming.grossDamage)} ${incoming.atkKind} damage${note ? ` (${note})` : ''}.`,
      )
    }

    setBattle({
      enemyHp: b.enemyHp,
      playerHp: b.playerHp,
      playerStatuses,
      enemyStatuses: b.enemyStatuses,
    })

    if (b.playerHp <= 0) {
      const rev = tryConsumeReviveFacet(nextPlayer, getMaxStats(nextPlayer).maxHp)
      if (rev) {
        appendLog('A facet of revival shatters — you stagger up at half health!')
        const revived = applyMaxCaps({ ...rev.player, hp: rev.hp })
        setPlayer(revived)
        setBattle({
          enemyHp: b.enemyHp,
          playerHp: rev.hp,
          playerStatuses,
          enemyStatuses: b.enemyStatuses,
        })
        setPhase('battle_menu')
        return
      }
      appendLog('You died.')
      if (saveSlotIndex !== null) clearProgress(saveSlotIndex)
      setHasSave(hasSavedGame())
      resetExpedition()
      setBattle(null)
      setEnemy(null)
      setPhase('done')
      return
    }

    nextPlayer = applyMaxCaps({ ...nextPlayer, hp: b.playerHp })
    setPlayer(nextPlayer)
    setPhase('battle_menu')
  }, [appendLog, battle, enemy, grantPvEVictory, player, resetExpedition, saveSlotIndex])

  const resolveTurn = useCallback(
    (skillIndex: number) => {
      if (!player || !enemy || !battle) return

      const ticked = tickBattleStatuses(battle)
      let b = ticked.battle
      ticked.lines.forEach((line) => appendLog(line))

      if (b.playerHp <= 0) {
        const snap = applyMaxCaps({ ...player, hp: b.playerHp })
        const rev = tryConsumeReviveFacet(snap, getMaxStats(snap).maxHp)
        if (rev) {
          appendLog('A facet of revival shatters — you stagger up at half health!')
          const revived = applyMaxCaps({ ...rev.player, hp: rev.hp })
          setPlayer(revived)
          setBattle({
            enemyHp: b.enemyHp,
            playerHp: rev.hp,
            playerStatuses: b.playerStatuses,
            enemyStatuses: b.enemyStatuses,
          })
          setPhase('battle_menu')
          return
        }
        appendLog('You died.')
        if (saveSlotIndex !== null) clearProgress(saveSlotIndex)
        setHasSave(hasSavedGame())
        resetExpedition()
        setBattle(null)
        setEnemy(null)
        setPhase('done')
        return
      }

      if (b.enemyHp <= 0) {
        grantPvEVictory(applyMaxCaps({ ...player, hp: b.playerHp }), enemy, 'The foe succumbs to lingering effects!')
        return
      }

      if (hasStun(b.playerStatuses)) {
        appendLog('You are stunned and cannot attack.')
        setBattle(b)
        setPlayer(applyMaxCaps({ ...player, hp: b.playerHp }))
        setPhase('battle_menu')
        return
      }

      const entries = getCombatSkillEntries(player)
      const entry = entries[skillIndex]
      if (!entry) return
      const sk = entry.skill
      const mpCost = getEffectiveManaCost(player, sk)
      const staCost = getEffectiveStaminaCost(player, sk)

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

      const split = splitSkillStatuses(sk)
      const emp = consumeEmpoweredBonus(b.playerStatuses)
      let playerStatuses = emp.statuses
      const skillGearId = entry.kind === 'gear' ? entry.gearId : undefined
      let rawDmg = getEffectiveSkillDamage(player, sk, playerStatuses, skillGearId) + emp.bonus
      const surge = applySurgeToOutgoingDamage(player, rawDmg)
      rawDmg = surge.damage

      const dmgKind = defaultSkillDamageKind(sk)
      const affMult = enemyTakenMultiplier(enemy, dmgKind)
      const adjustedDmg = Math.max(0, Math.floor(rawDmg * affMult))
      const affNote = describeOutgoingAffinity(affMult)

      let onEnemyStatuses = split.onEnemy
      if (enemy.stunImmune) {
        const hadStun = onEnemyStatuses.some((s) => s.id === 'stunned')
        onEnemyStatuses = filterStunApplies(onEnemyStatuses, true)
        if (hadStun) appendLog(`${enemy.name} shrugs off the stun.`)
      }

      const enemyShield = absorbDamageWithShield(b.enemyStatuses, adjustedDmg)
      b.enemyHp = Math.max(0, b.enemyHp - enemyShield.damageToHp)
      let enemyStatuses = mergeStatuses(enemyShield.statuses, onEnemyStatuses)
      playerStatuses = mergeStatuses(playerStatuses, split.onSelf)

      const skillLine =
        entry.kind === 'gear' && entry.gearId
          ? `${sk.name} (${GEAR_BY_ID[entry.gearId]?.name ?? 'gear'})`
          : sk.name
      const soak = adjustedDmg - enemyShield.damageToHp
      const surgeBit = surge.surgeLabel ? ` ${surge.surgeLabel}!` : ''
      appendLog(
        soak > 0
          ? `You use ${skillLine} — ${fmt(adjustedDmg)} ${dmgKind}${affNote ? ` (${affNote})` : ''}${surgeBit}; ${fmt(soak)} absorbed by foe shield; ${fmt(enemyShield.damageToHp)} to HP.`
          : `You use ${skillLine} — deals ${fmt(adjustedDmg)} ${dmgKind} damage${affNote ? ` (${affNote})` : ''}.${surgeBit}`,
      )

      const lsPct = aggregateLifeStealPercent(nextPlayer)
      const hpToEnemy = enemyShield.damageToHp
      if (lsPct > 0 && hpToEnemy > 0) {
        const healAmt = Math.floor(hpToEnemy * (lsPct / 100))
        if (healAmt > 0) {
          const maxHp = getMaxStats(nextPlayer).maxHp
          const nh = Math.min(maxHp, b.playerHp + healAmt)
          const gained = nh - b.playerHp
          if (gained > 0) {
            b.playerHp = nh
            nextPlayer = { ...nextPlayer, hp: nh }
            appendLog(`Your innate drinks ${fmt(gained)} HP from the wound.`)
          }
        }
      }
      if (gearJustBroke && entry.kind === 'gear' && entry.gearId) {
        appendLog(
          `${GEAR_BY_ID[entry.gearId]?.name ?? 'Your gear'} breaks — repair at the blacksmith to use that skill again.`,
        )
      }

      if (b.enemyHp <= 0) {
        grantPvEVictory(applyMaxCaps({ ...nextPlayer, hp: b.playerHp }), enemy)
        return
      }

      if (!enemyAttackHits(nextPlayer)) {
        appendLog(`${enemy.name} tries ${enemy.skill} — you slip aside!`)
      } else {
        const incoming = resolveIncomingDamageFromEnemy(enemy, nextPlayer)
        const sanctuaryMul = aggregateSanctuaryTakenMul(nextPlayer)
        const grossAfterGift = Math.max(
          0,
          Math.floor(incoming.grossDamage * sanctuaryMul),
        )
        const ctrl = filterIncomingPlayerApplies(
          nextPlayer,
          playerStatuses,
          enemy.playerStatusesOnHit ?? [],
        )
        nextPlayer = ctrl.player
        ctrl.logs.forEach((ln) => appendLog(ln))

        const abs = absorbDamageWithShield(playerStatuses, grossAfterGift)
        b.playerHp = Math.max(0, b.playerHp - abs.damageToHp)
        playerStatuses = mergeStatuses(abs.statuses, ctrl.applies)
        const soaked = grossAfterGift - abs.damageToHp
        const note = incoming.affinityNote
        const giftNote = sanctuaryMul < 0.999 ? ' Innate sanctuary softens it.' : ''
        appendLog(
          soaked > 0
            ? `${enemy.name} uses ${enemy.skill} (${incoming.atkKind}) — ${fmt(soaked)} absorbed by shield; you take ${fmt(abs.damageToHp)} to HP${note ? ` (${note})` : ''}.${giftNote}`
            : `${enemy.name} uses ${enemy.skill} — deals ${fmt(grossAfterGift)} ${incoming.atkKind} damage${note ? ` (${note})` : ''}.${giftNote}`,
        )

        const thPct = aggregateThornReflectPercent(nextPlayer)
        const takenHp = abs.damageToHp
        if (thPct > 0 && takenHp > 0 && b.enemyHp > 0) {
          const echo = Math.floor(takenHp * (thPct / 100))
          if (echo > 0) {
            b.enemyHp = Math.max(0, b.enemyHp - echo)
            appendLog(`Thorn verdict — ${fmt(echo)} damage echoes into ${enemy.name}.`)
          }
        }

        if (b.enemyHp <= 0) {
          grantPvEVictory(applyMaxCaps({ ...nextPlayer, hp: b.playerHp }), enemy)
          return
        }
      }

      if (b.playerHp <= 0) {
        const rev = tryConsumeReviveFacet(nextPlayer, getMaxStats(nextPlayer).maxHp)
        if (rev) {
          appendLog('A facet of revival shatters — you stagger up at half health!')
          const revived = applyMaxCaps({ ...rev.player, hp: rev.hp })
          b.playerHp = rev.hp
          setPlayer(revived)
          setBattle({
            enemyHp: b.enemyHp,
            playerHp: rev.hp,
            playerStatuses,
            enemyStatuses,
          })
          setPhase('battle_menu')
          return
        }
        appendLog('You died.')
        if (saveSlotIndex !== null) clearProgress(saveSlotIndex)
        setHasSave(hasSavedGame())
        resetExpedition()
        setBattle(null)
        setEnemy(null)
        setPhase('done')
        return
      }

      nextPlayer = applyMaxCaps({ ...nextPlayer, hp: b.playerHp })
      setPlayer(nextPlayer)
      setBattle({
        enemyHp: b.enemyHp,
        playerHp: b.playerHp,
        playerStatuses,
        enemyStatuses,
      })
      setPhase('battle_menu')
    },
    [appendLog, battle, enemy, grantPvEVictory, player, resetExpedition, saveSlotIndex],
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
      const beforeHp = player.hp
      const beforeMana = player.mana
      const beforeSta = player.stamina
      let next: PlayerState | null = null
      if (kind === 'hp') next = tryUseHealthPotion(player)
      else if (kind === 'mana') next = tryUseManaDraught(player)
      else next = tryUseStaminaBrew(player)
      if (!next) return
      setPlayer(next)
      if (kind === 'hp') {
        appendLog(`You drink a Red Tonic (+${fmt(next.hp - beforeHp)} HP).`)
      } else if (kind === 'mana') {
        appendLog(`You drink a Blue Tonic (+${fmt(next.mana - beforeMana)} MP).`)
      } else {
        appendLog(`You drink a Green Tonic (+${fmt(next.stamina - beforeSta)} STA).`)
      }
    },
    [appendLog, player],
  )

  const useSunriseCordialAdventure = useCallback(() => {
    if (!player) return
    const beforeHp = player.hp
    const beforeMana = player.mana
    const beforeSta = player.stamina
    const next = tryUseSunriseCordial(player)
    if (!next) return
    setPlayer(next)
    appendLog(
      `You drink Sunrise Cordial (+${fmt(next.hp - beforeHp)} HP, +${fmt(next.mana - beforeMana)} MP, +${fmt(
        next.stamina - beforeSta,
      )} STA).`,
    )
  }, [appendLog, player])

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
      phase === 'confirm_home' ||
      phase === 'pvp_battle_menu' ||
      phase === 'pvp_pick_skill' ||
      phase === 'pvp_rps'
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
            <button type="button" onClick={() => setPhase('multiplayer_hub')}>
              Multiplayer
            </button>
            <button type="button" onClick={exitToMenu}>
              Save &amp; menu
            </button>
          </div>
          {player &&
            (player.inventory.healthPotion > 0 ||
              player.inventory.manaDraught > 0 ||
              player.inventory.staminaBrew > 0 ||
              player.inventory.sunriseCordial > 0) && (
              <div className="rpg-adventure-inventory">
                <div className="rpg-inventory-actions">
                  <span className="rpg-inventory-label">Tonics</span>
                  {player.inventory.healthPotion > 0 && (
                    <button
                      type="button"
                      className="rpg-tiny"
                      title={`~${fmt(getHealthPotionHeal(player))} HP (Vitality & max HP)`}
                      onClick={() => usePotionAdventure('hp')}
                    >
                      Red ×{player.inventory.healthPotion} (+{fmt(getHealthPotionHeal(player))})
                    </button>
                  )}
                  {player.inventory.manaDraught > 0 && (
                    <button
                      type="button"
                      className="rpg-tiny"
                      title={`~${fmt(getManaDraughtRestore(player))} MP (Arcana & max mana)`}
                      onClick={() => usePotionAdventure('mana')}
                    >
                      Blue ×{player.inventory.manaDraught} (+{fmt(getManaDraughtRestore(player))})
                    </button>
                  )}
                  {player.inventory.staminaBrew > 0 && (
                    <button
                      type="button"
                      className="rpg-tiny"
                      title={`~${fmt(getStaminaBrewRestore(player))} STA (Endurance & max stamina)`}
                      onClick={() => usePotionAdventure('sta')}
                    >
                      Green ×{player.inventory.staminaBrew} (+{fmt(getStaminaBrewRestore(player))})
                    </button>
                  )}
                  {player.inventory.sunriseCordial > 0 && (
                    <button
                      type="button"
                      className="rpg-tiny"
                      title={(() => {
                        const r = getSunriseCordialRestore(player)
                        return `~${fmt(r.hp)} HP / ${fmt(r.mana)} MP / ${fmt(r.stamina)} STA`
                      })()}
                      onClick={() => useSunriseCordialAdventure()}
                    >
                      Sunrise ×{player.inventory.sunriseCordial}
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
    if (phase === 'multiplayer_hub' && player) {
      const hostBetParsed = Math.max(0, Math.floor(Number(pvpDuelBetInput) || 0))
      const hostCantAffordAnte = hostBetParsed > 0 && player.gold < hostBetParsed
      return (
        <div className="rpg-mp-hub">
          <header className="rpg-mp-hub__hero">
            <h2 className="rpg-mp-hub__title">Multiplayer</h2>
            <p className="rpg-mp-hub__lead">
              Host gets a short code to share, or enter a friend&apos;s code to join their duel.
            </p>
          </header>

          <section className="rpg-mp-hub__panel" aria-labelledby="mp-host-heading">
            <h3 id="mp-host-heading" className="rpg-mp-hub__panel-title">
              Host a match
            </h3>
            <p className="rpg-mp-hub__panel-desc">You&apos;ll receive a 6-character code to give your opponent.</p>
            <div className="rpg-mp-hub__duel" role="group" aria-label="Duel stakes">
              <label className="rpg-mp-hub__label" htmlFor="pvp-duel-bet">
                Bet (gold){' '}
                <span className="rpg-mp-hub__label-hint">0 = casual · both need enough to start</span>
              </label>
              <input
                id="pvp-duel-bet"
                className="rpg-mp-hub__input rpg-mp-hub__input--narrow"
                type="number"
                inputMode="numeric"
                min={0}
                step={1}
                value={pvpDuelBetInput}
                onChange={(e) => setPvpDuelBetInput(e.target.value.replace(/[^\d]/g, ''))}
                aria-describedby="pvp-duel-bet-help"
              />
              <p id="pvp-duel-bet-help" className="rpg-mp-hub__duel-help">
                Your gold: <strong>{player.gold}</strong>. Loser pays this much to the winner (unless Stripe loser is on).
              </p>
              <label className="rpg-mp-hub__check">
                <input
                  type="checkbox"
                  checked={pvpStripeLoser}
                  onChange={(e) => setPvpStripeLoser(e.target.checked)}
                />
                Stripe loser — defeated player loses <strong>all</strong> gold they had when the duel began (winner
                receives it).
              </label>
            </div>
            <button
              type="button"
              className="rpg-mp-hub__cta"
              disabled={pvpBusy || hostCantAffordAnte}
              title={hostCantAffordAnte ? 'Not enough gold for this ante' : undefined}
              onClick={() => void startPvpHost()}
            >
              Create PVP room
            </button>
          </section>

          <section className="rpg-mp-hub__panel" aria-labelledby="mp-join-heading">
            <h3 id="mp-join-heading" className="rpg-mp-hub__panel-title">
              Join a match
            </h3>
            <label className="rpg-mp-hub__label" htmlFor="pvp-join-code">
              Room code <span className="rpg-mp-hub__label-hint">(6 letters / numbers)</span>
            </label>
            <div className="rpg-mp-hub__join">
              <div className="rpg-mp-hub__join-field">
                <input
                  id="pvp-join-code"
                  className="rpg-mp-hub__input"
                  placeholder="••••••"
                  value={pvpJoinInput}
                  onChange={(e) =>
                    setPvpJoinInput(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
                  }
                  maxLength={6}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  inputMode="text"
                  aria-label="Six character room code"
                />
              </div>
              <button
                type="button"
                className="rpg-mp-hub__cta"
                disabled={pvpBusy || pvpJoinInput.length !== 6}
                onClick={() => void joinPvpGuest()}
              >
                Join PVP room
              </button>
            </div>
          </section>

          <div className="rpg-mp-hub__soon" role="status">
            <span className="rpg-mp-hub__soon-tag">Soon</span>
            Dungeon run — cooperative runs with a friend.
          </div>

          {pvpErr && (
            <p className="rpg-mp-hub__err" role="alert">
              {pvpErr}
            </p>
          )}

          <details className="rpg-mp-hub__details">
            <summary className="rpg-mp-hub__details-sum">Advanced · self-hosting &amp; NAT</summary>
            <div className="rpg-mp-hub__details-body">
              <p>
                Uses <strong>PeerJS</strong> (<code className="rpg-code-inline">0.peerjs.com</code> by default). Optional
                env: <code className="rpg-code-inline">VITE_PEERJS_HOST</code>,{' '}
                <code className="rpg-code-inline">VITE_PEERJS_PATH</code>,{' '}
                <code className="rpg-code-inline">VITE_PEERJS_KEY</code>. For strict networks add TURN:{' '}
                <code className="rpg-code-inline">VITE_TURN_URLS</code> + credentials or{' '}
                <code className="rpg-code-inline">VITE_WEBRTC_ICE_SERVERS</code>.
              </p>
            </div>
          </details>

          <button
            type="button"
            className="rpg-mp-hub__back"
            onClick={() => {
              teardownPvp()
              setPhase('adventure')
            }}
          >
            ← Back to journey
          </button>
        </div>
      )
    }
    if (phase === 'pvp_host_wait' && player) {
      return (
        <div className="rpg-actions rpg-pvp-wait">
          <div className="rpg-pvp-wait__inner">
            <p className="rpg-pvp-wait__title">Waiting for opponent</p>
            <p className="rpg-pvp-wait__rules" aria-live="polite">
              {(() => {
                const o = pvpHostDuelOptsRef.current
                if (o.betGold <= 0 && !o.stripeLoser) return 'Casual duel — no gold stake.'
                const bits: string[] = []
                if (o.betGold > 0) bits.push(`${o.betGold}g ante`)
                if (o.stripeLoser) bits.push('Stripe loser')
                return `Stakes: ${bits.join(' · ')}.`
              })()}
            </p>
            <p className="rpg-pvp-wait__sub">Share this 6-character code:</p>
            <div className="rpg-pvp-room-code" aria-label="Room code">
              {(pvpRoomCode ?? '······')
                .padEnd(6, '·')
                .slice(0, 6)
                .split('')
                .map((ch, i) => (
                  <span key={`room-${i}`} className="rpg-pvp-room-code__digit">
                    {ch}
                  </span>
                ))}
            </div>
            <div className="rpg-pvp-wait__row">
              <button
                type="button"
                className="rpg-pvp-wait__btn rpg-pvp-wait__btn--primary"
                onClick={() => {
                  if (pvpRoomCode) void navigator.clipboard.writeText(pvpRoomCode)
                }}
              >
                Copy code
              </button>
              <button
                type="button"
                className="rpg-pvp-wait__btn rpg-pvp-wait__btn--ghost"
                disabled={pvpBusy}
                onClick={() => {
                  teardownPvp()
                  setPhase('multiplayer_hub')
                }}
              >
                Cancel
              </button>
            </div>
            <p className="rpg-pvp-wait__hint">The duel starts automatically when your opponent joins.</p>
            {pvpErr && (
              <p className="rpg-pvp-wait__err" role="alert">
                {pvpErr}
              </p>
            )}
          </div>
        </div>
      )
    }
    if (phase === 'pvp_rps' && player && pvpCombat && pvpRole) {
      const choices: RpsChoice[] = ['rock', 'paper', 'scissors']
      return (
        <div className="rpg-actions rpg-pvp-rps">
          <p className="rpg-pvp-rps__lead">
            Win Rock–Paper–Scissors to strike this exchange. Same throw → coin flip picks who attacks.
          </p>
          <div className="rpg-pvp-rps__grid">
            {choices.map((c) => (
              <button
                key={c}
                type="button"
                className="rpg-pvp-rps__btn"
                disabled={pvpBusy || pvpCombat.pvpPhase !== 'rps'}
                onClick={() => (pvpRole === 'host' ? hostSelectRps(c) : guestSelectRps(c))}
              >
                <span className="rpg-pvp-rps__emoji" aria-hidden>
                  {pvpRpsEmoji(c)}
                </span>
                {RPS_LABELS[c]}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="rpg-mp-hub__back"
            onClick={() => {
              teardownPvp()
              setPhase('multiplayer_hub')
            }}
          >
            Leave duel
          </button>
        </div>
      )
    }
    if (phase === 'pvp_battle_menu' && player && pvpCombat && pvpRole) {
      const iAmAttacker =
        pvpCombat.pvpPhase === 'strike' &&
        pvpCombat.attackerIsHost !== null &&
        ((pvpRole === 'host' && pvpCombat.attackerIsHost) ||
          (pvpRole === 'guest' && !pvpCombat.attackerIsHost))
      const waitingForStrike =
        pvpCombat.pvpPhase === 'strike' &&
        pvpCombat.attackerIsHost !== null &&
        !iAmAttacker
      const myStatuses = pvpRole === 'host' ? pvpCombat.hostStatuses : pvpCombat.guestStatuses
      const pvpStunned = iAmAttacker && hasStun(myStatuses ?? [])
      return (
        <div className="rpg-actions">
          {waitingForStrike && (
            <p className="rpg-shop-lead">
              Opponent won the clash — brace for their strike…
            </p>
          )}
          {iAmAttacker &&
            (pvpStunned ? (
              <button type="button" disabled={pvpBusy} onClick={() => resolvePvpStunnedPass()}>
                Pass turn (stunned)
              </button>
            ) : (
              <button
                type="button"
                disabled={pvpBusy}
                onClick={() => {
                  appendLog('Pick a technique:')
                  setPhase('pvp_pick_skill')
                }}
              >
                Attack
              </button>
            ))}
          <button
            type="button"
            onClick={() => {
              teardownPvp()
              setPhase('multiplayer_hub')
            }}
          >
            Leave duel
          </button>
        </div>
      )
    }
    if (phase === 'pvp_pick_skill' && player && pvpCombat && pvpRole) {
      const strikerProfile = pvpRole === 'host' ? pvpCombat.hostProfile : pvpCombat.guestProfile
      const combatSkills = getCombatSkillEntries(strikerProfile)
      return (
        <div className="rpg-actions rpg-skill-picker">
          <p className="rpg-skill-picker__hint">PvP — you won the clash; choose a technique</p>
          <div className="rpg-skill-picker__grid" role="list">
            {combatSkills.map((ent, idx) => {
              const strikerSt =
                pvpRole === 'host' ? pvpCombat.hostStatuses : pvpCombat.guestStatuses
              const eff = getEffectiveSkillDamage(
                strikerProfile,
                ent.skill,
                strikerSt ?? null,
                ent.kind === 'gear' ? ent.gearId : undefined,
              )
              const mc = getEffectiveManaCost(strikerProfile, ent.skill)
              const sc = getEffectiveStaminaCost(strikerProfile, ent.skill)
              const wear = ent.kind === 'gear' ? wearPerAttackUse(ent.skill) : null
              const gearName =
                ent.kind === 'gear' && ent.gearId ? GEAR_BY_ID[ent.gearId]?.name ?? null : null
              const accent =
                mc > 1e-9 && sc > 1e-9 ? 'mixed' : mc > 1e-9 ? 'mp' : sc > 1e-9 ? 'sta' : 'free'
              const ariaGear = gearName ? ` from ${gearName}` : ''
              return (
                <button
                  key={`pvp-${ent.label}-${idx}`}
                  type="button"
                  role="listitem"
                  className="rpg-skill-card"
                  data-accent={accent}
                  data-kind={ent.kind}
                  aria-label={`${idx + 1}. ${ent.skill.name}${ariaGear}, ${eff} damage`}
                  onClick={() => resolvePvpTurn(idx)}
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
            <button
              type="button"
              className="rpg-skill-back"
              onClick={() => {
                const s = pvpCombatRef.current
                if (s) applyPvpPhaseFromSnapshot(s)
              }}
            >
              ← Back
            </button>
          </div>
        </div>
      )
    }
    if (phase === 'battle_menu') {
      const stunned = !!(battle && hasStun(battle.playerStatuses))
      return (
        <div className="rpg-actions">
          {stunned ? (
            <button type="button" onClick={() => resolveStunnedSkip()}>
              Pass turn (stunned)
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                appendLog('Pick a skill:')
                setPhase('pick_skill')
              }}
            >
              Attack
            </button>
          )}
          <button
            type="button"
            disabled={stunned}
            title={stunned ? 'Cannot use items while stunned' : undefined}
            onClick={() => {
              if (
                player &&
                (player.inventory.healthPotion > 0 ||
                  player.inventory.manaDraught > 0 ||
                  player.inventory.staminaBrew > 0 ||
                  player.inventory.sunriseCordial > 0 ||
                  player.inventory.cleanseScroll > 0 ||
                  player.inventory.immunePhilter > 0 ||
                  player.inventory.immuneElixir > 0 ||
                  player.inventory.mightDraught > 0 ||
                  player.inventory.prismaticDraught > 0 ||
                  player.inventory.apexMightDraught > 0 ||
                  player.inventory.veilPhilter > 0 ||
                  player.inventory.championCordial > 0)
              ) {
                setPhase('use_item_battle')
              } else appendLog('No battle-usable items in your pack.')
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
              const eff = getEffectiveSkillDamage(
                player,
                ent.skill,
                battle?.playerStatuses ?? null,
                ent.kind === 'gear' ? ent.gearId : undefined,
              )
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
              title={`Restore up to ${fmt(getHealthPotionHeal(player))} HP (Vitality & max HP)`}
              onClick={() => {
                const before = player.hp
                const next = tryUseHealthPotion(player)
                if (next) {
                  setPlayer(next)
                  appendLog(`You drink a Red Tonic (+${fmt(next.hp - before)} HP).`)
                  setBattle((prev) => (prev ? { ...prev, playerHp: next.hp } : prev))
                  setPhase('battle_menu')
                }
              }}
            >
              Red tonic ×{player.inventory.healthPotion} (+{fmt(getHealthPotionHeal(player))} HP)
            </button>
          )}
          {player.inventory.manaDraught > 0 && (
            <button
              type="button"
              title={`Restore up to ${fmt(getManaDraughtRestore(player))} MP (Arcana & max mana)`}
              onClick={() => {
                const before = player.mana
                const next = tryUseManaDraught(player)
                if (next) {
                  setPlayer(next)
                  appendLog(`You drink a Blue Tonic (+${fmt(next.mana - before)} MP).`)
                  setPhase('battle_menu')
                }
              }}
            >
              Blue tonic ×{player.inventory.manaDraught} (+{fmt(getManaDraughtRestore(player))} MP)
            </button>
          )}
          {player.inventory.staminaBrew > 0 && (
            <button
              type="button"
              title={`Restore up to ${fmt(getStaminaBrewRestore(player))} STA (Endurance & max stamina)`}
              onClick={() => {
                const before = player.stamina
                const next = tryUseStaminaBrew(player)
                if (next) {
                  setPlayer(next)
                  appendLog(`You drink a Green Tonic (+${fmt(next.stamina - before)} STA).`)
                  setPhase('battle_menu')
                }
              }}
            >
              Green tonic ×{player.inventory.staminaBrew} (+{fmt(getStaminaBrewRestore(player))} STA)
            </button>
          )}
          {player.inventory.sunriseCordial > 0 && battle && (
            <button
              type="button"
              title="Restore HP, MP, and STA (~58% of each tonic’s potency)"
              onClick={() => {
                const beforeHp = player.hp
                const beforeMana = player.mana
                const beforeSta = player.stamina
                const next = tryUseSunriseCordial(player)
                if (next) {
                  setPlayer(next)
                  appendLog(
                    `You drink Sunrise Cordial (+${fmt(next.hp - beforeHp)} HP, +${fmt(next.mana - beforeMana)} MP, +${fmt(
                      next.stamina - beforeSta,
                    )} STA).`,
                  )
                  setBattle((prev) => (prev ? { ...prev, playerHp: next.hp } : prev))
                  setPhase('battle_menu')
                }
              }}
            >
              Sunrise cordial ×{player.inventory.sunriseCordial}
            </button>
          )}
          {player.inventory.cleanseScroll > 0 && battle && (
            <button
              type="button"
              onClick={() => {
                const next = tryConsumeCleanseScroll(player)
                if (next) {
                  setPlayer(next)
                  appendLog('You read a Cleanse Scroll — every buff and debuff slips away.')
                  setBattle({ ...battle, playerStatuses: cleanseAllStatuses() })
                  setPhase('battle_menu')
                }
              }}
            >
              Cleanse scroll ×{player.inventory.cleanseScroll}
            </button>
          )}
          {player.inventory.immunePhilter > 0 && battle && (
            <button
              type="button"
              onClick={() => {
                const next = tryConsumeImmunePhilter(player)
                if (next) {
                  setPlayer(next)
                  setBattle({
                    ...battle,
                    playerStatuses: mergeStatuses(battle.playerStatuses, [
                      { id: 'immune', turns: 5, potency: 0 },
                    ]),
                  })
                  appendLog('You drink a Spellbound Philter — Aegis wards stuns for 5 turns.')
                  setPhase('battle_menu')
                }
              }}
            >
              Spellbound Philter ×{player.inventory.immunePhilter}
            </button>
          )}
          {player.inventory.immuneElixir > 0 && battle && (
            <button
              type="button"
              onClick={() => {
                const next = tryConsumeImmuneElixir(player)
                if (next) {
                  setPlayer(next)
                  setBattle({
                    ...battle,
                    playerStatuses: mergeStatuses(battle.playerStatuses, [
                      { id: 'immune', turns: 10, potency: 0 },
                    ]),
                  })
                  appendLog('You drink the Greater Aegis Elixir — long immunity to stuns.')
                  setPhase('battle_menu')
                }
              }}
            >
              Aegis Elixir ×{player.inventory.immuneElixir}
            </button>
          )}
          {player.inventory.mightDraught > 0 && battle && (
            <button
              type="button"
              onClick={() => {
                const next = tryConsumeMightDraught(player)
                if (next) {
                  setPlayer(next)
                  setBattle({
                    ...battle,
                    playerStatuses: mergeStatuses(battle.playerStatuses, [
                      { id: 'might', turns: 5, potency: 12 },
                    ]),
                  })
                  appendLog('You drink Battle Might — muscles surge (+12 strike power, 5 turns).')
                  setPhase('battle_menu')
                }
              }}
            >
              Might draught ×{player.inventory.mightDraught}
            </button>
          )}
          {player.inventory.prismaticDraught > 0 && battle && (
            <button
              type="button"
              onClick={() => {
                const next = tryConsumePrismaticDraught(player)
                if (next) {
                  setPlayer(next)
                  setBattle({
                    ...battle,
                    playerStatuses: mergeStatuses(battle.playerStatuses, [
                      { id: 'shielded', turns: 5, potency: 58 },
                      { id: 'might', turns: 5, potency: 14 },
                    ]),
                  })
                  appendLog(
                    'You drink the Prismatic Bulwark — a prism shield rises and might floods your arms (+14 strike, 5 turns).',
                  )
                  setPhase('battle_menu')
                }
              }}
            >
              Prismatic bulwark ×{player.inventory.prismaticDraught}
            </button>
          )}
          {player.inventory.apexMightDraught > 0 && battle && (
            <button
              type="button"
              onClick={() => {
                const next = tryConsumeApexMightDraught(player)
                if (next) {
                  setPlayer(next)
                  setBattle({
                    ...battle,
                    playerStatuses: mergeStatuses(battle.playerStatuses, [
                      { id: 'might', turns: 5, potency: 24 },
                    ]),
                  })
                  appendLog('You uncork Apex Might — world-champion surge (+24 strike, 5 turns).')
                  setPhase('battle_menu')
                }
              }}
            >
              Apex Might ×{player.inventory.apexMightDraught}
            </button>
          )}
          {player.inventory.veilPhilter > 0 && battle && (
            <button
              type="button"
              onClick={() => {
                const next = tryConsumeVeilPhilter(player)
                if (next) {
                  setPlayer(next)
                  setBattle({
                    ...battle,
                    playerStatuses: mergeStatuses(battle.playerStatuses, [
                      { id: 'immune', turns: 8, potency: 0 },
                    ]),
                  })
                  appendLog('You drink the Veil Philter — Aegis silences stuns for eight turns.')
                  setPhase('battle_menu')
                }
              }}
            >
              Veil Philter ×{player.inventory.veilPhilter}
            </button>
          )}
          {player.inventory.championCordial > 0 && battle && (
            <button
              type="button"
              onClick={() => {
                const next = tryConsumeChampionCordial(player)
                if (next) {
                  setPlayer(next)
                  setBattle({
                    ...battle,
                    playerStatuses: mergeStatuses(battle.playerStatuses, [
                      { id: 'might', turns: 5, potency: 20 },
                      { id: 'immune', turns: 4, potency: 0 },
                    ]),
                  })
                  appendLog(
                    'You drink Champion Sovereign Cordial — crowned might (+20 strike) and aegis lace your veins.',
                  )
                  setPhase('battle_menu')
                }
              }}
            >
              Champion cordial ×{player.inventory.championCordial}
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
    applyPvpPhaseFromSnapshot,
    battle,
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
    resolveStunnedSkip,
    resolveTurn,
    exitToMenu,
    goToMenu,
    resetToName,
    runFromBattle,
    unequipSlot,
    usePotionAdventure,
    useSunriseCordialAdventure,
    committedPlace,
    expeditionFightCount,
    guestSelectRps,
    hostSelectRps,
    joinPvpGuest,
    pvpBusy,
    pvpCombat,
    pvpDuelBetInput,
    pvpStripeLoser,
    resolvePvpStunnedPass,
    pvpErr,
    pvpJoinInput,
    pvpRole,
    pvpRoomCode,
    resetExpedition,
    resolvePvpTurn,
    finishPvpWithOutcome,
    startPvpHost,
    teardownPvp,
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
          <h2 className="rpg-splash__title">The Denden's Adventure</h2>
          <p className="rpg-splash__tagline">Sharpening verbs… waxing the journal…</p>
          <div className="rpg-splash__track" aria-hidden>
            <div className="rpg-splash__track-fill" />
          </div>
        </div>
      </div>
    ) : null

  if (screen === 'settings') {
    return (
      <>
        {splashOverlay}
        <div
          className={`app-root app-root--fullscreen${splashPhase === 'gone' ? ' rpg-app-reveal' : ''}`}
        >
          <div className="rpg-shell rpg-shell--fullscreen rpg-settings-shell">
            <button
              type="button"
              className="rpg-fs-btn"
              title={browserFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              aria-label={browserFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
              onClick={toggleBrowserFullscreen}
            >
              <IconFullscreen expanded={browserFullscreen} size={20} />
            </button>
            <header className="rpg-ios-nav" aria-label="Settings navigation">
              <button type="button" className="rpg-ios-nav__back" onClick={closeSettings}>
                Back
              </button>
              <h1 className="rpg-ios-nav__title">Settings</h1>
            </header>

            <div className="rpg-ios-settings">
              <section className="rpg-ios-settings__group" aria-labelledby="rpg-settings-theme">
                <h2 id="rpg-settings-theme" className="rpg-ios-settings__header">
                  Theme
                </h2>
                <div className="rpg-ios-settings__inset">
                  <ThemeSettings themeId={themeId} onChange={onThemeChange} variant="ios" />
                </div>
              </section>

              <section className="rpg-ios-settings__group" aria-labelledby="rpg-settings-about">
                <h2 id="rpg-settings-about" className="rpg-ios-settings__header">
                  About
                </h2>
                <div className="rpg-ios-settings__inset">
                  <div className="rpg-ios-settings__row">
                    <span className="rpg-ios-settings__row-label">Game</span>
                    <span className="rpg-ios-settings__row-value">The Denden's Adventure</span>
                  </div>
                  <div className="rpg-ios-settings__row">
                    <span className="rpg-ios-settings__row-label">Traveler&apos;s Grimoire</span>
                    <span className="rpg-ios-settings__row-value">Parchment &amp; ink UI</span>
                  </div>
                </div>
              </section>
            </div>

            <p className="rpg-meta rpg-settings-meta">
              Theme: Classic (neobrutal), Silk (soft UI), or Grimoire (journal) — saved as “{themeShortLabel(themeId)}” on this device.
            </p>
          </div>
        </div>
      </>
    )
  }

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
          className={`app-root app-root--fullscreen h-screen w-screen${splashPhase === 'gone' ? ' rpg-app-reveal' : ''}`}
        >
          <div className="rpg-shell rpg-shell--fullscreen rpg-menu-shell h-screen w-screen">
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
            <div className="rpg-landing">
              <header className="rpg-landing-hero">
                <div className="rpg-landing-brand">
                  <div className="rpg-landing-portrait" aria-hidden>
                    <AdventurerPortrait size={76} />
                  </div>
                  <div className="rpg-landing-titles">
                    <p className="rpg-landing-eyebrow">Wela RPG</p>
                    <h1 className="rpg-menu-title">The Denden's Adventure</h1>
                    <p className="rpg-landing-tagline">
                      Gear-forged skills, regional expeditions, and birth innates — each save slot is its own hero on
                      this device.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="rpg-menu-settings-entry rpg-landing-settings"
                  onClick={() => openSettings('menu')}
                  disabled={gameBooting}
                >
                  <span className="rpg-menu-settings-entry__label">Settings</span>
                  <span className="rpg-menu-settings-entry__chev" aria-hidden>
                    ›
                  </span>
                </button>
              </header>

              <ul className="rpg-landing-features" aria-label="Game highlights">
                <li className="rpg-landing-feature">
                  <span className="rpg-landing-feature__mark" aria-hidden>
                    ⚔
                  </span>
                  <span className="rpg-landing-feature__text">Combat skills from everything you wear</span>
                </li>
                <li className="rpg-landing-feature">
                  <span className="rpg-landing-feature__mark" aria-hidden>
                    🗺
                  </span>
                  <span className="rpg-landing-feature__text">Regions, merchants, and scaled encounters</span>
                </li>
                <li className="rpg-landing-feature">
                  <span className="rpg-landing-feature__mark" aria-hidden>
                    ✦
                  </span>
                  <span className="rpg-landing-feature__text">Birth innates from modest to reality-bending</span>
                </li>
                <li className="rpg-landing-feature">
                  <span className="rpg-landing-feature__mark" aria-hidden>
                    💾
                  </span>
                  <span className="rpg-landing-feature__text">Three adventurers — pick a slot to begin</span>
                </li>
              </ul>

              {hasSave && (
                <p className="rpg-menu-save">You have one or more heroes saved on this device.</p>
              )}

              <h2 className="rpg-landing-section-title" id="menu-save-slots-heading">
                Your adventurers
              </h2>
              <div className="rpg-menu-slots" aria-labelledby="menu-save-slots-heading">
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
              <p className="rpg-meta rpg-landing-foot">Uses localStorage — clearing site data removes saves.</p>
            </div>
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
          {pvpClashAnim && pvpCombat && (
            <div className="pvp-clash-overlay" role="dialog" aria-live="polite" aria-label="Clash result">
              <div className="pvp-clash-overlay__card">
                <p className="pvp-clash-overlay__eyebrow">Clash</p>
                <div className="pvp-clash-overlay__hands">
                  <div className="pvp-clash-overlay__side">
                    <span className="pvp-clash-overlay__name">{pvpCombat.hostProfile.name}</span>
                    <span className={`pvp-clash-overlay__icon ${pvpClashAnim.usedCoinFlip ? 'pvp-clash-overlay__icon--shake' : ''}`}>
                      {pvpRpsEmoji(pvpClashAnim.hostChoice)}
                    </span>
                  </div>
                  <span className="pvp-clash-overlay__vs">VS</span>
                  <div className="pvp-clash-overlay__side">
                    <span className="pvp-clash-overlay__name">{pvpCombat.guestProfile.name}</span>
                    <span className={`pvp-clash-overlay__icon ${pvpClashAnim.usedCoinFlip ? 'pvp-clash-overlay__icon--shake' : ''}`}>
                      {pvpRpsEmoji(pvpClashAnim.guestChoice)}
                    </span>
                  </div>
                </div>
                {pvpClashAnim.usedCoinFlip && (
                  <div className="pvp-clash-overlay__coin-row">
                    <span className="pvp-clash-overlay__coin" aria-hidden>
                      ◉
                    </span>
                    <span>Tie — coin flip!</span>
                  </div>
                )}
                <p className="pvp-clash-overlay__strike">
                  <strong>
                    {pvpClashAnim.attackerIsHost ? pvpCombat.hostProfile.name : pvpCombat.guestProfile.name}
                  </strong>{' '}
                  strikes
                </p>
              </div>
            </div>
          )}
          {!(player && maxStats) && (
            <header className="rpg-hud rpg-hud-minimal">
              <div className="rpg-hud-title">
                <h1>The Denden's Adventure</h1>
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
                      {(phase === 'shop' ||
                        phase === 'gear' ||
                        phase === 'blacksmith' ||
                        phase === 'multiplayer_hub' ||
                        phase === 'pvp_host_wait' ||
                        phase === 'pvp_battle_menu' ||
                        phase === 'pvp_pick_skill' ||
                        phase === 'pvp_rps') && (
                          <button
                            type="button"
                            className="rpg-dashboard-back"
                            title="Return to the world map"
                            onClick={() => {
                              teardownPvp()
                              setPhase('adventure')
                            }}
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
                    {battle &&
                      enemy &&
                      battle.playerStatuses.length > 0 &&
                      (phase === 'battle_menu' ||
                        phase === 'pick_skill' ||
                        phase === 'use_item_battle' ||
                        phase === 'confirm_home') && (
                        <div className="rpg-statline" style={{ marginTop: '0.3rem' }} title="Combat effects">
                          <span style={{ flex: 1, fontSize: '0.88rem', opacity: 0.92 }}>
                            On you:{' '}
                            {battle.playerStatuses.map((s) => formatStatusLine(s)).join(' · ')}
                          </span>
                        </div>
                      )}
                    {pvpCombat &&
                      pvpRole &&
                      (phase === 'pvp_battle_menu' ||
                        phase === 'pvp_pick_skill' ||
                        phase === 'pvp_rps') &&
                      (pvpRole === 'host' ? pvpCombat.hostStatuses : pvpCombat.guestStatuses)
                        ?.length ? (
                      <div
                        className="rpg-statline rpg-pvp-status-line"
                        style={{ marginTop: '0.3rem' }}
                        title="Duel effects on you"
                      >
                        <span style={{ flex: 1, fontSize: '0.88rem', opacity: 0.92 }}>
                          Duel — on you:{' '}
                          {(pvpRole === 'host' ? pvpCombat.hostStatuses : pvpCombat.guestStatuses)!
                            .map((s) => formatStatusLine(s))
                            .join(' · ')}
                        </span>
                      </div>
                    ) : null}
                    {pvpCombat &&
                      pvpRole &&
                      (phase === 'pvp_battle_menu' ||
                        phase === 'pvp_pick_skill' ||
                        phase === 'pvp_rps') &&
                      formatEquippedFacetRuntimeSummary(player) && (
                        <div
                          className="rpg-statline rpg-pvp-facet-line"
                          style={{ marginTop: '0.25rem' }}
                          title="Facet charges on worn gear"
                        >
                          <span style={{ flex: 1, fontSize: '0.82rem', opacity: 0.9 }}>
                            Facets: {formatEquippedFacetRuntimeSummary(player)}
                          </span>
                        </div>
                      )}
                    {player.innates.length > 0 && (
                      <div
                        className="rpg-innates-row"
                        title="Birth gifts — flat/% damage, dodge, perfect evade, sanctuary, life steal, thorns, and surge all apply in combat (PvE journal may add matchup text and random REALITY SURGE)."
                      >
                        Innate{player.innates.length > 1 ? 's' : ''}:{' '}
                        {player.innates.map((id) => (
                          <span key={id} className="rpg-innate-pill" title={INNATE_BY_ID[id]?.description ?? id}>
                            {formatInnateShort(id)}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="rpg-skill-tier-row">
                      <div
                        className="rpg-skill-tier"
                        title="Listed dmg includes level, Striking, innate gifts, stats above gear requirements (overflow bonus), and Battle Might — not enemy matchup or random innate surge."
                      >
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
                      player.inventory.sunriseCordial > 0 ||
                      player.inventory.cleanseScroll > 0 ||
                      player.inventory.immunePhilter > 0 ||
                      player.inventory.immuneElixir > 0 ||
                      player.inventory.mightDraught > 0 ||
                      player.inventory.prismaticDraught > 0 ||
                      player.inventory.apexMightDraught > 0 ||
                      player.inventory.veilPhilter > 0 ||
                      player.inventory.championCordial > 0 ||
                      Object.keys(player.salvageLoot).length > 0) && (
                        <div className="rpg-pack">
                          Pack: Red ×{player.inventory.healthPotion} · Blue ×{player.inventory.manaDraught} · Green ×
                          {player.inventory.staminaBrew}
                          {player.inventory.sunriseCordial > 0 && (
                            <> · Sunrise ×{player.inventory.sunriseCordial}</>
                          )}
                          {player.inventory.cleanseScroll > 0 && (
                            <> · Cleanse ×{player.inventory.cleanseScroll}</>
                          )}
                          {player.inventory.immunePhilter > 0 && (
                            <> · Aegis (5) ×{player.inventory.immunePhilter}</>
                          )}
                          {player.inventory.immuneElixir > 0 && (
                            <> · Aegis (10) ×{player.inventory.immuneElixir}</>
                          )}
                          {player.inventory.mightDraught > 0 && (
                            <> · Might ×{player.inventory.mightDraught}</>
                          )}
                          {player.inventory.prismaticDraught > 0 && (
                            <> · Prism ×{player.inventory.prismaticDraught}</>
                          )}
                          {player.inventory.apexMightDraught > 0 && (
                            <> · Apex ×{player.inventory.apexMightDraught}</>
                          )}
                          {player.inventory.veilPhilter > 0 && (
                            <> · Veil ×{player.inventory.veilPhilter}</>
                          )}
                          {player.inventory.championCordial > 0 && (
                            <> · Champ ×{player.inventory.championCordial}</>
                          )}
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
                      {logLines.map((line, i) => (
                        <p key={i} className={`rpg-log-line ${journalLineModifier(line)}`}>
                          {line}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              </aside>
            ) : (
              <aside className="rpg-log-column rpg-log-column--immersive" aria-label="Adventure journal">
                <div className="rpg-panel rpg-log-panel">
                  <div className="rpg-log-heading">Journal</div>
                  <div className="rpg-log" ref={logRef}>
                    {logLines.map((line, i) => (
                      <p key={i} className={`rpg-log-line ${journalLineModifier(line)}`}>
                        {line}
                      </p>
                    ))}
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
                      {battle.enemyStatuses.length > 0 && (
                        <div className="rpg-statline" style={{ marginTop: '0.28rem' }} title="Foe effects">
                          <span style={{ flex: 1, fontSize: '0.88rem', opacity: 0.92 }}>
                            On foe:{' '}
                            {battle.enemyStatuses.map((s) => formatStatusLine(s)).join(' · ')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                {pvpCombat &&
                  pvpRole &&
                  player &&
                  (phase === 'pvp_battle_menu' ||
                    phase === 'pvp_pick_skill' ||
                    phase === 'pvp_rps') &&
                  (() => {
                    const oppProf =
                      pvpRole === 'host' ? pvpCombat.guestProfile : pvpCombat.hostProfile
                    const oppHp = pvpRole === 'host' ? pvpCombat.guestHp : pvpCombat.hostHp
                    const oppMax = getMaxStats(oppProf).maxHp
                    const myHp = pvpRole === 'host' ? pvpCombat.hostHp : pvpCombat.guestHp
                    const myMax = getMaxStats(pvpRole === 'host' ? pvpCombat.hostProfile : pvpCombat.guestProfile).maxHp
                    const oppStatuses =
                      pvpRole === 'host' ? pvpCombat.guestStatuses : pvpCombat.hostStatuses
                    const ratio = oppMax > 0 ? Math.max(0, Math.min(100, (oppHp / oppMax) * 100)) : 0
                    return (
                      <div
                        className={`rpg-panel rpg-enemy rpg-enemy--pvp${pvpHitFlash ? ' rpg-enemy--pvp-hit' : ''}`}
                      >
                        <div className="rpg-statline">
                          <span>
                            <strong>{oppProf.name}</strong>
                            <span className="rpg-loot-tag"> PvP opponent</span>
                          </span>
                        </div>
                        <div className="rpg-enemy-hp" style={{ marginTop: '0.4rem' }}>
                          <div className="rpg-enemy-hp-head">
                            <span className="rpg-enemy-hp-title">Their HP</span>
                            <span className="rpg-enemy-hp-values">
                              <strong>{fmt(oppHp)}</strong>
                              <span className="rpg-enemy-hp-sep">/</span>
                              {fmt(oppMax)}
                            </span>
                          </div>
                          <div
                            className="rpg-hpbar"
                            role="progressbar"
                            aria-valuemin={0}
                            aria-valuemax={oppMax}
                            aria-valuenow={oppHp}
                            aria-label={`${oppProf.name} hit points`}
                          >
                            <div
                              className={`rpg-hpbar__fill rpg-hpbar__fill--${ratio > 66 ? 'high' : ratio > 33 ? 'mid' : 'low'
                                }`}
                              style={{ width: `${ratio}%` }}
                            />
                          </div>
                        </div>
                        {oppStatuses && oppStatuses.length > 0 && (
                          <div className="rpg-statline rpg-pvp-opp-status-line" title="Effects on opponent">
                            <span style={{ flex: 1, fontSize: '0.88rem', opacity: 0.92 }}>
                              On them:{' '}
                              {oppStatuses.map((s) => formatStatusLine(s)).join(' · ')}
                            </span>
                          </div>
                        )}
                        {(pvpCombat.duelBetGold > 0 || pvpCombat.stripeLoserMode) && (
                          <p className="rpg-pvp-wager-line">
                            {pvpCombat.stripeLoserMode && pvpCombat.duelBetGold > 0 && (
                              <>
                                Ante {pvpCombat.duelBetGold}g · Stripe loser on — loser forfeits all duel-start gold.
                              </>
                            )}
                            {pvpCombat.stripeLoserMode && pvpCombat.duelBetGold <= 0 && (
                              <>Stripe loser — loser forfeits all duel-start gold.</>
                            )}
                            {!pvpCombat.stripeLoserMode && pvpCombat.duelBetGold > 0 && (
                              <>Wager: {pvpCombat.duelBetGold}g from loser to winner.</>
                            )}
                          </p>
                        )}
                        <p className="rpg-pvp-duel-hint">
                          Your duel HP: {fmt(myHp)} / {fmt(myMax)} — first to {PVP_HP_LOSS_THRESHOLD}{' '}
                          HP or below loses. Clash with R–P–S each exchange; tie → coin flip for strike order.
                        </p>
                      </div>
                    )
                  })()}

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
                      <section className="rpg-upgrade-board" aria-label="Permanent upgrades">
                        {shopStockFilter === 'all' && (
                          <h3 className="rpg-shop-subheading">Permanent upgrades</h3>
                        )}
                        <p className="rpg-shop-lead rpg-shop-lead--tight">
                          Stack ranks forever — each tier costs more gold. Applies across every save on this hero.
                        </p>
                        <div className="rpg-upgrade-strip" role="list">
                          {filteredShopUpgrades.map((u) => {
                            const rank = player.upgrades[u.id]
                            const price = upgradePrice(u.basePrice, rank)
                            const affordable = player.gold >= price
                            return (
                              <article
                                key={u.id}
                                className={`rpg-upgrade-card rpg-upgrade-card--${u.id} rpg-motion-card`}
                                role="listitem"
                              >
                                <header className="rpg-upgrade-card__head">
                                  <span className="rpg-upgrade-card__rank" title="Current rank">
                                    R{rank}
                                  </span>
                                  <div className="rpg-upgrade-card__icon-wrap" aria-hidden>
                                    <ShopIcon kind={u.icon} size={34} />
                                  </div>
                                </header>
                                <h4 className="rpg-upgrade-card__title">{u.name}</h4>
                                <p className="rpg-upgrade-card__desc">{u.description}</p>
                                <div className="rpg-upgrade-card__buy">
                                  <p className="rpg-upgrade-card__price">
                                    Next tier{' '}
                                    <strong>{price}</strong> <IconCoin size={14} />
                                    {!affordable && (
                                      <span className="rpg-upgrade-card__short"> · need more gold</span>
                                    )}
                                  </p>
                                  <button
                                    type="button"
                                    className="rpg-upgrade-card__cta"
                                    disabled={!affordable}
                                    onClick={() => buyUpgrade(u.id)}
                                  >
                                    {affordable ? `Upgrade — ${price}g` : `Need ${price}g`}
                                  </button>
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      </section>
                    )}
                    {showShopStatTomes && filteredShopStatTomes.length > 0 && (
                      <section className="rpg-stat-tome-board" aria-label="Attribute tomes">
                        {shopStockFilter === 'all' && (
                          <h3 className="rpg-shop-subheading">Attribute tomes</h3>
                        )}
                        <p className="rpg-shop-lead rpg-shop-lead--tight">
                          +1 base stat per tome. Price rises with that stat&apos;s current value — innates apply on top.
                        </p>
                        <div className="rpg-stat-tome-strip" role="list">
                          {filteredShopStatTomes.map((t) => {
                            const cur = player.stats[t.stat]
                            const price = statTomePrice(cur)
                            const maxed = cur >= MAX_PLAYER_STAT
                            const affordable = player.gold >= price && Number.isFinite(price)
                            const shortStat = t.stat === 'strength' ? 'STR' : t.stat === 'agility' ? 'AGI' : 'INT'
                            const pct = Math.min(100, Math.round((cur / MAX_PLAYER_STAT) * 100))
                            return (
                              <article
                                key={t.id}
                                className={`rpg-stat-tome-card rpg-stat-tome-card--${t.stat} rpg-motion-card`}
                                role="listitem"
                              >
                                <header className="rpg-stat-tome-card__head">
                                  <span className="rpg-stat-tome-card__badge" aria-hidden>
                                    {shortStat}
                                  </span>
                                  <div className="rpg-stat-tome-card__icon-wrap" aria-hidden>
                                    <ShopIcon kind={t.icon} size={34} />
                                  </div>
                                </header>
                                <h4 className="rpg-stat-tome-card__title">{t.name}</h4>
                                <p className="rpg-stat-tome-card__desc">{t.description}</p>
                                <div className="rpg-stat-tome-card__meter" aria-label={`${shortStat} progress toward cap`}>
                                  <div className="rpg-stat-tome-meter-track">
                                    <div className="rpg-stat-tome-meter-fill" style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="rpg-stat-tome-meter-label">
                                    <strong>{cur}</strong>
                                    <span className="rpg-stat-tome-meter-sep">/</span>
                                    {MAX_PLAYER_STAT}
                                  </span>
                                </div>
                                <div className="rpg-stat-tome-card__buy">
                                  {!maxed && (
                                    <p className="rpg-stat-tome-card__price">
                                      Next{' '}
                                      <strong>{price}</strong> <IconCoin size={14} />
                                      {!affordable && (
                                        <span className="rpg-stat-tome-card__short"> · need more gold</span>
                                      )}
                                    </p>
                                  )}
                                  <button
                                    type="button"
                                    className="rpg-stat-tome-card__cta"
                                    disabled={maxed || !affordable}
                                    onClick={() => buyStatTome(t.id)}
                                  >
                                    {maxed ? `At cap (${MAX_PLAYER_STAT})` : affordable ? `Study — ${price}g` : `Need ${price}g`}
                                  </button>
                                </div>
                              </article>
                            )
                          })}
                        </div>
                      </section>
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
                          {filteredShopGear.map((g) => {
                            const mitLine = formatMitigationSummary(g)
                            return (
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
                                  {mitLine ? <p className="rpg-gear-mitigation-line">{mitLine}</p> : null}
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
                            )
                          })}
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
                      <ul className="rpg-gear-pack-list rpg-gear-pack-list--cards">
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
                          const effDmg = getEffectiveSkillDamage(player, g.skill, null, g.id)
                          const mitLine = formatMitigationSummary(g)
                          return (
                            <li key={`${stack.gearId}-${idx}`} className="rpg-gear-pack-card">
                              <div className="rpg-gear-pack-card__body">
                                <header className="rpg-gear-pack-card__head">
                                  <strong className="rpg-gear-pack-card__title">{g.name}</strong>
                                  <div className="rpg-gear-pack-card__tags">
                                    <span className="rpg-gear-slot-pill">
                                      {EQUIPMENT_SLOT_LABELS[g.slot]}
                                      {g.twoHanded ? ' · 2H' : ''}
                                    </span>
                                    <span className="rpg-gear-archetype-pill" title="Gear kit">
                                      {GEAR_ARCHETYPE_LABELS[g.archetype]}
                                    </span>
                                  </div>
                                </header>
                                <p className="rpg-gear-pack-card__dur" title="Durability">
                                  {formatDurabilityLine(stack)}
                                </p>
                                <p className="rpg-gear-pack-card__flavor">{g.description}</p>
                                {mitLine ? (
                                  <p className="rpg-gear-mitigation-line rpg-gear-mitigation-line--pack">{mitLine}</p>
                                ) : null}
                                <p className="rpg-gear-pack-card__skill rpg-gear-skill-line rpg-gear-skill-line--pack">
                                  Skill: <strong>{g.skill.name}</strong> ({fmt(effDmg)} dmg ·{' '}
                                  {formatSkillResourceDef(g.skill)})
                                  {effDmg !== g.skill.damage && (
                                    <span className="rpg-gear-pack-base-hint" title="Listed weapon dice before bonuses">
                                      {' '}
                                      · base {g.skill.damage}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="rpg-gear-pack-card__equip"
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

          <div className="rpg-game-footer-actions">
            <button type="button" className="rpg-game-settings-link" onClick={() => openSettings('game')}>
              Settings
            </button>
          </div>
          <p className="rpg-meta">Browser RPG — progression auto-saves while you play.</p>
        </div>
      </div>
    </>
  )
}
