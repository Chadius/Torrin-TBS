import {ImageUI} from "../ui/imageUI";
import {SquaddieTurn} from "../squaddie/turn";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {InBattleAttributes} from "./stats/inBattleAttributes";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

export class BattleSquaddie {
    private readonly _dynamicSquaddieId: string;
    private readonly _squaddieTurn: SquaddieTurn;

    constructor({
                    dynamicSquaddieId,
                    mapIcon,
                    squaddieTurn,
                    squaddieTemplate,
                    squaddieTemplateId
                }: {
        squaddieTemplateId?: string,
        squaddieTemplate?: SquaddieTemplate,
        dynamicSquaddieId: string,
        squaddieTurn?: SquaddieTurn,
        mapIcon?: ImageUI,
    }) {
        this._dynamicSquaddieId = dynamicSquaddieId;

        if (squaddieTemplate) {
            this.copySquaddietemplate(squaddieTemplate);
        } else {
            this._squaddieTemplateId = squaddieTemplateId;
            this._inBattleAttributes = new InBattleAttributes();
        }

        this._squaddieTurn = squaddieTurn || new SquaddieTurn();
        this._mapIcon = mapIcon;

        this.assertBattleSquaddieDynamic();
    }

    private _squaddieTemplateId: string;

    get squaddieTemplateId(): string {
        return this._squaddieTemplateId;
    }

    get dynamicSquaddieId(): string {
        return this._dynamicSquaddieId;
    }

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
        if (!this._squaddieTemplateId) throw new Error("Dynamic Squaddie has no Static Squaddie Id");
    }

    canStillActThisRound(): boolean {
        return this._squaddieTurn.hasActionPointsRemaining();
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

    private copySquaddietemplate(squaddietemplate: SquaddieTemplate) {
        this._squaddieTemplateId = squaddietemplate.squaddieId.staticId;
        this.initializeInBattleAttributes(squaddietemplate.attributes);
    }
}
