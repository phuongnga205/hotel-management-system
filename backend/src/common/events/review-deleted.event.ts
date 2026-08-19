// Emit khi Admin xoá 1 review (DELETE /admin/reviews/:id) — nghe bởi
// NotificationsListener để báo cho User biết đánh giá của họ đã bị gỡ.
export class ReviewDeletedEvent {
  constructor(
    public readonly reviewId: string,
    public readonly userId: string,
    public readonly userEmail: string,
    public readonly username: string,
  ) {}
}
