const { EventEmitter } = require('events');
const mergeOptions = require('merge-options');
const { writeFile, readFile, exists } = require('fs');
const { promisify } = require('util');
const writeFileAsync = promisify(writeFile);
const existsAsync = promisify(exists);
const readFileAsync = promisify(readFile);
const Discord = require('discord.js');
const { defaultOptions } = require('./Utils');
const Case = require('./Case');

/**
 * Moderator
 */
class Moderator extends EventEmitter {
    /**
     * @param {Client} client The Discord Client
     * @param {ModeratorOptions} options The manager options
     */
    constructor(client, options) {
        super();
        if (!client) throw new Error('Client is a required option.');

        /**
         * The Discord Client
         * @type {Client}
         */
        this.client = client;

        /**
         * Whether the manager is ready
         * @type {Boolean}
         */
        this.ready = false;

        /**
         * The moderation managed by this manager
         * @type {Cases[]}
         */
        this.cases = [];

        /**
         * The manager options
         * @type {ModeratorOptions}
         */
        this.options = mergeOptions(defaultOptions, options);

        /**
         * Whether the Discord.js library version is the v12 one
         * @type {boolean}
         */
        this.v12 = this.options.DJSlib === 'v12';
        this._init();
    }

    /**
     * Ends a case. This method is automatically called when a case ends.
     * @param {string} ID The case ID
     * @returns {Promise<Case>} The case
     *
     * @example
     * moderator.end("689530053268209664");
     */
    end(ID) {
        return new Promise(async (resolve, reject) => {
            let caseData = this.cases.find(g => g.id === ID);
            if (!caseData) {
                return reject('No case found with ID ' + ID + '.');
            }
            let caseObj = new Case(this, caseData);
            if (caseObj.ended) {
                return reject('Case with ID ' + caseObj.id + ' is already ended');
            }
            await caseObj.fetchAuthor();
            if (!caseObj.author) {
                return reject('Unable to fetch the author of the case with ID ' + caseObj.id + '.');
            }
            await caseObj.fetchGuild();
            if (!caseObj.guild) {
                return reject('Unable to fetch the guild of the case with ID ' + caseObj.id + '.');
            }
            if (caseObj.type === 'mute') {
                await caseObj.fetchUser();
                try {
                    if (this.v12) {
                        caseObj.user.roles.remove(caseObj.options.mutedRoleID)
                    } else {
                        caseObj.user.removeRole(caseObj.options.mutedRoleID)
                    }
                } catch(e) {
                    this._markAsEnded(caseObj.id);
                    return reject('Unable to unmute the user of the case with ID ' + caseObj.id + '.' + e);
                }
            } 
            if(caseObj.type == 'ban') {
                try {
                    if (this.v12) {
                        caseObj.guild.members.unban(caseObj.userID)
                    } else {
                        caseObj.guild.unban(caseObj.userID)
                    }
                } catch(e) {
                    return reject('Unable to unban the user of the case with ID ' + caseObj.id + '.' + e);
                }
            }
            this._markAsEnded(caseObj.id);
            resolve(caseObj);
            this.emit('caseDelete', caseObj);
        }).catch(e => console.log(e));
    }

    /**
     * Ban or Temp-ban a user
     *
     * @param {GuildMember} user The user
     * @param {Options} opts The options for the case
     *
     * @returns {Promise<Case>}
     *
     * @example
     * moderator.ban(message.guild.members.cache.get(message.mentions.users.first().id), {
     *      time: 1000,
     *      // Ban will last 10 seconds
     *      reason: "do something bad",
     *      // Ban reason
     *      author: message.member
     *      // Author of the ban
     * });
     */
    ban(user, opts = {}) {
        return new Promise(async (resolve, reject) => {
            if (!this.ready) {
                return reject('The moderator is not ready yet.');
            }
            if (!user) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!user.guild) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!opts.author) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if (!opts.author.guild) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            let caseObj = new Case(this, {
                id: Discord.SnowflakeUtil.generate(Date.now()),
                type: 'ban',
                date: Date.now(),
                guildID: user.guild.id,
                authorID: opts.author.id,
                userID: user.id,
                endAt: opts.time ? Date.now() + opts.time : 0,
                ended: opts.time ? false : true,
                reason: opts.reason ? opts.reason : 'No reason specified'
            });
            if(this.v12) {
                user.guild.members.ban(user.id, { reason: 'Banned by ' + opts.author.user.tag + ' for ' + caseObj.reason + '.' });
            } else {
                user.guild.ban(user.id, { reason: 'Banned by ' + opts.author.user.tag + ' for ' + caseObj.reason + '.' });
            }
            this.cases.push(caseObj);
            await this._saveCase(caseObj);
            resolve(caseObj);
            this.emit("caseCreate", caseObj);
        }).catch(e => console.log(e));
    }

    /**
     * Un-ban a user
     *
     * @param {GuildMember} user The user
     * @param {Options} opts The options for the case
     *
     * @returns {Promise<Case>}
     *
     * @example
     * moderator.unban(args[0], {
     *      reason: "i'm nice",
     *      // Un-ban reason
     *      author: message.member
     *      // Author of the un-ban
     * });
     */
    unban(user, opts = {}) {
        return new Promise(async (resolve, reject) => {
            if (!this.ready) {
                return reject('The moderator is not ready yet.');
            }
            if (!user) {
                return reject(`User is not a valid userID. (val=${user})`);
            }
            if (!opts.author) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if (!opts.author.guild) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            let ban = await opts.author.guild.fetchBans()
            ban = ban.get(user)
            if(!ban) {
                return reject(`The user with ID ${user} isn't banned.`);
            }
            let caseObj = new Case(this, {
                id: Discord.SnowflakeUtil.generate(Date.now()),
                type: 'unban',
                date: Date.now(),
                guildID: opts.author.guild.id,
                authorID: opts.author.id,
                userID: user,
                endAt: 0,
                ended: true,
                reason: opts.reason ? opts.reason : 'No reason specified'
            });
            if(this.v12) {
                opts.author.guild.members.unban(user, 'Un-banned by ' + opts.author.user.tag + ' for ' + caseObj.reason + '.');
            } else {
                opts.author.guild.unban(user);
            }
            this.cases.push(caseObj);
            await this._saveCase(caseObj);
            resolve(caseObj);
            this.emit("caseCreate", caseObj);
        }).catch(e => console.log(e));
    }

    /**
     * Mute or Temp-mute a user
     *
     * @param {GuildMember} user The user
     * @param {Options} opts The options for the case
     *
     * @returns {Promise<Case>}
     *
     * @example
     * moderator.mute(message.guild.members.cache.get(message.mentions.users.first().id), {
     *      time: 1000,
     *      // Mute will last 10 seconds
     *      reason: "bad words",
     *      // Mute reason
     *      author: message.member
     *      // Author of the mute
     * });
     */
    mute(user, opts = {}) {
        return new Promise(async (resolve, reject) => {
            if (!this.ready) {
                return reject('The moderator is not ready yet.');
            }
            if (!user) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!user.guild) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!opts.author) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if (!opts.author.guild) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if(!opts.mutedRoleID) {
                return reject(`Opts.mutedRoleID is not a valid RoleID. (val=${opts.mutedRoleID})`);
            }
            let caseObj = new Case(this, {
                id: Discord.SnowflakeUtil.generate(Date.now()),
                type: 'mute',
                date: Date.now(),
                guildID: user.guild.id,
                authorID: opts.author.id,
                userID: user.id,
                endAt: opts.time ? Date.now() + opts.time : 0,
                ended: opts.time ? false : true,
                reason: opts.reason ? opts.reason : 'No reason specified!',
                options: {
                    mutedRoleID: opts.mutedRoleID
                }
            });
            if(this.v12) {
                user.roles.add(opts.mutedRoleID, 'Muted by ' + opts.author.user.tag + ' for ' + caseObj.reason + '.');
            } else {
                user.addRole(opts.mutedRoleID, 'Muted by ' + opts.author.user.tag + ' for ' + caseObj.reason + '.');
            }
            this.cases.push(caseObj);
            await this._saveCase(caseObj);
            resolve(caseObj);
            this.emit("caseCreate", caseObj);
        }).catch(e => console.log(e));
    }

    /**
     * Un-mute a user
     *
     * @param {GuildMember} user The user
     * @param {Options} opts The options for the case
     *
     * @returns {Promise<Case>}
     *
     * @example
     * moderator.unmute(message.guild.members.cache.get(message.mentions.users.first().id), {
     *      reason: "i'm nice",
     *      // Un-mute reason
     *      author: message.member
     *      // Author of the un-mute
     * });
     */
    unmute(user, opts = {}) {
        return new Promise(async (resolve, reject) => {
            if (!this.ready) {
                return reject('The moderator is not ready yet.');
            }
            if (!user) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!user.guild) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!opts.author) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if (!opts.author.guild) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if(!opts.mutedRoleID) {
                return reject(`Opts.mutedRoleID is not a valid RoleID. (val=${opts.mutedRoleID})`);
            }
            let caseObj = new Case(this, {
                id: Discord.SnowflakeUtil.generate(Date.now()),
                type: 'unmute',
                date: Date.now(),
                guildID: user.guild.id,
                authorID: opts.author.id,
                userID: user.id,
                endAt: 0,
                ended: true,
                reason: opts.reason ? opts.reason : 'No reason specified!',
                options: {
                    mutedRoleID: opts.mutedRoleID
                }
            });
            if(this.v12) {
                user.roles.remove(opts.mutedRoleID, 'Un-muted by ' + opts.author.user.tag + ' for ' + caseObj.reason + '.');
            } else {
                user.removeRole(opts.mutedRoleID, 'Un-muted by ' + opts.author.user.tag + ' for ' + caseObj.reason + '.');
            }
            this.cases.push(caseObj);
            await this._saveCase(caseObj);
            resolve(caseObj);
            this.emit("caseCreate", caseObj);
        }).catch(e => console.log(e));
    }

    /**
     * Mute or Temp-mute a user
     *
     * @param {GuildMember} user The user
     * @param {Options} opts The options for the case
     *
     * @returns {Promise<Case>}
     *
     * @example
     * moderator.mute(message.guild.members.cache.get(message.mentions.users.first().id), {
     *      time: 1000,
     *      // Mute will last 10 seconds
     *      reason: "bad words",
     *      // Mute reason
     *      author: message.member
     *      // Author of the mute
     * });
     */
    warn(user, opts = {}) {
        return new Promise(async (resolve, reject) => {
            if (!this.ready) {
                return reject('The moderator is not ready yet.');
            }
            if (!user) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!user.guild) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!opts.author) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if (!opts.author.guild) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if(!opts.reason) {
                return reject(`Reason is not a valid String. (val=${opts.reason})`);
            }
            let caseObj = new Case(this, {
                id: Discord.SnowflakeUtil.generate(Date.now()),
                type: 'warn',
                date: Date.now(),
                guildID: user.guild.id,
                authorID: opts.author.id,
                userID: user.id,
                endAt: 0,
                ended: true,
                reason: opts.reason,
                options: {
                    mutedRoleID: opts.mutedRoleID
                }
            });
            this.cases.push(caseObj);
            await this._saveCase(caseObj);
            resolve(caseObj);
            this.emit("caseCreate", caseObj);
        }).catch(e => console.log(e));
    }

    /**
     * Mute or Temp-mute a user
     *
     * @param {GuildMember} user The user
     * @param {Options} opts The options for the case
     *
     * @returns {Promise<Case>}
     *
     * @example
     * moderator.mute(message.guild.members.cache.get(message.mentions.users.first().id), {
     *      time: 1000,
     *      // Mute will last 10 seconds
     *      reason: "bad words",
     *      // Mute reason
     *      author: message.member
     *      // Author of the mute
     * });
     */
    kick(user, opts = {}) {
        return new Promise(async (resolve, reject) => {
            if (!this.ready) {
                return reject('The moderator is not ready yet.');
            }
            if (!user) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!user.guild) {
                return reject(`User is not a valid GuildMember. (val=${user})`);
            }
            if (!opts.author) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if (!opts.author.guild) {
                return reject(`Opts.author is not a valid GuildMember. (val=${opts.author})`);
            }
            if(!opts.reason) {
                return reject(`Reason is not a valid String. (val=${opts.reason})`);
            }
            let caseObj = new Case(this, {
                id: Discord.SnowflakeUtil.generate(Date.now()),
                type: 'kick',
                date: Date.now(),
                guildID: user.guild.id,
                authorID: opts.author.id,
                userID: user.id,
                endAt: 0,
                ended: true,
                reason: opts.reason
            });
            try {
                user.kick('Kicked by ' + opts.author.user.tag + ' for ' + caseObj.reason + '.')
            } catch(e) {
                console.log(e)
            }
            this.cases.push(caseObj);
            await this._saveCase(caseObj);
            resolve(caseObj);
            this.emit("caseCreate", caseObj);
        }).catch(e => console.log(e));
    }

    /**
     * Edits a case.
     * @param {string} ID The message ID of the case to edit
     * @param {CaseOptions} options The edit options
     * @returns {Case} The edited case
     *
     * @example
     * moderator.edit("690251959407607850", {
     *      addTime: -10000, // The case will end 10 seconds earlier
     *      author: message.member,
     *      reason: "misunderstanding"
     * });
     */
    edit(ID, opts) {
        return new Promise(async (resolve, reject) => {
            let caseData = this.cases.find(g => g.id === ID);
            if (!caseData) {
                return reject('No cas found with ID ' + ID + '.');
            }
            let caseObj = new Case(this, casData);
            if (caseData.ended) {
                return reject('Case with ID ' + caseObj.id + ' is already ended.');
            }
            await caseObj.fetchGuild();
            if (!caseObj.guild) {
                return reject('Unable to fetch guild with case ID ' + caseObj.id + '.');
            }
            // Update data
            let modifiedCaseData = caseData;
            if (opts.author) modifiedCaseData.author = opts.author;
            if (opts.reason) modifiedCaseData.reason = opts.reason;
            if (opts.addTime && caseData.ended != false) modifiedCaseData.endAt = CaseData.endAt + opts.addTime;
            if (opts.setEndTimestamp && caseData.ended != false) modifiedCaseData.endAt = opts.setEndTimestamp;
            // Save the case
            let newCase = new Case(this, modifiedCaseData);
            this._saveCase(newCase);
            resolve(newCase);
            this.emit("caseUpdate", caseObj, newCase);
        }).catch(e => console.log(e));
    }

    /**
     * Deletes a case. It will delete the case data.
     * @param {string} ID  The ID of the case
     * @returns {Promise<void>}
     */
    delete(ID, opts) {
        return new Promise(async (resolve, reject) => {
            let caseData = this.cases.find(g => g.id === ID);
            if (!caseData) {
                return reject('No case found with ID ' + ID + '.');
            }
            await this.end(caseObj.id);
            let caseObj = new Case(this, caseData);
            this.cases = this.cases.filter(g => g.id !== ID);
            await writeFileAsync(this.options.storage, JSON.stringify(this.cases), 'utf-8');
            caseObj.delelete = {};
            if(opts.author) caseObj.delete.author = opts.author;
            if(opts.reason) caseObj.delete.reason = opts.reason;
            resolve(caseObj);
            this.emit("caseDelete", caseObj);
        }).catch(e => console.log(e));
    }

    /**
     * Gets the cases from the storage file, or create it
     * @ignore
     * @private
     * @returns {Array<Cases>}
     */
    async _initStorage() {
        // Whether the storage file exists, or not
        let storageExists = await existsAsync(this.options.storage);
        // If it doesn't exists
        if (!storageExists) {
            // Create the file with an empty array
            await writeFileAsync(this.options.storage, '[]', 'utf-8');
            return [];
        } else {
            // If the file exists, read it
            let storageContent = await readFileAsync(this.options.storage);
            try {
                let cases = await JSON.parse(storageContent);
                if (Array.isArray(cases)) {
                    return cases;
                } else {
                    throw new SyntaxError('The storage file is not properly formatted.');
                }
            } catch (e) {
                if (e.message === 'Unexpected end of JSON input') {
                    throw new SyntaxError('The storage file is not properly formatted.', e);
                } else {
                    throw e;
                }
            }
        }
    }

    /**
     * Save the case to the storage file
     * @ignore
     * @private
     * @param {Case} caseObj The case to save
     */
    async _saveCase(caseObj) {
        this.cases = this.cases.filter(g => g.id !== caseObj.id);
        let caseData = {
            id: caseObj.id,
            type: caseObj.type,
            date: caseObj.date,
            guildID: caseObj.guildID,
            authorID: caseObj.authorID,
            userID: caseObj.userID,
            endAt: caseObj.endAt,
            ended: caseObj.ended,
            options: caseObj.options,
        };
        this.cases.push(caseData);
        await writeFileAsync(this.options.storage, JSON.stringify(this.cases), 'utf-8');
        return;
    }

    /**
     * Mark a case as ended
     * @private
     * @ignore
     * @param {string} ID The ID of the case
     */
    async _markAsEnded(ID) {
        this.cases.find(c => c.id === ID).ended = true;
        await writeFileAsync(this.options.storage, JSON.stringify(this.cases), 'utf-8');
        return;
    }

    /**
     * Checks each case and update it if needed
     * @ignore
     * @private
     */
    _checkCase() {
        if (this.cases.length <= 0) return;
        this.cases.forEach(async caseData => {
            let caseObj = new Case(this, caseData);
            if (caseObj.ended) return;
            if (!caseObj.type) return;
            if (caseObj.remainingTime <= 0) {
                this.end(caseObj.id);
            }
            await caseObj.fetchGuild();
            if (!caseObj.guild) {
                caseObj.ended = true;
                await this._markAsEnded(caseObj.id);
                return;
            }
        });
    }

    /**
     * Inits the moderator
     * @ignore
     * @private
     */
    async _init() {
        this.cases = await this._initStorage();
        setInterval(() => {
            if (this.client.readyAt) this._checkCase.call(this);
        }, this.options.updateCountdownEvery);
        this.ready = true;
    }
}

/**
 * Emitted when a case ends.
 * @event Moderator#caseDelete
 * @param {Case} caseObj The case instance
 * 
 * Emitted when a case create
 * @event Moderator#caseCreate
 * @param {Case} caseObj the case instance
 * 
 * @example
 * // This can be used to add features such as a log
 * moderator.on('caseDelete', (caseObj) => {
 *      console.log(caseObj);
 * });
 * 
 * moderator.on('caseCreate', (caseObj) => {
 *      console.log(caseObj);
 * });
 */

module.exports = Moderator;