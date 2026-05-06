import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './App.css'
import { ClassPortrait, IconCoin, IconXpSpark, ShopIcon } from './components/GameIcons'
import {
  PLACES,
  SHOP_CONSUMABLES,
  SHOP_UPGRADES,
  buildPlayer,
  rollEncounterForPlace,
  spawnEnemyFromRoll,
  upgradePrice,
} from './game/constants'
import {
  addXp,
  applyMaxCaps,
  getEffectiveManaCost,
  getEffectiveSkillDamage,
  getMaxStats,
  tryBuyConsumable,
  tryBuyUpgrade,
  tryUseHealthPotion,
  tryUseManaDraught,
  tryUseStaminaBrew,
} from './game/progression'
import { clearProgress, hasSavedGame, loadProgress, saveProgress } from './game/storage'
import type {
  BattleState,
  ClassKey,
  EnemyState,
  Phase,
  PlaceDef,
  PlayerState,
  ShopConsumableId,
  ShopUpgradeId,
} from './game/types'

type Screen = 'menu' | 'game'

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [hasSave, setHasSave] = useState(() => hasSavedGame())
  const [phase, setPhase] = useState<Phase>('name')
  const [playerNameInput, setPlayerNameInput] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [player, setPlayer] = useState<PlayerState | null>(null)
  const [enemy, setEnemy] = useState<EnemyState | null>(null)
  const [battle, setBattle] = useState<BattleState | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const [logLines, setLogLines] = useState<string[]>([
    "Unknown Entity: What's your name, human?",
  ])

  const appendLog = useCallback((line: string) => {
    setLogLines((prev) => [...prev, line])
    queueMicrotask(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight })
    })
  }, [])

  useEffect(() => {
    if (screen === 'game' && player) {
      saveProgress(player)
      setHasSave(true)
    }
  }, [player, screen])

  const resetToName = useCallback(() => {
    clearProgress()
    setHasSave(false)
    setPhase('name')
    setPlayerNameInput('')
    setPlayerName('')
    setPlayer(null)
    setEnemy(null)
    setBattle(null)
    setLogLines(["Unknown Entity: What's your name, human?"])
  }, [])

  const goToMenu = useCallback(() => {
    setEnemy(null)
    setBattle(null)
    setPlayer(null)
    setPhase('name')
    setPlayerName('')
    setPlayerNameInput('')
    setLogLines([])
    setScreen('menu')
    setHasSave(hasSavedGame())
  }, [])

  const exitToMenu = useCallback(() => {
    if (player) saveProgress(player)
    setHasSave(hasSavedGame())
    goToMenu()
  }, [goToMenu, player])

  const handlePlay = useCallback(() => {
    const saved = loadProgress()
    setScreen('game')
    if (saved) {
      setPlayer(saved)
      setPlayerName(saved.name)
      setPlayerNameInput(saved.name)
      setPhase('adventure')
      setEnemy(null)
      setBattle(null)
      setLogLines([
        `Welcome back, ${saved.name}!`,
        'Saved progress loaded from this browser.',
        'Choose a destination — each region shows recommended levels.',
      ])
    } else {
      setPlayer(null)
      setPlayerName('')
      setPlayerNameInput('')
      setPhase('name')
      setEnemy(null)
      setBattle(null)
      setLogLines(["Unknown Entity: What's your name, human?"])
    }
  }, [])

  const handleNewGame = useCallback(() => {
    clearProgress()
    setHasSave(false)
    setScreen('game')
    setPlayer(null)
    setPlayerName('')
    setPlayerNameInput('')
    setEnemy(null)
    setBattle(null)
    setPhase('name')
    setLogLines(["Unknown Entity: What's your name, human?"])
  }, [])

  const startClass = useCallback(() => {
    const n = playerNameInput.trim()
    if (!n) return
    setPlayerName(n)
    setPhase('class')
    appendLog(`Hi ${n}. Choose your class.`)
  }, [appendLog, playerNameInput])

  const chooseClass = useCallback(
    (key: ClassKey) => {
      const p = applyMaxCaps(buildPlayer(key, playerName.trim() || playerNameInput.trim()))
      setPlayer(p)
      appendLog(`You chose to be a ${p.classLabel}.`)
      appendLog('Gold and XP drop from fights. Pick a region matching your level — or risk harder turf.')
      appendLog('Visit the shop anytime. Where will you go?')
      setPhase('adventure')
    },
    [appendLog, playerName, playerNameInput],
  )

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

  const confirmGoHome = useCallback(() => {
    appendLog('Go home and restart the expedition?')
    setPhase('confirm_home')
  }, [appendLog])

  const resolveTurn = useCallback(
    (skillIndex: number) => {
      if (!player || !enemy || !battle) return
      const sk = player.skills[skillIndex]
      const cost = getEffectiveManaCost(player, sk)
      const dmg = getEffectiveSkillDamage(player, sk)

      if (cost > player.mana + 1e-6) {
        appendLog(`Not enough mana for ${sk.name} (needs ${fmt(cost)}).`)
        setPhase('battle_menu')
        return
      }

      let nextPlayer: PlayerState = applyMaxCaps({
        ...player,
        mana: player.mana - cost,
      })
      setPlayer(nextPlayer)

      const b = { ...battle }
      b.enemyHp -= dmg
      appendLog(`You use ${sk.name} — deals ${dmg} damage.`)

      if (b.enemyHp <= 0) {
        appendLog('You won!')
        let won: PlayerState = { ...nextPlayer, hp: b.playerHp }
        won.gold += enemy.goldReward
        appendLog(`Loot: +${enemy.goldReward} gold.`)

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

      appendLog(`${enemy.name} uses ${enemy.skill} — deals ${enemy.damage} damage.`)
      b.playerHp -= enemy.damage

      if (b.playerHp <= 0) {
        appendLog('You died.')
        clearProgress()
        setHasSave(false)
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
    [appendLog, battle, enemy, player],
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
  const xpPct = player && player.xpToNext > 0 ? Math.min(100, (player.xp / player.xpToNext) * 100) : 0

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
          <button type="button" onClick={startClass}>
            Continue
          </button>
        </div>
      )
    }
    if (phase === 'class') {
      return (
        <div className="rpg-actions">
          <button type="button" onClick={() => chooseClass('warrior')}>
            1. Warrior
          </button>
          <button type="button" onClick={() => chooseClass('rogue')}>
            2. Rogue
          </button>
          <button type="button" onClick={() => chooseClass('mage')}>
            3. Mage
          </button>
        </div>
      )
    }
    if (phase === 'adventure') {
      return (
        <>
          <div className="rpg-places-section">
            <h3 className="rpg-places-heading">Choose a destination</h3>
            <div className="rpg-places-grid">
              {PLACES.map((place) => {
                const risky = player ? player.level < place.levelMin : false
                const ideal =
                  player && player.level >= place.levelMin && player.level <= place.levelMax
                return (
                  <button
                    type="button"
                    key={place.id}
                    className={`rpg-place-card${risky ? ' rpg-place-risky' : ''}${ideal ? ' rpg-place-ideal' : ''}`}
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
          <div className="rpg-actions">
            <button type="button" onClick={() => setPhase('shop')}>
              Open shop
            </button>
            <button type="button" onClick={() => appendLog('You stay at the inn.')}>
              Rest at inn
            </button>
            <button type="button" onClick={exitToMenu}>
              Save &amp; menu
            </button>
          </div>
          {player && (player.inventory.healthPotion > 0 || player.inventory.manaDraught > 0 || player.inventory.staminaBrew > 0) && (
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
      return (
        <div className="rpg-actions">
          {player.skills.map((sk, idx) => {
            const eff = getEffectiveSkillDamage(player, sk)
            const mc = getEffectiveManaCost(player, sk)
            return (
              <button key={`${sk.name}-${idx}`} type="button" onClick={() => resolveTurn(idx)}>
                {idx + 1}. {sk.name} ({eff} · {fmt(mc)} MP)
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
    beginEncounterAt,
    chooseClass,
    confirmGoHome,
    enemy,
    phase,
    player,
    playerNameInput,
    resolveTurn,
    exitToMenu,
    goToMenu,
    resetToName,
    runFromBattle,
    startClass,
    usePotionAdventure,
  ])

  if (screen === 'menu') {
    return (
      <div className="app-root">
        <div className="rpg-shell rpg-menu-shell">
          <h1 className="rpg-menu-title">Woods RPG</h1>
          <p className="rpg-menu-lead">Step into the woods. Your run is saved in this browser automatically.</p>
          {hasSave && <p className="rpg-menu-save">Found a saved adventurer on this device.</p>}
          <div className="rpg-menu-actions">
            <button type="button" className="rpg-menu-play" onClick={handlePlay}>
              Play
            </button>
            {hasSave && (
              <button type="button" className="rpg-menu-secondary" onClick={handleNewGame}>
                New game
              </button>
            )}
          </div>
          <p className="rpg-meta">Uses localStorage — clearing site data removes your save.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="app-root">
      <div className="rpg-shell">
        <header className="rpg-hud">
          <div className="rpg-hud-title">
            <h1>Woods RPG</h1>
            {player && (
              <div className="rpg-hud-hero">
                <ClassPortrait classKey={player.classKey} size={52} />
                <div className="rpg-hud-id">
                  <span className="rpg-hud-name">{player.name}</span>
                  <span className="rpg-hud-class">{player.classLabel}</span>
                </div>
              </div>
            )}
          </div>
          {player && (
            <div className="rpg-hud-stats">
              <div className="rpg-hud-row">
                <span className="rpg-hud-badge">
                  Lv <strong>{player.level}</strong>
                </span>
                <span className="rpg-hud-gold" title="Gold">
                  <IconCoin /> <strong>{player.gold}</strong>
                </span>
              </div>
              <div className="rpg-xp-wrap" title="Experience">
                <IconXpSpark />
                <div className="rpg-xp-bar">
                  <div className="rpg-xp-fill" style={{ width: `${xpPct}%` }} />
                </div>
                <span className="rpg-xp-text">
                  {player.xp}/{player.xpToNext} XP
                </span>
              </div>
            </div>
          )}
        </header>

        {player && maxStats && (
          <div className="rpg-panel rpg-player">
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
            <div className="rpg-statline" style={{ marginTop: '0.35rem' }}>
              <span>STR {player.stats.strength}</span>
              <span>AGI {player.stats.agility}</span>
              <span>INT {player.stats.intelligence}</span>
            </div>
            <div className="rpg-upgrades" title="Permanent upgrades">
              <span>VIT {player.upgrades.vitality}</span>
              <span>STR↑ {player.upgrades.striking}</span>
              <span>ARC {player.upgrades.arcana}</span>
              <span>END {player.upgrades.endurance}</span>
            </div>
            {(player.inventory.healthPotion > 0 ||
              player.inventory.manaDraught > 0 ||
              player.inventory.staminaBrew > 0) && (
              <div className="rpg-pack">
                Pack: Red ×{player.inventory.healthPotion} · Blue ×{player.inventory.manaDraught} · Green ×
                {player.inventory.staminaBrew}
              </div>
            )}
          </div>
        )}

        {!player && phase === 'name' && (
          <div className="rpg-panel rpg-player">
            <div>Enter your name to begin.</div>
          </div>
        )}

        {enemy && battle && phase !== 'adventure' && phase !== 'class' && phase !== 'name' && phase !== 'shop' && (
          <div className="rpg-panel rpg-enemy">
            <div className="rpg-statline">
              <span>
                <strong>{enemy.name}</strong>
              </span>
              <span className="rpg-loot-tag">
                +{enemy.goldReward} <IconCoin size={16} /> · +{enemy.xpReward} XP
              </span>
            </div>
            <div className="rpg-statline" style={{ marginTop: '0.35rem' }}>
              <span>
                HP <strong>{fmt(battle.enemyHp)}</strong>
              </span>
              <span>Skill: {enemy.skill}</span>
            </div>
          </div>
        )}

        <div className="rpg-panel">
          <div className="rpg-log" ref={logRef}>
            {logLines.join('\n')}
          </div>
        </div>

        {phase === 'shop' && player && (
          <div className="rpg-shop">
            <h2 className="rpg-shop-heading">Traveling merchant</h2>
            <p className="rpg-shop-lead">Spend gold on tonics and permanent upgrades. Prices scale per rank.</p>
            <div className="rpg-shop-grid">
              {SHOP_CONSUMABLES.map((c) => (
                <div key={c.id} className="rpg-shop-card">
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
              {SHOP_UPGRADES.map((u) => {
                const rank = player.upgrades[u.id]
                const price = upgradePrice(u.basePrice, rank)
                return (
                  <div key={u.id} className="rpg-shop-card rpg-shop-card-wide">
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
          </div>
        )}

        {actions}

        <p className="rpg-meta">Browser RPG — progression auto-saves while you play.</p>
      </div>
    </div>
  )
}
