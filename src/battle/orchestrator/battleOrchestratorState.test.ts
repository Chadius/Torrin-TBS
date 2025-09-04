import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
    BattleOrchestratorStateValidityReason,
    TBattleOrchestratorStateValidityReason,
} from "./battleOrchestratorState"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { NullMissionMap } from "../../utils/test/battleOrchestratorState"
import { MissionObjectiveService } from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import { MissionConditionType } from "../missionResult/missionCondition"
import { BattleState, BattleStateService } from "../battleState/battleState"
import { FixedNumberGenerator } from "../numberGenerator/fixed"
import { RandomNumberGenerator } from "../numberGenerator/random"
import { BattleHUDService } from "../hud/battleHUD/battleHUD"
import { beforeEach, describe, expect, it } from "vitest"

describe("orchestratorState", () => {
    let validBattleState: BattleState

    beforeEach(() => {
        validBattleState = BattleStateService.newBattleState({
            campaignId: "test campaign",
            missionId: "test mission",
            missionMap: NullMissionMap(),
            teams: [
                {
                    id: "playerTeamId",
                    name: "Players",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_player_team",
                },
                {
                    id: "enemyTeamId",
                    name: "Baddies",
                    affiliation: SquaddieAffiliation.ENEMY,
                    battleSquaddieIds: [],
                    iconResourceKey: "icon_enemy_team",
                },
            ],
            objectives: [
                MissionObjectiveService.validateMissionObjective({
                    id: "mission objective id",
                    reward: { rewardType: MissionRewardType.VICTORY },
                    hasGivenReward: false,
                    conditions: [
                        {
                            type: MissionConditionType.DEFEAT_ALL_ENEMIES,
                            id: "defeat all enemies",
                        },
                    ],
                    numberOfRequiredConditionsToComplete: 1,
                }),
            ],
        })
    })

    it("will indicate if it is ready for battle", () => {
        const validityCheck = (
            args: any,
            isValid: boolean,
            reasons: TBattleOrchestratorStateValidityReason[]
        ) => {
            const state: BattleOrchestratorState = new BattleOrchestratorState(
                args
            )
            expect(state.isValid).toBe(isValid)
            expect(state.missingComponents.sort()).toStrictEqual(reasons.sort())
        }

        let args = {}
        validityCheck(args, false, [
            BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR,
            BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE,
        ])

        args = {
            ...args,
            battleHUD: BattleHUDService.new({}),
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR,
            BattleOrchestratorStateValidityReason.INVALID_BATTLE_STATE,
        ])

        args = {
            ...args,
            battleState: validBattleState,
        }
        validityCheck(args, false, [
            BattleOrchestratorStateValidityReason.MISSING_NUMBER_GENERATOR,
        ])

        args = {
            ...args,
            numberGenerator: new FixedNumberGenerator({ result: 10 }),
        }
        validityCheck(args, true, [])
    })

    it("can change itself to match other objects", () => {
        let originalBattleOrchestratorState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: {
                    ...validBattleState,
                },
                numberGenerator: new FixedNumberGenerator({ result: 3 }),
            })
        expect(originalBattleOrchestratorState.isValid).toBeTruthy()

        const cloned: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleState: BattleStateService.newBattleState({
                    campaignId: "test campaign",
                    missionId: "test mission",
                }),
                battleHUD: BattleHUDService.new({}),
                numberGenerator: undefined,
            })
        cloned.copyOtherOrchestratorState(originalBattleOrchestratorState)

        expect(cloned.isValid).toBeTruthy()
        expect(cloned).toEqual(originalBattleOrchestratorState)
    })

    it("can make a new object using creator function", () => {
        const numberGenerator = new RandomNumberGenerator()

        const newBattleOrchestratorState = BattleOrchestratorStateService.new({
            battleState: validBattleState,
            numberGenerator,
            battleHUD: BattleHUDService.new({}),
        })

        expect(newBattleOrchestratorState.battleState).toEqual(validBattleState)
        expect(newBattleOrchestratorState.numberGenerator).toEqual(
            numberGenerator
        )
        expect(
            newBattleOrchestratorState.battleHUD.fileAccessHUD
        ).not.toBeUndefined()
    })
})
