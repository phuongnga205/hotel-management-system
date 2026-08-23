import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'react-toastify'
import PageHeader from '../../../components/PageHeader'
import Card from '../../../components/Card'
import FieldLabel from '../../../components/FieldLabel'
import inputBase from '../../../components/inputBase'
import { PageLoader } from '../../../components/common/PageLoader'
import { AdminTable, ConfirmModal } from '../../../components/admin'
import { amenityApi } from '../../../api/amenity.api'
import { getErrorMessage } from '../../../api/errorMessage'
import type { Amenity } from '../../../api/types'

export default function AdminAmenityListPage() {
  const { t } = useTranslation('admin')
  const [amenities, setAmenities] = useState<Amenity[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState<'create' | Amenity | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null)

  const load = () => {
    setLoading(true)
    amenityApi
      .list()
      .then(setAmenities)
      .catch((err) => setError(getErrorMessage(err, t('common.notFoundGeneric'))))
      .finally(() => setLoading(false))
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-with-loading-flag pattern, xem AdminBookingListPage.tsx
  useEffect(load, [t])

  const openCreate = () => {
    setName('')
    setDescription('')
    setShowForm('create')
  }

  const openEdit = (amenity: Amenity) => {
    setName(amenity.name)
    setDescription(amenity.description ?? '')
    setShowForm(amenity)
  }

  const handleSubmit = async () => {
    setSaving(true)
    try {
      if (showForm === 'create') {
        await amenityApi.create({ name, description: description || undefined })
      } else if (showForm) {
        await amenityApi.update(showForm.id, { name, description: description || undefined })
      }
      setShowForm(null)
      load()
    } catch (err) {
      toast.error(getErrorMessage(err, t('common.notFoundGeneric')))
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    await amenityApi.remove(id)
    setAmenities((prev) => prev.filter((a) => a.id !== id))
    setShowDeleteModal(null)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={t('amenities.list.eyebrow')}
        title={t('amenities.list.title')}
        subtitle={t('amenities.list.subtitle', { count: amenities.length })}
        action={
          <button onClick={openCreate} className="px-4 py-2 text-xs font-semibold text-white bg-navy rounded-lg hover:opacity-90 transition-opacity">
            {t('amenities.list.addAmenity')}
          </button>
        }
      />

      <Card>
        {loading ? (
          <PageLoader fullPage={false} />
        ) : error ? (
          <p className="p-6 text-danger text-sm">{error}</p>
        ) : (
          <AdminTable
            rowKey={(a: Amenity) => a.id}
            rows={amenities}
            columns={[
              { key: 'name', header: t('amenities.list.columnName'), render: (a) => <span className="font-medium text-navy">{a.name}</span> },
              { key: 'description', header: t('amenities.list.columnDescription'), render: (a) => a.description || t('amenities.list.noDescription') },
              {
                key: 'actions',
                header: t('common.actions'),
                render: (a) => (
                  <div className="flex gap-1.5">
                    <button onClick={() => openEdit(a)} className="px-2.5 py-1 text-xs font-semibold text-navy border border-navy/30 rounded-lg hover:bg-navy hover:text-white transition-colors">{t('common.edit')}</button>
                    <button onClick={() => setShowDeleteModal(a.id)} className="px-2.5 py-1 text-xs font-semibold text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">{t('common.delete')}</button>
                  </div>
                ),
              },
            ]}
          />
        )}
        {!loading && !error && amenities.length === 0 && (
          <div className="p-16 text-center text-slate-400 text-sm">{t('amenities.list.empty')}</div>
        )}
      </Card>

      <ConfirmModal
        open={!!showForm}
        title={showForm === 'create' ? t('amenities.form.createTitle') : t('amenities.form.editTitle')}
        danger={false}
        confirmLabel={saving ? (showForm === 'create' ? t('amenities.form.submitCreating') : t('amenities.form.submitSaving')) : (showForm === 'create' ? t('amenities.form.submitCreate') : t('amenities.form.submitSave'))}
        onConfirm={handleSubmit}
        onCancel={() => setShowForm(null)}
      >
        <div className="space-y-3">
          <div>
            <FieldLabel>{t('amenities.form.fieldName')}</FieldLabel>
            <input value={name} onChange={(e) => setName(e.target.value)} className={`${inputBase} border-slate-200`} placeholder={t('amenities.form.fieldNamePlaceholder')} required />
          </div>
          <div>
            <FieldLabel optional>{t('amenities.form.fieldDescription')}</FieldLabel>
            <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} className={`${inputBase} border-slate-200 resize-none`} placeholder={t('amenities.form.fieldDescriptionPlaceholder')} />
          </div>
        </div>
      </ConfirmModal>

      <ConfirmModal
        open={!!showDeleteModal}
        title={t('amenities.list.deleteTitle')}
        desc={t('amenities.list.deleteDesc')}
        confirmLabel={t('amenities.list.deleteConfirm')}
        onConfirm={() => handleDelete(showDeleteModal!)}
        onCancel={() => setShowDeleteModal(null)}
      />
    </div>
  )
}
