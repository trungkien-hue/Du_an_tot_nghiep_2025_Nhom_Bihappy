import axiosClient from "./axiosClient";

const chatBotAPI = {
  sendMessage: async (message, userID = null) => {
    try {
      const payload = { message, userID };
      const response = await axiosClient.post("/Chat", payload); // endpoint backend
      return response;
    } catch (error) {
      console.error("Error sending message to ChatBot API:", error);
      return { reply: "Xin lỗi, có lỗi xảy ra", tours: [], hotels: [] };
    }
  },
};

export default chatBotAPI;
