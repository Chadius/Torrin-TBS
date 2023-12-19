import {SearchParametersHelper} from "../searchParams";
import {SearchPathHelper} from "../searchPath";
import {MissionMap, MissionMapHelper} from "../../../missionMap/missionMap";
import {TerrainTileMap} from "../../terrainTileMap";
import {AddPathConditionPathLeadsToPit} from "./addPathConditionPathLeadsToPit";

describe('addPathConditionPathLeadsToPit', () => {
    it('returns true if the path is not on a Pit', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);

        const searchParameters = SearchParametersHelper.new({});

        const condition = new AddPathConditionPathLeadsToPit({missionMap});
        expect(condition.shouldAddNewPath({
            newPath: pathAtHead,
            searchParameters
        })).toBe(true);
    });

    it('returns false if the path is in a Pit and search cannot cross pits', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 1}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 2}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 2}, cumulativeMovementCost: 0}, 1);

        const searchParameters = SearchParametersHelper.new({});

        const condition = new AddPathConditionPathLeadsToPit({missionMap});
        expect(condition.shouldAddNewPath({
            newPath: pathAtHead,
            searchParameters
        })).toBe(false);
    });

    it('returns true if the path is in a Pit and search can cross pits', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 1}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 2}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 2}, cumulativeMovementCost: 0}, 1);

        const searchParameters = SearchParametersHelper.new({
            canPassOverPits: true,
        });

        const condition = new AddPathConditionPathLeadsToPit({missionMap});
        expect(condition.shouldAddNewPath({
            newPath: pathAtHead,
            searchParameters
        })).toBe(true);
    });

    it('returns undefined if there is no path', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const searchParameters = SearchParametersHelper.new({});

        const condition = new AddPathConditionPathLeadsToPit({missionMap});
        expect(condition.shouldAddNewPath({
            newPath: SearchPathHelper.newSearchPath(),
            searchParameters
        })).toBeUndefined();
    });
});
