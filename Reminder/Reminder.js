import * as url from 'url';
const __dirname = url.fileURLToPath(new URL('.', import.meta.url));

export async function init () {
    await Avatar.lang.addPluginPak('Reminder');
}

export async function action(data, callback) {
    try {
        const L = await Avatar.lang.getPak('Reminder', data.language);

        const tblActions = {
            setReminder: () => setReminder(data, data.client, L),
            stopReminder: () => stopReminder(data, data.client, L)
        };
        
        info("Reminder:", data.action.command, "from", data.client);
            
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

    // Standardisation des articles indéfinis en nombres
    sentence = sentence.replace(/\b(une|un)\b/g, "1");

    const hourMatch = sentence.match(/(\d+)\s*heure/);
    const minMatch = sentence.match(/(\d+)\s*minute/);
    const secMatch = sentence.match(/(\d+)\s*seconde/);

    let durationMs = 0;
    let timeLabelParts = [];

    if (hourMatch) {
        const h = parseInt(hourMatch[1], 10);
        durationMs += h * 3600000;
        timeLabelParts.push(`${h} heure${h > 1 ? 's' : ''}`);
    }
    if (minMatch) {
        const m = parseInt(minMatch[1], 10);
        durationMs += m * 60000;
        timeLabelParts.push(`${m} minute${m > 1 ? 's' : ''}`);
    }
    if (secMatch) {
        const s = parseInt(secMatch[1], 10);
        durationMs += s * 1000;
        timeLabelParts.push(`${s} seconde${s > 1 ? 's' : ''}`);
    }

    // Si aucun temps n'a pu être extrait, on s'arrête ici
    if (durationMs === 0) {
        return Avatar.speak(L.get("speech.unknown"), client, () => Avatar.Speech.end(client));
    }

    let reminderTask = "ton rappel"; 
    
    const taskMatch = sentence.match(/(?:rappelle[- ]moi de|rappelle[- ]moi d\')\s*(.+)/);
    
    if (taskMatch && taskMatch[1]) {
        let cleanTask = taskMatch[1]
            .replace(/dans\s*\d+\s*heure.*/, '')
            .replace(/dans\s*\d+\s*minute.*/, '')
            .replace(/dans\s*\d+\s*seconde.*/, '')
            .replace(/\b\d+\s*(heure|minute|seconde)s?\b/g, '')
            .trim();
            
        // Si après nettoyage il reste du texte, c'est notre tâche
        if (cleanTask.length > 0) {
            reminderTask = cleanTask;
        }
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
            if (reminderHandles[client].length === 0) {
                delete reminderHandles[client];
            }
        }
    }, durationMs);

    reminderHandles[client].push(timeoutId);
}

const stopReminder = (data, client, L) => {
    if (reminderHandles[client] && reminderHandles[client].length > 0) {
        reminderHandles[client].forEach(timeoutId => {
            clearTimeout(timeoutId);
        });

        delete reminderHandles[client];

        const stopMsg = L.get("speech.stopped");
        
        info("Reminder stopped for client:", client);

        return Avatar.speak(stopMsg, client, () => Avatar.Speech.end(client));
    } else {
        const noReminderMsg = L.get("speech.noReminder");
        return Avatar.speak(noReminderMsg, client, () => Avatar.Speech.end(client));
    }
}
