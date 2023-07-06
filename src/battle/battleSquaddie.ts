import {SquaddieId} from "../squaddie/id";
import {SquaddieMovement} from "../squaddie/movement";
import {SquaddieActivity} from "../squaddie/activity";
import {ImageUI} from "../ui/imageUI";
import {SquaddieTurn} from "../squaddie/turn";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {InBattleAttributes} from "./stats/inBattleAttributes";

export class BattleSquaddieStatic {
    squaddieId: SquaddieId;
    private _activities: SquaddieActivity[];
    attributes: ArmyAttributes;

    constructor(options: {
        squaddieId: SquaddieId,
        activities?: SquaddieActivity[],
        attributes?: ArmyAttributes,
    }) {
        this.squaddieId = options.squaddieId;
        this._activities = options.activities || [];
        this.attributes = options.attributes || new ArmyAttributes();
    }

    get movement(): SquaddieMovement {
        return this.attributes.movement;
    }

    get staticId(): string {
        return this.squaddieId.staticId;
    }

    get activities(): SquaddieActivity[] {
        return this._activities;
    }

    addActivity(newActivity: SquaddieActivity) {
        this._activities.push(newActivity);
    }
}

export class BattleSquaddieDynamic {
    private _staticSquaddieId: string;
    private _dynamicSquaddieId: string;
    private _squaddieTurn: SquaddieTurn;
    private _mapIcon?: ImageUI;
    private _inBattleAttributes: InBattleAttributes;

    constructor(options: {
        staticSquaddieId?: string,
        staticSquaddie?: BattleSquaddieStatic,
        dynamicSquaddieId: string,
        squaddieTurn?: SquaddieTurn,
        mapIcon?: ImageUI,
    }) {
        this._dynamicSquaddieId = options.dynamicSquaddieId;

        if (options.staticSquaddie) {
            this.copyStaticSquaddie(options.staticSquaddie);
        } else {
            this._staticSquaddieId = options.staticSquaddieId;
            this._inBattleAttributes = new InBattleAttributes();
        }

        this._squaddieTurn = options.squaddieTurn || new SquaddieTurn();
        this._mapIcon = options.mapIcon;

        this.assertBattleSquaddieDynamic();
    }

    assertBattleSquaddieDynamic(): void {
        if (!this._dynamicSquaddieId) throw new Error("Dynamic Squaddie has no Dynamic Squaddie Id");
        if (!this._staticSquaddieId) throw new Error("Dynamic Squaddie has no Static Squaddie Id");
    }

    get inBattleAttributes(): InBattleAttributes {
        return this._inBattleAttributes;
    }

    get mapIcon(): ImageUI {
        return this._mapIcon;
    }

    set mapIcon(value: ImageUI) {
        this._mapIcon = value;
    }

    get squaddieTurn(): SquaddieTurn {
        return this._squaddieTurn;
    }

    get dynamicSquaddieId(): string {
        return this._dynamicSquaddieId;
    }

    get staticSquaddieId(): string {
        return this._staticSquaddieId;
    }

    canStillActThisRound(): boolean {
        return this._squaddieTurn.hasActionsRemaining();
    }

    beginNewRound() {
        return this._squaddieTurn.beginNewRound();
    }

    endTurn() {
        return this._squaddieTurn.endTurn();
    }

    initializeInBattleAttributes(attributes: ArmyAttributes) {
        this._inBattleAttributes = new InBattleAttributes(attributes);
    }

    private copyStaticSquaddie(staticSquaddie: BattleSquaddieStatic) {
        this._staticSquaddieId = staticSquaddie.squaddieId.staticId;
        this.initializeInBattleAttributes(staticSquaddie.attributes);
    }
}
