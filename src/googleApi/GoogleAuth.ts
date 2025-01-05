/* eslint-disable @typescript-eslint/no-var-requires */
import type GoogleTasks from "../GoogleTasksPlugin";
import {
	settingsAreComplete,
	settingsAreCompleteAndLoggedIn,
} from "../view/GoogleTasksSettingTab";
import {
	getAT,
	getET,
	getRT,
	setAT,
	setET,
	setRT,
} from "../helper/LocalStorage";
import { Notice, Platform } from "obsidian";

import { OAuth2Client } from "google-auth-library";
import http from "http";
import open from "open";
import url from "url";
import destroyer from "server-destroy";

export async function getGoogleAuthToken(
	plugin: GoogleTasks
): Promise<string | null> {
	if (!settingsAreCompleteAndLoggedIn(plugin)) return null;

	if (
		getET() == 0 ||
		getET() == undefined ||
		isNaN(getET()) ||
		getET() < +new Date()
	) {
		if (getRT() != "") {
			const refreshBody = {
				client_id: plugin.settings.googleClientId,
				client_secret: plugin.settings.googleClientSecret,
				grant_type: "refresh_token",
				refresh_token: getRT(),
			};
			const response = await fetch(
				"https://oauth2.googleapis.com/token",
				{
					method: "POST",
					body: JSON.stringify(refreshBody),
				}
			);

			const tokenData = await response.json();

			setAT(tokenData.access_token);
			setET(+new Date() + tokenData.expires_in);
		}
	}

	return getAT();
}

export async function LoginGoogle(plugin: GoogleTasks) {
	if (Platform.isDesktop) {
		if (!settingsAreComplete(plugin)) return;
		const oAuth2Client = new OAuth2Client(
			plugin.settings.googleClientId,
			plugin.settings.googleClientSecret,
			"http://127.0.0.1:42813/callback"
		);
		const authorizeUrl = oAuth2Client.generateAuthUrl({
			scope: "https://www.googleapis.com/auth/tasks",
			access_type: "offline",
			prompt: "consent",
		});

		const server = http
			.createServer(async (req: any, res: any) => {
				try {
					if (req.url.indexOf("/callback") > -1) {
						// acquire the code from the querystring, and close the web server.
						const qs = new url.URL(
							req.url,
							"http://localhost:42813"
						).searchParams;
						const code = qs.get("code");
						res.end(
							"Authentication successful! Please return to obsidian."
						);
						// @ts-ignore
						server.destroy();

						if (code == null) throw new Error("No code provided.");

						// Now that we have the code, use that to acquire tokens.
						const r = await oAuth2Client.getToken(code);

						setRT(r.tokens.refresh_token as string);
						setAT(r.tokens.access_token as string);
						setET(r.tokens.expiry_date as number);

						console.info("Tokens acquired.");
					}
				} catch (e) {
					console.error("Error getting Tokens.");
				}
			})
			.listen(42813, () => {
				// open the browser to the authorize url to start the workflow
				open(authorizeUrl, { wait: false }).then((cp: any) =>
					cp.unref()
				);
			});

		destroyer(server);
	} else {
		new Notice("Can't use OAuth on this device");
	}
}
