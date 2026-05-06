import {
  CLASS_SKILL_TREE_BRANCHES,
  CLASS_SKILL_TIERS,
  getSkillTierIndexForLevel,
  SKILL_TIER_ROMAN,
  tierLevelRangeLabel,
} from '../game/constants'
import type { PlayerState } from '../game/types'

function fmt(n: number) {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function SkillTreePanel({
  player,
  compact,
}: {
  player: PlayerState
  /** Omit heading / intro — use inside modal */
  compact?: boolean
}) {
  const tiers = CLASS_SKILL_TIERS[player.classKey]
  const branches = CLASS_SKILL_TREE_BRANCHES[player.classKey]
  const currentTier = getSkillTierIndexForLevel(player.level)

  return (
    <div
      className={`rpg-skill-tree${compact ? ' rpg-skill-tree--compact' : ''}`}
      aria-label={`${player.classLabel} skill tree`}
    >
      {!compact && (
        <>
          <div className="rpg-skill-tree-heading">Skill tree</div>
          <p className="rpg-skill-tree-lead">
            Three branches per tier. You wield the <strong>tier that matches your level</strong>; lower tiers are
            mastered, higher ones locked.
          </p>
        </>
      )}
      <div className="rpg-skill-tree-tiers">
        {tiers.map((tierSkills, tierIdx) => (
          <div key={tierIdx} className="rpg-skill-tree-tier">
            <div className="rpg-skill-tree-tier-head">
              <span className="rpg-skill-tree-tier-roman">Tier {SKILL_TIER_ROMAN[tierIdx]}</span>
              <span className="rpg-skill-tree-tier-lv">{tierLevelRangeLabel(tierIdx)}</span>
            </div>
            {tierSkills.map((sk, i) => {
              const state = tierIdx > currentTier ? 'locked' : tierIdx === currentTier ? 'active' : 'mastered'
              return (
                <div
                  key={`${tierIdx}-${i}-${sk.name}`}
                  className={`rpg-skill-node rpg-skill-node--${state}`}
                  title={
                    state === 'locked'
                      ? `Unlocks at tier ${SKILL_TIER_ROMAN[tierIdx]} (${tierLevelRangeLabel(tierIdx)})`
                      : undefined
                  }
                >
                  <span className="rpg-skill-node-branch">{branches[i]}</span>
                  <span className="rpg-skill-node-name">{sk.name}</span>
                  <span className="rpg-skill-node-meta">
                    {fmt(sk.damage)} dmg · {fmt(sk.manaCost)} MP
                  </span>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
