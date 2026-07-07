import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Calendar,
  Clock,
  Share2,
  Check,
  PartyPopper,
  Info,
  RotateCcw,
  ImageIcon,
  Globe
} from "lucide-react";

interface ThemeConfig {
  category: string;
  themeColor: string;
  accentColor: string;
  emoji: string;
  description: string;
  customPrompt: string;
  fallbackImage: string;
}

const defaultTheme: ThemeConfig = {
  category: "default",
  themeColor: "indigo",
  accentColor: "#6366F1",
  emoji: "⏳",
  description: "Anticipating the moments that lie ahead.",
  customPrompt: "A beautiful abstract modern background with soft gradients of blue and purple, smooth lines, clean layout.",
  fallbackImage: "https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=1920&auto=format&fit=crop"
};

// Helper to convert target date & time to correct UTC epoch based on standard IANA timezone / offset
function getTargetTimeInTimezone(dateStr: string, timeZone: string): number {
  try {
    let formatted = dateStr.replace(" ", "T");
    if (formatted.length === 10) {
      formatted += "T00:00:00";
    } else if (formatted.length === 16) {
      formatted += ":00";
    }

    const tempDate = new Date(formatted + "Z");
    if (isNaN(tempDate.getTime())) return NaN;

    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
      hour12: false
    });

    const parts = formatter.formatToParts(tempDate);
    const getVal = (type: string) => {
      const match = parts.find(p => p.type === type);
      return match ? parseInt(match.value, 10) : 0;
    };

    const year = getVal("year");
    const month = getVal("month") - 1;
    const day = getVal("day");
    const rawHour = getVal("hour");
    const hour = rawHour === 24 ? 0 : rawHour;
    const minute = getVal("minute");
    const second = getVal("second");

    const formattedUtcTime = Date.UTC(year, month, day, hour, minute, second);
    const offset = tempDate.getTime() - formattedUtcTime;

    const inputParts = formatted.split(/[T\-:]/);
    const inputYear = parseInt(inputParts[0], 10);
    const inputMonth = parseInt(inputParts[1], 10) - 1;
    const inputDay = parseInt(inputParts[2], 10);
    const inputHour = parseInt(inputParts[3], 10) || 0;
    const inputMinute = parseInt(inputParts[4], 10) || 0;
    const inputSecond = parseInt(inputParts[5], 10) || 0;

    const inputUtcWallClock = Date.UTC(inputYear, inputMonth, inputDay, inputHour, inputMinute, inputSecond);
    return inputUtcWallClock + offset;
  } catch (e) {
    // Fallback to offset strings parsing (like +05:30)
    const cleanedDate = dateStr.replace(" ", "T");
    let testStr = cleanedDate;
    if (timeZone.startsWith("+") || timeZone.startsWith("-")) {
      testStr = cleanedDate + timeZone;
    } else {
      testStr = cleanedDate + " " + timeZone;
    }
    const parsed = Date.parse(testStr);
    if (!isNaN(parsed)) return parsed;
    return new Date(dateStr).getTime();
  }
}

export default function App() {
  // Query parameter values
  const [title, setTitle] = useState<string | null>(null);
  const [dateStr, setDateStr] = useState<string | null>(null);
  const [timezone, setTimezone] = useState<string | null>(null);
  const [imageUrlParam, setImageUrlParam] = useState<string | null>(null);

  // Checks if all required parameters are fully present
  const [isValid, setIsValid] = useState<boolean | null>(null);

  // Dynamic Theme state
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [loadingTheme, setLoadingTheme] = useState(false);

  // Countdown clock state
  const [timeRemaining, setTimeRemaining] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  // Copied share status
  const [copied, setCopied] = useState(false);

  // 1. Parse parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlTitle = params.get("title") || params.get("event") || params.get("t") || params.get("name");
    const urlDate = params.get("date") || params.get("time") || params.get("d") || params.get("dt");
    const urlTimezone = params.get("timezone") || params.get("tz") || params.get("zone");
    const urlBg = params.get("image") || params.get("img") || params.get("photo") || params.get("bg") || params.get("url");

    if (urlTitle && urlDate && urlTimezone) {
      setTitle(urlTitle);
      setDateStr(urlDate);
      setTimezone(urlTimezone);
      setImageUrlParam(urlBg);
      setIsValid(true);
      fetchThemeFromAPI(urlTitle);
    } else {
      setIsValid(false);
    }
  }, []);

  // Update Chrome tab / browser document title to match the event title
  useEffect(() => {
    if (title) {
      document.title = title;
    }
  }, [title]);

  // 2. Fetch Theme details using Gemini on server
  const fetchThemeFromAPI = async (eventTitle: string) => {
    setLoadingTheme(true);
    try {
      const res = await fetch("/api/theme", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: eventTitle }),
      });
      if (res.ok) {
        const data: ThemeConfig = await res.json();
        setTheme(data);
      } else {
        throw new Error("Failed to load creative theme from API.");
      }
    } catch (err) {
      console.error(err);
      setTheme(defaultTheme);
    } finally {
      setLoadingTheme(false);
    }
  };

  // 3. Keep Countdown updated live
  useEffect(() => {
    if (!isValid || !dateStr || !timezone) return;

    const interval = setInterval(() => {
      const targetUtcTime = getTargetTimeInTimezone(dateStr, timezone);
      const now = new Date().getTime();
      const difference = targetUtcTime - now;

      if (isNaN(targetUtcTime)) {
        setTimeRemaining(null);
        setIsExpired(false);
        clearInterval(interval);
        return;
      }

      if (difference <= 0) {
        setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        clearInterval(interval);
      } else {
        setIsExpired(false);
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        setTimeRemaining({ days, hours, minutes, seconds });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isValid, dateStr, timezone]);

  // Determine appropriate backdrop image
  const bgImageSrc = imageUrlParam || theme.fallbackImage;

  // Handle URL Copy utilities
  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Styling helper classes
  const getThemeGradient = (color: string) => {
    switch (color) {
      case "rose": return "from-rose-500 to-pink-600";
      case "emerald": return "from-emerald-500 to-teal-600";
      case "amber": return "from-amber-500 to-orange-600";
      case "violet": return "from-violet-500 to-fuchsia-600";
      case "cyan": return "from-cyan-500 to-blue-600";
      case "fuchsia": return "from-fuchsia-500 to-pink-600";
      case "sky": return "from-sky-500 to-indigo-600";
      case "crimson": return "from-red-500 to-rose-600";
      case "indigo":
      default:
        return "from-indigo-500 to-purple-600";
    }
  };

  const getThemeTextClass = (color: string) => {
    switch (color) {
      case "rose": return "text-rose-400";
      case "emerald": return "text-emerald-400";
      case "amber": return "text-amber-400";
      case "violet": return "text-violet-400";
      case "cyan": return "text-cyan-400";
      case "fuchsia": return "text-fuchsia-400";
      case "sky": return "text-sky-400";
      case "crimson": return "text-red-400";
      case "indigo":
      default:
        return "text-indigo-400";
    }
  };

  const getThemeGlowClass = (color: string) => {
    switch (color) {
      case "rose": return "shadow-rose-500/20";
      case "emerald": return "shadow-emerald-500/20";
      case "amber": return "shadow-amber-500/20";
      case "violet": return "shadow-violet-500/20";
      case "cyan": return "shadow-cyan-500/20";
      case "fuchsia": return "shadow-fuchsia-500/20";
      case "sky": return "shadow-sky-500/20";
      case "crimson": return "shadow-red-500/20";
      case "indigo":
      default:
        return "shadow-indigo-500/20";
    }
  };

  // If parameters are missing or invalid, render a strict blank navy blue screen with absolutely no placeholders or elements.
  if (isValid === false) {
    return <div className="min-h-screen bg-[#0b132b] w-full h-full"></div>;
  }

  // Also return blank navy blue during initial state resolution to avoid visual flicker
  if (isValid === null) {
    return <div className="min-h-screen bg-[#0b132b] w-full h-full"></div>;
  }

  return (
    <div
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center relative overflow-hidden font-sans select-none p-4 md:p-8"
      style={
        {
          "--accent-glow": theme.accentColor + "40",
        } as React.CSSProperties
      }
    >
      {/* 1. Immersive Blur Background Image */}
      <div className="absolute inset-0 z-0">
        <img
          src={bgImageSrc}
          alt={theme.category}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-all duration-1000 scale-105"
        />
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-[6px] transition-all duration-500" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/50 to-slate-950/40" />
      </div>

      {/* 2. Main Countdown Stage - Clean Centered Layout */}
      <main className="relative z-10 w-full max-w-3xl flex flex-col items-center">
        <AnimatePresence mode="wait">
          {loadingTheme ? (
            <motion.div
              key="loader"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-12 space-y-4"
            >
              <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="text-sm font-medium text-slate-300 animate-pulse font-display">
                Analyzing visual theme...
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="content"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="w-full flex flex-col items-center space-y-8"
            >
              {/* Event Metadata Banner */}
              <div className="text-center space-y-4 max-w-xl">
                <span className="inline-flex items-center px-4 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 text-2xl shadow-lg">
                  {theme.emoji}
                </span>
                <h2 className="font-display font-bold text-3xl md:text-5xl lg:text-6xl tracking-tight text-white leading-tight">
                  {title}
                </h2>
                <p className="text-sm md:text-base text-slate-300 font-light tracking-wide max-w-md mx-auto leading-relaxed">
                  {theme.description}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-slate-400 bg-slate-950/50 py-1.5 px-3.5 rounded-full border border-slate-900/60">
                  <Calendar className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {dateStr && new Date(dateStr).toLocaleString(undefined, {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="text-slate-600">|</span>
                  <Globe className="w-3.5 h-3.5 text-slate-500" />
                  <span className="uppercase tracking-wider font-semibold text-indigo-400">
                    {timezone}
                  </span>
                </div>
              </div>

              {/* MAIN COUNTDOWN GRID */}
              <div className={`w-full grid grid-cols-2 md:grid-cols-4 gap-4 p-6 md:p-8 rounded-3xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-xl shadow-2xl glow-card ${getThemeGlowClass(theme.themeColor)}`}>
                {[
                  { label: "Days", value: timeRemaining?.days ?? 0 },
                  { label: "Hours", value: timeRemaining?.hours ?? 0 },
                  { label: "Minutes", value: timeRemaining?.minutes ?? 0 },
                  { label: "Seconds", value: timeRemaining?.seconds ?? 0 },
                ].map((item, idx) => (
                  <div
                    key={item.label}
                    className="flex flex-col items-center justify-center p-4 rounded-2xl bg-slate-950/40 border border-slate-900/60 relative overflow-hidden group"
                  >
                    <div className="absolute top-0 inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-slate-700 to-transparent opacity-30 group-hover:opacity-100 transition-opacity" />
                    <span className={`font-display font-bold text-4xl md:text-6xl tracking-tighter tabular-nums ${getThemeTextClass(theme.themeColor)} drop-shadow-lg`}>
                      {String(item.value).padStart(2, "0")}
                    </span>
                    <span className="text-xs font-medium text-slate-400 mt-2 tracking-wide uppercase">
                      {item.label}
                    </span>
                  </div>
                ))}
              </div>

              {/* Celebration Finished Message */}
              {isExpired && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="flex flex-col items-center p-6 rounded-2xl bg-emerald-950/30 border border-emerald-900/60 backdrop-blur-md max-w-md text-center space-y-2.5 shadow-lg shadow-emerald-950/20 animate-bounce"
                >
                  <PartyPopper className="w-10 h-10 text-emerald-400" />
                  <h3 className="font-display font-semibold text-lg text-emerald-400">
                    The Event Has Begun!
                  </h3>
                  <p className="text-xs text-slate-300">
                    The wait is over! This beautiful milestone has finally arrived. Enjoy every second of this memorable event!
                  </p>
                </motion.div>
              )}

              {/* Share utilities overlay */}
              <div className="flex justify-center w-full max-w-xl">
                <button
                  onClick={handleCopyShareLink}
                  className="flex items-center justify-center space-x-2 px-6 py-3 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800 text-xs font-semibold text-white shadow-lg active:scale-95 transition-all duration-200"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Link Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Copy Countdown Link</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
