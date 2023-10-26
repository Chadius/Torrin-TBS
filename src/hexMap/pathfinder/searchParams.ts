import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {HexCoordinateData} from "../hexCoordinate/hexCoordinate";
import {TargetingShapeGenerator} from "../../battle/targeting/targetingShapeGenerator";

export class SearchParamsOptions {
    setup: SearchSetupOptions;
    movement: SearchMovementOptions;
    stopCondition: SearchStopConditionOptions;
}

export type SearchSetupOptions = {
    startLocation?: HexCoordinateData;
    missionMap: MissionMap;
    affiliation?: SquaddieAffiliation;
    squaddieRepository?: BattleSquaddieRepository;
}

export class SearchSetup {
    private readonly _startLocation?: HexCoordinateData;
    private readonly _missionMap: MissionMap;
    private readonly _affiliation?: SquaddieAffiliation;
    private readonly _squaddieRepository?: BattleSquaddieRepository;

    constructor({
                    startLocation,
                    missionMap,
                    affiliation,
                    squaddieRepository,
                }: SearchSetupOptions
    ) {
        this._startLocation = startLocation;
        this._missionMap = missionMap;
        this._affiliation = affiliation;
        this._squaddieRepository = squaddieRepository;
    }

    get squaddieRepository(): BattleSquaddieRepository {
        return this._squaddieRepository;
    }

    get affiliation(): SquaddieAffiliation {
        return this._affiliation;
    }

    get missionMap(): MissionMap {
        return this._missionMap;
    }

    get startLocation(): HexCoordinateData {
        return this._startLocation;
    }
}

export type SearchMovementOptions = {
    minimumDistanceMoved?: number;
    maximumDistanceMoved?: number;
    movementPerAction?: number;
    passThroughWalls?: boolean;
    crossOverPits?: boolean;
    canStopOnSquaddies?: boolean;
    ignoreTerrainPenalty?: boolean;
    shapeGenerator: TargetingShapeGenerator;
}

export class SearchMovement {
    private readonly _minimumDistanceMoved?: number;
    private readonly _maximumDistanceMoved?: number;
    private readonly _movementPerAction?: number;
    private readonly _passThroughWalls: boolean;
    private readonly _crossOverPits: boolean;
    private readonly _canStopOnSquaddies: boolean;
    private readonly _ignoreTerrainPenalty: boolean;
    private readonly _shapeGenerator: TargetingShapeGenerator;

    constructor({
                    minimumDistanceMoved,
                    maximumDistanceMoved,
                    movementPerAction,
                    passThroughWalls,
                    crossOverPits,
                    canStopOnSquaddies,
                    ignoreTerrainPenalty,
                    shapeGenerator,
                }: SearchMovementOptions
    ) {
        this._minimumDistanceMoved = minimumDistanceMoved;
        this._maximumDistanceMoved = maximumDistanceMoved;
        this._movementPerAction = movementPerAction || 0;
        this._passThroughWalls = passThroughWalls || false;
        this._crossOverPits = crossOverPits || false;
        this._canStopOnSquaddies = canStopOnSquaddies || false;
        this._ignoreTerrainPenalty = ignoreTerrainPenalty || false;
        this._shapeGenerator = shapeGenerator;
    }

    get shapeGenerator(): TargetingShapeGenerator {
        return this._shapeGenerator;
    }

    get ignoreTerrainPenalty(): boolean {
        return this._ignoreTerrainPenalty;
    }

    get canStopOnSquaddies(): boolean {
        return this._canStopOnSquaddies;
    }

    get crossOverPits(): boolean {
        return this._crossOverPits;
    }

    get passThroughWalls(): boolean {
        return this._passThroughWalls;
    }

    get movementPerAction(): number {
        return this._movementPerAction;
    }

    get maximumDistanceMoved(): number {
        return this._maximumDistanceMoved;
    }

    get minimumDistanceMoved(): number {
        return this._minimumDistanceMoved;
    }
}

export type SearchStopConditionOptions = {
    numberOfActionPoints?: number;
    stopLocation?: HexCoordinateData;
}

export class SearchStopCondition {
    private readonly _numberOfActions?: number;
    private readonly _stopLocation?: HexCoordinateData;

    constructor({
                    numberOfActionPoints,
                    stopLocation,
                }: SearchStopConditionOptions
    ) {
        this._numberOfActions = numberOfActionPoints;
        this._stopLocation = stopLocation;
    }

    get stopLocation(): HexCoordinateData {
        return this._stopLocation;
    }

    get numberOfActions(): number {
        return this._numberOfActions;
    }
}

export class SearchParams {
    private setup: SearchSetup;
    private movement: SearchMovement;
    private stopConditions: SearchStopCondition;

    constructor({
                    setup,
                    movement,
                    stopCondition,
                }: {
                    setup: SearchSetup,
                    movement: SearchMovement,
                    stopCondition: SearchStopCondition,
                }
    ) {
        this.setup = setup;
        this.movement = movement;
        this.stopConditions = stopCondition;
    }

    get ignoreTerrainPenalty() {
        return this.movement.ignoreTerrainPenalty;
    }

    get shapeGenerator(): TargetingShapeGenerator {
        return this.movement.shapeGenerator;
    }

    get startLocation(): HexCoordinateData {
        return this.setup.startLocation;
    }

    get minimumDistanceMoved(): number {
        return this.movement.minimumDistanceMoved;
    }

    get maximumDistanceMoved(): number {
        return this.movement.maximumDistanceMoved;
    }

    get passThroughWalls(): boolean | undefined {
        return this.movement.passThroughWalls;
    }

    get crossOverPits(): boolean | undefined {
        return this.movement.crossOverPits;
    }

    get movementPerAction(): number | undefined {
        return this.movement.movementPerAction;
    }

    get numberOfActions(): number | undefined {
        return this.stopConditions.numberOfActions;
    }

    get stopLocation(): HexCoordinateData | undefined {
        return this.stopConditions.stopLocation;
    }

    get squaddieAffiliation(): SquaddieAffiliation {
        return this.setup.affiliation;
    }

    get canStopOnSquaddies(): boolean {
        return (this.movement.canStopOnSquaddies === true)
    }

    get missionMap(): MissionMap {
        return this.setup.missionMap;
    }

    get squaddieRepository(): BattleSquaddieRepository {
        return this.setup.squaddieRepository;
    }

    hasSquaddieAffiliation(): boolean {
        return this.setup.affiliation !== undefined && this.setup.affiliation !== SquaddieAffiliation.UNKNOWN;
    }
}
