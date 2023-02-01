import p5 from "p5";
import {HexCoordinate, Integer} from "../hexMap/hexGrid";
import {HexMap} from "../hexMap/hexMap";
import {Cutscene} from "../cutscene/cutscene";
import {ResourceHandler, ResourceType} from "../resource/resourceHandler";
import {assertsPositiveNumber, PositiveNumber} from "../utils/math";
import {SquaddieID} from "../squaddie/id";
import {SquaddieResource} from "../squaddie/resource";
import {ImageUI} from "../ui/imageUI";
import {RectArea} from "../ui/rectArea";
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {
  convertMapCoordinatesToWorldCoordinates,
  convertWorldCoordinatesToMapCoordinates
} from "../hexMap/convertCoordinates";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../ui/constants";
import {Pathfinder} from "../hexMap/pathfinder/pathfinder";
import {SquaddieMovement} from "../squaddie/movement";
import {SearchParams} from "../hexMap/pathfinder/searchParams";
import {HighlightPulseBlueColor, HighlightPulseRedColor} from "../hexMap/hexDrawingUtils";
import {SquaddieAction} from "../squaddie/action";

type RequiredOptions = {
  p: p5;
  width: PositiveNumber;
  height: PositiveNumber;
};

type Options = {
  resourceHandler: ResourceHandler;
  cutscene: Cutscene;
}

export class BattleScene {
  width: PositiveNumber;
  height: PositiveNumber;
  hexMap: HexMap;
  cutscene: Cutscene;
  resourceHandler: ResourceHandler;

  torrinSquaddieId: SquaddieID;
  torrinSquaddieMovement: SquaddieMovement;
  torrinSquaddieActions: SquaddieAction[];
  torrinMapIcon: ImageUI;
  torrinMapLocation: HexCoordinate;
  pathfinder: Pathfinder;

  constructor(options: RequiredOptions & Partial<Options>) {
    assertsPositiveNumber(options.width);
    this.width = options.width;
    assertsPositiveNumber(options.height);
    this.height = options.height;

    this.resourceHandler = options.resourceHandler;
    this.prepareSquaddies();
    this.prepareMap();
  }

  private prepareSquaddies() {
    this.torrinSquaddieId = new SquaddieID({
      id: "0000",
      name: "Torrin",
      resources: new SquaddieResource({
        mapIcon: "map icon young torrin"
      })
    });
    this.torrinSquaddieMovement = new SquaddieMovement({
      movementPerAction: 2,
      passThroughWalls: true,
      crossOverPits: false,
    })
    this.torrinSquaddieActions = [
      new SquaddieAction({
        name: "water saber",
        id: "torrin_water_saber",
        minimumRange: 0 as Integer,
        maximumRange: 2 as Integer,
      })
    ];
    this.resourceHandler.loadResource(this.torrinSquaddieId.resources.mapIcon);
  }

  private prepareMap() {
    this.hexMap = new HexMap({
      movementCost: [
        "1 1 1 1 1 1 1 1 1 ",
        " 1 1 1 1 1 1 1 1 1 ",
        "  1 1 1 1 1 1 1 1 1 ",
        "   1 1 1 1 1 1 1 1 1 ",
        "    1 1 1 1 1 1 1 1 1 ",
        "     1 1 1 1 1 1 1 1 1 ",
      ],
      resourceHandler: this.resourceHandler,
    });

    this.resourceHandler.loadResources([
      "map icon move 1 action",
      "map icon attack 1 action"
    ]);

    this.pathfinder = new Pathfinder({
      map: this.hexMap
    })
  }

  draw(p: p5) {
    if (this.cutscene && this.cutscene.hasLoaded() && !this.cutscene.isInProgress()) {
      this.cutscene.setResources();
      this.cutscene.start();
    }

    if (
      this.resourceHandler.areAllResourcesLoaded([
        this.torrinSquaddieId.resources.mapIcon,
        "map icon move 1 action",
      ])
      && !this.torrinMapIcon
    ) {
      let image: p5.Image = this.resourceHandler.getResource(this.torrinSquaddieId.resources.mapIcon) as p5.Image;

      this.torrinMapLocation = {q: 0 as Integer, r: 0 as Integer};
      const xyCoords = convertMapCoordinatesToWorldCoordinates(0, 0);

      this.torrinMapIcon = new ImageUI({
        graphic: image,
        area: new RectArea({
          left: xyCoords[0] + SCREEN_WIDTH / 2,
          top: xyCoords[1] + SCREEN_HEIGHT / 2,
          width: image.width,
          height: image.height,
          horizAlign: HORIZ_ALIGN_CENTER,
          vertAlign: VERT_ALIGN_CENTER
        })
      })
    }

    p.colorMode("hsb", 360, 100, 100, 255)
    p.background(50, 10, 20);

    if (this.hexMap) {
      this.hexMap.draw(p);
    }

    if (this.torrinMapIcon) {
      this.torrinMapIcon.draw(p);
    }

    if (this.cutscene && this.cutscene.isInProgress()) {
      this.cutscene.update();
      this.cutscene.draw(p);
    }
  }

  mouseMoved(mouseX: number, mouseY: number) {
    if (this.cutscene && this.cutscene.isInProgress()) {
      this.cutscene.mouseMoved(mouseX, mouseY);
      return;
    }
  }

  mouseClicked(mouseX: number, mouseY: number) {
    if (this.cutscene && this.cutscene.isInProgress()) {
      this.cutscene.mouseClicked(mouseX, mouseY);
      return;
    }

    const worldX = mouseX - SCREEN_WIDTH / 2;
    const worldY = mouseY - SCREEN_HEIGHT / 2;
    const clickedTileCoordinates: [number, number] = convertWorldCoordinatesToMapCoordinates(worldX, worldY);
    const clickedHexCoordinate: HexCoordinate = {
      q: clickedTileCoordinates[0] as Integer,
      r: clickedTileCoordinates[1] as Integer
    };
    if (
      this.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
    ) {
      this.torrinMapLocation = clickedHexCoordinate;
      const xyCoords = convertMapCoordinatesToWorldCoordinates(clickedHexCoordinate.q, clickedHexCoordinate.r);

      this.torrinMapIcon.area.setRectLeft({left: xyCoords[0] + SCREEN_WIDTH / 2});
      this.torrinMapIcon.area.setRectTop({top: xyCoords[1] + SCREEN_HEIGHT / 2});
      this.torrinMapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});

      const movementTiles: HexCoordinate[] = this.pathfinder.getAllReachableTiles(new SearchParams({
        startLocation: this.torrinMapLocation,
        squaddieMovement: this.torrinSquaddieMovement,
        numberOfActions: 1,
      }));

      const actionTiles: HexCoordinate[] = this.pathfinder.getTilesInRange({
        minimumDistance: this.torrinSquaddieActions[0].minimumRange,
        maximumDistance: this.torrinSquaddieActions[0].maximumRange,
        passThroughWalls: false,
        sourceTiles: movementTiles
      });

      this.hexMap.highlightTiles([
        {
          tiles: movementTiles,
          pulseColor: HighlightPulseBlueColor,
          name: "map icon move 1 action",
        },
        {
          tiles: actionTiles,
          pulseColor: HighlightPulseRedColor,
          name: "map icon attack 1 action"
        }
      ]);
    }

    this.hexMap.mouseClicked(mouseX, mouseY);
  }
}
