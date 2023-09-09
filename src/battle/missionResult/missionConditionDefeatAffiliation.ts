import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {MissionCondition, MissionConditionType} from "./missionCondition";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {MissionMapSquaddieDatum} from "../../missionMap/missionMap";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {CanSquaddieActRightNow} from "../../squaddie/squaddieService";

export class MissionConditionDefeatAffiliation extends MissionCondition {
    private readonly _affiliation: SquaddieAffiliation;

    constructor({
                    affiliation,
                }: {
        affiliation: SquaddieAffiliation,
    }) {
        switch (affiliation) {
            case SquaddieAffiliation.ENEMY:
                super(MissionConditionType.DEFEAT_ALL_ENEMIES);
                break;
            case SquaddieAffiliation.PLAYER:
                super(MissionConditionType.DEFEAT_ALL_PLAYERS);
                break;
            case SquaddieAffiliation.ALLY:
                super(MissionConditionType.DEFEAT_ALL_ALLIES);
                break;
            case SquaddieAffiliation.NONE:
                super(MissionConditionType.DEFEAT_ALL_NO_AFFILIATIONS);
                break;
            default:
                throw new Error(`No mission condition type exists for defeat all ${affiliation}`);
        }

        this._affiliation = affiliation;
    }

    get affiliation(): SquaddieAffiliation {
        return this._affiliation;
    }

    shouldBeComplete(state: BattleOrchestratorState): boolean {
        if (this.isComplete !== undefined) {
            return this.isComplete;
        }

        const livingSquaddie = state.missionMap.getAllSquaddieData().find((livingSquaddieDatum: MissionMapSquaddieDatum) => {
            const {
                staticSquaddie,
                dynamicSquaddie,
            } = getResultOrThrowError(state.squaddieRepository.getSquaddieByDynamicId(livingSquaddieDatum.dynamicSquaddieId));

            if (staticSquaddie.squaddieId.affiliation !== this.affiliation) {
                return false;
            }

            const {
                isDead
            } = CanSquaddieActRightNow({staticSquaddie, dynamicSquaddie})
            return !isDead;
        });

        return !livingSquaddie;
    }
}
