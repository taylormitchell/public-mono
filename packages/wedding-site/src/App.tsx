import React from "react";
import { Clock } from "lucide-react";

const WeddingAnnouncement = () => {
  const weddingDate = new Date("2025-08-30");
  const [timeLeft, setTimeLeft] = React.useState({
    days: 0,
    hours: 0,
    minutes: 0,
  });

  React.useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = +weddingDate - +new Date();
      if (difference > 0) {
        setTimeLeft({
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
        });
      }
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 60000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen text-[#8b7355] flex flex-col items-center p-6">
      {/* Header */}
      <header className="w-full max-w-2xl text-center mb-8">
        <div className="flex justify-center items-center gap-4">
          <span className="text-2xl">🥂</span>
          <h1 className="font-['Kaushan_Script'] text-4xl md:text-5xl">Emily & Taylor</h1>
          <span className="text-2xl">🥂</span>
        </div>

        {/* Navigation */}
        <nav className="mt-6">
          <ul className="flex flex-wrap justify-center gap-6">
            <li>
              <a
                href="#"
                className="bg-white px-4 py-2 rounded-full hover:bg-opacity-80 transition-colors"
              >
                Home
              </a>
            </li>
            <li>
              <a
                href="#"
                className="hover:bg-white hover:bg-opacity-50 px-4 py-2 rounded-full transition-colors"
              >
                Our Story
              </a>
            </li>
            <li>
              <a
                href="#"
                className="hover:bg-white hover:bg-opacity-50 px-4 py-2 rounded-full transition-colors"
              >
                Travel
              </a>
            </li>
            <li>
              <a
                href="#"
                className="hover:bg-white hover:bg-opacity-50 px-4 py-2 rounded-full transition-colors"
              >
                Schedule and Q&A
              </a>
            </li>
          </ul>
        </nav>
      </header>

      {/* Main Content */}
      <main className="w-full max-w-2xl">
        <div className="bg-black/5 p-4 rounded-lg mb-8">
          <img src="/et.png" alt="Couple's photo" className="w-full rounded-lg" />
        </div>

        {/* Wedding Details */}
        <div className="text-center space-y-4">
          <h2 className="font-['Kaushan_Script'] text-3xl">Saturday, August 30, 2025</h2>
          <h3 className="font-['Kaushan_Script'] text-2xl">Holland Marsh Wineries</h3>

          {/* Countdown */}
          <div className="flex items-center justify-center gap-2 text-lg">
            <Clock size={20} />
            <span>
              {timeLeft.days} days {timeLeft.hours} hrs {timeLeft.minutes} mins
            </span>
          </div>

          {/* Message */}
          <p className="mt-8 text-lg leading-relaxed max-w-xl mx-auto">
            We can't wait to share our special day with you! Please mark your calendars. We'll be
            adding updates soon to our schedule, FAQS and photos.
          </p>
        </div>
      </main>
    </div>
  );
};

export default WeddingAnnouncement;
