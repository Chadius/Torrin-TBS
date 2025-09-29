export interface PlayerProgress {
    campaignId: string
}

export const PlayerProgressService = {
    new: ({ campaignId }: Partial<PlayerProgress>): PlayerProgress => {
        if (campaignId == undefined) {
            throw new Error(
                "[PlayerProgressService.new] campaignId is required"
            )
        }

        return {
            campaignId,
        }
    },
}
