import {
    SquaddieActionsForThisRoundService,
    SquaddieDecisionsDuringThisPhase
} from "../history/squaddieDecisionsDuringThisPhase";
import {TeamStrategyState} from "./teamStrategyState";
import {ObjectRepository, ObjectRepositoryService} from "../objectRepository";
import {BattleSquaddie, BattleSquaddieService} from "../battleSquaddie";
import {SquaddieAffiliation} from "../../squaddie/squaddieAffiliation";
import {SquaddieTurnService} from "../../squaddie/turn";
import {BattleSquaddieTeam, BattleSquaddieTeamService} from "../battleSquaddieTeam";
import {MissionMap} from "../../missionMap/missionMap";
import {TerrainTileMap} from "../../hexMap/terrainTileMap";
import {EndTurnTeamStrategy} from "./endTurn";
import {TraitStatusStorageHelper} from "../../trait/traitStatusStorage";
import {SquaddieTemplate} from "../../campaign/squaddieTemplate";
import {DefaultArmyAttributes} from "../../squaddie/armyAttributes";
import {DecisionService} from "../../decision/decision";
import {ActionEffectEndTurnService} from "../../decision/actionEffectEndTurn";

describe('end turn team strategy', () => {
    let playerSquaddieTemplate: SquaddieTemplate;
    let playerBattleSquaddie: BattleSquaddie;
    let squaddieRepository: ObjectRepository;
    let squaddieTeam: BattleSquaddieTeam;
    let missionMap: MissionMap;

    beforeEach(() => {
        squaddieRepository = ObjectRepositoryService.new();
        playerSquaddieTemplate = {
            squaddieId: {
                templateId: "new_static_squaddie",
                name: "Torrin",
                resources: {
                    mapIconResourceKey: "",
                    actionSpritesByEmotion: {},
                },
                traits: TraitStatusStorageHelper.newUsingTraitValues(),
                affiliation: SquaddieAffiliation.PLAYER,
            },
            actions: [],
            attributes: DefaultArmyAttributes(),
        };

        ObjectRepositoryService.addSquaddieTemplate(squaddieRepository,
            playerSquaddieTemplate
        );

        playerBattleSquaddie =
            BattleSquaddieService.newBattleSquaddie({
                battleSquaddieId: "new_dynamic_squaddie",
                squaddieTemplateId: "new_static_squaddie",
                squaddieTurn: SquaddieTurnService.new(),
            });

        ObjectRepositoryService.addBattleSquaddie(squaddieRepository,
            playerBattleSquaddie
        );

        squaddieTeam = {
            id: "playerTeamId",
            name: "team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "icon_player_team",
        };
        BattleSquaddieTeamService.addBattleSquaddieIds(squaddieTeam, ["new_dynamic_squaddie"]);

        missionMap = new MissionMap({
            terrainTileMap: new TerrainTileMap({movementCost: ["1 "]})
        });
    });

    it('determines it should end its turn', () => {
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: squaddieTeam,
            squaddieRepository: squaddieRepository,
        });
        missionMap.addSquaddie("new_static_squaddie", "new_dynamic_squaddie", {q: 0, r: 0});

        const expectedInstruction: SquaddieDecisionsDuringThisPhase = SquaddieActionsForThisRoundService.new({
            squaddieTemplateId: "new_static_squaddie",
            battleSquaddieId: "new_dynamic_squaddie",
            startingLocation: {q: 0, r: 0},
            decisions: [
                DecisionService.new({
                    actionEffects: [
                        ActionEffectEndTurnService.new()
                    ]
                })
            ]
        });

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({});
        const actualInstruction: SquaddieDecisionsDuringThisPhase = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toStrictEqual(expectedInstruction);
        expect(state.instruction).toStrictEqual(expectedInstruction);
    });

    it('is undefined when there are no squaddies', () => {
        const noSquaddieTeam: BattleSquaddieTeam = {
            id: "playerTeamId",
            name: "no squaddies team",
            affiliation: SquaddieAffiliation.PLAYER,
            battleSquaddieIds: [],
            iconResourceKey: "icon_player_team",

        };
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: noSquaddieTeam,
            squaddieRepository: squaddieRepository,
        });

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({});
        const actualInstruction: SquaddieDecisionsDuringThisPhase = strategy.DetermineNextInstruction(state, squaddieRepository);
        expect(actualInstruction).toBeUndefined();
    });

    it('is undefined when squaddies have no actions', () => {
        const state = new TeamStrategyState({
            missionMap: missionMap,
            team: squaddieTeam,
            squaddieRepository: squaddieRepository,
        });

        BattleSquaddieService.endTurn(playerBattleSquaddie);

        const strategy: EndTurnTeamStrategy = new EndTurnTeamStrategy({});
        const actualInstruction: SquaddieDecisionsDuringThisPhase = strategy.DetermineNextInstruction(state, squaddieRepository);

        expect(actualInstruction).toBeUndefined();
    });
});
