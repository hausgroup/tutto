import type { CatalogSnapshot } from "@/lib/catalog/types";
import type { InventorySnapshot } from "@/lib/inventory/types";
import type {
  CashierSession,
  Order,
  Payment,
} from "@/lib/orders/types";
import type {
  StaffInvitation,
  StaffMember,
  StaffRoleOption,
} from "@/lib/staff/types";
import { createDemoSampleSales } from "@/lib/demo/sample-sales";
import { DEMO_RESTAURANT_ID } from "@/lib/floor/demo-data";

export type DemoRestaurantState = {
  catalog: CatalogSnapshot;
  inventory: InventorySnapshot;
  orders: Order[];
  payments: Payment[];
  cashierSessions: CashierSession[];
  staffMembers: StaffMember[];
  staffInvitations: StaffInvitation[];
  staffRoles: StaffRoleOption[];
  siigoPendingCount: number;
  orderCounter: number;
};

function createInitialDemoRestaurantState(): DemoRestaurantState {
  const restaurantId = DEMO_RESTAURANT_ID;
  const catBurgers = "55555555-5555-4555-8555-555555555501";
  const catDrinks = "55555555-5555-4555-8555-555555555502";
  const burgerProduct = "66666666-6666-4666-8666-666666666601";
  const beerProduct = "66666666-6666-4666-8666-666666666602";
  const coffeeProduct = "66666666-6666-4666-8666-666666666603";

  const sampleSales = createDemoSampleSales({
    products: [
      {
        id: burgerProduct,
        name: "Classic Burger",
        priceMinor: 28000,
        taxRateBps: 800,
        preparationStation: "kitchen",
      },
      {
        id: beerProduct,
        name: "Cerveza",
        priceMinor: 12000,
        taxRateBps: 800,
        preparationStation: "bar",
      },
      {
        id: coffeeProduct,
        name: "Café",
        priceMinor: 6000,
        taxRateBps: 800,
        preparationStation: "bar",
      },
    ],
  });

  return {
    orderCounter: 1000,
    siigoPendingCount: 0,
    staffRoles: [
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        slug: "admin",
        name: "Administrador",
      },
      {
        id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
        slug: "staff",
        name: "Personal",
      },
    ],
    staffMembers: [
      {
        membershipId: "00000000-0000-4000-8000-000000000002",
        userId: "00000000-0000-4000-8000-000000000001",
        restaurantId,
        email: "demo@haus.local",
        fullName: "Demo Admin",
        roleSlug: "admin",
        roleName: "Administrador",
        roleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
      {
        membershipId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1",
        userId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb2",
        restaurantId,
        email: "mesero@haus.local",
        fullName: "Ana Mesera",
        roleSlug: "staff",
        roleName: "Personal",
        roleId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2",
        isActive: true,
        createdAt: new Date().toISOString(),
      },
    ],
    staffInvitations: [],
    catalog: {
      categories: [
        {
          id: catBurgers,
          restaurantId,
          name: "Hamburguesas",
          sortOrder: 1,
          isActive: true,
        },
        {
          id: catDrinks,
          restaurantId,
          name: "Bebidas",
          sortOrder: 2,
          isActive: true,
        },
      ],
      products: [
        {
          id: burgerProduct,
          restaurantId,
          categoryId: catBurgers,
          name: "Classic Burger",
          description: "Carne, queso, vegetales",
          sku: "BRG-001",
          priceMinor: 28000,
          costMinor: 9000,
          taxRateBps: 800,
          isActive: true,
          trackInventory: true,
          preparationStation: "kitchen",
        },
        {
          id: beerProduct,
          restaurantId,
          categoryId: catDrinks,
          name: "Cerveza",
          description: "330ml",
          sku: "BEB-001",
          priceMinor: 12000,
          costMinor: 4000,
          taxRateBps: 800,
          isActive: true,
          trackInventory: false,
          preparationStation: "bar",
        },
        {
          id: coffeeProduct,
          restaurantId,
          categoryId: catDrinks,
          name: "Café",
          description: "Americano",
          sku: "BEB-002",
          priceMinor: 6000,
          costMinor: 1500,
          taxRateBps: 800,
          isActive: true,
          trackInventory: false,
          preparationStation: "bar",
        },
      ],
      modifiers: [
        {
          id: "99999999-9999-4999-8999-999999999901",
          restaurantId,
          productId: burgerProduct,
          name: "Extra queso",
          priceMinorDelta: 3000,
          isActive: true,
          sortOrder: 1,
        },
        {
          id: "99999999-9999-4999-8999-999999999902",
          restaurantId,
          productId: burgerProduct,
          name: "Sin cebolla",
          priceMinorDelta: 0,
          isActive: true,
          sortOrder: 2,
        },
      ],
    },
    inventory: {
      ingredients: [
        {
          id: "77777777-7777-4777-8777-777777777701",
          restaurantId,
          name: "Pan hamburguesa",
          unit: "unit",
          stockQuantity: 120,
          minStockQuantity: 20,
          costMinorPerUnit: 800,
          isActive: true,
        },
        {
          id: "77777777-7777-4777-8777-777777777702",
          restaurantId,
          name: "Carne molida",
          unit: "g",
          stockQuantity: 25000,
          minStockQuantity: 5000,
          costMinorPerUnit: 45,
          isActive: true,
        },
        {
          id: "77777777-7777-4777-8777-777777777703",
          restaurantId,
          name: "Queso",
          unit: "g",
          stockQuantity: 8000,
          minStockQuantity: 1000,
          costMinorPerUnit: 35,
          isActive: true,
        },
      ],
      movements: [],
      recipes: [
        {
          id: "88888888-8888-4888-8888-888888888801",
          restaurantId,
          productId: burgerProduct,
          name: "Classic Burger",
          lines: [
            {
              id: "rl-1",
              recipeId: "88888888-8888-4888-8888-888888888801",
              ingredientId: "77777777-7777-4777-8777-777777777701",
              quantity: 1,
              wastageBps: 0,
            },
            {
              id: "rl-2",
              recipeId: "88888888-8888-4888-8888-888888888801",
              ingredientId: "77777777-7777-4777-8777-777777777702",
              quantity: 150,
              wastageBps: 500,
            },
            {
              id: "rl-3",
              recipeId: "88888888-8888-4888-8888-888888888801",
              ingredientId: "77777777-7777-4777-8777-777777777703",
              quantity: 20,
              wastageBps: 0,
            },
          ],
        },
      ],
    },
    orders: sampleSales.orders,
    payments: sampleSales.payments,
    cashierSessions: [],
  };
}

const globalStore = globalThis as unknown as {
  hausDemoRestaurantStore?: DemoRestaurantState;
};

export function getDemoRestaurantStore(): DemoRestaurantState {
  if (!globalStore.hausDemoRestaurantStore) {
    globalStore.hausDemoRestaurantStore = createInitialDemoRestaurantState();
  }
  return globalStore.hausDemoRestaurantStore;
}

export function resetDemoRestaurantStore() {
  globalStore.hausDemoRestaurantStore = createInitialDemoRestaurantState();
}

export { DEMO_RESTAURANT_ID };
