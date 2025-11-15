import axiosClient from "./axiosClient";

/* -------------------- ORDERS -------------------- */

export const getBookingsPaged = ({
  page = 1,
  pageSize = 10,
  status = "Pending",
  keyword = "",
  type = ""        // <— NEW
}) => {
  const q = new URLSearchParams({ page, pageSize, status, keyword, type });
  return axiosClient.get(`/staff/orders/paged?${q.toString()}`);
};


// ✅ Xác nhận booking (Pending → Completed)
export const confirmBooking = (id) => axiosClient.post(`/staff/orders/confirm/${id}`);

// ✅ Hủy booking
export const cancelBooking = (id) => axiosClient.post(`/staff/orders/cancel/${id}`);

/* -------------------- REPORTS -------------------- */

// ✅ Báo cáo Tour — lọc theo tháng / năm
export const getTourAggregates = ({
  page = 1,
  pageSize = 10,
  keyword = "",
  month = "",
  year = "",
}) => {
  const q = new URLSearchParams({ page, pageSize, keyword, month, year });
  // ✅ Endpoint: /api/staff/reports/tours
  return axiosClient.get(`/staff/reports/tours?${q.toString()}`);
};

// ✅ Báo cáo Hotel — lọc theo tháng / năm
export const getHotelAggregates = ({
  page = 1,
  pageSize = 10,
  keyword = "",
  month = "",
  year = "",
}) => {
  const q = new URLSearchParams({ page, pageSize, keyword, month, year });
  // ✅ Endpoint: /api/staff/reports/hotels
  return axiosClient.get(`/staff/reports/hotels?${q.toString()}`);
};
// ✅ Doanh thu 12 tháng theo Tour
export const getTourSummary = (year = new Date().getFullYear()) =>
  axiosClient.get(`/staff/reports/tours/summary?year=${year}`);

// ✅ Doanh thu 12 tháng theo Hotel
export const getHotelSummary = (year = new Date().getFullYear()) =>
  axiosClient.get(`/staff/reports/hotels/summary?year=${year}`);
