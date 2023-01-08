import {HorizontalAnchor, RectArea, VerticalAnchor} from "./rectArea";
import {
  HORIZ_ALIGN_CENTER,
  VERT_ALIGN_CENTER,
  WINDOW_SPACING05,
  WINDOW_SPACING1,
  WINDOW_SPACING2,
  WINDOW_SPACING4
} from "./constants";

describe('RectArea', () => {
  describe('RectArea created from Position arguments', () => {
    it('can make a new Rectangle with top, left, width and height', () => {
      const rect = new RectArea({
        top: 0,
        left: 10,
        height: 30,
        width: 20
      });

      expect(rect.top).toBe(0);
      expect(rect.left).toBe(10);
      expect(rect.height).toBe(30);
      expect(rect.width).toBe(20);
    });

    it('can make a new Rectangle with top, left, bottom and right', () => {
      const rect = new RectArea({
        top: 0,
        left: 10,
        bottom: 20,
        right: 30
      });

      expect(rect.top).toBe(0);
      expect(rect.left).toBe(10);
      expect(rect.height).toBe(20);
      expect(rect.width).toBe(20);
    });
  });
  describe('RectArea created from Screen Percentage arguments', () => {
    it('can make a new Rectangle with screen percentage top, left, width and height', () => {
      const rect = new RectArea({
        screenWidth: 1000,
        screenHeight: 500,
        percentTop: 10,
        percentLeft: 20,
        percentHeight: 40,
        percentWidth: 30
      });

      expect(rect.top).toBe(50);
      expect(rect.left).toBe(200);
      expect(rect.height).toBe(200);
      expect(rect.width).toBe(300);
    });

    it('can make a new Rectangle with screen percentage top, left, bottom and right', () => {
      const rect = new RectArea({
        screenWidth: 1000,
        screenHeight: 500,
        percentTop: 10,
        percentLeft: 20,
        percentBottom: 40,
        percentRight: 30
      });

      expect(rect.top).toBe(50);
      expect(rect.left).toBe(200);
      expect(rect.height).toBe(150);
      expect(rect.width).toBe(100);
    });
  });
  describe('RectArea created from 12 point column', () => {
    it('can make a new Rectangle with screen dimensions, start column, end column and top and bottom', () => {
      const rect = new RectArea({
        screenWidth: 1200,
        screenHeight: 500,
        startColumn: 1,
        endColumn: 3,
        top: 20,
        bottom: 100,
      });

      expect(rect.top).toBe(20);
      expect(rect.left).toBe(100);
      expect(rect.height).toBe(80);
      expect(rect.width).toBe(300);
    });

    it('can make a new Rectangle with screen dimensions, start column, end column and percent top and percent bottom', () => {
      const rect = new RectArea({
        screenWidth: 1200,
        screenHeight: 500,
        startColumn: 11,
        endColumn: 12,
        percentTop: 10,
        percentBottom: 30,
      });

      expect(rect.top).toBe(50);
      expect(rect.left).toBe(1100);
      expect(rect.height).toBe(100);
      expect(rect.width).toBe(200);
    });

    it('can make a new Rectangle with screen dimensions, left, end column and top and percent bottom', () => {
      const rect = new RectArea({
        screenWidth: 1200,
        screenHeight: 500,
        left: 100,
        endColumn: 11,
        top: 10,
        percentBottom: 30,
      });

      expect(rect.top).toBe(10);
      expect(rect.left).toBe(100);
      expect(rect.height).toBe(140);
      expect(rect.width).toBe(1100);
    });
  });
  describe('RectArea anchored to another rect', () => {
    it('can create a rect with the same top and left corner', () => {
      const baseRect = new RectArea({
        top: 10,
        left: 20,
        height: 30,
        width: 40
      });

      const rect = new RectArea({
        baseRectangle: baseRect,
        anchorLeft: HorizontalAnchor.LEFT,
        anchorTop: VerticalAnchor.TOP,
        height: 70,
        width: 50,
      });

      expect(rect.top).toBe(baseRect.top);
      expect(rect.left).toBe(baseRect.left);
      expect(rect.height).toBe(70);
      expect(rect.width).toBe(50);
    });
    it('can create a rect in the middle and center', () => {
      const baseRect = new RectArea({
        top: 10,
        left: 20,
        height: 30,
        width: 40
      });

      const rect = new RectArea({
        baseRectangle: baseRect,
        anchorLeft: HorizontalAnchor.MIDDLE,
        anchorTop: VerticalAnchor.CENTER,
        height: 70,
        width: 50,
      });

      expect(rect.top).toBe(baseRect.top + baseRect.height / 2);
      expect(rect.left).toBe(baseRect.left + baseRect.width / 2);
      expect(rect.height).toBe(70);
      expect(rect.width).toBe(50);
    });
    it('can create a rect with the bottom right corner', () => {
      const baseRect = new RectArea({
        top: 10,
        left: 20,
        height: 30,
        width: 40
      });

      const rect = new RectArea({
        baseRectangle: baseRect,
        anchorLeft: HorizontalAnchor.RIGHT,
        anchorTop: VerticalAnchor.BOTTOM,
        height: 70,
        width: 50,
      });

      expect(rect.top).toBe(baseRect.top + baseRect.height);
      expect(rect.left).toBe(baseRect.left + baseRect.width);
      expect(rect.height).toBe(70);
      expect(rect.width).toBe(50);
    });
  });
  describe('RectArea can combine multiple options', () => {
    it('can combine multiple top options', () => {
      const baseRect = new RectArea({
        top: 10,
        left: 20,
        height: 30,
        width: 40
      });

      const rect = new RectArea({
        baseRectangle: baseRect,
        anchorTop: VerticalAnchor.TOP,
        screenHeight: 500,
        percentTop: 10,
        top: 20,
        left: 10,
        height: 70,
        width: 50,
      });

      const expectedPercent = 50;
      const expectedAnchor = 20;

      expect(rect.top).toBe(baseRect.top + expectedAnchor + expectedPercent);
    });

    it('can combine multiple left options', () => {
      const baseRect = new RectArea({
        top: 10,
        left: 20,
        height: 30,
        width: 40
      });

      const rect = new RectArea({
        screenWidth: 1200,
        percentLeft: 20,
        startColumn: 2,
        baseRectangle: baseRect,
        anchorLeft: HorizontalAnchor.LEFT,
        top: 20,
        left: 10,
        height: 70,
        width: 50,
      });

      const expectedColumn = 200;
      const expectedPercent = 240;
      const expectedAnchor = 10;

      expect(rect.left).toBe(baseRect.left + expectedAnchor + expectedPercent + expectedColumn);
    });
  });
  describe('RectArea can apply margins based on another Rect', () => {
    let baseRect: RectArea;
    beforeEach(() => {
      baseRect = new RectArea({
        top: 10,
        left: 20,
        height: 30,
        width: 40
      });
    });

    it('Can apply all margins', ()=>{
      const rect = new RectArea({
        baseRectangle: baseRect,
        margin: WINDOW_SPACING1
      });

      expect(rect.top).toBe(baseRect.top + WINDOW_SPACING1);
      expect(rect.left).toBe(baseRect.left + WINDOW_SPACING1);
      expect(rect.height).toBe(baseRect.height - (WINDOW_SPACING1 + WINDOW_SPACING1));
      expect(rect.width).toBe(baseRect.width - (WINDOW_SPACING1 + WINDOW_SPACING1));
    });

    it('Can apply vertical and horizontal margins', () => {
      const rect = new RectArea({
        baseRectangle: baseRect,
        margin: [WINDOW_SPACING1, WINDOW_SPACING2]
      });

      expect(rect.top).toBe(baseRect.top + WINDOW_SPACING1);
      expect(rect.left).toBe(baseRect.left + WINDOW_SPACING2);
      expect(rect.height).toBe(baseRect.height - (WINDOW_SPACING1 + WINDOW_SPACING1));
      expect(rect.width).toBe(baseRect.width - (WINDOW_SPACING2 + WINDOW_SPACING2));
    });

    it('Can apply top, horizontal, bottom margins', () => {
      const rect = new RectArea({
        baseRectangle: baseRect,
        margin: [WINDOW_SPACING1, WINDOW_SPACING2, WINDOW_SPACING4]
      });

      expect(rect.top).toBe(baseRect.top + WINDOW_SPACING1);
      expect(rect.left).toBe(baseRect.left + WINDOW_SPACING2);
      expect(rect.height).toBe(baseRect.height - (WINDOW_SPACING1 + WINDOW_SPACING4));
      expect(rect.width).toBe(baseRect.width - (WINDOW_SPACING2 + WINDOW_SPACING2));
    });

    it('Can apply top, right, bottom, left margins', () => {
      const rect = new RectArea({
        baseRectangle: baseRect,
        margin: [WINDOW_SPACING1, WINDOW_SPACING2, WINDOW_SPACING4, WINDOW_SPACING05]
      });

      expect(rect.top).toBe(baseRect.top + WINDOW_SPACING1);
      expect(rect.left).toBe(baseRect.left + WINDOW_SPACING05);
      expect(rect.height).toBe(baseRect.height - (WINDOW_SPACING1 + WINDOW_SPACING4));
      expect(rect.width).toBe(baseRect.width - (WINDOW_SPACING2 + WINDOW_SPACING05));
    });

    it('Can apply zero margins', () => {
      const rect = new RectArea({
        baseRectangle: baseRect,
        margin: 0
      });

      expect(rect.top).toBe(baseRect.top);
      expect(rect.left).toBe(baseRect.left);
      expect(rect.height).toBe(baseRect.height);
      expect(rect.width).toBe(baseRect.width);
    });
  });
  describe('RectArea can align width and height', () => {
    it('can make a new Rectangle with top, left, width and height', () => {
      const rect = new RectArea({
        top: 0,
        left: 10,
        height: 30,
        width: 20,
        horizAlign: HORIZ_ALIGN_CENTER,
        vertAlign: VERT_ALIGN_CENTER
      });

      expect(rect.getTop()).toBe(-15);
      expect(rect.getLeft()).toBe(0);
      expect(rect.getRight()).toBe(20);
      expect(rect.getBottom()).toBe(15);
      expect(rect.getHeight()).toBe(30);
      expect(rect.getWidth()).toBe(20);
    });
  });
  describe('RectArea getters', () => {
    it('should return parts of the RectArea', () => {
      const rect = new RectArea({
        top: 0,
        left: 10,
        height: 30,
        width: 40
      });

      expect(rect.getTop()).toBe(0);
      expect(rect.getLeft()).toBe(10);
      expect(rect.getHeight()).toBe(30);
      expect(rect.getWidth()).toBe(40);
      expect(rect.getBottom()).toBe(30);
      expect(rect.getRight()).toBe(50);
      expect(rect.getCenterY()).toBe(15);
      expect(rect.getCenterX()).toBe(30);
    });
  });
});
