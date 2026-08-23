import React, { useState, useEffect } from 'react'
import { Modal, DatePicker, Button, Typography, Form } from 'antd'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'

interface EditBookingModalProps {
  visible: boolean
  currentCheckIn: string
  currentCheckOut: string
  onClose: () => void
  onConfirm: (checkIn: string, checkOut: string) => Promise<void>
  loading?: boolean
}

const { Text } = Typography

export function EditBookingModal({ 
  visible, 
  currentCheckIn, 
  currentCheckOut, 
  onClose, 
  onConfirm, 
  loading 
}: EditBookingModalProps) {
  const { t } = useTranslation()
  const [form] = Form.useForm()

  useEffect(() => {
    if (visible) {
      form.setFieldsValue({
        dates: [dayjs(currentCheckIn), dayjs(currentCheckOut)]
      })
    }
  }, [visible, currentCheckIn, currentCheckOut, form])

  const handleFinish = (values: any) => {
    if (!values.dates || values.dates.length !== 2) return
    const [checkIn, checkOut] = values.dates
    onConfirm(checkIn.format('YYYY-MM-DD'), checkOut.format('YYYY-MM-DD'))
  }

  return (
    <Modal
      title={<div className="text-center w-full text-lg font-semibold">{t('booking.modal.editDatesTitle', 'Edit Stay Dates')}</div>}
      open={visible}
      onCancel={onClose}
      footer={null}
      centered
      width={400}
      destroyOnClose
    >
      <Form form={form} layout="vertical" onFinish={handleFinish} className="mt-6">
        <Form.Item 
          label={<span className="text-xs font-bold text-gray-500 uppercase">{t('booking.modal.newCheckIn', 'NEW CHECK-IN')} & {t('booking.modal.newCheckOut', 'NEW CHECK-OUT')}</span>}
          name="dates"
          rules={[{ required: true, message: 'Please select new dates' }]}
        >
          <DatePicker.RangePicker 
            className="w-full" 
            size="large"
            disabledDate={(current) => current && current < dayjs().startOf('day')}
          />
        </Form.Item>

        <div className="flex w-full gap-4 mt-8">
          <Button 
            className="flex-1" 
            size="large"
            onClick={onClose}
            disabled={loading}
          >
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            className="flex-1 bg-secondary hover:bg-secondary/90" 
            type="primary" 
            size="large"
            htmlType="submit"
            loading={loading}
          >
            {t('booking.modal.updateDates', 'Update Dates')}
          </Button>
        </div>
      </Form>
    </Modal>
  )
}
