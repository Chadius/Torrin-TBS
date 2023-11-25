import {BattleOrchestratorState, BattleOrchestratorStateValidityMissingComponent} from "./battleOrchestratorState";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullMissionMap} from "../../utils/test/battleOrchestratorState";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {StubImmediateLoader} from "../../resource/resourceHandlerTestUtils";
import {MissionObjectiveHelper} from "../missionResult/missionObjective";
import {MissionRewardType} from "../missionResult/missionReward";
import {MissionConditionType} from "../missionResult/missionCondition";
import {BattleSquaddieSelectedHUD} from "../battleSquaddieSelectedHUD";
import {BattleState, BattleStateHelper} from "./battleState";

describe('orchestratorState', () => {
    let validBattleState: BattleState;

    beforeEach(() => {
        validBattleState = BattleStateHelper.newBattleState({
            missionId: "test mission",
            missionMap: NullMissionMap(),
            teamsByAffiliation: {
                [SquaddieAffiliation.PLAYER]: {
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                },
                [SquaddieAffiliation.ENEMY]: {
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                },
            },
            objectives: [
                MissionObjectiveHelper.validateMissionObjective({
                    id: "mission objective id",
                    reward: {rewardType: MissionRewardType.VICTORY},
                    hasGivenReward: false,
                    conditions: [
                        {
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            id: "defeat all enemies",
                        }
                    ],
                    numberOfRequiredConditionsToComplete: 1,
                })
            ],
        });
    });

    it('will indicate if it is ready for battle', () => {
        const validityCheck = (args: any, isValid: boolean, reasons: BattleOrchestratorStateValidityMissingComponent[]) => {
            const state: BattleOrchestratorState = new BattleOrchestratorState(args);
            expect(state.isValid).toBe(isValid);
            expect(state.missingComponents.sort()).toStrictEqual(reasons.sort());
        }

        let args = {};
        validityCheck(args, false, [
            BattleOrchestratorStateValidityMissingComponent.BATTLE_SQUADDIE_SELECTED_HUD,
            BattleOrchestratorStateValidityMissingComponent.RESOURCE_HANDLER,
            BattleOrchestratorStateValidityMissingComponent.SQUADDIE_REPOSITORY,
            BattleOrchestratorStateValidityMissingComponent.INVALID_BATTLE_STATE,
        ]);


        args = {
            ...args,
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityMissingComponent.SQUADDIE_REPOSITORY,
            BattleOrchestratorStateValidityMissingComponent.BATTLE_SQUADDIE_SELECTED_HUD,
            BattleOrchestratorStateValidityMissingComponent.INVALID_BATTLE_STATE,
        ]);

        const squaddieRepository: BattleSquaddieRepository = new BattleSquaddieRepository();
        args = {
            ...args,
            squaddieRepository,
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityMissingComponent.BATTLE_SQUADDIE_SELECTED_HUD,
            BattleOrchestratorStateValidityMissingComponent.INVALID_BATTLE_STATE,
        ]);

        args = {
            ...args,
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD()
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityMissingComponent.INVALID_BATTLE_STATE,
        ]);

        args = {
            ...args,
            battleState: validBattleState,
        }
        validityCheck(args, true, []);
    });

    it('can clone existing objects', () => {
        let originalBattleOrchestratorState: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: new BattleSquaddieRepository(),
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: {
                ...validBattleState,
                gameSaveFlags: {
                    ...validBattleState.gameSaveFlags,
                    savingInProgress: true,
                }
            },
        });

        expect(originalBattleOrchestratorState.isValid).toBeTruthy();

        const cloned: BattleOrchestratorState = originalBattleOrchestratorState.clone();

        expect(cloned.isValid).toBeTruthy();
        expect(cloned).toEqual(originalBattleOrchestratorState);
    });

    it('can change itself to match other objects', () => {
        let originalBattleOrchestratorState: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: new BattleSquaddieRepository(),
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: {
                ...validBattleState,
                gameSaveFlags: {
                    ...validBattleState.gameSaveFlags,
                    savingInProgress: true,
                }
            },
        });
        expect(originalBattleOrchestratorState.isValid).toBeTruthy();

        const cloned: BattleOrchestratorState = new BattleOrchestratorState({
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
            }),
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
        });
        cloned.copyOtherOrchestratorState(originalBattleOrchestratorState);

        expect(cloned.isValid).toBeTruthy();
        expect(cloned).toEqual(originalBattleOrchestratorState);
    });
});
