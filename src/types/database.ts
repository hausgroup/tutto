export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type LooseTable = {
  Row: Record<string, unknown>;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string;
          phone?: string | null;
          is_active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      restaurant_memberships: {
        Row: {
          id: string;
          restaurant_id: string;
          user_id: string;
          role_id: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          user_id: string;
          role_id: string;
          is_active?: boolean;
        };
        Update: Partial<
          Database["public"]["Tables"]["restaurant_memberships"]["Insert"]
        >;
        Relationships: [];
      };
      restaurants: {
        Row: {
          id: string;
          business_id: string;
          name: string;
          slug: string;
          timezone: string;
          currency_code: string;
          is_active: boolean;
        };
        Insert: {
          business_id: string;
          name: string;
          slug: string;
        };
        Update: Partial<{
          name: string;
          slug: string;
          is_active: boolean;
        }>;
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          slug: string;
          name: string;
        };
        Insert: {
          slug: string;
          name: string;
        };
        Update: Partial<{
          slug: string;
          name: string;
        }>;
        Relationships: [];
      };
      permissions: {
        Row: {
          id: string;
          slug: string;
          name: string;
        };
        Insert: {
          slug: string;
          name: string;
        };
        Update: Partial<{
          slug: string;
          name: string;
        }>;
        Relationships: [];
      };
      role_permissions: {
        Row: {
          role_id: string;
          permission_id: string;
        };
        Insert: {
          role_id: string;
          permission_id: string;
        };
        Update: Partial<{
          role_id: string;
          permission_id: string;
        }>;
        Relationships: [];
      };
      floor_areas: {
        Row: {
          id: string;
          restaurant_id: string;
          name: string;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          name?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      restaurant_tables: {
        Row: {
          id: string;
          restaurant_id: string;
          floor_area_id: string;
          label: string;
          capacity: number;
          status: string;
          pos_x: number;
          pos_y: number;
          width: number;
          height: number;
          rotation_deg: number;
          shape: string;
          is_active: boolean;
          reservation_guest_name: string | null;
          reservation_party_size: number | null;
          reservation_occasion: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          restaurant_id: string;
          floor_area_id: string;
          label: string;
          capacity: number;
          shape?: string;
          status?: string;
          pos_x?: number;
          pos_y?: number;
          width?: number;
          height?: number;
          rotation_deg?: number;
          is_active?: boolean;
          reservation_guest_name?: string | null;
          reservation_party_size?: number | null;
          reservation_occasion?: string | null;
        };
        Update: {
          floor_area_id?: string;
          label?: string;
          capacity?: number;
          status?: string;
          pos_x?: number;
          pos_y?: number;
          width?: number;
          height?: number;
          rotation_deg?: number;
          shape?: string;
          is_active?: boolean;
          reservation_guest_name?: string | null;
          reservation_party_size?: number | null;
          reservation_occasion?: string | null;
        };
        Relationships: [];
      };
      product_categories: LooseTable;
      products: LooseTable;
      product_modifiers: LooseTable;
      ingredients: LooseTable;
      recipes: LooseTable;
      recipe_lines: LooseTable;
      inventory_movements: LooseTable;
      orders: LooseTable;
      order_items: LooseTable;
      order_item_modifiers: LooseTable;
      payments: LooseTable;
      cashier_sessions: LooseTable;
      staff_invitations: LooseTable;
      siigo_sync_jobs: LooseTable;
    };
    Views: Record<string, never>;
    Functions: {
      is_restaurant_member: {
        Args: { p_restaurant_id: string };
        Returns: boolean;
      };
      user_has_permission: {
        Args: { p_restaurant_id: string; p_permission_slug: string };
        Returns: boolean;
      };
      consume_product_recipe_stock: {
        Args: {
          p_restaurant_id: string;
          p_product_id: string;
          p_quantity: number;
          p_reference_id: string | null;
        };
        Returns: undefined;
      };
    };
    Enums: {
      table_status: string;
      siigo_sync_status: string;
      audit_action: string;
    };
  };
};
