const { EventEmitter } = require('events');

/**
 * Represents a Case
 */
class Case extends EventEmitter {
    /**
     * @param {Moderator} moderator The Moderator
     * @param {Object} options The case data
     */
    constructor(moderator, options) {
        super();

        /**
         * The Moderator
         * @type {Moderator}
         */
        this.moderator = moderator;

        /**
         * The Discord Client
         * @type {Client}
         */
        this.client = moderator.client;

        /**
         * The case ID
         * @type {Snowflake}
         */
        this.id = options.id;

        /**
         * The case type
         * @type {String}
         */ 
        this.type = options.type;

        /**
         * The timestamp of the case
         * @type {Date}
         */
        this.date = options.date;

        /**
         * The case guild
         * @type {Snowflake}
         */
        this.guildID = options.guildID;

        /**
         * The case author
         * @type {Snowflake}
         */
        this.authorID = options.authorID

        /**
         * The case user
         * @type {Snowflake}
         */
        this.userID = options.userID

        /**
         * The end date of the case
         * @type {Number}
         */
        this.endAt = options.endAt;

        /**
         * Whether the case is ended
         * @type {Boolean}
         */
        this.ended = options.ended;

        /**
         * Case reason
         * @type {String}
         */
        this.reason = options.reason;

        /**
         * The case data
         * @type {Object}
         */
        this.options = options.options;
    }

    /**
     * The remaining time before the end of the case
     * @type {Number}
     * @readonly
     */
    get remainingTime() {
        return this.endAt - Date.now();
    }

    /**
     * Fetches the case author
     * @returns {Promise<GuildMember>} The Discord member
     */
    async fetchAuthor() {
        return new Promise(async (resolve, reject) => {
            let author = null,
            guild = null;
            if (this.moderator.v12) {
                guild = await this.client.guilds.cache.get(this.guildID);
                if(!guild) {
                    return reject('Unable to fetch the author of the case with ID' + this.id + '.');
                }
                author = guild.members.fetch(this.authorID);
            } else {
                guild = await this.client.guilds.get(this.guildID);
                if(!guild) {
                    return reject('Unable to fetch the author of the case with ID' + this.id + '.');
                }
                author = guild.fetchMember(this.authorID);
            }
            if (!author) {
                return reject('Unable to fetch the author of the case with ID ' + this.id + '.');
            }
            this.author = author;
            resolve(author);
        }).catch(e => console.log(e));
    }

    /**
     * Fetches the case member
     * @returns {Promise<GuildMember>} The Discord member
     */
    async fetchUser() {
        return new Promise(async (resolve, reject) => {
            let user = null,
            guild = null;
            if (this.moderator.v12) {
                guild = await this.client.guilds.cache.get(this.guildID);
                if(!guild) {
                    return reject('Unable to fetch the user of the case with ID' + this.id + '.');
                }
                user = guild.members.cache.get(this.userID)
            } else {
                guild = await this.client.guilds.get(this.guildID);
                if(!guild) {
                    return reject('Unable to fetch the user of the case with ID' + this.id + '.');
                }
                user = guild.members.get(this.userID);
            }
            if (!user) {
                return reject('Unable to fetch the user of the case with ID ' + this.id + '.');
            }
            this.user = user;
            resolve(user);
        }).catch(e => console.log(e));
    }

    /**
     * Fetches the case guild
     * @returns {Promise<Guild>} The Discord guild
     */
    async fetchGuild() {
        return new Promise(async (resolve, reject) => {
            let guild = null;
            if (this.moderator.v12) {
                guild = await this.client.guilds.cache.get(this.guildID);
                if(!guild) {
                    return reject('Unable to fetch the guild of the case with ID' + this.id + '.');
                }
            } else {
                guild = await this.client.guilds.get(this.guildID);
                if(!guild) {
                    return reject('Unable to fetch the guild of the case with ID' + this.id + '.');
                }
            }
            if (!guild) {
                return reject('Unable to fetch the guild of the case with ID ' + this.id + '.');
            }
            this.guild = guild;
            resolve(guild);
        }).catch(e => console.log(e));
    }
}

module.exports = Case;
