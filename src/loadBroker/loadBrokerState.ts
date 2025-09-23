import { TGameMode } from "../utils/startupConfig"

export interface LoadBrokerState {
    modeThatInitiatedLoading: TGameMode
    campaignIdThatWasLoaded: string | undefined
}

export const LoadBrokerStateService = {
    new: ({
        campaignIdThatWasLoaded,
        modeThatInitiatedLoading,
    }: Partial<LoadBrokerState> & {
        modeThatInitiatedLoading: TGameMode
    }): LoadBrokerState =>
        newLoadBrokerState({
            campaignIdThatWasLoaded,
            modeThatInitiatedLoading,
        }),
    clone: (original: LoadBrokerState): LoadBrokerState =>
        cloneLoadBrokerState(original),
    withCampaignIdThatWasLoaded: (
        loadBrokerState: LoadBrokerState,
        newCampaignId: string
    ): LoadBrokerState => {
        const clone = cloneLoadBrokerState(loadBrokerState)
        return newLoadBrokerState({
            ...clone,
            campaignIdThatWasLoaded: newCampaignId,
        })
    },
    withModeThatInitiatedLoading: (
        loadBrokerState: LoadBrokerState,
        gameMode: TGameMode
    ): LoadBrokerState => {
        const clone = cloneLoadBrokerState(loadBrokerState)
        return newLoadBrokerState({
            ...clone,
            modeThatInitiatedLoading: gameMode,
        })
    },
}

const newLoadBrokerState = ({
    campaignIdThatWasLoaded,
    modeThatInitiatedLoading,
}: Partial<LoadBrokerState> & {
    modeThatInitiatedLoading: TGameMode
}): LoadBrokerState => {
    if (modeThatInitiatedLoading == undefined) {
        throw new Error(
            "[LoadBrokerStateService.new] modeThatInitiatedLoading is required"
        )
    }
    return {
        modeThatInitiatedLoading,
        campaignIdThatWasLoaded,
    }
}

const cloneLoadBrokerState = (original: LoadBrokerState): LoadBrokerState => {
    return newLoadBrokerState({
        campaignIdThatWasLoaded: original.campaignIdThatWasLoaded,
        modeThatInitiatedLoading: original.modeThatInitiatedLoading,
    })
}
