import { useState, useEffect, useRef } from "react";
import Timer from "./Timer";
import { LoginPage } from "./LoginPage";
import "./App.css";

const API_URL = import.meta.env.VITE_API_URL;

interface AppState {
  workTime: number;
  restTime: number;
  token: string | null;
  workTimer: {
    time: number;
    isActive: boolean;
    startTime: number | null;
  };
  restTimer: {
    time: number;
    isActive: boolean;
    startTime: number | null;
  };
}

function App() {
  const [appState, setAppState] = useState<AppState>(() => {
    const savedState = localStorage.getItem("appState");
    return savedState
      ? JSON.parse(savedState)
      : {
          workTime: 55,
          restTime: 5,
          token: localStorage.getItem("jwt"),
          workTimer: { time: 55 * 60, isActive: false, startTime: null },
          restTimer: { time: 5 * 60, isActive: false, startTime: null },
        };
  });

  const appStateRef = useRef(appState);
  appStateRef.current = appState;
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem("appState", JSON.stringify(appStateRef.current));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleTimeChange = (newTime: number, isWork: boolean) => {
    if (isWork) {
      setAppState((prev) => ({ ...prev, workTime: newTime }));
    } else {
      setAppState((prev) => ({ ...prev, restTime: newTime }));
    }
  };

  const handleLogin = async (password: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok) {
        setAppState((prev) => ({ ...prev, token: data.token }));
        localStorage.setItem("jwt", data.token);
        return { success: true };
      } else {
        return { success: false, error: data.error };
      }
    } catch (error) {
      console.error("Login error:", error);
      return { success: false, error: "An error occurred during login" };
    }
  };

  const persistTimerData = async (timerData: {
    sessionType: string;
    duration: number;
    completedAt: string;
  }) => {
    if (!appState.token) return;

    try {
      const response = await fetch(`${API_URL}/api/files/pomodoro.jsonl`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${appState.token}`,
        },
        body: JSON.stringify({
          method: "append",
          content: JSON.stringify(timerData),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to persist timer data");
      }

      console.log("Timer data persisted successfully");
    } catch (error) {
      console.error("Error persisting timer data:", error);
    }
  };

  if (!appState.token) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <h1>Pomodoro Timer</h1>
      <div className="timers">
        <Timer
          label="Work"
          timerState={appState.workTimer}
          initialTime={appState.workTime}
          onTimeChange={(newTime) => handleTimeChange(newTime, true)}
          onTimerComplete={persistTimerData}
          updateTimerState={(newState) => setAppState((prev) => ({ ...prev, workTimer: newState }))}
        />
        <Timer
          label="Rest"
          timerState={appState.restTimer}
          initialTime={appState.restTime}
          onTimeChange={(newTime) => handleTimeChange(newTime, false)}
          onTimerComplete={persistTimerData}
          updateTimerState={(newState) => setAppState((prev) => ({ ...prev, restTimer: newState }))}
        />
      </div>
    </div>
  );
}

export default App;
