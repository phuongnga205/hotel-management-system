import { getMonthlyReportHtml } from './monthly-report.template';

describe('getMonthlyReportHtml', () => {
  it('keeps the preformatted decimal revenue unchanged', () => {
    const preciseRevenue = '99999999999999999999.99';

    const html = getMonthlyReportHtml(
      '2026-08',
      10,
      8,
      preciseRevenue,
      'Report',
      'Description',
      'Bookings:',
      'Paid:',
      'Revenue:',
    );

    expect(html).toContain(`$${preciseRevenue}`);
  });
});
