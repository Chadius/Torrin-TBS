import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battle/battleSquaddie";
import {SquaddieAffiliation} from "./squaddieAffiliation";

export const GetNumberOfActions = ({
                                       staticSquaddie,
                                       dynamicSquaddie,
                                   }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
}): {
    normalActionsRemaining: number
} => {
    return {
        normalActionsRemaining: dynamicSquaddie.squaddieTurn.remainingNumberOfActions,
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
    Unknown,
    Body,
    Mind,
    Soul
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

export const CanSquaddieActRightNow = ({
                                           staticSquaddie,
                                           dynamicSquaddie,
                                       }: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
}): {
    canAct: boolean,
    hasActionsRemaining: boolean,
    isDead: boolean,
} => {
    const squaddieIsAlive = IsSquaddieAlive({staticSquaddie, dynamicSquaddie});

    let {
        normalActionsRemaining
    } = GetNumberOfActions({
        staticSquaddie,
        dynamicSquaddie,
    });

    const hasActionsRemaining: boolean = squaddieIsAlive && normalActionsRemaining > 0;

    return {
        canAct: hasActionsRemaining,
        hasActionsRemaining,
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
        normalActionsRemaining
    } = GetNumberOfActions({
        staticSquaddie,
        dynamicSquaddie,
    });

    const playerControlledAffiliation: boolean = staticSquaddie.squaddieId.affiliation === SquaddieAffiliation.PLAYER
    const squaddieCanCurrentlyAct: boolean = normalActionsRemaining > 0 && squaddieIsAlive

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
