import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {BattleState, BattleStateService} from "./battleState";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {BattleCompletionStatus} from "./missionObjectivesAndCutscenes";
import {NumberGeneratorStrategy} from "../numberGenerator/strategy";
import {RandomNumberGenerator} from "../numberGenerator/random";
import {getValidValueOrDefault} from "../../utils/validityCheck";
import {BATTLE_HUD_MODE} from "../../configuration/config";
import {BattleHUDState, BattleHUDStateService} from "../hud/battleHUDState";
import {FileAccessHUDService} from "../hud/fileAccessHUD";
import {BattleHUD, BattleHUDService} from "../hud/battleHUD";


export class BattleOrchestratorState {
    battleHUD: BattleHUD;
    numberGenerator: NumberGeneratorStrategy;
    battleState: BattleState;
    battleHUDState: BattleHUDState;

    constructor({
                    numberGenerator,
                    battleState,
                    battleHUDState,
                    battleHUD,
                }: {
        numberGenerator: NumberGeneratorStrategy,
        battleState: BattleState,
        battleHUDState?: BattleHUDState,
        battleHUD?: BattleHUD,
    }) {
        this.battleState = battleState;
        this.battleHUD = getValidValueOrDefault(battleHUD, BattleHUDService.new({}));
        this.numberGenerator = numberGenerator;
        this.battleHUDState = getValidValueOrDefault(battleHUDState, BattleHUDStateService.new({}));
    }

    get isValid(): boolean {
        if (!BattleStateService.isValid(this.battleState)) {
            return false;
        }

        return (this.missingComponents.length === 0);
    }

    get missingComponents(): BattleOrchestratorStateValidityReason[] {
        const expectedComponents = {
            [BattleOrchestratorStateValidityReason.MISSING_BATTLE_SQUADDIE_SELECTED_HUD]: this.battleHUD.battleSquaddieSelectedHUD !== undefined,
            [BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE]: BattleStateService.isValid(this.battleState),
            [BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR]: this.numberGenerator !== undefined,
        }

        return Object.keys(expectedComponents)
            .map((str) => str as BattleOrchestratorStateValidityReason)
            .filter((component) => expectedComponents[component] === false);
    }

    public clone(): BattleOrchestratorState {
        return BattleOrchestratorStateService.newOrchestratorState({
            battleState: BattleStateService.clone(this.battleState),
            numberGenerator: this.numberGenerator ? this.numberGenerator.clone() : undefined,
            battleHUDState: BattleHUDStateService.clone(this.battleHUDState),
            battleHUD: this.battleHUD,
        });
    }

    public copyOtherOrchestratorState(other: BattleOrchestratorState): void {
        this.battleState = BattleStateService.clone(other.battleState);
        this.battleHUD = getValidValueOrDefault(other.battleHUD, {
            battleSquaddieSelectedHUD: other.battleHUD.battleSquaddieSelectedHUD,
            fileAccessHUD: FileAccessHUDService.new({}),
        });
        this.numberGenerator = other.numberGenerator.clone();
    }
}

export enum BattleOrchestratorStateValidityReason {
    MISSING_BATTLE_SQUADDIE_SELECTED_HUD = "MISSING_BATTLE_SQUADDIE_SELECTED_HUD",
    MISSING_NUMBER_GENERATOR = "MISSING_NUMBER_GENERATOR",
    INVALID_BATTLE_STATE = "INVALID_BATTLE_STATE",
}

export const BattleOrchestratorStateService = {
    newOrchestratorState: ({
                               numberGenerator,
                               battleState,
                               battleHUDState,
                               battleHUD,
                           }: {
        numberGenerator?: NumberGeneratorStrategy,
        battleState?: BattleState,
        battleHUDState?: BattleHUDState,
        battleHUD?: BattleHUD,
    }): BattleOrchestratorState => {
        return newOrchestratorState({
            numberGenerator,
            battleState,
            battleHUDState,
            battleHUD: battleHUD,
        });
    },
    new: ({
              numberGenerator,
              battleState,
              battleHUDState,
          }: {
        numberGenerator?: NumberGeneratorStrategy,
        battleState?: BattleState,
        battleHUDState?: BattleHUDState,
    }): BattleOrchestratorState => {
        return newOrchestratorState({
            numberGenerator,
            battleState,
            battleHUDState,
        });
    },
    swapHUD: ({battleOrchestratorState}: { battleOrchestratorState: BattleOrchestratorState }) => {
        if (battleOrchestratorState.battleHUDState.hudMode === BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD) {
            battleOrchestratorState.battleHUDState.hudMode = BATTLE_HUD_MODE.BATTLE_HUD_PANEL;
            return;
        }
        battleOrchestratorState.battleHUDState.hudMode = BATTLE_HUD_MODE.BATTLE_SQUADDIE_SELECTED_HUD;
    }
};

const newOrchestratorState = ({
                                  numberGenerator,
                                  battleState,
                                  battleHUDState,
                                  battleHUD,
                              }: {
    numberGenerator?: NumberGeneratorStrategy,
    battleState?: BattleState,
    battleHUDState?: BattleHUDState,
    battleHUD?: BattleHUD,
}): BattleOrchestratorState => {
    return new BattleOrchestratorState({
        battleState: battleState ?? BattleStateService.newBattleState({
            missionId: "test mission",
            battlePhaseState: {
                turnCount: 0,
                currentAffiliation: BattlePhase.UNKNOWN,
            },
            battleCompletionStatus: BattleCompletionStatus.IN_PROGRESS,
        }),
        numberGenerator: numberGenerator ?? new RandomNumberGenerator(),
        battleHUDState: battleHUDState,
        battleHUD: getValidValueOrDefault(battleHUD, BattleHUDService.new({
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
        })),
    });
};
