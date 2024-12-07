import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import {
    MockedP5GraphicsBuffer,
    mockResourceHandler,
} from "../../utils/test/mocks"
import {
    SummaryHUDState,
    SummaryHUDStateService,
    SummaryPopoverType,
} from "./summaryHUD"
import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { ActionTemplateService } from "../../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../../action/template/actionEffectTemplate"
import {
    Trait,
    TraitStatusStorageService,
} from "../../trait/traitStatusStorage"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { CampaignService } from "../../campaign/campaign"
import { ResourceHandler } from "../../resource/resourceHandler"
import {
    SquaddieSummaryPopoverPosition,
    SquaddieSummaryPopoverService,
} from "./playerActionPanel/squaddieSummaryPopover"
import { isValidValue } from "../../utils/validityCheck"
import {
    PlayerCommandSelection,
    PlayerCommandStateService,
} from "./playerCommandHUD"
import { MouseButton } from "../../utils/mouseConfig"
import { SquaddieRepositoryService } from "../../utils/test/squaddie"
import { MessageBoardMessageType } from "../../message/messageBoardMessage"
import { TargetConstraintsService } from "../../action/targetConstraints"
import { BattleActionDecisionStepService } from "../actionDecision/battleActionDecisionStep"
import { SquaddieNameAndPortraitTileService } from "./playerActionPanel/tile/squaddieNameAndPortraitTile"
import { MissionMapService } from "../../missionMap/missionMap"
import { TerrainTileMapService } from "../../hexMap/terrainTileMap"
import { ActionTilePosition } from "./playerActionPanel/tile/actionTilePosition"

describe("summaryHUD", () => {
    let graphicsBuffer: MockedP5GraphicsBuffer
    let objectRepository: ObjectRepository
    let summaryHUDState: SummaryHUDState
    let resourceHandler: ResourceHandler

    beforeEach(() => {
        objectRepository = ObjectRepositoryService.new()
        graphicsBuffer = new MockedP5GraphicsBuffer()
        graphicsBuffer.textWidth = jest.fn().mockReturnValue(1)
        resourceHandler = mockResourceHandler(graphicsBuffer)

        const actionTemplate0 = ActionTemplateService.new({
            id: "actionTemplate0",
            name: "NeedsTarget",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 2,
                maximumRange: 3,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.TARGET_FOE]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate0
        )

        const actionTemplate1 = ActionTemplateService.new({
            id: "actionTemplate1",
            name: "AlsoNeedsTarget",
            targetConstraints: TargetConstraintsService.new({
                minimumRange: 1,
                maximumRange: 2,
            }),
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.TARGET_FOE]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(
            objectRepository,
            actionTemplate1
        )

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "player",
            battleId: "player",
            templateId: "player",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.PLAYER,
            actionTemplateIds: [actionTemplate0.id, actionTemplate1.id],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "enemy",
            battleId: "enemy",
            templateId: "enemy",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.ENEMY,
            actionTemplateIds: [],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "ally",
            battleId: "ally",
            templateId: "ally",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.ALLY,
            actionTemplateIds: [],
        })

        SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
            name: "none",
            battleId: "none",
            templateId: "none",
            objectRepository: objectRepository,
            affiliation: SquaddieAffiliation.NONE,
            actionTemplateIds: [],
        })
    })

    describe("will draw a summary window for a squaddie", () => {
        it("can draw the main summary window on the left side", () => {
            const battleSquaddieId = "player"

            const panelSpy: jest.SpyInstance = jest.spyOn(
                SquaddieSummaryPopoverService,
                "new"
            )

            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId,
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                isValidValue(summaryHUDState.squaddieSummaryPopoversByType.MAIN)
            ).toBeTruthy()
            expect(
                isValidValue(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                )
            ).toBeFalsy()

            expect(panelSpy).toBeCalledWith({
                startingColumn: 0,
                battleSquaddieId,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            panelSpy.mockRestore()
        })
        it("can draw the target summary window on the right side", () => {
            const battleSquaddieId = "enemy"

            const panelSpy: jest.SpyInstance = jest.spyOn(
                SquaddieSummaryPopoverService,
                "new"
            )

            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId,
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                isValidValue(summaryHUDState.squaddieSummaryPopoversByType.MAIN)
            ).toBeFalsy()
            expect(
                isValidValue(
                    summaryHUDState.squaddieSummaryPopoversByType.TARGET
                )
            ).toBeTruthy()

            expect(panelSpy).toBeCalledWith({
                startingColumn: 9,
                battleSquaddieId,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            panelSpy.mockRestore()
        })

        it("knows when the mouse is hovering over the summary window", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                objectRepository,
                gameEngineState,
                resourceHandler,
                battleSquaddieId: "player",
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x:
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea.left - 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x:
                            RectAreaService.right(
                                summaryHUDState.squaddieSummaryPopoversByType[
                                    SummaryPopoverType.MAIN
                                ].windowArea
                            ) + 5,
                        y: RectAreaService.centerY(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                        y:
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea.top - 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                        y:
                            RectAreaService.bottom(
                                summaryHUDState.squaddieSummaryPopoversByType[
                                    SummaryPopoverType.MAIN
                                ].windowArea
                            ) + 5,
                    },
                })
            ).toBeFalsy()

            expect(
                SummaryHUDStateService.isMouseHoveringOver({
                    summaryHUDState,
                    mouseSelectionLocation: {
                        x: RectAreaService.centerX(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                        y: RectAreaService.centerY(
                            summaryHUDState.squaddieSummaryPopoversByType[
                                SummaryPopoverType.MAIN
                            ].windowArea
                        ),
                    },
                })
            ).toBeTruthy()
        })
    })

    describe("will draw tiles for the acting squaddie", () => {
        it("can draw the acting window on the left side", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            const battleSquaddieId = "player"
            BattleActionDecisionStepService.setActor({
                battleSquaddieId,
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(
                summaryHUDState.squaddieNameTiles[ActionTilePosition.ACTOR_NAME]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieStatusTiles[
                    ActionTilePosition.ACTOR_STATUS
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[ActionTilePosition.ACTOR_NAME]
                    .squaddieName
            ).toEqual("player")
        })
        describe("knows when it is hovering", () => {
            const tests = [
                {
                    name: "actor selected",
                    positions: [
                        ActionTilePosition.ACTOR_NAME,
                        ActionTilePosition.ACTOR_STATUS,
                    ],
                },
            ]

            it.each(tests)(`$name`, ({ positions }) => {
                let gameEngineState = GameEngineStateService.new({
                    resourceHandler,
                    repository: objectRepository,
                    campaign: CampaignService.default(),
                })
                summaryHUDState = SummaryHUDStateService.new({
                    screenSelectionCoordinates: { x: 0, y: 0 },
                })

                const { left, right, top, bottom } = positions.reduce(
                    (currentSides, position) => {
                        const rectArea =
                            SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
                                position
                            )

                        if (currentSides.left === undefined) {
                            currentSides.left = RectAreaService.left(rectArea)
                            currentSides.right = RectAreaService.right(rectArea)
                            currentSides.top = RectAreaService.top(rectArea)
                            currentSides.bottom =
                                RectAreaService.bottom(rectArea)
                        }

                        return {
                            left: Math.min(
                                RectAreaService.left(rectArea),
                                currentSides.left
                            ),
                            right: Math.max(
                                RectAreaService.right(rectArea),
                                currentSides.right
                            ),
                            top: RectAreaService.top(rectArea),
                            bottom: RectAreaService.bottom(rectArea),
                        }
                    },
                    {
                        left: undefined,
                        right: undefined,
                        top: undefined,
                        bottom: undefined,
                    }
                )

                const panelWindowRectArea = RectAreaService.new({
                    left,
                    right,
                    top,
                    bottom,
                })

                expect(
                    SummaryHUDStateService.isMouseHoveringOver({
                        summaryHUDState,
                        mouseSelectionLocation: {
                            x: RectAreaService.centerX(panelWindowRectArea),
                            y: RectAreaService.centerY(panelWindowRectArea),
                        },
                    })
                ).toBeFalsy()

                gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                    BattleActionDecisionStepService.new()

                BattleActionDecisionStepService.setActor({
                    battleSquaddieId: "player",
                    actionDecisionStep:
                        gameEngineState.battleOrchestratorState.battleState
                            .battleActionDecisionStep,
                })
                SummaryHUDStateService.draw({
                    summaryHUDState,
                    graphicsBuffer,
                    gameEngineState,
                })

                expectIsMouseHoveringOverTheExpectedPanelWindowRectArea(
                    summaryHUDState,
                    panelWindowRectArea
                )
            })
        })
    })

    describe("will draw tiles for the peeked squaddie", () => {
        it("can draw the playable squaddie tiles", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ].squaddieName
            ).toEqual("player")
            expect(
                summaryHUDState.squaddieStatusTiles[
                    ActionTilePosition.PEEK_PLAYABLE_STATUS
                ]
            ).not.toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toEqual(
                expect.objectContaining({
                    battleSquaddieId: "player",
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_PLAYABLE_NAME,
                        status: ActionTilePosition.PEEK_PLAYABLE_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            )
        })
        it("can draw the unplayable squaddie window", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "enemy",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ].squaddieName
            ).toEqual("enemy")
            expect(
                summaryHUDState.squaddieStatusTiles[
                    ActionTilePosition.PEEK_RIGHT_STATUS
                ]
            ).not.toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toEqual(
                expect.objectContaining({
                    battleSquaddieId: "enemy",
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_RIGHT_NAME,
                        status: ActionTilePosition.PEEK_RIGHT_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            )
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ].squaddieName
            ).toEqual("enemy")
        })
        it("will expire over time", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            const dateNowSpy = jest
                .spyOn(Date, "now")
                .mockImplementation(() => 0)

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "enemy",
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            dateNowSpy.mockImplementation(() => 1000)
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            dateNowSpy.mockImplementation(() => 2001)
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).toBeUndefined()
        })
        it("will override the peeked squaddie if a different one is peeked", () => {
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "player2",
                battleId: "player2",
                templateId: "player",
                objectRepository: objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
                actionTemplateIds: [],
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player2",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).not.toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toEqual(
                expect.objectContaining({
                    battleSquaddieId: "player2",
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_PLAYABLE_NAME,
                        status: ActionTilePosition.PEEK_PLAYABLE_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            )
        })
    })

    describe("will use the right panel to peek if the actor panel is already selected", () => {
        let gameEngineState: GameEngineState

        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "player",
                battleId: "player2",
                templateId: "player",
                objectRepository: objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
                actionTemplateIds: [],
            })

            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            const battleSquaddieId = "player"
            BattleActionDecisionStepService.setActor({
                battleSquaddieId,
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
        })

        it("will use the right panel to peek if the actor panel is different from the peeked squaddie", () => {
            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player2",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).not.toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toEqual(
                expect.objectContaining({
                    battleSquaddieId: "player2",
                    actionPanelPositions: {
                        nameAndPortrait: ActionTilePosition.PEEK_RIGHT_NAME,
                        status: ActionTilePosition.PEEK_RIGHT_STATUS,
                    },
                    expirationTime: expect.any(Number),
                })
            )
        })

        it("will not create peekable tiles if the peeked squaddie is the same as the actor tile", () => {
            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "player",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toBeUndefined()
        })
    })

    describe("will draw a squaddie name and portrait tile for the target squaddie", () => {
        let gameEngineState: GameEngineState
        const considerTarget = () => {
            gameEngineState.battleOrchestratorState.battleState.battleActionDecisionStep =
                BattleActionDecisionStepService.new()
            BattleActionDecisionStepService.setActor({
                battleSquaddieId: "player",
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })
            BattleActionDecisionStepService.addAction({
                actionTemplateId: "attack",
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })

            gameEngineState.battleOrchestratorState.battleState.missionMap =
                MissionMapService.new({
                    terrainTileMap: TerrainTileMapService.new({
                        movementCost: ["1 1 "],
                    }),
                })

            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                squaddieTemplateId: "enemy",
                battleSquaddieId: "enemy",
                coordinate: { q: 0, r: 1 },
            })

            BattleActionDecisionStepService.setConsideredTarget({
                targetLocation: { q: 0, r: 1 },
                actionDecisionStep:
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep,
            })
        }

        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })
        })

        it("will draw the target window on the right side", () => {
            considerTarget()

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.TARGET_NAME
                ]
            ).not.toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.TARGET_NAME
                ].squaddieName
            ).toEqual("enemy")
            expect(
                summaryHUDState.squaddieStatusTiles[
                    ActionTilePosition.TARGET_STATUS
                ]
            ).not.toBeUndefined()
        })
        describe("knows when the mouse is hovering over the tiles", () => {
            const tests = [
                {
                    name: "target selected",
                    positions: [
                        ActionTilePosition.TARGET_NAME,
                        ActionTilePosition.TARGET_STATUS,
                    ],
                },
            ]

            it.each(tests)(`$name`, ({ positions }) => {
                gameEngineState = GameEngineStateService.new({
                    resourceHandler,
                    repository: objectRepository,
                    campaign: CampaignService.default(),
                })
                summaryHUDState = SummaryHUDStateService.new({
                    screenSelectionCoordinates: { x: 0, y: 0 },
                })

                const panelWindowRectArea =
                    RectAreaService.newRectangleBasedOnMultipleRectAreas(
                        positions.map((position) =>
                            SquaddieNameAndPortraitTileService.getBoundingBoxBasedOnActionPanelPosition(
                                position
                            )
                        )
                    )

                expect(
                    SummaryHUDStateService.isMouseHoveringOver({
                        summaryHUDState,
                        mouseSelectionLocation: {
                            x: RectAreaService.centerX(panelWindowRectArea),
                            y: RectAreaService.centerY(panelWindowRectArea),
                        },
                    })
                ).toBeFalsy()

                considerTarget()

                SummaryHUDStateService.draw({
                    summaryHUDState,
                    graphicsBuffer,
                    gameEngineState,
                })

                expectIsMouseHoveringOverTheExpectedPanelWindowRectArea(
                    summaryHUDState,
                    panelWindowRectArea
                )
            })
        })

        it("will not create peekable tiles if the peeked squaddie is the same as the target tile", () => {
            considerTarget()

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            SummaryHUDStateService.peekAtSquaddie({
                summaryHUDState,
                gameEngineState,
                battleSquaddieId: "enemy",
            })

            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_NAME
                ]
            ).toBeUndefined()
            expect(
                summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_RIGHT_STATUS
                ]
            ).toBeUndefined()
            expect(summaryHUDState.squaddieToPeekAt).toBeUndefined()
        })
    })

    describe("resetting expiration time", () => {
        let gameEngineState: GameEngineState
        let summaryHUDState: SummaryHUDState
        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })

            SquaddieRepositoryService.createNewSquaddieAndAddToRepository({
                name: "another_player",
                battleId: "another_player",
                templateId: "another_player",
                objectRepository: objectRepository,
                affiliation: SquaddieAffiliation.PLAYER,
                actionTemplateIds: [],
            })
        })

        it("will not change the main summary popover if the current popover has no expiration time and the new one would", () => {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 100,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual("player")
        })

        it("will change the main summary popover if the current popover has an expiration time", () => {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 100,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 200,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .battleSquaddieId
            ).toEqual("another_player")
        })

        it("will not change the target summary popover if the existing one will not expire and the new one will", () => {
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 100,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .battleSquaddieId
            ).toEqual("player")
        })

        it("will change the target summary popover if the existing will expire", () => {
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 100,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .battleSquaddieId
            ).toEqual("another_player")
        })

        it("will change the target summary popover if the existing and new ones do not expire", () => {
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "another_player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
                    .battleSquaddieId
            ).toEqual("another_player")
        })
    })

    describe("can create a playerCommandHUD based on the main panel", () => {
        let summaryHUDState: SummaryHUDState
        beforeEach(() => {
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: { x: 0, y: 0 },
            })
            let gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            SummaryHUDStateService.createCommandWindow({
                summaryHUDState,
                gameEngineState,
                objectRepository,
                resourceHandler,
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
        })
        it("will create a playerCommandHUD when the squaddie is player controllable", () => {
            expect(summaryHUDState.showPlayerCommand).toBeTruthy()
            expect(summaryHUDState.playerCommandState).not.toBeUndefined()
        })
    })

    describe("playerCommandHUD selects a squaddie action", () => {
        let gameEngineState: GameEngineState
        beforeEach(() => {
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: {
                    x: 0,
                    y: 0,
                },
            })

            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                gameEngineState,
                objectRepository,
                resourceHandler,
                battleSquaddieId: "player",
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            SummaryHUDStateService.createCommandWindow({
                summaryHUDState,
                gameEngineState,
                objectRepository,
                resourceHandler,
            })
            SummaryHUDStateService.draw({
                summaryHUDState,
                gameEngineState,
                graphicsBuffer,
            })
        })

        it("will delegate mouseMoved events to playerCommandHUD when it is active", () => {
            const playerCommandSpy = jest.spyOn(
                PlayerCommandStateService,
                "mouseMoved"
            )
            const mouseX = RectAreaService.centerX(
                summaryHUDState.playerCommandState.actionButtons[0].buttonArea
            )
            const mouseY = RectAreaService.centerY(
                summaryHUDState.playerCommandState.actionButtons[0].buttonArea
            )

            SummaryHUDStateService.mouseMoved({
                summaryHUDState,
                mouseX,
                mouseY,
                gameEngineState,
            })
            expect(playerCommandSpy).toBeCalledWith({
                mouseX,
                mouseY,
                gameEngineState,
                playerCommandState: summaryHUDState.playerCommandState,
            })
        })

        it("will return which button was clicked on the PlayerCommandHUD", () => {
            const playerCommandSpy: jest.SpyInstance = jest.spyOn(
                PlayerCommandStateService,
                "mouseClicked"
            )

            const selection = SummaryHUDStateService.mouseClicked({
                summaryHUDState,
                mouseButton: MouseButton.ACCEPT,
                mouseX: RectAreaService.centerX(
                    summaryHUDState.playerCommandState.actionButtons[0]
                        .buttonArea
                ),
                mouseY: RectAreaService.centerY(
                    summaryHUDState.playerCommandState.actionButtons[0]
                        .buttonArea
                ),
                gameEngineState,
            })
            expect(playerCommandSpy).toBeCalled()
            expect(selection).toEqual(
                PlayerCommandSelection.PLAYER_COMMAND_SELECTION_ACTION
            )
            playerCommandSpy.mockRestore()
        })
    })

    describe("Timed expiration", () => {
        let dateSpy: jest.SpyInstance
        let gameEngineState: GameEngineState
        let messageSpy: jest.SpyInstance

        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler,
                repository: objectRepository,
                campaign: CampaignService.default(),
            })

            dateSpy = jest.spyOn(Date, "now")
            summaryHUDState = SummaryHUDStateService.new({
                screenSelectionCoordinates: {
                    x: 0,
                    y: 0,
                },
            })

            messageSpy = jest.spyOn(gameEngineState.messageBoard, "sendMessage")
        })
        afterEach(() => {
            dateSpy.mockRestore()
        })

        it("Does not expire if no expiration time is set", () => {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            dateSpy.mockReturnValue(1000)
            expect(
                SummaryHUDStateService.hasMainSummaryPopoverExpired({
                    summaryHUDState,
                })
            ).toBeFalsy()
        })
        it("Does not expire if expiration time has not been reached yet", () => {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 2000,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            expect(
                summaryHUDState.squaddieSummaryPopoversByType.MAIN
                    .expirationTime
            ).toEqual(2000)
            dateSpy.mockReturnValue(1000)
            expect(
                SummaryHUDStateService.hasMainSummaryPopoverExpired({
                    summaryHUDState,
                })
            ).toBeFalsy()
        })
        it("Will expire if expiration time has been reached", () => {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 999,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            dateSpy.mockReturnValue(1000)
            expect(
                SummaryHUDStateService.hasMainSummaryPopoverExpired({
                    summaryHUDState,
                })
            ).toBeTruthy()
        })
        it("Will send a message if it has expired", () => {
            dateSpy.mockReturnValue(0)

            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 999,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "enemy",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 1999,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            dateSpy.mockReturnValue(1000)
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })

            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES,
                gameEngineState,
                popoverType: SummaryPopoverType.MAIN,
            })

            dateSpy.mockReturnValue(2000)
            SummaryHUDStateService.draw({
                summaryHUDState,
                graphicsBuffer,
                gameEngineState,
            })
            expect(messageSpy).toBeCalledWith({
                type: MessageBoardMessageType.SUMMARY_POPOVER_EXPIRES,
                gameEngineState,
                popoverType: SummaryPopoverType.TARGET,
            })
        })

        it("will remove popovers when requested", () => {
            SummaryHUDStateService.setMainSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 999,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })
            SummaryHUDStateService.setTargetSummaryPopover({
                summaryHUDState,
                battleSquaddieId: "player",
                resourceHandler,
                objectRepository,
                gameEngineState,
                expirationTime: 1999,
                position: SquaddieSummaryPopoverPosition.SELECT_MAIN,
            })

            SummaryHUDStateService.removeSummaryPopover({
                summaryHUDState,
                popoverType: SummaryPopoverType.MAIN,
            })
            expect(
                summaryHUDState.squaddieSummaryPopoversByType.MAIN
            ).toBeUndefined()
            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
            ).not.toBeUndefined()

            SummaryHUDStateService.removeSummaryPopover({
                summaryHUDState,
                popoverType: SummaryPopoverType.TARGET,
            })
            expect(
                summaryHUDState.squaddieSummaryPopoversByType.TARGET
            ).toBeUndefined()
        })
    })
})

const expectIsMouseHoveringOverTheExpectedPanelWindowRectArea = (
    summaryHUDState: SummaryHUDState,
    panelWindowRectArea: RectArea
) => {
    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.centerX(panelWindowRectArea),
                y: RectAreaService.centerY(panelWindowRectArea),
            },
        })
    ).toBeTruthy()

    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.left(panelWindowRectArea) - 5,
                y: RectAreaService.centerY(panelWindowRectArea),
            },
        })
    ).toBeFalsy()

    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.right(panelWindowRectArea) + 5,
                y: RectAreaService.centerY(panelWindowRectArea),
            },
        })
    ).toBeFalsy()

    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.centerX(panelWindowRectArea),
                y: RectAreaService.top(panelWindowRectArea) - 5,
            },
        })
    ).toBeFalsy()

    expect(
        SummaryHUDStateService.isMouseHoveringOver({
            summaryHUDState,
            mouseSelectionLocation: {
                x: RectAreaService.centerX(panelWindowRectArea),
                y: RectAreaService.bottom(panelWindowRectArea) + 5,
            },
        })
    ).toBeFalsy()
}
