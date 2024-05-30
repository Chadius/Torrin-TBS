import { HexCoordinate } from "../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieAffiliation } from "../squaddie/squaddieAffiliation"

export interface SquaddieDeployment {
    required: {
        squaddieTemplateId: string
        battleSquaddieId: string
        location: HexCoordinate
    }[]
    optional: HexCoordinate[]
    affiliation: SquaddieAffiliation
}

export const SquaddieDeploymentHelper = {
    default: () => {
        return defaultSquaddieDeployment()
    },
    new: ({
        affiliation,
    }: {
        affiliation: SquaddieAffiliation
    }): SquaddieDeployment => {
        return {
            ...defaultSquaddieDeployment(),
            affiliation: affiliation,
        }
    },
}

const defaultSquaddieDeployment = (): SquaddieDeployment => {
    return {
        required: [],
        optional: [],
        affiliation: SquaddieAffiliation.UNKNOWN,
    }
}
