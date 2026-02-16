// ============================================================
// BookFlow — Analytics Types
// ============================================================

export type DateRangePreset = "today" | "week" | "month" | "custom";

export interface DateRange {
  start: string; // YYYY-MM-DD
  end: string;
}

// Revenue
export interface RevenueMetrics {
  totalRevenue: number;
  revenueTrend: { date: string; revenue: number; bookings: number }[];
  revenueByService: { serviceName: string; serviceId: string; revenue: number; count: number }[];
  revenueByStaff: { staffName: string; staffId: string; revenue: number; count: number }[];
  paymentMethodsBreakdown: { method: string; amount: number; count: number }[];
  averageTransactionValue: number;
  advanceVsFullRatio: { advance: number; full: number; advancePercent: number };
}

// Bookings
export interface BookingMetrics {
  totalBookings: number;
  statusDistribution: { status: string; count: number; percent: number }[];
  cancellationRate: number;
  noShowRate: number;
  peakHoursHeatmap: { hour: number; count: number }[];
  peakDays: { day: number; dayName: string; count: number }[];
  bookingSource?: { source: string; count: number }[];
}

// Customers
export interface CustomerMetrics {
  totalCustomers: number;
  newCustomersThisMonth: number;
  repeatCustomersPercent: number;
  retentionRate: number;
  averageCLV: number;
  mostLoyalCustomers: { customerName: string; customerId: string; visitCount: number }[];
  inactiveCount: number; // > 60 days
}

// Services
export interface ServiceMetrics {
  mostPopular: { serviceName: string; serviceId: string; bookingCount: number }[];
  mostProfitable: { serviceName: string; serviceId: string; revenue: number }[];
  utilizationRate: number;
  avgDurationActual?: number;
  avgDurationEstimated?: number;
}

// Staff
export interface StaffMetrics {
  bookingsPerStaff: { staffName: string; staffId: string; bookings: number }[];
  revenuePerStaff: { staffName: string; staffId: string; revenue: number }[];
  avgRatingPerStaff?: { staffName: string; staffId: string; rating: number }[];
  utilizationRate: { staffName: string; staffId: string; percent: number }[];
  commissionEarnings?: { staffName: string; staffId: string; amount: number }[];
}

// Operational
export interface OperationalMetrics {
  avgBookingLeadTimeDays: number;
  sameDayBookingsPercent: number;
  bookingCompletionRate: number;
  customerWaitTime?: number;
  serviceDelayPercent?: number;
}
