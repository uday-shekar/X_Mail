import React from "react";
import useVoiceInput from "../hooks/useVoiceInput";

export default function VoiceCommandBox() {
  const { isListening, startListening, stopListening, transcript } = useVoiceInput({
    lang: "en-US", // change to 'hi-IN' or 'te-IN' for Hindi/Telugu
    onResult: (text) => {
      console.log("🗣️ User said:", text);
      // 👉 You can handle commands here, e.g.:
      // if (text.toLowerCase().includes("send mail")) { ... }
    },
  });

  return (
    <div className="flex flex-col items-center justify-center gap-3 p-4 bg-gray-800 text-white rounded-2xl shadow-lg w-fit mx-auto mt-10">
      <h2 className="text-lg font-semibold">
        Voice Command Box 🎧
      </h2>

      <button
        onClick={isListening ? stopListening : startListening}
        className={`px-6 py-3 rounded-full text-lg font-medium transition-all duration-300 ${
          isListening
            ? "bg-red-500 hover:bg-red-600 animate-pulse"
            : "bg-blue-500 hover:bg-blue-600"
        }`}
      >
        {isListening ? "🎙️ Listening..." : "🎤 Start Speaking"}
      </button>

      {transcript && (
        <p className="text-gray-300 mt-2 italic">
          “{transcript}”
        </p>
      )}
    </div>
  );
}
