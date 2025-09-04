import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { BattleSquaddie } from "../../battleSquaddie"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../../action/template/actionTemplate"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import {
    ActionEffectTemplateService,
    VersusSquaddieResistance,
} from "../../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { Damage } from "../../../squaddie/squaddieService"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { ArmyAttributesService } from "../../../squaddie/armyAttributes"
import { SquaddieMovementService } from "../../../squaddie/movement"
import { SummaryHUDStateService } from "../../hud/summary/summaryHUD"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { PlayerActionTargetSelectViewController } from "./viewController"
import { GraphicsBuffer } from "../../../utils/graphics/graphicsRenderer"
import { ScreenLocation } from "../../../utils/mouseConfig"
import { ScreenDimensions } from "../../../utils/graphics/graphicsConfig"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import { HEX_TILE_WIDTH } from "../../../graphicsConstants"
import { WINDOW_SPACING } from "../../../ui/constants"
import { RectArea, RectAreaService } from "../../../ui/rectArea"
import { ComponentDataBlob } from "../../../utils/dataBlob/componentDataBlob"
import { BattleCamera } from "../../battleCamera"
import { DataBlobService } from "../../../utils/dataBlob/dataBlob"
import { PlayerInputStateService } from "../../../ui/playerInput/playerInputState"
import { MissionStatisticsService } from "../../missionStatistics/missionStatistics"
import { PlayerConsideredActionsService } from "../../battleState/playerConsideredActions"
import { PlayerDecisionHUDService } from "../../hud/playerActionPanel/playerDecisionHUD"
import { RandomNumberGenerator } from "../../numberGenerator/random"
import { BattleActionRecorderService } from "../../history/battleAction/battleActionRecorder"
import { MessageBoard } from "../../../message/messageBoard"
import { PlayerActionTargetStateMachineLayout } from "./playerActionTargetStateMachineLayout"
import {
    PlayerActionTargetContextService,
    PlayerActionTargetStateMachineContext,
} from "./playerActionTargetStateMachineContext"
import { PlayerActionTargetStateMachineUIObjects } from "./playerActionTargetStateMachineUIObjects"
import { PlayerCommandStateService } from "../../hud/playerCommand/playerCommandHUD"
import { ImageUI, ImageUILoadingBehavior } from "../../../ui/imageUI/imageUI"
import { PLAYER_ACTION_SELECT_TARGET_CREATE_CANCEL_BUTTON_ID } from "./playerActionTarget/cancelButton"
import { PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID } from "./playerActionConfirm/okButton"
import { PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID } from "./playerActionConfirm/cancelButton"
import { CampaignResourcesService } from "../../../campaign/campaignResources"
import { SearchResultsCacheService } from "../../../hexMap/pathfinder/searchResults/searchResultsCache"
import { ChallengeModifierSettingService } from "../../challengeModifier/challengeModifierSetting"

describe("Player Action Target Select View Controller", () => {
    let playerActionTargetSelectViewController: PlayerActionTargetSelectViewController
    let objectRepository: ObjectRepository
    let knightBattleSquaddie: BattleSquaddie
    let citizenBattleSquaddie: BattleSquaddie
    let thiefBattleSquaddie: BattleSquaddie
    let thief2BattleSquaddie: BattleSquaddie

    let missionMap: MissionMap
    let longswordAction: ActionTemplate

    let graphicsBuffer: GraphicsBuffer

    let componentData: ComponentDataBlob<
        PlayerActionTargetStateMachineLayout,
        PlayerActionTargetStateMachineContext,
        PlayerActionTargetStateMachineUIObjects
    >

    beforeEach(() => {
        componentData = new ComponentDataBlob()
        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })
        objectRepository = ObjectRepositoryService.new()
        const context = PlayerActionTargetContextService.new({
            challengeModifierSetting: ChallengeModifierSettingService.new(),
            objectRepository,
            missionMap,
            camera: new BattleCamera(),
            battleActionDecisionStep: BattleActionDecisionStepService.new(),
            messageBoard: new MessageBoard(),
            battleActionRecorder: BattleActionRecorderService.new(),
            numberGenerator: new RandomNumberGenerator(),
            playerInputState: PlayerInputStateService.newFromEnvironment(),
            summaryHUDState: SummaryHUDStateService.new(),
            campaignResources: CampaignResourcesService.default(),
            missionStatistics: MissionStatisticsService.new({}),
            squaddieAllMovementCache: SearchResultsCacheService.new(),
            playerConsideredActions: PlayerConsideredActionsService.new(),
            playerDecisionHUD: PlayerDecisionHUDService.new(),
            playerCommandState: PlayerCommandStateService.new(),
        })

        componentData.setContext(context)
        graphicsBuffer = new MockedP5GraphicsBuffer()
        playerActionTargetSelectViewController =
            new PlayerActionTargetSelectViewController(componentData)

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
                        [Damage.BODY]: 2,
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
            missionMap: missionMap,
            squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 1 },
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
            missionMap: missionMap,
            squaddieTemplateId: citizenBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: citizenBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 0, r: 1 },
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
            missionMap: missionMap,
            squaddieTemplateId: thiefBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 2 },
        })
        ;({ battleSquaddie: thief2BattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Thief 2",
                templateId: "Thief 2",
                battleId: "Thief 2",
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
            missionMap: missionMap,
            squaddieTemplateId: thief2BattleSquaddie.squaddieTemplateId,
            battleSquaddieId: thief2BattleSquaddie.battleSquaddieId,
            originMapCoordinate: { q: 1, r: 0 },
        })

        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                componentData.getContext().battleActionDecisionStep,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
        })
    })

    const considerAttackingWithLongsword = () => {
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                playerActionTargetSelectViewController.componentData.getContext()
                    .battleActionDecisionStep,
            actionTemplateId: longswordAction.id,
        })
        playerActionTargetSelectViewController.componentData.setContext({
            ...playerActionTargetSelectViewController.componentData.getContext(),
            battleActionDecisionStep:
                componentData.getContext().battleActionDecisionStep,
            explanationLabelText: "select a target",
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
            targetResults: {
                ...playerActionTargetSelectViewController.componentData.getContext()
                    .targetResults,
                validCoordinates: [
                    { q: 1, r: 1 },
                    { q: 0, r: 1 },
                    { q: 1, r: 2 },
                    { q: 1, r: 0 },
                ],
            },
        })
    }

    const selectThief1ToAttack = () => {
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                playerActionTargetSelectViewController.componentData.getContext()
                    .battleActionDecisionStep,
            actionTemplateId: longswordAction.id,
        })
        const { currentMapCoordinate } =
            MissionMapService.getByBattleSquaddieId(
                missionMap,
                thiefBattleSquaddie.battleSquaddieId
            )

        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep:
                playerActionTargetSelectViewController.componentData.getContext()
                    .battleActionDecisionStep,
            targetCoordinate: currentMapCoordinate,
        })
        playerActionTargetSelectViewController.componentData.setContext({
            ...playerActionTargetSelectViewController.componentData.getContext(),
            battleActionDecisionStep:
                playerActionTargetSelectViewController.componentData.getContext()
                    .battleActionDecisionStep,
            buttonStatusChangeEventDataBlob: DataBlobService.new(),
            targetResults: {
                ...playerActionTargetSelectViewController.componentData.getContext()
                    .targetResults,
                validTargets: {
                    [thiefBattleSquaddie.battleSquaddieId]: {
                        currentMapCoordinate: { q: 1, r: 2 },
                    },
                },
            },
        })
    }

    it("copies fields into the context when drawing", () => {
        const camera = new BattleCamera()
        playerActionTargetSelectViewController.draw({
            camera,
            graphicsContext: graphicsBuffer,
        })
        expect(
            playerActionTargetSelectViewController.getUIObjects().camera
        ).toBe(camera)
        expect(
            playerActionTargetSelectViewController.getUIObjects()
                .graphicsContext
        ).toBe(graphicsBuffer)
    })

    it("creates select target button when the battle action decision has been considered", () => {
        expect(
            playerActionTargetSelectViewController.getButtons()
        ).toHaveLength(0)
        considerAttackingWithLongsword()
        playerActionTargetSelectViewController.draw({
            camera: new BattleCamera(),
            graphicsContext: graphicsBuffer,
        })
        expect(
            playerActionTargetSelectViewController.getButtons()
        ).toHaveLength(1)
        expect(
            playerActionTargetSelectViewController.getButtons()[0].id
        ).toEqual(PLAYER_ACTION_SELECT_TARGET_CREATE_CANCEL_BUTTON_ID)
    })

    it("should highlight the map with the action range, showing valid locations", () => {
        considerAttackingWithLongsword()
        playerActionTargetSelectViewController.draw({
            camera: new BattleCamera(),
            graphicsContext: graphicsBuffer,
        })

        const highlightedTileLocations =
            TerrainTileMapService.computeHighlightedTiles(
                missionMap.terrainTileMap
            ).map(
                (highlightedTileDescription) =>
                    highlightedTileDescription.coordinate
            )
        expect(highlightedTileLocations).toHaveLength(6)
        expect(highlightedTileLocations).toEqual(
            expect.arrayContaining([
                { q: 1, r: 0 },
                { q: 1, r: 2 },
                { q: 0, r: 1 },
                { q: 2, r: 1 },
                { q: 2, r: 0 },
                { q: 0, r: 2 },
            ])
        )
    })

    it("creates confirm buttons when the battle action decision has been decided", () => {
        expect(
            playerActionTargetSelectViewController.getButtons()
        ).toHaveLength(0)
        selectThief1ToAttack()
        playerActionTargetSelectViewController.draw({
            camera: new BattleCamera(),
            graphicsContext: graphicsBuffer,
        })
        expect(
            playerActionTargetSelectViewController.getButtons()
        ).toHaveLength(2)
        expect(
            playerActionTargetSelectViewController.getButtons().map((b) => b.id)
        ).toEqual(
            expect.arrayContaining([
                PLAYER_ACTION_CONFIRM_CREATE_OK_BUTTON_ID,
                PLAYER_ACTION_CONFIRM_CREATE_CANCEL_BUTTON_ID,
            ])
        )
    })

    it("should highlight the map with the squaddies who are targeted when it is time for confirmation", () => {
        selectThief1ToAttack()

        playerActionTargetSelectViewController.draw({
            camera: new BattleCamera(),
            graphicsContext: graphicsBuffer,
        })

        const highlightedTileLocations =
            TerrainTileMapService.computeHighlightedTiles(
                missionMap.terrainTileMap
            ).map(
                (highlightedTileDescription) =>
                    highlightedTileDescription.coordinate
            )
        expect(highlightedTileLocations).toEqual([{ q: 1, r: 2 }])
    })

    const expectScreenLocationIsCalled = (screenLocationSpy: MockInstance) => {
        expect(screenLocationSpy).toHaveBeenCalled()
        screenLocationSpy.mockRestore()
        return true
    }

    describe("confirm button placement", () => {
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

            selectThief1ToAttack()
            const { okButtonArea, cancelButtonArea } =
                drawConfirmButtonsAndGetArea()

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

            selectThief1ToAttack()
            const { okButtonArea, cancelButtonArea } =
                drawConfirmButtonsAndGetArea()
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

            selectThief1ToAttack()
            const { okButtonArea, cancelButtonArea } =
                drawConfirmButtonsAndGetArea()
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
                    componentData.getContext().battleActionDecisionStep,
                actionTemplateId: longswordAction.id,
            })

            BattleActionDecisionStepService.setConsideredTarget({
                actionDecisionStep:
                    componentData.getContext().battleActionDecisionStep,
                targetCoordinate: undefined,
            })

            const { okButtonArea, cancelButtonArea } =
                drawConfirmButtonsAndGetArea()

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

        const drawConfirmButtonsAndGetArea = () => {
            playerActionTargetSelectViewController.draw({
                camera: new BattleCamera(),
                graphicsContext: graphicsBuffer,
            })

            const uiObjects =
                playerActionTargetSelectViewController.getUIObjects().confirm
            const okButtonArea = uiObjects.okButton.getArea()
            const cancelButtonArea = uiObjects.cancelButton.getArea()

            return {
                okButtonArea,
                cancelButtonArea,
            }
        }
    })

    describe("select target UI element placement", () => {
        const drawSelectTargetUIElements = () => {
            playerActionTargetSelectViewController.draw({
                camera: new BattleCamera(),
                graphicsContext: graphicsBuffer,
            })

            const uiObjects =
                playerActionTargetSelectViewController.getUIObjects()
                    .selectTarget
            const cancelButtonArea = uiObjects.cancelButton.getArea()
            const explanationLabelText = uiObjects.explanationLabel.textBox.text

            return {
                cancelButtonArea,
                explanationLabelText,
            }
        }
        it("draws the explanation label with the text from the context", () => {
            let { explanationLabelText } = drawSelectTargetUIElements()
            expect(explanationLabelText).not.toEqual("Cool")
            playerActionTargetSelectViewController.componentData.getContext().explanationLabelText =
                "Cool"
            ;({ explanationLabelText } = drawSelectTargetUIElements())
            expect(explanationLabelText).toEqual("Cool")
        })
        it("will put the cancel select target button slightly below the actor squaddie if valid targets are offscreen", () => {
            playerActionTargetSelectViewController.componentData.getContext().targetResults.validTargets =
                {
                    "target really far under actor": {
                        currentMapCoordinate: { q: 2, r: 9000 },
                    },
                }

            considerAttackingWithLongsword()
            const { cancelButtonArea } = drawSelectTargetUIElements()

            const expectedScreenLocation =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: { q: 1, r: 1 },
                    cameraLocation:
                        playerActionTargetSelectViewController.componentData
                            .getContext()
                            .camera.getWorldLocation(),
                })

            expect(
                RectAreaService.isInside(
                    cancelButtonArea,
                    expectedScreenLocation.x,
                    expectedScreenLocation.y +
                        HEX_TILE_WIDTH +
                        WINDOW_SPACING.SPACING2
                )
            ).toBe(true)
        })

        it("will put the cancel select target button below all valid targets if they are below the squaddie", () => {
            playerActionTargetSelectViewController.componentData.getContext().targetResults.validTargets =
                {
                    "target under actor": {
                        currentMapCoordinate: { q: 2, r: 0 },
                    },
                    "target further under": {
                        currentMapCoordinate: { q: 3, r: 0 },
                    },
                    "target not underneath": {
                        currentMapCoordinate: { q: 4, r: 2 },
                    },
                }

            const expectedCoordinateToDrawUnder =
                playerActionTargetSelectViewController.componentData.getContext()
                    .targetResults.validTargets["target further under"]
                    .currentMapCoordinate
            const expectedScreenLocation =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: expectedCoordinateToDrawUnder,
                    cameraLocation:
                        playerActionTargetSelectViewController.componentData
                            .getContext()
                            .camera.getWorldLocation(),
                })

            considerAttackingWithLongsword()
            const { cancelButtonArea } = drawSelectTargetUIElements()
            expect(
                RectAreaService.isInside(
                    cancelButtonArea,
                    expectedScreenLocation.x,
                    expectedScreenLocation.y +
                        HEX_TILE_WIDTH +
                        WINDOW_SPACING.SPACING2
                )
            ).toBe(true)
        })

        it("if acting squaddie is at left edge of screen, put cancel button at left edge of screen", () => {
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

            considerAttackingWithLongsword()
            const { cancelButtonArea } = drawSelectTargetUIElements()

            expect(RectAreaService.left(cancelButtonArea)).toBeGreaterThan(0)

            expect(expectScreenLocationIsCalled(screenLocationSpy)).toBeTruthy()
        })
        it("if acting squaddie is at right edge of screen, put cancel button at right edge of screen", () => {
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

            considerAttackingWithLongsword()
            const { cancelButtonArea } = drawSelectTargetUIElements()
            expect(RectAreaService.right(cancelButtonArea)).toBeLessThan(
                ScreenDimensions.SCREEN_WIDTH
            )
            expect(expectScreenLocationIsCalled(screenLocationSpy)).toBeTruthy()
        })
        it("if no squaddie location is given, put buttons in the center", () => {
            MissionMapService.updateBattleSquaddieCoordinate({
                missionMap,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                coordinate: undefined,
            })
            const screenLocationSpy = vi.spyOn(
                ConvertCoordinateService,
                "convertMapCoordinatesToScreenLocation"
            )

            considerAttackingWithLongsword()
            const { cancelButtonArea } = drawSelectTargetUIElements()

            const cancelButtonTestLocation: ScreenLocation = {
                x: ScreenDimensions.SCREEN_WIDTH / 2,
                y: ScreenDimensions.SCREEN_HEIGHT / 2,
            }

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
    })

    describe("highlight squaddies", () => {
        let knightMapIcon: ImageUI
        let thiefMapIcon: ImageUI
        let thief2MapIcon: ImageUI
        let citizenMapIcon: ImageUI
        let pulseColorSpy: MockInstance

        beforeEach(() => {
            MockedGraphicsBufferService.addSpies(graphicsBuffer)
            knightMapIcon = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                graphic: graphicsBuffer.createImage(100, 200),
                area: RectAreaService.new({
                    left: 10,
                    top: 20,
                    width: 0,
                    height: 0,
                }),
            })
            pulseColorSpy = vi.spyOn(knightMapIcon, "setPulseColor")

            ObjectRepositoryService.addImageUIByBattleSquaddieId({
                repository: objectRepository,
                battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                imageUI: knightMapIcon,
            })

            thiefMapIcon = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                graphic: graphicsBuffer.createImage(100, 200),
                area: RectAreaService.new({
                    left: 110,
                    top: 220,
                    width: 0,
                    height: 0,
                }),
            })
            ObjectRepositoryService.addImageUIByBattleSquaddieId({
                repository: objectRepository,
                battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
                imageUI: thiefMapIcon,
            })

            thief2MapIcon = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                graphic: graphicsBuffer.createImage(100, 200),
                area: RectAreaService.new({
                    left: 310,
                    top: 220,
                    width: 0,
                    height: 0,
                }),
            })
            ObjectRepositoryService.addImageUIByBattleSquaddieId({
                repository: objectRepository,
                battleSquaddieId: thief2BattleSquaddie.battleSquaddieId,
                imageUI: thief2MapIcon,
            })

            citizenMapIcon = new ImageUI({
                imageLoadingBehavior: {
                    resourceKey: undefined,
                    loadingBehavior: ImageUILoadingBehavior.USE_IMAGE_SIZE,
                },
                graphic: graphicsBuffer.createImage(100, 200),
                area: RectAreaService.new({
                    left: 310,
                    top: 320,
                    width: 0,
                    height: 0,
                }),
            })
            ObjectRepositoryService.addImageUIByBattleSquaddieId({
                repository: objectRepository,
                battleSquaddieId: citizenBattleSquaddie.battleSquaddieId,
                imageUI: citizenMapIcon,
            })
        })

        afterEach(() => {
            pulseColorSpy.mockRestore()
        })

        const expectSetPulseColorSpyIsIdempotentToRepeatedDrawCalls = () => {
            let numberOfTimesPulseColorWasSet = pulseColorSpy.mock.calls.length
            playerActionTargetSelectViewController.draw({
                camera: new BattleCamera(),
                graphicsContext: graphicsBuffer,
            })

            expect(pulseColorSpy).toHaveBeenCalledTimes(
                numberOfTimesPulseColorWasSet
            )
            return true
        }
        const expectCleanUpToRemoveEffectsFromMapIcons = () => {
            playerActionTargetSelectViewController.cleanUp()
            expect(knightMapIcon.pulseColor).toBeUndefined()
            expect(thiefMapIcon.pulseColor).toBeUndefined()
            expect(thief2MapIcon.pulseColor).toBeUndefined()
            expect(citizenMapIcon.pulseColor).toBeUndefined()
            return true
        }
        const expectActorSquaddieToBeHighlighted = () => {
            const uiObjects =
                playerActionTargetSelectViewController.componentData.getUIObjects()
            expect(uiObjects.mapIcons.actor.mapIcon).toBe(knightMapIcon)
            expect(uiObjects.mapIcons.actor.hasTinted).toBeTruthy()
            expect(knightMapIcon.pulseColor).not.toBeUndefined()
            return true
        }

        describe("highlight squaddies when selecting a target", () => {
            beforeEach(() => {
                const thiefMapCoordinate =
                    MissionMapService.getByBattleSquaddieId(
                        missionMap,
                        thiefBattleSquaddie.battleSquaddieId
                    ).currentMapCoordinate
                playerActionTargetSelectViewController.componentData.getContext().targetResults.validTargets[
                    thiefBattleSquaddie.battleSquaddieId
                ] = {
                    currentMapCoordinate: thiefMapCoordinate,
                }
                const thief2MapCoordinate =
                    MissionMapService.getByBattleSquaddieId(
                        missionMap,
                        thief2BattleSquaddie.battleSquaddieId
                    ).currentMapCoordinate
                playerActionTargetSelectViewController.componentData.getContext().targetResults.validTargets[
                    thief2BattleSquaddie.battleSquaddieId
                ] = {
                    currentMapCoordinate: thief2MapCoordinate,
                }
                playerActionTargetSelectViewController.componentData
                    .getContext()
                    .targetResults.validCoordinates.push(thiefMapCoordinate)
                playerActionTargetSelectViewController.componentData
                    .getContext()
                    .targetResults.validCoordinates.push(thief2MapCoordinate)
                playerActionTargetSelectViewController.draw({
                    camera: new BattleCamera(),
                    graphicsContext: graphicsBuffer,
                })
            })
            it("will highlight the actor squaddie", () => {
                expect(expectActorSquaddieToBeHighlighted()).toBe(true)
            })
            it("will not tint again if it is already tinted", () => {
                expect(
                    expectSetPulseColorSpyIsIdempotentToRepeatedDrawCalls()
                ).toBeTruthy()
            })
            it("will highlight the potential targets", () => {
                const uiObjects =
                    playerActionTargetSelectViewController.componentData.getUIObjects()
                expect(uiObjects.mapIcons.targets.mapIcons).toHaveLength(2)
                expect(uiObjects.mapIcons.targets.mapIcons).toEqual(
                    expect.arrayContaining([thiefMapIcon, thief2MapIcon])
                )
                expect(uiObjects.mapIcons.targets.hasTinted).toBeTruthy()
                expect(thiefMapIcon.pulseColor).not.toBeUndefined()
                expect(thief2MapIcon.pulseColor).not.toBeUndefined()
                expect(citizenMapIcon.pulseColor).toBeUndefined()
            })
            it("will remove highlights on squaddies during clean up", () => {
                expect(expectCleanUpToRemoveEffectsFromMapIcons()).toBeTruthy()
            })
        })
        describe("highlight squaddies when it is time to confirm", () => {
            beforeEach(() => {
                selectThief1ToAttack()
                playerActionTargetSelectViewController.draw({
                    camera: new BattleCamera(),
                    graphicsContext: graphicsBuffer,
                })
            })
            it("will highlight the actor squaddie", () => {
                expect(expectActorSquaddieToBeHighlighted()).toBe(true)
            })
            it("will not tint again if it is already tinted", () => {
                expect(
                    expectSetPulseColorSpyIsIdempotentToRepeatedDrawCalls()
                ).toBeTruthy()
            })
            it("will highlight the targets", () => {
                const uiObjects =
                    playerActionTargetSelectViewController.componentData.getUIObjects()
                expect(uiObjects.mapIcons.targets.mapIcons).toHaveLength(1)
                expect(uiObjects.mapIcons.targets.mapIcons[0]).toBe(
                    thiefMapIcon
                )
                expect(uiObjects.mapIcons.targets.hasTinted).toBeTruthy()
                expect(thiefMapIcon.pulseColor).not.toBeUndefined()
                expect(thief2MapIcon.pulseColor).toBeUndefined()
                expect(citizenMapIcon.pulseColor).toBeUndefined()
            })
            it("will remove highlights on squaddies during clean up", () => {
                expect(expectCleanUpToRemoveEffectsFromMapIcons()).toBeTruthy()
            })
        })
    })
})
