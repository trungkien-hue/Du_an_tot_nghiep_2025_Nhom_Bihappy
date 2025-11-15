import React from "react";
import { isRouteErrorResponse, useRouteError, Link } from "react-router-dom";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

/**
 * AppErrorBoundary.jsx — Dark tech-styled error UI for React Router
 *
 * Cách dùng 1 (khuyên dùng): gắn vào router như errorElement
 *   {
 *     path: "/about",
 *     element: <AboutMystic />,
 *     errorElement: <RouteErrorBoundary />,
 *   }
 *
 * Cách dùng 2: Tự bọc component
 *   <ErrorBoundary>
 *     <SomePage />
 *   </ErrorBoundary>
 */

/* ----------------------- Error Boundaries (class) ----------------------- */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // Có thể log về server nếu muốn
    console.error("[ErrorBoundary]", error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    // reload lại trang để recover
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    return <ErrorFallback onReload={this.handleReload} />;
  }
}

/* ----------------------- Router Error Element ----------------------- */
export function RouteErrorBoundary() {
  const error = useRouteError();
  const title = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : "Unexpected Application Error";
  const message = isRouteErrorResponse(error)
    ? error.data || "Something went wrong while loading this route."
    : error?.message || "Something went wrong.";

  return <ErrorFallback title={title} message={message} />;
}

/* ----------------------------- Fallback UI ----------------------------- */
export function ErrorFallback({ title = "Oops! Có lỗi xảy ra", message = "Vui lòng thử lại.", onReload }) {
  return (
    <main className="min-h-[60vh] bg-[#0A0B10] text-zinc-200 flex items-center justify-center px-6">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl">
        {/* Outer gradient ring */}
        <div className="absolute inset-0 -z-10 rounded-2xl bg-[conic-gradient(from_140deg_at_50%_50%,rgba(217,70,239,0.3),rgba(99,102,241,0.25),rgba(34,211,238,0.25),rgba(217,70,239,0.3))] opacity-40 blur-[8px]" />

        {/* Card */}
        <div className="relative rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent backdrop-blur-xl p-8">
          <div className="flex items-start gap-4">
            <div className="mt-1 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 ring-1 ring-white/5">
              <AlertTriangle className="text-fuchsia-300" />
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-semibold text-zinc-100">{title}</h1>
              <p className="mt-1 text-sm text-zinc-400 whitespace-pre-wrap">{String(message)}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  onClick={onReload || (() => window.location.reload())}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-200 hover:bg-white/10"
                >
                  <RefreshCcw size={16} /> Tải lại trang
                </button>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-sm text-zinc-100 hover:shadow-[0_0_18px_rgba(217,70,239,0.35)]"
                >
                  <Home size={16} /> Về trang chủ
                </Link>
              </div>
            </div>
          </div>

          {/* Technical hint */}
          <div className="mt-6 rounded-xl border border-white/10 bg-black/20 p-4 text-xs text-zinc-400">
            <div className="font-medium text-zinc-300 mb-1">Gợi ý khắc phục</div>
            <ul className="list-disc pl-4 space-y-1">
              <li>Kiểm tra tên component/import/export (ví dụ: ParallaxOrb).</li>
              <li>Đảm bảo route/loader/action không throw lỗi.</li>
              <li>Xem log Console để biết stacktrace chi tiết.</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
