import axiosClient from "./axiosClient";

const hotelService = {
  // Lấy tất cả khách sạn
  getAll: () => axiosClient.get("/hotels"),

  // Lấy chi tiết khách sạn theo ID
  getById: (id) => axiosClient.get(`/hotels/${id}`),

  // Tìm kiếm khách sạn theo availability
  searchAvailability: (searchParams) =>
    axiosClient.post("/hotels/search-availability", searchParams),

  // Đặt phòng
  book: (bookingData) => axiosClient.post("/Bookings", bookingData),
};

export default hotelService;
