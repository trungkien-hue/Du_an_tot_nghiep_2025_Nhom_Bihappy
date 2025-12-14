// src/Pages/Payment/PaymentPage.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import bookingTourAPI from "../../services/bookingTourAPI.jsx";

function VND(n) {
  const num = Number(n || 0);
  return num.toLocaleString("vi-VN") + " đ";
}

export default function PaymentPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Dữ liệu booking được truyền qua navigate(..., { state })
  const booking = location.state || {};
  const {
    tourId,
    // nhận thêm 2 field này từ TourDetail
    priceAdult,
    priceChild,

    // nếu unitPriceAdult/Child không có thì dùng priceAdult/Child
    unitPriceAdult = priceAdult || 0,
    unitPriceChild = priceChild || 0,
    _currency = "VND",

    productName = "Tour du lịch",
    startDate,
    guestCounts,
    totalPrice = 0, // giá gốc của booking (chưa giảm)
    depositDue = 0,
    fullName,
    phone,
  } = booking;

  // Chỉ dùng cho TOUR: 2 lựa chọn thanh toán
  const [paymentOption, setPaymentOption] = useState("deposit"); // 'deposit' | 'full'
  const [provider, setProvider] = useState("momo"); // 'momo' | 'zalopay'

  const displayTitle = "Thanh toán đặt tour";

  // Giảm giá khi thanh toán 100%
  const FULL_PAYMENT_DISCOUNT = 500_000;

  // Tiền cọc hiệu lực (fallback: 30% tổng tiền nếu BE chưa gửi)
  const effectiveDeposit = useMemo(() => {
    if (depositDue && depositDue > 0) return depositDue;
    return totalPrice * 0.3;
  }, [depositDue, totalPrice]);

  // Tổng tiền cuối cùng của booking (sau khi áp dụng giảm 500k nếu chọn thanh toán 100%)
  const finalTotalPrice = useMemo(() => {
    if (paymentOption === "full") {
      return Math.max(0, totalPrice - FULL_PAYMENT_DISCOUNT);
    }
    // nếu chỉ đặt cọc, totalPrice vẫn là giá gốc
    return totalPrice;
  }, [paymentOption, totalPrice]);

  // Số tiền cần thanh toán theo lựa chọn hiện tại
  const amountToPay = useMemo(() => {
    if (paymentOption === "full") {
      // thanh toán toàn bộ = tổng tiền cuối cùng (đã trừ 500k)
      return finalTotalPrice;
    }
    // đặt cọc = tiền cọc
    return effectiveDeposit;
  }, [paymentOption, finalTotalPrice, effectiveDeposit]);

  // QR demo (sau này thay bằng QR thật hoặc ảnh động)
  const qrLabel =
    provider === "momo" ? "QR Momo (demo)" : "QR ZaloPay (demo)";

  // 🧾 Gọi API /tourbookings để tạo đơn thực tế
  const handleConfirm = async () => {
    if (!paymentOption) {
      alert("Vui lòng chọn hình thức thanh toán.");
      return;
    }

    if (!tourId) {
      alert("Thiếu TourID, không thể tạo đơn. Vui lòng quay lại chọn tour.");
      return;
    }

    try {
      const adultGuests = Number(guestCounts?.adult || 0);
      const childGuests = Number(guestCounts?.child || 0);

      const payloadApi = {
        TourID: tourId,
        TourAvailabilityID: null,
        StartDate: startDate, // Date string "yyyy-MM-dd" -> ASP.NET parse DateTime OK

        AdultGuests: adultGuests,
        ChildGuests: childGuests,

        UnitPriceAdult: unitPriceAdult,
        UnitPriceChild: unitPriceChild,

        FullName: (fullName || "").trim(),
        Phone: (phone || "").trim(),
        Requests: null,

        // Tổng tiền thực tế của booking:
        // - Nếu thanh toán full: đã trừ 500k
        // - Nếu đặt cọc: vẫn là giá gốc
        TotalPrice: finalTotalPrice,
      };

      const res = await bookingTourAPI.create(payloadApi);
      const data = res?.data ?? {};
      const bookingId = data.BookingID || data.bookingID;

      // Thông báo "thanh toán giả lập" + kết quả tạo đơn
      if (paymentOption === "full") {
        alert(
          `Đã tạo đơn tour #${bookingId || "?"}.\n\nGiả lập thanh toán TOÀN BỘ qua ${provider.toUpperCase()} số tiền ${VND(
            amountToPay
          )} (đã giảm ${VND(FULL_PAYMENT_DISCOUNT)} so với giá gốc ${VND(
            totalPrice
          )}).\n\nSau khi tích hợp thật sẽ tạo QR/link thanh toán tại đây.`
        );
      } else {
        alert(
          `Đã tạo đơn tour #${bookingId || "?"}.\n\nGiả lập thanh toán ĐẶT CỌC qua ${provider.toUpperCase()} số tiền ${VND(
            amountToPay
          )}.\n\nTổng giá tour của booking là ${VND(
            finalTotalPrice
          )}.\n\nSau khi tích hợp thật sẽ tạo QR/link thanh toán tại đây.`
        );
      }

      // Sau khi xong: quay về trang chủ (hoặc trang lịch sử đơn nếu bạn muốn)
      navigate("/");
    } catch (err) {
      console.error(err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data?.Message ||
        err?.message ||
        "Đặt tour thất bại.";
      alert(msg);
    }
  };

  if (!totalPrice && !productName) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
        <div className="bg-white rounded-2xl shadow px-6 py-5 border border-slate-200">
          <p className="font-semibold mb-2">
            Không tìm thấy thông tin đơn hàng.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="mt-1 text-sm text-sky-600 underline"
          >
            Quay lại
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* tăng padding-top để nội dung không dính header */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-24 pb-10">
        {/* Header */}
        <header className="mb-6 text-center md:text-left">
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            <span className="bg-gradient-to-r from-indigo-600 to-sky-600 bg-clip-text text-transparent">
              {displayTitle}
            </span>
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xl md:max-w-2xl">
            Chọn hình thức thanh toán phù hợp. Bạn có thể đặt cọc theo quy định
            của tour hoặc thanh toán 100% qua QR (Momo / ZaloPay) để được giảm
            thêm 500.000 đ.
          </p>
        </header>

        {/* === 2 cột cân giữa === */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Thông tin đơn hàng */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">
                Thông tin đặt tour
              </h2>
              <div className="text-sm space-y-1">
                <Row label="Sản phẩm" value={productName} />
                {startDate && (
                  <Row
                    label="Ngày khởi hành"
                    value={new Date(startDate).toLocaleDateString("vi-VN")}
                  />
                )}

                {guestCounts && (
                  <Row
                    label="Số khách"
                    value={`Người lớn: ${
                      guestCounts.adult ?? 0
                    }, Trẻ em: ${guestCounts.child ?? 0}`}
                  />
                )}
                <Row label="Người đặt" value={fullName || "-"} />
                <Row label="Số điện thoại" value={phone || "-"} />
              </div>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">
                Tóm tắt chi phí
              </h3>
              <div className="text-sm space-y-1">
                {/* Giá gốc */}
                <Row label="Giá gốc tour" value={VND(totalPrice)} />
                {/* Tổng tiền cuối cùng */}
                <Row
                  label="Tổng tiền booking"
                  value={VND(finalTotalPrice)}
                  bold
                />
                {!!effectiveDeposit && (
                  <Row
                    label="Tiền cọc (theo tour)"
                    value={VND(effectiveDeposit)}
                  />
                )}
                {paymentOption === "full" && (
                  <Row
                    label="Giảm khi thanh toán 100%"
                    value={`- ${VND(FULL_PAYMENT_DISCOUNT)}`}
                  />
                )}
              </div>
            </div>
          </section>

          {/* Phương thức thanh toán */}
          <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Phương thức thanh toán
              </h2>
            </div>

            {/* 1. Hình thức thanh toán -> dropdown + mô tả bên dưới */}
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-800">
                1. Hình thức thanh toán
              </p>
              <select
                value={paymentOption}
                onChange={(e) => setPaymentOption(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="deposit">Đặt cọc theo quy định tour</option>
                <option value="full">Thanh toán 100% (giảm 500.000 đ)</option>
              </select>

              <div className="mt-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600 leading-relaxed">
                {paymentOption === "deposit" ? (
                  <>
                    Bạn chọn <span className="font-semibold">Đặt cọc</span>. Số
                    tiền cần thanh toán trước dự kiến là{" "}
                    <span className="font-semibold">
                      {VND(effectiveDeposit)}
                    </span>
                    , phần còn lại sẽ thanh toán khi khởi hành. Tổng giá tour
                    của booking là{" "}
                    <span className="font-semibold">
                      {VND(finalTotalPrice)}
                    </span>
                    .
                  </>
                ) : (
                  <>
                    Bạn chọn{" "}
                    <span className="font-semibold">Thanh toán 100%</span>. Bạn
                    sẽ thanh toán toàn bộ chi phí tour ngay bây giờ là{" "}
                    <span className="font-semibold">
                      {VND(finalTotalPrice)}
                    </span>{" "}
                    sau khi đã được giảm{" "}
                    <span className="font-semibold">
                      {VND(FULL_PAYMENT_DISCOUNT)}
                    </span>{" "}
                    từ giá gốc{" "}
                    <span className="font-semibold">{VND(totalPrice)}</span>.
                  </>
                )}
              </div>
            </div>

            {/* 2. Nhà cung cấp ví */}
            <div className="space-y-2 text-sm">
              <p className="font-medium text-slate-800">
                2. Ví điện tử / Cổng thanh toán
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setProvider("momo")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    provider === "momo"
                      ? "border-pink-500 bg-pink-50 text-pink-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  Momo QR
                </button>
                <button
                  type="button"
                  onClick={() => setProvider("zalopay")}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                    provider === "zalopay"
                      ? "border-sky-500 bg-sky-50 text-sky-700"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  ZaloPay QR
                </button>
              </div>

              {/* QR demo */}
              <div className="mt-3 border border-dashed border-slate-300 rounded-2xl p-3 text-center">
                <p className="text-xs text-slate-500 mb-2">
                  Quét {qrLabel} để thanh toán:
                </p>
                <div className="mx-auto aspect-square max-w-[180px] rounded-xl bg-slate-100 flex items-center justify-center">
                  {/* Sau này bạn thay bằng <img src={qrUrl} /> */}
                  <span className="text-[11px] text-slate-400">
                    QR {provider.toUpperCase()} demo
                    <br />
                    {VND(amountToPay)}
                  </span>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-center justify-between text-sm mb-3">
                <span className="text-slate-600">Số tiền cần thanh toán</span>
                <span className="font-semibold text-indigo-700">
                  {VND(amountToPay)}
                </span>
              </div>
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full rounded-xl bg-indigo-600 text-white text-sm font-semibold px-4 py-2.5 hover:bg-indigo-700 shadow"
              >
                Xác nhận thanh toán
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="mt-2 w-full text-xs text-slate-500 underline"
              >
                Quay lại bước trước
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between py-0.5 text-sm">
      <span
        className={`text-slate-600 ${
          bold ? "font-semibold text-slate-800" : ""
        }`}
      >
        {label}
      </span>
      <span className={bold ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
