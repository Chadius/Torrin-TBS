import {BattleSquaddieRepository} from "../battleSquaddieRepository";
import {SquaddieId} from "../../squaddie/id";
import {NullSquaddieResource} from "../../squaddie/resource";
import {NullTraitStatusStorage} from "../../trait/traitStatusStorage";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {NullSquaddieMovement} from "../../squaddie/movement";
import {BattleSquaddieDynamic, BattleSquaddieStatic} from "../battleSquaddie";
import {SquaddieTurn} from "../../squaddie/turn";
import {OrchestratorState} from "../orchestrator/orchestratorState";
import {BattleSquaddieMover} from "./battleSquaddieMover";
import {BattleSquaddieUIInput, BattleSquaddieUISelectionState} from "../battleSquaddieUIInput";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {Pathfinder} from "../../hexMap/pathfinder/pathfinder";
import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {SearchParams} from "../../hexMap/pathfinder/searchParams";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {TIME_TO_MOVE} from "../animation/squaddieMoveAnimationUtils";
import {SquaddieInstruction} from "../history/squaddieInstruction";
import {SquaddieMovementActivity} from "../history/squaddieMovementActivity";
import p5 from "p5";

jest.mock('p5', () => () => {
    return {}
});

describe('BattleSquaddieMover', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let player1Static: BattleSquaddieStatic;
    let player1Dynamic: BattleSquaddieDynamic;
    let map: MissionMap;
    let mockedP5: p5;

    beforeEach(() => {
        squaddieRepo = new BattleSquaddieRepository();
        player1Static = {
            squaddieId: new SquaddieId({
                id: "player_1",
                name: "Player1",
                resources: NullSquaddieResource(),
                traits: NullTraitStatusStorage(),
                affiliation: SquaddieAffiliation.PLAYER,
            }),
            movement: NullSquaddieMovement(),
            activities: [],
        };
        player1Dynamic = new BattleSquaddieDynamic({
            staticSquaddieId: "player_1",
            mapLocation: {q: 0, r: 0},
            squaddieTurn: new SquaddieTurn()
        });

        squaddieRepo.addStaticSquaddie(
            player1Static
        );

        squaddieRepo.addDynamicSquaddie(
            "player_1",
            player1Dynamic
        );

        map = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 ",
                    " 1 1 "
                ]
            })
        });
        mockedP5 = new (<new (options: any) => p5>p5)({}) as jest.Mocked<p5>;
    });
    it('is complete once enough time passes and the squaddie finishes moving', () => {
        const uiInput: BattleSquaddieUIInput = new BattleSquaddieUIInput({
            selectionState: BattleSquaddieUISelectionState.MOVING_SQUADDIE,
            missionMap: map,
            squaddieRepository: squaddieRepo,
            selectedSquaddieDynamicID: "player_1",
            tileClickedOn: {q: 1, r: 1},
            finishedAnimating: false,
        });
        const pathfinder: Pathfinder = new Pathfinder();
        const movePath: SearchPath = getResultOrThrowError(
            getResultOrThrowError(pathfinder.findPathToStopLocation(new SearchParams({
                    startLocation: {q: 0, r: 0},
                    stopLocation: {q: 1, r: 1},
                    squaddieAffiliation: SquaddieAffiliation.PLAYER,
                    canStopOnSquaddies: true,
                    missionMap: map,
                }))
            ).getRouteToStopLocation());

        const moveActivity: SquaddieInstruction = new SquaddieInstruction({
            staticSquaddieId: "player_static_0",
            dynamicSquaddieId: "player_dynamic_0",
            startingLocation: {q: 0, r: 0},
        });
        moveActivity.addMovement(new SquaddieMovementActivity({
            destination: {q: 1, r: 1},
            numberOfActionsSpent: 1,
        }));

        const state: OrchestratorState = new OrchestratorState({
            squaddieRepo,
            battleSquaddieUIInput: uiInput,
            pathfinder,
            squaddieMovePath: movePath,
            hexMap: map.terrainTileMap,
            squaddieCurrentlyActing: {
                instruction: moveActivity,
            }
        });
        const mover: BattleSquaddieMover = new BattleSquaddieMover();
        expect(mover.hasCompleted(state)).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 0 + TIME_TO_MOVE);
        mover.update(state, mockedP5);
        expect(mover.hasCompleted(state)).toBeTruthy();
        mover.reset(state);
        expect(mover.animationStartTime).toBeUndefined();
    });
});
