import {SearchParametersHelper} from "../searchParams";
import {SearchPathHelper} from "../searchPath";
import {MissionMap, MissionMapHelper} from "../../../missionMap/missionMap";
import {TerrainTileMap} from "../../terrainTileMap";
import {ObjectRepository, ObjectRepositoryHelper} from "../../../battle/objectRepository";
import {SquaddieTemplateHelper} from "../../../campaign/squaddieTemplate";
import {SquaddieIdHelper} from "../../../squaddie/id";
import {FriendlyAffiliationsByAffiliation, SquaddieAffiliation} from "../../../squaddie/squaddieAffiliation";
import {BattleSquaddieHelper} from "../../../battle/battleSquaddie";
import {AddPathConditionSquaddieAffiliation} from "./addPathConditionSquaddieAffiliation";
import {DamageType, DealDamageToTheSquaddie} from "../../../squaddie/squaddieService";

describe('AddPathConditionPathIsLessThanTotalMovement', () => {
    it('returns true if squaddies are friendly, false if they are not', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 1}, cumulativeMovementCost: 1}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 2}, cumulativeMovementCost: 2}, 2);

        [
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach(searchingAffiliation => {
            [
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.NONE,
            ].forEach(blockingAffiliation => {
                const repository: ObjectRepository = ObjectRepositoryHelper.new();
                const blockingSquaddieTemplate = SquaddieTemplateHelper.new({
                    squaddieId: SquaddieIdHelper.new({
                        templateId: "blocker",
                        name: "blocker",
                        affiliation: blockingAffiliation,
                    })
                });
                ObjectRepositoryHelper.addSquaddieTemplate(repository, blockingSquaddieTemplate);
                const blockingSquaddieBattle = BattleSquaddieHelper.new({
                    squaddieTemplate: blockingSquaddieTemplate,
                    battleSquaddieId: "blocker 0"
                });
                ObjectRepositoryHelper.addBattleSquaddie(repository, blockingSquaddieBattle);
                MissionMapHelper.addSquaddie(missionMap, blockingSquaddieTemplate.squaddieId.templateId, blockingSquaddieBattle.battleSquaddieId, {
                    q: 1,
                    r: 2
                });

                const searchParameters = SearchParametersHelper.new({
                    squaddieAffiliation: searchingAffiliation,
                });

                const squaddiesAreFriends = FriendlyAffiliationsByAffiliation[searchingAffiliation][blockingAffiliation] === true;

                const condition = new AddPathConditionSquaddieAffiliation({missionMap, repository});
                expect(condition.shouldAddNewPath({
                    newPath: pathAtHead,
                    searchParameters
                })).toBe(squaddiesAreFriends);
            })
        });
    });
    it('returns true if squaddies are not friendly but one is not alive', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 1}, cumulativeMovementCost: 1}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 2}, cumulativeMovementCost: 2}, 2);

        [
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach(searchingAffiliation => {
            [
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.NONE,
            ].forEach(blockingAffiliation => {
                const repository: ObjectRepository = ObjectRepositoryHelper.new();
                const blockingSquaddieTemplate = SquaddieTemplateHelper.new({
                    squaddieId: SquaddieIdHelper.new({
                        templateId: "blocker",
                        name: "blocker",
                        affiliation: blockingAffiliation,
                    })
                });
                ObjectRepositoryHelper.addSquaddieTemplate(repository, blockingSquaddieTemplate);
                const blockingSquaddieBattle = BattleSquaddieHelper.new({
                    squaddieTemplate: blockingSquaddieTemplate,
                    battleSquaddieId: "blocker 0"
                });
                ObjectRepositoryHelper.addBattleSquaddie(repository, blockingSquaddieBattle);
                MissionMapHelper.addSquaddie(missionMap, blockingSquaddieTemplate.squaddieId.templateId, blockingSquaddieBattle.battleSquaddieId, {
                    q: 1,
                    r: 2
                });
                DealDamageToTheSquaddie({
                    squaddieTemplate: blockingSquaddieTemplate,
                    battleSquaddie: blockingSquaddieBattle,
                    damage: 9001,
                    damageType: DamageType.UNKNOWN
                });

                const searchParameters = SearchParametersHelper.new({
                    squaddieAffiliation: searchingAffiliation,
                });

                const condition = new AddPathConditionSquaddieAffiliation({missionMap, repository});
                expect(condition.shouldAddNewPath({newPath: pathAtHead, searchParameters})).toBe(true);
            })
        });
    });
    it('returns true if squaddies are not friendly but search parameters can stop on squaddies anyway', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 1}, cumulativeMovementCost: 1}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 2}, cumulativeMovementCost: 2}, 2);

        [
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach(searchingAffiliation => {
            [
                SquaddieAffiliation.PLAYER,
                SquaddieAffiliation.ENEMY,
                SquaddieAffiliation.ALLY,
                SquaddieAffiliation.NONE,
            ].forEach(blockingAffiliation => {
                const repository: ObjectRepository = ObjectRepositoryHelper.new();
                const blockingSquaddieTemplate = SquaddieTemplateHelper.new({
                    squaddieId: SquaddieIdHelper.new({
                        templateId: "blocker",
                        name: "blocker",
                        affiliation: blockingAffiliation,
                    })
                });
                ObjectRepositoryHelper.addSquaddieTemplate(repository, blockingSquaddieTemplate);
                const blockingSquaddieBattle = BattleSquaddieHelper.new({
                    squaddieTemplate: blockingSquaddieTemplate,
                    battleSquaddieId: "blocker 0"
                });
                ObjectRepositoryHelper.addBattleSquaddie(repository, blockingSquaddieBattle);
                MissionMapHelper.addSquaddie(missionMap, blockingSquaddieTemplate.squaddieId.templateId, blockingSquaddieBattle.battleSquaddieId, {
                    q: 1,
                    r: 2
                });

                const searchParameters = SearchParametersHelper.new({
                    squaddieAffiliation: searchingAffiliation,
                    canStopOnSquaddies: true,
                });

                const condition = new AddPathConditionSquaddieAffiliation({missionMap, repository});
                expect(condition.shouldAddNewPath({newPath: pathAtHead, searchParameters})).toBe(true);
            })
        });
    });
    it('returns true if there is no squaddie at the location', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 1}, cumulativeMovementCost: 1}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 2}, cumulativeMovementCost: 2}, 2);

        const repository: ObjectRepository = ObjectRepositoryHelper.new();
        const searchParameters = SearchParametersHelper.new({
            squaddieAffiliation: SquaddieAffiliation.PLAYER,
        });

        const condition = new AddPathConditionSquaddieAffiliation({missionMap, repository});
        expect(condition.shouldAddNewPath({newPath: pathAtHead, searchParameters})).toBe(true);
    });
    it('returns true if the searching squaddie has an unknown affiliation', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const pathAtHead = SearchPathHelper.newSearchPath();
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 0, r: 0}, cumulativeMovementCost: 0}, 0);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 0}, cumulativeMovementCost: 0}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 1}, cumulativeMovementCost: 1}, 1);
        SearchPathHelper.add(pathAtHead, {hexCoordinate: {q: 1, r: 2}, cumulativeMovementCost: 2}, 2);

        const searchingAffiliation: SquaddieAffiliation = SquaddieAffiliation.UNKNOWN;

        [
            SquaddieAffiliation.PLAYER,
            SquaddieAffiliation.ENEMY,
            SquaddieAffiliation.ALLY,
            SquaddieAffiliation.NONE,
        ].forEach(blockingAffiliation => {
            const repository: ObjectRepository = ObjectRepositoryHelper.new();
            const blockingSquaddieTemplate = SquaddieTemplateHelper.new({
                squaddieId: SquaddieIdHelper.new({
                    templateId: "blocker",
                    name: "blocker",
                    affiliation: blockingAffiliation,
                })
            });
            ObjectRepositoryHelper.addSquaddieTemplate(repository, blockingSquaddieTemplate);
            const blockingSquaddieBattle = BattleSquaddieHelper.new({
                squaddieTemplate: blockingSquaddieTemplate,
                battleSquaddieId: "blocker 0"
            });
            ObjectRepositoryHelper.addBattleSquaddie(repository, blockingSquaddieBattle);
            MissionMapHelper.addSquaddie(missionMap, blockingSquaddieTemplate.squaddieId.templateId, blockingSquaddieBattle.battleSquaddieId, {
                q: 1,
                r: 2
            });

            const searchParameters = SearchParametersHelper.new({
                squaddieAffiliation: searchingAffiliation,
            });

            const condition = new AddPathConditionSquaddieAffiliation({missionMap, repository});
            expect(condition.shouldAddNewPath({
                newPath: pathAtHead,
                searchParameters
            })).toBe(true);
        });
    });
    it('returns undefined if there is no path', () => {
        const missionMap: MissionMap = MissionMapHelper.new({
            terrainTileMap: new TerrainTileMap({
                movementCost: [
                    "1 1 2 1 2 ",
                    " 1 x - 2 1 ",
                ]
            }),
        });

        const repository: ObjectRepository = ObjectRepositoryHelper.new();
        const searchParameters = SearchParametersHelper.new({});

        const condition = new AddPathConditionSquaddieAffiliation({missionMap, repository});
        expect(condition.shouldAddNewPath({
            newPath: SearchPathHelper.newSearchPath(),
            searchParameters
        })).toBeUndefined();
    });
});
