import { EnumLike } from "../utils/enum"

export const SquaddieAffiliation = {
    UNKNOWN: "UNKNOWN",
    PLAYER: "PLAYER",
    ENEMY: "ENEMY",
    ALLY: "ALLY",
    NONE: "NONE",
} as const satisfies Record<string, string>

export type TSquaddieAffiliation = EnumLike<typeof SquaddieAffiliation>

const friendlyAffiliationsByAffiliation: {
    [first in TSquaddieAffiliation]: {
        [second in TSquaddieAffiliation]?: boolean
    }
} = {
    UNKNOWN: {},
    PLAYER: {
        PLAYER: true,
        ALLY: true,
    },
    ENEMY: {
        ENEMY: true,
    },
    ALLY: {
        PLAYER: true,
        ALLY: true,
    },
    NONE: {},
}

export const SquaddieAffiliationService = {
    areSquaddieAffiliationsAllies: ({
        targetAffiliation,
        actingAffiliation,
    }: {
        targetAffiliation: TSquaddieAffiliation
        actingAffiliation: TSquaddieAffiliation
    }): boolean => {
        return !!friendlyAffiliationsByAffiliation[actingAffiliation][
            targetAffiliation
        ]
    },
}
