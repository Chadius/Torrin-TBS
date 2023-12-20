import {MissionMap, MissionMapHelper} from "../../../missionMap/missionMap";
import {TerrainTileMapHelper} from "../../terrainTileMap";
import {SearchParameters, SearchParametersHelper} from "../searchParams";
import {HexGridMovementCost} from "../../hexGridMovementCost";
import {SearchPath, SearchPathHelper} from "../searchPath";
import {SearchResult, SearchResultsHelper} from "../searchResults/searchResult";
import {PathfinderHelper} from "./pathfinder";
import {ObjectRepositoryHelper} from "../../../battle/objectRepository";

describe("PathGenerator", () => {
    describe("map with terrain generates", () => {
        let missionMap: MissionMap;
        let searchParameters: SearchParameters;
        let searchResults: SearchResult;

        beforeEach(() => {
            missionMap = MissionMapHelper.new({
                terrainTileMap: TerrainTileMapHelper.new({
                    movementCost: [
                        "1 1 2 1 2 ",
                        " 1 x - 2 1 ",
                    ]
                }),
            });

            searchParameters = SearchParametersHelper.new({
                startLocation: {q: 0, r: 2},
            });

            searchResults = PathfinderHelper.search({
                searchParameters,
                missionMap,
                repository: ObjectRepositoryHelper.new(),
            });
        });

        it("marks all locations as reachable that are not walls or pits", () => {
            [0, 1, 2, 3, 4].forEach(r => {
                [0, 1].forEach(q => {
                    const reachable: boolean = [
                        HexGridMovementCost.pit, HexGridMovementCost.wall
                    ].includes(missionMap.terrainTileMap.getTileTerrainTypeAtLocation({q, r})) !== true;
                    expect(SearchResultsHelper.isLocationReachable(searchResults, q, r)).toBe(reachable);
                });
            });
        });

        it("path to the starting location costs no movement", () => {
            const path2_0: SearchPath = SearchResultsHelper.getShortestPathToLocation(searchResults, 0, 2);
            expect(SearchPathHelper.getTotalMovementCost(path2_0)).toEqual(0);
            expect(SearchPathHelper.getTilesTraveled(path2_0)).toHaveLength(1);
            expect(SearchPathHelper.getTotalDistance(path2_0)).toEqual(0);
        });

        it("path to further locations costs movement", () => {
            const path1_4: SearchPath = SearchResultsHelper.getShortestPathToLocation(searchResults, 1, 4);
            expect(SearchPathHelper.getTotalMovementCost(path1_4)).toEqual(4);
            expect(SearchPathHelper.getTilesTraveled(path1_4)).toHaveLength(4);
            expect(SearchPathHelper.getTotalDistance(path1_4)).toEqual(3);
        });
    })
});

// TODO no start location?
// TODO multiple start locations.
