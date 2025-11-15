import axiosClient from "../axiosClient";

const prefix = "/admin/reports";

const reportApi = {
  // GET /reports/summary
  async getSummary() {
    // gợi ý response:
    // { hotelCount, tourCount, userCount, bookings: [{month:'2025-10', hotelBookings: 12, tourBookings: 7}, ...] }
    return axiosClient.get(`${prefix}/summary`);
  },

  // GET /reports/monthly?year=2025
  async getMonthly(year) {
    return axiosClient.get(`${prefix}/monthly${year ? `?year=${year}` : ""}`);
  },
};

export default reportApi;
