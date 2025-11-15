import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import authApi from "../../services/authApi";
import { emitAuthChanged } from "../../services/authBus";
import { ShoppingBag, Eye, EyeOff } from "lucide-react"; // 🛒 + 👁 icon

function getAuth() {
  try {
    const packed = localStorage.getItem("auth");
    if (packed) {
      const obj = JSON.parse(packed);
      if (obj?.token && obj?.user) return obj;
    }
  } catch (err) {
    console.warn("Parse 'auth' failed:", err);
  }

  const token = localStorage.getItem("token");
  const userRaw = localStorage.getItem("user");
  try {
    const user = userRaw ? JSON.parse(userRaw) : null;
    if (token && user) return { token, user };
  } catch (err) {
    console.warn("Parse 'user' failed:", err);
  }

  return { token: null, user: null };
}

function AvatarInitials({ name = "" }) {
  const initials = useMemo(() => {
    if (!name) return "U";
    const parts = String(name).trim().split(/\s+/);
    const a = parts[0]?.[0] || "";
    const b = parts[parts.length - 1]?.[0] || "";
    return (a + b).toUpperCase();
  }, [name]);

  return (
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xl font-semibold shadow">
      {initials}
    </div>
  );
}

export default function Account() {
  const nav = useNavigate();
  const [{ token, user }, setAuth] = useState(getAuth());
  const [changing, setChanging] = useState(false);
  const [pwForm, setPwForm] = useState({
    oldPassword: "",
    newPassword: "",
    confirm: "",
  });
  const [msg, setMsg] = useState({ type: "", text: "" });

  // 👁 trạng thái show/hide cho 3 ô mật khẩu
  const [showPw, setShowPw] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  useEffect(() => {
    const sub = () => setAuth(getAuth());
    window.addEventListener("storage", sub);
    return () => window.removeEventListener("storage", sub);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("vt_auth_token");
    localStorage.removeItem("vt_user");
    emitAuthChanged();
    setAuth({ token: null, user: null });
    nav("/login");
  };

  const onChangePw = async (e) => {
    e.preventDefault();
    setMsg({ type: "", text: "" });

    if (!pwForm.oldPassword || !pwForm.newPassword || !pwForm.confirm) {
      setMsg({ type: "error", text: "Vui lòng nhập đủ các trường." });
      return;
    }
    if (pwForm.newPassword.length < 6) {
      setMsg({ type: "error", text: "Mật khẩu mới phải từ 6 ký tự." });
      return;
    }
    if (pwForm.newPassword === pwForm.oldPassword) {
      setMsg({ type: "error", text: "Mật khẩu mới không được trùng với mật khẩu hiện tại." });
      return;
    }
    if (pwForm.newPassword !== pwForm.confirm) {
      setMsg({ type: "error", text: "Xác nhận mật khẩu không khớp." });
      return;
    }

    if (!token) {
      setMsg({ type: "error", text: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." });
      return;
    }

    try {
      setChanging(true);
      await authApi.changePassword(
        { oldPassword: pwForm.oldPassword, newPassword: pwForm.newPassword },
        token
      );
      setMsg({
        type: "success",
        text: "Đổi mật khẩu thành công. Bạn sẽ được đăng xuất để đăng nhập lại.",
      });
      setPwForm({ oldPassword: "", newPassword: "", confirm: "" });

      // ⏱ Tự động đăng xuất sau 2 giây
      setTimeout(() => {
        handleLogout();
      }, 2000);
    } catch (err) {
      const text =
        err?.response?.data?.message || err?.message || "Đổi mật khẩu thất bại.";
      setMsg({ type: "error", text });
    } finally {
      setChanging(false);
    }
  };

  if (!token || !user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <motion.h1
            className="text-2xl font-bold mb-2"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
          >
            Bạn chưa đăng nhập
          </motion.h1>
          <motion.p
            className="text-gray-500 mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            Hãy đăng nhập để xem thông tin tài khoản của bạn.
          </motion.p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition shadow"
          >
            Đi tới đăng nhập
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] px-4 py-8 mt-24 transition bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950 dark:text-gray-100">
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Card hồ sơ */}
        <motion.div
          className="md:col-span-1 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-4">
            <AvatarInitials name={user?.FullName} />
            <div>
              <div className="text-lg font-semibold">{user?.FullName}</div>
              <div className="text-xs inline-flex mt-1 px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {user?.Role || "User"}
              </div>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">User ID</span>
              <span className="font-medium">{user?.UserID}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Email</span>
              <span className="font-medium break-all">{user?.Email}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-500 dark:text-gray-400">Số điện thoại</span>
              <span className="font-medium">
                {user?.Phone || <em className="text-gray-400">Chưa cập nhật</em>}
              </span>
            </div>
          </div>

          {/* 🛒 Nút xem đơn hàng */}
          <Link
            to="/myorder"
            className="mt-6 w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition shadow-sm"
          >
            <ShoppingBag className="w-5 h-5" />
            Xem đơn hàng của bạn
          </Link>

          {/* 🔸 Nút đăng xuất */}
          <button
            onClick={handleLogout}
            className="mt-3 w-full px-4 py-2 rounded-xl bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 transition"
          >
            Đăng xuất
          </button>
        </motion.div>

        {/* Card đổi mật khẩu */}
        <motion.div
          className="md:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <h2 className="text-xl font-semibold">Bảo mật tài khoản</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Đổi mật khẩu cho tài khoản của bạn.
          </p>

          {msg.text ? (
            <div
              className={`mt-4 rounded-xl px-4 py-3 text-sm ${
                msg.type === "success"
                  ? "bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800"
              }`}
            >
              {msg.text}
            </div>
          ) : null}

          <form onSubmit={onChangePw} className="mt-6 grid gap-4 max-w-lg">
            {/* Mật khẩu hiện tại */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">
                Mật khẩu hiện tại
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPw.old ? "text" : "password"}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                  value={pwForm.oldPassword}
                  onChange={(e) =>
                    setPwForm((s) => ({ ...s, oldPassword: e.target.value }))
                  }
                  placeholder="Nhập mật khẩu hiện tại"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPw((s) => ({ ...s, old: !s.old }))
                  }
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPw.old ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Mật khẩu mới */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">
                Mật khẩu mới
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPw.new ? "text" : "password"}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                  value={pwForm.newPassword}
                  onChange={(e) =>
                    setPwForm((s) => ({ ...s, newPassword: e.target.value }))
                  }
                  placeholder="Tối thiểu 6 ký tự"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPw((s) => ({ ...s, new: !s.new }))
                  }
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPw.new ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Xác nhận mật khẩu */}
            <div>
              <label className="text-sm text-gray-600 dark:text-gray-300">
                Xác nhận mật khẩu
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPw.confirm ? "text" : "password"}
                  className="w-full rounded-xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:border-indigo-500 focus:ring-indigo-500 pr-10"
                  value={pwForm.confirm}
                  onChange={(e) =>
                    setPwForm((s) => ({ ...s, confirm: e.target.value }))
                  }
                  placeholder="Nhập lại mật khẩu mới"
                />
                <button
                  type="button"
                  onClick={() =>
                    setShowPw((s) => ({ ...s, confirm: !s.confirm }))
                  }
                  className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                >
                  {showPw.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={changing}
                className="w-full md:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition disabled:opacity-60"
              >
                {changing ? "Đang đổi..." : "Đổi mật khẩu"}
              </button>
            </div>
          </form>

          <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-6">
            <h3 className="font-medium">Cập nhật hồ sơ</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Tính năng cập nhật hồ sơ (đổi tên, số điện thoại) sẽ được thêm sau
              khi backend có endpoint cập nhật.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
