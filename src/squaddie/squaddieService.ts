import { BattleSquaddie } from "../battle/battleSquaddie"
import { SquaddieAffiliation } from "./squaddieAffiliation"
import { SquaddieTemplate } from "../campaign/squaddieTemplate"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../battle/stats/inBattleAttributes"
import { SearchPath } from "../hexMap/pathfinder/searchPath"
import { CoordinateTraveled } from "../hexMap/pathfinder/coordinateTraveled"
import { getResultOrThrowError } from "../utils/ResultOrError"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { DamageExplanation } from "../battle/history/battleAction/battleActionSquaddieChange"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import { ActionTemplateService } from "../action/template/actionTemplate"
import { isValidValue } from "../utils/validityCheck"
import { AttributeType } from "./attributeModifier"
import { BonusByProficiencyLevel, ProficiencyLevel } from "./armyAttributes"

export interface SquaddieActionPointsExplanation {
    actionPointsRemaining: number
}

export interface SquaddieArmorExplanation {
    net: number
    initial: number
}

export interface SquaddieMovementExplanation {
    initial: {
        movementPerAction: number
        crossOverPits: boolean
        passThroughWalls: boolean
        ignoreTerrainCost: boolean
        passThroughSquaddies: boolean
    }
    net: {
        movementPerAction: number
        crossOverPits: boolean
        passThroughWalls: boolean
        ignoreTerrainCost: boolean
        passThroughSquaddies: boolean
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
        squaddieTemplate,
        battleSquaddie,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): SquaddieActionPointsExplanation => {
        return getNumberOfActionPoints({ squaddieTemplate, battleSquaddie })
    },
    searchPathCoordinatesByNumberOfMovementActions: ({
        searchPath,
        battleSquaddieId,
        repository,
    }: {
        searchPath: SearchPath
        battleSquaddieId: string
        repository: ObjectRepository
    }): { [movementActions: number]: CoordinateTraveled[] } => {
        const coordinatesByMoveAction: {
            [movementActions: number]: CoordinateTraveled[]
        } = {}
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )
        searchPath.coordinatesTraveled.forEach((coordinateDescription) => {
            let numberOfMovementActions: number = Math.ceil(
                coordinateDescription.cumulativeMovementCost /
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).net.movementPerAction
            )
            coordinatesByMoveAction[numberOfMovementActions] ||= []
            coordinatesByMoveAction[numberOfMovementActions].push(
                coordinateDescription
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
        battleSquaddie,
    }: {
        squaddieTemplate: SquaddieTemplate
        battleSquaddie: BattleSquaddie
    }): SquaddieArmorExplanation => {
        return getArmorClass({ squaddieTemplate, battleSquaddie })
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
            type: Trait.TARGET_ALLY,
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
            type: Trait.TARGET_FOE,
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
            type: Trait.TARGET_SELF,
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
                if (attributeModifier.type === AttributeType.ELUSIVE)
                    currentMovementAttributes.net.passThroughSquaddies = true
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
                    passThroughSquaddies:
                        squaddieTemplate.attributes.movement
                            .passThroughSquaddies,
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
                    passThroughSquaddies:
                        squaddieTemplate.attributes.movement
                            .passThroughSquaddies,
                },
            }
        )
    },
}

const getNumberOfActionPoints = ({
    squaddieTemplate,
    battleSquaddie,
}: {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
}): SquaddieActionPointsExplanation => {
    return {
        actionPointsRemaining:
            battleSquaddie.squaddieTurn.remainingActionPoints,
    }
}

const getArmorClass = ({
    squaddieTemplate,
    battleSquaddie,
}: {
    squaddieTemplate: SquaddieTemplate
    battleSquaddie: BattleSquaddie
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
    healingType,
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

    let { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    const playerControlledAffiliation: boolean =
        squaddieTemplate.squaddieId.affiliation === SquaddieAffiliation.PLAYER
    const squaddieCanCurrentlyAct: boolean =
        actionPointsRemaining > 0 && squaddieIsAlive

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

    let { actionPointsRemaining } = SquaddieService.getNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    })

    const hasActionPointsRemaining: boolean =
        squaddieIsAlive && actionPointsRemaining > 0

    return {
        canAct: hasActionPointsRemaining,
        hasActionPointsRemaining: hasActionPointsRemaining,
        isDead: !squaddieIsAlive,
    }
}

const getActionsBasedOnTargetType = ({
    squaddieTemplate,
    objectRepository,
    type,
}: {
    squaddieTemplate: SquaddieTemplate
    objectRepository: ObjectRepository
    type: Trait.TARGET_FOE | Trait.TARGET_ALLY | Trait.TARGET_SELF
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
        ).some((template) =>
            TraitStatusStorageService.getStatus(template.traits, type)
        )
    })
}
