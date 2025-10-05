export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      // User profiles
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: 'primary' | 'partner' // Anda atau Istri
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>
      }

      // Bank accounts
      accounts: {
        Row: {
          id: string
          user_id: string
          account_name: string // BCA Anda, BCA Istri, Jenius, etc.
          account_type: 'checking' | 'savings' | 'investment' | 'crypto' | 'debt'
          bank_name: string // BCA, Jenius, Bank Jago, etc.
          balance: number
          currency: string
          owner: 'husband' | 'wife' | 'joint'
          is_active: boolean
          parent_account_id: string | null // Reference to parent account if sub-account
          is_sub_account: boolean // True if this is a sub-account/wallet
          sub_account_type: 'pocket' | 'saver' | 'wallet' | 'virtual' | null // Type of sub-account
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['accounts']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['accounts']['Insert']>
      }

      // Transactions
      transactions: {
        Row: {
          id: string
          account_id: string
          user_id: string
          date: string
          amount: number
          type: 'income' | 'expense' | 'transfer'
          category: string
          subcategory: string | null
          description: string
          merchant: string | null
          is_recurring: boolean
          is_internal_transfer: boolean // For internal transfer detection
          transfer_pair_id: string | null // Link to matching transfer
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }

      // Categories
      categories: {
        Row: {
          id: string
          name: string
          type: 'income' | 'expense'
          icon: string | null
          color: string | null
          parent_id: string | null // For subcategories
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['categories']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['categories']['Insert']>
      }

      // Budgets
      budgets: {
        Row: {
          id: string
          user_id: string
          category_id: string
          amount: number
          period: 'monthly' | 'yearly'
          start_date: string
          end_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['budgets']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['budgets']['Insert']>
      }

      // Investments (Bibit, Binance)
      investments: {
        Row: {
          id: string
          user_id: string
          platform: 'bibit' | 'binance' | 'other'
          portfolio_name: string // Tabungan Anak, Investment Agresif, etc.
          portfolio_type: 'goals' | 'retirement' | 'emergency' | 'crypto'
          asset_type: 'stocks' | 'mixed' | 'money_market' | 'crypto'
          currency: 'IDR' | 'USD'
          current_value: number
          current_price: number // Harga sekarang per unit (untuk crypto)
          average_buy_price: number // Harga beli rata-rata
          total_units: number // Total unit/koin yang dimiliki
          initial_investment: number
          total_contribution: number
          return_percentage: number
          unrealized_pnl: number // Profit/Loss yang belum direalisasi
          last_updated: string
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['investments']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['investments']['Insert']>
      }

      // Investment transactions
      investment_transactions: {
        Row: {
          id: string
          investment_id: string
          date: string
          type: 'buy' | 'sell' | 'dividend' | 'fee'
          amount: number
          units: number | null
          price_per_unit: number | null
          description: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['investment_transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['investment_transactions']['Insert']>
      }

      // KPR Tracking
      kpr_tracking: {
        Row: {
          id: string
          user_id: string
          principal_amount: number // Rp 3 miliar
          current_balance: number
          monthly_payment: number // Rp 17 juta
          interest_rate: number // 3.5%
          tenor_years: number // 20 years
          start_date: string
          expected_payoff_date: string
          bombing_history: Json // Array of bombing transactions
          total_interest_saved: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['kpr_tracking']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['kpr_tracking']['Insert']>
      }

      // Net Worth Snapshots (monthly tracking)
      net_worth_snapshots: {
        Row: {
          id: string
          user_id: string
          snapshot_date: string
          total_assets: number
          total_liabilities: number
          net_worth: number
          breakdown: Json // Detailed breakdown by account
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['net_worth_snapshots']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['net_worth_snapshots']['Insert']>
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}
