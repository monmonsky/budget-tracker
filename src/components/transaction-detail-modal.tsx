'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Calendar, DollarSign, User, Building2, FileText, Tag } from 'lucide-react'
import { format } from 'date-fns'
import { TransactionAttachmentUpload } from '@/components/transaction-attachment-upload'

interface Attachment {
  id: string
  file_name: string
  file_url: string
  file_size: number
  file_type: string
  uploaded_at: string
}

interface Props {
  transactionId: string | null
  isOpen: boolean
  onClose: () => void
}

interface TransactionDetail {
  id: string
  date: string
  type: 'income' | 'expense'
  category: string
  amount: number
  description: string
  merchant: string | null
  account_id: string
  account_name: string
  created_at: string
}

export function TransactionDetailModal({ transactionId, isOpen, onClose }: Props) {
  const [transaction, setTransaction] = useState<TransactionDetail | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen && transactionId) {
      fetchTransactionDetail()
      fetchAttachments()
    }
  }, [isOpen, transactionId])

  const fetchTransactionDetail = async () => {
    if (!transactionId) return

    setLoading(true)
    try {
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single()

      if (!txData) return

      // Fetch account name
      const { data: accountData } = await supabase
        .from('accounts')
        .select('account_name')
        .eq('id', txData.account_id)
        .single()

      setTransaction({
        ...txData,
        account_name: accountData?.account_name || 'Unknown',
      })
    } catch (error) {
      console.error('Error fetching transaction:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAttachments = async () => {
    if (!transactionId) return

    try {
      const { data } = await supabase
        .from('transaction_attachments')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('uploaded_at', { ascending: false })

      setAttachments(data || [])
    } catch (error) {
      console.error('Error fetching attachments:', error)
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

  if (!isOpen || !transactionId) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-foreground">Transaction Details</h2>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-muted-foreground">Loading...</div>
          ) : transaction ? (
            <>
              {/* Transaction Info */}
              <div className="space-y-4">
                {/* Type Badge */}
                <div>
                  <Badge
                    variant={transaction.type === 'income' ? 'default' : 'destructive'}
                    className="text-sm px-3 py-1"
                  >
                    {transaction.type.toUpperCase()}
                  </Badge>
                </div>

                {/* Amount */}
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Amount</p>
                  <p className={`text-3xl font-bold ${transaction.type === 'income' ? 'text-green-600' : 'text-red-600'}`}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                  {/* Date */}
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Date</p>
                      <p className="font-medium text-foreground">
                        {format(new Date(transaction.date), 'dd MMMM yyyy')}
                      </p>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-start gap-3">
                    <Tag className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Category</p>
                      <p className="font-medium text-foreground">{transaction.category}</p>
                    </div>
                  </div>

                  {/* Account */}
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Account</p>
                      <p className="font-medium text-foreground">{transaction.account_name}</p>
                    </div>
                  </div>

                  {/* Merchant */}
                  {transaction.merchant && (
                    <div className="flex items-start gap-3">
                      <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm text-muted-foreground">Merchant</p>
                        <p className="font-medium text-foreground">{transaction.merchant}</p>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {transaction.description && (
                    <div className="flex items-start gap-3 md:col-span-2">
                      <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="font-medium text-foreground">{transaction.description}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Created At */}
                <div className="text-xs text-muted-foreground pt-2 border-t">
                  Created on {format(new Date(transaction.created_at), 'dd MMM yyyy HH:mm')}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="pt-4 border-t">
                <TransactionAttachmentUpload
                  transactionId={transactionId}
                  attachments={attachments}
                  onAttachmentsChange={fetchAttachments}
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t">
                <Button onClick={onClose}>Close</Button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-muted-foreground">
              Transaction not found
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
