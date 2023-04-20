import {SquaddieId} from "../squaddie/id";
import {NullSquaddieMovement, SquaddieMovement} from "../squaddie/movement";
import {SquaddieActivity} from "../squaddie/activity";
import {HexCoordinate} from "../hexMap/hexGrid";
import {ImageUI} from "../ui/imageUI";
import {SquaddieTurn} from "../squaddie/turn";
import {assertsInteger} from "../utils/mathAssert";
import {SquaddieAffiliation} from "../squaddie/squaddieAffiliation";

export type BattleSquaddieStaticRequiredOptions = {
    squaddieId: SquaddieId,
}

export type BattleSquaddieStaticOptions = {
    movement: SquaddieMovement,
    activities: SquaddieActivity[],
}

export class BattleSquaddieStatic {
    squaddieId: SquaddieId;
    movement: SquaddieMovement;
    activities: SquaddieActivity[];

    constructor(options: BattleSquaddieStaticRequiredOptions & Partial<BattleSquaddieStaticOptions>) {
        this.squaddieId = options.squaddieId;
        this.movement = options.movement || NullSquaddieMovement();
        this.activities = options.activities || [];
    }
}

export type BattleSquaddieDynamicOptions = {
    staticSquaddieId: string,
    mapLocation: HexCoordinate,
    squaddieTurn: SquaddieTurn,
    mapIcon?: ImageUI,
}

export class BattleSquaddieDynamic {
    staticSquaddieId: string;
    mapLocation: HexCoordinate;
    squaddieTurn: SquaddieTurn;
    mapIcon?: ImageUI;

    constructor(options: BattleSquaddieDynamicOptions) {
        this.staticSquaddieId = options.staticSquaddieId;
        this.mapLocation = options.mapLocation;
        this.squaddieTurn = options.squaddieTurn;
        this.mapIcon = options.mapIcon;
    }

    assertBattleSquaddieDynamic(): void {
        if (!this.staticSquaddieId) throw new Error("Dynamic Squaddie has no Static Squaddie Id");
        assertsInteger(this.mapLocation.q);
        assertsInteger(this.mapLocation.r);
    }

    canStillActThisRound(): boolean {
        return this.squaddieTurn.hasActionsRemaining();
    }

    beginNewRound() {
        return this.squaddieTurn.beginNewRound();
    }

    endTurn() {
        return this.squaddieTurn.endTurn();
    }
}

export const canPlayerControlSquaddieRightNow = (staticSquaddie: BattleSquaddieStatic, dynamicSquaddie: BattleSquaddieDynamic) => {
    if (staticSquaddie.squaddieId.affiliation === SquaddieAffiliation.PLAYER && dynamicSquaddie.canStillActThisRound()) {
        return true;
    }
    return false;
}
