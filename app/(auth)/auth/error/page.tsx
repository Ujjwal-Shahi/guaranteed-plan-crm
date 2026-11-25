"use client";

import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  const params = useSearchParams();
  const error = params.get("error");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-xl shadow p-10 w-full max-w-sm text-center">
        <h1 className="text-xl font-bold text-red-600 mb-2">Access denied</h1>
        <p className="text-sm text-gray-600">
          {error === "AccessDenied"
            ? "Only @nobroker.in accounts can sign in."
            : "Authentication error. Please try again."}
        </p>
        <a
          href="/auth/signin"
          className="mt-6 inline-block text-sm text-indigo-600 underline"
        >
          Back to sign in
        </a>
      </div>
    </div>
  );
}
