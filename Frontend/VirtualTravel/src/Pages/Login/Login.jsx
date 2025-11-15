import { useState, useRef, useEffect, useMemo } from "react";
import { motion, useAnimationFrame, useMotionValue } from "framer-motion";
import { useNavigate, Link } from "react-router-dom";
import authApi from "../../services/authApi";
import { emitAuthChanged } from "../../services/authBus";

/* ================= CONFIG ================= */
const AUTH_BASE =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "http://localhost:5059";

const FRONTEND_BASE =
  import.meta.env.VITE_SITE_URL ||
  (typeof window !== "undefined" ? window.location.origin : "http://localhost:5173");

/* ============== COMPONENT ============== */
export default function Login({ embedded = false, onSwitch, light = false }) {
  const navigate = useNavigate();

  /* -------- Classic login states -------- */
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [remember, setRemember] = useState(true);

  /* -------- OAuth (popup) listener -------- */
  useEffect(() => {
    const onMessage = (e) => {
      const data = e.data || {};
      if (data?.token) {
        try {
          localStorage.setItem("vt_auth_token", data.token);
          emitAuthChanged();
          navigate("/");
        } catch (err) {
          console.error("Save token error:", err);
        }
      }
      if (data?.error) setError(data.error || "Đăng nhập mạng xã hội thất bại.");
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [navigate]);

  /* -------- Submit classic login -------- */
  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }
    try {
      setLoading(true);
      const res = await authApi.login({
        loginIdentifier: email.trim(), // email/phone/fullname
        password,
      });

      const token = res?.token;
      const user = res?.user;
      if (!token) throw new Error("Không nhận được token.");

      const pack = { token, user };
      localStorage.setItem("auth", JSON.stringify(pack));
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(user || {}));
      localStorage.setItem("vt_auth_token", token);
      localStorage.setItem("vt_user", JSON.stringify(user || {}));

      emitAuthChanged();
      navigate("/");
    } catch (err) {
      console.error("Login error:", err);
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        "Đăng nhập thất bại. Vui lòng thử lại.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* -------- Car Path Animation -------- */
  const progress = useMotionValue(0);
  const direction = useRef(1);
  const pathRef = useRef(null);
  const carRef = useRef(null);

  // ✨ TẮT animation nếu light=true để tiết kiệm CPU/GPU
  useAnimationFrame((t, delta) => {
    if (light) return;
    if (!pathRef.current || !carRef.current) return;
    const path = pathRef.current;
    const length = path.getTotalLength();

    let p = progress.get() + direction.current * (delta / 8000);
    if (p > 1) {
      p = 1;
      direction.current = -1;
    } else if (p < 0) {
      p = 0;
      direction.current = 1;
    }

    progress.set(p);
    const point = path.getPointAtLength(p * length);
    const nextPoint = path.getPointAtLength(Math.min(p * length + 1, length));
    const angle =
      (Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * 180) / Math.PI;
    carRef.current.setAttribute(
      "transform",
      `translate(${point.x - 10},${point.y - 10}) rotate(${angle},10,10)`
    );
  });

  /* -------- Sakura petals (memo + giảm số lượng) -------- */
  const petals = useMemo(() => {
    const count = light ? 12 : 60;
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * (light ? 2 : 6),
      duration: (light ? 6 : 8) + Math.random() * (light ? 4 : 8),
      size: (light ? 2.5 : 3) + Math.random() * (light ? 2.5 : 4),
      rotate: Math.random() * 360,
    }));
  }, [light]);

  /* -------- OAuth helpers -------- */
  const openOAuthPopup = (provider) => {
    const url = `${AUTH_BASE}/auth/${provider}?mode=popup`;
    const w = 520;
    const h = 620;
    const y = window.top.outerHeight / 2 + window.top.screenY - h / 2;
    const x = window.top.outerWidth / 2 + window.top.screenX - w / 2;

    const popup = window.open(
      url,
      `${provider}-oauth`,
      `toolbar=no, location=no, status=no, menubar=no, scrollbars=yes, resizable=yes, width=${w}, height=${h}, top=${y}, left=${x}`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = `${AUTH_BASE}/auth/${provider}`;
    }
  };

  const handleLoginGoogle = () => openOAuthPopup("google");
  const handleLoginFacebook = () => openOAuthPopup("facebook");

  /* -------- Forgot Password Modal -------- */
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpLoading, setFpLoading] = useState(false);
  const [fpError, setFpError] = useState("");
  const [fpDone, setFpDone] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!cooldown) return;
    const t = setInterval(() => setCooldown((c) => (c > 0 ? c - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [cooldown]);

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

  const requestPasswordReset = async () => {
    setFpError("");
    if (!fpEmail || !emailRegex.test(fpEmail.trim())) {
      setFpError("Vui lòng nhập email hợp lệ.");
      return;
    }
    if (cooldown > 0) return;

    try {
      setFpLoading(true);
      const res = await fetch(`${AUTH_BASE}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fpEmail.trim(),
          redirectUrl: `${FRONTEND_BASE}/reset-password`,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Không thể gửi email đặt lại mật khẩu.");
      }

      setFpDone(true);
      setCooldown(60);
    } catch (err) {
      console.error("Forgot password error:", err);
      setFpError(err.message || "Có lỗi xảy ra. Vui lòng thử lại.");
    } finally {
      setFpLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      {/* 🌸 Falling Sakura Petals (nhẹ hơn) */}
      {petals.map((p) => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.left}vw`, rotate: p.rotate }}
          animate={{
            y: "110vh",
            x: [`${p.left}vw`, `${p.left + (light ? 4 : 10)}vw`],
            rotate: [p.rotate, p.rotate + (light ? 180 : 360)],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "linear",
          }}
          className="pointer-events-none absolute top-0 z-0 will-change-transform"
        >
          <div
            className={`rounded-full ${
              light ? "bg-pink-300/70" : "bg-pink-300/80 shadow-[0_0_6px_rgba(255,192,203,0.35)]"
            }`}
            style={{
              width: p.size,
              height: p.size * 0.7,
              transform: "rotate(45deg)",
              borderRadius: "50% 70% 50% 70% / 70% 50% 70% 50%",
            }}
          />
        </motion.div>
      ))}

      {/* Background grid — giảm opacity khi light */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: light ? 0.1 : 0.2,
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(255,255,255,.08) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      />

      {/* Aurora gradient — giữ, nhưng đã giảm trong AuthPage */}

      {/* Hero layout */}
      <main className="relative z-10 mx-auto grid w-full max-w-7xl grid-cols-1 items-center gap-12 px-6 pt-32 pb-16 md:grid-cols-2">
        {/* Left side (tắt SVG car khi light) */}
        <motion.section
          initial={{ opacity: 0, y: light ? 10 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: light ? 0.35 : 0.6 }}
          className="hidden md:block relative will-change-transform"
        >
          <div className="max-w-xl">
            <h2 className="text-4xl font-extrabold tracking-tight text-cyan-300 md:text-5xl">
              Chào mừng đến{" "}
              <span className="bg-gradient-to-r from-cyan-300 via-teal-300 to-amber-300 bg-clip-text text-transparent">
                VirtualTravel
              </span>
            </h2>
            <p className="mt-4 text-slate-300">
              Khám phá thế giới theo cách bạn muốn. Đăng nhập để bắt đầu hành
              trình tuyệt vời ngay hôm nay!
            </p>

            {!light && (
              <svg viewBox="0 0 400 140" className="mt-10 w-full text-cyan-400/60">
                <path
                  ref={pathRef}
                  d="M10 100 C 80 20, 160 180, 230 90 S 360 40, 390 100"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeDasharray="6 6"
                />
                <image
                  ref={carRef}
                  href="https://cdn-icons-png.flaticon.com/512/741/741407.png"
                  width="24"
                  height="24"
                  className="drop-shadow-[0_0_10px_rgba(56,189,248,0.8)]"
                />
              </svg>
            )}
          </div>
        </motion.section>

        {/* Right side: Form */}
        <motion.section
          initial={{ opacity: 0, y: light ? 10 : 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: light ? 0.35 : 0.65, delay: light ? 0 : 0.1 }}
          className="flex w-full items-center justify-center will-change-transform"
        >
          <motion.div
            initial={{ scale: light ? 1 : 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: light ? 0.3 : 0.45 }}
            className={`w-full max-w-md rounded-3xl ${
              light ? "border border-white/10 bg-white/5" : "border border-white/10 bg-white/5"
            } p-8 shadow-2xl backdrop-blur-xl`}
          >
            <div className="mb-6 text-center">
              <h3 className="text-2xl font-bold text-slate-100">Đăng nhập</h3>
              <p className="mt-1 text-sm text-slate-400">
                Tiếp tục hành trình khám phá của bạn
              </p>
            </div>

            {error && (
              <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1 block text-sm text-slate-300">
                  Email / SĐT / Họ tên
                </label>
                <input
                  id="email"
                  type="text"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-slate-100 placeholder-slate-400 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="you@gmail.com hoặc 09xxx hoặc Họ Tên"
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm text-slate-300 mb-1 block">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setFpEmail(email);
                    }}
                    className="text-xs text-cyan-300 hover:text-cyan-200"
                  >
                    Quên mật khẩu?
                  </button>
                </div>

                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 pr-10 text-slate-100 placeholder-slate-400 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-cyan-300"
                    aria-label={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    title={showPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                  >
                    👁
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="inline-flex items-center gap-2 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-cyan-400 focus:ring-cyan-500"
                  />
                  Ghi nhớ đăng nhập
                </label>

                {embedded ? (
                  <button
                    type="button"
                    onClick={() => onSwitch?.()}
                    className="text-sm text-cyan-300 hover:text-cyan-200"
                  >
                    Tạo tài khoản
                  </button>
                ) : (
                  <Link to="/register" className="text-sm text-cyan-300 hover:text-cyan-200">
                    Tạo tài khoản
                  </Link>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={loading}
                whileHover={{ scale: light ? 1.005 : 1.015 }}
                whileTap={{ scale: light ? 0.995 : 0.985 }}
                className="mt-3 w-full rounded-2xl bg-gradient-to-r from-cyan-500 via-teal-500 to-amber-400 px-4 py-3 font-semibold text-slate-900 shadow-lg disabled:opacity-70"
              >
                {loading ? "Đang đăng nhập…" : "Đăng nhập"}
              </motion.button>
            </form>

            {/* —— OR —— */}
            <div className="my-6 flex items-center gap-3 text-slate-400">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-xs">Hoặc</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            {/* Social Logins */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleLoginGoogle}
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
              >
                <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.9 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16.2 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34.3 6 29.4 4 24 4 16.1 4 9.2 8.5 6.3 14.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.1 0 9.9-2 13.4-5.2l-6.2-5.2C29.1 35.6 26.7 36.5 24 36c-5.1 0-9.4-3.3-10.9-7.9l-6.6 5.1C9.3 39.5 16.1 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.3-4.4 5.7-8.3 5.7-5.1 0-9.4-3.3-10.9-7.9l-6.6 5.1C9.3 39.5 16.1 44 24 44c8.9 0 19.6-6.5 19.6-20 0-1.2-.1-2.3-.4-3.5z"/>
                </svg>
                Đăng nhập với Google
              </button>

              <button
                type="button"
                onClick={handleLoginFacebook}
                className="w-full inline-flex items-center justify-center gap-3 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-slate-100 hover:bg-white/10 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="#1877F2"
                    d="M24 12.07C24 5.405 18.627 0 12 0S0 5.405 0 12.07C0 18.1 4.388 23.094 10.125 24v-8.43H7.078v-3.5h3.047V9.412c0-3.025 1.792-4.698 4.533-4.698 1.313 0 2.686.235 2.686.235v2.98h-1.513c-1.492 0-1.956.93-1.956 1.883v2.257h3.328l-.532 3.5h-2.796V24C19.612 23.094 24 18.1 24 12.07z"
                  />
                </svg>
                Đăng nhập với Facebook
              </button>
            </div>
            {/* 👉 Đăng nhập với tư cách Partner */}
<div className="my-6 flex items-center gap-3 text-slate-400">
  <div className="h-px flex-1 bg-white/10" />
  <span className="text-xs">Dành cho đối tác</span>
  <div className="h-px flex-1 bg-white/10" />
</div>

<div className="rounded-2xl border border-white/15 bg-white/5 p-4">
  <div className="flex items-center justify-between gap-3">
    <div>
      <div className="font-semibold text-slate-100">
        Đăng nhập với tư cách Partner
      </div>
      <div className="text-xs text-slate-400">
        Dành cho khách sạn đối tác (Hotel Portal)
      </div>
    </div>
    <button
      type="button"
      onClick={() => navigate("/partner/login")}
      className="shrink-0 rounded-2xl bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-amber-300 transition"
    >
      Partner Login
    </button>
  </div>
</div>
          </motion.div>
        </motion.section>
      </main>

      {/* ===== Forgot Password Modal ===== */}
      {showForgot && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowForgot(false)}
          />
          <motion.div
            initial={{ y: 16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="relative w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/90 p-6 text-slate-100 shadow-2xl"
          >
            <h4 className="text-lg font-semibold">Đặt lại mật khẩu</h4>
            <p className="mt-1 text-sm text-slate-400">
              Nhập địa chỉ email của bạn. Chúng tôi sẽ gửi liên kết để đặt lại mật khẩu.
            </p>

            {fpError && (
              <div className="mt-3 rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
                {fpError}
              </div>
            )}

            {fpDone ? (
              <div className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-3 text-sm text-emerald-300">
                Đã gửi email (nếu email tồn tại trong hệ thống). Vui lòng kiểm tra hộp thư.
              </div>
            ) : (
              <div className="mt-4">
                <label htmlFor="fp-email" className="mb-1 block text-sm text-slate-300">
                  Email
                </label>
                <input
                  id="fp-email"
                  type="email"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-slate-100 placeholder-slate-400 focus:border-cyan-400/40 focus:ring-2 focus:ring-cyan-400/20"
                  placeholder="you@gmail.com"
                />
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForgot(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm hover:bg-white/10"
              >
                Đóng
              </button>

              {!fpDone ? (
                <button
                  type="button"
                  disabled={fpLoading || cooldown > 0}
                  onClick={requestPasswordReset}
                  className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-300 disabled:opacity-70"
                >
                  {fpLoading
                    ? "Đang gửi…"
                    : cooldown > 0
                    ? `Gửi lại sau ${cooldown}s`
                    : "Gửi liên kết"}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowForgot(false)}
                  className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
                >
                  Xong
                </button>
              )}
            </div>

            <p className="mt-3 text-[12px] text-slate-400">
              * Liên kết đặt lại sẽ trỏ về:{" "}
              <span className="text-slate-200">{FRONTEND_BASE}/reset-password</span>
            </p>
          </motion.div>
        </div>
      )}
    </div>
  );
}
