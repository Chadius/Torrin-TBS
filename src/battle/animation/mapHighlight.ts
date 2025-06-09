import { ObjectRepository, ObjectRepositoryService } from "../objectRepository"
import { getResultOrThrowError } from "../../utils/ResultOrError"
import { SquaddieService } from "../../squaddie/squaddieService"
import { HIGHLIGHT_PULSE_COLOR } from "../../hexMap/hexDrawingUtils"
import { MissionMap } from "../../missionMap/missionMap"
import {
    SearchResult,
    SearchResultsService,
} from "../../hexMap/pathfinder/searchResults/searchResult"
import { HexCoordinate } from "../../hexMap/hexCoordinate/hexCoordinate"
import { SquaddieTurn, SquaddieTurnService } from "../../squaddie/turn"
import { BattleSquaddieSelectorService } from "../orchestratorComponents/battleSquaddieSelectorUtils"
import { PulseColor } from "../../hexMap/pulseColor"
import { SearchLimitService } from "../../hexMap/pathfinder/pathGeneration/searchLimit"
import {
    SearchPathAdapter,
    SearchPathAdapterService,
} from "../../search/searchPathAdapter/searchPathAdapter"
import {
    SearchResultsCache,
    SearchResultsCacheService,
} from "../../hexMap/pathfinder/searchResults/searchResultsCache"
import { HighlightCoordinateDescription } from "../../hexMap/highlightCoordinateDescription"

export const MapHighlightService = {
    convertSearchPathToHighlightCoordinates: ({
        searchPath,
        squaddieIsNormallyControllableByPlayer,
    }: {
        searchPath: SearchPathAdapter
        squaddieIsNormallyControllableByPlayer: boolean
    }): HighlightCoordinateDescription[] => {
        return [
            {
                coordinates:
                    SearchPathAdapterService.getCoordinates(searchPath),
                pulseColor: squaddieIsNormallyControllableByPlayer
                    ? HIGHLIGHT_PULSE_COLOR.BLUE
                    : HIGHLIGHT_PULSE_COLOR.PALE_BLUE,
            },
        ]
    },
    highlightAllCoordinatesWithinSquaddieRange: ({
        currentMapCoordinate,
        originMapCoordinate,
        missionMap,
        repository,
        battleSquaddieId,
        squaddieTurnOverride,
        squaddieAllMovementCache,
    }: {
        currentMapCoordinate: HexCoordinate
        originMapCoordinate: HexCoordinate
        missionMap: MissionMap
        repository: ObjectRepository
        battleSquaddieId: string
        squaddieAllMovementCache: SearchResultsCache
        squaddieTurnOverride?: SquaddieTurn
    }): HighlightCoordinateDescription[] => {
        const { squaddieTemplate, battleSquaddie } = getResultOrThrowError(
            ObjectRepositoryService.getSquaddieByBattleId(
                repository,
                battleSquaddieId
            )
        )

        let movementActionPoints =
            SquaddieTurnService.getActionPointsThatCouldBeSpentOnMovement(
                squaddieTurnOverride ?? battleSquaddie.squaddieTurn
            )

        let { unSpentActionPoints } = SquaddieTurnService.getActionPointSpend(
            squaddieTurnOverride ?? battleSquaddie.squaddieTurn
        )

        const searchLimit = SearchLimitService.new({
            baseSearchLimit: SearchLimitService.landBasedMovement(),
            maximumMovementCost:
                movementActionPoints *
                SquaddieService.getSquaddieMovementAttributes({
                    battleSquaddie,
                    squaddieTemplate,
                }).net.movementPerAction,
            ignoreTerrainCost: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.ignoreTerrainCost,
            crossOverPits: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.crossOverPits,
            passThroughWalls: SquaddieService.getSquaddieMovementAttributes({
                battleSquaddie,
                squaddieTemplate,
            }).net.passThroughWalls,
            squaddieAffiliation: squaddieTemplate.squaddieId.affiliation,
        })
        const reachableCoordinateSearch: SearchResult =
            SearchResultsCacheService.calculateSquaddieAllMovement({
                searchResultsCache: squaddieAllMovementCache,
                battleSquaddieId,
                originMapCoordinate,
                currentMapCoordinate,
                searchLimit,
            })

        const { squaddieIsNormallyControllableByPlayer } =
            SquaddieService.canPlayerControlSquaddieRightNow({
                squaddieTemplate,
                battleSquaddie,
            })

        const movementRange =
            highlightAllCoordinatesWithinSquaddieMovementRange({
                reachableCoordinatesSearch: reachableCoordinateSearch,
                squaddieIsNormallyControllableByPlayer,
            })
        const attackRange = getHighlightsForAttackRange({
            objectRepository: repository,
            battleSquaddieId,
            reachableCoordinateSearch: reachableCoordinateSearch,
            missionMap,
            squaddieIsNormallyControllableByPlayer,
            actionPointsRemaining: unSpentActionPoints,
        })
        return [...movementRange, ...attackRange].filter(
            (highlights) => highlights.coordinates.length > 0
        )
    },
}

const highlightAllCoordinatesWithinSquaddieMovementRange = ({
    reachableCoordinatesSearch,
    squaddieIsNormallyControllableByPlayer,
}: {
    reachableCoordinatesSearch: SearchResult
    squaddieIsNormallyControllableByPlayer: boolean
}) => {
    const pulseMovementColor: PulseColor =
        squaddieIsNormallyControllableByPlayer
            ? HIGHLIGHT_PULSE_COLOR.BLUE
            : HIGHLIGHT_PULSE_COLOR.PALE_BLUE

    return [
        {
            coordinates: SearchResultsService.getStoppableCoordinates(
                reachableCoordinatesSearch
            ),
            pulseColor: pulseMovementColor,
        },
    ]
}

const getHighlightsForAttackRange = ({
    objectRepository,
    battleSquaddieId,
    reachableCoordinateSearch,
    missionMap,
    squaddieIsNormallyControllableByPlayer,
    actionPointsRemaining,
}: {
    objectRepository: ObjectRepository
    battleSquaddieId: string
    reachableCoordinateSearch: SearchResult
    missionMap: MissionMap
    squaddieIsNormallyControllableByPlayer: boolean
    actionPointsRemaining: number
}): HighlightCoordinateDescription[] => {
    const attackCoordinates =
        BattleSquaddieSelectorService.getAttackCoordinates({
            objectRepository,
            battleSquaddieId,
            reachableCoordinateSearch,
            missionMap,
            actionPointsRemaining,
        })

    const pulseActionColor: PulseColor = squaddieIsNormallyControllableByPlayer
        ? HIGHLIGHT_PULSE_COLOR.RED
        : HIGHLIGHT_PULSE_COLOR.PURPLE

    return [
        {
            coordinates: attackCoordinates,
            pulseColor: pulseActionColor,
        },
    ]
}
