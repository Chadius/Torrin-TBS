import {TODODELETEMESquaddieDecisionsDuringThisPhase} from "../history/TODODELETEMESquaddieDecisionsDuringThisPhase";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {ObjectRepository} from "../objectRepository";
import {ActionsThisRound} from "../history/actionsThisRound";

export type TeamStrategyStateRequiredOptions = {
    missionMap: MissionMap;
    team: BattleSquaddieTeam;
    squaddieRepository: ObjectRepository;
}

export type TeamStrategyStateOptionalOptions = {
    instruction: TODODELETEMESquaddieDecisionsDuringThisPhase;
};

export class TODODELTEMETeamStrategyState {
    private readonly _missionMap: MissionMap;
    private readonly _team: BattleSquaddieTeam;
    private readonly _repository: ObjectRepository;

    constructor(options: TeamStrategyStateRequiredOptions & Partial<TeamStrategyStateOptionalOptions>) {
        this._instruction = options.instruction;
        this._missionMap = options.missionMap;
        this._team = options.team;
        this._repository = options.squaddieRepository;
    }

    get repository(): ObjectRepository {
        return this._repository;
    }

    get team(): BattleSquaddieTeam {
        return this._team;
    }

    get missionMap(): MissionMap {
        return this._missionMap;
    }

    private _instruction: TODODELETEMESquaddieDecisionsDuringThisPhase;

    get instruction(): TODODELETEMESquaddieDecisionsDuringThisPhase {
        return this._instruction;
    }

    reset() {
        this._instruction = undefined;
    }

    setInstruction(instruction: TODODELETEMESquaddieDecisionsDuringThisPhase) {
        this._instruction = instruction;
    }
}
