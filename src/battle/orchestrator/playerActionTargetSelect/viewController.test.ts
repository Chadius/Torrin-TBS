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
import { DamageType } from "../../../squaddie/squaddieService"
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
import { CampaignResourcesService } from "../../../campaign/campaignResources"
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

describe("Player Action Target Select View Controller", () => {
    let playerActionTargetSelectViewController: PlayerActionTargetSelectViewController
    let objectRepository: ObjectRepository
    let knightBattleSquaddie: BattleSquaddie
    let citizenBattleSquaddie: BattleSquaddie
    let thiefBattleSquaddie: BattleSquaddie

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
            objectRepository,
            missionMap,
            battleActionDecisionStep: BattleActionDecisionStepService.new(),
            messageBoard: new MessageBoard(),
            battleActionRecorder: BattleActionRecorderService.new(),
            numberGenerator: new RandomNumberGenerator(),
            playerInputState: PlayerInputStateService.newFromEnvironment(),
            summaryHUDState: SummaryHUDStateService.new(),
            campaignResources: CampaignResourcesService.default(),
            missionStatistics: MissionStatisticsService.new({}),
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
            missionMap: missionMap,
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
            missionMap: missionMap,
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
            missionMap: missionMap,
            squaddieTemplateId: thiefBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: thiefBattleSquaddie.battleSquaddieId,
            coordinate: { q: 1, r: 2 },
        })

        BattleActionDecisionStepService.setActor({
            actionDecisionStep:
                componentData.getContext().battleActionDecisionStep,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
        })
    })

    const attackThiefWithLongsword = () => {
        BattleActionDecisionStepService.addAction({
            actionDecisionStep:
                componentData.getContext().battleActionDecisionStep,
            actionTemplateId: longswordAction.id,
        })

        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            missionMap,
            thiefBattleSquaddie.battleSquaddieId
        )

        BattleActionDecisionStepService.setConsideredTarget({
            actionDecisionStep:
                componentData.getContext().battleActionDecisionStep,
            targetCoordinate: mapCoordinate,
        })

        playerActionTargetSelectViewController.componentData.setContext({
            ...playerActionTargetSelectViewController.componentData.getContext(),
            battleActionDecisionStep:
                componentData.getContext().battleActionDecisionStep,
            playerActionConfirmContext: {
                ...playerActionTargetSelectViewController.componentData.getContext()
                    .playerActionConfirmContext,
                buttonStatusChangeEventDataBlob: DataBlobService.new(),
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

    it("creates confirm buttons when the battle action decision has been decided", () => {
        expect(
            playerActionTargetSelectViewController.getButtons()
        ).toHaveLength(0)
        attackThiefWithLongsword()
        playerActionTargetSelectViewController.draw({
            camera: new BattleCamera(),
            graphicsContext: graphicsBuffer,
        })
        expect(
            playerActionTargetSelectViewController.getButtons()
        ).toHaveLength(2)
    })

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

            attackThiefWithLongsword()
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

            attackThiefWithLongsword()
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

        const expectScreenLocationIsCalled = (
            screenLocationSpy: MockInstance
        ) => {
            expect(screenLocationSpy).toHaveBeenCalled()
            screenLocationSpy.mockRestore()
            return true
        }
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

    describe("highlight squaddies", () => {
        let knightMapIcon: ImageUI
        let thiefMapIcon: ImageUI
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

            attackThiefWithLongsword()
            playerActionTargetSelectViewController.draw({
                camera: new BattleCamera(),
                graphicsContext: graphicsBuffer,
            })
        })
        afterEach(() => {
            pulseColorSpy.mockRestore()
        })
        it("will highlight the actor squaddie", () => {
            const uiObjects =
                playerActionTargetSelectViewController.componentData.getUIObjects()
            expect(uiObjects.confirm.mapIcons.actor.mapIcon).toBe(knightMapIcon)
            expect(uiObjects.confirm.mapIcons.actor.hasTinted).toBeTruthy()
            expect(knightMapIcon.pulseColor).not.toBeUndefined()
        })
        it("will not tint again if it is already tinted", () => {
            playerActionTargetSelectViewController.draw({
                camera: new BattleCamera(),
                graphicsContext: graphicsBuffer,
            })

            expect(pulseColorSpy).toHaveBeenCalledTimes(1)
        })
        it("will highlight the targets", () => {
            const uiObjects =
                playerActionTargetSelectViewController.componentData.getUIObjects()
            expect(uiObjects.confirm.mapIcons.targets.mapIcons).toHaveLength(1)
            expect(uiObjects.confirm.mapIcons.targets.mapIcons[0]).toBe(
                thiefMapIcon
            )
            expect(uiObjects.confirm.mapIcons.targets.hasTinted).toBeTruthy()
            expect(thiefMapIcon.pulseColor).not.toBeUndefined()
        })
        it("will remove highlights on squaddies during clean up", () => {
            playerActionTargetSelectViewController.cleanUp()
            expect(knightMapIcon.pulseColor).toBeUndefined()
            expect(thiefMapIcon.pulseColor).toBeUndefined()
        })
    })
})
