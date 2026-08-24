import { useEffect } from 'react'
import { Modal, DatePicker, Button, Form } from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs, { type Dayjs } from 'dayjs'

interface EditBookingModalProps {
  visible: boolean
  currentCheckIn: string
  currentCheckOut: string
  onClose: () => void
  onConfirm: (checkIn: string, checkOut: string) => Promise<void>
  loading?: boolean
}

interface EditBookingFormValues {
  dates: [Dayjs, Dayjs]
}

export function EditBookingModal({
  visible, 
  currentCheckIn, 
  currentCheckOut, 
  onClose, 
  onConfirm, 
  loading 
}: EditBookingModalProps) {
  // Namespace mac dinh 'booking' (khong prefix) + 'common' de lay rieng nut
  // Huy dung chung (t('common:common.cancel')) - xem HomePage.tsx cho cung
  // pattern useTranslation(['ns-rieng', 'common']).
  const { t } = useTranslation(['booking', 'common'])
  const [form] = Form.useForm<EditBookingFormValues>()

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        dates: [dayjs(currentCheckIn), dayjs(currentCheckOut)]
      })
    }
  }, [visible, currentCheckIn, currentCheckOut, form])

  const handleFinish = (values: EditBookingFormValues) => {
    if (!values.dates || values.dates.length !== 2) return
    const [checkIn, checkOut] = values.dates
    onConfirm(checkIn.format('YYYY-MM-DD'), checkOut.format('YYYY-MM-DD'))
  }

  return (
    <Modal
      title={<div className="text-center w-full text-lg font-semibold">{t('modal.editDatesTitle')}</div>}
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={400}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-6">
        <Form.Item
          label={<span className="text-xs font-bold text-gray-500 uppercase">{t('modal.newCheckIn')} & {t('modal.newCheckOut')}</span>}
          name="dates"
          rules={[{ required: true, message: t('modal.datesRequired') }]}
        >
          <DatePicker.RangePicker
            className="w-full"
            size="large"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <div className="flex w-full gap-4 mt-8">
          <Button className="flex-1" size="large" onClick={onClose} disabled={loading}>
            {t('common:common.cancel')}
          </Button>
          <Button className="flex-1 !bg-navy hover:!bg-navy-light" type="primary" size="large" htmlType="submit" loading={loading}>
            {t('modal.updateDates')}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
