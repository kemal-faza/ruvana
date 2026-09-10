"use client";

import { useActionState, type CSSProperties, type ReactNode } from "react";
import { login } from "@/app/login/actions";
import Logo from "@/components/Logo";

const C = {
  canvas: "#F7F5EF",
  surface: "#FFFFFF",
  brand: "#6F7F3B",
  strong: "#526222",
  text: "#252525",
  muted: "#5F5D57",
  mutedBrand: "#77746D",
  border: "#E5E2D9",
  subtle: "#F1F0EA",
  dangerText: "#9B1C1C",
  dangerSurface: "#FDECEC",
  successText: "#1F5C3A",
  successSurface: "#E7F4EC",
};

export default function LoginForm() {
  const [state, action, pending] = useActionState(login, {
    ok: false,
    pesan: "",
  });

  return (
    <div
      className="login-page"
      style={{
        minHeight: "100vh",
        display: "flex",
        background: C.canvas,
      }}
    >
      {/* ── Left panel — campus photo + branding ── */}
      <div
        className="login-brand-panel"
        style={{
          position: "relative",
          width: "50%",
          minHeight: "100vh",
          overflow: "hidden",
          flexShrink: 0,
        }}
      >
        {/* Campus Photo */}
        <img
          src="https://fsm.undip.ac.id/wp-content/uploads/2020/10/DSC7133.jpg"
          alt=""
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
          }}
        />

        {/* Green / Dark Overlay */}
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(82,98,34,0.10) 0%, rgba(82,98,34,0.36) 50%, rgba(82,98,34,0.72) 100%)",
          }}
        />

        {/* Branding Content */}
        <div
          style={{
            position: "relative",
            zIndex: 1,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "40px 44px",
            boxSizing: "border-box",
          }}
        >
          {/* Logo */}
          <Logo
            tone="light"
            withText
            textColor="#1a1919"
          />

          {/* Bottom Branding */}
          <div style={{ maxWidth: 360 }}>
            <h2
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
                color: "#f1ececfa",
                letterSpacing: "-0.3px",
                lineHeight: 1.35,
              }}
            >
              Kelola reservasi &amp; laporan fasilitas kampus
            </h2>

            <p
              style={{
                margin: "14px 0 0",
                fontSize: 14,
                color: "rgba(255,255,255,0.82)",
                lineHeight: 1.65,
              }}
            >
              Ruang kelas, laboratorium, aula, alat, dan lapangan — mudah
              ditemukan dan dijadwalkan.
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — login form ── */}
      <div
        className="login-form-panel"
        style={{
          flex: 1,
          minWidth: 0,
          minHeight: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "40px 24px",
          background: C.canvas,
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 360,
          }}
        >
          {/* Mobile Logo */}
          <div
            className="login-logo-mobile"
            style={{
              marginBottom: 32,
            }}
          >
            <Logo
              withText
              sublabel="Reservasi dan Pelaporan Fasilitas Kampus"
              size={40}
            />
          </div>

          {/* Heading */}
          <div
            style={{
              textAlign: "center",
              marginBottom: 28,
            }}
          >
            <h1
              style={{
                margin: 0,
                fontSize: 22,
                fontWeight: 600,
                color: C.text,
                letterSpacing: "-0.3px",
              }}
            >
              LOGIN
            </h1>

            <p
              style={{
                margin: "8px 0 0",
                fontSize: 13,
                color: C.mutedBrand,
                lineHeight: 1.5,
              }}
            >
              Masuk untuk mengelola reservasi dan fasilitas kampus
            </p>
          </div>

          {/* Login Form */}
          <form
            action={action}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
          >
            {/* Username */}
            <LoginInput
              label="Username"
              name="email"
              type="email"
              placeholder="Masukkan username"
              autoComplete="email"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              error={state.fieldErrors?.email}
            />

            {/* Password */}
            <LoginInput
              label="Password"
              name="password"
              type="password"
              placeholder="Masukkan password"
              autoComplete="current-password"
              icon={
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="4" y="10" width="16" height="10" rx="2" />
                  <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                </svg>
              }
              error={state.fieldErrors?.password}
            />

            {/* Message */}
            {state.pesan && (
              <div
                role="alert"
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: state.ok ? C.successText : C.dangerText,
                  background: state.ok
                    ? C.successSurface
                    : C.dangerSurface,
                  padding: "10px 14px",
                  borderRadius: 10,
                  lineHeight: 1.4,
                }}
              >
                {state.pesan}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={pending}
              style={{
                marginTop: 4,
                background: pending ? C.mutedBrand : C.brand,
                color: "#fff",
                border: "none",
                borderRadius: 12,
                padding: "12px 0",
                fontSize: 14,
                fontWeight: 600,
                cursor: pending ? "not-allowed" : "pointer",
                opacity: pending ? 0.7 : 1,
                transition: "background 150ms, opacity 150ms",
              }}
            >
              {pending ? "Memeriksa..." : "Masuk"}
            </button>
          </form>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        /* Desktop */
        .login-brand-panel {
          display: flex;
        }

        .login-logo-mobile {
          display: none;
        }

        /* Mobile */
        @media (max-width: 639px) {
          .login-brand-panel {
            display: none;
          }

          .login-form-panel {
            width: 100%;
            min-height: 100vh;
          }

          .login-logo-mobile {
            display: block;
          }
        }

        /* Next.js development UI */
        #nextjs__portal,
        [data-nextjs-toast],
        [data-nextjs-devtools-indicator] {
          display: none !important;
        }
      `}</style>
    </div>
  );
}

/* =========================================
   Login Input Component
========================================= */

function LoginInput({
  label,
  name,
  type = "text",
  placeholder,
  icon,
  autoComplete,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  icon: ReactNode;
  autoComplete?: string;
  error?: string[];
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      <span
        style={{
          fontSize: 13,
          fontWeight: 500,
          color: C.text,
        }}
      >
        {label}
      </span>

      <div
        style={{
          position: "relative",
          width: "100%",
        }}
      >
        {/* Input Icon */}
        <div
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            color: C.mutedBrand,
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          {icon}
        </div>

        {/* Input */}
        <input
          name={name}
          type={type}
          placeholder={placeholder}
          style={{
            ...inputStyle,
            paddingLeft: 42,
          }}
          autoComplete={autoComplete}
        />
      </div>

      {/* Validation Errors */}
      {error?.map((e) => (
        <span
          key={e}
          style={{
            fontSize: 12,
            color: C.dangerText,
          }}
        >
          {e}
        </span>
      ))}
    </label>
  );
}

/* =========================================
Input Style
========================================= */

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "11px 14px",
  borderRadius: 10,
  border: `1px solid ${C.border}`,
  fontSize: 14,
  background: "#FFFFFF",
  color: C.text,
  outline: "none",
  boxSizing: "border-box",
  transition: "border-color 150ms, box-shadow 150ms",
};