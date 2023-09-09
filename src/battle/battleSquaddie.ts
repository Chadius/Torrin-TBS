import {SquaddieId} from "../squaddie/id";
import {SquaddieMovement} from "../squaddie/movement";
import {SquaddieActivity} from "../squaddie/activity";
import {ImageUI} from "../ui/imageUI";
import {SquaddieTurn} from "../squaddie/turn";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {InBattleAttributes} from "./stats/inBattleAttributes";

export class BattleSquaddieStatic {
    squaddieId: SquaddieId;
    attributes: ArmyAttributes;
    private readonly _activities: SquaddieActivity[];

    constructor(options: {
        squaddieId: SquaddieId,
        activities?: SquaddieActivity[],
        attributes?: ArmyAttributes,
    }) {
        this.squaddieId = options.squaddieId;
        this._activities = options.activities || [];
        this.attributes = options.attributes || new ArmyAttributes();
    }

    get activities(): SquaddieActivity[] {
        return this._activities;
    }

    get movement(): SquaddieMovement {
        return this.attributes.movement;
    }

    get staticId(): string {
        return this.squaddieId.staticId;
    }

    addActivity(newActivity: SquaddieActivity) {
        this._activities.push(newActivity);
    }
}

export class BattleSquaddieDynamic {
    constructor({
                    dynamicSquaddieId,
                    mapIcon,
                    squaddieTurn,
                    staticSquaddie,
                    staticSquaddieId
                }: {
        staticSquaddieId?: string,
        staticSquaddie?: BattleSquaddieStatic,
        dynamicSquaddieId: string,
        squaddieTurn?: SquaddieTurn,
        mapIcon?: ImageUI,
    }) {
        this._dynamicSquaddieId = dynamicSquaddieId;

        if (staticSquaddie) {
            this.copyStaticSquaddie(staticSquaddie);
        } else {
            this._staticSquaddieId = staticSquaddieId;
            this._inBattleAttributes = new InBattleAttributes();
        }

        this._squaddieTurn = squaddieTurn || new SquaddieTurn();
        this._mapIcon = mapIcon;

        this.assertBattleSquaddieDynamic();
    }

    private _staticSquaddieId: string;

    get staticSquaddieId(): string {
        return this._staticSquaddieId;
    }

    private _dynamicSquaddieId: string;

    get dynamicSquaddieId(): string {
        return this._dynamicSquaddieId;
    }

    private _squaddieTurn: SquaddieTurn;

    get squaddieTurn(): SquaddieTurn {
        return this._squaddieTurn;
    }

    private _mapIcon?: ImageUI;

    get mapIcon(): ImageUI {
        return this._mapIcon;
    }

    set mapIcon(value: ImageUI) {
        this._mapIcon = value;
    }

    private _inBattleAttributes: InBattleAttributes;

    get inBattleAttributes(): InBattleAttributes {
        return this._inBattleAttributes;
    }

    assertBattleSquaddieDynamic(): void {
        if (!this._dynamicSquaddieId) throw new Error("Dynamic Squaddie has no Dynamic Squaddie Id");
        if (!this._staticSquaddieId) throw new Error("Dynamic Squaddie has no Static Squaddie Id");
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
