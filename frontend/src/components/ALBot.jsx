import React, { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import api from "../api/axiosInstance";
import { useNavigate } from "react-router-dom";

const wakePausedRef = { current: false };

export default function ALBot({ user }) {
  const [status, setStatus] = useState("idle");
  const [hint, setHint] = useState("Bot Ready");
  const [flow, setFlow] = useState("idle");
  const [draft, setDraft] = useState({ to: "", subject: "", body: "" });
  const [botName, setBotName] = useState("mava");

  const socketRef = useRef(null);
  const recognitionRef = useRef(null);
  const wakeRecRef = useRef(null);
  const synthRef = useRef(null);
  const speakingRef = useRef(false);
  const navigate = useNavigate();

  // Speech synthesis setup
  useEffect(() => {
    if ("speechSynthesis" in window) synthRef.current = window.speechSynthesis;
  }, []);

  // Bot name from settings/localStorage
  useEffect(() => {
    const saved = localStorage.getItem("albot_settings");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBotName(parsed.name?.trim() || "mava");
      } catch {
        setBotName("mava");
      }
    }
    const handleUpdate = e => {
      const newSettings = e.detail;
      if (newSettings?.name?.trim()) {
        setBotName(newSettings.name.trim());
        localStorage.setItem("albot_settings", JSON.stringify(newSettings));
      }
    };
    window.addEventListener("albot:updateSettings", handleUpdate);
    return () => window.removeEventListener("albot:updateSettings", handleUpdate);
  }, []);

  // Speak text
  const speak = (text, onEnd) => {
    if (!text || !synthRef.current) return;
    synthRef.current.cancel();
    const utter = new window.SpeechSynthesisUtterance(text);
    utter.lang = "en-US";
    speakingRef.current = true;
    setStatus("speaking");
    setHint("Speaking...");
    utter.onend = () => {
      speakingRef.current = false;
      setStatus("idle");
      setHint("Bot Ready");
      if (typeof onEnd === "function") onEnd();
    };
    utter.onerror = () => {
      speakingRef.current = false;
      setStatus("idle");
      setHint("Bot Ready");
      if (typeof onEnd === "function") onEnd();
    };
    synthRef.current.speak(utter);
  };

  // Stop bot (speech + recognition)
  const stopSpeaking = () => {
    synthRef.current?.cancel();
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    speakingRef.current = false;
    setStatus("idle");
    setHint("Bot Ready");
    setFlow("idle");
    wakePausedRef.current = false;
  };

  // Start voice recognition
  const startVoiceRecognition = (callback, retries = 0) => {
    const WSR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!WSR) {
      setHint("Mic not supported");
      return;
    }
    recognitionRef.current?.abort();
    const rec = new WSR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => {
      setStatus("listening");
      setHint("Listening...");
    };
    rec.onresult = e => {
      callback(e.results[0][0].transcript.trim());
    };
    rec.onerror = err => {
      if (err.error === "no-speech" && retries < 2) {
        setHint("Didn't hear you, retrying...");
        setTimeout(() => startVoiceRecognition(callback, retries + 1), 800);
      } else {
        setHint("Mic error or blocked.");
        setStatus("idle");
      }
    };
    rec.onend = () => {
      recognitionRef.current = null;
      if (!speakingRef.current) {
        setStatus("idle");
        setHint("Bot Ready");
      }
    };
    recognitionRef.current = rec;
    rec.start();
  };

  // Ask a question, prompt user with listening UI before recognition
  const ask = (question, onHeard) => {
  speak(question, () => {
    setStatus("listening");
    setHint("Listening...");
    setFlow(flow);
    startVoiceRecognition(onHeard);
  });
};


  const dispatchComposeOpen = prefill => {
    window.dispatchEvent(new CustomEvent("albot:compose", { detail: prefill }));
  };

  // Parse "send mail to ____" style commands
  const tryParseComposeCommand = text => {
    let m = text.match(/(?:send\s+)?(?:mail|email)?\s*(?:to\s+)?([a-z0-9._-]+@xmail\.com)/i);
    if (m) return m[1];
    m = text.match(/(?:send\s+)?(?:mail|email)?\s*(?:to\s+)?([a-z0-9._-]+)/i);
    if (m) return `${m[1]}@xmail.com`;
    return null;
  };

  // Compose flow
  const startVoiceCompose = (to) => {
    if (!to) {
      setFlow("compose_to");
      return ask("Whom should I send the mail to?", heard => {
        const parsed =
          tryParseComposeCommand(heard) || heard.split(" ").find(w => w.includes("@xmail.com"));
        if (!parsed) return speak("I couldn't catch the recipient.");
        startVoiceCompose(parsed);
      });
    }
    setDraft({ to, subject: "", body: "" });
    dispatchComposeOpen({ to });
    setFlow("compose_subject");
    ask(`Composing mail to ${to}. What is the subject?`, subjectHeard =>
      handleSubject(to, subjectHeard)
    );
    navigate("/home/compose");
  };

  const handleSubject = async (to, subjectHeard) => {
    const subject = subjectHeard?.trim() || "(No Subject)";
    setDraft(d => ({ ...d, subject }));
    await generateBody(to, subject);
  };

  const generateBody = async (to, subject) => {
    let body;
    try {
      const res = await api.post(
        "/ai/generate",
        { prompt: subject },
        { headers: { Authorization: `Bearer ${user?.accessToken}` } }
      );
      body = res.data?.body?.trim();
    } catch {
      body = null;
    }
    if (!body) body = `${subject}\n\nRegards,\n${user?.name || "User"}`;
    setDraft(d => ({ ...d, body }));
    dispatchComposeOpen({ to, subject, body });
    setFlow("confirm_action");
    ask("Draft ready. Should I send, read, or regenerate?", heard =>
      handleAction(heard, to, subject, body)
    );
  };

  const handleAction = (heard, to, subject, body) => {
  heard = (heard || "").toLowerCase().trim();
  if (/(sendit|send|yes|ok|confirm)/.test(heard)) {
    if (!body || body.trim() === "") {
      speak("Mail body empty. Please say regenerate.", () =>
        ask("Say regenerate to create body.", (h) => handleAction(h, to, subject, body))
      );
      return;
    }
    return sendMail(to, subject, body);
  }
  if (/read/.test(heard)) {
    return speak(
      `Mail summary. To: ${to}. Subject: ${subject}. Body: ${body}`,
      () => ask("Do you want to send or regenerate?", (h) => handleAction(h, to, subject, body))
    );
  }
  if (/(regenerate|new|again|change)/.test(heard)) {
    speak("Generating a better email body.", async () => {
      const newBody = await generateBody(to, subject);
      speak("New body ready. Do you want to send this version?", () =>
        ask("Say send, read or regenerate.", (h) => handleAction(h, to, subject, newBody))
      );
    });
    return;
  }
  ask("Please say send, read, or regenerate.", (h) =>
    handleAction(h, to, subject, body)
  );
};


 const sendMail = async (to, subject, body) => {
  const trimmedTo = to?.trim().toLowerCase();
  const trimmedSubject = subject?.trim();
  const trimmedBody = body?.trim();

  if (!trimmedTo || !trimmedSubject || !trimmedBody) {
    speak("Cannot send mail. All fields are required.");
    return;
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@xmail\.com$/;
  if (!emailRegex.test(trimmedTo)) {
    speak("Recipient email is invalid.");
    return;
  }

  try {
    const res = await api.post(
      "/mail/compose",
      { to: trimmedTo, subject: trimmedSubject, body: trimmedBody },
      { headers: { Authorization: `Bearer ${user.accessToken}` } }
    );

    if (res.data?.message === "Recipient not found.") {
      speak("The user does not exist. Please provide a valid recipient.");
      return;
    }

    if (res.data.success) {
      speak("Mail sent successfully!");
      dispatchComposeOpen({ close: true });
    } else {
      speak(res.data.message || "Failed to send mail.");
    }

  } catch (err) {
    speak("Failed to send mail due to server error.");
  }
};


  // Central voice command router
  const handleVoiceCommand = (heard) => {
    wakePausedRef.current = false;
    const lower = heard.toLowerCase();
    if (/compose|send mail/.test(lower)) return startVoiceCompose();
    if (/inbox/.test(lower)) return speak("Opening inbox.", () => navigate("/home/inbox"));
    if (/sent/.test(lower)) return speak("Opening sent mails.", () => navigate("/home/sent"));
    if (/deleted|trash/.test(lower)) return speak("Opening deleted mails.", () => navigate("/home/deleted"));
    if (/draft|saved/.test(lower)) return speak("Opening saved mails.", () => navigate("/home/saved"));
    const to = tryParseComposeCommand(heard);
    if (to) return startVoiceCompose(to);
    ask("Sorry, I didn't get that. Try saying open inbox, sent, compose mail, deleted mails, or drafts.", handleVoiceCommand);
  };

  // Voice user activation
  const activateBotForCommand = () => {
    wakePausedRef.current = true;
    setTimeout(() => {
      const greeting = `Hello ${user?.name || "User"}, how can I help you?`;
      speak(greeting, () => {
        setStatus("listening");
        setHint("Listening...");
        startVoiceRecognition(handleVoiceCommand);
      });
    }, 100);
  };

  const handleVoiceButton = () => {
    if (status === "speaking" || status === "listening") return stopSpeaking();
    activateBotForCommand();
  };

  // Wake word passive listener
  useEffect(() => {
    const WSR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!WSR) return;
    let active = true;
    const RESTART_DELAY = 1000;
    const startWakeListener = () => {
      if (!active || speakingRef.current || wakePausedRef.current) {
        if (active) setTimeout(startWakeListener, RESTART_DELAY);
        return;
      }
      const rec = new WSR();
      rec.lang = "en-US";
      rec.continuous = true;
      rec.interimResults = true;
      rec.onresult = (e) => {
        const transcript = Array.from(e.results)
          .map((res) => res[0].transcript)
          .join(" ")
          .toLowerCase()
          .trim();
        const wakeWord = `hey ${botName.toLowerCase()}`;
        if (transcript.includes(wakeWord)) {
          rec.abort();
          wakeRecRef.current = null;
          activateBotForCommand();
        }
      };
      rec.onerror = () => {
        wakeRecRef.current = null;
      };
      rec.onend = () => {
        wakeRecRef.current = null;
        if (active && recognitionRef.current == null) setTimeout(startWakeListener, RESTART_DELAY);
      };
      try {
        rec.start();
        wakeRecRef.current = rec;
      } catch {
        if (active) setTimeout(startWakeListener, 5000);
      }
    };

    startWakeListener();
    return () => {
      active = false;
      wakeRecRef.current?.abort();
      wakeRecRef.current = null;
    };
  }, [botName, user]);

  // Socket.io: Register user for mail notifications + cleanup
  useEffect(() => {
    if (!user?.userId) return;
    if (socketRef.current) socketRef.current.disconnect();
    const SOCKET_URL = import.meta.env?.VITE_SOCKET_URL || "http://localhost:5000";
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      socket.emit("registerUser", user.userId);
    });
    socket.on("newMail", (mail) => askToReadMail(mail));
    return () => {
      socket.disconnect();
      stopSpeaking();
    };
  }, [user?.userId]);

  // Checks unread inbox mail at login, greets with count
  const checkInbox = async () => {
    if (!user) return;
    speak(`Welcome back to X mail, ${user?.name || "User"}.`, async () => {
      try {
        const res = await api.get("/mail/inbox", {
          headers: { Authorization: `Bearer ${user?.accessToken}` },
        });
        const mails = res.data?.mails || [];
        const newMails = mails.filter((m) => !m.isRead);
        if (newMails.length) {
          speak(`You have ${newMails.length} new mail${newMails.length > 1 ? "s" : ""}.`, () => {
            let i = 0;
            const next = () => {
              if (i < newMails.length) askToReadMail(newMails[i++], next);
              else setFlow("idle");
            };
            next();
          });
        } else speak("You have no new mails.");
      } catch {
        speak("Failed to check inbox.");
      }
    });
  };

  // Read prompt for new mail
  const askToReadMail = (mail, next) => {
    if (!mail) return;
    const sender = mail.from?.userId || mail.from || "unknown sender";
    speak(`New mail from ${sender}. Read it?`, () => {
      setStatus("listening");
      setHint("Listening...");
      startVoiceRecognition((resp) => {
        if (/(yes|ok|read|read it)/.test(resp))
          speak(`From ${sender}. Subject: ${mail.subject || "no subject"}. Body: ${mail.body || "no body"}`, next);
        else speak("Skipping.", next);
      });
    });
  };

  useEffect(() => {
    if (user) {
      const t = setTimeout(checkInbox, 800);
      return () => clearTimeout(t);
    }
  }, [user]);

  const isBotActive = status !== "idle" || flow !== "idle";
  const buttonStyle = isBotActive
    ? "scale-110 shadow-2xl shadow-purple-500/70 border-white/80"
    : "hover:scale-105 hover:shadow-xl hover:shadow-cyan-500/60";

  const botIcon =
    status === "listening" ? (
      <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" className="w-12 h-12 text-white">
        <path d="M8.25 4.5a3.75 3.75 0 117.5 0v8.25a3.75 3.75 0 11-7.5 0V4.5z" />
        <path d="M12 21.75a9.001 9.001 0 005.29-1.859.75.75 0 00-.73-.207A7.5 7.5 0 0112 20.25a7.5 7.5 0 01-4.57-1.816.75.75 0 00-.73.207A9.001 9.001 0 0012 21.75z" />
      </svg>
    ) : (
      <span className="text-6xl text-white drop-shadow-lg">🤖</span>
    );

  const buttonSizeClasses = "w-24 h-24";

  return (
    <div className="fixed bottom-6 right-6 z-60 flex items-end">
      {/* Hint Panel */}
      <div
        className={`${
          isBotActive ? "translate-x-0 opacity-100" : "translate-x-12 opacity-0 pointer-events-none"
        } mb-2 mr-6 transition-all duration-300 ease-out`}
      >
        <div className="min-w-max bg-white/90 backdrop-blur-md p-3 rounded-xl shadow-2xl border border-gray-200">
          <div className="text-sm font-semibold text-gray-800 mb-1">
            {hint} ({botName})
          </div>
          <div className="flex gap-2">
            {flow === "idle" && status !== "listening" && (
              <button
                onClick={checkInbox}
                className="px-2 py-0.5 rounded-full text-xs bg-blue-500 hover:bg-blue-600 text-white transition font-medium"
              >
                Check Inbox
              </button>
            )}
            {isBotActive && (
              <button
                onClick={stopSpeaking}
                className="px-2 py-0.5 rounded-full text-xs bg-red-500 hover:bg-red-600 text-white transition font-medium"
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
      {/* Main Bot Button */}
      <div className="relative flex-shrink-0">
        {status === "listening" && (
          <span
            className={`absolute inset-0 rounded-full bg-blue-400/50 animate-ping opacity-75 ${buttonSizeClasses}`}
          />
        )}
        {status === "speaking" && (
          <span
            className={`absolute inset-0 rounded-full bg-purple-500/50 animate-pulse ${buttonSizeClasses}`}
          />
        )}
        <button
          onClick={handleVoiceButton}
          className={`relative rounded-full flex items-center justify-center bg-gradient-to-br from-purple-600 to-cyan-500 shadow-xl border-4 border-white/80 transition-all duration-300 transform ${buttonSizeClasses} ${buttonStyle}`}
          title={status === "listening" ? "Tap to Stop Listening" : "Tap to Talk"}
        >
          {botIcon}
        </button>
      </div>
    </div>
  );
}
