import {MapLayer, MapLayerHelper} from "../../missionMap/mapLayer";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../terrainTileMap";
import {MapLayerMatchesValueFilter, PathIsInBoundsFilter, PathPredicateFilter} from "./pathFilter";
import {SearchPath, SearchPathHelper} from "./searchPath";

describe('PathFilter', () => {
    it('PathIsInBounds', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            })
        });
        const mapLayer: MapLayer = MapLayerHelper.new({
            map: missionMap,
            initialValue: false,
        });

        const inBoundsFilter = new PathIsInBoundsFilter({mapLayer});


        [0, 1, 2, 3, 4].forEach(r => {
            [0, 1].forEach(q => {
                const newPath = SearchPathHelper.newSearchPath();
                SearchPathHelper.add(newPath, {hexCoordinate: {q, r}, movementCost: 0}, 0);
                expect(inBoundsFilter.pathSatisfiesFilter(newPath)).toBe(true);
            });
        });

        [
            {q: -1, r: 0},
            {q: 0, r: -1},
            {
                q: -1,
                r: mapLayer.widthOfWidestRow
            },
            {
                q: mapLayer.numberOfRows,
                r: 0
            }
        ].forEach(coordinates => {
            const newPath = SearchPathHelper.newSearchPath();
            SearchPathHelper.add(newPath, {hexCoordinate: coordinates, movementCost: 0}, 0);
            expect(inBoundsFilter.pathSatisfiesFilter(newPath)).toBe(false);
        });

        const newPath = SearchPathHelper.newSearchPath();
        expect(inBoundsFilter.pathSatisfiesFilter(newPath)).toBe(false);
    });

    it('knows when the head of the path matches a certain value in a given map layer', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            })
        });
        const mapLayer: MapLayer = MapLayerHelper.new({
            map: missionMap,
            initialValue: false,
        });
        MapLayerHelper.setValueOfLocation({mapLayer, q: 0, r: 3, value: true});

        const mapLayerValueFilter = new MapLayerMatchesValueFilter({mapLayer, desiredValue: true});

        [0, 1, 2, 3, 4].forEach(r => {
            [0, 1].forEach(q => {
                const newPath = SearchPathHelper.newSearchPath();
                SearchPathHelper.add(newPath, {hexCoordinate: {q, r}, movementCost: 0}, 0);
                const expectedValue = mapLayer.valueByLocation[q][r];
                expect(mapLayerValueFilter.pathSatisfiesFilter(newPath)).toBe(expectedValue);
            });
        });

        const newPath = SearchPathHelper.newSearchPath();
        expect(mapLayerValueFilter.pathSatisfiesFilter(newPath)).toBe(false);
    });

    it('can apply an arbitrary predicate to a given path', () => {
        const missionMap: MissionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            })
        });

        const pathRShouldBeEvenFilter = new PathPredicateFilter({
            predicate: (path: SearchPath): boolean => {
                const head = SearchPathHelper.getMostRecentTileLocation(path);
                return head.hexCoordinate.r % 2 === 0;
            },
        });

        [0, 1, 2, 3, 4].forEach(r => {
            [0, 1].forEach(q => {
                const newPath = SearchPathHelper.newSearchPath();
                SearchPathHelper.add(newPath, {hexCoordinate: {q, r}, movementCost: 0}, 0);
                const expectedValue = r % 2 === 0;
                expect(pathRShouldBeEvenFilter.pathSatisfiesFilter(newPath)).toBe(expectedValue);
            });
        });
    });
})
