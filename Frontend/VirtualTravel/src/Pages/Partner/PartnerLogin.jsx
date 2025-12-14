import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import partnerApi from "../../services/partnerApi";

export default function PartnerLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ Email: "", Password: "" });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await partnerApi.login(form);
      if (res?.token) {
        navigate("/partner/dashboard", { replace: true });
      } else {
        alert("Đăng nhập thất bại.");
      }
    } catch (err) {
      alert(err?.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-50 flex items-center justify-center px-4 py-10">
      <div className="mx-auto max-w-5xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
        {/* Left: intro text */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="hidden md:block"
        >
          <h1 className="text-3xl md:text-4xl font-extrabold text-slate-800 leading-tight">
            Cổng đối tác{" "}
            <span className="bg-gradient-to-r from-sky-500 via-cyan-500 to-emerald-400 bg-clip-text text-transparent">
              Khách Sạn
            </span>
          </h1>
          <p className="mt-4 text-slate-600 text-sm md:text-base max-w-md">
            Đăng nhập để quản lý phòng, giá, đơn đặt và đồng bộ dữ liệu với hệ
            thống VirtualTravel một cách dễ dàng.
          </p>

          <ul className="mt-6 space-y-2 text-sm text-slate-600">
            <li>• Theo dõi công suất phòng theo thời gian thực.</li>
            <li>• Nhận thông báo đặt phòng tức thì.</li>
            <li>• Cập nhật giá linh hoạt theo mùa và khuyến mãi.</li>
          </ul>
        </motion.section>

        {/* Right: login card */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.05 }}
          className="flex justify-center"
        >
          <motion.form
            onSubmit={submit}
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-lg px-7 py-8 space-y-5"
          >
            <div className="mb-2 text-center">
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                Đăng nhập đối tác
              </h2>
              <p className="mt-1 text-xs md:text-sm text-slate-500">
                Sử dụng tài khoản được cấp cho khách sạn/đối tác
              </p>
            </div>

            {/* Email */}
            <div className="text-sm">
              <label className="block text-slate-700 mb-1">Email</label>
              <input
                type="email"
                className="w-full h-11 rounded-xl border border-slate-300 px-3 text-sm text-slate-900 placeholder-slate-400 bg-white focus:border-sky-500 focus:ring focus:ring-sky-200 outline-none"
                placeholder="partner@hotel.com"
                value={form.Email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, Email: e.target.value }))
                }
                required
              />
            </div>

            {/* Password */}
            <div className="text-sm">
              <label className="block text-slate-700 mb-1">Mật khẩu</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  className="w-full h-11 rounded-xl border border-slate-300 px-3 pr-10 text-sm text-slate-900 placeholder-slate-400 bg-white focus:border-sky-500 focus:ring focus:ring-sky-200 outline-none"
                  placeholder="••••••••"
                  value={form.Password}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, Password: e.target.value }))
                  }
                  required
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                >
                  {showPassword ? (
                    // mắt mở
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.6}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    // mắt gạch
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.6}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 3l18 18M10.477 10.485A3 3 0 0113.5 13.5m-1.483 2.015A3 3 0 0110.5 10.5M6.228 6.228C4.32 7.36 2.94 9.061 2.458 12 3.732 16.057 7.523 19 12 19c1.48 0 2.877-.321 4.123-.897M9.88 4.567A9.06 9.06 0 0112 4.5c4.477 0 8.268 2.943 9.542 7-.37 1.178-.93 2.238-1.645 3.142"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              className="w-full h-11 rounded-xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-500 text-white text-sm font-semibold shadow-md hover:opacity-95 disabled:opacity-60"
            >
              {loading ? "Đang đăng nhập..." : "Đăng nhập"}
            </motion.button>

            {/* Footer link */}
            <div className="text-xs text-slate-500 mt-3 text-center md:text-left">
              Quay về{" "}
              <Link to="/login" className="font-medium text-sky-600 hover:text-sky-500">
                trang Login
              </Link>
            </div>
          </motion.form>
        </motion.section>
      </div>
    </div>
  );
}
