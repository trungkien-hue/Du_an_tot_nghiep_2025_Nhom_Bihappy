import axiosClient from "./axiosClient";

const bookingHotelAPI = {
  createBooking: (data) => axiosClient.post("/Bookings", data),
  getBookingsByUser: (userId) => axiosClient.get(`/Bookings/user/${userId}`),
};

export default bookingHotelAPI;
