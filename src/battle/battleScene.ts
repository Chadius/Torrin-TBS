import p5 from "p5";
import {HexCoordinate, Integer} from "../hexMap/hexGrid";
import {HexMap} from "../hexMap/hexMap";
import {Cutscene} from "../cutscene/cutscene";
import {DialogueBox} from "../cutscene/dialogue/dialogueBox";
import {SplashScreen} from "../cutscene/splashScreen";
import {DecisionTrigger} from "../cutscene/DecisionTrigger";
import {ResourceHandler} from "../resource/resourceHandler";
import {assertsPositiveNumber, PositiveNumber} from "../utils/math";
import {SquaddieID} from "../squaddie/id";
import {SquaddieResource} from "../squaddie/resource";
import {ImageUI} from "../ui/imageUI";
import {HorizontalAnchor, RectArea, VerticalAnchor} from "../ui/rectArea";
import {SCREEN_HEIGHT, SCREEN_WIDTH} from "../graphicsConstants";
import {
  convertMapCoordinatesToWorldCoordinates,
  convertWorldCoordinatesToMapCoordinates
} from "../hexMap/convertCoordinates";
import {HORIZ_ALIGN_CENTER, VERT_ALIGN_CENTER} from "../ui/constants";

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
  torrinMapIcon: ImageUI;
  torrinMapLocation: HexCoordinate;

  constructor(options: RequiredOptions & Partial<Options>) {
    assertsPositiveNumber(options.width);
    this.width = options.width;
    assertsPositiveNumber(options.height);
    this.height = options.height;

    this.resourceHandler = options.resourceHandler;

    this.cutscene = new Cutscene(
      {
        actions: [
          new SplashScreen({
            id: "splash",
            screenImageResourceKey: "crazy pete face",
            screenDimensions: [this.width, this.height]
          }),
          new DialogueBox({
            id: "welcome",
            name: "Crazy Pete's",
            text: "Welcome to Crazy Pete's!",
            portraitResourceKey: "crazy pete face",
            screenDimensions: [this.width, this.height]
          }),
          new DialogueBox({
            id: "blah",
            name: "Crazy Pete's",
            text: "Blah blah blah blah blahdy blahski!",
            portraitResourceKey: "crazy pete face",
            screenDimensions: [this.width, this.height]
          }),
          new DialogueBox({
            id: "look at this book",
            name: "Crazy Pete's",
            text: "Are you even listening? Look at this book!",
            portraitResourceKey: "crazy pete face",
            screenDimensions: [this.width, this.height]
          }),
          new DialogueBox({
            id: "purchase Offer",
            name: "Crazy Pete's",
            text: "Please buy my book!",
            portraitResourceKey: "crazy pete face",
            answers: ["Okay fine!", "No way!"],
            screenDimensions: [this.width, this.height]
          }),
          new DialogueBox({
            id: "reconsider",
            name: "Crazy Pete's",
            text: "I implore you to reconsider...",
            animationDuration: 100,
            portraitResourceKey: "crazy pete face",
            screenDimensions: [this.width, this.height]
          }),
          new DialogueBox({
            id: "sold",
            name: "Crazy Pete's",
            text: "Thank you, come again!",
            animationDuration: 100,
            portraitResourceKey: "crazy pete face",
            screenDimensions: [this.width, this.height]
          })
        ],
        decisionTriggers: [
          new DecisionTrigger({
            source_dialog_id: "purchase Offer",
            source_dialog_answer: 1,
            destination_dialog_id: "reconsider"
          }),
          new DecisionTrigger({
            source_dialog_id: "purchase Offer",
            source_dialog_answer: 0,
            destination_dialog_id: "sold"
          }),
          new DecisionTrigger({
            source_dialog_id: "reconsider",
            destination_dialog_id: "purchase Offer"
          })
        ],
        screenDimensions: [this.width, this.height],
        resourceHandler: this.resourceHandler,
      }
    );
    this.cutscene.loadResources();

    this.torrinSquaddieId = new SquaddieID({
      id: "0000",
      name: "Torrin",
      resources: new SquaddieResource({
        mapIcon: "map icon young torrin"
      })
    });
    this.resourceHandler.loadResource(this.torrinSquaddieId.resources.mapIcon);

    this.hexMap = new HexMap({
      movementCost: [
        "- - - - - ",
        " x x x x x ",
        "1 1 1 1 1 ",
        " 2 2 2 2 2 ",
        "2 2 2 2 2 ",
      ]
    });

    this.hexMap.highlightTiles(
      [
        {
          q: 0 as Integer,
          r: 0 as Integer,
        },
        {
          q: 2 as Integer,
          r: 0 as Integer,
        }
      ],
      {
        hue: 0,
        saturation: 80,
        brightness: 80,
        lowAlpha: 80,
        highAlpha: 90,
        periodAlpha: 2000,
      },
    );
  }

  draw(p: p5) {
    if (this.cutscene.hasLoaded() && !this.cutscene.isInProgress()) {
      this.cutscene.setResources();
      this.cutscene.start();
    }

    if (
      this.resourceHandler.areAllResourcesLoaded([this.torrinSquaddieId.resources.mapIcon])
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
    const clickedHexCoordinate: HexCoordinate = {q: clickedTileCoordinates[0] as Integer, r: clickedTileCoordinates[1] as Integer};
    if (
      this.hexMap.areCoordinatesOnMap(clickedHexCoordinate)
    ) {
      this.torrinMapLocation = clickedHexCoordinate;
      const xyCoords = convertMapCoordinatesToWorldCoordinates(clickedHexCoordinate.q, clickedHexCoordinate.r);
      this.torrinMapIcon.area.setRectLeft({left: xyCoords[0] + SCREEN_WIDTH / 2});
      this.torrinMapIcon.area.setRectTop({top: xyCoords[1] + SCREEN_HEIGHT / 2});
      this.torrinMapIcon.area.align({horizAlign: HORIZ_ALIGN_CENTER, vertAlign: VERT_ALIGN_CENTER});
    }

    this.hexMap.stopHighlightingTiles();
    this.hexMap.mouseClicked(mouseX, mouseY);
  }
}
