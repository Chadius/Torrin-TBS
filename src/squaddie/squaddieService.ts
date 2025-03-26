import { BattleSquaddie } from "../battle/battleSquaddie"
import { SquaddieAffiliation } from "./squaddieAffiliation"
import { SquaddieTemplate } from "../campaign/squaddieTemplate"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../battle/stats/inBattleAttributes"
import { getResultOrThrowError } from "../utils/ResultOrError"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { DamageExplanation } from "../battle/history/battleAction/battleActionSquaddieChange"
import { ActionTemplateService } from "../action/template/actionTemplate"
import { isValidValue } from "../utils/objectValidityCheck"
import { BonusByProficiencyLevel, ProficiencyLevel } from "./armyAttributes"
import { AttributeType } from "./attribute/attributeType"
import {
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../action/template/actionEffectTemplate"
import { SearchPathAdapter } from "../search/searchPathAdapter/searchPathAdapter"
import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieTurnService } from "./turn"

export interface SquaddieActionPointsExplanation {
    unallocatedActionPoints: number
    movementActionPoints: number
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
        damageType: DamageType
    }): DamageExplanation => {
        const clonedInBattleAttributes: InBattleAttributes =
            InBattleAttributesService.clone(battleSquaddie.inBattleAttributes)
        return InBattleAttributesService.takeDamage({
            inBattleAttributes: clonedInBattleAttributes,
            damageToTake: damage,
            damageType,
        })
    },
    getNumberOfActionPoints: ({
        battleSquaddie,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): SquaddieActionPointsExplanation => {
        return getNumberOfActionPoints({ battleSquaddie })
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
        hasActionPointsRemaining: boolean
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
        healingType: HealingType
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
        healingType: HealingType
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
                if (attributeModifier.type === AttributeType.MOVEMENT) {
                    currentMovementAttributes.net.movementPerAction +=
                        attributeModifier.amount
                }
                if (attributeModifier.type === AttributeType.HUSTLE)
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
        versusSquaddieResistance: VersusSquaddieResistance
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

const getNumberOfActionPoints = ({
    battleSquaddie,
}: {
    battleSquaddie: BattleSquaddie
}): SquaddieActionPointsExplanation => {
    return {
        unallocatedActionPoints: SquaddieTurnService.getUnallocatedActionPoints(
            battleSquaddie.squaddieTurn
        ),
        movementActionPoints:
            SquaddieTurnService.getActionPointsReservedForMovement(
                battleSquaddie.squaddieTurn
            ),
    }
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

export enum DamageType {
    UNKNOWN = "UNKNOWN",
    BODY = "BODY",
    MIND = "MIND",
    SOUL = "SOUL",
}

export enum HealingType {
    UNKNOWN = "UNKNOWN",
    LOST_HIT_POINTS = "LOST_HIT_POINTS",
}

const giveHealingToTheSquaddie = ({
    inBattleAttributes,
    healingAmount,
}: {
    inBattleAttributes: InBattleAttributes
    healingAmount: number
    healingType: HealingType
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
    const squaddieIsAlive = isSquaddieAlive({
        squaddieTemplate,
        battleSquaddie,
    })

    let { unallocatedActionPoints } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    const playerControlledAffiliation: boolean =
        squaddieTemplate.squaddieId.affiliation === SquaddieAffiliation.PLAYER
    const squaddieCanCurrentlyAct: boolean =
        unallocatedActionPoints > 0 && squaddieIsAlive

    return {
        squaddieHasThePlayerControlledAffiliation: playerControlledAffiliation,
        squaddieCanCurrentlyAct,
        playerCanControlThisSquaddieRightNow:
            playerControlledAffiliation && squaddieCanCurrentlyAct,
        squaddieIsNormallyControllableByPlayer:
            playerControlledAffiliation && squaddieIsAlive,
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
    hasActionPointsRemaining: boolean
    isDead: boolean
} => {
    const squaddieIsAlive = isSquaddieAlive({
        squaddieTemplate,
        battleSquaddie,
    })

    let { unallocatedActionPoints } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    const hasActionPointsRemaining: boolean =
        squaddieIsAlive && unallocatedActionPoints > 0

    return {
        canAct: hasActionPointsRemaining,
        hasActionPointsRemaining: hasActionPointsRemaining,
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
    targetBySquaddieAffiliationRelation:
        | TargetBySquaddieAffiliationRelation.TARGET_SELF
        | TargetBySquaddieAffiliationRelation.TARGET_ALLY
        | TargetBySquaddieAffiliationRelation.TARGET_FOE
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
