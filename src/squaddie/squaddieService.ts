import { BattleSquaddie } from "../battle/battleSquaddie"
import { SquaddieAffiliation } from "./squaddieAffiliation"
import { SquaddieTemplate } from "../campaign/squaddieTemplate"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../battle/stats/inBattleAttributes"
import { getResultOrThrowError } from "../utils/resultOrError"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { DamageExplanation } from "../battle/history/battleAction/battleActionSquaddieChange"
import { ActionTemplateService } from "../action/template/actionTemplate"
import { isValidValue } from "../utils/objectValidityCheck"
import { BonusByProficiencyLevel, ProficiencyLevel } from "./armyAttributes"
import { Attribute } from "./attribute/attribute"
import {
    TargetBySquaddieAffiliationRelation,
    TTargetBySquaddieAffiliationRelation,
    TVersusSquaddieResistance,
} from "../action/template/actionEffectTemplate"
import { SearchPathAdapter } from "../search/searchPathAdapter/searchPathAdapter"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieTurnService } from "./turn"
import { EnumLike } from "../utils/enum"

export interface SquaddieActionPointsExplanation {
    unSpentActionPoints: number
    movementActionPoints: {
        previewedByPlayer: number
        spentButCanBeRefunded: number
        spentAndCannotBeRefunded: number
    }
}

export interface SquaddieArmorExplanation {
    net: number
    initial: number
}

export interface SquaddieVersusSquaddieResistanceExplanation {
    net: number
    initial: number
}

export interface SquaddieMovementExplanation {
    initial: {
        movementPerAction: number
        crossOverPits: boolean
        passThroughWalls: boolean
        ignoreTerrainCost: boolean
    }
    net: {
        movementPerAction: number
        crossOverPits: boolean
        passThroughWalls: boolean
        ignoreTerrainCost: boolean
    }
}

export const SquaddieService = {
    calculateDealtDamageToTheSquaddie: ({
        battleSquaddie,
        damage,
        damageType,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
        damage: number
        damageType: TDamage
    }): DamageExplanation => {
        const clonedInBattleAttributes: InBattleAttributes =
            InBattleAttributesService.clone(battleSquaddie.inBattleAttributes)
        return InBattleAttributesService.takeDamage({
            inBattleAttributes: clonedInBattleAttributes,
            damageToTake: damage,
            damageType,
        })
    },
    getActionPointSpend: ({
        battleSquaddie,
    }: {
        battleSquaddie: BattleSquaddie
    }): SquaddieActionPointsExplanation => {
        return SquaddieTurnService.getActionPointSpend(
            battleSquaddie.squaddieTurn
        )
    },
    searchPathCoordinatesByNumberOfMovementActions: ({
        searchPath,
        battleSquaddieId,
        repository,
    }: {
        searchPath: SearchPathAdapter
        battleSquaddieId: string
        repository: ObjectRepository
    }): { [movementActions: number]: HexCoordinate[] } => {
        const coordinatesByMoveAction: {
            [movementActions: number]: HexCoordinate[]
        } = {
            0: [searchPath[0].fromNode],
        }
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )

        let cumulativeMovementCost: number = 0
        searchPath.forEach((coordinateDescription) => {
            cumulativeMovementCost += coordinateDescription.cost
            let numberOfMovementActions: number = Math.ceil(
                cumulativeMovementCost /
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).net.movementPerAction
            )
            coordinatesByMoveAction[numberOfMovementActions] ||= []
            coordinatesByMoveAction[numberOfMovementActions].push(
                coordinateDescription.toNode
            )
        })
        return coordinatesByMoveAction
    },
    getHitPoints: ({
        squaddieTemplate,
        battleSquaddie,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): {
        currentHitPoints: number
        maxHitPoints: number
    } => {
        return getHitPoints({ squaddieTemplate, battleSquaddie })
    },
    canSquaddieActRightNow: ({
        squaddieTemplate,
        battleSquaddie,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): {
        canAct: boolean
        isDead: boolean
    } => {
        return canSquaddieActRightNow({ squaddieTemplate, battleSquaddie })
    },
    canPlayerControlSquaddieRightNow: ({
        squaddieTemplate,
        battleSquaddie,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): {
        squaddieHasThePlayerControlledAffiliation: boolean
        squaddieCanCurrentlyAct: boolean
        playerCanControlThisSquaddieRightNow: boolean
        squaddieIsNormallyControllableByPlayer: boolean
    } => {
        return canPlayerControlSquaddieRightNow({
            squaddieTemplate,
            battleSquaddie,
        })
    },
    giveHealingToTheSquaddie: ({
        battleSquaddie,
        healingAmount,
        healingType,
    }: {
        battleSquaddie: BattleSquaddie
        healingAmount: number
        healingType: THealing
    }): {
        healingReceived: number
    } => {
        return giveHealingToTheSquaddie({
            inBattleAttributes: battleSquaddie.inBattleAttributes,
            healingAmount,
            healingType,
        })
    },
    calculateGiveHealingToTheSquaddie: ({
        battleSquaddie,
        healingAmount,
        healingType,
    }: {
        battleSquaddie: BattleSquaddie
        healingAmount: number
        healingType: THealing
    }): {
        healingReceived: number
    } => {
        return giveHealingToTheSquaddie({
            inBattleAttributes: InBattleAttributesService.clone(
                battleSquaddie.inBattleAttributes
            ),
            healingAmount,
            healingType,
        })
    },
    getArmorClass: ({
        squaddieTemplate,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): SquaddieArmorExplanation => {
        return getArmorClass({ squaddieTemplate })
    },
    isSquaddieAlive: ({
        squaddieTemplate,
        battleSquaddie,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): boolean =>
        isSquaddieAlive({
            squaddieTemplate,
            battleSquaddie,
        }),
    getActionsThatTargetAlly: ({
        squaddieTemplate,
        objectRepository,
    }: {
        squaddieTemplate: SquaddieTemplate
        objectRepository: ObjectRepository
    }): string[] =>
        getActionsBasedOnTargetType({
            squaddieTemplate,
            objectRepository,
            targetBySquaddieAffiliationRelation:
                TargetBySquaddieAffiliationRelation.TARGET_ALLY,
        }),
    getActionsThatTargetFoe: ({
        squaddieTemplate,
        objectRepository,
    }: {
        squaddieTemplate: SquaddieTemplate
        objectRepository: ObjectRepository
    }): string[] =>
        getActionsBasedOnTargetType({
            squaddieTemplate,
            objectRepository,
            targetBySquaddieAffiliationRelation:
                TargetBySquaddieAffiliationRelation.TARGET_FOE,
        }),
    getActionsThatTargetSelf: ({
        squaddieTemplate,
        objectRepository,
    }: {
        squaddieTemplate: SquaddieTemplate
        objectRepository: ObjectRepository
    }): string[] =>
        getActionsBasedOnTargetType({
            squaddieTemplate,
            objectRepository,
            targetBySquaddieAffiliationRelation:
                TargetBySquaddieAffiliationRelation.TARGET_SELF,
        }),
    getSquaddieMovementAttributes: ({
        squaddieTemplate,
        battleSquaddie,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): SquaddieMovementExplanation => {
        return InBattleAttributesService.calculateCurrentAttributeModifiers(
            battleSquaddie.inBattleAttributes
        ).reduce(
            (currentMovementAttributes, attributeModifier) => {
                if (attributeModifier.type === Attribute.MOVEMENT) {
                    currentMovementAttributes.net.movementPerAction +=
                        attributeModifier.amount
                }
                if (attributeModifier.type === Attribute.HUSTLE)
                    currentMovementAttributes.net.ignoreTerrainCost = true
                return currentMovementAttributes
            },
            {
                initial: {
                    movementPerAction:
                        squaddieTemplate.attributes.movement.movementPerAction,
                    crossOverPits:
                        squaddieTemplate.attributes.movement.crossOverPits,
                    passThroughWalls:
                        squaddieTemplate.attributes.movement.passThroughWalls,
                    ignoreTerrainCost:
                        squaddieTemplate.attributes.movement.ignoreTerrainCost,
                },
                net: {
                    movementPerAction:
                        squaddieTemplate.attributes.movement.movementPerAction,
                    crossOverPits:
                        squaddieTemplate.attributes.movement.crossOverPits,
                    passThroughWalls:
                        squaddieTemplate.attributes.movement.passThroughWalls,
                    ignoreTerrainCost:
                        squaddieTemplate.attributes.movement.ignoreTerrainCost,
                },
            }
        )
    },
    getVersusSquaddieResistanceProficiencyBonus: ({
        squaddieTemplate,
        versusSquaddieResistance,
    }: {
        squaddieTemplate: SquaddieTemplate
        versusSquaddieResistance: TVersusSquaddieResistance
    }): SquaddieVersusSquaddieResistanceExplanation => {
        const proficiencyLevel =
            squaddieTemplate.attributes.versusProficiencyLevels[
                versusSquaddieResistance
            ]

        if (proficiencyLevel === ProficiencyLevel.UNTRAINED) {
            return {
                net: 0,
                initial: 0,
            }
        }

        const tier = squaddieTemplate.attributes.tier
        return {
            net: tier + (BonusByProficiencyLevel[proficiencyLevel] ?? 0),
            initial: tier,
        }
    },
}

const getArmorClass = ({
    squaddieTemplate,
}: {
    squaddieTemplate: SquaddieTemplate
}): SquaddieArmorExplanation => {
    const baseArmor = 6

    const tierProficiencyBonus =
        squaddieTemplate.attributes.armor.proficiencyLevel !==
        ProficiencyLevel.UNTRAINED
            ? squaddieTemplate.attributes.tier
            : 0

    return {
        initial: baseArmor + squaddieTemplate.attributes.armor.base,
        net:
            baseArmor +
            BonusByProficiencyLevel[
                squaddieTemplate.attributes.armor.proficiencyLevel
            ] +
            squaddieTemplate.attributes.armor.base +
            tierProficiencyBonus,
    }
}

const getHitPoints = ({
    squaddieTemplate,
    battleSquaddie,
}: {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
}): {
    currentHitPoints: number
    maxHitPoints: number
} => {
    return {
        currentHitPoints: battleSquaddie.inBattleAttributes.currentHitPoints,
        maxHitPoints: squaddieTemplate.attributes.maxHitPoints,
    }
}

export const Damage = {
    UNKNOWN: "UNKNOWN",
    BODY: "BODY",
    MIND: "MIND",
    SOUL: "SOUL",
} as const satisfies Record<string, string>
export type TDamage = EnumLike<typeof Damage>

export const Healing = {
    UNKNOWN: "UNKNOWN",
    LOST_HIT_POINTS: "LOST_HIT_POINTS",
} as const satisfies Record<string, string>
export type THealing = EnumLike<typeof Healing>

const giveHealingToTheSquaddie = ({
    inBattleAttributes,
    healingAmount,
}: {
    inBattleAttributes: InBattleAttributes
    healingAmount: number
    healingType: THealing
}): {
    healingReceived: number
} => {
    const actualHitPointGain: number = InBattleAttributesService.receiveHealing(
        inBattleAttributes,
        healingAmount
    )

    return {
        healingReceived: actualHitPointGain,
    }
}

const canPlayerControlSquaddieRightNow = ({
    squaddieTemplate,
    battleSquaddie,
}: {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
}): {
    squaddieHasThePlayerControlledAffiliation: boolean
    squaddieCanCurrentlyAct: boolean
    playerCanControlThisSquaddieRightNow: boolean
    squaddieIsNormallyControllableByPlayer: boolean
} => {
    const { canAct, isDead } = canSquaddieActRightNow({
        squaddieTemplate,
        battleSquaddie,
    })

    const playerControlledAffiliation: boolean =
        squaddieTemplate.squaddieId.affiliation === SquaddieAffiliation.PLAYER

    return {
        squaddieHasThePlayerControlledAffiliation: playerControlledAffiliation,
        squaddieCanCurrentlyAct: canAct,
        playerCanControlThisSquaddieRightNow:
            playerControlledAffiliation && canAct,
        squaddieIsNormallyControllableByPlayer:
            playerControlledAffiliation && !isDead,
    }
}

const isSquaddieAlive = ({
    squaddieTemplate,
    battleSquaddie,
}: {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
}): boolean => {
    const { currentHitPoints } = getHitPoints({
        squaddieTemplate,
        battleSquaddie,
    })
    return currentHitPoints > 0
}

const canSquaddieActRightNow = ({
    squaddieTemplate,
    battleSquaddie,
}: {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
}): {
    canAct: boolean
    isDead: boolean
} => {
    const squaddieIsAlive = isSquaddieAlive({
        squaddieTemplate,
        battleSquaddie,
    })

    let movementActionPoints =
        SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
            battleSquaddie.squaddieTurn
        )

    let { unSpentActionPoints } = SquaddieService.getActionPointSpend({
        battleSquaddie,
    })

    const hasActionPointsRemaining: boolean =
        squaddieIsAlive && (unSpentActionPoints > 0 || movementActionPoints > 0)

    return {
        canAct: hasActionPointsRemaining,
        isDead: !squaddieIsAlive,
    }
}

const getActionsBasedOnTargetType = ({
    squaddieTemplate,
    objectRepository,
    targetBySquaddieAffiliationRelation,
}: {
    squaddieTemplate: SquaddieTemplate
    objectRepository: ObjectRepository
    targetBySquaddieAffiliationRelation: TTargetBySquaddieAffiliationRelation
}): string[] => {
    return squaddieTemplate.actionTemplateIds.filter((actionTemplateId) => {
        const actionTemplate = ObjectRepositoryService.getActionTemplateById(
            objectRepository,
            actionTemplateId
        )

        if (!isValidValue(actionTemplate)) {
            return false
        }

        return ActionTemplateService.getActionEffectTemplates(
            actionTemplate
        ).some(
            (template) =>
                template.targetConstraints.squaddieAffiliationRelation[
                    targetBySquaddieAffiliationRelation
                ]
        )
    })
}
