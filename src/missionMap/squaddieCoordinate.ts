import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"

export interface MissionMapSquaddieCoordinate {
    battleSquaddieId: string
    squaddieTemplateId: string
    currentMapCoordinate: HexCoordinate
    originMapCoordinate: HexCoordinate
}

export const MissionMapSquaddieCoordinateService = {
    clone: (
        datum: MissionMapSquaddieCoordinate
    ): MissionMapSquaddieCoordinate => {
        return {
            squaddieTemplateId: datum.squaddieTemplateId,
            battleSquaddieId: datum.battleSquaddieId,
            currentMapCoordinate: datum.currentMapCoordinate,
            originMapCoordinate: datum.originMapCoordinate,
        }
    },
    isValid: (data: MissionMapSquaddieCoordinate): boolean => {
        return (
            data.battleSquaddieId !== undefined &&
            data.squaddieTemplateId !== undefined
        )
    },
}
