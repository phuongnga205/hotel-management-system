const MOCK_AVATAR_URL = 'https://i.pravatar.cc/150?img=11'

export const userApi = {
  getProfile: async () => {
    return new Promise(resolve => setTimeout(() => resolve({
      name: 'Nguyễn Văn A',
      email: 'nguyenvana@gmail.com',
      phone: '0901234567',
      address: '123 Đường ABC, Quận 1, TP.HCM',
      avatarUrl: MOCK_AVATAR_URL
    }), 500))
  },
  updateProfile: async (_data: any) => {
    return new Promise(resolve => setTimeout(() => resolve({ success: true }), 500))
  },
}
