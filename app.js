const btn = document.querySelector('.talk');
const sendBtn = document.querySelector('.send');
const textInput = document.getElementById('textInput');
const chatLog = document.getElementById('chatLog');
const voiceList = document.getElementById("voiceList");
const clearBtn = document.getElementById("clearChat");

let userName = "User";
let availableVoices = [];
let selectedVoice = null;

// ------------------- SPEAK FUNCTION -------------------
function speak(text, langCode = null) {
  // Make sure FRIDAY is spoken as "Friday"
  text = text.replace(/f\.r\.i\.d\.a\.y/gi, "Friday");

  const utter = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();

  if (langCode) {
    const langVoice = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
    utter.voice = langVoice || selectedVoice || voices[0];
  } else {
    utter.voice = selectedVoice || voices[0];
  }

  utter.rate = 1;
  utter.pitch = 1;
  utter.volume = 1;
  window.speechSynthesis.speak(utter);
}

// ------------------- CHAT UI -------------------
function addMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add("chat-message");
  div.innerHTML = `<span class="chat-${sender}">${sender === 'user' ? userName : 'FRIDAY'}:</span> ${text}`;
  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  saveChat();
}

// ------------------- CHAT MEMORY -------------------
function saveChat() {
  localStorage.setItem("fridayChatHistory", chatLog.innerHTML);
}
function loadChat() {
  const saved = localStorage.getItem("fridayChatHistory");
  if (saved) chatLog.innerHTML = saved;
}

// ------------------- CLEAR CHAT -------------------
clearBtn.addEventListener("click", () => {
  chatLog.innerHTML = "";
  localStorage.removeItem("fridayChatHistory");
  speak("Chat cleared successfully, boss. My memory has been reset.");
});

// ------------------- VOICE SYSTEM -------------------
function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
  voiceList.innerHTML = "";
  availableVoices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceList.appendChild(option);
  });

  // Restore saved voice
  const users = loadUsers();
  const current = getActiveUser();
  let savedVoiceName = null;
  if (current) savedVoiceName = getUserVoice(current);
  else savedVoiceName = localStorage.getItem("fridayVoiceName");

  if (savedVoiceName) {
    selectedVoice = availableVoices.find(v => v.name === savedVoiceName) || availableVoices[0];
    const idx = availableVoices.indexOf(selectedVoice);
    if (idx >= 0) voiceList.value = idx;
  } else {
    selectedVoice = availableVoices[0];
  }
}
window.speechSynthesis.onvoiceschanged = loadVoices;

voiceList.addEventListener("change", () => {
  selectedVoice = availableVoices[voiceList.value];
  const current = getActiveUser();
  if (current) saveUserVoice(current, selectedVoice.name);
  localStorage.setItem("fridayVoiceName", selectedVoice.name);
  speak(`Voice changed to ${selectedVoice.name}`);
});

// ------------------- MULTI USER SYSTEM -------------------
function loadUsers() {
  return JSON.parse(localStorage.getItem("fridayUsers") || "{}");
}
function saveUsers(data) {
  localStorage.setItem("fridayUsers", JSON.stringify(data));
}
function getActiveUser() {
  const users = loadUsers();
  return users.activeUser || null;
}
function setActiveUser(name) {
  const users = loadUsers();
  users.activeUser = name;
  saveUsers(users);
}
function getUserVoice(name) {
  const users = loadUsers();
  return users.users && users.users[name] ? users.users[name].voiceName : null;
}
function saveUserVoice(name, voiceName) {
  const users = loadUsers();
  if (!users.users) users.users = {};
  if (!users.users[name]) users.users[name] = {};
  users.users[name].voiceName = voiceName;
  saveUsers(users);
}

// ------------------- GREETING -------------------
function wishMe() {
  const hour = new Date().getHours();
  if (hour < 12) speak(`Good morning, ${userName}.`);
  else if (hour < 17) speak(`Good afternoon, ${userName}.`);
  else speak(`Good evening, ${userName}.`);
}

// ------------------- INITIALIZATION -------------------
window.addEventListener("DOMContentLoaded", () => {
  loadChat();
  const currentUser = getActiveUser();
  if (currentUser) {
    userName = currentUser;
    speak(`Welcome back ${userName}. Loading your profile.`);
  } else {
    speak("Initializing Friday system...");
    setTimeout(() => speak("Hi! Tell me who you are by saying 'I'm your name'."), 1200);
  }
  setTimeout(() => wishMe(), 2000);
});

// ------------------- SPEECH RECOGNITION -------------------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = "en-US";

btn.addEventListener("click", () => recognition.start());
recognition.onresult = (event) => {
  const msg = event.results[0][0].transcript.toLowerCase();
  addMessage("user", msg);
  takeCommand(msg);
};
sendBtn.addEventListener("click", () => {
  const msg = textInput.value.trim();
  if (msg) {
    addMessage("user", msg);
    takeCommand(msg.toLowerCase());
    textInput.value = "";
  }
});

// ------------------- MAIN COMMAND SYSTEM -------------------
async function takeCommand(message) {
  let response = "";

  // Multi-user commands
  if (message.startsWith("i'm ") || message.startsWith("i am ")) {
    const name = message.replace(/i('?m| am)/, "").trim();
    if (!name) return speak("I didn’t catch the name, please repeat.");
    const users = loadUsers();
    if (!users.users) users.users = {};
    if (!users.users[name]) {
      users.users[name] = { voiceName: selectedVoice ? selectedVoice.name : null };
      speak(`Hello ${name}, new profile created. I’ll remember you.`);
    } else {
      speak(`Welcome back ${name}. I’ve loaded your preferences.`);
    }
    users.activeUser = name;
    saveUsers(users);
    userName = name;
    const storedVoice = getUserVoice(name);
    if (storedVoice) {
      const v = window.speechSynthesis.getVoices().find(vo => vo.name === storedVoice);
      if (v) selectedVoice = v;
    }
    return addMessage("friday", `Active user set to ${name}.`);
  }

  if (message.startsWith("switch user to")) {
    const name = message.replace("switch user to", "").trim();
    const users = loadUsers();
    if (users.users && users.users[name]) {
      users.activeUser = name;
      saveUsers(users);
      userName = name;
      const storedVoice = getUserVoice(name);
      if (storedVoice) {
        const v = window.speechSynthesis.getVoices().find(vo => vo.name === storedVoice);
        if (v) selectedVoice = v;
      }
      speak(`Switched to ${name}'s profile.`);
    } else {
      speak(`I don’t have any saved profile for ${name}.`);
    }
    return addMessage("friday", `Switched to ${name}.`);
  }

  if (message.startsWith("delete user")) {
    const name = message.replace("delete user", "").trim();
    const users = loadUsers();
    if (users.users && users.users[name]) {
      delete users.users[name];
      if (users.activeUser === name) delete users.activeUser;
      saveUsers(users);
      speak(`Profile for ${name} deleted.`);
    } else {
      speak(`No profile found for ${name}.`);
    }
    return addMessage("friday", `User ${name} removed.`);
  }

  // Normal commands
  if (message.includes("open google")) { speak("Opening Google..."); window.open("https://google.com"); response = "Opened Google."; }
  else if (message.includes("open youtube")) { speak("Opening YouTube..."); window.open("https://youtube.com"); response = "Opened YouTube."; }
  else if (message.includes("open my sr portal")) { speak("Opening your S R portal..."); window.open("https://sraap.in/student_login.php"); response = "Opened SRAAP portal."; }
  else if (message.includes("translate")) { response = await translateText(message); }
  else if (message.includes("weather")) { response = "It's currently 28°C with clear skies in Hyderabad."; speak(response); }
  else if (message.includes("news")) { response = "Top news: India launches new AI initiative, markets rise, scientists discover new exoplanet."; speak(response); }
  else if (message.includes("time")) { const time = new Date().toLocaleTimeString(); response = `The time is ${time}`; speak(response); }
  else if (message.includes("date")) { const date = new Date().toDateString(); response = `Today's date is ${date}`; speak(response); }

  // --- Fun facts and jokes ---
  else if (message.includes("i'm bored") || message.includes("i am bored") || message.includes("bored")) {
    const funFacts = [
      "Did you know the first computer bug was an actual moth found in a Harvard Mark Two computer in 1947?",
      "Bananas are berries, but strawberries aren’t!",
      "The heart of a shrimp is located in its head.",
      "Honey never spoils. Archaeologists found honey in ancient Egyptian tombs that was still edible!",
      "Your phone has more computing power than the computers used for the Apollo 11 moon landing.",
      "Octopuses have three hearts and blue blood!",
      "The Eiffel Tower can grow more than six inches in summer because of heat expansion."
    ];
    response = funFacts[Math.floor(Math.random() * funFacts.length)];
    speak(response);
  }

  else if (message.includes("tell me a joke") || message.includes("make me laugh") || message.includes("joke")) {
    const jokes = [
      "Why don’t programmers like nature? It has too many bugs!",
      "Why did the computer show up late to work? It had a hard drive!",
      "I told my computer I needed a break — and now it won’t stop sending me KitKat ads!",
      "Why do Java developers wear glasses? Because they can’t C sharp!",
      "Parallel lines have so much in common. It’s a shame they’ll never meet!"
    ];
    response = jokes[Math.floor(Math.random() * jokes.length)];
    speak(response);
  }

  else if (message.includes("tell me something") || message.includes("something interesting") || message.includes("fun fact")) {
    const interesting = [
      "Did you know? The human brain generates enough electricity to power a small LED light bulb!",
      "Sharks existed before trees — over 400 million years ago!",
      "There are more stars in the universe than grains of sand on all the Earth’s beaches combined!",
      "The word robot comes from a Czech word meaning forced labor or slave.",
      "AI assistants like me process thousands of words in milliseconds — just to make you smile!"
    ];
    response = interesting[Math.floor(Math.random() * interesting.length)];
    speak(response);
  }

  // --- Friendly fallback responses ---
  else {
    const randomReplies = [
      "Tell me anything, I’m listening.",
      "You can ask me to open apps, translate text, or just chat!",
      "I’m here for you. What would you like me to do?",
      "Hmm, interesting! Want to try asking me something new?",
      "I’m ready for anything — what’s on your mind?",
      "Go ahead, boss — I’m all ears.",
      "Would you like me to tell a fun fact or open something?",
      "Let’s do something cool. Say 'open YouTube' or 'translate hello to Hindi.'"
    ];
    response = randomReplies[Math.floor(Math.random() * randomReplies.length)];
    speak(response);
  }

  addMessage("friday", response);
}

// ------------------- TRANSLATOR -------------------
async function translateText(message) {
  try {
    const regex = /translate (.+) to (.+)/i;
    const match = message.match(regex);
    if (!match || match.length < 3) return "Say: 'Translate hello to Hindi'.";

    const text = match[1].trim();
    const targetLang = match[2].trim().toLowerCase();
    const langMap = { hindi:"hi", telugu:"te", tamil:"ta", spanish:"es", french:"fr", german:"de", japanese:"ja", chinese:"zh", arabic:"ar", italian:"it", english:"en" };
    const code = langMap[targetLang] || "en";

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${code}`;
    const res = await fetch(url);
    const data = await res.json();
    const translated = data.responseData.translatedText;
    const detected = data.responseData.detectedLanguage || "auto";

    speak(translated, code);
    return `Translation from ${detected.toUpperCase()} to ${targetLang}: ${translated}`;
  } catch (e) {
    console.error(e);
    return "Sorry, I couldn’t translate that.";
  }
}
