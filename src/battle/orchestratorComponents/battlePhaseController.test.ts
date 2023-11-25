import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {AdvanceToNextPhase, BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie, BattleSquaddieHelper} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurnHandler} from "../../squaddie/turn";
import {BANNER_ANIMATION_TIME, BattlePhaseController, BattlePhaseState} from "./battlePhaseController";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleCamera} from "../battleCamera";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {DefaultArmyAttributes} from "../../squaddie/armyAttributes";
import {BattleStateHelper} from "../orchestrator/battleState";

describe('BattlePhaseController', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let battlePhaseController: BattlePhaseController;
    let playerSquaddieTeam: BattleSquaddieTeam;
    let enemySquaddieTeam: BattleSquaddieTeam;
    let resourceHandler: ResourceHandler;
    let diffTime: number;
    let state: BattleOrchestratorState;
    let mockedP5GraphicsContext: MockedP5GraphicsContext;
    let teamsByAffiliation: { [affiliation in SquaddieAffiliation]?: BattleSquaddieTeam };
    let playerSquaddieTemplate: SquaddieTemplate;
    let playerBattleSquaddie: BattleSquaddie;

    beforeEach(() => {
        mockedP5GraphicsContext = new MockedP5GraphicsContext();
        squaddieRepo = new BattleSquaddieRepository();

        playerSquaddieTemplate = {
            squaddieId: {
                templateId: "player_squaddie",
                name: "Player",
                resources: {
                    mapIconResourceKey: "",
                    actionSpritesByEmotion: {},
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            actions: [],
            attributes: DefaultArmyAttributes(),
        };
        playerBattleSquaddie = BattleSquaddieHelper.newBattleSquaddie({
            battleSquaddieId: "player_squaddie_0",
            squaddieTemplateId: "player_squaddie",
            squaddieTurn: SquaddieTurnHandler.new(),
        });

        squaddieRepo.addSquaddieTemplate(
            playerSquaddieTemplate,
        );
        squaddieRepo.addBattleSquaddie(
            playerBattleSquaddie,
        );

        squaddieRepo.addSquaddieTemplate(
            {
                squaddieId: {
                    templateId: "enemy_squaddie",
                    name: "Enemy",
                    resources: {
                        mapIconResourceKey: "",
                        actionSpritesByEmotion: {},
                    },
                    traits: TraitStatusStorageHelper.newUsingTraitValues(),
                    affiliation: SquaddieAffiliation.ENEMY,
                },
                actions: [],
                attributes: DefaultArmyAttributes(),
            }
        );
        squaddieRepo.addBattleSquaddie(
            BattleSquaddieHelper.newBattleSquaddie({
                battleSquaddieId: "enemy_squaddie_0",
                squaddieTemplateId: "enemy_squaddie",
                squaddieTurn: SquaddieTurnHandler.new(),
            })
        );

        playerSquaddieTeam = {
            name: "Player Team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: ["player_squaddie_0"]
        };
        enemySquaddieTeam = {
            name: "Enemy Team",
            affiliation: SquaddieAffiliation.ENEMY,
            battleSquaddieIds: ["enemy_squaddie_0"]
        };

        teamsByAffiliation = {
            [SquaddieAffiliation.PLAYER]: playerSquaddieTeam,
            [SquaddieAffiliation.ENEMY]: enemySquaddieTeam,
        };

        diffTime = 100;

        resourceHandler = new (<new (options: any) => ResourceHandler>ResourceHandler)({}) as jest.Mocked<ResourceHandler>;
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult("Hi"));

        state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepo,
            resourceHandler,
            battleSquaddieSelectedHUD: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                battlePhaseState: {
                    currentAffiliation: BattlePhase.UNKNOWN,
                    turnCount: 0,
                },
                teamsByAffiliation,
                missionMap: new MissionMap({
                    terrainTileMap: new TerrainTileMap({
                        movementCost: ["1 "]
                    })
                })
            }),
        });

        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();
    });

    it('does nothing and finishes immediately if team has not finished their turn', () => {
        state.battleState.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };
        AdvanceToNextPhase(state.battleState.battlePhaseState, teamsByAffiliation);
        expect(state.battleState.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(state.battleState.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    });

    it('starts showing the player phase banner by default', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            resourceHandler,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: squaddieRepo,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                teamsByAffiliation,
                missionMap: new MissionMap({
                    terrainTileMap: new TerrainTileMap({
                        movementCost: ["1 1 1 "],
                    })
                })
            }),
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        state.battleState.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(state.battleState.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(state.battleState.battlePhaseState.turnCount).toBe(1);
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(startTime);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(state.battleState.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    });

    it('stops the camera when it displays the banner if it is not the player phase', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: squaddieRepo,
            resourceHandler,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                teamsByAffiliation,
                missionMap: new MissionMap({
                    terrainTileMap: new TerrainTileMap({
                        movementCost: ["1 1 1 "],
                    })
                }),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();

        expect(state.battleState.camera.getVelocity()).toStrictEqual([0, 0]);
    });

    describe('Pan camera at the start of Player Phase', () => {
        let missionMap: MissionMap;

        beforeEach(() => {
            missionMap = new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "]
                })
            });
        });

        const initializeState = ({
                                     squaddieTemplateIdToAdd,
                                     battleSquaddieIdToAdd,
                                     camera,
                                 }: {
            squaddieTemplateIdToAdd: string,
            battleSquaddieIdToAdd: string,
            camera: BattleCamera,
        }) => {
            missionMap.addSquaddie(squaddieTemplateIdToAdd, battleSquaddieIdToAdd, {q: 0, r: 0});
            const state: BattleOrchestratorState = new BattleOrchestratorState({
                battleSquaddieSelectedHUD: undefined,
                squaddieRepository: squaddieRepo,
                resourceHandler,
                battleState: BattleStateHelper.newBattleState({
                    missionId: "test mission",
                    teamsByAffiliation,
                    missionMap,
                    camera,
                }),
            });

            state.battleState.battlePhaseState = {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 0,
            };

            battlePhaseController = new BattlePhaseController();
            return state;
        }

        it('pans the camera to the first player when it is the player phase and the player is offscreen', () => {
            const state = initializeState({
                squaddieTemplateIdToAdd: playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieIdToAdd: playerBattleSquaddie.battleSquaddieId,
                camera: new BattleCamera(
                    ScreenDimensions.SCREEN_WIDTH * 10,
                    ScreenDimensions.SCREEN_HEIGHT * 10,
                ),
            });

            battlePhaseController.update(state, mockedP5GraphicsContext);
            expect(state.battleState.camera.isPanning()).toBeTruthy();

            const datum = state.battleState.missionMap.getSquaddieByBattleId(playerSquaddieTeam.battleSquaddieIds[0])
            const playerSquaddieLocation = convertMapCoordinatesToWorldCoordinates(datum.mapLocation.q, datum.mapLocation.r);
            expect(state.battleState.camera.panningInformation.xDestination).toBe(playerSquaddieLocation[0]);
            expect(state.battleState.camera.panningInformation.yDestination).toBe(playerSquaddieLocation[1]);
        });

        it('does not pan the camera to the first player when it is the player phase and the player is onscreen', () => {
            const state = initializeState({
                squaddieTemplateIdToAdd: playerSquaddieTemplate.squaddieId.templateId,
                battleSquaddieIdToAdd: playerBattleSquaddie.battleSquaddieId,
                camera: new BattleCamera(
                    ...convertMapCoordinatesToWorldCoordinates(0, 0)
                ),
            });

            const datum = state.battleState.missionMap.getSquaddieByBattleId(playerSquaddieTeam.battleSquaddieIds[0])
            const playerSquaddieLocation = convertMapCoordinatesToWorldCoordinates(datum.mapLocation.q, datum.mapLocation.r);
            state.battleState.camera.xCoord = playerSquaddieLocation[0];
            state.battleState.camera.yCoord = playerSquaddieLocation[1];

            battlePhaseController = new BattlePhaseController();
            const startTime = 0;
            jest.spyOn(Date, 'now').mockImplementation(() => startTime);

            battlePhaseController.update(state, mockedP5GraphicsContext);
            expect(state.battleState.camera.isPanning()).toBeFalsy();
        });
    });

    it('starts the animation and completes if team has finished their turns', () => {
        state.battleState.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        AdvanceToNextPhase(state.battleState.battlePhaseState, teamsByAffiliation);
        expect(state.battleState.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);

        const {battleSquaddie: battleSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByBattleId("player_squaddie_0"));
        BattleSquaddieHelper.endTurn(battleSquaddie0);

        const startTime = 100;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(state.battleState.battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(state.battleState.battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY);
    });

    it('only draws the banner while the timer is going', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battleSquaddieSelectedHUD: undefined,
            resourceHandler,
            squaddieRepository: squaddieRepo,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                teamsByAffiliation,
                missionMap: new MissionMap({
                    terrainTileMap: new TerrainTileMap({
                        movementCost: ["1 1 1 "],
                    })
                }),
                battlePhaseState: {
                    turnCount: 0,
                    currentAffiliation: BattlePhase.UNKNOWN,
                },
            }),
        });
        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();

        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(startTime);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME * 0.5);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.draw).toBeCalledTimes(1);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME * 0.75);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.draw).toBeCalledTimes(2);
    });

    it('resets internal variables once completed', () => {
        battlePhaseController = new BattlePhaseController();
        battlePhaseController.affiliationImageUI = mocks.mockImageUI();

        expect(battlePhaseController.affiliationImageUI).toBeTruthy();
        battlePhaseController.reset(new BattleOrchestratorState({
            resourceHandler: undefined,
            battleSquaddieSelectedHUD: undefined,
            squaddieRepository: undefined,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
            }),
        }));
        expect(battlePhaseController.affiliationImageUI).toBeFalsy();
    });

    it('restores team squaddie turns once the banner appears starts', () => {
        const {battleSquaddie: battleSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByBattleId("player_squaddie_0"));
        BattleSquaddieHelper.endTurn(battleSquaddie0);
        expect(BattleSquaddieHelper.canStillActThisRound(battleSquaddie0)).toBeFalsy();

        const phase: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            battleSquaddieSelectedHUD: undefined,
            resourceHandler,
            squaddieRepository: squaddieRepo,
            battleState: BattleStateHelper.newBattleState({
                missionId: "test mission",
                battlePhaseState: phase,
                teamsByAffiliation,
                missionMap: new MissionMap({
                    terrainTileMap: new TerrainTileMap({
                        movementCost: ["1 "]
                    })
                })
            }),
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;

        jest.spyOn(Date, 'now').mockImplementation(() => startTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);

        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(phase.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(BattleSquaddieHelper.canStillActThisRound(battleSquaddie0)).toBeTruthy();
    });
});
