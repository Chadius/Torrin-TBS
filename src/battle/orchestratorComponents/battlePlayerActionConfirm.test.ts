import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { BattlePlayerActionConfirm } from "./battlePlayerActionConfirm"
import { BattleSquaddie } from "../battleSquaddie"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
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
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { DamageType } from "../../squaddie/squaddieService"
import { CreateNewSquaddieMovementWithTraits } from "../../squaddie/movement"
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
import { PlayerBattleActionBuilderStateService } from "../actionBuilder/playerBattleActionBuilderState"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { SummaryHUDStateService } from "../hud/summaryHUD"
import { SquaddieSummaryPopoverPosition } from "../hud/playerActionPanel/squaddieSummaryPopover"

describe("BattleActionConfirm", () => {
    let playerActionConfirm: BattlePlayerActionConfirm

    let squaddieRepo: ObjectRepository = ObjectRepositoryService.new()
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
        squaddieRepo = ObjectRepositoryService.new()
        battleMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
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
                        [Trait.TARGET_ARMOR]: true,
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
        ;({ battleSquaddie: knightBattleSquaddie } =
            CreateNewSquaddieAndAddToRepository({
                name: "Knight",
                templateId: "Knight",
                battleId: "Knight 0",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepository: squaddieRepo,
                actionTemplates: [longswordAction],
            }))
        battleMap.addSquaddie(
            knightBattleSquaddie.squaddieTemplateId,
            knightBattleSquaddie.battleSquaddieId,
            { q: 1, r: 1 }
        )
        ;({ battleSquaddie: citizenBattleSquaddie } =
            CreateNewSquaddieAndAddToRepository({
                name: "Citizen",
                templateId: "Citizen",
                battleId: "Citizen 0",
                affiliation: SquaddieAffiliation.ALLY,
                squaddieRepository: squaddieRepo,
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
            CreateNewSquaddieAndAddToRepository({
                name: "Thief",
                templateId: "Thief",
                battleId: "Thief 0",
                affiliation: SquaddieAffiliation.ENEMY,
                squaddieRepository: squaddieRepo,
                actionTemplates: [longswordAction],
                attributes: {
                    maxHitPoints: 5,
                    movement: CreateNewSquaddieMovementWithTraits({
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
                    recording: { history: [] },
                }),
            }),
            repository: squaddieRepo,
            campaign: CampaignService.default({}),
        })

        gameEngineState.battleOrchestratorState.battleState.playerBattleActionBuilderState =
            PlayerBattleActionBuilderStateService.new({})
        PlayerBattleActionBuilderStateService.setActor({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
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
        PlayerBattleActionBuilderStateService.addAction({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
            actionTemplate: longswordAction,
        })

        const { mapLocation } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            thiefBattleSquaddie.battleSquaddieId
        )

        PlayerBattleActionBuilderStateService.setConsideredTarget({
            actionBuilderState:
                gameEngineState.battleOrchestratorState.battleState
                    .playerBattleActionBuilderState,
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
