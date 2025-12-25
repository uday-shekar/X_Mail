import { useCallback } from "react";

export const useSpeech = () => {
  const speak = useCallback((text, lang = "en-IN") => {
    const synth = window.speechSynthesis;
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    utter.pitch = 1;
    utter.rate = 1;
    synth.speak(utter);
  }, []);

  return { speak };
};
