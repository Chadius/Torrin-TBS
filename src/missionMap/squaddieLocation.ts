import {HexCoordinate} from "../hexMap/hexCoordinate/hexCoordinate";

export interface MissionMapSquaddieLocation {
    battleSquaddieId: string;
    squaddieTemplateId: string;
    mapLocation: HexCoordinate;
}

export const MissionMapSquaddieLocationHandler = {
    clone: (datum: MissionMapSquaddieLocation): MissionMapSquaddieLocation => {
        return {
            squaddieTemplateId: datum.squaddieTemplateId,
            battleSquaddieId: datum.battleSquaddieId,
            mapLocation: datum.mapLocation,
        };
    },
    isValid: (data: MissionMapSquaddieLocation): boolean => {
        return data.battleSquaddieId !== undefined && data.squaddieTemplateId !== undefined;
    }
}
