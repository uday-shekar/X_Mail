import React, { useEffect, useRef } from "react";

export default function NewMailNotifier({ mail }) {
  const synthRef = useRef(window.speechSynthesis);

  const speak = (text, callback) => {
    if (!text) return;
    synthRef.current.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.onend = callback || null;
    synthRef.current.speak(utterance);
  };

  const listen = () => {
    return new Promise((resolve) => {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        resolve("");
        return;
      }
      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";

      let answered = false;
      recognition.onresult = (event) => {
        answered = true;
        const transcript = event.results[0][0].transcript.toLowerCase();
        resolve(transcript);
        recognition.stop();
      };
      recognition.onerror = () => {
        if (!answered) resolve("");
        recognition.stop();
      };

      recognition.start();

      // Auto-stop after 5 sec
      setTimeout(() => {
        if (!answered) {
          resolve("");
          recognition.stop();
        }
      }, 5000);
    });
  };

  useEffect(() => {
    if (!mail) return;

    const { from, subject, body, attachments } = mail;

    // Step 1: Welcome + Ask
    speak(
      `You have a new mail from ${from || "unknown sender"}. Do you want me to read it? Please say yes or no.`,
      async () => {
        // Step 2: Listen for response
        const answer = await listen();
        if (answer.includes("yes")) {
          let content = `Here is your mail. From ${from || "unknown sender"}. Subject: ${
            subject || "no subject"
          }. Body: ${body || "no message"}.`;

          // If there are attachments, mention them
          if (attachments?.length > 0) {
            const imgCount = attachments.filter((file) =>
              file.match(/\.(jpg|jpeg|png|gif)$/i)
            ).length;
            if (imgCount > 0) {
              content += ` This mail also has ${imgCount} image${
                imgCount > 1 ? "s" : ""
              } attached.`;
            } else {
              content += ` This mail has ${attachments.length} attachment${
                attachments.length > 1 ? "s" : ""
              }.`;
            }
          }

          speak(content);
        } else if (answer.includes("no")) {
          speak("Okay, I will not read the mail.");
        } else {
          speak("Sorry, I did not understand your response.");
        }
      }
    );
  }, [mail]);

  return null;
}
