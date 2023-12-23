import {SearchPath} from "../../hexMap/pathfinder/searchPath";
import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {HighlightTileDescription} from "../../hexMap/terrainTileMap";
import {getResultOrThrowError} from "../../utils/ResultOrError";
import {SquaddieService} from "../../squaddie/squaddieService";
import {MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS} from "../loading/missionLoader";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {PulseBlendColor} from "../../hexMap/colorUtils";
import {HighlightPulseBlueColor} from "../../hexMap/hexDrawingUtils";

export const MapHighlightHelper = {
    convertSearchPathToHighlightLocations: ({searchPath, repository, battleSquaddieId}: {
        searchPath: SearchPath;
        repository: ObjectRepository;
        battleSquaddieId: string
    }): HighlightTileDescription[] => {
        const locationsByNumberOfMovementActions = SquaddieService.searchPathLocationsByNumberOfMovementActions({repository, battleSquaddieId, searchPath});
        return Object.entries(locationsByNumberOfMovementActions).map(([numberOfMoveActionsStr, locations]) => {
            const numberOfMoveActions: number = Number(numberOfMoveActionsStr);
            let imageOverlayName = "";
            switch (numberOfMoveActions) {
                case 0:
                    imageOverlayName = "";
                    break;
                case 1:
                    imageOverlayName = MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[0];
                    break
                case 2:
                    imageOverlayName = MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[1];
                    break
                default:
                    imageOverlayName = MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[2];
                    break
            }
            return {
                tiles: locations.map(loc => {return{q: loc.hexCoordinate.q, r: loc.hexCoordinate.r}}),
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: imageOverlayName,
            }
        });
    }
}
