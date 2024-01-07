import {squaddieDecisionsDuringThisPhase} from "../history/squaddieDecisionsDuringThisPhase";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {ObjectRepository} from "../objectRepository";

export type TeamStrategyStateRequiredOptions = {
    missionMap: MissionMap;
    team: BattleSquaddieTeam;
    squaddieRepository: ObjectRepository;
}

export type TeamStrategyStateOptionalOptions = {
    instruction: squaddieDecisionsDuringThisPhase;
};

export class TeamStrategyState {
    private readonly _missionMap: MissionMap;
    private readonly _team: BattleSquaddieTeam;
    private readonly _squaddieRepository: ObjectRepository;

    constructor(options: TeamStrategyStateRequiredOptions & Partial<TeamStrategyStateOptionalOptions>) {
        this._instruction = options.instruction;
        this._missionMap = options.missionMap;
        this._team = options.team;
        this._squaddieRepository = options.squaddieRepository;
    }

    get squaddieRepository(): ObjectRepository {
        return this._squaddieRepository;
    }

    get team(): BattleSquaddieTeam {
        return this._team;
    }

    get missionMap(): MissionMap {
        return this._missionMap;
    }

    private _instruction: squaddieDecisionsDuringThisPhase;

    get instruction(): squaddieDecisionsDuringThisPhase {
        return this._instruction;
    }

    reset() {
        this._instruction = undefined;
    }

    setInstruction(instruction: squaddieDecisionsDuringThisPhase) {
        this._instruction = instruction;
    }
}
