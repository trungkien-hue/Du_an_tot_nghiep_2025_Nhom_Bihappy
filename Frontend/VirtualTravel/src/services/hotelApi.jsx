// ==============================================
// File: src/services/hotelApi.js
// OPTION C – FINAL PRICE PIPELINE
// ==============================================

import axiosClient from "./axiosClient";

const hotelService = {
  // Lấy tất cả khách sạn
  getAll: () => axiosClient.get("/hotels"),

  // Lấy chi tiết khách sạn theo ID
  getById: (id) => axiosClient.get(`/hotels/${id}`),

  getSummary: (params) =>
  axiosClient.get("/hotels/summary", { params }),
  

  // Kiểm tra availability
  searchAvailability: (searchParams) =>
    axiosClient.post("/hotels/search-availability", searchParams),

  // ==========================================
  // ĐẶT PHÒNG (Option C — gửi final price)
  // ==========================================
  book: (bookingData) => {
    const payload = {
      hotelID: bookingData.hotelID,
      hotelName: bookingData.hotelName,
      location: bookingData.location,

      roomTypeID: bookingData.roomTypeID,

      checkInDate: bookingData.checkInDate,
      checkOutDate: bookingData.checkOutDate,

      fullName: bookingData.fullName,
      phone: bookingData.phone,
      requests: bookingData.requests ?? "",

      // ⭐ GIÁ OPTION C
      price: Number(bookingData.finalPrice ?? bookingData.originalPrice ?? 0), // ⭐ thêm price
      originalPrice: Number(bookingData.originalPrice ?? 0),
      finalPrice: Number(bookingData.finalPrice ?? 0),


      totalOriginal: Number(bookingData.totalOriginal ?? 0),
      totalFinal: Number(bookingData.totalFinal ?? 0),

      voucherApplied: bookingData.voucherApplied ?? null,

      nights: Number(bookingData.nights ?? 1),
      quantity: Number(bookingData.quantity ?? 1),

      paymentTiming: bookingData.paymentTiming,
      paymentProvider: bookingData.paymentProvider ?? null,
    };

    return axiosClient.post("/Bookings", payload);
  },
};

export default hotelService;
