import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { MissionMap } from "../../missionMap/missionMap"
import { ResourceHandler } from "../../resource/resourceHandler"
import { BattleSquaddieSelectedHUD } from "./battleSquaddieSelectedHUD"
import { BattleSquaddie } from "../battleSquaddie"
import { SquaddieAffiliation } from "../../squaddie/squaddieAffiliation"
import { TerrainTileMap } from "../../hexMap/terrainTileMap"
import { MakeDecisionButton } from "../../squaddie/makeDecisionButton"
import { TargetingShape } from "../targeting/targetingShapeGenerator"
import { RectArea, RectAreaService } from "../../ui/rectArea"
import { getResultOrThrowError, makeResult } from "../../utils/ResultOrError"
import {
    CreateNewSquaddieAndAddToRepository,
    SquaddieAndObjectRepositoryService,
} from "../../utils/test/squaddie"
import { BattleCamera } from "../battleCamera"
import { convertMapCoordinatesToWorldCoordinates } from "../../hexMap/convertCoordinates"
import { BattleOrchestratorStateService } from "../orchestrator/battleOrchestratorState"
import { KeyButtonName } from "../../utils/keyboardConfig"
import { config } from "../../configuration/config"
import * as mocks from "../../utils/test/mocks"
import { MockedP5GraphicsBuffer } from "../../utils/test/mocks"
import { ButtonStatus } from "../../ui/button"
import { SquaddieTemplate } from "../../campaign/squaddieTemplate"
import { MissionMapSquaddieLocationHandler } from "../../missionMap/squaddieLocation"
import { BattlePhase } from "../orchestratorComponents/battlePhaseTracker"
import { TraitStatusStorageService } from "../../trait/traitStatusStorage"
import { BattleStateService } from "../orchestrator/battleState"
import {
    GameEngineState,
    GameEngineStateService,
} from "../../gameEngine/gameEngine"
import { SquaddieTurnService } from "../../squaddie/turn"
import { isValidValue } from "../../utils/validityCheck"
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
import {
    ActionsThisRound,
    ActionsThisRoundService,
} from "../history/actionsThisRound"
import { ProcessedActionService } from "../../action/processed/processedAction"
import { CampaignService } from "../../campaign/campaign"
import { ProcessedActionMovementEffectService } from "../../action/processed/processedActionMovementEffect"
import { DecidedActionMovementEffectService } from "../../action/decided/decidedActionMovementEffect"
import { ActionEffectMovementTemplateService } from "../../action/template/actionEffectMovementTemplate"
import { MouseButton } from "../../utils/mouseConfig"

describe("BattleSquaddieSelectedHUD", () => {
    let hud: BattleSquaddieSelectedHUD
    let squaddieRepository: ObjectRepository
    let missionMap: MissionMap
    let resourceHandler: ResourceHandler
    let playerBattleSquaddieId: string = "player_squaddie_0"
    let playerSquaddieStatic: SquaddieTemplate
    let playerBattleSquaddie: BattleSquaddie
    let enemySquaddieDynamicID: string = "enemy_squaddie_0"
    let enemySquaddieStatic: SquaddieTemplate
    let enemySquaddieDynamic: BattleSquaddie
    let player2SquaddieDynamicId: string = "player_squaddie_2"
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
            battleId: player2SquaddieDynamicId,
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
                state: gameEngineState,
            })
        }

        it("knows after selecting the player the hud has not selected actions", () => {
            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({})
            expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy()
            expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy()
            expect(hud.getSelectedActionTemplate()).toBeUndefined()
        })

        it("reports when an action button is clicked", () => {
            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({})

            const longswordButton = hud
                .getUseActionButtons()
                .find(
                    (button) => button.actionTemplate.id === longswordAction.id
                )
            hud.mouseClicked({
                mouseX: longswordButton.buttonArea.left,
                mouseY: longswordButton.buttonArea.top,
                gameEngineState: gameEngineState,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(hud.didPlayerSelectSquaddieAction()).toBeTruthy()
            expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy()
            expect(hud.getSelectedActionTemplate()).toBe(longswordAction)

            hud.reset()
            expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy()
            expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy()
            expect(hud.getSelectedActionTemplate()).toBeUndefined()
        })

        it("reports when an action button is hovered", () => {
            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({})
            const longswordButton = hud
                .getUseActionButtons()
                .find(
                    (button) => button.actionTemplate.id === longswordAction.id
                )
            hud.mouseMoved(
                longswordButton.buttonArea.left,
                longswordButton.buttonArea.top,
                gameEngineState.battleOrchestratorState
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
                const actionButtons: MakeDecisionButton[] =
                    hud.getUseActionButtons()
                expect(actionButtons).toBeTruthy()

                expect(
                    hud.shouldDrawEndTurnButton(gameEngineState)
                ).toBeTruthy()
            })

            it("reports when the End Turn action button was clicked on", () => {
                hud.mouseClicked({
                    mouseX: RectAreaService.left(
                        hud.endTurnButton.rectangle.area
                    ),
                    mouseY: RectAreaService.top(
                        hud.endTurnButton.rectangle.area
                    ),
                    gameEngineState: gameEngineState,
                    mouseButton: MouseButton.ACCEPT,
                })

                expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy()
                expect(hud.didPlayerSelectEndTurnAction()).toBeTruthy()
                expect(hud.getSelectedActionTemplate()).toBeUndefined()

                hud.reset()
                expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy()
                expect(hud.getSelectedActionTemplate()).toBeUndefined()
                expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy()
            })
        })

        it("can reopen the window in the previous position if no mouse location is given", () => {
            setupStateWithTeamsAndPhaseAndSelectPlayerBattleSquaddie({})

            const initialWindowPosition: RectArea = RectAreaService.new({
                baseRectangle: hud.background.area,
                left: 0,
                top: 0,
            })
            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddieId,
                state: gameEngineState,
            })
            expect(hud.background.area).toStrictEqual(initialWindowPosition)
        })
    })

    describe("Player selects squaddie they cannot control because it is out of actions", () => {
        let gameEngineState: GameEngineState
        let warnUserNotEnoughActionPointsToPerformActionSpy: jest.SpyInstance

        beforeEach(() => {
            let notEnoughActionPointsAction = ActionTemplateService.new({
                name: "not enough actions",
                id: "not enough actions",
                actionPoints: 9001,
            })

            const { squaddieTemplate } = getResultOrThrowError(
                ObjectRepositoryService.getSquaddieByBattleId(
                    squaddieRepository,
                    playerBattleSquaddieId
                )
            )
            squaddieTemplate.actionTemplates.push(notEnoughActionPointsAction)

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
            warnUserNotEnoughActionPointsToPerformActionSpy = jest
                .spyOn(
                    hud as any,
                    "warnUserNotEnoughActionPointsToPerformAction"
                )
                .mockReturnValue(null)
            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                state: gameEngineState,
            })

            const notEnoughActionPointsButton: MakeDecisionButton = hud
                .getUseActionButtons()
                .find(
                    (button) =>
                        button.actionTemplate.id === "not enough actions"
                )

            hud.mouseClicked({
                mouseX: notEnoughActionPointsButton.buttonArea.left,
                mouseY: notEnoughActionPointsButton.buttonArea.top,
                gameEngineState: gameEngineState,
                mouseButton: MouseButton.ACCEPT,
            })
        })
        afterEach(() => {
            warnUserNotEnoughActionPointsToPerformActionSpy.mockRestore()
        })

        it("will warn the user if the squaddie does not have enough actions to perform the action", () => {
            expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy()
            expect(hud.getSelectedActionTemplate()).toBeUndefined()
            expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy()
            expect(warnUserNotEnoughActionPointsToPerformActionSpy).toBeCalled()
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
                state: gameEngineState,
            })
        })

        it("will warn the user they cannot control enemy squaddies", () => {
            const textSpy = jest.spyOn(mockedP5GraphicsContext.mockedP5, "text")
            hud.draw(gameEngineState, mockedP5GraphicsContext)

            expect(textSpy).toBeCalled()
            expect(textSpy).toBeCalledWith(
                expect.stringMatching(
                    `cannot control ${enemySquaddieStatic.squaddieId.name}`
                ),
                expect.anything(),
                expect.anything(),
                expect.anything(),
                expect.anything()
            )
            textSpy.mockRestore()
        })

        it("will not let the player command uncontrollable enemy squaddies", () => {
            hud.draw(gameEngineState, mockedP5GraphicsContext)

            expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy()
            expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy()
            expect(hud.getSelectedActionTemplate()).toBeUndefined()

            hud.mouseClicked({
                mouseX: RectAreaService.left(hud.endTurnButton.rectangle.area),
                mouseY: RectAreaService.top(hud.endTurnButton.rectangle.area),
                gameEngineState: gameEngineState,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(hud.didPlayerSelectSquaddieAction()).toBeFalsy()
            expect(hud.didPlayerSelectEndTurnAction()).toBeFalsy()
            expect(hud.getSelectedActionTemplate()).toBeUndefined()
        })
    })

    describe("Next Squaddie button", () => {
        let gameEngineState: GameEngineState
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

        it("should show the button if there are at least 2 player controllable squaddies on the map", () => {
            gameEngineState = getGameEngineState(new BattleCamera(0, 0))
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
            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                state: gameEngineState,
            })

            expect(hud.shouldDrawNextButton(gameEngineState)).toBeTruthy()
        })
        it("should not show the button if a squaddie is partway through their turn", () => {
            gameEngineState = getGameEngineState(
                new BattleCamera(0, 0),
                ActionsThisRoundService.new({
                    battleSquaddieId: playerBattleSquaddie.battleSquaddieId,
                    startingLocation: { q: 0, r: 0 },
                    processedActions: [
                        ProcessedActionService.new({
                            decidedAction: undefined,
                            processedActionEffects: [
                                ProcessedActionMovementEffectService.new({
                                    decidedActionEffect:
                                        DecidedActionMovementEffectService.new({
                                            destination: { q: 0, r: 1 },
                                            template:
                                                ActionEffectMovementTemplateService.new(
                                                    {}
                                                ),
                                        }),
                                }),
                            ],
                        }),
                    ],
                })
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
            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                state: gameEngineState,
            })

            expect(hud.shouldDrawNextButton(gameEngineState)).toBeFalsy()
        })
        it("should show the button if there is 1 player controllable squaddie and the HUD is focused on an uncontrollable squaddie", () => {
            addOnePlayerOneEnemyToMap()

            gameEngineState = getGameEngineState(new BattleCamera(0, 0))

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: enemySquaddieDynamic.battleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                state: gameEngineState,
            })

            expect(hud.shouldDrawNextButton(gameEngineState)).toBeTruthy()
        })

        const addOnePlayerOneEnemyToMap = () => {
            const onePlayerOneEnemy = ObjectRepositoryService.new()
            ObjectRepositoryService.addSquaddie(
                onePlayerOneEnemy,
                playerSquaddieStatic,
                playerBattleSquaddie
            )
            ObjectRepositoryService.addSquaddie(
                onePlayerOneEnemy,
                enemySquaddieStatic,
                enemySquaddieDynamic
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
                enemySquaddieStatic.squaddieId.templateId,
                enemySquaddieDynamic.battleSquaddieId,
                {
                    q: 0,
                    r: 1,
                }
            )
        }

        it("should show the button if there is 1 player controllable squaddie and the HUD is not focused", () => {
            addOnePlayerOneEnemyToMap()

            gameEngineState = getGameEngineState(new BattleCamera(0, 0))

            hud = new BattleSquaddieSelectedHUD()

            expect(hud.shouldDrawNextButton(gameEngineState)).toBeTruthy()
        })
        it("should not show the button if player controllable squaddies are off the map", () => {
            gameEngineState = getGameEngineState(new BattleCamera(0, 0))
            missionMap.addSquaddie(
                playerSquaddieStatic.squaddieId.templateId,
                playerBattleSquaddie.battleSquaddieId,
                {
                    q: 0,
                    r: 0,
                }
            )
            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                state: gameEngineState,
            })

            expect(hud.shouldDrawNextButton(gameEngineState)).toBeFalsy()
        })
        it("should not show the button if there is fewer than 2 player controllable squaddies", () => {
            addOnePlayerOneEnemyToMap()

            gameEngineState = getGameEngineState(new BattleCamera(0, 0))

            hud = new BattleSquaddieSelectedHUD()

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                state: gameEngineState,
            })

            expect(hud.shouldDrawNextButton(gameEngineState)).toBeFalsy()
        })
        it("clicking on the next button will select a different squaddie", () => {
            const battleCamera = new BattleCamera(0, 0)
            hud = new BattleSquaddieSelectedHUD()
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

            gameEngineState = getGameEngineState(battleCamera)

            hud.selectSquaddieAndDrawWindow({
                battleId: playerBattleSquaddie.battleSquaddieId,
                repositionWindow: { mouseX: 0, mouseY: 0 },
                state: gameEngineState,
            })

            expect(hud.selectedBattleSquaddieId).toBe(
                playerBattleSquaddie.battleSquaddieId
            )
            hud.mouseClicked({
                mouseX: RectAreaService.centerX(
                    hud.nextSquaddieButton.rectangle.area
                ),
                mouseY: RectAreaService.centerY(
                    hud.nextSquaddieButton.rectangle.area
                ),
                gameEngineState: gameEngineState,
                mouseButton: MouseButton.ACCEPT,
            })

            expect(hud.selectedBattleSquaddieId).toBe(
                player2SquaddieDynamic.battleSquaddieId
            )
            const panningInfo = battleCamera.getPanningInformation()
            const player2MapCoordinates = missionMap.getSquaddieByBattleId(
                player2SquaddieDynamicId
            )
            expect(
                MissionMapSquaddieLocationHandler.isValid(player2MapCoordinates)
            ).toBeTruthy()
            const player2WorldCoordinates =
                convertMapCoordinatesToWorldCoordinates(
                    player2MapCoordinates.mapLocation.q,
                    player2MapCoordinates.mapLocation.r
                )

            expect(panningInfo.xDestination).toBe(player2WorldCoordinates[0])
            expect(panningInfo.yDestination).toBe(player2WorldCoordinates[1])
        })
        it("should respond to keyboard presses for the next squaddie, even if the HUD is not open", () => {
            const battleCamera = new BattleCamera(0, 0)
            hud = new BattleSquaddieSelectedHUD()
            const selectSpy = jest.spyOn(
                hud as any,
                "selectSquaddieAndDrawWindow"
            )
            jest.spyOn(hud as any, "generateAffiliateIcon").mockImplementation(
                () => {}
            )
            jest.spyOn(
                hud as any,
                "generateUseActionButtons"
            ).mockImplementation(() => {})
            jest.spyOn(
                hud as any,
                "generateNextSquaddieButton"
            ).mockImplementation(() => {})
            jest.spyOn(hud as any, "generateSquaddieIdText").mockImplementation(
                () => {}
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

            expect(hud.selectedBattleSquaddieId).toBe("")
            hud.keyPressed(
                config.KEYBOARD_SHORTCUTS[KeyButtonName.NEXT_SQUADDIE][0],
                gameEngineState
            )
            expect(selectSpy).toHaveBeenCalled()
            expect(hud.selectedBattleSquaddieId).not.toBe("")
            expect(battleCamera.isPanning()).toBeTruthy()
        })
    })

    describe("End Turn button", () => {
        describe("show the end turn button?", () => {
            let setup: {
                [reason: string]: () => {
                    repository: ObjectRepository
                    battleSquaddieId: string
                    teams: BattleSquaddieTeam[]
                    battlePhase?: BattlePhase
                }
            }

            const tests: {
                reason: string
                expectToShowButton: boolean
                battlePhase?: BattlePhase
            }[] = [
                {
                    reason: "no, squaddie is not player affiliated",
                    expectToShowButton: false,
                },
                {
                    reason: "no, squaddie is out of actions",
                    expectToShowButton: false,
                },
                {
                    reason: "no, it is not the player phase",
                    expectToShowButton: false,
                    battlePhase: BattlePhase.ENEMY,
                },
                {
                    reason: "yes, player squaddie has action points to spend",
                    expectToShowButton: true,
                },
            ]

            beforeEach(() => {
                setup = {}
                setup["no, squaddie is not player affiliated"] = () => {
                    const repository: ObjectRepository =
                        ObjectRepositoryService.new()
                    const battleSquaddieId = "not a player"
                    SquaddieAndObjectRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            battleId: battleSquaddieId,
                            name: battleSquaddieId,
                            templateId: battleSquaddieId,
                            affiliation: SquaddieAffiliation.ENEMY,
                            squaddieRepository: repository,
                        }
                    )

                    const team = BattleSquaddieTeamService.new({
                        id: "enemy team",
                        name: "enemy team",
                        affiliation: SquaddieAffiliation.ENEMY,
                        battleSquaddieIds: [battleSquaddieId],
                    })

                    return {
                        repository,
                        battleSquaddieId,
                        teams: [team],
                    }
                }

                setup["no, squaddie is out of actions"] = () => {
                    const repository: ObjectRepository =
                        ObjectRepositoryService.new()
                    const battleSquaddieId = "out of actions"
                    const { battleSquaddie } =
                        SquaddieAndObjectRepositoryService.createNewSquaddieAndAddToRepository(
                            {
                                battleId: battleSquaddieId,
                                name: battleSquaddieId,
                                templateId: battleSquaddieId,
                                affiliation: SquaddieAffiliation.PLAYER,
                                squaddieRepository: repository,
                            }
                        )
                    SquaddieTurnService.endTurn(battleSquaddie.squaddieTurn)

                    const team = BattleSquaddieTeamService.new({
                        id: "player team",
                        name: "player team",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [battleSquaddieId],
                    })

                    return {
                        repository,
                        battleSquaddieId,
                        teams: [team],
                    }
                }

                setup["no, it is not the player phase"] = () => {
                    const repository: ObjectRepository =
                        ObjectRepositoryService.new()
                    const battleSquaddieId = "not the player phase"
                    SquaddieAndObjectRepositoryService.createNewSquaddieAndAddToRepository(
                        {
                            battleId: battleSquaddieId,
                            name: battleSquaddieId,
                            templateId: battleSquaddieId,
                            affiliation: SquaddieAffiliation.PLAYER,
                            squaddieRepository: repository,
                        }
                    )

                    const team = BattleSquaddieTeamService.new({
                        id: "player team",
                        name: "player team",
                        affiliation: SquaddieAffiliation.PLAYER,
                        battleSquaddieIds: [battleSquaddieId],
                    })

                    return {
                        repository,
                        battleSquaddieId,
                        teams: [team],
                    }
                }

                setup["yes, player squaddie has action points to spend"] =
                    () => {
                        const repository: ObjectRepository =
                            ObjectRepositoryService.new()
                        const battleSquaddieId = "player can act"
                        SquaddieAndObjectRepositoryService.createNewSquaddieAndAddToRepository(
                            {
                                battleId: battleSquaddieId,
                                name: battleSquaddieId,
                                templateId: battleSquaddieId,
                                affiliation: SquaddieAffiliation.PLAYER,
                                squaddieRepository: repository,
                            }
                        )

                        const team = BattleSquaddieTeamService.new({
                            id: "player team",
                            name: "player team",
                            affiliation: SquaddieAffiliation.PLAYER,
                            battleSquaddieIds: [battleSquaddieId],
                        })

                        return {
                            repository,
                            battleSquaddieId,
                            teams: [team],
                        }
                    }
            })

            it.each(tests)(
                ` ($reason)`,
                ({ reason, expectToShowButton, battlePhase }) => {
                    const setupFunction = setup[reason]
                    if (!isValidValue(battlePhase)) {
                        battlePhase = BattlePhase.PLAYER
                    }
                    const { repository, battleSquaddieId, teams } =
                        setupFunction()

                    const state: GameEngineState = GameEngineStateService.new({
                        resourceHandler: resourceHandler,
                        battleOrchestratorState:
                            BattleOrchestratorStateService.newOrchestratorState(
                                {
                                    battleState:
                                        BattleStateService.newBattleState({
                                            missionId: "test mission",
                                            campaignId: "test campaign",
                                            missionMap,
                                            camera: new BattleCamera(0, 0),
                                            battlePhaseState: {
                                                currentAffiliation: battlePhase,
                                                turnCount: 0,
                                            },
                                            teams,
                                        }),
                                }
                            ),
                        campaign: CampaignService.default({}),
                        repository,
                    })

                    hud = new BattleSquaddieSelectedHUD()

                    hud.selectSquaddieAndDrawWindow({
                        battleId: battleSquaddieId,
                        repositionWindow: { mouseX: 0, mouseY: 0 },
                        state,
                    })

                    expect(hud.shouldDrawEndTurnButton(state)).toEqual(
                        expectToShowButton
                    )
                }
            )
        })
    })
})
