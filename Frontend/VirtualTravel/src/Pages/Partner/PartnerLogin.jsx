import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import partnerApi from "../../services/partnerApi";

export default function PartnerLogin() {
  const nav = useNavigate();
  const [form, setForm] = useState({ Email: "", Password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await partnerApi.login(form);
      if (res?.token) nav("/partner/dashboard", { replace: true });
      else alert("Đăng nhập thất bại.");
    } catch (err) {
      alert(err?.message || "Đăng nhập thất bại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gray-50 p-4">
      <form onSubmit={submit} className="w-full max-w-md bg-white rounded-2xl shadow p-6 space-y-4">
        <h1 className="text-xl font-semibold">Đăng nhập Cổng Khách Sạn</h1>
        <label className="text-sm block">
          Email
          <input
            type="email"
            className="mt-1 w-full border rounded-xl px-3 py-2"
            value={form.Email}
            onChange={(e) => setForm({ ...form, Email: e.target.value })}
            required
          />
        </label>
        <label className="text-sm block">
          Mật khẩu
          <input
            type="password"
            className="mt-1 w-full border rounded-xl px-3 py-2"
            value={form.Password}
            onChange={(e) => setForm({ ...form, Password: e.target.value })}
            required
          />
        </label>
        <button
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 text-white py-2 hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
        <div className="text-xs text-gray-500">
          Quay về <Link to="/admin" className="underline">Admin</Link>
        </div>
      </form>
    </div>
  );
}
