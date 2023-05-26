import {SquaddieInstruction} from "../history/squaddieInstruction";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";

export type TeamStrategyStateRequiredOptions = {
    missionMap: MissionMap;
    team: BattleSquaddieTeam;
    squaddieRepository: BattleSquaddieRepository;
}

export type TeamStrategyStateOptionalOptions = {
    instruction: SquaddieInstruction;
};

export class TeamStrategyState {
    instruction: SquaddieInstruction;
    missionMap: MissionMap;
    team: BattleSquaddieTeam;
    squaddieRepository: BattleSquaddieRepository;

    constructor(options: TeamStrategyStateRequiredOptions & Partial<TeamStrategyStateOptionalOptions>) {
        this.instruction = options.instruction;
        this.missionMap = options.missionMap;
        this.team = options.team;
        this.squaddieRepository = options.squaddieRepository;
    }

    reset() {
        this.instruction = undefined;
    }

    getInstruction(): SquaddieInstruction {
        return this.instruction;
    }

    setInstruction(instruction: SquaddieInstruction) {
        this.instruction = instruction;
    }

    getTeam(): BattleSquaddieTeam {
        return this.team;
    }

    getMissionMap(): MissionMap {
        return this.missionMap;
    }

    getSquaddieRepository(): BattleSquaddieRepository {
        return this.squaddieRepository;
    }
}
