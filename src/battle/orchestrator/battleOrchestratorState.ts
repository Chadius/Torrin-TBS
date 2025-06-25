import { BattleState, BattleStateService } from "../battleState/battleState"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { BattleCompletionStatus } from "./missionObjectivesAndCutscenes"
import { NumberGeneratorStrategy } from "../numberGenerator/strategy"
import { RandomNumberGenerator } from "../numberGenerator/random"
import { getValidValueOrDefault } from "../../utils/objectValidityCheck"
import {
    BattleHUDState,
    BattleHUDStateService,
} from "../hud/battleHUD/battleHUDState"
import { FileAccessHUDService } from "../hud/fileAccess/fileAccessHUD"
import { BattleHUD, BattleHUDService } from "../hud/battleHUD/battleHUD"
import {
    CutsceneIdQueue,
    CutsceneQueueService,
} from "../cutscene/cutsceneIdQueue"
import {
    PlayerDecisionHUD,
    PlayerDecisionHUDService,
} from "../hud/playerActionPanel/playerDecisionHUD"
import {
    SearchResultsCache,
    SearchResultsCacheService,
} from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import { Glossary } from "../../campaign/glossary/glossary"

export type BattleCache = {
    searchResultsCache: SearchResultsCache
}

export class BattleOrchestratorState {
    battleHUD: BattleHUD
    playerDecisionHUD: PlayerDecisionHUD
    numberGenerator: NumberGeneratorStrategy
    battleState: BattleState
    battleHUDState: BattleHUDState
    cutsceneQueue: CutsceneIdQueue
    cache: BattleCache
    glossary: Glossary

    constructor({
        numberGenerator,
        battleState,
        battleHUDState,
        battleHUD,
        cutsceneIdsToPlay,
    }: {
        numberGenerator: NumberGeneratorStrategy
        battleState: BattleState
        battleHUDState?: BattleHUDState
        battleHUD?: BattleHUD
        cutsceneIdsToPlay?: string[]
    }) {
        this.battleState = battleState
        this.battleHUD = getValidValueOrDefault(
            battleHUD,
            BattleHUDService.new({})
        )
        this.numberGenerator = numberGenerator
        this.battleHUDState = getValidValueOrDefault(
            battleHUDState,
            BattleHUDStateService.new({})
        )
        this.cutsceneQueue = CutsceneQueueService.new()
        CutsceneQueueService.addList(
            this.cutsceneQueue,
            cutsceneIdsToPlay || []
        )
        this.playerDecisionHUD = PlayerDecisionHUDService.new()
        this.cache = {
            searchResultsCache: SearchResultsCacheService.new(),
        }
        this.glossary = new Glossary()
    }

    get isValid(): boolean {
        if (!BattleStateService.isValid(this.battleState)) {
            return false
        }

        return this.missingComponents.length === 0
    }

    get missingComponents(): BattleOrchestratorStateValidityReason[] {
        const expectedComponents = {
            [BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE]:
                BattleStateService.isValid(this.battleState),
            [BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR]:
                this.numberGenerator !== undefined,
        }

        return Object.keys(expectedComponents)
            .map((str) => str as BattleOrchestratorStateValidityReason)
            .filter(
                (battleOrchestratorStateValidityReason) =>
                    expectedComponents[
                        battleOrchestratorStateValidityReason
                    ] === false
            )
    }

    public copyOtherOrchestratorState(other: BattleOrchestratorState): void {
        this.battleState = BattleStateService.clone(other.battleState)
        this.battleHUD = getValidValueOrDefault(other.battleHUD, {
            fileAccessHUD: FileAccessHUDService.new(),
        })
        this.numberGenerator = other.numberGenerator.clone()
        this.playerDecisionHUD = PlayerDecisionHUDService.new()
        this.glossary = other.glossary
    }
}

export enum BattleOrchestratorStateValidityReason {
    MISSING_NUMBER_GENERATOR = "MISSING_NUMBER_GENERATOR",
    INVALID_BATTLE_STATE = "INVALID_BATTLE_STATE",
}

export const BattleOrchestratorStateService = {
    new: ({
        numberGenerator,
        battleState,
        battleHUDState,
        battleHUD,
        cutsceneIdsToPlay,
    }: {
        numberGenerator?: NumberGeneratorStrategy
        battleState?: BattleState
        battleHUDState?: BattleHUDState
        battleHUD?: BattleHUD
        cutsceneIdsToPlay?: string[]
    }): BattleOrchestratorState => {
        return newOrchestratorState({
            numberGenerator,
            battleState,
            battleHUDState,
            battleHUD,
            cutsceneIdsToPlay,
        })
    },
}

const newOrchestratorState = ({
    numberGenerator,
    battleState,
    battleHUDState,
    battleHUD,
    cutsceneIdsToPlay,
}: {
    numberGenerator?: NumberGeneratorStrategy
    battleState?: BattleState
    battleHUDState?: BattleHUDState
    battleHUD?: BattleHUD
    cutsceneIdsToPlay?: string[]
}): BattleOrchestratorState => {
    return new BattleOrchestratorState({
        battleState:
            battleState ??
            BattleStateService.newBattleState({
                campaignId: "test campaign",
                missionId: "test mission",
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
                battleCompletionStatus: BattleCompletionStatus.IN_PROGRESS,
            }),
        numberGenerator: numberGenerator ?? new RandomNumberGenerator(),
        battleHUDState: battleHUDState,
        battleHUD: getValidValueOrDefault(battleHUD, BattleHUDService.new({})),
        cutsceneIdsToPlay,
    })
}
