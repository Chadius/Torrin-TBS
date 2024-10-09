import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattlePlayerActionConfirm } from "./battlePlayerActionConfirm"
import { BattleSquaddie } from "../battleSquaddie"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { ScreenDimensions } from "../../utils/graphics/graphicsConfig"
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorMode } from "../orchestrator/battleOrchestrator"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { DamageType } from "../../squaddie/squaddieService"
import { SquaddieMovementService } from "../../squaddie/movement"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import { ActionsThisRoundService } from "../history/actionsThisRound"
import { CampaignService } from "../../campaign/campaign"
import { BattleHUDService } from "../hud/battleHUD"
import { MouseButton } from "../../utils/mouseConfig"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { SquaddieSummaryPopoverPosition } from "../hud/playerActionPanel/squaddieSummaryPopover"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"

describe("BattleActionConfirm", () => {
    let playerActionConfirm: BattlePlayerActionConfirm

    let objectRepository: ObjectRepository = ObjectRepositoryService.new()
    let knightBattleSquaddie: BattleSquaddie
    let citizenBattleSquaddie: BattleSquaddie
    let thiefBattleSquaddie: BattleSquaddie

    let battleMap: MissionMap
    let longswordAction: ActionTemplate
    let gameEngineState: GameEngineState

    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let messageSpy: jest.SpyInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        playerActionConfirm = new BattlePlayerActionConfirm()
        objectRepository = ObjectRepositoryService.new()
        battleMap = new MissionMap({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.VERSUS_ARMOR]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    minimumRange: 1,
                    maximumRange: 1,
                    damageDescriptions: {
                        [DamageType.BODY]: 2,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            longswordAction
        )
        ;({ battleSquaddie: knightBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Knight",
                templateId: "Knight",
                battleId: "Knight 0",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: objectRepository,
                actionTemplateIds: [longswordAction.id],
            }))
        battleMap.addSquaddie(
            knightBattleSquaddie.squaddieTemplateId,
            knightBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )
        ;({ battleSquaddie: citizenBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Citizen",
                templateId: "Citizen",
                battleId: "Citizen 0",
                affiliation: SquaddieAffiliation.ALLY,
                objectRepository: objectRepository,
                actionTemplateIds: [],
            }))
        battleMap.addSquaddie(
            citizenBattleSquaddie.squaddieTemplateId,
            citizenBattleSquaddie.battleSquaddieId,
            {
                q: 0,
                r: 1,
            }
        )
        ;({ battleSquaddie: thiefBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Thief",
                templateId: "Thief",
                battleId: "Thief 0",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: objectRepository,
                actionTemplateIds: [longswordAction.id],
                attributes: {
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                    armorClass: 0,
                },
            }))
        battleMap.addSquaddie(
            thiefBattleSquaddie.squaddieTemplateId,
            thiefBattleSquaddie.battleSquaddieId,
            { q: 1, r: 2 }
        )

        const actionsThisRound = ActionsThisRoundService.new({
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            startingLocation: { q: 1, r: 1 },
            previewedActionTemplateId: longswordAction.id,
        })

        gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: battleMap,
                    actionsThisRound,
                }),
            }),
            repository: objectRepository,
            campaign: CampaignService.default(),
        })

        gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
            BattleActionDecisionStepService.new()
        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
        })

        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new({
                mouseSelectionLocation: { x: 0, y: 0 },
            })
        SummaryHUDStateService.setMainSummaryPopover({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            resourceHandler: gameEngineState.resourceHandler,
            objectRepository: gameEngineState.repository,
            gameEngineState,
            position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
        })

        messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
    })

    afterEach(() => {
        messageSpy.mockRestore()
    })

    const attackThiefWithLongsword = () => {
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            actionTemplateId: longswordAction.id,
        })

        const { mapLocation } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            thiefBattleSquaddie.battleSquaddieId
        )

        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            targetLocation: mapLocation,
        })

        SummaryHUDStateService.setTargetSummaryPopover({
            summaryHUDState:
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState,
            battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
            gameEngineState,
            objectRepository: gameEngineState.repository,
            resourceHandler: gameEngineState.resourceHandler,
            position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
        })
    }

    const clickOnConfirm = () => {
        const confirmSelectionClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT / 2,
            mouseButton: MouseButton.ACCEPT,
        }

        playerActionConfirm.mouseEventHappened(
            gameEngineState,
            confirmSelectionClick
        )
    }

    const clickOnCancel = () => {
        const cancelTargetClick: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: ScreenDimensions.SCREEN_WIDTH,
            mouseY: ScreenDimensions.SCREEN_HEIGHT,
            mouseButton: MouseButton.ACCEPT,
        }

        playerActionConfirm.mouseEventHappened(
            gameEngineState,
            cancelTargetClick
        )
    }

    describe("user cancels confirmation", () => {
        beforeEach(() => {
            attackThiefWithLongsword()
            playerActionConfirm.update(gameEngineState, mockedP5GraphicsContext)
            clickOnCancel()
        })

        it("should complete", () => {
            expect(
                playerActionConfirm.hasCompleted(gameEngineState)
            ).toBeTruthy()
        })

        it("should recommend squaddie target", () => {
            const changes =
                playerActionConfirm.recommendStateChanges(gameEngineState)
            expect(changes.nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET
            )
        })

        it("sends a message indicating the user canceled", () => {
            expect(messageSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
                })
            )
        })
    })

    describe("user confirms the target", () => {
        beforeEach(() => {
            playerActionConfirm.update(gameEngineState, mockedP5GraphicsContext)
            attackThiefWithLongsword()
            clickOnConfirm()
        })

        it("should be completed", () => {
            expect(
                playerActionConfirm.hasCompleted(gameEngineState)
            ).toBeTruthy()
        })

        it("should change the gameEngineState to Player HUD Controller", () => {
            const recommendedInfo =
                playerActionConfirm.recommendStateChanges(gameEngineState)
            expect(recommendedInfo.nextMode).toBe(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
        })

        it("should send a message indicating the player confirmed their action", () => {
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                gameEngineState,
            })
        })
    })
})
