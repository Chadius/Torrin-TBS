import {ResourceHandler} from "../../resource/resourceHandler";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddieSelectedHUD} from "../hud/battleSquaddieSelectedHUD";
import {BattleState, BattleStateService} from "./battleState";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";
import {BattleCompletionStatus} from "./missionObjectivesAndCutscenes";
import {NumberGeneratorStrategy} from "../numberGenerator/strategy";
import {RandomNumberGenerator} from "../numberGenerator/random";
import {DecisionActionEffectIterator} from "../orchestratorComponents/decisionActionEffectIterator";

export class BattleOrchestratorState {
    resourceHandler: ResourceHandler;
    squaddieRepository: ObjectRepository;
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    numberGenerator: NumberGeneratorStrategy;
    battleState: BattleState;
    decisionActionEffectIterator: DecisionActionEffectIterator;

    constructor({
                    squaddieRepository,
                    resourceHandler,
                    battleSquaddieSelectedHUD,
                    numberGenerator,
                    battleState,
                    decisionActionEffectIterator,
                }: {
        squaddieRepository: ObjectRepository,
        resourceHandler: ResourceHandler,
        battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD,
        numberGenerator: NumberGeneratorStrategy,
        battleState: BattleState,
        decisionActionEffectIterator: DecisionActionEffectIterator
    }) {
        this.resourceHandler = resourceHandler;
        this.battleState = battleState;
        this.battleSquaddieSelectedHUD = battleSquaddieSelectedHUD;
        this.squaddieRepository = squaddieRepository;
        this.numberGenerator = numberGenerator;
        this.decisionActionEffectIterator = decisionActionEffectIterator;
    }

    get isValid(): boolean {
        if (!BattleStateService.isValid(this.battleState)) {
            return false;
        }

        return (this.missingComponents.length === 0);
    }

    get missingComponents(): BattleOrchestratorStateValidityReason[] {
        const expectedComponents = {
            [BattleOrchestratorStateValidityReason.MISSING_RESOURCE_HANDLER]: this.resourceHandler !== undefined,
            [BattleOrchestratorStateValidityReason.MISSING_SQUADDIE_REPOSITORY]: this.squaddieRepository !== undefined,
            [BattleOrchestratorStateValidityReason.MISSING_BATTLE_SQUADDIE_SELECTED_HUD]: this.battleSquaddieSelectedHUD !== undefined,
            [BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE]: BattleStateService.isValid(this.battleState),
            [BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR]: this.numberGenerator !== undefined,
        }

        return Object.keys(expectedComponents)
            .map((str) => str as BattleOrchestratorStateValidityReason)
            .filter((component) => expectedComponents[component] === false);
    }

    public clone(): BattleOrchestratorState {
        return BattleOrchestratorStateService.newOrchestratorState({
            resourceHandler: this.resourceHandler,
            squaddieRepository: this.squaddieRepository,
            battleState: BattleStateService.clone(this.battleState),
            battleSquaddieSelectedHUD: this.battleSquaddieSelectedHUD,
            numberGenerator: this.numberGenerator ? this.numberGenerator.clone() : undefined,
        });
    }

    public copyOtherOrchestratorState(other: BattleOrchestratorState): void {
        this.resourceHandler = other.resourceHandler;
        this.squaddieRepository = other.squaddieRepository;
        this.battleState = BattleStateService.clone(other.battleState);
        this.battleSquaddieSelectedHUD = other.battleSquaddieSelectedHUD;
        this.numberGenerator = other.numberGenerator.clone();
    }
}

export enum BattleOrchestratorStateValidityReason {
    MISSING_RESOURCE_HANDLER = "MISSING_RESOURCE_HANDLER",
    MISSING_SQUADDIE_REPOSITORY = "MISSING_SQUADDIE_REPOSITORY",
    MISSING_BATTLE_SQUADDIE_SELECTED_HUD = "MISSING_BATTLE_SQUADDIE_SELECTED_HUD",
    MISSING_NUMBER_GENERATOR = "MISSING_NUMBER_GENERATOR",
    INVALID_BATTLE_STATE = "INVALID_BATTLE_STATE",
}

export const BattleOrchestratorStateService = {
    newOrchestratorState: ({
                               resourceHandler,
                               squaddieRepository,
                               battleSquaddieSelectedHUD,
                               numberGenerator,
                               battleState,
                               decisionActionEffectIterator,
                           }: {
        resourceHandler: ResourceHandler,
        squaddieRepository?: ObjectRepository,
        battleSquaddieSelectedHUD?: BattleSquaddieSelectedHUD,
        numberGenerator?: NumberGeneratorStrategy,
        battleState?: BattleState,
        decisionActionEffectIterator?: DecisionActionEffectIterator,
    }): BattleOrchestratorState => {
        return new BattleOrchestratorState({
            resourceHandler,
            squaddieRepository: squaddieRepository ?? ObjectRepositoryService.new(),
            battleSquaddieSelectedHUD: battleSquaddieSelectedHUD ?? new BattleSquaddieSelectedHUD(),
            battleState: battleState ?? BattleStateService.newBattleState({
                missionId: "test mission",
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
                battleCompletionStatus: BattleCompletionStatus.IN_PROGRESS,
            }),
            numberGenerator: numberGenerator ?? new RandomNumberGenerator(),
            decisionActionEffectIterator: decisionActionEffectIterator,
        });
    },
};

