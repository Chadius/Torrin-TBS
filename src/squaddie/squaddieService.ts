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
        normalActionsRemaining: dynamicSquaddie.squaddieTurn.getRemainingActions(),
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

export const CanPlayerControl = ({
    staticSquaddie,
    dynamicSquaddie,
}: {
    staticSquaddie: BattleSquaddieStatic,
    dynamicSquaddie: BattleSquaddieDynamic,
}): {
    playerControlledAffiliation: boolean,
    squaddieCanCurrentlyAct: boolean,
} => {
    let {
        normalActionsRemaining
    } = GetNumberOfActions({
        staticSquaddie,
        dynamicSquaddie,
    });

    return {
        playerControlledAffiliation: staticSquaddie.squaddieId.affiliation === SquaddieAffiliation.PLAYER,
        squaddieCanCurrentlyAct: normalActionsRemaining > 0,
    }
}
