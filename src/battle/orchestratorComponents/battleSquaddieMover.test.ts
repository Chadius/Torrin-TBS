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

describe('BattleSquaddieMover', () => {
    let squaddieRepo: BattleSquaddieRepository;
    let player1Static: BattleSquaddieStatic;
    let player1Dynamic: BattleSquaddieDynamic;
    let map: MissionMap;

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
        })
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
        const state: OrchestratorState = new OrchestratorState({
            squaddieRepo,
            battleSquaddieUIInput: uiInput,
            pathfinder,
            squaddieMovePath: movePath,
            animationTimer: 0,
            hexMap: map.terrainTileMap,
        });
        const mover: BattleSquaddieMover = new BattleSquaddieMover();
        expect(mover.hasCompleted(state)).toBeFalsy();

        jest.spyOn(Date, 'now').mockImplementation(() => 0 + TIME_TO_MOVE);
        mover.update(state);
        expect(mover.hasCompleted(state)).toBeTruthy();
    });
});