import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"

export interface MissionMapSquaddieLocation {
    battleSquaddieId: string
    squaddieTemplateId: string
    mapCoordinate: HexCoordinate
}

export const MissionMapSquaddieLocationService = {
    clone: (datum: MissionMapSquaddieLocation): MissionMapSquaddieLocation => {
        return {
            squaddieTemplateId: datum.squaddieTemplateId,
            battleSquaddieId: datum.battleSquaddieId,
            mapCoordinate: datum.mapCoordinate,
        }
    },
    isValid: (data: MissionMapSquaddieLocation): boolean => {
        return (
            data.battleSquaddieId !== undefined &&
            data.squaddieTemplateId !== undefined
        )
    },
}
