import { SquaddieAffiliation } from "./squaddie/squaddieAffiliation"

export const HEX_TILE_RADIUS = 30
export const HEX_TILE_WIDTH = 30 * Math.sqrt(3)

export const HUE_BY_SQUADDIE_AFFILIATION: {
    [affiliation in SquaddieAffiliation]: number
} = {
    [SquaddieAffiliation.PLAYER]: 5,
    [SquaddieAffiliation.ENEMY]: 250,
    [SquaddieAffiliation.ALLY]: 70,
    [SquaddieAffiliation.NONE]: 150,
    [SquaddieAffiliation.UNKNOWN]: 220,
}
