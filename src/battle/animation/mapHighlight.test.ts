import {ObjectRepository, ObjectRepositoryHelper} from "../objectRepository";
import {HighlightTileDescription, TerrainTileMap, TerrainTileMapHelper} from "../../hexMap/terrainTileMap";
import {SquaddieAction, SquaddieActionHandler} from "../../squaddie/action";
import {Trait, TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SearchPath, SearchPathHelper} from "../../hexMap/pathfinder/searchPath";
import {SquaddieTemplate, SquaddieTemplateHelper} from "../../campaign/squaddieTemplate";
import {SquaddieIdHelper} from "../../squaddie/id";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {ArmyAttributesHelper} from "../../squaddie/armyAttributes";
import {SquaddieMovementHelper} from "../../squaddie/movement";
import {BattleSquaddie, BattleSquaddieHelper} from "../battleSquaddie";
import {HexCoordinate} from "../../hexMap/hexCoordinate/hexCoordinate";
import {PulseBlendColor} from "../../hexMap/colorUtils";
import {HighlightPulseBlueColor} from "../../hexMap/hexDrawingUtils";
import {MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS} from "../loading/missionLoader";
import {MapHighlightHelper} from "./mapHighlight";

describe('map highlight generator', () => {
    let terrainAllSingleMovement: TerrainTileMap;
    let terrainAllDoubleMovement: TerrainTileMap;
    let terrainAlternatingPits: TerrainTileMap;
    let terrain2rows: TerrainTileMap;
    let terrainWalledIn: TerrainTileMap;
    let repository: ObjectRepository;

    let actionRange0_1: SquaddieAction;
    let actionRange0_2: SquaddieAction;
    let actionRange2_3: SquaddieAction;

    beforeEach(() => {
        repository = ObjectRepositoryHelper.new();
        terrainAllSingleMovement = TerrainTileMapHelper.new({
            movementCost: ["1 1 1 1 1 1 1 1 1 1 "],
        });

        terrainAllDoubleMovement = TerrainTileMapHelper.new({
            movementCost: ["2 2 2 2 2 2 2 2 2 2 "],
        });

        terrainAlternatingPits = TerrainTileMapHelper.new({
            movementCost: ["1 1 - 1 1 1 - 1 1 1 "],
        });

        terrainWalledIn = TerrainTileMapHelper.new({
            movementCost: ["x x x 1 1 1 x x x x "],
        });

        terrain2rows = TerrainTileMapHelper.new({
            movementCost: [
                "1 1 1 ",
                " 1 1 1 "
            ],
        });

        actionRange0_1 = SquaddieActionHandler.new({
            id: "melee",
            name: "melee",
            minimumRange: 0,
            maximumRange: 1,
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            })
        });

        actionRange0_2 = SquaddieActionHandler.new({
            id: "meleeAndRanged",
            name: "melee and ranged",
            minimumRange: 0,
            maximumRange: 2,
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            })
        });

        actionRange2_3 = SquaddieActionHandler.new({
            id: "rangedOnly",
            name: "rangedOnly",
            minimumRange: 2,
            maximumRange: 3,
            traits: TraitStatusStorageHelper.newUsingTraitValues({
                [Trait.ATTACK]: true,
            })
        });
    });

    it('can draw a search path based on the number of actions spent', () => {
        const pathToDraw: SearchPath = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 0,
                    r: 0,
                },
                cumulativeMovementCost: 0,
            },
            0
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 0,
                    r: 1,
                },
                cumulativeMovementCost: 1,
            },
            1
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 1,
                    r: 1,
                },
                cumulativeMovementCost: 2,
            },
            2
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 1,
                    r: 2,
                },
                cumulativeMovementCost: 4,
            },
            2
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 1,
                    r: 3,
                },
                cumulativeMovementCost: 6,
            },
            1
        );
        SearchPathHelper.add(
            pathToDraw, {
                hexCoordinate: {
                    q: 2,
                    r: 3,
                },
                cumulativeMovementCost: 7,
            },
            1
        );

        const squaddieWith2Movement: SquaddieTemplate = SquaddieTemplateHelper.new({
            squaddieId: SquaddieIdHelper.new({
                templateId: "2movement",
                name: "2 movement",
                affiliation: SquaddieAffiliation.UNKNOWN,
            }),
            attributes: ArmyAttributesHelper.new({
                movement: SquaddieMovementHelper.new({
                    movementPerAction: 2,
                })
            })
        });
        ObjectRepositoryHelper.addSquaddieTemplate(repository, squaddieWith2Movement);

        const battleSquaddie: BattleSquaddie = BattleSquaddieHelper.new({
            battleSquaddieId: "2 movement",
            squaddieTemplate: squaddieWith2Movement,
        })
        ObjectRepositoryHelper.addBattleSquaddie(repository, battleSquaddie);

        const highlightedTiles: HighlightTileDescription[] = MapHighlightHelper.convertSearchPathToHighlightLocations({
            searchPath: pathToDraw,
            battleSquaddieId: battleSquaddie.battleSquaddieId,
            repository,
        });

        expect(highlightedTiles).toEqual([
            {
                tiles: [
                    {q: 0, r: 0},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: "",
            },
            {
                tiles: [
                    {q: 0, r: 1},
                    {q: 1, r: 1},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[0],
            },
            {
                tiles: [
                    {q: 1, r: 2},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[1],
            },
            {
                tiles: [
                    {q: 1, r: 3},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[2],
            },
            {
                tiles: [
                    {q: 2, r: 3},
                ],
                pulseColor: HighlightPulseBlueColor,
                overlayImageResourceName: MISSION_MAP_MOVEMENT_ICON_RESOURCE_KEYS[2],
            },
        ]);
    });

    // TODO Squaddie with 1 movement
    // TODO Squaddie with melee attack
    // TODO Squaddie with 1 movement and melee attack
    // TODO Squaddie with 1 movement and ranged attack

    // TODO melee attack
    // TODO ranged attack
    // TODO indirect attack

    // TODO it('shows movement for squaddie with no actions', () => {})
    // TODO it('shows movement for squaddie with melee attack', () => {})
    // TODO it('shows movement for squaddie with melee attack after spending some movement actions', () => {})
    // TODO it('shows movement for squaddie with ranged attack', () => {})
    // TODO it('shows movement for squaddie with ranged attack after spending some movement actions', () => {})
    // TODO it('shows movement for squaddie with indirect attack', () => {})
    // TODO it('shows movement for squaddie with indirect attack after spending some movement actions', () => {})
});
