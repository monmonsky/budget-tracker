'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Upload, FileText, Check, X, AlertTriangle, Download } from 'lucide-react'
import { useLoading } from '@/contexts/LoadingContext'
import Papa from 'papaparse'
import { toast } from 'sonner'

interface CSVRow {
  [key: string]: string
}

interface MappedTransaction {
  date: string
  description: string
  amount: number
  type: 'income' | 'expense'
  category?: string
  merchant?: string
  isValid: boolean
  error?: string
}

interface ColumnMapping {
  date: string
  description: string
  amount: string
  type?: string
  category?: string
  merchant?: string
}

export default function ImportPage() {
  const { setLoading, setLoadingText } = useLoading()
  const [csvData, setCsvData] = useState<CSVRow[]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [mapping, setMapping] = useState<ColumnMapping>({
    date: '',
    description: '',
    amount: '',
  })
  const [preview, setPreview] = useState<MappedTransaction[]>([])
  const [bankFormat, setBankFormat] = useState<string>('custom')
  const [accountId, setAccountId] = useState<string>('')
  const [accounts, setAccounts] = useState<any[]>([])
  const [step, setStep] = useState<'upload' | 'map' | 'preview' | 'complete'>('upload')
  const [importedCount, setImportedCount] = useState(0)

  // Predefined bank formats
  const bankFormats: { [key: string]: ColumnMapping } = {
    bca: {
      date: 'Tanggal',
      description: 'Keterangan',
      amount: 'Nominal',
      type: 'Jenis',
    },
    mandiri: {
      date: 'Tanggal Transaksi',
      description: 'Deskripsi',
      amount: 'Jumlah',
      type: 'Tipe',
    },
    jenius: {
      date: 'Transaction Date',
      description: 'Description',
      amount: 'Amount',
      type: 'Type',
    },
    custom: {
      date: '',
      description: '',
      amount: '',
    },
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoadingText('Parsing CSV file...')
    setLoading(true)

    try {
      // Fetch accounts first
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: accountData } = await supabase
        .from('accounts')
        .select('id, account_name, bank_name')
        .eq('is_active', true)
        .order('account_name')

      setAccounts(accountData || [])

      // Parse CSV
      Papa.parse(file, {
        header: true,
        complete: (results) => {
          const data = results.data as CSVRow[]
          const filteredData = data.filter(row => {
            // Remove empty rows
            return Object.values(row).some(val => val && val.trim() !== '')
          })

          setCsvData(filteredData)
          setHeaders(results.meta.fields || [])
          setStep('map')
          setLoading(false)
        },
        error: (error) => {
          console.error('CSV parsing error:', error)
          toast.error('Failed to parse CSV file', {
            description: 'Please check the file format and try again.',
          })
          setLoading(false)
        },
      })
    } catch (error) {
      console.error('Error uploading file:', error)
      toast.error('Failed to upload file', {
        description: (error as any).message || 'An unexpected error occurred',
      })
      setLoading(false)
    }
  }

  const handleBankFormatChange = (format: string) => {
    setBankFormat(format)
    if (format !== 'custom') {
      setMapping(bankFormats[format])
      generatePreview(bankFormats[format])
    }
  }

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    const newMapping = { ...mapping, [field]: value }
    setMapping(newMapping)
  }

  const generatePreview = (customMapping?: ColumnMapping) => {
    const currentMapping = customMapping || mapping

    if (!currentMapping.date || !currentMapping.description || !currentMapping.amount) {
      toast.error('Validation error', {
        description: 'Please map at least Date, Description, and Amount columns',
      })
      return
    }

    const mapped: MappedTransaction[] = csvData.slice(0, 10).map((row, index) => {
      let isValid = true
      let error = ''

      // Parse date
      const dateStr = row[currentMapping.date]
      let parsedDate = ''
      try {
        // Try multiple date formats
        const date = new Date(dateStr)
        if (isNaN(date.getTime())) {
          isValid = false
          error = 'Invalid date format'
        } else {
          parsedDate = date.toISOString().split('T')[0]
        }
      } catch {
        isValid = false
        error = 'Invalid date'
      }

      // Parse amount
      const amountStr = row[currentMapping.amount]
      let amount = 0
      try {
        // Remove currency symbols and commas
        const cleanAmount = amountStr.replace(/[^0-9.-]/g, '')
        amount = Math.abs(parseFloat(cleanAmount))

        if (isNaN(amount)) {
          isValid = false
          error = 'Invalid amount'
        }
      } catch {
        isValid = false
        error = 'Invalid amount'
      }

      // Determine type
      let type: 'income' | 'expense' = 'expense'
      if (currentMapping.type) {
        const typeStr = row[currentMapping.type]?.toLowerCase()
        if (typeStr?.includes('credit') || typeStr?.includes('kredit') || typeStr?.includes('income') || parseFloat(amountStr) > 0) {
          type = 'income'
        }
      } else {
        // If no type column, assume negative = expense, positive = income
        const rawAmount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''))
        if (rawAmount > 0) type = 'income'
      }

      return {
        date: parsedDate,
        description: row[currentMapping.description] || '',
        amount,
        type,
        category: currentMapping.category ? row[currentMapping.category] : undefined,
        merchant: currentMapping.merchant ? row[currentMapping.merchant] : undefined,
        isValid,
        error,
      }
    })

    setPreview(mapped)
    setStep('preview')
  }

  const handleImport = async () => {
    if (!accountId) {
      toast.error('Validation error', {
        description: 'Please select an account',
      })
      return
    }

    setLoadingText('Importing transactions...')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Map all transactions
      const allMapped: MappedTransaction[] = csvData.map(row => {
        const dateStr = row[mapping.date]
        let parsedDate = ''
        try {
          const date = new Date(dateStr)
          parsedDate = date.toISOString().split('T')[0]
        } catch {
          parsedDate = new Date().toISOString().split('T')[0]
        }

        const amountStr = row[mapping.amount]
        const cleanAmount = amountStr.replace(/[^0-9.-]/g, '')
        const amount = Math.abs(parseFloat(cleanAmount))

        let type: 'income' | 'expense' = 'expense'
        if (mapping.type) {
          const typeStr = row[mapping.type]?.toLowerCase()
          if (typeStr?.includes('credit') || typeStr?.includes('kredit') || typeStr?.includes('income')) {
            type = 'income'
          }
        } else {
          const rawAmount = parseFloat(amountStr.replace(/[^0-9.-]/g, ''))
          if (rawAmount > 0) type = 'income'
        }

        return {
          date: parsedDate,
          description: row[mapping.description] || 'Imported transaction',
          amount,
          type,
          category: mapping.category ? row[mapping.category] : type === 'income' ? 'Other Income' : 'Other Expense',
          merchant: mapping.merchant ? row[mapping.merchant] : undefined,
          isValid: !isNaN(amount) && parsedDate !== '',
          error: '',
        }
      }).filter(t => t.isValid)

      // Insert transactions
      const transactions = allMapped.map(t => ({
        user_id: user.id,
        account_id: accountId,
        date: t.date,
        amount: t.amount,
        type: t.type,
        category: t.category || 'Other Expense',
        description: t.description,
        merchant: t.merchant,
        is_recurring: false,
      }))

      const { error } = await supabase
        .from('transactions')
        .insert(transactions)

      if (error) throw error

      toast.success('Transactions imported successfully!', {
        description: `${transactions.length} transactions have been imported.`,
      })

      setImportedCount(transactions.length)
      setStep('complete')
    } catch (error) {
      console.error('Error importing transactions:', error)
      toast.error('Failed to import transactions', {
        description: (error as any).message || 'An unexpected error occurred',
      })
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const downloadSampleCSV = () => {
    const sampleData = [
      { Date: '2024-01-15', Description: 'Gaji Bulanan', Amount: '15000000', Type: 'Income' },
      { Date: '2024-01-16', Description: 'Belanja Groceries', Amount: '-350000', Type: 'Expense' },
      { Date: '2024-01-20', Description: 'Transfer KPR', Amount: '-28000000', Type: 'Expense' },
    ]

    const csv = Papa.unparse(sampleData)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sample-transactions.csv'
    a.click()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Import Transactions</h1>
          <p className="text-muted-foreground">Bulk upload transactions from your bank CSV file</p>
        </div>
        <Button onClick={downloadSampleCSV} variant="outline" className="gap-2">
          <Download className="h-4 w-4" />
          Download Sample CSV
        </Button>
      </div>

      {/* Progress Steps */}
      <Card className="p-6 bg-card border-border">
        <div className="flex items-center justify-between">
          <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step !== 'upload' ? 'bg-green-600 text-white' : 'bg-primary text-primary-foreground'}`}>
              {step !== 'upload' ? <Check className="h-4 w-4" /> : '1'}
            </div>
            <span className="font-medium">Upload CSV</span>
          </div>
          <div className="flex-1 h-1 bg-border mx-4" />
          <div className={`flex items-center gap-2 ${step === 'map' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${['preview', 'complete'].includes(step) ? 'bg-green-600 text-white' : step === 'map' ? 'bg-primary text-primary-foreground' : 'bg-border'}`}>
              {['preview', 'complete'].includes(step) ? <Check className="h-4 w-4" /> : '2'}
            </div>
            <span className="font-medium">Map Columns</span>
          </div>
          <div className="flex-1 h-1 bg-border mx-4" />
          <div className={`flex items-center gap-2 ${step === 'preview' ? 'text-primary' : 'text-muted-foreground'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'complete' ? 'bg-green-600 text-white' : step === 'preview' ? 'bg-primary text-primary-foreground' : 'bg-border'}`}>
              {step === 'complete' ? <Check className="h-4 w-4" /> : '3'}
            </div>
            <span className="font-medium">Preview & Import</span>
          </div>
        </div>
      </Card>

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
              <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">Upload CSV File</h3>
              <p className="text-muted-foreground mb-4">
                Support for BCA, Mandiri, Jenius, and custom formats
              </p>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="hidden"
                id="csv-upload"
              />
              <label htmlFor="csv-upload">
                <Button asChild>
                  <span>Select CSV File</span>
                </Button>
              </label>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
              <p className="text-sm text-foreground">
                <strong>Tips:</strong> Your CSV file should contain at minimum: Date, Description, and Amount columns.
                You can download a sample CSV file above to see the expected format.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Step 2: Map Columns */}
      {step === 'map' && (
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-4">Map CSV Columns</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bank Format</Label>
                  <Select value={bankFormat} onValueChange={handleBankFormatChange}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bca">BCA</SelectItem>
                      <SelectItem value="mandiri">Mandiri</SelectItem>
                      <SelectItem value="jenius">Jenius</SelectItem>
                      <SelectItem value="custom">Custom</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Account *</Label>
                  <Select value={accountId} onValueChange={setAccountId}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts.map(acc => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.bank_name} - {acc.account_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Date Column *</Label>
                  <Select value={mapping.date} onValueChange={(val) => handleMappingChange('date', val)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Description Column *</Label>
                  <Select value={mapping.description} onValueChange={(val) => handleMappingChange('description', val)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Amount Column *</Label>
                  <Select value={mapping.amount} onValueChange={(val) => handleMappingChange('amount', val)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Type Column (optional)</Label>
                  <Select value={mapping.type || ''} onValueChange={(val) => handleMappingChange('type', val)}>
                    <SelectTrigger className="bg-background border-border">
                      <SelectValue placeholder="Select column (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {headers.map(h => (
                        <SelectItem key={h} value={h}>{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button onClick={() => generatePreview()}>
                Preview Transactions
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 3: Preview */}
      {step === 'preview' && (
        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">Preview (First 10 rows)</h3>
              <Badge>Total: {csvData.length} transactions</Badge>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.map((row, idx) => (
                    <TableRow key={idx} className="border-border">
                      <TableCell>
                        {row.isValid ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <X className="h-4 w-4 text-red-600" />
                        )}
                      </TableCell>
                      <TableCell className="text-foreground">{row.date}</TableCell>
                      <TableCell className="text-foreground">{row.description}</TableCell>
                      <TableCell>
                        <Badge variant={row.type === 'income' ? 'default' : 'destructive'}>
                          {row.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-foreground">{formatCurrency(row.amount)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setStep('map')}>
                Back
              </Button>
              <Button onClick={handleImport}>
                Import {csvData.length} Transactions
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Step 4: Complete */}
      {step === 'complete' && (
        <Card className="p-6 bg-card border-border">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mx-auto">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-foreground">Import Successful!</h3>
            <p className="text-muted-foreground">
              Successfully imported {importedCount} transactions
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => window.location.href = '/dashboard/transactions'}>
                View Transactions
              </Button>
              <Button variant="outline" onClick={() => {
                setCsvData([])
                setHeaders([])
                setPreview([])
                setStep('upload')
                setImportedCount(0)
              }}>
                Import More
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
