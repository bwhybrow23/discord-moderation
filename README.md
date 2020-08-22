# Discord Moderation

[![downloads](https://img.shields.io/npm/dt/discord-moderation?style=for-the-badge)](https://www.npmjs.com/package/discord-moderation)
[![version](https://img.shields.io/npm/v/discord-moderation?style=for-the-badge)](https://www.npmjs.com/package/discord-moderation)

Discord Moderation is a a powerful [Node.js](https://nodejs.org) module taht allows you to esaily create moderation commands with [discord.js](https://discordjs.org/)!

*   The duration of each case is customizable!
*   Automatic restart after bot crash!
*   Update of the timer every second!
*   And customizable reason, customizable author, customizable storage path, and more!

## Installation

```js
npm install --save discord-moderation
```

## Examples

### Launch of the module

```js
const Discord = require("discord.js"),
client = new Discord.Client(),
settings = {
    prefix: "/",
    token: "Your Discord Token"
};

// Requires Moderator from discord-moderation
const { Moderator } = require("discord-moderation");

// Starts updating currents cases
const moderator = new Moderator(client, {
    storage: "./cases.json",
    updateCountdownEvery: 5000,
});

// We now have a moderator property to access the moderator everywhere!
client.moderator = moderator;

client.on("ready", () => {
    console.log("I'm ready !");
});

client.login(settings.token);
```

After that, cases that are not yet finished will start to be updated again and new cases can be created.
You can pass an options object to customize the cases. Here is a list of them:

*   **client**: the discord client (your discord bot instance)
*   **options.storage**: the json file that will be used to store cases
*   **options.updateCountdownEvery**: the number of seconds it will take to update the timers
*   **options.DJSlib**: your discord.js version (default: v12)

### Ban / Tempban / Unban

```js
client.on("message", (message) => {

    const ms = require("ms"); // npm install ms
    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if(command === "ban"){
        // /ban @Rakox 2d dm ads
        // will ban Rakox for 2 days and the reason will be "dm ads"

        client.moderator.ban(message.guild.members.get(message.mentions.users.first().id), {
            time: ms(args[1]),
            reason: args.slice(2).join(" "),
            author: message.member
        }).then((banData) => {
            console.log(banData); // {...} (id, type, author, reason and more)
        });
        // And the member has been banned!
    }
});
```

```js
client.on("message", (message) => {

    const ms = require("ms"); // npm install ms
    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if(command === "unban"){
        // /unban 490461455741747200 i'm nice
        // will un-ban Rakox and the reason will be "i'm nice"

        client.moderator.unban(args[0], {
            reason: args.slice(1).join(" "),
            author: message.member
        }).then((banData) => {
            console.log(banData); // {...} (id, type, author, reason and more)
        });
        // And the member has been un-banned!
    }
});
```

*   **options.time**: the case duration.
*   **options.reason**: the case reason.  
*   **options.author**: the user who creates the case.

If you want to ban the user permanently you just need to remove the time option!

<img src="https://zupimages.net/up/20/12/69ug.png" alt="" />

### Mute / Tempmute / Unmute

```js
client.on("message", (message) => {

    const ms = require("ms"); // npm install ms
    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if(command === "mute"){
        // /mute @Rakox 2d bad words
        // will mute Rakox for 2 days and the reason will be "bad words"

        client.moderator.mute(message.guild.members.get(message.mentions.users.first().id), {
            time: ms(args[1]),
            reason: args.slice(2).join(" "),
            author: message.member,
            mutedRoleID: "689384052142243929"
        }).then((muteData) => {
            console.log(muteData); // {...} (id, type, author, reason and more)
        });
        // And the member has been muted!
    }
});
```

```js
client.on("message", (message) => {

    const ms = require("ms"); // npm install ms
    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if(command === "unmute"){
        // /unmute @Rakox i'm nice
        // will un-mute Rakox and the reason will be "i'm nice"

        client.moderator.unmute(message.guild.members.get(message.mentions.users.first().id), {
            reason: args.slice(1).join(" "),
            author: message.member,
            mutedRoleID: "689384052142243929"
        }).then((muteData) => {
            console.log(muteData); // {...} (id, type, author, reason and more)
        });
        // And the member has been un-muted!
    }
});
```

*   **options.time**: the case duration.
*   **options.reason**: the case reason.  
*   **options.author**: the user who creates the case.

* **options.mutedRoleID**: the ID of the muted role.

If you want to mute the user permanently you just need to remove the time option!

<img src="https://zupimages.net/up/20/12/lbje.png" alt="" />

### Kick

```js
client.on("message", (message) => {

    const ms = require("ms"); // npm install ms
    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command == "kick") {
        // /kick @Rakox flood
        // will kick Rakox for "flood"

        client.moderator.kick(message.guild.members.get(message.mentions.users.first().id), {
            reason: args.slice(1).join(" "),
            author: message.member
        }).then((kickData) => {
            console.log(kickData); // {...} (id, type, author, reason and more)
        });
        // And the member has been kicked!
    }
});
```

*   **options.reason**: the case reason.  
*   **options.author**: the user who creates the case.

<img src="https://zupimages.net/up/20/12/kc2b.png" alt="" />

### Warn

```js
client.on("message", (message) => {

    const ms = require("ms"); // npm install ms
    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if (command == "warn") {
        // /warn @Rakox spam
        // will warn Rakox for "spam"

        client.moderator.warn(message.guild.members.get(message.mentions.users.first().id), {
            reason: args.slice(1).join(" "),
            author: message.member
        }).then((warnData) => {
            console.log(warnData); // {...} (id, type, author, reason and more)
        });
        // And the member has been warned!
    }
});
```

*   **options.reason**: the case reason.  
*   **options.author**: the user who creates the case.

### Fetch cases

```js
    // The list of all the cases
    let all = client.moderator.cases; // [ {Case}, {Case} ]

    // The list of all the cases on the guild with ID "558328638911545423"
    let onGuild = client.moderator.cases.filter((g) => g.guildID === "558328638911545423");

    // The list of all the case of the user with ID "490461455741747200"
    let onUser = client.moderator.cases.filter((g) => g.userID === "490461455741747200");
```

### Edit a case

```js
client.on("message", (message) => {

    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if(command === "edit"){
        let caseID = args[0];
        client.moderator.edit(caseID, {
            reason: "New reason",
            addTime: 5000,
            author: message.member
        }).then((newCaseData) => {
            console.log(newCaseData)
        }).catch((err) => {
            console.error(err)
        });
    }
});
```

**options.author**: the user who edits the case.  
**options.reason**: the new reason.  
**options.addTime**: the number of milliseconds to add to the case duration.  
**options.setEndTimestamp**: the timestamp of the new end date. `Date.now()+1000`.  

⚠️ Tips: to reduce case time, define `addTime` with a negative number! For example `addTime: -5000` will reduce case time by 5 seconds!

### Delete a case

```js
client.on("message", (message) => {

    const args = message.content.slice(settings.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    if(command === "delete"){
        let caseID = args[0];
        client.moderator.delete(caseID, {
            reason: args.slice(1).join(" "),
            author: message.member
        }).then((oldCaseData) => {
            console.log(oldCaseData)
        }).catch((err) => {
            console.error(err)
        });
    }
});
```

When you use the delete function, the case are deleted and the case end immediately. You cannot restore a case once you have deleted it.

### Events

```js
client.moderator.on('caseDelete', (caseObj) => {
    console.log(caseObj);
});
 
moderator.on('caseCreate', (caseObj) => {
    console.log(caseObj);
});
```
⚠️ Tips: you can use the event to create new feature like logger or other moderation tools!