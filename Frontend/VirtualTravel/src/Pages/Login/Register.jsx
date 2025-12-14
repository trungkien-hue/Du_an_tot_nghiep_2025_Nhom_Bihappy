import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import authApi from "../../services/authApi";

export default function Register({ embedded = false, onSwitch }) {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !pass || !confirm) {
      return setError("Vui lòng nhập đầy đủ thông tin.");
    }
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
    if (!emailOk) return setError("Email không hợp lệ.");

    if (!/@gmail\.com$/i.test(email.trim())) {
      return setError("Hệ thống hiện chỉ chấp nhận email @gmail.com");
    }

    if (pass.length < 6) return setError("Mật khẩu tối thiểu 6 ký tự.");
    if (pass !== confirm) return setError("Mật khẩu xác nhận không khớp.");

    try {
      setLoading(true);
      await authApi.register({
        fullName: fullName.trim(),
        email: email.trim(),
        password: pass,
        phone: phone.trim(),
      });

      if (embedded && typeof onSwitch === "function") {
        onSwitch();
      } else {
        navigate("/login", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-white text-slate-900 flex items-center justify-center px-6 py-10">
      <main className="mx-auto max-w-6xl w-full grid grid-cols-1 md:grid-cols-2 gap-10 items-center">

        {/* Left Text Block */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden md:block"
        >
          <h2 className="text-4xl md:text-5xl font-extrabold leading-tight text-slate-800">
            Tạo tài khoản{" "}
            <span className="bg-gradient-to-r from-cyan-500 via-teal-500 to-amber-400 bg-clip-text text-transparent">
              VirtualTravel
            </span>
          </h2>

          <p className="mt-4 text-slate-600 text-base max-w-md">
            Tham gia cộng đồng du lịch của chúng tôi để nhận ưu đãi, gợi ý hành trình
            và đặt tour/khách sạn nhanh chóng.
          </p>
        </motion.section>

        {/* Right: form */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
          className="flex justify-center"
        >
          <motion.div
            initial={{ scale: 0.985, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.35 }}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-lg"
          >
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold">Đăng ký</h3>
              <p className="mt-1 text-sm text-slate-500">
                Hoàn tất thông tin bên dưới để bắt đầu
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">

              {/* Họ và tên */}
              <div>
                <label className="text-sm text-slate-700">Họ và tên</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900
                    placeholder-slate-400 focus:border-cyan-500 focus:ring focus:ring-cyan-200"
                />
              </div>

              {/* SĐT */}
              <div>
                <label className="text-sm text-slate-700">Số điện thoại (tuỳ chọn)</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="09xx xxx xxx"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900
                    placeholder-slate-400 focus:border-cyan-500 focus:ring focus:ring-cyan-200"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm text-slate-700">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-900
                    placeholder-slate-400 focus:border-cyan-500 focus:ring focus:ring-cyan-200"
                />
                <p className="text-xs text-slate-500 mt-1">
                  * Hệ thống hiện chỉ chấp nhận email @gmail.com
                </p>
              </div>

              {/* Mật khẩu */}
              <div>
                <label className="text-sm text-slate-700">Mật khẩu</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="••••••"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 pr-10 text-slate-900
                      placeholder-slate-400 focus:border-cyan-500 focus:ring focus:ring-cyan-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    👁
                  </button>
                </div>
              </div>

              {/* Xác nhận mật khẩu */}
              <div>
                <label className="text-sm text-slate-700">Xác nhận mật khẩu</label>
                <div className="relative">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="••••••"
                    className="mt-1 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 pr-10 text-slate-900
                      placeholder-slate-400 focus:border-cyan-500 focus:ring focus:ring-cyan-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                  >
                    👁
                  </button>
                </div>
              </div>

              {/* Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.985 }}
                disabled={loading}
                className="mt-2 w-full h-11 rounded-xl bg-gradient-to-r from-cyan-500 via-teal-500 to-amber-400 
                font-semibold text-white shadow-md hover:opacity-95"
              >
                {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
              </motion.button>

            </form>

            {/* Login link */}
            <p className="mt-5 text-center text-sm text-slate-600">
              Đã có tài khoản?{" "}
              <Link className="font-semibold text-cyan-600 hover:text-cyan-500" to="/login">
                Đăng nhập
              </Link>
            </p>
          </motion.div>
        </motion.section>

      </main>
    </div>
  );
}
