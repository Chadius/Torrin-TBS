import {BattleOrchestratorState} from "../orchestrator/battleOrchestratorState";
import {AdvanceToNextPhase, BattlePhase} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {BattleSquaddie} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurn} from "../../squaddie/turn";
import {BANNER_ANIMATION_TIME, BattlePhaseController, BattlePhaseState} from "./battlePhaseController";
import {getResultOrThrowError, makeResult} from "../../utils/ResultOrError";
import {ResourceHandler} from "../../resource/resourceHandler";
import {BattleCamera} from "../battleCamera";
import * as mocks from "../../utils/test/mocks";
import {MockedP5GraphicsContext} from "../../utils/test/mocks";
import {TraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieResource} from "../../squaddie/resource";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {convertMapCoordinatesToWorldCoordinates} from "../../hexMap/convertCoordinates";
import {ScreenDimensions} from "../../utils/graphics/graphicsConfig";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";

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

        playerSquaddieTemplate = new SquaddieTemplate({
            squaddieId: new SquaddieId({
                templateId: "player_squaddie",
                name: "Player",
                resources: new SquaddieResource({}),
                traits: new TraitStatusStorage({}),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            actions: [],
        });
        playerBattleSquaddie = new BattleSquaddie({
            battleSquaddieId: "player_squaddie_0",
            squaddieTemplateId: "player_squaddie",
            squaddieTurn: new SquaddieTurn({}),
            mapIcon: mocks.mockImageUI(),
        });

        squaddieRepo.addSquaddieTemplate(
            playerSquaddieTemplate,
        );
        squaddieRepo.addBattleSquaddie(
            playerBattleSquaddie,
        );

        squaddieRepo.addSquaddieTemplate(
            new SquaddieTemplate({
                squaddieId: new SquaddieId({
                    templateId: "enemy_squaddie",
                    name: "Enemy",
                    resources: new SquaddieResource({}),
                    traits: new TraitStatusStorage({}),
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
                actions: [],
            })
        );
        squaddieRepo.addBattleSquaddie(
            new BattleSquaddie({
                battleSquaddieId: "enemy_squaddie_0",
                squaddieTemplateId: "enemy_squaddie",
                squaddieTurn: new SquaddieTurn({}),
                mapIcon: mocks.mockImageUI(),
            })
        );

        playerSquaddieTeam = new BattleSquaddieTeam({
            name: "Player Team",
            affiliation: SquaddieAffiliation.PLAYER,
            squaddieRepo,
            battleSquaddieIds: ["player_squaddie_0"]
        });
        enemySquaddieTeam = new BattleSquaddieTeam({
            name: "Enemy Team",
            affiliation: SquaddieAffiliation.ENEMY,
            squaddieRepo,
            battleSquaddieIds: ["enemy_squaddie_0"]
        });

        teamsByAffiliation = {
            [SquaddieAffiliation.PLAYER]: playerSquaddieTeam,
            [SquaddieAffiliation.ENEMY]: enemySquaddieTeam,
        };

        diffTime = 100;

        resourceHandler = new (<new (options: any) => ResourceHandler>ResourceHandler)({}) as jest.Mocked<ResourceHandler>;
        resourceHandler.getResource = jest.fn().mockReturnValue(makeResult("Hi"));

        state = new BattleOrchestratorState({
            squaddieRepository: squaddieRepo,
            battlePhaseState: {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 0,
            },
            resourceHandler,
            teamsByAffiliation,
        });

        battlePhaseController = new BattlePhaseController();
        battlePhaseController.draw = jest.fn();
    });

    it('does nothing and finishes immediately if team has not finished their turn', () => {
        state.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };
        AdvanceToNextPhase(state.battlePhaseState, teamsByAffiliation);
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(battlePhaseController.draw).not.toBeCalled();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    });

    it('starts showing the player phase banner by default', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepo,
            resourceHandler,
            teamsByAffiliation,
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "],
                })
            })
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        state.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(state.battlePhaseState.turnCount).toBe(1);
        expect(battlePhaseController.bannerDisplayAnimationStartTime).toBe(startTime);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);
    });

    it('stops the camera when it displays the banner if it is not the player phase', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepo,
            resourceHandler,
            teamsByAffiliation,
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "],
                })
            })
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);

        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();

        expect(state.camera.getVelocity()).toStrictEqual([0, 0]);
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
            missionMap.addSquaddie(squaddieTemplateIdToAdd, battleSquaddieIdToAdd, new HexCoordinate({q: 0, r: 0}));
            const state: BattleOrchestratorState = new BattleOrchestratorState({
                squaddieRepository: squaddieRepo,
                resourceHandler,
                teamsByAffiliation,
                missionMap,
                camera,
            });

            state.battlePhaseState = {
                currentAffiliation: BattlePhase.UNKNOWN,
                turnCount: 0,
            };

            battlePhaseController = new BattlePhaseController();
            return state;
        }

        it('pans the camera to the first player when it is the player phase and the player is offscreen', () => {
            const state = initializeState({
                squaddieTemplateIdToAdd: playerSquaddieTemplate.templateId,
                battleSquaddieIdToAdd: playerBattleSquaddie.battleSquaddieId,
                camera: new BattleCamera(
                    ScreenDimensions.SCREEN_WIDTH * 10,
                    ScreenDimensions.SCREEN_HEIGHT * 10,
                ),
            });

            battlePhaseController.update(state, mockedP5GraphicsContext);
            expect(state.camera.isPanning()).toBeTruthy();

            const datum = state.missionMap.getSquaddieByBattleId(playerSquaddieTeam.battleSquaddieIds[0])
            const playerSquaddieLocation = convertMapCoordinatesToWorldCoordinates(datum.mapLocation.q, datum.mapLocation.r);
            expect(state.camera.panningInformation.xDestination).toBe(playerSquaddieLocation[0]);
            expect(state.camera.panningInformation.yDestination).toBe(playerSquaddieLocation[1]);
        });

        it('does not pan the camera to the first player when it is the player phase and the player is onscreen', () => {
            const state = initializeState({
                squaddieTemplateIdToAdd: playerSquaddieTemplate.templateId,
                battleSquaddieIdToAdd: playerBattleSquaddie.battleSquaddieId,
                camera: new BattleCamera(
                    ...convertMapCoordinatesToWorldCoordinates(0, 0)
                ),
            });

            const datum = state.missionMap.getSquaddieByBattleId(playerSquaddieTeam.battleSquaddieIds[0])
            const playerSquaddieLocation = convertMapCoordinatesToWorldCoordinates(datum.mapLocation.q, datum.mapLocation.r);
            state.camera.xCoord = playerSquaddieLocation[0];
            state.camera.yCoord = playerSquaddieLocation[1];

            battlePhaseController = new BattlePhaseController();
            const startTime = 0;
            jest.spyOn(Date, 'now').mockImplementation(() => startTime);

            battlePhaseController.update(state, mockedP5GraphicsContext);
            expect(state.camera.isPanning()).toBeFalsy();
        });
    });

    it('starts the animation and completes if team has finished their turns', () => {
        state.battlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        AdvanceToNextPhase(state.battlePhaseState, teamsByAffiliation);
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.PLAYER);

        const {battleSquaddie: battleSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByBattleId("player_squaddie_0"));
        battleSquaddie0.endTurn();

        const startTime = 100;
        jest.spyOn(Date, 'now').mockImplementation(() => startTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY);

        jest.spyOn(Date, 'now').mockImplementation(() => startTime + BANNER_ANIMATION_TIME + diffTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);
        expect(battlePhaseController.hasCompleted(state)).toBeTruthy();
        expect(state.battlePhaseState.currentAffiliation).toBe(BattlePhase.ENEMY);
    });

    it('only draws the banner while the timer is going', () => {
        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepo,
            resourceHandler,
            teamsByAffiliation,
            missionMap: new MissionMap({
                terrainTileMap: new TerrainTileMap({
                    movementCost: ["1 1 1 "],
                })
            })
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
        battlePhaseController.reset(new BattleOrchestratorState({}));
        expect(battlePhaseController.affiliationImageUI).toBeFalsy();
    });

    it('restores team squaddie turns once the banner appears starts', () => {
        const {battleSquaddie: battleSquaddie0} = getResultOrThrowError(squaddieRepo.getSquaddieByBattleId("player_squaddie_0"));
        battleSquaddie0.endTurn();
        expect(battleSquaddie0.canStillActThisRound()).toBeFalsy();

        const phase: BattlePhaseState = {
            currentAffiliation: BattlePhase.UNKNOWN,
            turnCount: 0,
        };

        const state: BattleOrchestratorState = new BattleOrchestratorState({
            squaddieRepository: squaddieRepo,
            resourceHandler,
            battlePhaseState: phase,
            teamsByAffiliation,
        });
        battlePhaseController = new BattlePhaseController();
        const startTime = 0;

        jest.spyOn(Date, 'now').mockImplementation(() => startTime);
        battlePhaseController.update(state, mockedP5GraphicsContext);

        expect(battlePhaseController.hasCompleted(state)).toBeFalsy();
        expect(phase.currentAffiliation).toBe(BattlePhase.PLAYER);
        expect(battleSquaddie0.canStillActThisRound()).toBeTruthy();
    });
});
