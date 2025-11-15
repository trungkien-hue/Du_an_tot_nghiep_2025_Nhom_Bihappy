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

    // (Tùy chọn) Nếu backend yêu cầu @gmail.com:
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

      // Đăng ký xong → nếu đang embedded thì chuyển sang tab login,
      // còn không thì navigate sang /login như cũ
      if (embedded && typeof onSwitch === "function") {
        onSwitch(); // chuyển sang form login
      } else {
        navigate("/auth", { replace: true }); // hoặc "/login"
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Đăng ký thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-b from-slate-50 via-white to-slate-50 text-slate-900 md:rounded-3xl md:border md:border-slate-200 md:shadow-2xl md:py-6">
      <main className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 pt-10 pb-10 md:grid-cols-2">
        {/* Left: tagline */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="hidden md:block"
        >
          <div className="max-w-xl">
            <h2 className="text-4xl font-extrabold tracking-tight text-slate-800 md:text-5xl">
              Tạo tài khoản{" "}
              <span className="bg-gradient-to-r from-cyan-500 via-teal-500 to-amber-400 bg-clip-text text-transparent">
                VirtualTravel
              </span>
            </h2>
            <p className="mt-4 text-slate-600">
              Tham gia cộng đồng du lịch của chúng tôi để nhận ưu đãi, gợi ý hành trình
              và đặt tour/khách sạn nhanh chóng.
            </p>
          </div>
        </motion.section>

        {/* Right: form */}
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="flex w-full items-center justify-center"
        >
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-xl"
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
              <div>
                <label htmlFor="fullName" className="mb-1 block text-sm text-slate-700">
                  Họ và tên
                </label>
                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="Nguyễn Văn A"
                />
              </div>

              <div>
                <label htmlFor="phone" className="mb-1 block text-sm text-slate-700">
                  Số điện thoại (tuỳ chọn)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="09xx xxx xxx"
                />
              </div>

              <div>
                <label htmlFor="email" className="mb-1 block text-sm text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-slate-900 placeholder-slate-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="you@gmail.com"
                />
                <p className="mt-1 text-xs text-slate-500">
                  * Hệ thống hiện chỉ chấp nhận email @gmail.com
                </p>
              </div>

              <div>
                <label htmlFor="pass" className="mb-1 block text-sm text-slate-700">
                  Mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="pass"
                    type={showPass ? "text" : "password"}
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-slate-900 placeholder-slate-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    title={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    👁
                  </button>
                </div>
                <p className="mt-1 text-xs text-slate-500">* Tối thiểu 6 ký tự</p>
              </div>

              <div>
                <label htmlFor="confirm" className="mb-1 block text-sm text-slate-700">
                  Xác nhận mật khẩu
                </label>
                <div className="relative">
                  <input
                    id="confirm"
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-slate-900 placeholder-slate-400 focus:border-cyan-400/70 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700"
                    aria-label={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    title={showConfirm ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    👁
                  </button>
                </div>
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-amber-400 px-4 py-3 font-semibold text-white shadow-lg disabled:opacity-70"
              >
                {loading ? "Đang tạo tài khoản…" : "Đăng ký"}
              </motion.button>
            </form>

            <div className="mt-5 text-center text-sm text-slate-600">
              Đã có tài khoản?{" "}
              {embedded ? (
                <button
                  type="button"
                  onClick={() => onSwitch?.()}
                  className="font-semibold text-cyan-600 hover:text-cyan-500"
                >
                  Đăng nhập
                </button>
              ) : (
                <Link to="/login" className="font-semibold text-cyan-600 hover:text-cyan-500">
                  Đăng nhập
                </Link>
              )}
            </div>
          </motion.div>
        </motion.section>
      </main>
    </div>
  );
}
