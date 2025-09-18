import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"

export interface MissionMapSquaddieCoordinate {
    battleSquaddieId: string | undefined
    squaddieTemplateId: string | undefined
    currentMapCoordinate: HexCoordinate | undefined
    originMapCoordinate: HexCoordinate | undefined
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
