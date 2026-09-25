// MVP dictionary for demonstration purposes
const dictionary = {
  "English": {}, // fallback to original string
  "Hindi": {
    "hello": "नमस्ते",
    "goodbye": "अलविदा",
    "thank you": "धन्यवाद",
    "sorry": "माफ़ करना",
    "please": "कृपया",
    "welcome": "स्वागत है",
    "how are you": "आप कैसे हैं",
    "nice to meet you": "आपसे मिलकर अच्छा लगा",
    "good morning": "शुभ प्रभात",
    "good night": "शुभ रात्रि",
    "water": "पानी",
    "food": "खाना",
    "help": "मदद",
    "yes": "हाँ",
    "no": "नहीं"
  },
  "Tamil": {
    "hello": "வணக்கம்",
    "goodbye": "பிரியாவிடை",
    "thank you": "நன்றி",
    "sorry": "மன்னிக்கவும்",
    "please": "தயவுசெய்து",
    "welcome": "நல்வரவு",
    "how are you": "நீங்கள் எப்படி இருக்கிறீர்கள்",
    "nice to meet you": "உங்களை சந்தித்ததில் மகிழ்ச்சி",
    "good morning": "காலை வணக்கம்",
    "good night": "இரவு வணக்கம்",
    "water": "தண்ணீர்",
    "food": "உணவு",
    "help": "உதவி",
    "yes": "ஆம்",
    "no": "இல்லை"
  }
};

export const translateGloss = (gloss, targetLang) => {
  if (!gloss) return "";
  const normalizedGloss = gloss.toLowerCase();
  
  // Try to find translation in dictionary
  if (dictionary[targetLang] && dictionary[targetLang][normalizedGloss]) {
    return dictionary[targetLang][normalizedGloss];
  }
  
  // Fallback to English if translation not found
  return gloss;
};

export const getLanguageCode = (language) => {
  switch (language) {
    case 'Hindi': return 'hi-IN';
    case 'Tamil': return 'ta-IN';
    case 'English':
    default: return 'en-US'; // or en-IN depending on preference
  }
};
