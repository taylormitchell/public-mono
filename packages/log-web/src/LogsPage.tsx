import { useState, useRef } from "react";
import {
  LogType,
  LogEntry,
  validateDatetime,
  validateDuration,
  DrinkAmountStringSchema,
} from "@common/logs/types";

const apiUrl = import.meta.env.VITE_API_URL;

export function LogsPage({ jwt }: { jwt: string | null }) {
  const [error, setError] = useState("");
  const longPressTimeoutRef = useRef<number | null>(null);
  // Add state for modal visibility and selected log type
  const [showModal, setShowModal] = useState(false);
  const [selectedLogType, setSelectedLogType] = useState<LogType | null>(null);

  const handleSubmit = async (logEntry: LogEntry) => {
    setError("");

    if (!jwt) {
      setError("Not logged in");
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${jwt}` },
        body: JSON.stringify({ ...logEntry, datetime: logEntry.datetime?.toISOString() }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to submit log");
      }

      alert("Log submitted successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setShowModal(false);
    }
  };

  const handleButtonPress = (logType: LogType) => {
    longPressTimeoutRef.current = window.setTimeout(() => {
      setSelectedLogType(logType);
      setShowModal(true);
      longPressTimeoutRef.current = null;
    }, 500); // 500ms for long press
  };

  const handleButtonRelease = (logType: LogType) => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
      if (logType === "water" || logType === "coffee" || logType === "alcohol") {
        handleSubmit({
          type: logType,
          datetime: new Date(),
          amount: "1 cup", // Default amount
        });
      } else if (logType === "food") {
        handleSubmit({
          type: logType,
          datetime: new Date(),
          amount: "medium", // Default amount
          healthiness: 3, // Default healthiness
        });
      } else if (logType === "poop") {
        handleSubmit({
          type: logType,
          datetime: new Date(),
          effort: 3, // Default effort
          emptiness: 3, // Default emptiness
          burning: false, // Default burning
          poopType: 4, // Default poop type (middle of the scale)
        });
      } else if (logType === "fiber") {
        handleSubmit({
          type: logType,
          datetime: new Date(),
          amount: 2.4, // Default amount
        });
      } else {
        // For other types (meditated, eye-patch, ankied, workout, custom)
        handleSubmit({
          type: logType,
          datetime: new Date(),
        });
      }
    }
  };

  const logTypes: { type: LogType; emoji: string }[] = [
    { type: "poop", emoji: "💩" },
    { type: "eye-patch", emoji: "👀" },
    { type: "meditated", emoji: "🧘‍♂️" },
    { type: "ankied", emoji: "📚" },
    { type: "workout", emoji: "🏃‍♂️" },
    { type: "water", emoji: "💧" },
    { type: "coffee", emoji: "☕" },
    { type: "alcohol", emoji: "🍺" },
    { type: "food", emoji: "🍽️" },
    { type: "fiber", emoji: "🥦" },
    { type: "custom", emoji: "📝" },
  ];

  return (
    <div className="logs-page">
      <h1>Logs</h1>
      <div className="log-type-grid">
        {logTypes.map(({ type, emoji }) => {
          return (
            <button
              key={type}
              onPointerDown={() => handleButtonPress(type)}
              onPointerUp={() => handleButtonRelease(type)}
              className="log-type-button"
            >
              {emoji} {type}
            </button>
          );
        })}
      </div>
      {error && <div className="error">{error}</div>}
      {showModal && selectedLogType && (
        <Modal
          close={() => setShowModal(false)}
          logType={selectedLogType}
          handleSubmit={handleSubmit}
          setShowModal={setShowModal}
        />
      )}
    </div>
  );
}

function Modal({
  close,
  logType,
  handleSubmit,
  setShowModal,
}: {
  close: () => void;
  logType: LogType;
  handleSubmit: (entry: LogEntry) => void;
  setShowModal: React.Dispatch<React.SetStateAction<boolean>>;
}) {
  return (
    <div className="modal">
      <div className="modal-content">
        <button className="modal-close" onClick={close}>
          &times;
        </button>
        {renderForm(logType)}
      </div>
    </div>
  );

  function renderForm(logType: LogType): JSX.Element {
    switch (logType) {
      case "workout":
        return <GenericForm title="Workout" type="workout" handleSubmit={handleSubmit} />;

      case "eye-patch":
        return <GenericForm title="Eye Patch" type="eye-patch" handleSubmit={handleSubmit} />;

      case "meditated":
        return <GenericForm title="Meditation" type="meditated" handleSubmit={handleSubmit} />;

      case "ankied":
        return <GenericForm title="Anki" type="ankied" handleSubmit={handleSubmit} />;

      case "custom":
        return <GenericForm title="Custom" type="custom" handleSubmit={handleSubmit} />;

      case "poop":
        return (
          <PoopForm
            handleSubmit={(entry) => {
              handleSubmit(entry);
              setShowModal(false);
            }}
          />
        );

      case "water":
        return <DrinkForm title="Water" type="water" handleSubmit={handleSubmit} />;

      case "coffee":
        return <DrinkForm title="Coffee" type="coffee" handleSubmit={handleSubmit} />;

      case "alcohol":
        return <DrinkForm title="Alcohol" type="alcohol" handleSubmit={handleSubmit} />;

      case "food":
        return <FoodForm handleSubmit={handleSubmit} />;

      case "fiber":
        return (
          <FiberForm
            handleSubmit={(entry) => {
              handleSubmit(entry);
              setShowModal(false);
            }}
          />
        );

      default:
        return logType satisfies never;
    }
  }
}

function PoopForm({ handleSubmit }: { handleSubmit: (poop: LogEntry) => void }) {
  const [duration, setDuration] = useState<string | undefined>(undefined);
  const [datetime, setDatetime] = useState(() => {
    const dt = new Date()
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/, "$3-$1-$2T$4:$5");
    return dt;
  });
  const [effort, setEffort] = useState(3);
  const [emptiness, setEmptiness] = useState(3);
  const [burning, setBurning] = useState(false);
  const [poopType, setPoopType] = useState(3);
  const [message, setMessage] = useState<string | undefined>(undefined);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDuration(duration) || !validateDatetime(datetime)) {
      return;
    }
    const poop: LogEntry = {
      type: "poop",
      duration,
      datetime: new Date(datetime),
      effort,
      emptiness,
      burning,
      poopType,
      message,
    };
    handleSubmit(poop);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <h2>Poop</h2>
      <div>
        <label htmlFor="datetime">Date and Time:</label>
        <input
          type="datetime-local"
          id="datetime"
          value={datetime}
          onChange={(e) => {
            setDatetime(e.target.value);
          }}
          required
        />
      </div>

      <div>
        <label htmlFor="effort">
          Effort:<span>{effort}</span>
        </label>
        <input
          type="range"
          id="effort"
          min="1"
          max="5"
          value={effort}
          onChange={(e) => setEffort(parseInt(e.target.value))}
          required
        />
      </div>
      <div>
        <label htmlFor="emptiness">
          Emptiness:<span>{emptiness}</span>
        </label>
        <input
          type="range"
          id="emptiness"
          min="1"
          max="5"
          value={emptiness}
          onChange={(e) => setEmptiness(parseInt(e.target.value))}
          required
        />
      </div>
      <div>
        <label>Poop Type:</label>
        <div className="poop-type-toggle">
          {[0, 1, 2, 3, 4, 5, 6, 7].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setPoopType(type)}
              className={poopType === type ? "selected" : ""}
            >
              {type === 0 && "🚫"}
              {type === 1 && "🫘"}
              {type === 2 && "🐛"}
              {type === 3 && "🌭"}
              {type === 4 && "🐍"}
              {type === 5 && "🦠"}
              {type === 6 && "🍦"}
              {type === 7 && "🎉"}
              Type {type}
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <label htmlFor="burning">Burning:</label>
        <div className="yes-no-toggle">
          <button
            type="button"
            onClick={() => setBurning(false)}
            className={!burning ? "selected" : ""}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => setBurning(true)}
            className={burning ? "selected" : ""}
          >
            Yes
          </button>
        </div>
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <label htmlFor="duration">Duration:</label>
        <input
          type="text"
          id="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g., 5m, 30s"
          style={{ color: "#888" }}
        />
      </div>
      <div>
        <label htmlFor="message">Additional Notes:</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

function GenericForm({
  title,
  type,
  handleSubmit,
}: {
  title: string;
  type: LogType;
  handleSubmit: (entry: LogEntry) => void;
}) {
  const [duration, setDuration] = useState<string | undefined>(undefined);
  const [datetime, setDatetime] = useState(() => {
    const dt = new Date()
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/, "$3-$1-$2T$4:$5");
    return dt;
  });
  const [description, setDescription] = useState("");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const entry: LogEntry = {
      type,
      duration,
      datetime: new Date(datetime),
      message: description,
    };
    handleSubmit(entry);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <h2>{title}</h2>
      <div>
        <label htmlFor="datetime">Date and Time:</label>
        <input
          type="datetime-local"
          id="datetime"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <label htmlFor="duration">Duration:</label>
        <input
          type="text"
          id="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
          placeholder="e.g., 30m, 1h, 45s"
        />
      </div>

      <div>
        <label htmlFor="description">Description:</label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

function DrinkForm({
  title,
  type,
  handleSubmit,
}: {
  title: string;
  type: "water" | "coffee" | "alcohol";
  handleSubmit: (entry: LogEntry) => void;
}) {
  const [amount, setAmount] = useState(() => {
    switch (type) {
      case "water":
      case "coffee":
        return "1 cup";
      case "alcohol":
        return "1 drink";
    }
  });
  const [datetime, setDatetime] = useState(() => {
    const dt = new Date()
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/, "$3-$1-$2T$4:$5");
    return dt;
  });
  const [message, setMessage] = useState<string | undefined>(undefined);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDatetime(datetime) || !DrinkAmountStringSchema.safeParse(amount).success) {
      return;
    }
    const entry: LogEntry = {
      type,
      amount,
      datetime: new Date(datetime),
      message,
    };
    handleSubmit(entry);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <h2>{title}</h2>
      <div>
        <label htmlFor="datetime">Date and Time:</label>
        <input
          type="datetime-local"
          id="datetime"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="amount">Amount:</label>
        <input
          type="text"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="e.g., 250ml, 1l, 8oz, 1 cup"
          required
        />
      </div>
      <div>
        <label htmlFor="message">Additional Notes:</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

function FoodForm({ handleSubmit }: { handleSubmit: (entry: LogEntry) => void }) {
  const [amount, setAmount] = useState<"small" | "medium" | "large" | undefined>(undefined);
  const [healthiness, setHealthiness] = useState<number | undefined>(undefined);
  const [datetime, setDatetime] = useState(() => {
    const dt = new Date()
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/, "$3-$1-$2T$4:$5");
    return dt;
  });
  const [message, setMessage] = useState<string | undefined>(undefined);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDatetime(datetime)) {
      return;
    }
    const entry: LogEntry = {
      type: "food",
      amount,
      healthiness,
      datetime: new Date(datetime),
      message,
    };
    handleSubmit(entry);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <h2>Food</h2>
      <div>
        <label htmlFor="datetime">Date and Time:</label>
        <input
          type="datetime-local"
          id="datetime"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Amount:</label>
        <div className={`amount-toggle ${amount === undefined ? "undefined-value" : ""}`}>
          {["small", "medium", "large"].map((size) => (
            <button
              key={size}
              type="button"
              onClick={() => setAmount(size as "small" | "medium" | "large")}
              className={amount === size ? "selected" : ""}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
      <div className={healthiness === undefined ? "undefined-value" : ""}>
        <label htmlFor="healthiness">
          Healthiness:<span>{healthiness !== undefined ? healthiness : ""}</span>
        </label>
        <input
          type="range"
          id="healthiness"
          min="1"
          max="5"
          value={healthiness !== undefined ? healthiness : 3}
          onChange={(e) => setHealthiness(parseInt(e.target.value))}
          required
        />
      </div>
      <div>
        <label htmlFor="message">Additional Notes:</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}

function FiberForm({ handleSubmit }: { handleSubmit: (entry: LogEntry) => void }) {
  const [amount, setAmount] = useState<number>(2.4);
  const [datetime, setDatetime] = useState(() => {
    const dt = new Date()
      .toLocaleString("en-US", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      })
      .replace(/(\d+)\/(\d+)\/(\d+),\s(\d+):(\d+)/, "$3-$1-$2T$4:$5");
    return dt;
  });
  const [message, setMessage] = useState<string | undefined>(undefined);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateDatetime(datetime) || isNaN(amount)) {
      return;
    }
    const entry: LogEntry = {
      type: "fiber",
      amount,
      datetime: new Date(datetime),
      message,
    };
    handleSubmit(entry);
  };

  return (
    <form onSubmit={handleFormSubmit}>
      <h2>Fiber</h2>
      <div>
        <label htmlFor="datetime">Date and Time:</label>
        <input
          type="datetime-local"
          id="datetime"
          value={datetime}
          onChange={(e) => setDatetime(e.target.value)}
          required
        />
      </div>
      <div>
        <label htmlFor="amount">Amount (grams):</label>
        <input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(parseFloat(e.target.value))}
          placeholder="e.g., 2.4"
          required
        />
      </div>
      <div>
        <label htmlFor="message">Additional Notes:</label>
        <textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      <button type="submit">Submit</button>
    </form>
  );
}
