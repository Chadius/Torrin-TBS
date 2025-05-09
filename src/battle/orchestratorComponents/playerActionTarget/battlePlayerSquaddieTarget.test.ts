import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../../objectRepository"
import { BattlePlayerSquaddieTarget } from "./battlePlayerSquaddieTarget"
import { BattleSquaddie } from "../../battleSquaddie"
import { TerrainTileMapService } from "../../../hexMap/terrainTileMap"
import {
    Trait,
    TraitStatusStorageService,
} from "../../../trait/traitStatusStorage"
import { SquaddieAffiliation } from "../../../squaddie/squaddieAffiliation"
import { MissionMap, MissionMapService } from "../../../missionMap/missionMap"
import { BattleOrchestratorStateService } from "../../orchestrator/battleOrchestratorState"
import { ConvertCoordinateService } from "../../../hexMap/convertCoordinates"
import {
    OrchestratorComponentMouseEvent,
    OrchestratorComponentMouseEventType,
} from "../../orchestrator/battleOrchestratorComponent"
import { BattleOrchestratorMode } from "../../orchestrator/battleOrchestrator"
import { ResourceHandler } from "../../../resource/resourceHandler"
import * as mocks from "../../../utils/test/mocks"
import {
    MockedGraphicsBufferService,
    MockedP5GraphicsBuffer,
} from "../../../utils/test/mocks"
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
    TargetBySquaddieAffiliationRelation,
    VersusSquaddieResistance,
} from "../../../action/template/actionEffectTemplate"
import { CampaignService } from "../../../campaign/campaign"
import { BattleHUDService } from "../../hud/battleHUD/battleHUD"
import { MouseButton } from "../../../utils/mouseConfig"
import { BattleActionDecisionStepService } from "../../actionDecision/battleActionDecisionStep"
import { MessageBoardMessageType } from "../../../message/messageBoardMessage"
import { SummaryHUDStateService } from "../../hud/summary/summaryHUD"
import { SquaddieRepositoryService } from "../../../utils/test/squaddie"
import { TargetConstraintsService } from "../../../action/targetConstraints"
import { ArmyAttributesService } from "../../../squaddie/armyAttributes"
import { ActionResourceCostService } from "../../../action/actionResourceCost"
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    MockInstance,
    vi,
} from "vitest"
import { HexCoordinate } from "../../../hexMap/hexCoordinate/hexCoordinate"
import { BattleOrchestratorStateTestService } from "../../../utils/test/battleOrchestratorState"
import { BattlePlayerActionTargetSpec } from "../../../integration/spec/battlePlayerSquaddieTargetSpec"

describe("BattleSquaddieTarget", () => {
    let objectRepository: ObjectRepository = ObjectRepositoryService.new()
    let targetComponent: BattlePlayerSquaddieTarget
    let knightBattleSquaddie: BattleSquaddie
    let citizenDynamic: BattleSquaddie
    let thiefDynamic: BattleSquaddie
    let battleMap: MissionMap
    let longswordAction: ActionTemplate
    let longswordActionId: string = "longsword"
    let longswordActionDamage: number = 2
    let bandageWoundsAction: ActionTemplate
    let bandageWoundsActionId: string = "bandage wounds"
    let gameEngineState: GameEngineState
    let mockResourceHandler: ResourceHandler
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer
    let messageSpy: MockInstance

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()
        targetComponent = new BattlePlayerSquaddieTarget()
        objectRepository = ObjectRepositoryService.new()
        battleMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 1 ", " 1 1 1 ", "  1 1 1 "],
            }),
        })

        longswordActionDamage = 2
        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: longswordActionId,
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
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                    },
                    damageDescriptions: {
                        [DamageType.BODY]: longswordActionDamage,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            longswordAction
        )

        bandageWoundsAction = ActionTemplateService.new({
            name: "Bandage Wounds",
            id: bandageWoundsActionId,
            resourceCost: ActionResourceCostService.new({
                actionPoints: 2,
            }),
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 1,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.HEALING]: true,
                    }),
                    squaddieAffiliationRelation: {
                        [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                    },
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            bandageWoundsAction
        )
        ;({ battleSquaddie: knightBattleSquaddie } =
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "Knight",
                templateId: "Knight",
                battleId: "Knight 0",
                affiliation: SquaddieAffiliation.PLAYER,
                objectRepository: objectRepository,
                actionTemplateIds: [longswordAction.id, bandageWoundsAction.id],
            }))
        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: knightBattleSquaddie.squaddieTemplateId,
            battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
            coordinate: { q: 1, r: 1 },
        })
        ;({ battleSquaddie: citizenDynamic } =
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
            squaddieTemplateId: citizenDynamic.squaddieTemplateId,
            battleSquaddieId: citizenDynamic.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })
        ;({ battleSquaddie: thiefDynamic } =
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
                }),
            }))
        MissionMapService.addSquaddie({
            missionMap: battleMap,
            squaddieTemplateId: thiefDynamic.squaddieTemplateId,
            battleSquaddieId: thiefDynamic.battleSquaddieId,
            coordinate: { q: 1, r: 2 },
        })

        mockResourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        mockResourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })

        gameEngineState = GameEngineStateService.new({
            resourceHandler: mockResourceHandler,
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

    const clickOnSquaddie = (mapCoordinate: HexCoordinate) => {
        const { x: mouseX, y: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate,
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            })
        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.RELEASE,
            mouseRelease: {
                x: mouseX,
                y: mouseY,
                button: MouseButton.ACCEPT,
            },
        }

        targetComponent.mouseEventHappened(gameEngineState, mouseEvent)
    }

    const clickOnThief = () => {
        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            thiefDynamic.battleSquaddieId
        )
        clickOnSquaddie(mapCoordinate)
    }

    const clickOnSelf = () => {
        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            knightBattleSquaddie.battleSquaddieId
        )
        clickOnSquaddie(mapCoordinate)
    }

    const clickOnCitizen = () => {
        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            citizenDynamic.battleSquaddieId
        )
        clickOnSquaddie(mapCoordinate)
    }

    it("should highlight the map with the ability range", () => {
        targetComponent.update({
            gameEngineState,
            graphicsContext: mockedP5GraphicsContext,
        })

        expect(targetComponent.hasCompleted(gameEngineState)).toBeFalsy()

        const highlightedTileLocations =
            TerrainTileMapService.computeHighlightedTiles(
                battleMap.terrainTileMap
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

    describe("canceling after selecting action but before selecting target", () => {
        it("should cancel target if the user clicks on the cancel button", () => {
            BattlePlayerActionTargetSpec.updateUntilCancelButtonIsReady({
                targeting: targetComponent,
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
            })
            BattlePlayerActionTargetSpec.clickOnCancelButton({
                targeting: targetComponent,
                gameEngineState,
            })

            expect(targetComponent.hasCompleted(gameEngineState)).toBeTruthy()
            const recommendedInfo =
                targetComponent.recommendStateChanges(gameEngineState)
            expect(recommendedInfo.nextMode).toBe(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
                campaignResources: gameEngineState.campaign.resources,
            })
        })
        it("should cancel target if the user clicks the mouse cancel button", () => {
            BattlePlayerActionTargetSpec.clickCancelButtonOnMouse({
                targeting: targetComponent,
                gameEngineState,
            })

            expect(targetComponent.hasCompleted(gameEngineState)).toBeTruthy()
            const recommendedInfo =
                targetComponent.recommendStateChanges(gameEngineState)
            expect(recommendedInfo.nextMode).toBe(
                BattleOrchestratorMode.PLAYER_HUD_CONTROLLER
            )
            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_CANCELS_TARGET_SELECTION,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                objectRepository: gameEngineState.repository,
                campaignResources: gameEngineState.campaign.resources,
            })
        })
    })

    describe("Invalid target selections", () => {
        const clickOffMap = () => {
            const { x: mouseX, y: mouseY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    mapCoordinate: {
                        q:
                            TerrainTileMapService.getDimensions(
                                battleMap.terrainTileMap
                            ).numberOfRows + 1,
                        r: 0,
                    },
                    cameraLocation:
                        gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
                })

            const mouseEvent: OrchestratorComponentMouseEvent = {
                eventType: OrchestratorComponentMouseEventType.RELEASE,
                mouseRelease: {
                    x: mouseX,
                    y: mouseY,
                    button: MouseButton.ACCEPT,
                },
            }

            targetComponent.mouseEventHappened(gameEngineState, mouseEvent)
        }

        const clickOnTargetOutOfRange = () => {
            MissionMapService.updateBattleSquaddieCoordinate({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleSquaddieId: thiefDynamic.battleSquaddieId,
                coordinate: { q: 0, r: 0 },
            })
            targetComponent.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
            })
            clickOnThief()
        }

        const tests = [
            {
                name: "click off map",
                setup: clickOffMap,
            },
            {
                name: "target is out of range",
                setup: clickOnTargetOutOfRange,
            },
        ]
        describe("Component is not complete", () => {
            it.each(tests)(`$name`, ({ setup }) => {
                setup()
                expect(
                    targetComponent.hasCompleted(gameEngineState)
                ).toBeFalsy()
            })
        })
        describe("Action is still set", () => {
            it.each(tests)(`$name`, ({ setup }) => {
                setup()
                expect(
                    targetComponent.hasCompleted(gameEngineState)
                ).toBeFalsy()
                expect(
                    BattleActionDecisionStepService.isActorSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeTruthy()
                expect(
                    BattleActionDecisionStepService.isActionSet(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeTruthy()
            })
        })
        describe("Target is not set", () => {
            it.each(tests)(`$name`, ({ setup }) => {
                setup()
                expect(
                    targetComponent.hasCompleted(gameEngineState)
                ).toBeFalsy()
                expect(
                    BattleActionDecisionStepService.isTargetConsidered(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeFalsy()
                expect(
                    BattleActionDecisionStepService.isTargetConfirmed(
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep
                    )
                ).toBeFalsy()
            })
        })
        describe("should change the explanation message to indicate the target is out of range", () => {
            it.each(tests)(`$name`, ({ setup }) => {
                setup()
                BattlePlayerActionTargetSpec.updateUntilCancelButtonIsReady({
                    graphicsContext: mockedP5GraphicsContext,
                    targeting: targetComponent,
                    gameEngineState,
                })
                const graphicsSpies = MockedGraphicsBufferService.addSpies(
                    mockedP5GraphicsContext
                )
                expect(
                    targetComponent.data
                        .getUIObjects()
                        .explanationLabel.textBox.text.includes("out of range")
                ).toBeTruthy()
                targetComponent.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                })
                expect(graphicsSpies["text"]).toHaveBeenCalled()
                expect(
                    graphicsSpies["text"].mock.calls[0][0].includes(
                        "out of range"
                    )
                ).toBe(true)
            })
        })
    })

    describe("user clicks on target with attack", () => {
        beforeEach(() => {
            targetComponent.update({
                gameEngineState,
                graphicsContext: mockedP5GraphicsContext,
            })
            clickOnThief()
        })

        it("sends a message with the clicked target coordinate", () => {
            const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
                gameEngineState.battleOrchestratorState.battleState.missionMap,
                thiefDynamic.battleSquaddieId
            )

            expect(messageSpy).toHaveBeenCalledWith({
                type: MessageBoardMessageType.PLAYER_SELECTS_TARGET_COORDINATE,
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                battleActionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                objectRepository: gameEngineState.repository,
                targetCoordinate: mapCoordinate,
                battleActionRecorder:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionRecorder,
                numberGenerator:
                    gameEngineState.battleOrchestratorState.numberGenerator,
            })
        })

        it("should be completed", () => {
            expect(targetComponent.hasCompleted(gameEngineState)).toBeTruthy()
        })

        it("should recommend Action Confirm mode next", () => {
            const changes =
                targetComponent.recommendStateChanges(gameEngineState)
            expect(changes.nextMode).toEqual(
                BattleOrchestratorMode.PLAYER_ACTION_CONFIRM
            )
        })
    })

    describe("invalid target based on affiliation", () => {
        const tests = [
            {
                name: "target foe tries to attack an ally",
                actionTraits: [Trait.ATTACK],
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_FOE]: true,
                },
                invalidTargetClicker: clickOnCitizen,
            },
            {
                name: "heal ally tries to heal a foe",
                actionTraits: [Trait.HEALING],
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                },
                invalidTargetClicker: clickOnThief,
            },
            {
                name: "heal ally tries to heal self",
                actionTraits: [Trait.HEALING],
                squaddieAffiliationRelation: {
                    [TargetBySquaddieAffiliationRelation.TARGET_ALLY]: true,
                },
                invalidTargetClicker: clickOnSelf,
            },
        ]
        it.each(tests)(
            `$name do not show a confirm window`,
            ({ name, actionTraits, invalidTargetClicker }) => {
                const traits: { [key in Trait]?: boolean } = Object.fromEntries(
                    actionTraits.map((e) => [e, true])
                )

                const action = ActionTemplateService.new({
                    id: name,
                    name,
                    targetConstraints: TargetConstraintsService.new({
                        minimumRange: 0,
                        maximumRange: 9001,
                    }),
                    actionEffectTemplates: [
                        ActionEffectTemplateService.new({
                            traits: TraitStatusStorageService.newUsingTraitValues(
                                traits
                            ),
                        }),
                    ],
                })
                ObjectRepositoryService.addActionTemplate(
                    objectRepository,
                    action
                )

                gameEngineState = GameEngineStateService.new({
                    resourceHandler: mockResourceHandler,
                    battleOrchestratorState: BattleOrchestratorStateService.new(
                        {
                            battleHUD: BattleHUDService.new({}),
                            battleState: BattleStateService.newBattleState({
                                campaignId: "test campaign",
                                missionId: "test mission",
                                missionMap: battleMap,
                            }),
                        }
                    ),
                    repository: objectRepository,
                })

                gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                    BattleActionDecisionStepService.new()
                BattleActionDecisionStepService.setActor({
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    battleSquaddieId: knightBattleSquaddie.battleSquaddieId,
                })
                BattleActionDecisionStepService.addAction({
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                    actionTemplateId: action.id,
                })

                targetComponent.update({
                    gameEngineState,
                    graphicsContext: mockedP5GraphicsContext,
                })
                invalidTargetClicker()

                expect(
                    targetComponent.hasCompleted(gameEngineState)
                ).toBeFalsy()
            }
        )
    })

    it("sends a Peek message when the mouse moves over a squaddie", () => {
        let messageSpy: MockInstance = vi.spyOn(
            gameEngineState.messageBoard,
            "sendMessage"
        )

        const { mapCoordinate } = MissionMapService.getByBattleSquaddieId(
            gameEngineState.battleOrchestratorState.battleState.missionMap,
            citizenDynamic.battleSquaddieId
        )

        const { x: mouseX, y: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                mapCoordinate,
                cameraLocation:
                    gameEngineState.battleOrchestratorState.battleState.camera.getWorldLocation(),
            })

        const mouseEvent: OrchestratorComponentMouseEvent = {
            eventType: OrchestratorComponentMouseEventType.LOCATION,
            mouseLocation: {
                x: mouseX,
                y: mouseY,
            },
        }

        targetComponent.mouseEventHappened(gameEngineState, mouseEvent)

        expect(messageSpy).toBeCalledWith({
            type: MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE,
            gameEngineState,
            battleSquaddieSelectedId: citizenDynamic.battleSquaddieId,
            selectionMethod: {
                mouse: {
                    x: mouseX,
                    y: mouseY,
                },
            },
        })
    })
})
