import {BattleSquaddie} from "../battle/battleSquaddie";
import {SquaddieAffiliation} from "./squaddieAffiliation";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

export const GetNumberOfActionPoints = ({
                                            squaddietemplate,
                                            dynamicSquaddie,
                                        }: {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
}): {
    actionPointsRemaining: number
} => {
    return {
        actionPointsRemaining: dynamicSquaddie.squaddieTurn.remainingActionPoints,
    }
}

export const GetArmorClass = ({
                                  squaddietemplate,
                                  dynamicSquaddie,
                              }: {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
}): {
    normalArmorClass: number
} => {
    return {
        normalArmorClass: squaddietemplate.attributes.armorClass,
    }
}

export const GetHitPoints = ({
                                 squaddietemplate,
                                 dynamicSquaddie,
                             }: {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
}): {
    currentHitPoints: number,
    maxHitPoints: number
} => {
    return {
        currentHitPoints: dynamicSquaddie.inBattleAttributes.currentHitPoints,
        maxHitPoints: squaddietemplate.attributes.maxHitPoints,
    }
}

export enum DamageType {
    Unknown = "Unknown",
    Body = "Body",
    Mind = "Mind",
    Soul = "Soul",
}

export enum HealingType {
    Unknown = "Unknown",
    LostHitPoints = "LostHitPoints",
}

export const DealDamageToTheSquaddie = ({
                                            squaddietemplate,
                                            dynamicSquaddie,
                                            damage,
                                            damageType,
                                        }: {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
    damage: number,
    damageType: DamageType,
}): {
    damageTaken: number
} => {
    const actualHitPointLoss: number = dynamicSquaddie.inBattleAttributes.takeDamage(damage, damageType);

    return {
        damageTaken: actualHitPointLoss,
    }
}

export const GiveHealingToTheSquaddie = ({
                                             squaddietemplate,
                                             dynamicSquaddie,
                                             healingAmount,
                                             healingType: HealingType,
                                         }: {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
    healingAmount: number,
    healingType: HealingType,
}): {
    healingReceived: number
} => {
    const actualHitPointGain: number = dynamicSquaddie.inBattleAttributes.receiveHealing(healingAmount);

    return {
        healingReceived: actualHitPointGain,
    }
}

export const CanSquaddieActRightNow = ({
                                           squaddietemplate,
                                           dynamicSquaddie,
                                       }: {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
}): {
    canAct: boolean,
    hasActionPointsRemaining: boolean,
    isDead: boolean,
} => {
    const squaddieIsAlive = IsSquaddieAlive({squaddietemplate, dynamicSquaddie});

    let {
        actionPointsRemaining
    } = GetNumberOfActionPoints({
        squaddietemplate,
        dynamicSquaddie,
    });

    const hasActionPointsRemaining: boolean = squaddieIsAlive && actionPointsRemaining > 0;

    return {
        canAct: hasActionPointsRemaining,
        hasActionPointsRemaining: hasActionPointsRemaining,
        isDead: !squaddieIsAlive,
    }
}

export const CanPlayerControlSquaddieRightNow = ({
                                                     squaddietemplate,
                                                     dynamicSquaddie,
                                                 }: {
    squaddietemplate: SquaddieTemplate,
    dynamicSquaddie: BattleSquaddie,
}): {
    squaddieHasThePlayerControlledAffiliation: boolean,
    squaddieCanCurrentlyAct: boolean,
    playerCanControlThisSquaddieRightNow: boolean,
} => {
    const squaddieIsAlive = IsSquaddieAlive({squaddietemplate, dynamicSquaddie});

    let {
        actionPointsRemaining
    } = GetNumberOfActionPoints({
        squaddietemplate,
        dynamicSquaddie,
    });

    const playerControlledAffiliation: boolean = squaddietemplate.squaddieId.affiliation === SquaddieAffiliation.PLAYER
    const squaddieCanCurrentlyAct: boolean = actionPointsRemaining > 0 && squaddieIsAlive

    return {
        squaddieHasThePlayerControlledAffiliation: playerControlledAffiliation,
        squaddieCanCurrentlyAct,
        playerCanControlThisSquaddieRightNow: playerControlledAffiliation && squaddieCanCurrentlyAct,
    }
}

export const IsSquaddieAlive = ({squaddietemplate, dynamicSquaddie}: {
    squaddietemplate: SquaddieTemplate;
    dynamicSquaddie: BattleSquaddie
}): boolean => {
    const {currentHitPoints} = GetHitPoints({squaddietemplate, dynamicSquaddie});
    return currentHitPoints > 0;
}
