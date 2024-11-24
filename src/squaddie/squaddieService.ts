import { BattleSquaddie } from "../battle/battleSquaddie"
import { SquaddieAffiliation } from "./squaddieAffiliation"
import { SquaddieTemplate } from "../campaign/squaddieTemplate"
import {
    InBattleAttributes,
    InBattleAttributesService,
} from "../battle/stats/inBattleAttributes"
import { SearchPath } from "../hexMap/pathfinder/searchPath"
import { LocationTraveled } from "../hexMap/pathfinder/locationTraveled"
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
    }): {
        actionPointsRemaining: number
    } => {
        return getNumberOfActionPoints({ squaddieTemplate, battleSquaddie })
    },
    searchPathLocationsByNumberOfMovementActions: ({
        searchPath,
        battleSquaddieId,
        repository,
    }: {
        searchPath: SearchPath
        battleSquaddieId: string
        repository: ObjectRepository
    }): { [movementActions: number]: LocationTraveled[] } => {
        const locationsByMoveAction: {
            [movementActions: number]: LocationTraveled[]
        } = {}
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )
        searchPath.locationsTraveled.forEach((locationDescription) => {
            let numberOfMovementActions: number = Math.ceil(
                locationDescription.cumulativeMovementCost /
                    SquaddieService.getSquaddieMovementAttributes({
                        battleSquaddie,
                        squaddieTemplate,
                    }).movementPerAction
            )
            locationsByMoveAction[numberOfMovementActions] ||= []
            locationsByMoveAction[numberOfMovementActions].push(
                locationDescription
            )
        })
        return locationsByMoveAction
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
    }): {
        net: number
        initial: number
    } => {
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
    }): {
        movementPerAction: number
        crossOverPits: boolean
        passThroughWalls: boolean
        ignoreTerrainCost: boolean
    } => {
        return InBattleAttributesService.calculateCurrentAttributeModifiers(
            battleSquaddie.inBattleAttributes
        ).reduce(
            (currentMovementAttributes, attributeModifier) => {
                if (attributeModifier.type === AttributeType.MOVEMENT) {
                    currentMovementAttributes.movementPerAction +=
                        attributeModifier.amount
                }
                if (
                    attributeModifier.type === AttributeType.IGNORE_TERRAIN_COST
                ) {
                    currentMovementAttributes.ignoreTerrainCost = true
                }
                return currentMovementAttributes
            },
            {
                movementPerAction:
                    squaddieTemplate.attributes.movement.movementPerAction,
                crossOverPits:
                    squaddieTemplate.attributes.movement.crossOverPits,
                passThroughWalls:
                    squaddieTemplate.attributes.movement.passThroughWalls,
                ignoreTerrainCost:
                    squaddieTemplate.attributes.movement.ignoreTerrainCost,
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
}): {
    actionPointsRemaining: number
} => {
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
}): {
    net: number
    initial: number
} => {
    return {
        initial: squaddieTemplate.attributes.armorClass,
        net:
            squaddieTemplate.attributes.armorClass +
            squaddieTemplate.attributes.tier,
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
