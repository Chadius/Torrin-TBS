export enum SquaddieAffiliation {
    UNKNOWN = "UNKNOWN",
    PLAYER = "PLAYER",
    ENEMY = "ENEMY",
    ALLY = "ALLY",
    NONE = "NONE",
}

export const FriendlyAffiliationsByAffiliation
    : {[first in SquaddieAffiliation]: {[second in SquaddieAffiliation]?: boolean }} = {
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