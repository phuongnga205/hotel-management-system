export function getMonthlyReportHtml(
  reportMonth: string,
  totalBookings: number,
  paidBookingsCount: number,
  totalRevenue: string,
  title: string,
  description: string,
  totalBookingsLabel: string,
  totalPaidBookingsLabel: string,
  totalRevenueLabel: string,
): string {
  return `
    <h2>${title}</h2>
    <p>${description}</p>
    <ul>
      <li><strong>${totalBookingsLabel}</strong> ${totalBookings}</li>
      <li><strong>${totalPaidBookingsLabel}</strong> ${paidBookingsCount}</li>
      <li><strong>${totalRevenueLabel}</strong> $${totalRevenue}</li>
    </ul>
  `;
}
