// TODO(session sau): ChangePasswordPage — /profile/change-password (can AuthGuard)
// Doc bat buoc doc truoc: frontend/docs/bridge.md muc 1, backend/docs/DANH_SACH_API.md muc 2,
// frontend/docs/DANH_SACH_MAN_HINH.md muc D.
//
// - API da san sang: userApi.changePassword(data: ChangePasswordPayload) trong api/user.api.ts
//   (PATCH /users/me/password) - chi thieu UI, KHONG can sua tang API.
// - Form fields: currentPassword, newPassword, confirmNewPassword (confirmNewPassword CHI validate
//   client-side khop voi newPassword, KHONG gui len BE - ChangePasswordPayload chi co
//   currentPassword + newPassword).
// - Khac ResetPasswordPage (pages/auth/ResetPasswordPage.tsx) o cho: trang nay BAT BUOC nhap
//   currentPassword (da dang nhap roi), ResetPasswordPage dung OTP vi chua dang nhap duoc - 2 luong
//   khac nhau hoan toan, DUNG nham lan/dung chung component.
// - Thanh cong -> toast + co the redirect ve /profile hoac o lai trang voi form reset trong.
// - Loi goi getErrorMessage() tu api/errorMessage.ts (vd sai currentPassword -> BE tra loi ro qua
//   message, khong tu doan/hardcode text loi).
// - Component tai su dung: form input theo pattern components/inputBase.ts, components/FieldLabel.tsx.
// - i18n: dung chung namespace 'profile' da co san (kiem tra key hien co truoc khi tao key trung).
// - Sau khi dung xong: dang ky route trong router/paths.ts (them ROUTES.PROFILE_CHANGE_PASSWORD,
//   hien CHUA co) + router/index.tsx (bo trong AuthGuard, canh /profile).

export const ChangePasswordPage = () => {
  return null
}
