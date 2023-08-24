import {MissionCondition, MissionConditionType} from "./missionCondition";
import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {MissionMapSquaddieDatum} from "../../missionMap/missionMap";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {CanSquaddieActRightNow} from "../../squaddie/squaddieService";

export class MissionConditionDefeatAllEnemies extends MissionCondition {
    constructor({squaddieRepository}: { squaddieRepository: BattleSquaddieRepository }) {
        super(MissionConditionType.DEFEAT_ALL_ENEMIES);
        this._squaddieRepository = squaddieRepository;
    }

    private _squaddieRepository: BattleSquaddieRepository;

    get squaddieRepository(): BattleSquaddieRepository {
        return this._squaddieRepository;
    }

    shouldBeComplete(state: BattleOrchestratorState): boolean {
        if (this.isComplete !== undefined) {
            return this.isComplete;
        }

        const livingSquaddie = state.missionMap.getAllSquaddieData().find((livingSquaddieDatum: MissionMapSquaddieDatum) => {
            const {
                staticSquaddie,
                dynamicSquaddie,
            } = getResultOrThrowError(this.squaddieRepository.getSquaddieByDynamicId(livingSquaddieDatum.dynamicSquaddieId));

            if (staticSquaddie.squaddieId.affiliation !== SquaddieAffiliation.ENEMY) {
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
