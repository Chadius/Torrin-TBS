import {BattleSquaddie} from "../battleSquaddie";
import {MissionMap} from "../../missionMap/missionMap";
import {HighlightTileDescription, TerrainTileMap} from "../../hexMap/terrainTileMap";
import {SearchParametersHelper} from "../../hexMap/pathfinder/searchParams";
import {HighlightPulseBlueColor, HighlightPulseRedColor} from "../../hexMap/hexDrawingUtils";
import {ObjectRepository} from "../objectRepository";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {GetTargetingShapeGenerator, TargetingShape} from "../targeting/targetingShapeGenerator";
import {CanPlayerControlSquaddieRightNow, GetNumberOfActionPoints} from "../../squaddie/squaddieService";
import {FindValidTargets} from "../targeting/targetingService";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {SearchResult, SearchResultsHelper} from "../../hexMap/pathfinder/searchResults/searchResult";
import {PathfinderHelper} from "../../hexMap/pathfinder/pathGeneration/pathfinder";

export const HighlightSquaddieReach = (battleSquaddie: BattleSquaddie, squaddieTemplate: SquaddieTemplate, missionMap: MissionMap, hexMap: TerrainTileMap, squaddieRepository: ObjectRepository) => {
    const squaddieDatum = missionMap.getSquaddieByBattleId(battleSquaddie.battleSquaddieId);

    let {actionPointsRemaining} = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie})
    const {
        squaddieHasThePlayerControlledAffiliation,
    } = CanPlayerControlSquaddieRightNow({battleSquaddie, squaddieTemplate});
    if (!squaddieHasThePlayerControlledAffiliation) {
        actionPointsRemaining = 3;
    }

    const reachableTileSearchResults: SearchResult = PathfinderHelper.search({
        searchParameters: SearchParametersHelper.new({
            startLocations: [squaddieDatum.mapLocation],
            squaddieAffiliation:
            squaddieTemplate.squaddieId.affiliation,
            movementPerAction: squaddieTemplate.attributes.movement.movementPerAction,
            canPassThroughWalls: squaddieTemplate.attributes.movement.passThroughWalls,
            canPassOverPits: squaddieTemplate.attributes.movement.crossOverPits,
            canStopOnSquaddies: false,
            ignoreTerrainCost: false,
            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(TargetingShape.SNAKE)),
            numberOfActions: actionPointsRemaining,
        }),
        missionMap,
        repository: squaddieRepository,
    })

    const movementTilesByNumberOfActions: {
        [moveActions: number]: HexCoordinate[]
    } = SearchResultsHelper.getLocationsByNumberOfMoveActions(reachableTileSearchResults)

    const highlightTileDescriptions = getHighlightedTileDescriptionByNumberOfMovementActions(movementTilesByNumberOfActions);
    let movementTiles: HexCoordinate[] = SearchResultsHelper.getStoppableLocations(reachableTileSearchResults);

    let actionTiles: HexCoordinate[] = [];
    const actionPoints = GetNumberOfActionPoints({squaddieTemplate, battleSquaddie});
    squaddieTemplate.actions.forEach((action) => {
        highlightTileDescriptions.forEach((descriptions: HighlightTileDescription, index: number) => {
            const locationsToConsider: HexCoordinate[] = descriptions.tiles;
            if (index === 0) {
                if (descriptions.tiles.some(location => location.q === squaddieDatum.mapLocation.q && location.r === squaddieDatum.mapLocation.r)) {
                    if (action.actionPointCost > actionPoints.actionPointsRemaining) {
                        return;
                    }
                    const targetingResults = FindValidTargets({
                        map: missionMap,
                        action: action,
                        actingSquaddieTemplate: squaddieTemplate,
                        actingBattleSquaddie: battleSquaddie,
                        squaddieRepository,
                        sourceTiles: [{...squaddieDatum.mapLocation}],
                    })

                    actionTiles.push(
                        ...targetingResults.locationsInRange.filter(
                            location =>
                                movementTiles.find(loc => loc.q === location.q && loc.r === location.r) === undefined
                        )
                    );
                }

                locationsToConsider.filter(location => location.q !== squaddieDatum.mapLocation.q || location.r !== squaddieDatum.mapLocation.r);
            }

            const movementActionsSpent = index + 1;
            if (action.actionPointCost > actionPoints.actionPointsRemaining - movementActionsSpent) {
                return;
            }

            const targetingResults = FindValidTargets({
                map: missionMap,
                action: action,
                actingSquaddieTemplate: squaddieTemplate,
                actingBattleSquaddie: battleSquaddie,
                squaddieRepository,
                sourceTiles: locationsToConsider,
            })
            actionTiles.push(...targetingResults.locationsInRange);
        });
    });

    if (actionTiles) {
        highlightTileDescriptions.push({
                tiles: actionTiles,
                pulseColor: HighlightPulseRedColor,
                overlayImageResourceName: "map icon attack 1 action",
            },
        )
    }
    hexMap.highlightTiles(highlightTileDescriptions);
}
export const getHighlightedTileDescriptionByNumberOfMovementActions = (locationsByNumberOfMoveActions: {
    [moveActions: number]: HexCoordinate[]
}): HighlightTileDescription[] => {
    const highlightedTileDescriptions: HighlightTileDescription[] = [
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName: "map icon move 1 action",
        },
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName: "map icon move 2 actions",
        },
        {
            tiles: [],
            pulseColor: HighlightPulseBlueColor,
            overlayImageResourceName: "map icon move 3 actions",
        },
    ];
    Object.entries(locationsByNumberOfMoveActions).forEach(([moveActionsStr, coordinates]) => {
        let numberOfMoveActions: number = Number(moveActionsStr);

        let index = numberOfMoveActions - 1;
        if (index < 0) { index = 0; }
        if (index > 2) {index = 2;}
        highlightedTileDescriptions[index].tiles = [...coordinates];
    });

    return highlightedTileDescriptions;
}
