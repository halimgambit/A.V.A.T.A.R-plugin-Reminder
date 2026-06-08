import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export async function init () {
    await Avatar.lang.addPluginPak('Reminder');
}

export async function action(data, callback) {
    try {
        const L = await Avatar.lang.getPak('Reminder', data.language);

        const tblActions = {
            setReminder: () => setReminder(data, data.client, L)
        };
        
        info("Reminder:", data.action.command, ("plugin.from"), data.client);
            
        if (tblActions[data.action.command]) {
            await tblActions[data.action.command]();
        }

    } catch (err) {
        if (data.client) Avatar.Speech.end(data.client);
        error("Erreur Rappel:", err.message);
    }    
    callback();
}

let reminderHandles = {};

const setReminder = (data, client, L) => {

    let sentence = (data.rawSentence || data.action.sentence || "").toLowerCase();

    sentence = sentence.replace(/\bune\b/g, "1");

    const hourMatch = sentence.match(/(\d+)\s*heure/);
    const minMatch = sentence.match(/(\d+)\s*minute/);
    const secMatch = sentence.match(/(\d+)\s*seconde/);
    
    // ... reste de la fonction à l'identique ...

    let durationMs = 0;
    let timeLabelParts = [];

    if (hourMatch) {
        const h = parseInt(hourMatch[1]);
        durationMs += h * 3600000;
        timeLabelParts.push(`${h} heure${h > 1 ? 's' : ''}`);
    }
    if (minMatch) {
        const m = parseInt(minMatch[1]);
        durationMs += m * 60000;
        timeLabelParts.push(`${m} minute${m > 1 ? 's' : ''}`);
    }
    if (secMatch) {
        const s = parseInt(secMatch[1]);
        durationMs += s * 1000;
        timeLabelParts.push(`${s} seconde${s > 1 ? 's' : ''}`);
    }

    if (durationMs === 0) {
        return Avatar.speak(L.get("speech.unknown"), client, () => Avatar.Speech.end(client));
    }

    let reminderTask = "faire quelque chose";
    const taskMatch = sentence.match(/(?:rappelle[- ]moi de|rappelle[- ]moi d\')\s*(.+?)(?:\s*dans|\s*\d)/);
    
    if (taskMatch && taskMatch[1]) {
        reminderTask = taskMatch[1].trim();
    }

    const timeLabel = timeLabelParts.join(' et ');
    const startMsg = L.get("speech.start", reminderTask, timeLabel);
    const endMsg = L.get("speech.finish", reminderTask);
    
    startReminder(client, durationMs, startMsg, endMsg);
}

const startReminder = (client, durationMs, startMsg, endMsg) => {
    if (!reminderHandles[client]) {
        reminderHandles[client] = [];
    }

   info(startMsg);

    Avatar.speak(startMsg, client, () => Avatar.Speech.end(client));

    const timeoutId = setTimeout(() => {
       
        info(endMsg);

        Avatar.speak(endMsg, client, () => {
            Avatar.Speech.end(client);
        });

        if (reminderHandles[client]) {
            reminderHandles[client] = reminderHandles[client].filter(id => id !== timeoutId);
        }
    }, durationMs);

    reminderHandles[client].push(timeoutId);
}
