import {BattleSquaddieSelector} from "./battleSquaddieSelector";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattlePhase, BattlePhaseTracker} from "./battlePhaseTracker";
import {BattleSquaddieTeam} from "../battleSquaddieTeam";
import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieId} from "../../squaddie/id";
import {SquaddieTurn} from "../../squaddie/turn";
import {OrchestratorChanges, OrchestratorComponentMouseEventType} from "../orchestrator/orchestratorComponent";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {BattleOrchestratorMode} from "../orchestrator/orchestrator";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import {MissionMap} from "../../missionMap/missionMap";
import {BattleCamera} from "../battleCamera";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {convertMapCoordinatesToScreenCoordinates} from "../../hexMap/convertCoordinates";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SquaddieEndTurnActivity} from "../history/squaddieEndTurnActivity";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import p5 from "p5";

jest.mock('p5', () => () => {
    return {}
});

describe('BattleSquaddieSelector', () => {
    let selector: BattleSquaddieSelector = new BattleSquaddieSelector();
    let squaddieRepo: BattleSquaddieRepository = new BattleSquaddieRepository();
    let mockedP5: p5;

    beforeEach(() => {
        selector = new BattleSquaddieSelector();
        squaddieRepo = new BattleSquaddieRepository();
        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
    });

    const makeBattlePhaseTrackerWithEnemyTeam = () => {
        const enemyTeam: BattleSquaddieTeam = new BattleSquaddieTeam(
            {
                name: "enemies cannot be controlled by the player",
                affiliation: SquaddieAffiliation.ENEMY,
                squaddieRepo: squaddieRepo,
            }
        );

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    id: "enemy_demon",
                    name: "Slither Demon",
                    affiliation: SquaddieAffiliation.ENEMY,
                }),
            })
        );

        squaddieRepo.addDynamicSquaddie(
            "enemy_demon_0",
            new BattleSquaddieDynamic({
                staticSquaddieId: "enemy_demon",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        squaddieRepo.addDynamicSquaddie(
            "enemy_demon_1",
            new BattleSquaddieDynamic({
                staticSquaddieId: "enemy_demon",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );

        enemyTeam.addDynamicSquaddieIds(["enemy_demon_0", "enemy_demon_1"]);

        const battlePhaseTracker: BattlePhaseTracker = new BattlePhaseTracker(BattlePhase.ENEMY);
        battlePhaseTracker.addTeam(enemyTeam);
        return battlePhaseTracker;
    }

    const makeBattlePhaseTrackerWithPlayerTeam = () => {
        const battlePhaseTracker: BattlePhaseTracker = new BattlePhaseTracker(BattlePhase.PLAYER);

        const playerTeam: BattleSquaddieTeam = new BattleSquaddieTeam(
            {
                name: "player controlled team",
                affiliation: SquaddieAffiliation.PLAYER,
                squaddieRepo: squaddieRepo,
            }
        );
        battlePhaseTracker.addTeam(playerTeam);

        squaddieRepo.addStaticSquaddie(
            new BattleSquaddieStatic({
                squaddieId: new SquaddieId({
                    id: "player_soldier",
                    name: "Player Soldier",
                    affiliation: SquaddieAffiliation.PLAYER,
                }),
            })
        );

        squaddieRepo.addDynamicSquaddie(
            "player_soldier_0",
            new BattleSquaddieDynamic({
                staticSquaddieId: "player_soldier",
                mapLocation: {q: 0, r: 0},
                squaddieTurn: new SquaddieTurn()
            })
        );
        playerTeam.addDynamicSquaddieIds(["player_soldier_0"]);
        return battlePhaseTracker;
    }

    const makeSquaddieMoveActivity = (staticSquaddieId: string, dynamicSquaddieId: string) => {
        const moveActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId,
            dynamicSquaddieId,
            startingLocation: {q: 0, r: 0},
        });
        moveActivity.addMovement(new SquaddieMovementActivity({
            destination: {q: 1, r: 1},
            numberOfActionsSpent: 1,
        }));
        return moveActivity;
    }

    it('ignores mouse input when the player cannot control the squaddies', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();
        const mockHexMap = new (
            <new (options: any) => TerrainTileMap>TerrainTileMap
        )({
            movementCost: ["1 1 "]
        }) as jest.Mocked<TerrainTileMap>;
        mockHexMap.mouseClicked = jest.fn();

        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            hexMap: mockHexMap,
        })

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX: 0,
            mouseY: 0,
        });

        expect(mockHexMap.mouseClicked).not.toBeCalled();
    });

    it('recommends squaddie map activity if the player cannot control the squaddies', () => {
        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();

        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            squaddieRepo,
        });

        selector.update(state, mockedP5);

        expect(selector.hasCompleted(state)).toBeTruthy();
        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);
    });

    it('can make a movement activity by clicking on the field', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            })
        });

        const battlePhaseTracker: BattlePhaseTracker = makeBattlePhaseTrackerWithPlayerTeam();

        const camera: BattleCamera = new BattleCamera();

        const battleSquaddieUIInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            squaddieRepository: squaddieRepo,
            selectionState: BattleSquaddieUISelectionState.SELECTED_SQUADDIE,
            missionMap,
            selectedSquaddieDynamicID: "player_soldier_0",
            tileClickedOn: {q: 0, r: 0},
        })

        const state: OrchestratorState = new OrchestratorState({
            missionMap,
            squaddieRepo,
            camera,
            battleSquaddieUIInput,
            hexMap: missionMap.terrainTileMap,
            battlePhaseTracker,
            pathfinder: new Pathfinder(),
        });

        const [mouseX, mouseY] = convertMapCoordinatesToScreenCoordinates(0, 1, ...camera.getCoordinates());

        selector.mouseEventHappened(state, {
            eventType: OrchestratorComponentMouseEventType.CLICKED,
            mouseX,
            mouseY
        });

        expect(selector.hasCompleted(state)).toBeTruthy();
        expect(state.squaddieCurrentlyActing.instruction.totalActionsSpent()).toBe(1);
        expect(state.squaddieCurrentlyActing.instruction.destinationLocation()).toStrictEqual({q: 0, r: 1});

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MOVER);
    });

    it('instructs the squaddie to end turn when the player cannot control the team squaddies', () => {
        const battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();
        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            hexMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            }),
            squaddieRepo,
        });

        selector.update(state, mockedP5);
        expect(selector.hasCompleted(state)).toBeTruthy();

        const endTurnActivity: SquaddieInstruction = state.squaddieCurrentlyActing.instruction;
        const mostRecentActivity = endTurnActivity.getActivities().reverse()[0];
        expect(mostRecentActivity).toBeInstanceOf(SquaddieEndTurnActivity);

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.SQUADDIE_MAP_ACTIVITY);
    });

    it('will change phase if no squaddies are able to act', () => {
        const battlePhaseTracker = makeBattlePhaseTrackerWithEnemyTeam();

        while (battlePhaseTracker.getCurrentTeam().hasAnActingSquaddie()) {
            let dynamicId = battlePhaseTracker.getCurrentTeam().getDynamicSquaddieIdThatCanActButNotPlayerControlled();
            const {
                dynamicSquaddie
            } = getResultOrThrowError(squaddieRepo.getSquaddieByDynamicID(dynamicId));

            dynamicSquaddie.endTurn();
        }

        const state: OrchestratorState = new OrchestratorState({
            battlePhaseTracker,
            hexMap: new TerrainTileMap({
                movementCost: ["1 1 "]
            }),
            squaddieRepo,
        });

        selector.update(state, mockedP5);
        expect(selector.hasCompleted(state)).toBeTruthy();

        const recommendation: OrchestratorChanges = selector.recommendStateChanges(state);
        expect(recommendation.nextMode).toBe(BattleOrchestratorMode.PHASE_CONTROLLER);
    });
});
