import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"

export interface MissionMapSquaddieCoordinate {
    battleSquaddieId: string
    squaddieTemplateId: string
    mapCoordinate: HexCoordinate
}

export const MissionMapSquaddieCoordinateService = {
    clone: (
        datum: MissionMapSquaddieCoordinate
    ): MissionMapSquaddieCoordinate => {
        return {
            squaddieTemplateId: datum.squaddieTemplateId,
            battleSquaddieId: datum.battleSquaddieId,
            mapCoordinate: datum.mapCoordinate,
        }
    },
    isValid: (data: MissionMapSquaddieCoordinate): boolean => {
        return (
            data.battleSquaddieId !== undefined &&
            data.squaddieTemplateId !== undefined
        )
    },
}
