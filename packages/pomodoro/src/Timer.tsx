import React, { useEffect } from "react";

interface TimerState {
  time: number;
  isActive: boolean;
  startTime: number | null;
}

interface TimerProps {
  label: string;
  timerState: TimerState;
  initialTime: number;
  onTimeChange: (newTime: number) => void;
  onTimerComplete: (timerData: {
    sessionType: string;
    duration: number;
    completedAt: string;
  }) => void;
  updateTimerState: (newState: TimerState) => void;
}

function Timer({
  label,
  timerState,
  initialTime,
  onTimeChange,
  onTimerComplete,
  updateTimerState,
}: TimerProps) {
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (timerState.isActive && timerState.time > 0) {
      interval = setInterval(() => {
        updateTimerState({ ...timerState, time: timerState.time - 1 });
      }, 1000);
    } else if (timerState.isActive && timerState.time <= 0) {
      clearInterval(interval);
      playSound();
      updateTimerState({ ...timerState, isActive: false });
      completeTimer(initialTime * 60);
    }

    return () => clearInterval(interval);
  }, [timerState.isActive, timerState.time]);

  const toggleTimer = () => {
    if (!timerState.isActive) {
      updateTimerState({ ...timerState, isActive: true, startTime: Date.now() });
    } else {
      updateTimerState({ ...timerState, isActive: false });
    }
  };

  const resetTimer = () => {
    updateTimerState({ time: initialTime * 60, isActive: false, startTime: null });
  };

  const finishTimer = () => {
    if (timerState.startTime) {
      const elapsedTime = Math.floor((Date.now() - timerState.startTime) / 1000);
      completeTimer(elapsedTime);
    }
    resetTimer();
  };

  const completeTimer = (duration: number) => {
    onTimerComplete({
      sessionType: label.toLowerCase(),
      duration: Math.floor(duration / 60), // Convert seconds to minutes
      completedAt: new Date().toISOString(),
    });
  };

  const playSound = () => {
    const audio = new Audio(window.location.origin + "/gong.mp3");
    audio.play();
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const handleTimeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseInt(event.target.value, 10);
    onTimeChange(newTime);
    updateTimerState({ ...timerState, time: newTime * 60 });
  };

  return (
    <div className="timer">
      <h2>{label} Timer</h2>
      <div className="timer-input">
        <label>{label} Time (minutes): </label>
        <input
          type="number"
          value={initialTime}
          onChange={handleTimeChange}
          disabled={timerState.isActive}
        />
      </div>
      <div className="time-left">{formatTime(timerState.time)}</div>
      <div className="controls">
        <button onClick={toggleTimer}>{timerState.isActive ? "Pause" : "Start"}</button>
        <button onClick={resetTimer}>Reset</button>
        <button onClick={finishTimer} disabled={!timerState.isActive && !timerState.startTime}>
          Finish
        </button>
      </div>
    </div>
  );
}

export default Timer;
