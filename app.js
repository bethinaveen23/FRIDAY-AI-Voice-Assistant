const btn = document.querySelector('.talk');
const sendBtn = document.querySelector('.send');
const textInput = document.getElementById('textInput');
const chatLog = document.getElementById('chatLog');
const voiceList = document.getElementById("voiceList");
const clearBtn = document.getElementById("clearChat");

let userName = "User";
let availableVoices = [];
let selectedVoice = null;

// ------------------- SPEAK -------------------
function speak(text, langCode = null) {
  if (!text) return;

  text = text.replace(/f\.r\.i\.d\.a\.y/gi, "Friday");

  window.speechSynthesis.cancel();

  const utter = new SpeechSynthesisUtterance(text);
  const voices = availableVoices.length ? availableVoices : window.speechSynthesis.getVoices();

  if (langCode) {
    const langVoice = voices.find(v => v.lang.toLowerCase().startsWith(langCode));
    utter.voice = langVoice || selectedVoice || voices[0] || null;
  } else {
    utter.voice = selectedVoice || voices[0] || null;
  }

  utter.rate = 1;
  utter.pitch = 1;
  utter.volume = 1;

  window.speechSynthesis.speak(utter);
}

// ------------------- CHAT UI (Bubbles) -------------------
function addMessage(sender, text) {
  const div = document.createElement("div");
  div.classList.add("chat-message", sender === "user" ? "user-msg" : "friday-msg");

  const meta = document.createElement("div");
  meta.classList.add("meta");
  meta.textContent = sender === "user" ? userName : "FRIDAY";

  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble");
  bubble.textContent = text;

  div.appendChild(meta);
  div.appendChild(bubble);

  chatLog.appendChild(div);
  chatLog.scrollTop = chatLog.scrollHeight;
  saveChat();
}

// ------------------- Chat memory -------------------
function saveChat() {
  localStorage.setItem("fridayChatHistory", chatLog.innerHTML);
}
function loadChat() {
  const saved = localStorage.getItem("fridayChatHistory");
  if (saved) chatLog.innerHTML = saved;
}

// ------------------- Clear chat -------------------
clearBtn.addEventListener("click", () => {
  chatLog.innerHTML = "";
  localStorage.removeItem("fridayChatHistory");
  speak("Chat cleared successfully, boss. My memory has been reset.");
});

// ------------------- Users -------------------
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

// ------------------- Voices -------------------
function loadVoices() {
  availableVoices = window.speechSynthesis.getVoices();
  if (!availableVoices.length) return;

  voiceList.innerHTML = "";
  availableVoices.forEach((voice, index) => {
    const option = document.createElement("option");
    option.value = String(index);
    option.textContent = `${voice.name} (${voice.lang})`;
    voiceList.appendChild(option);
  });

  const current = getActiveUser();
  const savedVoiceName = (current && getUserVoice(current)) || localStorage.getItem("fridayVoiceName");

  if (savedVoiceName) {
    selectedVoice = availableVoices.find(v => v.name === savedVoiceName) || availableVoices[0];
  } else {
    selectedVoice = availableVoices[0];
  }

  const idx = availableVoices.indexOf(selectedVoice);
  if (idx >= 0) voiceList.value = String(idx);
}

window.speechSynthesis.onvoiceschanged = loadVoices;
loadVoices();

voiceList.addEventListener("change", () => {
  selectedVoice = availableVoices[Number(voiceList.value)] || availableVoices[0];
  const current = getActiveUser();
  if (current) saveUserVoice(current, selectedVoice.name);
  localStorage.setItem("fridayVoiceName", selectedVoice.name);
  speak(`Voice changed to ${selectedVoice.name}`);
});

// ------------------- Greeting -------------------
function wishMe() {
  const hour = new Date().getHours();
  if (hour < 12) speak(`Good morning, ${userName}.`);
  else if (hour < 17) speak(`Good afternoon, ${userName}.`);
  else speak(`Good evening, ${userName}.`);
}

// ------------------- Typing indicator -------------------
let typingEl = null;

function showTyping() {
  if (typingEl) return;
  typingEl = document.createElement("div");
  typingEl.classList.add("chat-message", "friday-msg");

  const meta = document.createElement("div");
  meta.classList.add("meta");
  meta.textContent = "FRIDAY";

  const box = document.createElement("div");
  box.classList.add("typing");
  box.innerHTML = `<span class="dot"></span><span class="dot"></span><span class="dot"></span>`;

  typingEl.appendChild(meta);
  typingEl.appendChild(box);
  chatLog.appendChild(typingEl);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function hideTyping() {
  if (!typingEl) return;
  typingEl.remove();
  typingEl = null;
}

// ------------------- Initialization -------------------
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

  setTimeout(wishMe, 2000);
});

// ------------------- Speech recognition -------------------
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

if (recognition) {
  recognition.lang = "en-US";
  btn.addEventListener("click", () => recognition.start());

  recognition.onresult = (event) => {
    const msg = event.results[0][0].transcript.toLowerCase();
    addMessage("user", msg);
    takeCommand(msg);
  };
} else {
  btn.addEventListener("click", () => speak("Sorry, speech recognition is not supported in this browser."));
}

// Send button + Enter
sendBtn.addEventListener("click", () => {
  const msg = textInput.value.trim();
  if (!msg) return;
  addMessage("user", msg);
  takeCommand(msg.toLowerCase());
  textInput.value = "";
});
textInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendBtn.click();
});

// ------------------- AI call (SAFE via backend) -------------------
async function getAIReply(userText) {
  try {
    const res = await fetch("https://friday-ai-z7aj.onrender.com/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: userText })
    });
    const data = await res.json();
    return data.reply || "I couldn't generate a reply.";
  } catch (e) {
    console.error(e);
    return "AI backend is not running. Start server.js first.";
  }
}

// ------------------- Commands -------------------
async function takeCommand(message) {
  let response = "";

  // Multi-user commands
  if (message.startsWith("i'm ") || message.startsWith("i am ")) {
    const name = message.replace(/i('?m| am)/, "").trim();
    if (!name) {
      speak("I didn’t catch the name, please repeat.");
      return;
    }

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
      const v = availableVoices.find(vo => vo.name === storedVoice);
      if (v) selectedVoice = v;
    }

    addMessage("friday", `Active user set to ${name}.`);
    return;
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
        const v = availableVoices.find(vo => vo.name === storedVoice);
        if (v) selectedVoice = v;
      }

      response = `Switched to ${name}.`;
      speak(`Switched to ${name}'s profile.`);
    } else {
      response = `No saved profile found for ${name}.`;
      speak(`I don’t have any saved profile for ${name}.`);
    }

    addMessage("friday", response);
    return;
  }

  if (message.startsWith("delete user")) {
    const name = message.replace("delete user", "").trim();
    const users = loadUsers();

    if (users.users && users.users[name]) {
      delete users.users[name];
      if (users.activeUser === name) delete users.activeUser;
      saveUsers(users);

      response = `User ${name} removed.`;
      speak(`Profile for ${name} deleted.`);
    } else {
      response = `No profile found for ${name}.`;
      speak(`No profile found for ${name}.`);
    }

    addMessage("friday", response);
    return;
  }

  // Normal commands
  if (message.includes("open google")) {
    response = "Opened Google.";
    speak("Opening Google...");
    window.open("https://google.com", "_blank");
  } else if (message.includes("open youtube")) {
    response = "Opened YouTube.";
    speak("Opening YouTube...");
    window.open("https://youtube.com", "_blank");
  } else if (message.includes("open my sr portal")) {
    response = "Opened SRAAP portal.";
    speak("Opening your S R portal...");
    window.open("https://sraap.in/student_login.php", "_blank");
  } else if (message.includes("translate")) {
    response = await translateText(message);
    speak(response);
  } else if (message.includes("time")) {
    const time = new Date().toLocaleTimeString();
    response = `The time is ${time}`;
    speak(response);
  } else if (message.includes("date")) {
    const date = new Date().toDateString();
    response = `Today's date is ${date}`;
    speak(response);
  } else if (message.includes("weather")) {
    response = "I can do live weather if you add a weather API. For now, tell me your city.";
    speak(response);
  } else if (message.includes("news")) {
    response = "I can do live news if you add a news API. For now, tell me what topic you want.";
    speak(response);
  } else {
    // AI fallback
    showTyping();
    response = await getAIReply(message);
    hideTyping();
    speak(response);
  }

  addMessage("friday", response);
}

// ------------------- Translator -------------------
async function translateText(message) {
  try {
    const regex = /translate (.+) to (.+)/i;
    const match = message.match(regex);
    if (!match || match.length < 3) return "Say: 'Translate hello to Hindi'.";

    const text = match[1].trim();
    const targetLang = match[2].trim().toLowerCase();

    const langMap = {
      hindi: "hi", telugu: "te", tamil: "ta",
      spanish: "es", french: "fr", german: "de",
      japanese: "ja", chinese: "zh", arabic: "ar",
      italian: "it", english: "en"
    };

    const code = langMap[targetLang] || "en";
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=auto|${code}`;

    const res = await fetch(url);
    const data = await res.json();

    const translated = data?.responseData?.translatedText || "";
    if (!translated) return "Sorry, I couldn’t translate that.";

    speak(translated, code);
    return `Translation to ${targetLang}: ${translated}`;
  } catch (e) {
    console.error(e);
    return "Sorry, I couldn’t translate that.";
  }
}

