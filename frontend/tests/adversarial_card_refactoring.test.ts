import './setup_env';
import fs from 'fs';
import path from 'path';
import { assert, runner } from './harness';

import {
  ProductCard,
  ProductCardProps,
  areProductCardPropsEqual,
  getCategoryVisuals,
  CATEGORY_VISUALS,
  DEFAULT_VISUAL,
} from '../lib/components/pos/ProductCard';

import {
  ProductCardMedia,
  ProductGlassFooter,
  ProductListItem,
  ProductListThumbnail,
} from '../lib/components/pos/product-card';

import {
  TableCard,
  TableCardProps,
  TableItem,
  areTableCardPropsEqual,
} from '../lib/components/pos/TableCard';

import {
  TableCardHeader,
  TableCardCenter,
  TableCardFooter,
} from '../lib/components/pos/table-card';

export async function runCardRefactoringTests() {
  runner.setContext('Refactoring', 'Card Sub-components');

  await runner.test('ProductCard and TableCard files must not exceed 200 lines', () => {
    const posDir = path.resolve(__dirname, '../lib/components/pos');
    const productCardDir = path.join(posDir, 'product-card');
    const tableCardDir = path.join(posDir, 'table-card');

    const checkDir = (dir: string) => {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && (file.endsWith('.ts') || file.endsWith('.tsx'))) {
          const lines = fs.readFileSync(fullPath, 'utf-8').split('\n').length;
          assert.lessThan(
            lines,
            200,
            `File ${path.relative(posDir, fullPath)} has ${lines} lines, exceeding the 200-line limit!`
          );
        }
      }
    };

    checkDir(productCardDir);
    checkDir(tableCardDir);

    // Also check root facade files
    const pcFacadeLines = fs.readFileSync(path.join(posDir, 'ProductCard.tsx'), 'utf-8').split('\n').length;
    assert.lessThan(pcFacadeLines, 200, 'ProductCard.tsx facade exceeds 200 lines');
    const tcFacadeLines = fs.readFileSync(path.join(posDir, 'TableCard.tsx'), 'utf-8').split('\n').length;
    assert.lessThan(tcFacadeLines, 200, 'TableCard.tsx facade exceeds 200 lines');
  });

  await runner.test('All sub-components and types are properly exported and defined', () => {
    assert.strictEqual(typeof ProductCard, 'object'); // React.memo is object ($$typeof: Symbol(react.memo))
    assert.strictEqual(typeof areProductCardPropsEqual, 'function');
    assert.strictEqual(typeof ProductCardMedia, 'function');
    assert.isTrue(typeof ProductListItem === 'function' || typeof ProductListItem === 'object');
    assert.strictEqual(typeof ProductListThumbnail, 'function');
    assert.strictEqual(typeof getCategoryVisuals, 'function');

    assert.strictEqual(typeof TableCard, 'object');
    assert.strictEqual(typeof areTableCardPropsEqual, 'function');
    assert.strictEqual(typeof TableCardHeader, 'function');
    assert.strictEqual(typeof TableCardCenter, 'function');
    assert.strictEqual(typeof TableCardFooter, 'function');
  });

  await runner.test('areProductCardPropsEqual correctly compares props', () => {
    const p1: ProductCardProps = {
      name: 'Trà Sữa Oolong',
      price: 35000,
      code: 'TS01',
      category: 'Trà Sữa',
      image: 'https://example.com/img.jpg',
      layoutMode: 'grid',
      cartQty: 2,
      isOutOfStock: false,
      onPress: () => {},
      width: '50%',
    };

    const p2: ProductCardProps = {
      ...p1,
      onPress: () => {}, // new function instance
    };

    assert.isTrue(areProductCardPropsEqual(p1, p2), 'Function instance change should NOT invalidate memo');

    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, cartQty: 3 }), 'cartQty change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, price: 40000 }), 'price change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, name: 'Trà Đào' }), 'name change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, isOutOfStock: true }), 'isOutOfStock change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, layoutMode: 'list' }), 'layoutMode change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, image: 'other.jpg' }), 'image change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, code: 'TS02' }), 'code change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, category: 'Ăn Vặt' }), 'category change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, width: '100%' }), 'width change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, onCustomize: () => {} }), 'onCustomize presence change invalidates memo');
    assert.isFalse(areProductCardPropsEqual(p1, { ...p1, onLongPress: () => {} }), 'onLongPress presence change invalidates memo');
  });

  await runner.test('areTableCardPropsEqual correctly compares props', () => {
    const t1: TableCardProps = {
      table: {
        id: 'table-1',
        name: 'Bàn 01',
        area: 'Tầng 1',
        capacity: 4,
        status: 'trong',
        guestCount: 0,
        totalAmount: 0,
        itemCount: 0,
        createdAt: '2026-09-03T10:00:00Z',
      },
      selected: false,
      itemCount: 0,
      onPress: () => {},
      width: '48%',
    };

    const t2: TableCardProps = {
      ...t1,
      onPress: () => {}, // new function instance
    };

    assert.isTrue(areTableCardPropsEqual(t1, t2), 'Different onPress callback instance does NOT bust memoization');

    assert.isFalse(areTableCardPropsEqual(t1, { ...t1, selected: true }), 'selected change invalidates memo');
    assert.isFalse(areTableCardPropsEqual(t1, { ...t1, itemCount: 5 }), 'itemCount change invalidates memo');
    assert.isFalse(areTableCardPropsEqual(t1, { ...t1, width: '100%' }), 'width change invalidates memo');
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, id: 'table-2' } }),
      'table.id change invalidates memo'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, status: 'co_khach' } }),
      'table.status change invalidates memo'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, totalAmount: 150000 } }),
      'table.totalAmount change invalidates memo'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, guestCount: 3 } }),
      'table.guestCount change invalidates memo'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, name: 'Bàn VIP 01' } }),
      'table.name change invalidates memo'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, area: 'Tầng 2' } }),
      'table.area change invalidates memo'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, capacity: 6 } }),
      'table.capacity change invalidates memo'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, itemCount: 3 } }),
      'table.itemCount change invalidates memo'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: { ...t1.table, createdAt: '2026-09-03T12:00:00Z' } }),
      'table.createdAt change invalidates memo'
    );
  });

  await runner.test('Occupied table footer must never display Sẵn sàng even with 0 totalAmount', () => {
    const footerOccupiedZero = TableCardFooter({ totalAmount: 0, isOccupied: true, isReserved: false, elapsedMin: 0 });
    const jsonStr = JSON.stringify(footerOccupiedZero);
    assert.isTrue(jsonStr.includes('Đang ngồi'), 'Occupied table with 0 amount displays Đang ngồi in footer');
    assert.isFalse(jsonStr.includes('Sẵn sàng'), 'Occupied table with 0 amount must NOT display Sẵn sàng');

    const footerVacant = TableCardFooter({ totalAmount: 0, isOccupied: false, isReserved: false });
    const vacantStr = JSON.stringify(footerVacant);
    assert.isTrue(vacantStr.includes('Sẵn sàng'), 'Vacant table displays Sẵn sàng');

    const footerReserved = TableCardFooter({ totalAmount: 0, isOccupied: false, isReserved: true });
    const reservedStr = JSON.stringify(footerReserved);
    assert.isTrue(reservedStr.includes('Khách đã đặt trước'), 'Reserved table displays Khách đã đặt trước');
  });

  await runner.test('Occupied table center handles 0 elapsedMin and 0 items with fallback indicator', () => {
    const centerOccupiedZero = TableCardCenter({
      isOccupied: true,
      isEmpty: false,
      isReserved: false,
      totalAmount: 0,
      activeItemCount: 0,
    });
    const centerStr = JSON.stringify(centerOccupiedZero);
    assert.isTrue(centerStr.includes('Chưa gọi món'), 'Occupied table with 0 amount displays Chưa gọi món in center');
  });

  await runner.test('Category visuals fallback safely for known and unknown categories', () => {
    const traSuaVisuals = getCategoryVisuals('Trà Sữa');
    assert.strictEqual(traSuaVisuals.icon, 'cup-water');

    const caPheVisuals = getCategoryVisuals('Cà Phê');
    assert.strictEqual(caPheVisuals.icon, 'coffee');

    const anVatVisuals = getCategoryVisuals('Ăn Vặt');
    assert.strictEqual(anVatVisuals.icon, 'food-drumstick');

    const nuocEpVisuals = getCategoryVisuals('Nước Ép');
    assert.strictEqual(nuocEpVisuals.icon, 'fruit-cherries');

    const unknownVisuals = getCategoryVisuals('Unknown Category');
    assert.strictEqual(unknownVisuals.icon, DEFAULT_VISUAL.icon);
    assert.strictEqual(unknownVisuals.bg, DEFAULT_VISUAL.bg);
    assert.strictEqual(unknownVisuals.iconColor, DEFAULT_VISUAL.iconColor);

    const undefinedVisuals = getCategoryVisuals(undefined);
    assert.strictEqual(undefinedVisuals.icon, DEFAULT_VISUAL.icon);
  });

  await runner.test('Adversarial Edge Cases: Null table, reference equality, and NaN date safety', () => {
    // 1. Reference equality short-circuits
    const p1: ProductCardProps = {
      name: 'Trà Sữa Oolong',
      price: 35000,
      onPress: () => {},
    };
    assert.isTrue(areProductCardPropsEqual(p1, p1), 'areProductCardPropsEqual identity reference returns true');

    const t1: TableCardProps = {
      table: {
        id: 'table-1',
        name: 'Bàn 01',
        area: 'Tầng 1',
        capacity: 4,
        status: 'co_khach',
        createdAt: 'invalid_date_format',
      },
      onPress: () => {},
    };
    assert.isTrue(areTableCardPropsEqual(t1, t1), 'areTableCardPropsEqual identity reference returns true');

    // 2. Null/undefined table defensive guard
    assert.isFalse(
      areTableCardPropsEqual({ ...t1, table: null as any }, t1),
      'areTableCardPropsEqual safely handles null table in prev without throwing'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, { ...t1, table: undefined as any }),
      'areTableCardPropsEqual safely handles undefined table in next without throwing'
    );

    // 3. TableCardComponent safely handles null table
    const renderedNullTable = (TableCard as any).type ? (TableCard as any).type({ table: null }) : null;
    assert.strictEqual(renderedNullTable, null, 'TableCard returns null when table prop is null/undefined');

    // 4. Invalid createdAt date string evaluates safely in TableCardComponent
    const renderedInvalidDateTable = (TableCard as any).type
      ? (TableCard as any).type({ table: { ...t1.table, createdAt: 'not-a-date' } })
      : null;
    const footerElement = renderedInvalidDateTable?.props?.children?.props?.children?.find(
      (c: any) => c?.type === TableCardFooter
    );
    assert.strictEqual(footerElement?.props?.elapsedMin, 0, 'TableCard with invalid date evaluates elapsedMin to 0');
    const renderedFooter = TableCardFooter(footerElement.props);
    const footerStr = JSON.stringify(renderedFooter);
    assert.isFalse(footerStr.includes('NaN'), 'TableCard with invalid date does not contain NaN');
    assert.isTrue(footerStr.includes('Đang ngồi'), 'TableCard with invalid date falls back to Đang ngồi');

    // 5. ProductGlassFooter handles null/undefined price without throwing
    const footerNullPrice = ProductGlassFooter({ name: 'Trà Chanh', price: null as any });
    const footerNullStr = JSON.stringify(footerNullPrice);
    assert.isTrue(footerNullStr.includes('0 đ'), 'ProductGlassFooter formats null price as 0 đ');

    const footerUndefinedPrice = ProductGlassFooter({ name: 'Trà Chanh', price: undefined as any });
    const footerUndefStr = JSON.stringify(footerUndefinedPrice);
    assert.isTrue(footerUndefStr.includes('0 đ'), 'ProductGlassFooter formats undefined price as 0 đ');

    // 6. ProductListItem handles null/undefined price without throwing
    const ProductListItemComp = (ProductListItem as any).type || ProductListItem;
    const itemNullPrice = ProductListItemComp({ name: 'Trà Đào', price: null as any, onPress: () => {} });
    const itemNullStr = JSON.stringify(itemNullPrice);
    assert.isTrue(itemNullStr.includes('0 đ'), 'ProductListItem formats null price as 0 đ');

    // 7. TableCardHeader long table name truncation & flexShrink
    const headerLongName = TableCardHeader({
      name: 'Bàn VIP 99 Tầng Thượng Ngoài Trời Rộng Rãi',
      capacity: 10,
      isOccupied: true,
    });
    const headerStr = JSON.stringify(headerLongName);
    assert.isTrue(headerStr.includes('flexShrink'), 'TableCardHeader includes flexShrink for robust name truncation');

    // 8. ProductListItem flexShrink on dishName and flexShrink: 0 on inlineSoldOutBadge
    const itemSoldOut = ProductListItemComp({
      name: 'Trà Sữa Trân Châu Đường Đen Khổng Lồ Đặc Biệt 1000ml',
      price: 65000,
      isOutOfStock: true,
      onPress: () => {},
    });
    const itemSoldOutStr = JSON.stringify(itemSoldOut);
    assert.isTrue(itemSoldOutStr.includes('HẾT MÓN (86)'), 'ProductListItem includes sold out badge');
    assert.isTrue(itemSoldOutStr.includes('flexShrink'), 'ProductListItem includes flexShrink on dish name');

    // 9. areTableCardPropsEqual handles completely null/undefined prev and next
    assert.isFalse(
      areTableCardPropsEqual(null as any, t1),
      'areTableCardPropsEqual safely handles null prev without throwing'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, null as any),
      'areTableCardPropsEqual safely handles null next without throwing'
    );
    assert.isFalse(
      areTableCardPropsEqual(undefined as any, t1),
      'areTableCardPropsEqual safely handles undefined prev without throwing'
    );
    assert.isFalse(
      areTableCardPropsEqual(t1, undefined as any),
      'areTableCardPropsEqual safely handles undefined next without throwing'
    );

    // 10. areProductCardPropsEqual handles completely null/undefined prev and next
    assert.isFalse(
      areProductCardPropsEqual(null as any, p1),
      'areProductCardPropsEqual safely handles null prev without throwing'
    );
    assert.isFalse(
      areProductCardPropsEqual(p1, null as any),
      'areProductCardPropsEqual safely handles null next without throwing'
    );
    assert.isFalse(
      areProductCardPropsEqual(undefined as any, p1),
      'areProductCardPropsEqual safely handles undefined prev without throwing'
    );
    assert.isFalse(
      areProductCardPropsEqual(p1, undefined as any),
      'areProductCardPropsEqual safely handles undefined next without throwing'
    );

    // 11. Component rendering safely returns null when props itself is null/undefined
    const renderedNullProductProps = (ProductCard as any).type ? (ProductCard as any).type(null) : null;
    assert.strictEqual(renderedNullProductProps, null, 'ProductCard returns null when props is null');
    const renderedNullTableProps = (TableCard as any).type ? (TableCard as any).type(null) : null;
    assert.strictEqual(renderedNullTableProps, null, 'TableCard returns null when props is null');

    // 12. Future createdAt timestamp evaluates safely to 0 (prevents negative diff / false 1 phút)
    const futureDate = new Date(Date.now() + 3600000).toISOString();
    const renderedFutureDateTable = (TableCard as any).type
      ? (TableCard as any).type({ table: { ...t1.table, createdAt: futureDate } })
      : null;
    const futureCenterElement = renderedFutureDateTable?.props?.children?.props?.children?.find(
      (c: any) => c?.type === TableCardCenter
    );
    assert.strictEqual(futureCenterElement?.props?.elapsedMin, 0, 'TableCard with future date evaluates elapsedMin to 0');
  });
}

// If run directly
if (require.main === module) {
  runCardRefactoringTests().then(() => {
    const success = runner.printSummary();
    if (!success) {
      process.exit(1);
    }
  });
}
