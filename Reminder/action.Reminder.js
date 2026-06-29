import {default as _helpers} from '../../ia/node_modules/ava-ia/helpers/index.js'

export default function (state) {
	return new Promise((resolve) => {
	
     try {

 const stopWords = ["éteins", "coupe", "stop", "stoppe", "arrête", "annule"];
const stopReminder = stopWords.some(word => state.rawSentence.toLowerCase().includes(word));

		setTimeout(() => { 
      if (stopReminder) {
          state.action = {
            module: 'Reminder',
            command: 'stopReminder',
          };
           } else {
          if (state.debug) info('Action Reminder');
			state.action = {
				module: 'Reminder',
				command: state.rule,
			};
    };
			resolve(state);
		}, Config.waitAction.time);

     } catch (error) {
      reject(new Error(`Une erreur s'est produite lors du traitement de la commande Reminder: ${error.message}`));
    }

	});
}
