import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {BattleState, BattleStateHelper} from "./battleState";
import {BattlePhase} from "../orchestratorComponents/battlePhaseTracker";

export class BattleOrchestratorState {
    resourceHandler: ResourceHandler;
    squaddieRepository: BattleSquaddieRepository;
    battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD;
    battleState: BattleState;

    constructor({
                    squaddieRepository,
                    resourceHandler,
                    battleSquaddieSelectedHUD,
                    battleState,
                }: {
        squaddieRepository: BattleSquaddieRepository,
        resourceHandler: ResourceHandler,
        battleSquaddieSelectedHUD: BattleSquaddieSelectedHUD,
        battleState: BattleState,
    }) {
        this.resourceHandler = resourceHandler;
        this.battleState = battleState;
        this.battleSquaddieSelectedHUD = battleSquaddieSelectedHUD;
        this.squaddieRepository = squaddieRepository;
    }

    get isValid(): boolean {
        if (!BattleStateHelper.isValid(this.battleState)) {
            return false;
        }

        return (this.missingComponents.length === 0);
    }

    get missingComponents(): BattleOrchestratorStateValidityMissingComponent[] {
        const expectedComponents = {
            [BattleOrchestratorStateValidityMissingComponent.RESOURCE_HANDLER]: this.resourceHandler !== undefined,
            [BattleOrchestratorStateValidityMissingComponent.SQUADDIE_REPOSITORY]: this.squaddieRepository !== undefined,
            [BattleOrchestratorStateValidityMissingComponent.BATTLE_SQUADDIE_SELECTED_HUD]: this.battleSquaddieSelectedHUD !== undefined,
            [BattleOrchestratorStateValidityMissingComponent.INVALID_BATTLE_STATE]: BattleStateHelper.isValid(this.battleState),
        }

        return Object.keys(expectedComponents)
            .map((str) => str as BattleOrchestratorStateValidityMissingComponent)
            .filter((component) => expectedComponents[component] === false);
    }

    public clone(): BattleOrchestratorState {
        return new BattleOrchestratorState({
            resourceHandler: this.resourceHandler,
            squaddieRepository: this.squaddieRepository,
            battleState: BattleStateHelper.clone(this.battleState),
            battleSquaddieSelectedHUD: this.battleSquaddieSelectedHUD,
        });
    }

    public copyOtherOrchestratorState(other: BattleOrchestratorState): void {
        this.resourceHandler = other.resourceHandler;
        this.squaddieRepository = other.squaddieRepository;
        this.battleState = BattleStateHelper.clone(other.battleState);
        this.battleSquaddieSelectedHUD = other.battleSquaddieSelectedHUD;
    }
}

export enum BattleOrchestratorStateValidityMissingComponent {
    RESOURCE_HANDLER = "RESOURCE_HANDLER",
    SQUADDIE_REPOSITORY = "SQUADDIE_REPOSITORY",
    BATTLE_SQUADDIE_SELECTED_HUD = "BATTLE_SQUADDIE_SELECTED_HUD",
    INVALID_BATTLE_STATE = "INVALID_BATTLE_STATE"
}

export const BattleOrchestratorStateHelper = {
    newOrchestratorState: ({
                               resourceHandler
                           }: {
        resourceHandler: ResourceHandler
    }): BattleOrchestratorState => {
        return new BattleOrchestratorState({
            resourceHandler,
            squaddieRepository: new BattleSquaddieRepository(),
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: BattleStateHelper.newBattleState({
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                }
            }),
        });
    },
};

