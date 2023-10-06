import {SquaddieActionsForThisRound} from "../history/squaddieActionsForThisRound";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

export type TeamStrategyStateRequiredOptions = {
    missionMap: MissionMap;
    team: BattleSquaddieTeam;
    squaddieRepository: BattleSquaddieRepository;
}

export type TeamStrategyStateOptionalOptions = {
    instruction: SquaddieActionsForThisRound;
};

export class TeamStrategyState {
    private readonly _missionMap: MissionMap;
    private readonly _team: BattleSquaddieTeam;
    private readonly _squaddieRepository: BattleSquaddieRepository;

    constructor(options: TeamStrategyStateRequiredOptions & Partial<TeamStrategyStateOptionalOptions>) {
        this._instruction = options.instruction;
        this._missionMap = options.missionMap;
        this._team = options.team;
        this._squaddieRepository = options.squaddieRepository;
    }

    get squaddieRepository(): BattleSquaddieRepository {
        return this._squaddieRepository;
    }

    get team(): BattleSquaddieTeam {
        return this._team;
    }

    get missionMap(): MissionMap {
        return this._missionMap;
    }

    private _instruction: SquaddieActionsForThisRound;

    get instruction(): SquaddieActionsForThisRound {
        return this._instruction;
    }

    reset() {
        this._instruction = undefined;
    }

    setInstruction(instruction: SquaddieActionsForThisRound) {
        this._instruction = instruction;
    }
}
