import {ImageUI} from "../ui/imageUI";
import {SquaddieTurn} from "../squaddie/turn";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {InBattleAttributes} from "./stats/inBattleAttributes";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

export class BattleSquaddie {
    private readonly _battleSquaddieId: string;
    private readonly _squaddieTurn: SquaddieTurn;

    constructor({
                    battleSquaddieId,
                    mapIcon,
                    squaddieTurn,
                    squaddieTemplate,
                    squaddieTemplateId,
                    inBattleAttributes,
                }: {
        squaddieTemplateId?: string,
        squaddieTemplate?: SquaddieTemplate,
        battleSquaddieId: string,
        squaddieTurn?: SquaddieTurn,
        mapIcon?: ImageUI,
        inBattleAttributes?: InBattleAttributes,
    }) {
        this._battleSquaddieId = battleSquaddieId;

        if (squaddieTemplate) {
            this.copySquaddieTemplate(squaddieTemplate);
        } else {
            this._squaddieTemplateId = squaddieTemplateId;
            this._inBattleAttributes = new InBattleAttributes();
        }

        if (inBattleAttributes) {
            this._inBattleAttributes = inBattleAttributes;
        }

        this._squaddieTurn = squaddieTurn || new SquaddieTurn({});
        this._mapIcon = mapIcon;

        this.assertBattleSquaddie();
    }

    private _squaddieTemplateId: string;

    get squaddieTemplateId(): string {
        return this._squaddieTemplateId;
    }

    get battleSquaddieId(): string {
        return this._battleSquaddieId;
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

    assertBattleSquaddie(): void {
        if (!this._battleSquaddieId) throw new Error("Battle Squaddie has no Id");
        if (!this._squaddieTemplateId) throw new Error("Battle Squaddie has no Squaddie Template Id");
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

    private copySquaddieTemplate(squaddieTemplate: SquaddieTemplate) {
        this._squaddieTemplateId = squaddieTemplate.squaddieId.templateId;
        this.initializeInBattleAttributes(squaddieTemplate.attributes);
    }
}
