import {BattleSquaddie} from "../battle/battleSquaddie";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";
import {InBattleAttributesHandler} from "../battle/stats/inBattleAttributes";
import {SearchPath} from "../hexMap/pathfinder/searchPath";
import {LocationTraveled} from "../hexMap/pathfinder/locationTraveled";
import {getResultOrThrowError} from "../utils/ResultOrError";
import {ObjectRepository, ObjectRepositoryService} from "../battle/objectRepository";

export const SquaddieService = {
    dealDamageToTheSquaddie: ({
                                  squaddieTemplate,
                                  battleSquaddie,
                                  damage,
                                  damageType,
                              }: {
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
        damage: number,
        damageType: DamageType,
    }): {
        damageTaken: number
    } => {
        return DealDamageToTheSquaddie({
            squaddieTemplate,
            battleSquaddie,
            damage,
            damageType,
        });
    },
    getNumberOfActionPoints: ({
                                  squaddieTemplate,
                                  battleSquaddie,
                              }: {
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
    }): {
        actionPointsRemaining: number
    } => {
        return GetNumberOfActionPoints({squaddieTemplate, battleSquaddie});
    },
    searchPathLocationsByNumberOfMovementActions: ({searchPath, battleSquaddieId, repository}: {
        searchPath: SearchPath,
        battleSquaddieId: string,
        repository: ObjectRepository,
    }): { [movementActions: number]: LocationTraveled[] } => {
        const locationsByMoveAction: { [movementActions: number]: LocationTraveled[] } = {};
        const {squaddieTemplate} = getResultOrThrowError(ObjectRepositoryService.getSquaddieByBattleId(repository, battleSquaddieId))
        searchPath.locationsTraveled.forEach(locationDescription => {
            let numberOfMovementActions: number = Math.ceil(locationDescription.cumulativeMovementCost / squaddieTemplate.attributes.movement.movementPerAction);
            locationsByMoveAction[numberOfMovementActions] ||= [];
            locationsByMoveAction[numberOfMovementActions].push(locationDescription);
        })
        return locationsByMoveAction;
    },
    getHitPoints: ({
                       squaddieTemplate,
                       battleSquaddie,
                   }: {
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
    }): {
        currentHitPoints: number,
        maxHitPoints: number
    } => {
        return GetHitPoints({squaddieTemplate, battleSquaddie});
    },
    canSquaddieActRightNow: ({
                                 squaddieTemplate,
                                 battleSquaddie,
                             }: {
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
    }): {
        canAct: boolean,
        hasActionPointsRemaining: boolean,
        isDead: boolean,
    } => {
        return canSquaddieActRightNow({squaddieTemplate, battleSquaddie});
    },
    canPlayerControlSquaddieRightNow: ({
                                           squaddieTemplate,
                                           battleSquaddie,
                                       }: {
        squaddieTemplate: SquaddieTemplate,
        battleSquaddie: BattleSquaddie,
    }): {
        squaddieHasThePlayerControlledAffiliation: boolean,
        squaddieCanCurrentlyAct: boolean,
        playerCanControlThisSquaddieRightNow: boolean,
    } => {
        return CanPlayerControlSquaddieRightNow({squaddieTemplate, battleSquaddie});
    }
}

export const GetNumberOfActionPoints = ({
                                            squaddieTemplate,
                                            battleSquaddie,
                                        }: {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
}): {
    actionPointsRemaining: number
} => {
    return {
        actionPointsRemaining: battleSquaddie.squaddieTurn.remainingActionPoints,
    }
}

export const GetArmorClass = ({
                                  squaddieTemplate,
                                  battleSquaddie,
                              }: {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
}): {
    normalArmorClass: number
} => {
    return {
        normalArmorClass: squaddieTemplate.attributes.armorClass,
    }
}

export const GetHitPoints = ({
                                 squaddieTemplate,
                                 battleSquaddie,
                             }: {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
}): {
    currentHitPoints: number,
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

export const DealDamageToTheSquaddie = ({
                                            squaddieTemplate,
                                            battleSquaddie,
                                            damage,
                                            damageType,
                                        }: {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    damage: number,
    damageType: DamageType,
}): {
    damageTaken: number
} => {
    const actualHitPointLoss: number = InBattleAttributesHandler.takeDamage(
        battleSquaddie.inBattleAttributes,
        damage,
        damageType,
    );

    return {
        damageTaken: actualHitPointLoss,
    }
}

export const GiveHealingToTheSquaddie = ({
                                             squaddieTemplate,
                                             battleSquaddie,
                                             healingAmount,
                                             healingType: HealingType,
                                         }: {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
    healingAmount: number,
    healingType: HealingType,
}): {
    healingReceived: number
} => {
    const actualHitPointGain: number = InBattleAttributesHandler.receiveHealing(
        battleSquaddie.inBattleAttributes,
        healingAmount
    );

    return {
        healingReceived: actualHitPointGain,
    }
}

export const CanPlayerControlSquaddieRightNow = ({
                                                     squaddieTemplate,
                                                     battleSquaddie,
                                                 }: {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
}): {
    squaddieHasThePlayerControlledAffiliation: boolean,
    squaddieCanCurrentlyAct: boolean,
    playerCanControlThisSquaddieRightNow: boolean,
} => {
    const squaddieIsAlive = IsSquaddieAlive({squaddieTemplate, battleSquaddie});

    let {
        actionPointsRemaining
    } = GetNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    });

    const playerControlledAffiliation: boolean = squaddieTemplate.squaddieId.affiliation === SquaddieAffiliation.PLAYER
    const squaddieCanCurrentlyAct: boolean = actionPointsRemaining > 0 && squaddieIsAlive

    return {
        squaddieHasThePlayerControlledAffiliation: playerControlledAffiliation,
        squaddieCanCurrentlyAct,
        playerCanControlThisSquaddieRightNow: playerControlledAffiliation && squaddieCanCurrentlyAct,
    }
}

export const IsSquaddieAlive = ({squaddieTemplate, battleSquaddie}: {
    squaddieTemplate: SquaddieTemplate;
    battleSquaddie: BattleSquaddie
}): boolean => {
    const {currentHitPoints} = GetHitPoints({squaddieTemplate, battleSquaddie});
    return currentHitPoints > 0;
}

const canSquaddieActRightNow = ({
                                    squaddieTemplate,
                                    battleSquaddie,
                                }: {
    squaddieTemplate: SquaddieTemplate,
    battleSquaddie: BattleSquaddie,
}): {
    canAct: boolean,
    hasActionPointsRemaining: boolean,
    isDead: boolean,
} => {
    const squaddieIsAlive = IsSquaddieAlive({squaddieTemplate, battleSquaddie});

    let {
        actionPointsRemaining
    } = GetNumberOfActionPoints({
        squaddieTemplate,
        battleSquaddie,
    });

    const hasActionPointsRemaining: boolean = squaddieIsAlive && actionPointsRemaining > 0;

    return {
        canAct: hasActionPointsRemaining,
        hasActionPointsRemaining: hasActionPointsRemaining,
        isDead: !squaddieIsAlive,
    }
}
