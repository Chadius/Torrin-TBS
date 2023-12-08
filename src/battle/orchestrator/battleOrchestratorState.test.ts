import {
    BattleOrchestratorState,
    BattleOrchestratorStateHelper,
    BattleOrchestratorStateValidityReason
} from "./battleOrchestratorState";
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
import {FixedNumberGenerator} from "../numberGenerator/fixed";
import {RandomNumberGenerator} from "../numberGenerator/random";

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
        const validityCheck = (args: any, isValid: boolean, reasons: BattleOrchestratorStateValidityReason[]) => {
            const state: BattleOrchestratorState = new BattleOrchestratorState(args);
            expect(state.isValid).toBe(isValid);
            expect(state.missingComponents.sort()).toStrictEqual(reasons.sort());
        }

        let args = {};
        validityCheck(args, false, [
            BattleOrchestratorStateValidityReason.MISSING_BATTLE_SQUADDIE_SELECTED_HUD,
            BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR,
            BattleOrchestratorStateValidityReason.MISSING_RESOURCE_HANDLER,
            BattleOrchestratorStateValidityReason.MISSING_SQUADDIE_REPOSITORY,
            BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE,
        ]);


        args = {
            ...args,
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR,
            BattleOrchestratorStateValidityReason.MISSING_SQUADDIE_REPOSITORY,
            BattleOrchestratorStateValidityReason.MISSING_BATTLE_SQUADDIE_SELECTED_HUD,
            BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE,
        ]);

        const squaddieRepository: BattleSquaddieRepository = new BattleSquaddieRepository();
        args = {
            ...args,
            squaddieRepository,
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR,
            BattleOrchestratorStateValidityReason.MISSING_BATTLE_SQUADDIE_SELECTED_HUD,
            BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE,
        ]);

        args = {
            ...args,
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD()
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR,
            BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE,
        ]);

        args = {
            ...args,
            battleState: validBattleState,
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR,
        ]);

        args = {
            ...args,
            numberGenerator: new FixedNumberGenerator({result: 10}),
        }
        validityCheck(args, true, []);
    });

    it('can clone existing objects', () => {
        let originalBattleOrchestratorState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            squaddieRepository: new BattleSquaddieRepository(),
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: {
                ...validBattleState,
            },
            numberGenerator: new FixedNumberGenerator({result: 3}),
        });

        expect(originalBattleOrchestratorState.isValid).toBeTruthy();

        const cloned: BattleOrchestratorState = originalBattleOrchestratorState.clone();

        expect(cloned.isValid).toBeTruthy();
        expect(cloned).toEqual(originalBattleOrchestratorState);
        expect(Object.is(cloned.numberGenerator, originalBattleOrchestratorState.numberGenerator)).toBeFalsy();
    });

    it('can change itself to match other objects', () => {
        let originalBattleOrchestratorState: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            squaddieRepository: new BattleSquaddieRepository(),
            resourceHandler: new ResourceHandler({
                imageLoader: new StubImmediateLoader(),
                allResources: []
            }),
            battleSquaddieSelectedHUD: new BattleSquaddieSelectedHUD(),
            battleState: {
                ...validBattleState,
            },
            numberGenerator: new FixedNumberGenerator({result: 3}),
        });
        expect(originalBattleOrchestratorState.isValid).toBeTruthy();

        const cloned: BattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
            }),
            squaddieRepository: undefined,
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            numberGenerator: undefined,
        });
        cloned.copyOtherOrchestratorState(originalBattleOrchestratorState);

        expect(cloned.isValid).toBeTruthy();
        expect(cloned).toEqual(originalBattleOrchestratorState);
    });

    it('can make a new object using creator function', () => {
        const numberGenerator = new RandomNumberGenerator();
        const battleSquaddieSelectedHUD = new BattleSquaddieSelectedHUD();
        const squaddieRepository = new BattleSquaddieRepository();

        const newBattleOrchestratorState = BattleOrchestratorStateHelper.newOrchestratorState({
            battleState: validBattleState,
            numberGenerator,
            battleSquaddieSelectedHUD,
            squaddieRepository,
            resourceHandler: undefined,
        });

        expect(newBattleOrchestratorState.resourceHandler).toBeUndefined();
        expect(newBattleOrchestratorState.battleState).toEqual(validBattleState);

        expect(newBattleOrchestratorState.numberGenerator).toEqual(numberGenerator);

        expect(newBattleOrchestratorState.squaddieRepository).toEqual(squaddieRepository);
        expect(newBattleOrchestratorState.battleSquaddieSelectedHUD).toEqual(battleSquaddieSelectedHUD);
    });
});
