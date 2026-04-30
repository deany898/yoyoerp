export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          after_data: Json | null
          before_data: Json | null
          created_at: string
          id: string
          notes: string | null
          row_id: string | null
          table_name: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          row_id?: string | null
          table_name: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          id?: string
          notes?: string | null
          row_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          avg_cost: number
          created_at: string
          id: string
          on_hand: number
          snapshot_date: string
          total_value: number
          variant_id: string
          zone_id: string
        }
        Insert: {
          avg_cost: number
          created_at?: string
          id?: string
          on_hand: number
          snapshot_date: string
          total_value: number
          variant_id: string
          zone_id: string
        }
        Update: {
          avg_cost?: number
          created_at?: string
          id?: string
          on_hand?: number
          snapshot_date?: string
          total_value?: number
          variant_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_snapshots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_snapshots_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          available: number | null
          dispatch: number
          id: string
          on_hand: number
          production: number
          reserved: number
          updated_at: string
          variant_id: string
          wip: number
          zone_id: string
        }
        Insert: {
          available?: number | null
          dispatch?: number
          id?: string
          on_hand?: number
          production?: number
          reserved?: number
          updated_at?: string
          variant_id: string
          wip?: number
          zone_id: string
        }
        Update: {
          available?: number | null
          dispatch?: number
          id?: string
          on_hand?: number
          production?: number
          reserved?: number
          updated_at?: string
          variant_id?: string
          wip?: number
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          is_primary: boolean
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          is_primary?: boolean
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_packaging: {
        Row: {
          created_at: string
          dimensions_mm: Json | null
          id: string
          kind: Database["public"]["Enums"]["packaging_kind"]
          name: string
          pack_weight_grams: number | null
          packaging_variant_id: string | null
          product_id: string
          units_per_pack: number
        }
        Insert: {
          created_at?: string
          dimensions_mm?: Json | null
          id?: string
          kind: Database["public"]["Enums"]["packaging_kind"]
          name: string
          pack_weight_grams?: number | null
          packaging_variant_id?: string | null
          product_id: string
          units_per_pack?: number
        }
        Update: {
          created_at?: string
          dimensions_mm?: Json | null
          id?: string
          kind?: Database["public"]["Enums"]["packaging_kind"]
          name?: string
          pack_weight_grams?: number | null
          packaging_variant_id?: string | null
          product_id?: string
          units_per_pack?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_packaging_packaging_variant_id_fkey"
            columns: ["packaging_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_packaging_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_pricing_tiers: {
        Row: {
          created_at: string
          currency: string
          id: string
          min_qty: number
          price: number
          tier_name: string
          valid_from: string | null
          valid_until: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          min_qty?: number
          price: number
          tier_name: string
          valid_from?: string | null
          valid_until?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          min_qty?: number
          price?: number
          tier_name?: string
          valid_from?: string | null
          valid_until?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_pricing_tiers_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json
          avg_cost: number
          barcode: string | null
          cost_currency: string
          created_at: string
          id: string
          is_active: boolean
          last_cost: number
          product_id: string
          reorder_point: number
          reorder_qty: number
          safety_stock: number
          sku: string
          updated_at: string
          variant_name: string
          weight_grams: number | null
        }
        Insert: {
          attributes?: Json
          avg_cost?: number
          barcode?: string | null
          cost_currency?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_cost?: number
          product_id: string
          reorder_point?: number
          reorder_qty?: number
          safety_stock?: number
          sku: string
          updated_at?: string
          variant_name: string
          weight_grams?: number | null
        }
        Update: {
          attributes?: Json
          avg_cost?: number
          barcode?: string | null
          cost_currency?: string
          created_at?: string
          id?: string
          is_active?: boolean
          last_cost?: number
          product_id?: string
          reorder_point?: number
          reorder_qty?: number
          safety_stock?: number
          sku?: string
          updated_at?: string
          variant_name?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          name: string
          product_type: Database["public"]["Enums"]["product_type"]
          specifications: Json
          uom: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          product_type?: Database["public"]["Enums"]["product_type"]
          specifications?: Json
          uom?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          specifications?: Json
          uom?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          from_zone_id: string | null
          id: string
          notes: string | null
          performed_at: string
          performed_by: string | null
          qty: number
          reason: Database["public"]["Enums"]["movement_reason"]
          reference_id: string | null
          reference_type: string | null
          to_zone_id: string | null
          unit_cost: number | null
          variant_id: string
        }
        Insert: {
          from_zone_id?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          qty: number
          reason: Database["public"]["Enums"]["movement_reason"]
          reference_id?: string | null
          reference_type?: string | null
          to_zone_id?: string | null
          unit_cost?: number | null
          variant_id: string
        }
        Update: {
          from_zone_id?: string | null
          id?: string
          notes?: string | null
          performed_at?: string
          performed_by?: string | null
          qty?: number
          reason?: Database["public"]["Enums"]["movement_reason"]
          reference_id?: string | null
          reference_type?: string | null
          to_zone_id?: string | null
          unit_cost?: number | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_from_zone_id_fkey"
            columns: ["from_zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_to_zone_id_fkey"
            columns: ["to_zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      warehouse_zones: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["zone_kind"]
          name: string
          warehouse_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["zone_kind"]
          name: string
          warehouse_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["zone_kind"]
          name?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_zones_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          city: string | null
          code: string
          country: string
          created_at: string
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          country?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          state?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "manager"
        | "requestor"
        | "supervisor"
        | "sales"
        | "dispatch"
        | "worker"
        | "customer"
      movement_reason:
        | "receipt"
        | "consumption"
        | "production_output"
        | "transfer"
        | "adjustment"
        | "dispatch"
        | "reservation"
        | "release"
        | "return"
        | "scrap"
        | "opening_balance"
      packaging_kind: "poly" | "carton" | "box" | "label" | "pallet" | "other"
      product_type: "raw_material" | "packaging" | "finished_good" | "wip"
      zone_kind:
        | "raw_material"
        | "wip"
        | "finished_good"
        | "packaging"
        | "dispatch"
        | "quarantine"
        | "returns"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "admin",
        "manager",
        "requestor",
        "supervisor",
        "sales",
        "dispatch",
        "worker",
        "customer",
      ],
      movement_reason: [
        "receipt",
        "consumption",
        "production_output",
        "transfer",
        "adjustment",
        "dispatch",
        "reservation",
        "release",
        "return",
        "scrap",
        "opening_balance",
      ],
      packaging_kind: ["poly", "carton", "box", "label", "pallet", "other"],
      product_type: ["raw_material", "packaging", "finished_good", "wip"],
      zone_kind: [
        "raw_material",
        "wip",
        "finished_good",
        "packaging",
        "dispatch",
        "quarantine",
        "returns",
        "other",
      ],
    },
  },
} as const
