import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap, MissionMapService } from "../../missionMap/missionMap"
import { ResourceHandler } from "../../resource/resourceHandler"
import { BattleSquaddieSelectedHUD } from "./BattleSquaddieSelectedHUD"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { TargetingShape } from "../targeting/targetingShapeGenerator"
import { RectAreaService } from "../../ui/rectArea"
import { makeResult } from "../../utils/ResultOrError"
import { CreateNewSquaddieAndAddToRepository } from "../../utils/test/squaddie"
import { BattleCamera } from "../battleCamera"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { KeyButtonName } from "../../utils/keyboardConfig"
import { config } from "../../configuration/config"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { ButtonStatus } from "../../ui/button"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import {
    BattleSquaddieTeam,
    BattleSquaddieTeamService,
} from "../battleSquaddieTeam"
import {
    BattlePhaseState,
    BattlePhaseStateService,
} from "../orchestratorComponents/battlePhaseController"
import {
    ActionTemplate,
    ActionTemplateService,
} from "../../action/template/actionTemplate"
import { ActionEffectSquaddieTemplateService } from "../../action/template/actionEffectSquaddieTemplate"
import { ActionsThisRound } from "../history/actionsThisRound"
import { CampaignService } from "../../campaign/campaign"
import { MouseButton } from "../../utils/mouseConfig"
import { BattlePlayerSquaddieSelector } from "../orchestratorComponents/battlePlayerSquaddieSelector"

describe("BattleSquaddieSelectedHUD", () => {
    let hud: BattleSquaddieSelectedHUD
    let selector: BattlePlayerSquaddieSelector
    let squaddieRepository: ObjectRepository
    let missionMap: MissionMap
    let resourceHandler: ResourceHandler
    let playerBattleSquaddieId: string = "player_squaddie_0"
    let playerSquaddieStatic: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie
    let enemySquaddieDynamicID: string = "enemy_squaddie_0"
    let enemySquaddieStatic: SquaddieTemplate
    let enemySquaddieDynamic: BattleSquaddie
    let player2BattleSquaddieId: string = "player_squaddie_2"
    let player2SquaddieStatic: SquaddieTemplate
    let player2SquaddieDynamic: BattleSquaddie
    let longswordAction: ActionTemplate
    let mockedP5GraphicsContext: MockedP5GraphicsBuffer

    beforeEach(() => {
        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "],
            }),
        })

        squaddieRepository = ObjectRepositoryService.new()

        mockedP5GraphicsContext = new MockedP5GraphicsBuffer()

        resourceHandler = mocks.mockResourceHandler(mockedP5GraphicsContext)
        resourceHandler.areAllResourcesLoaded = jest
            .fn()
            .mockReturnValueOnce(false)
            .mockReturnValueOnce(true)
        resourceHandler.getResource = jest
            .fn()
            .mockReturnValue(makeResult({ width: 1, height: 1 }))

        longswordAction = ActionTemplateService.new({
            name: "longsword",
            id: "longsword",
            actionEffectTemplates: [
                ActionEffectSquaddieTemplateService.new({
                    traits: TraitStatusStorageService.newUsingTraitValues(),
                    minimumRange: 0,
                    maximumRange: 1,
                    targetingShape: TargetingShape.SNAKE,
                }),
            ],
        })
        ;({
            squaddieTemplate: playerSquaddieStatic,
            battleSquaddie: playerBattleSquaddie,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "player_soldier",
            name: "Player Soldier",
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: playerBattleSquaddieId,
            squaddieRepository,
            actionTemplates: [longswordAction],
        }))
        ;({
            squaddieTemplate: player2SquaddieStatic,
            battleSquaddie: player2SquaddieDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "player_soldier2",
            name: "Player Soldier 2",
            affiliation: SquaddieAffiliation.PLAYER,
            battleId: player2BattleSquaddieId,
            squaddieRepository,
            actionTemplates: [longswordAction],
        }))
        ;({
            squaddieTemplate: enemySquaddieStatic,
            battleSquaddie: enemySquaddieDynamic,
        } = CreateNewSquaddieAndAddToRepository({
            templateId: "enemy_soldier",
            name: "Enemy Soldier",
            affiliation: SquaddieAffiliation.ENEMY,
            battleId: enemySquaddieDynamicID,
            squaddieRepository,
            actionTemplates: [longswordAction],
        }))

        hud = new BattleSquaddieSelectedHUD()
        selector = new BattlePlayerSquaddieSelector()
    })

    describe("Player selects squaddie they can control (and controls via HUD)", () => {
        let gameEngineState: GameEngineState

        const setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie = ({
            teams,
            battlePhaseState,
        }: {
            teams?: BattleSquaddieTeam[]
            battlePhaseState?: BattlePhaseState
        }) => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState:
                    BattleOrchestratorStateService.newOrchestratorState({
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            campaignId: "test campaign",
                            missionMap,
                            camera: new BattleCamera(0, 0),
                            teams,
                            battlePhaseState,
                        }),
                    }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            })
            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                gameEngineState: gameEngineState,
            })
        }

        it("knows after selecting the player the hud has not selected actions", () => {
            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({})
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState
                    .playerSelectedSquaddieAction
            ).toBeFalsy()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState.playerSelectedEndTurn
            ).toBeFalsy()
        })

        it("reports when an action button is clicked (via HUD)", () => {
            MissionMapService.addSquaddie(
                missionMap,
                playerBattleSquaddie.squaddieTemplateId,
                playerBattleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )

            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({
                teams: [
                    BattleSquaddieTeamService.new({
                        id: "player team",
                        name: "player team",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [
                            playerBattleSquaddie.battleSquaddieId,
                        ],
                    }),
                ],
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.PLAYER,
                },
            })

            const longswordButton =
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                    (button) => button.actionTemplate.id === longswordAction.id
                )
            selector.mouseClicked({
                mouseX: longswordButton.buttonArea.left,
                mouseY: longswordButton.buttonArea.top,
                gameEngineState: gameEngineState,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState.playerSelectedEndTurn
            ).toBeFalsy()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState
                    .playerSelectedSquaddieAction
            ).toBeTruthy()
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState.selectedActionTemplate
            ).toBe(longswordAction)
        })

        it("reports when an action button is hovered (via HUD)", () => {
            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({})
            const longswordButton =
                gameEngineState.battleOrchestratorState.battleHUDState.summaryHUDState.playerCommandState.actionButtons.find(
                    (button) => button.actionTemplate.id === longswordAction.id
                )
            selector.mouseMoved(
                gameEngineState,
                RectAreaService.centerX(longswordButton.buttonArea),
                RectAreaService.centerY(longswordButton.buttonArea)
            )
            expect(longswordButton.status).toBe(ButtonStatus.HOVER)
        })

        describe("when the end turn button is clicked", () => {
            beforeEach(() => {
                const team = BattleSquaddieTeamService.new({
                    id: "player team",
                    name: "player team",
                    affiliation: SquaddieAffiliation.PLAYER,
                    battleSquaddieIds: [playerBattleSquaddie.battleSquaddieId],
                })

                setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({
                    teams: [team],
                    battlePhaseState: BattlePhaseStateService.new({
                        currentAffiliation: BattlePhase.PLAYER,
                    }),
                })
            })

            it("generates an end turn action button when a squaddie is selected", () => {
                expect(
                    gameEngineState.battleOrchestratorState.battleHUDState
                        .summaryHUDState.playerCommandState.endTurnButton
                ).toBeTruthy()
            })
        })
    })

    describe("Player selects squaddie they can control", () => {
        let gameEngineState: GameEngineState

        const setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie = ({
            teams,
            battlePhaseState,
        }: {
            teams?: BattleSquaddieTeam[]
            battlePhaseState?: BattlePhaseState
        }) => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState:
                    BattleOrchestratorStateService.newOrchestratorState({
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            campaignId: "test campaign",
                            missionMap,
                            camera: new BattleCamera(0, 0),
                            teams,
                            battlePhaseState,
                        }),
                    }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            })
            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                gameEngineState: gameEngineState,
            })
        }

        it("knows after selecting the player the hud has not selected actions", () => {
            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({})
            let playerCommandState =
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState
            expect(playerCommandState.playerSelectedSquaddieAction).toBeFalsy()
            expect(playerCommandState.playerSelectedEndTurn).toBeFalsy()
            expect(playerCommandState.selectedActionTemplate).toBeUndefined()
        })

        it("reports when an action button is clicked", () => {
            MissionMapService.addSquaddie(
                missionMap,
                playerBattleSquaddie.squaddieTemplateId,
                playerBattleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )

            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({
                teams: [
                    BattleSquaddieTeamService.new({
                        id: "player team",
                        name: "player team",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [
                            playerBattleSquaddie.battleSquaddieId,
                        ],
                    }),
                ],
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.PLAYER,
                },
            })

            let playerCommandState =
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.playerCommandState

            const longswordButton = playerCommandState.actionButtons.find(
                (button) => button.actionTemplate.id === longswordAction.id
            )
            selector.mouseClicked({
                mouseX: longswordButton.buttonArea.left,
                mouseY: longswordButton.buttonArea.top,
                gameEngineState: gameEngineState,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(playerCommandState.playerSelectedSquaddieAction).toBeTruthy()
            expect(playerCommandState.playerSelectedEndTurn).toBeFalsy()
            expect(playerCommandState.selectedActionTemplate).toBe(
                longswordAction
            )
        })
    })

    describe("Player selects squaddie they cannot control because it is an enemy", () => {
        let gameEngineState: GameEngineState
        beforeEach(() => {
            gameEngineState = GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState:
                    BattleOrchestratorStateService.newOrchestratorState({
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            campaignId: "test campaign",
                            missionMap,
                            camera: new BattleCamera(0, 0),
                        }),
                    }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            })

            hud.selectSquaddieAndDrawWindow({
                battleId: enemySquaddieDynamic.battleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                gameEngineState: gameEngineState,
            })
        })

        it("will not show the player command window for uncontrollable enemy squaddies", () => {
            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.showPlayerCommand
            ).toBeFalsy()
            hud.draw(gameEngineState, mockedP5GraphicsContext)
        })
    })

    describe("Next Squaddie button", () => {
        const getGameEngineState = (
            battleCamera: BattleCamera,
            actionsThisRound?: ActionsThisRound
        ) => {
            return GameEngineStateService.new({
                resourceHandler: resourceHandler,
                battleOrchestratorState:
                    BattleOrchestratorStateService.newOrchestratorState({
                        battleState: BattleStateService.newBattleState({
                            missionId: "test mission",
                            campaignId: "test campaign",
                            missionMap,
                            camera: battleCamera,
                            actionsThisRound,
                        }),
                    }),
                campaign: CampaignService.default({}),
                repository: squaddieRepository,
            })
        }

        it("should respond to keyboard presses for the next squaddie, even if the HUD is not open", () => {
            const battleCamera = new BattleCamera(0, 0)
            hud = new BattleSquaddieSelectedHUD()
            const selectSpy = jest.spyOn(
                hud as any,
                "selectSquaddieAndDrawWindow"
            )

            missionMap.addSquaddie(
                playerSquaddieStatic.squaddieId.templateId,
                playerBattleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )
            missionMap.addSquaddie(
                player2SquaddieStatic.squaddieId.templateId,
                player2SquaddieDynamic.battleSquaddieId,
                {
                    q: 0,
                    r: 1,
                }
            )
            const gameEngineState = getGameEngineState(battleCamera)

            expect(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState
            ).toBeUndefined()
            hud.keyPressed(
                config.KEYBOARD_SHORTCUTS[KeyButtonName.NEXT_SQUADDIE][0],
                gameEngineState
            )
            expect(selectSpy).toHaveBeenCalled()
            expect([playerBattleSquaddieId, player2BattleSquaddieId]).toContain(
                gameEngineState.battleOrchestratorState.battleHUDState
                    .summaryHUDState.currentlyDisplayedBattleSquaddieId
            )
            expect(battleCamera.isPanning()).toBeTruthy()
        })
    })
})
