import {SquaddieDecisionsDuringThisPhase} from "../history/squaddieDecisionsDuringThisPhase";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {ObjectRepository} from "../objectRepository";

export type TeamStrategyStateRequiredOptions = {
    missionMap: MissionMap;
    team: BattleSquaddieTeam;
    squaddieRepository: ObjectRepository;
}

export type TeamStrategyStateOptionalOptions = {
    instruction: SquaddieDecisionsDuringThisPhase;
};

export class TeamStrategyState {
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

    private _instruction: SquaddieDecisionsDuringThisPhase;

    get instruction(): SquaddieDecisionsDuringThisPhase {
        return this._instruction;
    }

    reset() {
        this._instruction = undefined;
    }

    setInstruction(instruction: SquaddieDecisionsDuringThisPhase) {
        this._instruction = instruction;
    }
}
