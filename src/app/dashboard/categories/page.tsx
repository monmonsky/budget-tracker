'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, Edit2, X, Tag } from 'lucide-react'
import { LoadingSpinner } from '@/components/loading-spinner'
import { toast } from 'sonner'

interface Category {
  id: string
  name: string
  type: 'income' | 'expense'
  icon: string | null
  color: string | null
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '',
    color: '#3b82f6',
  })

  // Available colors
  const colors = [
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Orange', value: '#f97316' },
  ]

  // Available icons
  const availableIcons = [
    '💰', '💵', '💳', '🏦', '💸', '🤑', // Money
    '🍔', '🍕', '🍜', '☕', '🍱', '🥗', // Food
    '🚗', '🚕', '🚌', '🚇', '✈️', '⛽', // Transport
    '🏠', '🏡', '🛋️', '🔌', '💡', '🚿', // Home
    '🎮', '🎬', '🎵', '📚', '🎨', '⚽', // Entertainment
    '👔', '👗', '👟', '💄', '💍', '🎁', // Shopping
    '💊', '🏥', '⚕️', '💉', '🩺', '🧘', // Health
    '📱', '💻', '🖥️', '⌨️', '🖱️', '📷', // Tech
    '📊', '📈', '💼', '🏢', '📝', '✅', // Work/Business
    '🎓', '📖', '✏️', '🎒', '📚', '🔬', // Education
  ]

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('type', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error

      setCategories(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching categories:', error)
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error('Validation error', {
        description: 'Please enter category name',
      })
      return
    }

    try {
      if (editingId) {
        // Update existing category
        const { error } = await supabase
          .from('categories')
          .update({
            name: formData.name.trim(),
            type: formData.type,
            icon: formData.icon || null,
            color: formData.color,
          })
          .eq('id', editingId)

        if (error) throw error

        toast.success('Category updated successfully!', {
          description: 'Your category has been updated.',
        })
      } else {
        // Create new category
        const { error } = await supabase
          .from('categories')
          .insert({
            name: formData.name.trim(),
            type: formData.type,
            icon: formData.icon || null,
            color: formData.color,
          })

        if (error) throw error

        toast.success('Category created successfully!', {
          description: 'Your new category has been added.',
        })
      }

      // Reset form
      setFormData({
        name: '',
        type: 'expense',
        icon: '',
        color: '#3b82f6',
      })
      setShowForm(false)
      setEditingId(null)
      fetchCategories()
    } catch (error: any) {
      console.error('Error saving category:', error)
      toast.error('Failed to save category', {
        description: error.message || 'An unexpected error occurred',
      })
    }
  }

  const handleEdit = (category: Category) => {
    setEditingId(category.id)
    setFormData({
      name: category.name,
      type: category.type,
      icon: category.icon || '',
      color: category.color || '#3b82f6',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this category? This cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Category deleted successfully!', {
        description: 'The category has been removed.',
      })

      fetchCategories()
    } catch (error: any) {
      console.error('Error deleting category:', error)
      toast.error('Failed to delete category', {
        description: error.message || 'It may be used in transactions.',
      })
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setShowForm(false)
    setFormData({
      name: '',
      type: 'expense',
      icon: '',
      color: '#3b82f6',
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner size="lg" text="Loading categories..." />
      </div>
    )
  }

  const incomeCategories = categories.filter(c => c.type === 'income')
  const expenseCategories = categories.filter(c => c.type === 'expense')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Categories</h1>
          <p className="text-muted-foreground">Manage your transaction categories</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </>
          )}
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingId ? 'Edit Category' : 'Add New Category'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Category Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Category Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Food & Dining"
                  required
                />
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') => setFormData({ ...formData, type: value })}
                >
                  <SelectTrigger id="type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>

            </div>

            {/* Icon Picker */}
            <div className="space-y-2">
              <Label>Select Icon (optional)</Label>
              <div className="grid grid-cols-12 gap-2 p-4 border rounded-lg max-h-48 overflow-y-auto">
                {availableIcons.map((icon, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`text-2xl p-2 rounded hover:bg-accent/50 transition-colors ${
                      formData.icon === icon ? 'bg-blue-100 dark:bg-blue-900 ring-2 ring-blue-500' : ''
                    }`}
                    onClick={() => setFormData({ ...formData, icon })}
                    title={icon}
                  >
                    {icon}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="custom-icon">Or enter custom icon:</Label>
                <Input
                  id="custom-icon"
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  placeholder="e.g., 🍔"
                  className="w-32"
                />
                {formData.icon && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setFormData({ ...formData, icon: '' })}
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <div className="flex gap-2">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      formData.color === color.value ? 'border-gray-900 dark:border-white' : 'border-border'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData({ ...formData, color: color.value })}
                    title={color.name}
                  />
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button type="submit">
                {editingId ? 'Update Category' : 'Add Category'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancelEdit}>
                  Cancel Edit
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      {/* Categories List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income Categories */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-green-600" />
            <h2 className="text-xl font-bold">Income Categories ({incomeCategories.length})</h2>
          </div>

          {incomeCategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No income categories yet</p>
          ) : (
            <div className="space-y-2">
              {incomeCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: category.color || '#3b82f6' }}
                    >
                      {category.icon || category.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <Badge variant="default" className="mt-1">Income</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Expense Categories */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Tag className="h-5 w-5 text-red-600" />
            <h2 className="text-xl font-bold">Expense Categories ({expenseCategories.length})</h2>
          </div>

          {expenseCategories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No expense categories yet</p>
          ) : (
            <div className="space-y-2">
              {expenseCategories.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 bg-card rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold"
                      style={{ backgroundColor: category.color || '#3b82f6' }}
                    >
                      {category.icon || category.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium">{category.name}</p>
                      <Badge variant="destructive" className="mt-1">Expense</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(category)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(category.id)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Summary */}
      <Card className="p-6">
        <h2 className="text-xl font-bold mb-4">Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-3xl font-bold text-green-600">{incomeCategories.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Income Categories</p>
          </div>
          <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-3xl font-bold text-red-600">{expenseCategories.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Expense Categories</p>
          </div>
          <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <p className="text-3xl font-bold text-blue-600">{categories.length}</p>
            <p className="text-sm text-muted-foreground mt-1">Total Categories</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
