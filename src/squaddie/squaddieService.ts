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
    maxHitPoints: number
} => {
    return {
        maxHitPoints: staticSquaddie.attributes.maxHitPoints,
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
} => {
    let {
        normalActionsRemaining
    } = GetNumberOfActions({
        staticSquaddie,
        dynamicSquaddie,
    });

    const hasActionsRemaining: boolean = normalActionsRemaining > 0;

    return {
        canAct: hasActionsRemaining,
        hasActionsRemaining,
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
    let {
        normalActionsRemaining
    } = GetNumberOfActions({
        staticSquaddie,
        dynamicSquaddie,
    });

    const playerControlledAffiliation: boolean = staticSquaddie.squaddieId.affiliation === SquaddieAffiliation.PLAYER
    const squaddieCanCurrentlyAct: boolean = normalActionsRemaining > 0

    return {
        squaddieHasThePlayerControlledAffiliation: playerControlledAffiliation,
        squaddieCanCurrentlyAct,
        playerCanControlThisSquaddieRightNow: playerControlledAffiliation && squaddieCanCurrentlyAct,
    }
}
