import {
    SquaddieTemplate,
    SquaddieTemplateService,
} from "../campaign/squaddieTemplate"
import {
    ObjectRepository,
    ObjectRepositoryService,
} from "../battle/objectRepository"
import { BattleSquaddie, BattleSquaddieService } from "../battle/battleSquaddie"
import { SquaddieIdService } from "../squaddie/id"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../action/template/actionTemplate"
import { ActionEffectTemplateService } from "../action/template/actionEffectTemplate"
import { Trait, TraitStatusStorageService } from "../trait/traitStatusStorage"
import {
    GameEngineState,
    GameEngineStateService,
} from "../gameEngine/gameEngine"
import { BattleOrchestratorStateService } from "../battle/orchestrator/battleOrchestratorState"
import { BattleStateService } from "../battle/battleState/battleState"
import { BattleCamera } from "../battle/battleCamera"
import * as mocks from "../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../utils/test/mocks"
import { ResourceHandler } from "../resource/resourceHandler"
import { MissionMap, MissionMapService } from "../missionMap/missionMap"
import { TerrainTileMapService } from "../hexMap/terrainTileMap"
import { ConvertCoordinateService } from "../hexMap/convertCoordinates"
import { OrchestratorComponentMouseEventType } from "../battle/orchestrator/battleOrchestratorComponent"
import { BattlePlayerSquaddieSelector } from "../battle/orchestratorComponents/battlePlayerSquaddieSelector"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battle/battleSquaddieTeam"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../battle/orchestratorComponents/battlePhaseController"
import { BattlePhase } from "../battle/orchestratorComponents/battlePhaseTracker"
import { CampaignService } from "../campaign/campaign"
import { MouseButton } from "../utils/mouseConfig"
import { MessageBoardMessageType } from "../message/messageBoardMessage"
import { BattleActionDecisionStepService } from "../battle/actionDecision/battleActionDecisionStep"
import { ActionTilePosition } from "../battle/hud/playerActionPanel/tile/actionTilePosition"
import { SummaryHUDStateService } from "../battle/hud/summary/summaryHUD"
import { GraphicsBuffer } from "../utils/graphics/graphicsRenderer"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { BattleHUDListener } from "../battle/hud/battleHUD/battleHUDListener"
import {
    ActionButton,
    ActionButtonService,
} from "../battle/hud/playerActionPanel/actionButton/actionButton"
import { END_TURN_NAME } from "../battle/hud/playerCommand/playerCommandHUD"

describe("User clicks on a squaddie", () => {
    let repository: ObjectRepository
    let mockP5GraphicsContext: MockedP5GraphicsBuffer

    let playerTeam: BattleSquaddieTeam
    let playerSquaddieTemplate: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie

    let attackAction: ActionTemplate

    let resourceHandler: ResourceHandler
    let missionMap: MissionMap

    beforeEach(() => {
        repository = ObjectRepositoryService.new()
        attackAction = ActionTemplateService.new({
            id: "action",
            name: "action",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
        ObjectRepositoryService.addActionTemplate(repository, attackAction)

        playerSquaddieTemplate = SquaddieTemplateService.new({
            squaddieId: SquaddieIdService.new({
                name: "player",
                affiliation: SquaddieAffiliation.PLAYER,
                templateId: "player",
            }),
            actionTemplateIds: [attackAction.id],
        })
        ObjectRepositoryService.addSquaddieTemplate(
            repository,
            playerSquaddieTemplate
        )

        playerBattleSquaddie = BattleSquaddieService.new({
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: "player 0",
        })
        ObjectRepositoryService.addBattleSquaddie(
            repository,
            playerBattleSquaddie
        )

        playerTeam = BattleSquaddieTeamService.new({
            name: "player team",
            id: "player",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
        })

        resourceHandler = mocks.mockResourceHandler(
            new MockedP5GraphicsBuffer()
        )
        resourceHandler.areAllResourcesLoaded = vi
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = vi
            .fn()
            .mockReturnValue({ width: 32, height: 32 })

        missionMap = MissionMapService.new({
            terrainTileMap: TerrainTileMapService.new({
                movementCost: ["1 1 x x x x x x 1 "],
            }),
        })
        MissionMapService.addSquaddie({
            missionMap,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            squaddieTemplateId: playerBattleSquaddie.squaddieTemplateId,
            coordinate: { q: 0, r: 0 },
        })

        mockP5GraphicsContext = new MockedP5GraphicsBuffer()
        mockP5GraphicsContext.textWidth = vi.fn().mockReturnValue(1)
    })

    it("HUD produces a button for each ActionTemplate and 1 for End Turn", () => {
        const attackAction2 = ActionTemplateService.new({
            id: "action2",
            name: "action2",
            actionEffectTemplates: [
                ActionEffectTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues({
                        [Trait.ATTACK]: true,
                    }),
                }),
            ],
        })
        repository.squaddieTemplates[
            playerSquaddieTemplate.squaddieId.templateId
        ].actionTemplateIds.push(attackAction2.id)
        const gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [
                BattleSquaddieTeamService.new({
                    id: "player team",
                    battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
                    name: "player team",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
            ],
            battlePhaseState: BattlePhaseStateService.new({
                turnCount: 0,
                currentAffiliation: BattlePhase.PLAYER,
            }),
        })
        ObjectRepositoryService.addActionTemplate(repository, attackAction2)

        const battleHUDListener = new BattleHUDListener("battleHUDListener")
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
        )

        selectSquaddieForTheHUD({
            battleSquaddie: playerBattleSquaddie,
            gameEngineState: gameEngineState,
            graphicsContext: mockP5GraphicsContext,
        })

        expect(
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.squaddieNameTiles[
                ActionTilePosition.ACTOR_NAME
            ].battleSquaddieId
        ).toEqual(playerBattleSquaddie.battleSquaddieId)

        const actionButtons: ActionButton[] =
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState.playerCommandState.actionButtons
        expect(actionButtons).toHaveLength(
            playerSquaddieTemplate.actionTemplateIds.length + 1
        )

        expect(
            actionButtons.find((button) => {
                return (
                    ActionButtonService.getActionTemplateId(button) ===
                    attackAction.id
                )
            })
        ).toBeTruthy()

        expect(
            actionButtons.find((button) => {
                return (
                    ActionButtonService.getActionTemplateId(button) ===
                    attackAction2.id
                )
            })
        ).toBeTruthy()

        expect(
            actionButtons.find((button) => {
                return (
                    ActionButtonService.getActionTemplateId(button) ===
                    END_TURN_NAME
                )
            })
        ).toBeTruthy()
    })

    describe("BattlePlayerSquaddieSelector clicks on a squaddie to start their turn", () => {
        let gameEngineState: GameEngineState

        beforeEach(() => {
            gameEngineState = getGameEngineState({
                resourceHandler,
                missionMap,
                repository,
                teams: [playerTeam],
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
            })
            MissionMapService.addSquaddie({
                missionMap: missionMap,
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                coordinate: {
                    q: 0,
                    r: 0,
                },
            })
            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )
        })
        const selectorClicksOnSquaddie = (gameEngineState: GameEngineState) => {
            const selector = new BattlePlayerSquaddieSelector()
            gameEngineState.messageBoard.addListener(
                selector,
                MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
            )

            let { screenX: mouseX, screenY: mouseY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    q: 0,
                    r: 0,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                })
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX,
                mouseY,
                mouseButton: MouseButton.ACCEPT,
            })
        }

        it("BattlePlayerSquaddieSelector creates a decision step when the player clicks on a squaddie to start their turn", () => {
            selectorClicksOnSquaddie(gameEngineState)
            expect(
                BattleActionDecisionStepService.getActor(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                ).battleSquaddieId
            ).toEqual(playerBattleSquaddie.battleSquaddieId)
            expect(
                BattleActionDecisionStepService.getAction(
                    gameEngineState.battleOrchestratorState.battleState
                        .battleActionDecisionStep
                )
            ).toBeUndefined()
        })

        it("Map should highlight all the tiles it can reach when BattlePlayerSquaddieSelector selects a squaddie", () => {
            const addGraphicsLayerSpy = vi.spyOn(
                TerrainTileMapService,
                "addGraphicsLayer"
            )
            selectorClicksOnSquaddie(gameEngineState)
            expect(addGraphicsLayerSpy).toBeCalled()
        })
    })

    it("BattlePlayerSquaddieSelector changes the actor on the step when the player clicks on a different squaddie to start their turn", () => {
        const player2 = BattleSquaddieService.new({
            battleSquaddieId: "player 2",
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
        })
        ObjectRepositoryService.addBattleSquaddie(repository, player2)
        BattleSquaddieTeamService.addBattleSquaddieIds(playerTeam, [
            player2.battleSquaddieId,
        ])

        const gameEngineState = getGameEngineState({
            resourceHandler,
            missionMap,
            repository,
            teams: [playerTeam],
            battlePhaseState: BattlePhaseStateService.new({
                currentAffiliation: BattlePhase.PLAYER,
                turnCount: 0,
            }),
        })
        const battleHUDListener = new BattleHUDListener("battleHUDListener")
        gameEngineState.messageBoard.addListener(
            battleHUDListener,
            MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
        )

        MissionMapService.addSquaddie({
            missionMap: missionMap,
            squaddieTemplateId: playerSquaddieTemplate.squaddieId.templateId,
            battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
            coordinate: {
                q: 0,
                r: 0,
            },
        })
        MissionMapService.addSquaddie({
            missionMap: missionMap,
            squaddieTemplateId: player2.squaddieTemplateId,
            battleSquaddieId: player2.battleSquaddieId,
            coordinate: { q: 0, r: 1 },
        })

        const selector = new BattlePlayerSquaddieSelector()
        gameEngineState.messageBoard.addListener(
            selector,
            MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
        )

        let { screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                q: 0,
                r: 1,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
            })
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        })
        ;({ screenX: mouseX, screenY: mouseY } =
            ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                q: 0,
                r: 1,
                ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
            }))
        selector.mouseEventHappened(gameEngineState, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY,
            mouseButton: MouseButton.ACCEPT,
        })

        expect(
            BattleActionDecisionStepService.getActor(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            ).battleSquaddieId
        ).toEqual(player2.battleSquaddieId)
        expect(
            BattleActionDecisionStepService.getAction(
                gameEngineState.battleOrchestratorState.battleState
                    .battleActionDecisionStep
            )
        ).toBeUndefined()
    })

    describe("player hovers over squaddie", () => {
        let gameEngineState: GameEngineState

        const selectorHoversOnSquaddie = (
            gameEngineState: GameEngineState,
            graphicsContext: GraphicsBuffer
        ) => {
            const selector = new BattlePlayerSquaddieSelector()
            gameEngineState.messageBoard.addListener(
                selector,
                MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
            )

            let { screenX, screenY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    q: 0,
                    r: 0,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                })
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.MOVED,
                mouseX: screenX,
                mouseY: screenY,
            })

            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
                graphicsBuffer: graphicsContext,
            })
        }

        beforeEach(() => {
            const playerTeam = BattleSquaddieTeamService.new({
                id: "playerTeam",
                affiliation: SquaddieAffiliation.PLAYER,
                name: "player team",
                battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
            })

            gameEngineState = getGameEngineState({
                resourceHandler,
                missionMap,
                repository,
                teams: [playerTeam],
                battlePhaseState: BattlePhaseStateService.new({
                    currentAffiliation: BattlePhase.PLAYER,
                    turnCount: 0,
                }),
            })

            MissionMapService.addSquaddie({
                missionMap: missionMap,
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                coordinate: {
                    q: 0,
                    r: 0,
                },
            })

            const battleHUDListener = new BattleHUDListener("battleHUDListener")
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_PEEKS_AT_SQUADDIE
            )
            gameEngineState.messageBoard.addListener(
                battleHUDListener,
                MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE
            )
        })

        it("shows the main popover with the squaddie for a limited amount of time", () => {
            selectorHoversOnSquaddie(gameEngineState, mockP5GraphicsContext)

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ].battleSquaddieId
            ).toEqual(playerBattleSquaddie.battleSquaddieId)
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieToPeekAt.expirationTime
            ).not.toBeUndefined()
        })

        it("will override the MAIN squaddie if it is clicked on", () => {
            ObjectRepositoryService.addBattleSquaddie(
                gameEngineState.repository,
                BattleSquaddieService.new({
                    squaddieTemplateId:
                        playerSquaddieTemplate.squaddieId.templateId,
                    battleSquaddieId: "player 1",
                })
            )

            MissionMapService.addSquaddie({
                missionMap:
                    gameEngineState.battleOrchestratorState.battleState
                        .missionMap,
                squaddieTemplateId:
                    playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieId: "player 1",
                coordinate: { q: 0, r: 8 },
            })

            BattleSquaddieTeamService.addBattleSquaddieIds(
                gameEngineState.battleOrchestratorState.battleState.teams[0],
                ["player 1"]
            )

            const selector = new BattlePlayerSquaddieSelector()
            gameEngineState.messageBoard.addListener(
                selector,
                MessageBoardMessageType.PLAYER_CONFIRMS_DECISION_STEP_ACTOR
            )

            let { screenX, screenY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    q: 0,
                    r: 0,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                })
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: screenX,
                mouseY: screenY,
                mouseButton: MouseButton.ACCEPT,
            })
            ;({ screenX: screenX, screenY: screenY } =
                ConvertCoordinateService.convertMapCoordinatesToScreenLocation({
                    q: 0,
                    r: 8,
                    ...gameEngineState.battleOrchestratorState.battleState.camera.getCoordinates(),
                }))
            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.MOVED,
                mouseX: screenX,
                mouseY: screenY,
            })

            selector.mouseEventHappened(gameEngineState, {
                eventType: OrchestratorComponentMouseEventType.CLICKED,
                mouseX: screenX,
                mouseY: screenY,
                mouseButton: MouseButton.ACCEPT,
            })

            SummaryHUDStateService.draw({
                summaryHUDState:
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState,
                gameEngineState,
                resourceHandler: gameEngineState.resourceHandler,
                graphicsBuffer: mockP5GraphicsContext,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.ACTOR_NAME
                ].battleSquaddieId
            ).toEqual("player 1")
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.PEEK_PLAYABLE_NAME
                ]
            ).toBeUndefined()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.squaddieNameTiles[
                    ActionTilePosition.TARGET_NAME
                ]
            ).toBeUndefined()
        })
    })
})

const getGameEngineState = ({
    resourceHandler,
    missionMap,
    repository,
    teams,
    battlePhaseState,
}: {
    resourceHandler: ResourceHandler
    missionMap: MissionMap
    repository: ObjectRepository
    teams: BattleSquaddieTeam[]
    battlePhaseState: BattlePhaseState
}): GameEngineState => {
    return GameEngineStateService.new({
        resourceHandler: resourceHandler,
        battleOrchestratorState: BattleOrchestratorStateService.new({
            battleState: BattleStateService.newBattleState({
                missionId: "test mission",
                campaignId: "test campaign",
                missionMap,
                camera: new BattleCamera(0, 0),
                teams,
                battlePhaseState,
            }),
        }),
        repository,
        campaign: CampaignService.default(),
    })
}

const selectSquaddieForTheHUD = ({
    battleSquaddie,
    gameEngineState,
    graphicsContext,
}: {
    battleSquaddie: BattleSquaddie
    gameEngineState: GameEngineState
    graphicsContext: GraphicsBuffer
}) => {
    gameEngineState.messageBoard.sendMessage({
        type: MessageBoardMessageType.PLAYER_SELECTS_AND_LOCKS_SQUADDIE,
        gameEngineState,
        battleSquaddieSelectedId: battleSquaddie.battleSquaddieId,
    })

    SummaryHUDStateService.draw({
        summaryHUDState:
            gameEngineState.battleOrchestratorState.battleHUDState
                .summaryHUDState,
        gameEngineState,
        resourceHandler: gameEngineState.resourceHandler,
        graphicsBuffer: graphicsContext,
    })
}
