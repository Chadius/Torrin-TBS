import {
    BattleOrchestratorState,
    BattleOrchestratorStateService,
    BattleOrchestratorStateValidityReason,
} from "./battleOrchestratorState"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { NullMissionMap } from "../../utils/test/battleOrchestratorState"
import { MissionObjectiveHelper } from "../missionResult/missionObjective"
import { MissionRewardType } from "../missionResult/missionReward"
import { MissionConditionType } from "../missionResult/missionCondition"
import { BattleState, BattleStateService } from "./battleState"
import { FixedNumberGenerator } from "../numberGenerator/fixed"
import { RandomNumberGenerator } from "../numberGenerator/random"
import {
    ProcessedActionMovementEffect,
    ProcessedActionMovementEffectService,
} from "../../action/processed/processedActionMovementEffect"
import {
    ProcessedActionSquaddieEffect,
    ProcessedActionSquaddieEffectService,
} from "../../action/processed/processedActionSquaddieEffect"
import {
    ProcessedActionEndTurnEffect,
    ProcessedActionEndTurnEffectService,
} from "../../action/processed/processedActionEndTurnEffect"
import {
    ProcessedAction,
    ProcessedActionService,
} from "../../action/processed/processedAction"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { BattleSquaddieMover } from "../orchestratorComponents/battleSquaddieMover"
import { BattleOrchestratorMode } from "./battleOrchestrator"
import {
    DecidedActionMovementEffect,
    DecidedActionMovementEffectService,
} from "../../action/decided/decidedActionMovementEffect"
import {
    DecidedActionSquaddieEffect,
    DecidedActionSquaddieEffectService,
} from "../../action/decided/decidedActionSquaddieEffect"
import {
    DecidedActionEndTurnEffect,
    DecidedActionEndTurnEffectService,
} from "../../action/decided/decidedActionEndTurnEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { DecidedActionService } from "../../action/decided/decidedAction"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import { ActionEffectEndTurnTemplateService } from "../../action/template/actionEffectEndTurnTemplate"
import { BattleSquaddieUsesActionOnMap } from "../orchestratorComponents/battleSquaddieUsesActionOnMap"
import { BattleSquaddieUsesActionOnSquaddie } from "../orchestratorComponents/battleSquaddieUsesActionOnSquaddie"
import { ObjectRepositoryService } from "../objectRepository"
import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../../campaign/squaddieTemplate"
import { SquaddieIdService } from "../../squaddie/id"
import { BattleSquaddieService } from "../battleSquaddie"
import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../utils/test/mocks"
import { CampaignService } from "../../campaign/campaign"
import { BattleHUDStateService } from "../hud/battleHUDState"
import { BattleHUDService } from "../hud/battleHUD"
import { SquaddieSquaddieResultsService } from "../history/squaddieSquaddieResults"

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
                MissionObjectiveHelper.validateMissionObjective({
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
            reasons: BattleOrchestratorStateValidityReason[]
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

    it("can clone existing objects", () => {
        let originalBattleOrchestratorState: BattleOrchestratorState =
            BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: {
                    ...validBattleState,
                },
                numberGenerator: new FixedNumberGenerator({ result: 3 }),
                battleHUDState: BattleHUDStateService.new({}),
            })

        expect(originalBattleOrchestratorState.isValid).toBeTruthy()

        const cloned: BattleOrchestratorState =
            originalBattleOrchestratorState.clone()

        expect(cloned.isValid).toBeTruthy()
        expect(cloned).toEqual(originalBattleOrchestratorState)
        expect(
            Object.is(
                cloned.numberGenerator,
                originalBattleOrchestratorState.numberGenerator
            )
        ).toBeFalsy()
        expect(cloned.battleHUDState).toEqual(
            originalBattleOrchestratorState.battleHUDState
        )
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

    describe("will determine the next mode based on the next action effect", () => {
        let movementDecidedActionMovementEffect: DecidedActionMovementEffect
        let squaddieDecidedActionSquaddieEffect: DecidedActionSquaddieEffect
        let endTurnDecidedActionEndTurnEffect: DecidedActionEndTurnEffect

        let movementProcessedActionMovementEffect: ProcessedActionMovementEffect
        let squaddieProcessedActionSquaddieEffect: ProcessedActionSquaddieEffect
        let endTurnProcessedActionEndTurnEffect: ProcessedActionEndTurnEffect

        let movementProcessedAction: ProcessedAction
        let squaddieProcessedAction: ProcessedAction
        let endTurnProcessedAction: ProcessedAction

        beforeEach(() => {
            movementDecidedActionMovementEffect =
                DecidedActionMovementEffectService.new({
                    destination: { q: 0, r: 2 },
                    template: ActionEffectMovementTemplateService.new({}),
                })
            movementProcessedActionMovementEffect =
                ProcessedActionMovementEffectService.new({
                    decidedActionEffect: movementDecidedActionMovementEffect,
                })
            movementProcessedAction = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    actionEffects: [movementDecidedActionMovementEffect],
                    battleSquaddieId: "battleSquaddie",
                }),
                processedActionEffects: [movementProcessedActionMovementEffect],
            })

            squaddieDecidedActionSquaddieEffect =
                DecidedActionSquaddieEffectService.new({
                    target: { q: 0, r: 2 },
                    template: ActionEffectSquaddieTemplateService.new({}),
                })
            squaddieProcessedActionSquaddieEffect =
                ProcessedActionSquaddieEffectService.new({
                    decidedActionEffect: squaddieDecidedActionSquaddieEffect,
                    results: SquaddieSquaddieResultsService.new({
                        targetedBattleSquaddieIds: [],
                        actingBattleSquaddieId: "",
                        actionContext: {
                            actingSquaddieModifiers: {},
                            actingSquaddieRoll: undefined,
                        },
                        squaddieChanges: [],
                    }),
                })
            squaddieProcessedAction = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    actionEffects: [squaddieDecidedActionSquaddieEffect],
                    battleSquaddieId: "battleSquaddie",
                }),
                processedActionEffects: [squaddieProcessedActionSquaddieEffect],
            })

            endTurnDecidedActionEndTurnEffect =
                DecidedActionEndTurnEffectService.new({
                    template: ActionEffectEndTurnTemplateService.new({}),
                })
            endTurnProcessedActionEndTurnEffect =
                ProcessedActionEndTurnEffectService.new({
                    decidedActionEffect: endTurnDecidedActionEndTurnEffect,
                })
            endTurnProcessedAction = ProcessedActionService.new({
                decidedAction: DecidedActionService.new({
                    actionEffects: [endTurnDecidedActionEndTurnEffect],
                    battleSquaddieId: "battleSquaddie",
                }),
                processedActionEffects: [endTurnProcessedActionEndTurnEffect],
            })
        })

        const setupStateWithProcessedActionEffects = (
            processedAction0: ProcessedAction,
            processedAction1: ProcessedAction
        ): GameEngineState => {
            const actionsThisRound = ActionsThisRoundService.new({
                battleSquaddieId: "battleSquaddieId",
                startingLocation: { q: 0, r: 0 },
                previewedActionTemplateId: undefined,
                processedActions: [processedAction0, processedAction1].filter(
                    (x) => x
                ),
            })

            const repository = ObjectRepositoryService.new()
            const squaddieTemplate: SquaddieTemplate =
                SquaddieTemplateService.new({
                    squaddieId: SquaddieIdService.new({
                        templateId: "squaddieTemplateId",
                        name: "squaddieTemplateName",
                        affiliation: SquaddieAffiliation.PLAYER,
                    }),
                })

            const battleSquaddie = BattleSquaddieService.new({
                battleSquaddieId: "battleSquaddieId",
                squaddieTemplate,
            })

            ObjectRepositoryService.addSquaddieTemplate(
                repository,
                squaddieTemplate
            )
            ObjectRepositoryService.addBattleSquaddie(
                repository,
                battleSquaddie
            )

            return GameEngineStateService.new({
                resourceHandler: mockResourceHandler(
                    new MockedP5GraphicsBuffer()
                ),
                battleOrchestratorState: BattleOrchestratorStateService.new({
                    battleState: BattleStateService.newBattleState({
                        campaignId: "test campaign",
                        missionId: "the mission",
                        actionsThisRound,
                    }),
                }),
                repository,
                campaign: CampaignService.default({}),
            })
        }

        const tests = [
            {
                name: "SQUADDIE_MOVER",
                component: new BattleSquaddieMover(),
            },
            {
                name: "SQUADDIE_USES_ACTION_ON_MAP",
                component: new BattleSquaddieUsesActionOnMap(),
            },
            {
                name: "SQUADDIE_USES_ACTION_ON_SQUADDIE",
                component: new BattleSquaddieUsesActionOnSquaddie(),
            },
        ]

        it.each(tests)(
            `($name) will suggest the squaddie mover if it has a movement action`,
            ({ component }) => {
                const state = setupStateWithProcessedActionEffects(
                    squaddieProcessedAction,
                    movementProcessedAction
                )

                const recommendedChanges =
                    component.recommendStateChanges(state)

                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        state.battleOrchestratorState.battleState
                            .actionsThisRound
                    )
                ).toEqual(movementProcessedActionMovementEffect)
                expect(recommendedChanges.nextMode).toEqual(
                    BattleOrchestratorMode.SQUADDIE_MOVER
                )
            }
        )

        it.each(tests)(
            `($name) will suggest the squaddie act on squaddie mode if it has a squaddie action`,
            ({ component }) => {
                const state = setupStateWithProcessedActionEffects(
                    movementProcessedAction,
                    squaddieProcessedAction
                )

                const recommendedChanges =
                    component.recommendStateChanges(state)

                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        state.battleOrchestratorState.battleState
                            .actionsThisRound
                    )
                ).toEqual(squaddieProcessedActionSquaddieEffect)
                expect(recommendedChanges.nextMode).toEqual(
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_SQUADDIE
                )
            }
        )

        it.each(tests)(
            `($name) will suggest the squaddie act on map mode if it has an end turn action`,
            ({ component }) => {
                const state = setupStateWithProcessedActionEffects(
                    movementProcessedAction,
                    endTurnProcessedAction
                )

                const recommendedChanges =
                    component.recommendStateChanges(state)

                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        state.battleOrchestratorState.battleState
                            .actionsThisRound
                    )
                ).toEqual(endTurnProcessedActionEndTurnEffect)
                expect(recommendedChanges.nextMode).toEqual(
                    BattleOrchestratorMode.SQUADDIE_USES_ACTION_ON_MAP
                )
            }
        )

        it.each(tests)(
            `($name) will not suggest a mode if there are no more decisions to process`,
            ({ component }) => {
                const state = setupStateWithProcessedActionEffects(
                    movementProcessedAction,
                    undefined
                )

                const recommendedChanges =
                    component.recommendStateChanges(state)

                expect(
                    ActionsThisRoundService.getProcessedActionEffectToShow(
                        state.battleOrchestratorState.battleState
                            .actionsThisRound
                    )
                ).toBeUndefined()
                expect(recommendedChanges.nextMode).toBeUndefined()
            }
        )
    })
})
