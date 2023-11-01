import {ImageUI} from "../ui/imageUI";
import {SquaddieTurn, SquaddieTurnHandler} from "../squaddie/turn";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {InBattleAttributes, InBattleAttributesHandler} from "./stats/inBattleAttributes";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

export class BattleSquaddie {
    squaddieTurn: SquaddieTurn;
    inBattleAttributes: InBattleAttributes;
    private readonly _battleSquaddieId: string;

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
            this.inBattleAttributes = InBattleAttributesHandler.new();
        }

        if (inBattleAttributes) {
            this.inBattleAttributes = inBattleAttributes;
        }

        this.squaddieTurn = squaddieTurn || {remainingActionPoints: 3};
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

    private _mapIcon?: ImageUI;

    get mapIcon(): ImageUI {
        return this._mapIcon;
    }

    set mapIcon(value: ImageUI) {
        this._mapIcon = value;
    }

    assertBattleSquaddie(): void {
        if (!this._battleSquaddieId) throw new Error("Battle Squaddie has no Id");
        if (!this._squaddieTemplateId) throw new Error("Battle Squaddie has no Squaddie Template Id");
    }

    canStillActThisRound(): boolean {
        return SquaddieTurnHandler.hasActionPointsRemaining(this.squaddieTurn);
    }

    beginNewRound() {
        return SquaddieTurnHandler.beginNewRound(this.squaddieTurn);
    }

    endTurn() {
        return SquaddieTurnHandler.endTurn(this.squaddieTurn);
    }

    initializeInBattleAttributes(attributes: ArmyAttributes) {
        this.inBattleAttributes = InBattleAttributesHandler.new(attributes);
    }

    private copySquaddieTemplate(squaddieTemplate: SquaddieTemplate) {
        this._squaddieTemplateId = squaddieTemplate.squaddieId.templateId;
        this.initializeInBattleAttributes(squaddieTemplate.attributes);
    }
}
