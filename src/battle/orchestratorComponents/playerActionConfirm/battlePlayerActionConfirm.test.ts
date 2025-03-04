import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { BattlePlayerActionConfirm } from "./battlePlayerActionConfirm"
import { BattleSquaddie } from "../../battleSquaddie"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { BattleOrchestratorMode } from "../../orchestrator/battleOrchestrator"
import { MockedP5GraphicsBuffer } from "../../../utils/test/mocks"
import { DamageType } from "../../../squaddie/squaddieService"
import { SquaddieMovementService } from "../../../squaddie/movement"
import { BattleStateService } from "../../battleState/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../../gameEngine/gameEngine"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    ActionEffectTemplateService,
    VersusSquaddieResistance,
} from "../../../action/template/actionEffectTemplate"
import { CampaignService } from "../../../campaign/campaign"
import { BattleHUDService } from "../../hud/battleHUD/battleHUD"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { SummaryHUDStateService } from "../../hud/summary/summaryHUD"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import { ArmyAttributesService } from "../../../squaddie/armyAttributes"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { BattlePlayerActionConfirmSpec } from "../../../integration/spec/battlePlayerActionConfirmSpec"
import { ScreenLocation } from "../../../utils/mouseConfig"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { HEX_TILE_WIDTH } from "../../../graphicsConstants"
import { WINDOW_SPACING } from "../../../ui/constants"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { BattleOrchestratorStateTestService } from "../../../utils/test/battleOrchestratorState"

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
    let messageSpy: MockInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        playerActionConfirm = new BattlePlayerActionConfirm()
        objectRepository = ObjectRepositoryService.new()
        battleMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                        [Trait.ALWAYS_SUCCEEDS]: true,
                        [Trait.CANNOT_CRITICALLY_SUCCEED]: true,
                    }),
                    versusSquaddieResistance: VersusSquaddieResistance.ARMOR,
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
        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            coordinate: { q: 1, r: 1 },
        })
        ;({ battleSquaddie: citizenBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Citizen",
                templateId: "Citizen",
                battleId: "Citizen 0",
                affiliation: SquaddieAffiliation.ALLY,
                objectRepository: objectRepository,
                actionTemplateIds: [],
            }))
        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: citizenBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: citizenBattleSquaddie.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })
        ;({ battleSquaddie: thiefBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Thief",
                templateId: "Thief",
                battleId: "Thief 0",
                affiliation: SquaddieAffiliation.ENEMY,
                objectRepository: objectRepository,
                actionTemplateIds: [longswordAction.id],
                attributes: ArmyAttributesService.new({
                    maxHitPoints: 5,
                    movement: SquaddieMovementService.new({
                        movementPerAction: 2,
                    }),
                    tier: 0,
                }),
            }))
        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: thiefBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
            coordinate: { q: 1, r: 2 },
        })

        gameEngineState = GameEngineStateService.new({
            battleOrchestratorState: BattleOrchestratorStateService.new({
                battleHUD: BattleHUDService.new({}),
                battleState: BattleStateService.newBattleState({
                    missionId: "test mission",
                    campaignId: "test campaign",
                    missionMap: battleMap,
                }),
            }),
            repository: objectRepository,
            campaign: CampaignService.default(),
        })
        BattleOrchestratorStateTestService.knightUsesLongswordAction({
            gameEngineState,
            knightBattleSquaddie,
            longswordAction,
        })
        gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState =
            SummaryHUDStateService.new()

        messageSpy = vi.spyOn(gameEngineState.messageBoard, "sendMessage")
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

        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            thiefBattleSquaddie.battleSquaddieId
        )

        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep:
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep,
            targetCoordinate: mapCoordinate,
        })
    }

    describe("button placement", () => {
        it("default placement is slightly below the selected location", () => {
            const screenLocation: ScreenLocation = {
                x: ScreenDimensions.SCREEN_WIDTH / 2,
                y: ScreenDimensions.SCREEN_HEIGHT / 2,
            }

            const screenLocationSpy = vi
                .spyOn(
                    ConvertCoordinateService,
                    "convertMapCoordinatesToScreenLocation"
                )
                .mockReturnValue({
                    x: screenLocation.x,
                    y: screenLocation.y,
                })

            attackThiefWithLongsword()
            const { okButtonArea, cancelButtonArea } = setup()

            const okButtonTestLocation: ScreenLocation = {
                x: screenLocation.x,
                y: screenLocation.y + HEX_TILE_WIDTH + WINDOW_SPACING.SPACING2,
            }

            const cancelButtonTestLocation =
                getButtonLocationToTheRightOfOKButton(okButtonArea)

            expect(
                RectAreaService.isInside(
                    okButtonArea,
                    okButtonTestLocation.x,
                    okButtonTestLocation.y
                )
            ).toBe(true)

            expect(
                RectAreaService.isInside(
                    cancelButtonArea,
                    cancelButtonTestLocation.x,
                    cancelButtonTestLocation.y
                )
            ).toBe(true)
            expect(expectScreenLocationIsCalled(screenLocationSpy)).toBeTruthy()
        })
        it("if selected location is at left edge of screen, put ok button at left edge of screen and cancel to the right of it", () => {
            const screenLocation: ScreenLocation = {
                x: 0,
                y: ScreenDimensions.SCREEN_HEIGHT / 2,
            }

            const screenLocationSpy = vi
                .spyOn(
                    ConvertCoordinateService,
                    "convertMapCoordinatesToScreenLocation"
                )
                .mockReturnValue({
                    x: screenLocation.x,
                    y: screenLocation.y,
                })

            attackThiefWithLongsword()
            const { okButtonArea, cancelButtonArea } = setup()
            expect(RectAreaService.left(okButtonArea)).toBeGreaterThan(0)
            expect(RectAreaService.left(cancelButtonArea)).toBeGreaterThan(
                RectAreaService.right(okButtonArea)
            )
            expect(expectScreenLocationIsCalled(screenLocationSpy)).toBeTruthy()
        })
        it("if selected location is at right edge of screen, put ok button at right edge of screen and cancel on the left", () => {
            const screenLocation: ScreenLocation = {
                x: ScreenDimensions.SCREEN_WIDTH,
                y: ScreenDimensions.SCREEN_HEIGHT / 2,
            }

            const screenLocationSpy = vi
                .spyOn(
                    ConvertCoordinateService,
                    "convertMapCoordinatesToScreenLocation"
                )
                .mockReturnValue({
                    x: screenLocation.x,
                    y: screenLocation.y,
                })

            attackThiefWithLongsword()
            const { okButtonArea, cancelButtonArea } = setup()
            expect(RectAreaService.right(okButtonArea)).toBeLessThan(
                ScreenDimensions.SCREEN_WIDTH
            )
            expect(RectAreaService.right(cancelButtonArea)).toBeLessThan(
                RectAreaService.left(okButtonArea)
            )
            expect(expectScreenLocationIsCalled(screenLocationSpy)).toBeTruthy()
        })
        const getButtonLocationToTheRightOfOKButton = (
            okButtonArea: RectArea
        ) => {
            const cancelButtonTestLocation: ScreenLocation = {
                x:
                    RectAreaService.right(okButtonArea) +
                    WINDOW_SPACING.SPACING2,
                y:
                    RectAreaService.bottom(okButtonArea) -
                    WINDOW_SPACING.SPACING1,
            }
            return cancelButtonTestLocation
        }
        it("if no selected location, put buttons in the center", () => {
            const screenLocationSpy = vi.spyOn(
                ConvertCoordinateService,
                "convertMapCoordinatesToScreenLocation"
            )

            BattleActionDecisionStepService.addAction({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                actionTemplateId: longswordAction.id,
            })

            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                targetCoordinate: undefined,
            })

            const { okButtonArea, cancelButtonArea } = setup()

            const okButtonTestLocation: ScreenLocation = {
                x: ScreenDimensions.SCREEN_WIDTH / 2,
                y: ScreenDimensions.SCREEN_HEIGHT / 2,
            }
            const cancelButtonTestLocation =
                getButtonLocationToTheRightOfOKButton(okButtonArea)

            expect(
                RectAreaService.isInside(
                    okButtonArea,
                    okButtonTestLocation.x,
                    okButtonTestLocation.y
                )
            ).toBe(true)

            expect(
                RectAreaService.isInside(
                    cancelButtonArea,
                    cancelButtonTestLocation.x,
                    cancelButtonTestLocation.y
                )
            ).toBe(true)

            expect(screenLocationSpy).not.toHaveBeenCalled()
            screenLocationSpy.mockRestore()
        })

        const expectScreenLocationIsCalled = (screenLocationSpy: any) => {
            expect(screenLocationSpy).toHaveBeenCalled()
            screenLocationSpy.mockRestore()
            return true
        }
        const setup = () => {
            playerActionConfirm.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })

            const uiObjects = playerActionConfirm.data.getUIObjects()
            const okButtonArea = uiObjects.okButton.getArea()
            const cancelButtonArea = uiObjects.cancelButton.getArea()

            return {
                okButtonArea,
                cancelButtonArea,
            }
        }
    })

    describe("user cancels confirmation", () => {
        const cancelMethodTests = [
            {
                name: "click on cancel button",
                action: () => {
                    BattlePlayerActionConfirmSpec.clickOnCancelButton({
                        confirm: playerActionConfirm,
                        gameEngineState,
                    })
                },
            },
            {
                name: "presses the cancel key",
                action: () => {
                    BattlePlayerActionConfirmSpec.pressCancelKey({
                        confirm: playerActionConfirm,
                        gameEngineState,
                    })
                },
            },
        ]

        beforeEach(() => {
            attackThiefWithLongsword()
            playerActionConfirm.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
        })

        it.each(cancelMethodTests)(`should complete $name`, ({ action }) => {
            action()
            expect(
                playerActionConfirm.hasCompleted(gameEngineState)
            ).toBeTruthy()
        })

        it.each(cancelMethodTests)(
            `should recommend squaddie target $name`,
            ({ action }) => {
                action()
                const changes =
                    playerActionConfirm.recommendStateChanges(gameEngineState)
                expect(changes.nextMode).toEqual(
                    BattleOrchestratorMode.PLAYER_SQUADDIE_TARGET
                )
            }
        )

        it.each(cancelMethodTests)(
            `sends a message indicating the user canceled $name`,
            ({ action }) => {
                action()
                expect(messageSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_CONFIRMATION,
                    })
                )
            }
        )
    })

    describe("user confirms the target", () => {
        const confirmMethodTests = [
            {
                name: "click on Confirm button",
                action: () => {
                    BattlePlayerActionConfirmSpec.clickOnConfirmTarget({
                        confirm: playerActionConfirm,
                        gameEngineState,
                    })
                },
            },
            {
                name: "presses the confirm key",
                action: () => {
                    BattlePlayerActionConfirmSpec.pressConfirmKey({
                        confirm: playerActionConfirm,
                        gameEngineState,
                    })
                },
            },
        ]

        beforeEach(() => {
            attackThiefWithLongsword()
            playerActionConfirm.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
                resourceHandler: gameEngineState.resourceHandler,
            })
        })

        it.each(confirmMethodTests)(
            `should be completed $name`,
            ({ action }) => {
                action()
                expect(
                    playerActionConfirm.hasCompleted(gameEngineState)
                ).toBeTruthy()
            }
        )

        it.each(confirmMethodTests)(
            `should change the gameEngineState to Player HUD Controller $name`,
            ({ action }) => {
                action()
                const recommendedInfo =
                    playerActionConfirm.recommendStateChanges(gameEngineState)
                expect(recommendedInfo.nextMode).toBe(
                    BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
                )
            }
        )

        it.each(confirmMethodTests)(
            `should send a message indicating the player confirmed their action $name`,
            ({ action }) => {
                action()
                expect(messageSpy).toHaveBeenCalledWith({
                    type: MessageBoardMessageType.PLAYER_CONFIRMS_ACTION,
                    gameEngineState,
                })
            }
        )
    })
})
