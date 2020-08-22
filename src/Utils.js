const Discord = require('discord.js');

/**
 * The moderator options
 * @typedef ModeratorOptions
 *
 * @property {string} [storage='./cases.json'] The storage path for the cases.
 * @property {string} [DJSlib] The Discord.js library version you want to use
 */
const ModeratorOptions = {
    storage: './cases.json',
    DJSlib: Discord.version.split('.')[0] === '12' ? 'v12' : 'v11',
    updateCountdownEvery: 5000,
};

module.exports = {
   defaultOptions: ModeratorOptions
};