import { getValidValueOrDefault } from "../utils/validityCheck"

export interface SquaddieBuild {
    squaddieTemplateId: string
}

export const SquaddieBuildService = {
    new: ({
        squaddieTemplateId,
    }: {
        squaddieTemplateId: string
    }): SquaddieBuild => ({
        squaddieTemplateId: squaddieTemplateId,
    }),
    sanitize: (data: SquaddieBuild): SquaddieBuild => sanitize(data),
}

const sanitize = (data: SquaddieBuild): SquaddieBuild => {
    data.squaddieTemplateId = getValidValueOrDefault(
        data.squaddieTemplateId,
        ""
    )
    return data
}
