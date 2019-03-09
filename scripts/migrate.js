const Enmap = require('enmap');
const sql = require('sqlite');
const mongodb = require('mongodb');
const usersettingskeys = require('../usersettings-keys.json');
const guildsettingskeys = require('../guildsettings-keys.json');

function migrate() {
	process.stdout.write('This process may take a while, press any to start the process. Do not stop it before it finishes!');
	process.stdin.setRawMode(true);

	process.stdin.once('data', data => {
		process.stdin.setRawMode(false);

		const byteArray = [...data];
		if (byteArray.length > 0 && byteArray[0] === 3) {
			console.log('^C');
			process.exit(1);
		}

		process.stdout.clearLine();
		process.stdout.cursorTo(0);
		process.stdout.write('1/3 Loading db botconfs...');
		const botconfs = new Enmap({
			name: 'botconfs',
			fetchAll: true
		});

		botconfs.defer.then(() => {
			process.stdout.clearLine();
			process.stdout.cursorTo(0);
			process.stdout.write('1/3 Loading db userdb...');
			const userdb = new Enmap({
				name: 'userdb',
				fetchAll: true
			});
			userdb.defer.then(() => {
				process.stdout.clearLine();
				process.stdout.cursorTo(0);
				process.stdout.write('1/3 Loading db guildsettings...');
				const guildconfs = new Enmap({
					name: 'guildsettings',
					fetchAll: true
				});

				guildconfs.defer.then(async () => {
					const settingsFile = require('../settings.json');
					this.url = `mongodb://${encodeURIComponent(settingsFile.db.user)}:${encodeURIComponent(settingsFile.db.password)}@${encodeURIComponent(settingsFile.db.host)}:${encodeURIComponent(settingsFile.db.port)}/?authMechanism=DEFAULT&authSource=admin`;
					try {
						this.dbClient = await mongodb.MongoClient.connect(this.url, { useNewUrlParser: true });
					} catch (err) {
						console.log(err);
						process.exit(-1);
					}

					this.db = this.dbClient.db('lenoxbot');
					const guildSettingsCollection = this.db.collection('guildSettings');
					const userSettingsCollection = this.db.collection('userSettings');
					const botSettingsCollection = this.db.collection('botSettings');

					await guildSettingsCollection.createIndex('guildId', { unique: true });
					await userSettingsCollection.createIndex('userId', { unique: true });
					await botSettingsCollection.createIndex('botconfs', { unique: true });

					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write('2/3 Converting botconfs...');

					let settings = {};

					for (var [key, value] of botconfs) {
						settings[key] = value;
					}
					botSettingsCollection.insertOne({ botconfs: 'botconfs', settings: settings });

					settings = {};

					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write('2/3 Converting guildSettings...');

					for (var [key, value] of guildconfs) {
						guildSettingsCollection.insertOne({ guildId: key, settings: value });
					}

					settings = {};
					
					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write('2/3 Converting userdb...');

					for (var [key, value] of userdb) {
						userSettingsCollection.insertOne({ userId: key, settings: value });
					}

					process.stdout.clearLine();
					process.stdout.cursorTo(0);
					process.stdout.write('3/3 Loading sqlite db for credits and xp');

					const db = await sql.open(`${settingsFile.sqlitefilename}.sqlite`);
					/*.then(async rows => {
						

						db.all('SELECT * FROM scores').then(async rowsScores => {
							

							process.stdout.clearLine();
							process.stdout.cursorTo(0);
							process.stdout.write('3/3 Finalizing...\n');
							this.dbClient.close();

							console.log('Migration done.');

							process.exit(0);
						}).catch(error => {
							console.log("There is no table such as scores. Migration of credits will be cancelled. Finishing up...");
							console.log("Error: ");
							console.log(error);
							this.dbClient.close();
							console.log('Migration done');
						});
					});*/
					const rows = await db.all('SELECT * FROM medals');
					for (var row of rows) {
						const result = await userSettingsCollection.findOne({ userId: row.userId });
						let settings = undefined;

						if (result && result.settings) {
							settings = result.settings;
						} else {
							settings = usersettingskeys;

							userSettingsCollection.insertOne({ userId: row.userId, settings: settings });
						}

						settings["credits"] = row.medals;
						process.stdout.clearLine();
						process.stdout.cursorTo(0);
						process.stdout.write(`3/3 Converting credits of user ${row.userId}\n`);
						await userSettingsCollection.updateOne({ userId: row.userId }, { $set: { settings: settings } });
					}


					const rowsScores = await db.all('SELECT * FROM scores');
					for (var rowScores of rowsScores) {
						const result = await guildSettingsCollection.findOne({ guildId: rowScores.guildid });
						let settings = undefined;

						if (!result || !result.settings) {
							settings = guildsettingskeys;

							guildSettingsCollection.insertOne({ guildId: rowScores.guildid, settings: settings });
						} else {
							settings = result.settings;
						}

						// This doesn't exist in the normal layout of the old db, so we need to create it.
						if(!settings["scores"]) {
							settings["scores"] = {};
						}
						let currentScores = settings["scores"];
						currentScores[rowScores.userId] = {};
						currentScores[rowScores.userId].points = rowScores.points;
						currentScores[rowScores.userId].level = rowScores.level;
						process.stdout.clearLine();
						process.stdout.cursorTo(0);
						process.stdout.write(`3/3 Converting score of user ${row.userId}\n`);
						await guildSettingsCollection.updateOne({ guildId: rowScores.guildid }, { $set: { settings: settings } });
					}
				});
			});
		});
	});
}

migrate();