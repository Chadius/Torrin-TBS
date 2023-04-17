import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";

export enum BattlePhase {
    UNKNOWN = "UNKNOWN",
    PLAYER = "PLAYER",
    ENEMY = "ENEMY",
    ALLY = "ALLY",
    NONE = "NONE",
}

const squaddieAffiliationToBattlePhase: (squaddieAffiliation: SquaddieAffiliation) => BattlePhase = (squaddieAffiliation: SquaddieAffiliation): BattlePhase => {
    switch(squaddieAffiliation) {
        case SquaddieAffiliation.PLAYER:
            return BattlePhase.PLAYER;
        case SquaddieAffiliation.ENEMY:
            return BattlePhase.ENEMY;
        case SquaddieAffiliation.ALLY:
            return BattlePhase.ALLY;
        case SquaddieAffiliation.NONE:
            return BattlePhase.NONE;
        default:
            return BattlePhase.UNKNOWN;
    }
}

const battlePhaseToSquaddieAffiliation: (phase: BattlePhase) => SquaddieAffiliation = (phase: BattlePhase): SquaddieAffiliation => {
    switch(phase) {
        case BattlePhase.PLAYER:
            return SquaddieAffiliation.PLAYER;
        case BattlePhase.ENEMY:
            return SquaddieAffiliation.ENEMY;
        case BattlePhase.ALLY:
            return SquaddieAffiliation.ALLY;
        case BattlePhase.NONE:
            return SquaddieAffiliation.NONE;
        default:
            return SquaddieAffiliation.UNKNOWN;
    }
}

export class BattlePhaseTracker {
    teamsByAffiliation: {[affiliation in SquaddieAffiliation]? : BattleSquaddieTeam} = {};
    currentPhase: BattlePhase = BattlePhase.UNKNOWN;
    constructor() {
    }

    addTeam(newSquaddieTeam: BattleSquaddieTeam) {
        this.teamsByAffiliation[newSquaddieTeam.getAffiliation()] = newSquaddieTeam;
    }

    getCurrentTeam(): BattleSquaddieTeam {
        return this.teamsByAffiliation[battlePhaseToSquaddieAffiliation(this.getCurrentPhase())];
    }

    getCurrentPhase(): BattlePhase {
        return this.currentPhase;
    }

    advanceToNextPhase() {
        const getNextPhase: (phase: BattlePhase) => BattlePhase = (phase: BattlePhase) => {
            switch (phase) {
                case BattlePhase.PLAYER:
                    return BattlePhase.ENEMY;
                case BattlePhase.ENEMY:
                    return BattlePhase.ALLY;
                case BattlePhase.ALLY:
                    return BattlePhase.NONE;
                case BattlePhase.NONE:
                    return BattlePhase.PLAYER;
                case BattlePhase.UNKNOWN:
                    return BattlePhase.PLAYER;
                default:
                    return BattlePhase.UNKNOWN;
            }
        }

        const startingPhase = this.getCurrentPhase();
        let currentPhaseToCheck = getNextPhase(startingPhase);

        const done: boolean = false;
        while (!done) {
            let currentTeam = this.teamsByAffiliation[battlePhaseToSquaddieAffiliation(currentPhaseToCheck)];
            if (currentTeam && currentTeam.hasSquaddies()) {
                this.currentPhase = currentPhaseToCheck;
                return
            }

            currentPhaseToCheck = getNextPhase(currentPhaseToCheck);
            if (currentPhaseToCheck === startingPhase) {
                this.currentPhase = BattlePhase.UNKNOWN;
                return
            }
        }
    }
}