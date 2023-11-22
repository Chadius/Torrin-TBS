import {SquaddieTurn, SquaddieTurnHandler} from "../squaddie/turn";
import {ArmyAttributes} from "../squaddie/armyAttributes";
import {InBattleAttributes, InBattleAttributesHandler} from "./stats/inBattleAttributes";
import {SquaddieTemplate} from "../campaign/squaddieTemplate";

export interface BattleSquaddie {
    squaddieTurn: SquaddieTurn;
    inBattleAttributes: InBattleAttributes;
    battleSquaddieId: string;
    squaddieTemplateId: string;
}

export const BattleSquaddieHelper = {
    newBattleSquaddie: ({
                            battleSquaddieId,
                            squaddieTurn,
                            squaddieTemplate,
                            squaddieTemplateId,
                            inBattleAttributes,
                        }: {
        squaddieTemplateId?: string,
        squaddieTemplate?: SquaddieTemplate,
        battleSquaddieId: string,
        squaddieTurn?: SquaddieTurn,
        inBattleAttributes?: InBattleAttributes,
    }): BattleSquaddie => {
        let newBattleSquaddie: BattleSquaddie = {
            battleSquaddieId,
            squaddieTurn: squaddieTurn || SquaddieTurnHandler.new(),
            squaddieTemplateId,
            inBattleAttributes: InBattleAttributesHandler.new(),
        };

        if (squaddieTemplate) {
            newFromSquaddieTemplate(newBattleSquaddie, squaddieTemplate);
        }
        if (inBattleAttributes) {
            newBattleSquaddie.inBattleAttributes = inBattleAttributes;
        }

        assertBattleSquaddie(newBattleSquaddie);
        return newBattleSquaddie;
    },
    assertBattleSquaddie: (data: BattleSquaddie): void => {
        assertBattleSquaddie(data);
    },
    canStillActThisRound: (data: BattleSquaddie): boolean => {
        return SquaddieTurnHandler.hasActionPointsRemaining(data.squaddieTurn);
    },
    beginNewRound: (data: BattleSquaddie) => {
        return SquaddieTurnHandler.beginNewRound(data.squaddieTurn);
    },
    endTurn: (data: BattleSquaddie) => {
        return SquaddieTurnHandler.endTurn(data.squaddieTurn);
    },
    initializeInBattleAttributes: (data: BattleSquaddie, attributes: ArmyAttributes): void => {
        data.inBattleAttributes = InBattleAttributesHandler.new(attributes);
    },
};

const assertBattleSquaddie = (data: BattleSquaddie): void => {
    if (!data.battleSquaddieId) throw new Error("Battle Squaddie has no Id");
    if (!data.squaddieTemplateId) throw new Error("Battle Squaddie has no Squaddie Template Id");
}

const newFromSquaddieTemplate = (data: BattleSquaddie, template: SquaddieTemplate): void => {
    data.squaddieTemplateId = template.squaddieId.templateId;
    data.inBattleAttributes = InBattleAttributesHandler.new(template.attributes);
}

export class BattleSquaddieOld {
    squaddieTurn: SquaddieTurn;
    inBattleAttributes: InBattleAttributes;
    private readonly _battleSquaddieId: string;

    constructor({
                    battleSquaddieId,
                    squaddieTurn,
                    squaddieTemplate,
                    squaddieTemplateId,
                    inBattleAttributes,
                }: {
        squaddieTemplateId?: string,
        squaddieTemplate?: SquaddieTemplate,
        battleSquaddieId: string,
        squaddieTurn?: SquaddieTurn,
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

        this.assertBattleSquaddie();
    }

    private _squaddieTemplateId: string;

    get squaddieTemplateId(): string {
        return this._squaddieTemplateId;
    }

    get battleSquaddieId(): string {
        return this._battleSquaddieId;
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
