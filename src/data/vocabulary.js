export const vocabularyCategories = [
  {
    name: "Idle/Background",
    target: 0,
    words: ["NO_SIGN"]
  },
  {
    name: "Greetings & social",
    target: 10,
    words: ["hello", "goodbye", "thank you", "sorry", "please", "welcome", "how are you", "nice to meet you", "good morning", "good night"]
  },
  {
    name: "Family & people",
    target: 15,
    words: ["mother", "father", "brother", "sister", "friend", "teacher", "doctor", "child", "family", "name", "baby", "boy", "girl", "man", "woman"]
  },
  {
    name: "Needs & requests",
    target: 15,
    words: ["water", "food", "help", "bathroom", "medicine", "money", "home", "sleep", "rest", "want", "need", "more", "stop", "finished", "wait"]
  },
  {
    name: "Emotions & states",
    target: 15,
    words: ["happy", "sad", "angry", "tired", "sick", "hungry", "thirsty", "afraid", "worried", "okay/fine", "surprised", "confused", "bored", "excited", "calm"]
  },
  {
    name: "Questions",
    target: 8,
    words: ["what", "where", "when", "who", "why", "how", "how much", "which"]
  },
  {
    name: "Time & numbers",
    target: 32,
    words: ["today", "tomorrow", "yesterday", "morning", "afternoon", "night", "week", "month", "year", "now", "later", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14", "15", "16", "17", "18", "19", "20"]
  },
  {
    name: "Places & directions",
    target: 15,
    words: ["home", "school", "hospital", "market", "work", "left", "right", "up", "down", "near", "far", "here", "there", "inside", "outside"]
  },
  {
    name: "Common verbs",
    target: 25,
    words: ["go", "come", "eat", "drink", "sleep", "work", "study", "give", "take", "stop", "wait", "understand", "see", "hear", "talk", "walk", "run", "sit", "stand", "read", "write", "buy", "sell", "open", "close"]
  },
  {
    name: "Health/emergency",
    target: 15,
    words: ["pain", "emergency", "help", "hospital", "call", "doctor", "medicine", "hurt", "sick", "ambulance", "police", "fire", "dizzy", "breathe", "pill"]
  }
];

export const allVocabularyWords = vocabularyCategories.reduce((acc, category) => {
  return [...acc, ...category.words];
}, []);
