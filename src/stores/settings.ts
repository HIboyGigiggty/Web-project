import { persistentMap } from "@nanostores/persistent";
import { detect } from "detect-browser";

const VOICE_CHAT_DEFAULT: Record<string, unknown> = {
    echoCancellation: true,
    noiseSupression: true,
};

interface VoiceChatSettingsShape {
    echoCancellation: boolean,
    noiseSupression: boolean,
}

function getVoiceChatDefault() {
    const browser = detect();
    const defaultSettings = VOICE_CHAT_DEFAULT;
    const supportedConstraints = navigator.mediaDevices.getSupportedConstraints();
    if (!supportedConstraints["noiseSuppression"]) {
        defaultSettings.noiseSuppression = false;
    }
    if (!supportedConstraints["echoCancellation"]) {
        defaultSettings.echoCancellation = false;
    }
    if (browser) {
        if (browser.name === "firefox") {
            defaultSettings.echoCancellation = false; // the built-in echo cancellation is suprisingly bad on firefox
        }
    }
    return defaultSettings as unknown as VoiceChatSettingsShape;
}

export const voiceChatSettingStore = persistentMap<VoiceChatSettingsShape>(
    "settings.voice_chat", 
    getVoiceChatDefault(),
    {
        encode: (value) => {
            return JSON.stringify(value);
        },

        decode: (s) => {
            const obj = JSON.parse(s);
            return obj;
        },
    });
