import {
    SquaddieAffiliation,
    TSquaddieAffiliation,
} from "./squaddie/squaddieAffiliation"

export const HEX_TILE_RADIUS = 30
export const HEX_TILE_WIDTH = 30 * Math.sqrt(3)
export const HEX_TILE_HEIGHT = HEX_TILE_WIDTH

export const HUE_BY_SQUADDIE_AFFILIATION: {
    [affiliation in TSquaddieAffiliation]: number
} = {
    [SquaddieAffiliation.PLAYER]: 5,
    [SquaddieAffiliation.ENEMY]: 250,
    [SquaddieAffiliation.ALLY]: 70,
    [SquaddieAffiliation.NONE]: 150,
    [SquaddieAffiliation.UNKNOWN]: 220,
}
