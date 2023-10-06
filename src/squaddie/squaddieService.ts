import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battle/battleSquaddie";
import {SquaddieAffiliation} from "./squaddieAffiliation";

export const GetNumberOfActionPoints = ({
                                            staticSquaddie,
                                            dynamicSquaddie,
                                        }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
}): {
    actionPointsRemaining: number
} => {
    return {
        actionPointsRemaining: dynamicSquaddie.squaddieTurn.remainingActionPoints,
    }
}

export const GetArmorClass = ({
                                  staticSquaddie,
                                  dynamicSquaddie,
                              }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
}): {
    normalArmorClass: number
} => {
    return {
        normalArmorClass: staticSquaddie.attributes.armorClass,
    }
}

export const GetHitPoints = ({
                                 staticSquaddie,
                                 dynamicSquaddie,
                             }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
}): {
    currentHitPoints: number,
    maxHitPoints: number
} => {
    return {
        currentHitPoints: dynamicSquaddie.inBattleAttributes.currentHitPoints,
        maxHitPoints: staticSquaddie.attributes.maxHitPoints,
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
                                            staticSquaddie,
                                            dynamicSquaddie,
                                            damage,
                                            damageType,
                                        }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
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
                                             staticSquaddie,
                                             dynamicSquaddie,
                                             healingAmount,
                                             healingType: HealingType,
                                         }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
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
                                           staticSquaddie,
                                           dynamicSquaddie,
                                       }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
}): {
    canAct: boolean,
    hasActionPointsRemaining: boolean,
    isDead: boolean,
} => {
    const squaddieIsAlive = IsSquaddieAlive({staticSquaddie, dynamicSquaddie});

    let {
        actionPointsRemaining
    } = GetNumberOfActionPoints({
        staticSquaddie,
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
                                                     staticSquaddie,
                                                     dynamicSquaddie,
                                                 }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
}): {
    squaddieHasThePlayerControlledAffiliation: boolean,
    squaddieCanCurrentlyAct: boolean,
    playerCanControlThisSquaddieRightNow: boolean,
} => {
    const squaddieIsAlive = IsSquaddieAlive({staticSquaddie, dynamicSquaddie});

    let {
        actionPointsRemaining
    } = GetNumberOfActionPoints({
        staticSquaddie,
        dynamicSquaddie,
    });

    const playerControlledAffiliation: boolean = staticSquaddie.squaddieId.affiliation === SquaddieAffiliation.PLAYER
    const squaddieCanCurrentlyAct: boolean = actionPointsRemaining > 0 && squaddieIsAlive

    return {
        squaddieHasThePlayerControlledAffiliation: playerControlledAffiliation,
        squaddieCanCurrentlyAct,
        playerCanControlThisSquaddieRightNow: playerControlledAffiliation && squaddieCanCurrentlyAct,
    }
}

export const IsSquaddieAlive = ({staticSquaddie, dynamicSquaddie}: {
    staticSquaddie: BattleSquaddieStatic;
    dynamicSquaddie: BattleSquaddieDynamic
}): boolean => {
    const {currentHitPoints} = GetHitPoints({staticSquaddie, dynamicSquaddie});
    return currentHitPoints > 0;
}
