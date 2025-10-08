# Search & Filters Feature

## Overview
Advanced search and filtering capabilities for the Transactions page, allowing users to quickly find and analyze specific transactions.

## Features Implemented

### 1. Search by Description/Merchant ✅
- **Location**: Top of filters card
- **Functionality**:
  - Real-time search with 500ms debounce
  - Searches both `description` and `merchant` fields
  - Case-insensitive matching
  - Icon indicator (magnifying glass)
  - Placeholder text: "Search by description or merchant..."

**Usage**:
```typescript
// Backend query
baseQuery = baseQuery.or(`description.ilike.%${searchQuery}%,merchant.ilike.%${searchQuery}%`)
```

### 2. Quick Filters ⭐
Pre-configured date range filters for common use cases:

| Filter | Description | Date Range |
|--------|-------------|------------|
| **Today** | Current day | Today only |
| **Yesterday** | Previous day | Yesterday only |
| **This Week** | Current week | Sunday to Today |
| **This Month** | Current month | 1st to last day of month |
| **Last 30 Days** | Past 30 days | 30 days ago to today |
| **This Year** | Current year | Jan 1 to Dec 31 |

**UI**: Button row with outlined style for quick access

### 3. Amount Range Filter 💰
Filter transactions by amount:
- **Min Amount**: Lower bound (greater than or equal)
- **Max Amount**: Upper bound (less than or equal)
- Numeric input fields
- Side-by-side layout on desktop
- Stacked on mobile

**Example Queries**:
```typescript
// Find transactions between 100,000 and 1,000,000
filterAmountMin = "100000"
filterAmountMax = "1000000"
```

### 4. Enhanced Existing Filters
All existing filters remain functional:
- **Type**: All, Income, Expense
- **Category**: Dropdown of available categories
- **Account**: Dropdown of user accounts
- **Date From/To**: Custom date range picker

### 5. Clear All Filters Button 🗑️
- Appears when any filter is active
- Located at top-right of filter card
- Resets all filters to default state
- Includes:
  - Type → 'all'
  - Category → 'all'
  - Account → 'all'
  - Dates → empty
  - Search → empty
  - Amount range → empty
  - Page → 1

## Technical Implementation

### State Management
```typescript
// Search & Amount filters
const [searchQuery, setSearchQuery] = useState('')
const [filterAmountMin, setFilterAmountMin] = useState('')
const [filterAmountMax, setFilterAmountMax] = useState('')

// Existing filters
const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all')
const [filterCategory, setFilterCategory] = useState<string>('all')
const [filterAccount, setFilterAccount] = useState<string>('all')
const [filterDateFrom, setFilterDateFrom] = useState('')
const [filterDateTo, setFilterDateTo] = useState('')
```

### Debouncing
Search queries are debounced by 500ms to reduce unnecessary API calls:

```typescript
useEffect(() => {
  const timer = setTimeout(() => {
    fetchData()
  }, searchQuery ? 500 : 0)

  return () => clearTimeout(timer)
}, [searchQuery, ...otherFilters])
```

### Query Building
Filters are applied sequentially to the Supabase query:

```typescript
let baseQuery = supabase
  .from('transactions')
  .select('*', { count: 'exact' })
  .order('date', { ascending: false })

// Apply all filters
if (filterType !== 'all') baseQuery = baseQuery.eq('type', filterType)
if (filterCategory !== 'all') baseQuery = baseQuery.eq('category', filterCategory)
if (filterAccount !== 'all') baseQuery = baseQuery.eq('account_id', filterAccount)
if (filterDateFrom) baseQuery = baseQuery.gte('date', filterDateFrom)
if (filterDateTo) baseQuery = baseQuery.lte('date', filterDateTo)
if (searchQuery) baseQuery = baseQuery.or(`description.ilike.%${searchQuery}%,merchant.ilike.%${searchQuery}%`)
if (filterAmountMin) baseQuery = baseQuery.gte('amount', parseFloat(filterAmountMin))
if (filterAmountMax) baseQuery = baseQuery.lte('amount', parseFloat(filterAmountMax))
```

### Quick Filter Function
```typescript
const applyQuickFilter = (filter: string) => {
  const today = new Date()

  switch (filter) {
    case 'thisMonth':
      setFilterDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'))
      setFilterDateTo(format(endOfMonth(today), 'yyyy-MM-dd'))
      break
    case 'last30Days':
      setFilterDateFrom(format(subDays(today, 30), 'yyyy-MM-dd'))
      setFilterDateTo(format(today, 'yyyy-MM-dd'))
      break
    // ... other cases
  }
  setCurrentPage(1)
}
```

## UI/UX Design

### Layout Structure
```
┌─────────────────────────────────────────┐
│ Filters                   [Clear All]   │
├─────────────────────────────────────────┤
│ Quick Filters:                          │
│ [Today] [Yesterday] [This Week] ...     │
├─────────────────────────────────────────┤
│ Search:                                 │
│ [🔍 Search by description or merchant] │
├─────────────────────────────────────────┤
│ Type | Category | Account | Dates       │
│ [▼]  | [▼]      | [▼]     | [date][date]│
├─────────────────────────────────────────┤
│ Amount Range:                           │
│ Min: [     ]  Max: [     ]             │
└─────────────────────────────────────────┘
```

### Responsive Behavior
- **Desktop** (lg+): 5-column grid for dropdowns, 2-column for amount
- **Tablet** (md): 2-column grid
- **Mobile**: Single column stack

### Visual Indicators
- 🔍 Search icon in input field
- ❌ Clear All button (appears when filters active)
- Count indicator: "Showing 1-20 of 150"

## Use Cases

### Example 1: Find Specific Receipt
```
Search: "indomaret"
→ Returns all transactions with "indomaret" in description/merchant
```

### Example 2: Monthly Expense Report
```
Quick Filter: "This Month"
Type: "Expense"
→ All expenses for current month
```

### Example 3: Large Transactions
```
Amount Min: 1000000
→ Only transactions ≥ Rp 1,000,000
```

### Example 4: Restaurant Spending Last 30 Days
```
Quick Filter: "Last 30 Days"
Type: "Expense"
Category: "Food & Dining"
→ All restaurant expenses in past month
```

### Example 5: Salary Deposits
```
Type: "Income"
Category: "Salary"
Search: "transfer"
→ All salary transfers
```

## Performance Considerations

### Optimization Techniques
1. **Debouncing**: Search queries delayed by 500ms
2. **Pagination**: Results limited to 20 per page
3. **Indexed Queries**: Database indexes on date, type, category
4. **Count Optimization**: Uses `{ count: 'exact' }` option

### Database Indexes
Ensure these indexes exist for optimal performance:
```sql
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category);
CREATE INDEX idx_transactions_description ON transactions USING gin(to_tsvector('english', description));
```

## Future Enhancements

### Potential Improvements
- [ ] Save custom filter presets
- [ ] Filter by tags/labels
- [ ] Advanced search operators (AND, OR, NOT)
- [ ] Export filtered results
- [ ] Filter history/recent searches
- [ ] Suggested searches based on common patterns
- [ ] Filter by payment method
- [ ] Filter by recurring status

### Advanced Features
- [ ] Natural language search ("groceries last week")
- [ ] AI-powered categorization
- [ ] Anomaly detection (unusual transactions)
- [ ] Spending pattern alerts

## Accessibility

- All inputs have proper `<Label>` elements
- Search input has placeholder text
- Keyboard navigation supported
- Clear visual hierarchy
- Responsive touch targets (44px minimum)

## Testing Checklist

- [x] Search by description works
- [x] Search by merchant works
- [x] Case-insensitive search
- [x] Quick filters apply correct date ranges
- [x] Amount min filter works
- [x] Amount max filter works
- [x] Combined filters work together
- [x] Clear All resets everything
- [x] Pagination resets to page 1 on filter change
- [x] Debounce prevents excessive queries
- [x] Mobile responsive layout
- [x] Empty state shows "No transactions found"

## Troubleshooting

### Common Issues

**Search returns no results:**
- Check for typos in search query
- Ensure case doesn't matter (search is case-insensitive)
- Try partial matches (e.g., "indo" instead of "indomaret")

**Quick filters show no transactions:**
- Verify transactions exist in that date range
- Check if other filters are too restrictive
- Use "Clear All" to reset

**Amount filter not working:**
- Ensure numeric values are entered
- Check that Min ≤ Max
- Verify transactions exist in that range

## Dependencies

```json
{
  "date-fns": "^2.30.0",  // Date manipulation
  "lucide-react": "^0.x", // Icons (Search, X, Filter)
  "@supabase/supabase-js": "^2.x" // Database queries
}
```

## File Location

```
src/app/dashboard/transactions/page.tsx
```

**Lines Modified**: ~60 lines added/modified
**New State Variables**: 3 (searchQuery, filterAmountMin, filterAmountMax)
**New Functions**: 2 (clearAllFilters, applyQuickFilter)

---

**Implemented**: 2025-01-05
**Version**: 2.0.1
**Status**: ✅ Production Ready
