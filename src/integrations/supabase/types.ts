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
      bom_lines: {
        Row: {
          bom_id: string
          component_variant_id: string
          created_at: string
          id: string
          notes: string | null
          qty_per: number
          scrap_pct: number
          uom: string
        }
        Insert: {
          bom_id: string
          component_variant_id: string
          created_at?: string
          id?: string
          notes?: string | null
          qty_per?: number
          scrap_pct?: number
          uom?: string
        }
        Update: {
          bom_id?: string
          component_variant_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          qty_per?: number
          scrap_pct?: number
          uom?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_bom_id_fkey"
            columns: ["bom_id"]
            isOneToOne: false
            referencedRelation: "bom_master"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_component_variant_id_fkey"
            columns: ["component_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_master: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          notes: string | null
          updated_at: string
          variant_id: string
          version: number
          yield_qty: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          variant_id: string
          version?: number
          yield_qty?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          updated_at?: string
          variant_id?: string
          version?: number
          yield_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_master_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
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
      custom_field_definitions: {
        Row: {
          category_id: string | null
          created_at: string
          field_type: string
          id: string
          is_required: boolean
          name: string
          options: Json | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          field_type: string
          id?: string
          is_required?: boolean
          name: string
          options?: Json | null
        }
        Update: {
          category_id?: string | null
          created_at?: string
          field_type?: string
          id?: string
          is_required?: boolean
          name?: string
          options?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "custom_field_definitions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: string | null
          city: string | null
          code: string
          contact_name: string | null
          country: string
          created_at: string
          created_by: string | null
          delivery_address: string | null
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          pan_number: string | null
          payment_terms: string | null
          phone: string | null
          pricing_tier: string
          state: string | null
          transporter: string | null
          updated_at: string
        }
        Insert: {
          billing_address?: string | null
          city?: string | null
          code: string
          contact_name?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          pricing_tier?: string
          state?: string | null
          transporter?: string | null
          updated_at?: string
        }
        Update: {
          billing_address?: string | null
          city?: string | null
          code?: string
          contact_name?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          delivery_address?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          pan_number?: string | null
          payment_terms?: string | null
          phone?: string | null
          pricing_tier?: string
          state?: string | null
          transporter?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      dispatch_order_lines: {
        Row: {
          created_at: string
          custom_fields: Json
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          dispatch_order_id: string
          freight_cost: number
          id: string
          line_total: number
          notes: string | null
          other_charges: number
          packing_cost: number
          qty: number
          tax_rate: number
          unit_cost: number
          unit_price: number
          uom: string
          variant_id: string
          wholesale_price: number
        }
        Insert: {
          created_at?: string
          custom_fields?: Json
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          dispatch_order_id: string
          freight_cost?: number
          id?: string
          line_total?: number
          notes?: string | null
          other_charges?: number
          packing_cost?: number
          qty: number
          tax_rate?: number
          unit_cost?: number
          unit_price?: number
          uom?: string
          variant_id: string
          wholesale_price?: number
        }
        Update: {
          created_at?: string
          custom_fields?: Json
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          dispatch_order_id?: string
          freight_cost?: number
          id?: string
          line_total?: number
          notes?: string | null
          other_charges?: number
          packing_cost?: number
          qty?: number
          tax_rate?: number
          unit_cost?: number
          unit_price?: number
          uom?: string
          variant_id?: string
          wholesale_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_order_lines_dispatch_order_id_fkey"
            columns: ["dispatch_order_id"]
            isOneToOne: false
            referencedRelation: "dispatch_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_order_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      dispatch_orders: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          billing_address: string | null
          created_at: string
          created_by: string | null
          currency: string
          customer_id: string
          delivered_at: string | null
          delivery_address: string | null
          discount_total: number
          dispatched_at: string | null
          do_number: string
          expected_dispatch_date: string | null
          freight_cost: number
          grand_total: number
          id: string
          lr_number: string | null
          margin_total: number
          notes: string | null
          order_date: string
          other_charges: number
          packing_cost: number
          pricing_tier: string | null
          status: Database["public"]["Enums"]["dispatch_status"]
          subtotal: number
          tax_total: number
          transporter: string | null
          updated_at: string
          vehicle_number: string | null
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          billing_address?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id: string
          delivered_at?: string | null
          delivery_address?: string | null
          discount_total?: number
          dispatched_at?: string | null
          do_number: string
          expected_dispatch_date?: string | null
          freight_cost?: number
          grand_total?: number
          id?: string
          lr_number?: string | null
          margin_total?: number
          notes?: string | null
          order_date?: string
          other_charges?: number
          packing_cost?: number
          pricing_tier?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          subtotal?: number
          tax_total?: number
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          billing_address?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          customer_id?: string
          delivered_at?: string | null
          delivery_address?: string | null
          discount_total?: number
          dispatched_at?: string | null
          do_number?: string
          expected_dispatch_date?: string | null
          freight_cost?: number
          grand_total?: number
          id?: string
          lr_number?: string | null
          margin_total?: number
          notes?: string | null
          order_date?: string
          other_charges?: number
          packing_cost?: number
          pricing_tier?: string | null
          status?: Database["public"]["Enums"]["dispatch_status"]
          subtotal?: number
          tax_total?: number
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dispatch_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dispatch_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      doc_number_counters: {
        Row: {
          doc_date: string
          doc_type: string
          last_seq: number
        }
        Insert: {
          doc_date: string
          doc_type: string
          last_seq?: number
        }
        Update: {
          doc_date?: string
          doc_type?: string
          last_seq?: number
        }
        Relationships: []
      }
      goods_return_lines: {
        Row: {
          condition: Database["public"]["Enums"]["gr_condition"]
          created_at: string
          goods_return_id: string
          id: string
          line_total: number
          notes: string | null
          qty: number
          reason: Database["public"]["Enums"]["gr_reason"]
          restock_zone_id: string | null
          unit_price: number
          variant_id: string
        }
        Insert: {
          condition?: Database["public"]["Enums"]["gr_condition"]
          created_at?: string
          goods_return_id: string
          id?: string
          line_total?: number
          notes?: string | null
          qty: number
          reason?: Database["public"]["Enums"]["gr_reason"]
          restock_zone_id?: string | null
          unit_price?: number
          variant_id: string
        }
        Update: {
          condition?: Database["public"]["Enums"]["gr_condition"]
          created_at?: string
          goods_return_id?: string
          id?: string
          line_total?: number
          notes?: string | null
          qty?: number
          reason?: Database["public"]["Enums"]["gr_reason"]
          restock_zone_id?: string | null
          unit_price?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_return_lines_goods_return_id_fkey"
            columns: ["goods_return_id"]
            isOneToOne: false
            referencedRelation: "goods_returns"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_returns: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          customer_id: string
          dispatch_order_id: string | null
          gr_number: string
          id: string
          notes: string | null
          reason: Database["public"]["Enums"]["gr_reason"] | null
          received_at: string | null
          refund_amount: number
          return_date: string
          status: Database["public"]["Enums"]["gr_status"]
          updated_at: string
          warehouse_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id: string
          dispatch_order_id?: string | null
          gr_number: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["gr_reason"] | null
          received_at?: string | null
          refund_amount?: number
          return_date?: string
          status?: Database["public"]["Enums"]["gr_status"]
          updated_at?: string
          warehouse_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string
          dispatch_order_id?: string | null
          gr_number?: string
          id?: string
          notes?: string | null
          reason?: Database["public"]["Enums"]["gr_reason"] | null
          received_at?: string | null
          refund_amount?: number
          return_date?: string
          status?: Database["public"]["Enums"]["gr_status"]
          updated_at?: string
          warehouse_id?: string | null
        }
        Relationships: []
      }
      inventory_request_lines: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          qty_fulfilled: number
          qty_requested: number
          request_id: string
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          qty_fulfilled?: number
          qty_requested: number
          request_id: string
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          qty_fulfilled?: number
          qty_requested?: number
          request_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_request_lines_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "inventory_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_request_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          fulfilled_at: string | null
          id: string
          notes: string | null
          reason: string | null
          request_number: string
          requested_by: string | null
          status: Database["public"]["Enums"]["request_status"]
          updated_at: string
          warehouse_id: string | null
          zone_id: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          request_number: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          warehouse_id?: string | null
          zone_id?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          fulfilled_at?: string | null
          id?: string
          notes?: string | null
          reason?: string | null
          request_number?: string
          requested_by?: string | null
          status?: Database["public"]["Enums"]["request_status"]
          updated_at?: string
          warehouse_id?: string | null
          zone_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_requests_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_requests_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
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
      machines: {
        Row: {
          code: string
          created_at: string
          hourly_rate: number
          id: string
          is_active: boolean
          name: string
          notes: string | null
          station_id: string | null
          status: Database["public"]["Enums"]["machine_status"]
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["machine_status"]
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          station_id?: string | null
          status?: Database["public"]["Enums"]["machine_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "machines_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturing_orders: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          created_by: string | null
          id: string
          mo_number: string
          notes: string | null
          planned_end: string | null
          planned_start: string | null
          qty_planned: number
          qty_produced: number
          qty_scrapped: number
          source_do_id: string | null
          status: Database["public"]["Enums"]["mo_status"]
          updated_at: string
          variant_id: string
          warehouse_id: string | null
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mo_number: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          qty_planned: number
          qty_produced?: number
          qty_scrapped?: number
          source_do_id?: string | null
          status?: Database["public"]["Enums"]["mo_status"]
          updated_at?: string
          variant_id: string
          warehouse_id?: string | null
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          mo_number?: string
          notes?: string | null
          planned_end?: string | null
          planned_start?: string | null
          qty_planned?: number
          qty_produced?: number
          qty_scrapped?: number
          source_do_id?: string | null
          status?: Database["public"]["Enums"]["mo_status"]
          updated_at?: string
          variant_id?: string
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "manufacturing_orders_source_do_id_fkey"
            columns: ["source_do_id"]
            isOneToOne: false
            referencedRelation: "dispatch_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manufacturing_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      mo_material_issues: {
        Row: {
          from_zone_id: string | null
          id: string
          mo_id: string
          movement_id: string | null
          notes: string | null
          posted_at: string
          posted_by: string | null
          qty: number
          variant_id: string
        }
        Insert: {
          from_zone_id?: string | null
          id?: string
          mo_id: string
          movement_id?: string | null
          notes?: string | null
          posted_at?: string
          posted_by?: string | null
          qty: number
          variant_id: string
        }
        Update: {
          from_zone_id?: string | null
          id?: string
          mo_id?: string
          movement_id?: string | null
          notes?: string | null
          posted_at?: string
          posted_by?: string | null
          qty?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mo_material_issues_from_zone_id_fkey"
            columns: ["from_zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_material_issues_mo_id_fkey"
            columns: ["mo_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_material_issues_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_material_issues_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      mo_outputs: {
        Row: {
          id: string
          mo_id: string
          movement_id: string | null
          notes: string | null
          posted_at: string
          posted_by: string | null
          qty: number
          to_zone_id: string | null
          variant_id: string
        }
        Insert: {
          id?: string
          mo_id: string
          movement_id?: string | null
          notes?: string | null
          posted_at?: string
          posted_by?: string | null
          qty: number
          to_zone_id?: string | null
          variant_id: string
        }
        Update: {
          id?: string
          mo_id?: string
          movement_id?: string | null
          notes?: string | null
          posted_at?: string
          posted_by?: string | null
          qty?: number
          to_zone_id?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mo_outputs_mo_id_fkey"
            columns: ["mo_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_outputs_movement_id_fkey"
            columns: ["movement_id"]
            isOneToOne: false
            referencedRelation: "stock_movements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_outputs_to_zone_id_fkey"
            columns: ["to_zone_id"]
            isOneToOne: false
            referencedRelation: "warehouse_zones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_outputs_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      mo_stage_runs: {
        Row: {
          cavity_used: number | null
          created_at: string
          ended_at: string | null
          id: string
          machine_id: string | null
          material_grams: number
          material_variant_id: string | null
          mo_id: string
          mould_id: string | null
          notes: string | null
          qty_in: number
          qty_out: number
          qty_rework: number
          qty_scrap: number
          shots_good: number
          shots_scrap: number
          stage_id: string | null
          stage_kind: Database["public"]["Enums"]["stage_kind"]
          started_at: string | null
          units_produced: number
          worker_id: string | null
        }
        Insert: {
          cavity_used?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          machine_id?: string | null
          material_grams?: number
          material_variant_id?: string | null
          mo_id: string
          mould_id?: string | null
          notes?: string | null
          qty_in?: number
          qty_out?: number
          qty_rework?: number
          qty_scrap?: number
          shots_good?: number
          shots_scrap?: number
          stage_id?: string | null
          stage_kind?: Database["public"]["Enums"]["stage_kind"]
          started_at?: string | null
          units_produced?: number
          worker_id?: string | null
        }
        Update: {
          cavity_used?: number | null
          created_at?: string
          ended_at?: string | null
          id?: string
          machine_id?: string | null
          material_grams?: number
          material_variant_id?: string | null
          mo_id?: string
          mould_id?: string | null
          notes?: string | null
          qty_in?: number
          qty_out?: number
          qty_rework?: number
          qty_scrap?: number
          shots_good?: number
          shots_scrap?: number
          stage_id?: string | null
          stage_kind?: Database["public"]["Enums"]["stage_kind"]
          started_at?: string | null
          units_produced?: number
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mo_stage_runs_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_stage_runs_material_variant_id_fkey"
            columns: ["material_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_stage_runs_mo_id_fkey"
            columns: ["mo_id"]
            isOneToOne: false
            referencedRelation: "manufacturing_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_stage_runs_mould_id_fkey"
            columns: ["mould_id"]
            isOneToOne: false
            referencedRelation: "moulds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_stage_runs_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "production_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mo_stage_runs_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      mould_machine_compat: {
        Row: {
          created_at: string
          machine_id: string
          mould_id: string
        }
        Insert: {
          created_at?: string
          machine_id: string
          mould_id: string
        }
        Update: {
          created_at?: string
          machine_id?: string
          mould_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mould_machine_compat_machine_id_fkey"
            columns: ["machine_id"]
            isOneToOne: false
            referencedRelation: "machines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mould_machine_compat_mould_id_fkey"
            columns: ["mould_id"]
            isOneToOne: false
            referencedRelation: "moulds"
            referencedColumns: ["id"]
          },
        ]
      }
      moulds: {
        Row: {
          cavity_count: number
          code: string
          created_at: string
          id: string
          is_active: boolean
          life_cycles: number
          name: string
          notes: string | null
          updated_at: string
          used_cycles: number
        }
        Insert: {
          cavity_count?: number
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          life_cycles?: number
          name: string
          notes?: string | null
          updated_at?: string
          used_cycles?: number
        }
        Update: {
          cavity_count?: number
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          life_cycles?: number
          name?: string
          notes?: string | null
          updated_at?: string
          used_cycles?: number
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string | null
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string | null
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      po_documents: {
        Row: {
          created_at: string
          file_name: string
          id: string
          kind: Database["public"]["Enums"]["po_document_kind"]
          mime_type: string | null
          po_id: string
          size_bytes: number | null
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          id?: string
          kind: Database["public"]["Enums"]["po_document_kind"]
          mime_type?: string | null
          po_id: string
          size_bytes?: number | null
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          id?: string
          kind?: Database["public"]["Enums"]["po_document_kind"]
          mime_type?: string | null
          po_id?: string
          size_bytes?: number | null
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "po_documents_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cost_snapshots: {
        Row: {
          breakdown: Json
          costing_method: Database["public"]["Enums"]["costing_method"]
          delta_pct: number
          effective_cost: number
          id: string
          manufacture_cost: number
          purchase_cost: number
          snapshot_at: string
          sourcing_type: Database["public"]["Enums"]["sourcing_type"]
          variant_id: string
        }
        Insert: {
          breakdown?: Json
          costing_method: Database["public"]["Enums"]["costing_method"]
          delta_pct?: number
          effective_cost?: number
          id?: string
          manufacture_cost?: number
          purchase_cost?: number
          snapshot_at?: string
          sourcing_type: Database["public"]["Enums"]["sourcing_type"]
          variant_id: string
        }
        Update: {
          breakdown?: Json
          costing_method?: Database["public"]["Enums"]["costing_method"]
          delta_pct?: number
          effective_cost?: number
          id?: string
          manufacture_cost?: number
          purchase_cost?: number
          snapshot_at?: string
          sourcing_type?: Database["public"]["Enums"]["sourcing_type"]
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_cost_snapshots_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
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
          base_variant_id: string | null
          cost_currency: string
          cost_updated_at: string
          created_at: string
          effective_cost: number
          id: string
          is_active: boolean
          last_cost: number
          manufacture_cost: number
          pack_labour_cost: number
          pack_material_cost: number
          pack_overhead_cost: number
          product_id: string
          purchase_cost: number
          reorder_point: number
          reorder_qty: number
          safety_stock: number
          sku: string
          units_per_pack: number
          updated_at: string
          variant_kind: Database["public"]["Enums"]["variant_kind"]
          variant_name: string
          weight_grams: number | null
        }
        Insert: {
          attributes?: Json
          avg_cost?: number
          barcode?: string | null
          base_variant_id?: string | null
          cost_currency?: string
          cost_updated_at?: string
          created_at?: string
          effective_cost?: number
          id?: string
          is_active?: boolean
          last_cost?: number
          manufacture_cost?: number
          pack_labour_cost?: number
          pack_material_cost?: number
          pack_overhead_cost?: number
          product_id: string
          purchase_cost?: number
          reorder_point?: number
          reorder_qty?: number
          safety_stock?: number
          sku: string
          units_per_pack?: number
          updated_at?: string
          variant_kind?: Database["public"]["Enums"]["variant_kind"]
          variant_name: string
          weight_grams?: number | null
        }
        Update: {
          attributes?: Json
          avg_cost?: number
          barcode?: string | null
          base_variant_id?: string | null
          cost_currency?: string
          cost_updated_at?: string
          created_at?: string
          effective_cost?: number
          id?: string
          is_active?: boolean
          last_cost?: number
          manufacture_cost?: number
          pack_labour_cost?: number
          pack_material_cost?: number
          pack_overhead_cost?: number
          product_id?: string
          purchase_cost?: number
          reorder_point?: number
          reorder_qty?: number
          safety_stock?: number
          sku?: string
          units_per_pack?: number
          updated_at?: string
          variant_kind?: Database["public"]["Enums"]["variant_kind"]
          variant_name?: string
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_base_variant_id_fkey"
            columns: ["base_variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      production_stages: {
        Row: {
          created_at: string
          id: string
          labour_cost: number
          machine_cost: number
          mould_cost: number
          notes: string | null
          overhead_cost: number
          qc_cost: number
          rejection_pct: number
          sequence: number
          stage_kind: Database["public"]["Enums"]["stage_kind"]
          stage_name: string
          utility_cost: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          labour_cost?: number
          machine_cost?: number
          mould_cost?: number
          notes?: string | null
          overhead_cost?: number
          qc_cost?: number
          rejection_pct?: number
          sequence?: number
          stage_kind?: Database["public"]["Enums"]["stage_kind"]
          stage_name: string
          utility_cost?: number
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          labour_cost?: number
          machine_cost?: number
          mould_cost?: number
          notes?: string | null
          overhead_cost?: number
          qc_cost?: number
          rejection_pct?: number
          sequence?: number
          stage_kind?: Database["public"]["Enums"]["stage_kind"]
          stage_name?: string
          utility_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_stages_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          code: string
          costing_method: Database["public"]["Enums"]["costing_method"]
          created_at: string
          created_by: string | null
          description: string | null
          hsn_code: string | null
          id: string
          is_active: boolean
          name: string
          preferred_cost_source: string | null
          preferred_supplier_id: string | null
          product_type: Database["public"]["Enums"]["product_type"]
          sourcing_type: Database["public"]["Enums"]["sourcing_type"]
          sourcing_type_override:
            | Database["public"]["Enums"]["sourcing_type"]
            | null
          specifications: Json
          uom: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          code: string
          costing_method?: Database["public"]["Enums"]["costing_method"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name: string
          preferred_cost_source?: string | null
          preferred_supplier_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          sourcing_type?: Database["public"]["Enums"]["sourcing_type"]
          sourcing_type_override?:
            | Database["public"]["Enums"]["sourcing_type"]
            | null
          specifications?: Json
          uom?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          code?: string
          costing_method?: Database["public"]["Enums"]["costing_method"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          hsn_code?: string | null
          id?: string
          is_active?: boolean
          name?: string
          preferred_cost_source?: string | null
          preferred_supplier_id?: string | null
          product_type?: Database["public"]["Enums"]["product_type"]
          sourcing_type?: Database["public"]["Enums"]["sourcing_type"]
          sourcing_type_override?:
            | Database["public"]["Enums"]["sourcing_type"]
            | null
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
          {
            foreignKeyName: "products_preferred_supplier_id_fkey"
            columns: ["preferred_supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
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
      purchase_cost_history: {
        Row: {
          id: string
          landed_cost: number
          po_id: string | null
          qty: number
          received_at: string
          supplier_id: string | null
          unit_cost: number
          variant_id: string
        }
        Insert: {
          id?: string
          landed_cost: number
          po_id?: string | null
          qty: number
          received_at?: string
          supplier_id?: string | null
          unit_cost: number
          variant_id: string
        }
        Update: {
          id?: string
          landed_cost?: number
          po_id?: string | null
          qty?: number
          received_at?: string
          supplier_id?: string | null
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_cost_history_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_cost_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_cost_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          created_at: string
          id: string
          line_total: number
          notes: string | null
          po_id: string
          qty_ordered: number
          qty_received: number
          tax_rate: number
          unit_cost: number
          variant_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          line_total?: number
          notes?: string | null
          po_id: string
          qty_ordered: number
          qty_received?: number
          tax_rate?: number
          unit_cost?: number
          variant_id: string
        }
        Update: {
          created_at?: string
          id?: string
          line_total?: number
          notes?: string | null
          po_id?: string
          qty_ordered?: number
          qty_received?: number
          tax_rate?: number
          unit_cost?: number
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          arrival_date: string | null
          created_at: string
          created_by: string | null
          currency: string
          expected_date: string | null
          freight_cost: number
          id: string
          lr_number: string | null
          notes: string | null
          order_date: string
          other_charges: number
          pickup_cost: number
          po_number: string
          received_date: string | null
          status: Database["public"]["Enums"]["po_status"]
          subtotal: number
          supplier_dispatch_date: string | null
          supplier_id: string
          supplier_invoice_no: string | null
          tax_total: number
          total: number
          transporter: string | null
          updated_at: string
          vehicle_number: string | null
          warehouse_id: string | null
        }
        Insert: {
          arrival_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_date?: string | null
          freight_cost?: number
          id?: string
          lr_number?: string | null
          notes?: string | null
          order_date?: string
          other_charges?: number
          pickup_cost?: number
          po_number: string
          received_date?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_dispatch_date?: string | null
          supplier_id: string
          supplier_invoice_no?: string | null
          tax_total?: number
          total?: number
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Update: {
          arrival_date?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          expected_date?: string | null
          freight_cost?: number
          id?: string
          lr_number?: string | null
          notes?: string | null
          order_date?: string
          other_charges?: number
          pickup_cost?: number
          po_number?: string
          received_date?: string | null
          status?: Database["public"]["Enums"]["po_status"]
          subtotal?: number
          supplier_dispatch_date?: string | null
          supplier_id?: string
          supplier_invoice_no?: string | null
          tax_total?: number
          total?: number
          transporter?: string | null
          updated_at?: string
          vehicle_number?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_group_lines: {
        Row: {
          created_at: string
          group_id: string
          id: string
          labour_cost: number
          machine_cost: number
          mould_cost: number
          notes: string | null
          overhead_cost: number
          qc_cost: number
          rejection_pct: number
          sequence: number
          stage_kind: Database["public"]["Enums"]["stage_kind"]
          stage_name: string
          utility_cost: number
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          labour_cost?: number
          machine_cost?: number
          mould_cost?: number
          notes?: string | null
          overhead_cost?: number
          qc_cost?: number
          rejection_pct?: number
          sequence?: number
          stage_kind?: Database["public"]["Enums"]["stage_kind"]
          stage_name: string
          utility_cost?: number
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          labour_cost?: number
          machine_cost?: number
          mould_cost?: number
          notes?: string | null
          overhead_cost?: number
          qc_cost?: number
          rejection_pct?: number
          sequence?: number
          stage_kind?: Database["public"]["Enums"]["stage_kind"]
          stage_name?: string
          utility_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "stage_group_lines_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "stage_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_groups: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      stations: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          updated_at?: string
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
      supplier_product_quotes: {
        Row: {
          created_at: string
          created_by: string | null
          currency: string
          freight_cost: number
          id: string
          is_active: boolean
          is_approved: boolean
          landing_other: number
          lead_time_days: number
          moq: number
          notes: string | null
          pickup_cost: number
          supplier_id: string
          transport_cost: number
          unit_price: number
          updated_at: string
          valid_from: string
          valid_until: string | null
          variant_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency?: string
          freight_cost?: number
          id?: string
          is_active?: boolean
          is_approved?: boolean
          landing_other?: number
          lead_time_days?: number
          moq?: number
          notes?: string | null
          pickup_cost?: number
          supplier_id: string
          transport_cost?: number
          unit_price: number
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          variant_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency?: string
          freight_cost?: number
          id?: string
          is_active?: boolean
          is_approved?: boolean
          landing_other?: number
          lead_time_days?: number
          moq?: number
          notes?: string | null
          pickup_cost?: number
          supplier_id?: string
          transport_cost?: number
          unit_price?: number
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_product_quotes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_product_quotes_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          city: string | null
          code: string
          contact_name: string | null
          country: string
          created_at: string
          created_by: string | null
          email: string | null
          gst_number: string | null
          id: string
          is_active: boolean
          lead_time_days: number
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          contact_name?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          contact_name?: string | null
          country?: string
          created_at?: string
          created_by?: string | null
          email?: string | null
          gst_number?: string | null
          id?: string
          is_active?: boolean
          lead_time_days?: number
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: []
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
      workers: {
        Row: {
          code: string
          created_at: string
          hourly_rate: number
          id: string
          is_active: boolean
          job_role: string | null
          name: string
          phone: string | null
          station_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          job_role?: string | null
          name: string
          phone?: string | null
          station_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          hourly_rate?: number
          id?: string
          is_active?: boolean
          job_role?: string | null
          name?: string
          phone?: string | null
          station_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
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
      next_doc_number: { Args: { _doc_type: string }; Returns: string }
      recalc_variant_cost: {
        Args: { _depth?: number; _variant_id: string }
        Returns: undefined
      }
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
      costing_method:
        | "supplier_quote"
        | "weighted_purchase"
        | "bom_stage"
        | "lowest"
        | "preferred"
        | "unset"
      discount_type: "percent" | "amount"
      dispatch_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "ready_for_dispatch"
        | "dispatched"
        | "delivered"
        | "cancelled"
      gr_condition: "resaleable" | "repairable" | "scrap"
      gr_reason:
        | "damaged"
        | "wrong_item"
        | "excess"
        | "quality_issue"
        | "expired"
        | "other"
      gr_status:
        | "draft"
        | "pending_approval"
        | "approved"
        | "received"
        | "cancelled"
      machine_status: "idle" | "running" | "maintenance" | "offline"
      mo_status: "draft" | "released" | "in_progress" | "done" | "cancelled"
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
      po_document_kind:
        | "lr"
        | "invoice"
        | "eway_bill"
        | "delivery_challan"
        | "qc"
        | "packaging"
        | "shipment_proof"
        | "other"
      po_status:
        | "draft"
        | "submitted"
        | "approved"
        | "partial"
        | "received"
        | "cancelled"
        | "closed"
        | "supplier_confirmed"
        | "supplier_dispatched"
        | "in_transit"
        | "grn_completed"
      product_type: "raw_material" | "packaging" | "finished_good" | "wip"
      request_status:
        | "draft"
        | "submitted"
        | "approved"
        | "rejected"
        | "fulfilled"
        | "cancelled"
      sourcing_type: "purchased" | "manufactured" | "hybrid"
      stage_kind: "moulding" | "assembly" | "packing" | "qc" | "other"
      variant_kind: "base" | "variation" | "component"
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
      costing_method: [
        "supplier_quote",
        "weighted_purchase",
        "bom_stage",
        "lowest",
        "preferred",
        "unset",
      ],
      discount_type: ["percent", "amount"],
      dispatch_status: [
        "draft",
        "pending_approval",
        "approved",
        "ready_for_dispatch",
        "dispatched",
        "delivered",
        "cancelled",
      ],
      gr_condition: ["resaleable", "repairable", "scrap"],
      gr_reason: [
        "damaged",
        "wrong_item",
        "excess",
        "quality_issue",
        "expired",
        "other",
      ],
      gr_status: [
        "draft",
        "pending_approval",
        "approved",
        "received",
        "cancelled",
      ],
      machine_status: ["idle", "running", "maintenance", "offline"],
      mo_status: ["draft", "released", "in_progress", "done", "cancelled"],
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
      po_document_kind: [
        "lr",
        "invoice",
        "eway_bill",
        "delivery_challan",
        "qc",
        "packaging",
        "shipment_proof",
        "other",
      ],
      po_status: [
        "draft",
        "submitted",
        "approved",
        "partial",
        "received",
        "cancelled",
        "closed",
        "supplier_confirmed",
        "supplier_dispatched",
        "in_transit",
        "grn_completed",
      ],
      product_type: ["raw_material", "packaging", "finished_good", "wip"],
      request_status: [
        "draft",
        "submitted",
        "approved",
        "rejected",
        "fulfilled",
        "cancelled",
      ],
      sourcing_type: ["purchased", "manufactured", "hybrid"],
      stage_kind: ["moulding", "assembly", "packing", "qc", "other"],
      variant_kind: ["base", "variation", "component"],
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
