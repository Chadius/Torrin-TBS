import {SquaddieMovement} from "../../squaddie/movement";
import {MissionMap} from "../../missionMap/missionMap";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {Trait, TraitStatusStorage} from "../../trait/traitStatusStorage";
import {BattleSquaddieRepository} from "../../battle/battleSquaddieRepository";
import {HexCoordinate} from "../hexCoordinate/hexCoordinate";
import {
    GetTargetingShapeGenerator,
    TargetingShape,
    TargetingShapeGenerator
} from "../../battle/targeting/targetingShapeGenerator";
import {getResultOrThrowError} from "../../utils/ResultOrError";

export class SearchParamsOptions {
    startLocation?: HexCoordinate;
    stopLocation?: HexCoordinate;
    squaddieMovement?: SquaddieMovement;
    squaddieAffiliation?: SquaddieAffiliation;
    canStopOnSquaddies?: boolean;
    numberOfActions?: number;
    minimumDistanceMoved?: number;
    maximumDistanceMoved?: number;
    missionMap: MissionMap;
    squaddieRepository?: BattleSquaddieRepository;
    shapeGeneratorType: TargetingShape;
};

export class SearchParams {
    private setup: {
        startLocation?: HexCoordinate;
        missionMap: MissionMap;
        affiliation?: SquaddieAffiliation;
        squaddieRepository?: BattleSquaddieRepository;
    }
    private movement: {
        minimumDistanceMoved?: number;
        maximumDistanceMoved?: number;
        movementPerAction: number;
        passThroughWalls: boolean;
        crossOverPits: boolean;
        canStopOnSquaddies: boolean;
        shapeGenerator: TargetingShapeGenerator;
    }
    private stopConditions: {
        numberOfActions?: number;
        stopLocation?: HexCoordinate;
    }

    constructor(options: {
                    startLocation?: HexCoordinate,
                    stopLocation?: HexCoordinate,
                    squaddieMovement?: SquaddieMovement,
                    squaddieAffiliation?: SquaddieAffiliation,
                    canStopOnSquaddies?: boolean,
                    numberOfActions?: number,
                    minimumDistanceMoved?: number,
                    maximumDistanceMoved?: number,
                    missionMap: MissionMap,
                    squaddieRepository?: BattleSquaddieRepository,
                    shapeGeneratorType: TargetingShape,
                } |
                    {
                        searchParamsOptions: SearchParamsOptions
                    }
    ) {
        if ("searchParamsOptions" in options) {
            this.setUsingSearchParamsOptions(options.searchParamsOptions);
        } else {
            this.setup = {
                startLocation: options.startLocation,
                missionMap: options.missionMap,
                affiliation: options.squaddieAffiliation ? options.squaddieAffiliation : undefined,
                squaddieRepository: options.squaddieRepository,
            };
            this.movement = {
                minimumDistanceMoved: options.minimumDistanceMoved,
                maximumDistanceMoved: options.maximumDistanceMoved,
                movementPerAction: options.squaddieMovement ? options.squaddieMovement.movementPerAction : 0,
                passThroughWalls: options.squaddieMovement ? options.squaddieMovement.passThroughWalls : false,
                crossOverPits: options.squaddieMovement ? options.squaddieMovement.crossOverPits : false,
                canStopOnSquaddies: options.canStopOnSquaddies,
                shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(options.shapeGeneratorType)),
            }
            this.stopConditions = {
                numberOfActions: options.numberOfActions,
                stopLocation: options.stopLocation,
            }
        }
    }

    private setUsingSearchParamsOptions(searchParamsOptions: SearchParamsOptions) {
        this.setup = {
            startLocation: searchParamsOptions.startLocation,
            missionMap: searchParamsOptions.missionMap,
            affiliation: searchParamsOptions.squaddieAffiliation ?? undefined,
            squaddieRepository: searchParamsOptions.squaddieRepository,
        };
        this.movement = {
            minimumDistanceMoved: searchParamsOptions.minimumDistanceMoved,
            maximumDistanceMoved: searchParamsOptions.maximumDistanceMoved,
            movementPerAction: searchParamsOptions.squaddieMovement ? searchParamsOptions.squaddieMovement.movementPerAction : 0,
            passThroughWalls: searchParamsOptions.squaddieMovement ? searchParamsOptions.squaddieMovement.passThroughWalls : false,
            crossOverPits: searchParamsOptions.squaddieMovement ? searchParamsOptions.squaddieMovement.crossOverPits : false,
            canStopOnSquaddies: searchParamsOptions.canStopOnSquaddies,
            shapeGenerator: getResultOrThrowError(GetTargetingShapeGenerator(searchParamsOptions.shapeGeneratorType)),
        }
        this.stopConditions = {
            numberOfActions: searchParamsOptions.numberOfActions,
            stopLocation: searchParamsOptions.stopLocation,
        }
    }

    get shapeGenerator(): TargetingShapeGenerator {
        return this.movement.shapeGenerator;
    }

    get startLocation(): HexCoordinate {
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

    get stopLocation(): HexCoordinate | undefined {
        return this.stopConditions.stopLocation;
    }

    hasSquaddieAffiliation(): boolean {
        return this.setup.affiliation !== undefined && this.setup.affiliation !== SquaddieAffiliation.UNKNOWN;
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

    get searchParamsOptions(): SearchParamsOptions {
        return {
            canStopOnSquaddies: this.movement.canStopOnSquaddies,
            minimumDistanceMoved: this.movement.minimumDistanceMoved,
            missionMap: this.setup.missionMap,
            squaddieRepository: this.setup.squaddieRepository,
            numberOfActions: this.stopConditions.numberOfActions,
            squaddieAffiliation: this.setup.affiliation,
            squaddieMovement: new SquaddieMovement({
                movementPerAction: this.movement.movementPerAction,
                traits: new TraitStatusStorage({
                    [Trait.PASS_THROUGH_WALLS]: this.movement.passThroughWalls,
                    [Trait.CROSS_OVER_PITS]: this.movement.crossOverPits,
                })
            }),
            startLocation: this.setup.startLocation,
            stopLocation: this.stopConditions.stopLocation,
            shapeGeneratorType: this.movement.shapeGenerator.getShape(),
        }
    }
}
