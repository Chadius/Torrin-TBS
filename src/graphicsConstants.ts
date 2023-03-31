import {SquaddieAffiliation} from "./squaddie/squaddieAffiliation";

export const HEX_TILE_RADIUS = 30;
export const HEX_TILE_WIDTH = 30 * Math.sqrt(3);

export const HUE_BY_SQUADDIE_AFFILIATION: {[affiliation in SquaddieAffiliation]: number} = {
    [SquaddieAffiliation.PLAYER]: 0, // Redish
    [SquaddieAffiliation.ENEMY]: 170, // Purple
    [SquaddieAffiliation.ALLY]: 100, // Blue
    [SquaddieAffiliation.NONE]: 120, // Yellow
    [SquaddieAffiliation.UNKNOWN]: 180, // Whatever hot pink is
}