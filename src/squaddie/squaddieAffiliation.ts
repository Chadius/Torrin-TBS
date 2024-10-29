export enum SquaddieAffiliation {
    UNKNOWN = "UNKNOWN",
    PLAYER = "PLAYER",
    ENEMY = "ENEMY",
    ALLY = "ALLY",
    NONE = "NONE",
}

const friendlyAffiliationsByAffiliation: {
    [first in SquaddieAffiliation]: {
        [second in SquaddieAffiliation]?: boolean
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
        targetAffiliation: SquaddieAffiliation
        actingAffiliation: SquaddieAffiliation
    }): boolean => {
        return !!friendlyAffiliationsByAffiliation[actingAffiliation][
            targetAffiliation
        ]
    },
}
