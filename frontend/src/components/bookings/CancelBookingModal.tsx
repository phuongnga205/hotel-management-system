import { useState } from 'react'
import { Modal, Input, Button, Typography } from 'antd'
import { useTranslation } from 'react-i18next'
import { ExclamationCircleOutlined } from '@ant-design/icons'

interface CancelBookingModalProps {
  visible: boolean
  onClose: () => void
  onConfirm: (reason: string) => Promise<void>
  loading?: boolean
}

const { Text } = Typography

export function CancelBookingModal({ visible, onClose, onConfirm, loading }: CancelBookingModalProps) {
  const { t } = useTranslation('booking')
  const [reason, setReason] = useState('')

  const handleConfirm = () => {
    onConfirm(reason).then(() => {
      setReason('')
    })
  }

  return (
    <Modal open={visible} onCancel={onClose} footer={null} centered width={400} className="text-center" destroyOnClose>
      <div className="flex flex-col items-center">
        <ExclamationCircleOutlined className="text-5xl text-gray-800 mb-4" />
        <h3 className="text-2xl font-bold font-serif text-navy mb-2">{t('modal.cancelTitle')}</h3>
        <Text type="secondary" className="mb-6 px-2 text-sm">
          {t('modal.cancelWarning')}
        </Text>

        <Input.TextArea
          rows={3}
          placeholder={t('modal.reasonPlaceholder')}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="mb-8 w-full rounded-lg"
        />

        <div className="flex w-full gap-4 mt-2">
          <Button className="flex-1 rounded-lg font-medium flex items-center justify-center" size="large" onClick={onClose} disabled={loading}>
            {t('buttons.keepBooking')}
          </Button>
          <Button
            className="flex-1 rounded-lg font-medium flex items-center justify-center"
            danger
            type="primary"
            size="large"
            onClick={handleConfirm}
            loading={loading}
          >
            {t('modal.yesCancel')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
