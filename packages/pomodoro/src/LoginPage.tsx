import React, { useState } from "react";

export function LoginPage({
  onLogin,
}: {
  onLogin: (password: string) => Promise<{ success: true } | { success: false; error: string }>;
}) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password).then((result) => {
      if (!result.success) {
        setError(result.error);
      } else {
        setError(null);
      }
    });
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2>Login</h2>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter password"
          className="login-input"
        />
        <button type="submit" className="login-button">
          Login
        </button>
        {error && <div className="error-message">{error}</div>}
      </form>
    </div>
  );
}
